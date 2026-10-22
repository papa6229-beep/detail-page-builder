import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SHADOW, type ShadowSettings } from './shadow';
import { ShadowPreview } from './ShadowPreview';
import { ColorAdjustmentsPanel } from './ColorAdjustmentsPanel';
import { normalizeColorAdjustments, type ColorAdjustments } from './colorAdjustments';
import './style.css';

const shadowControls: { key: keyof Omit<ShadowSettings, 'enabled'>; label: string; min: number; max: number; unit: string }[] = [
  { key: 'opacity', label: '그림자 진하기', min: 0, max: 100, unit: '%' },
  { key: 'blur', label: '부드러움', min: 0, max: 30, unit: '' },
];

function useBlobUrl(blob: Blob | null) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const next = URL.createObjectURL(blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export interface ImageProcessingResult { image: Blob; cutout: Blob; tone: number; shadow: ShadowSettings; color: ColorAdjustments }
export interface InitialProcessingImage { id: string; source: string; cutout?: Blob; tone?: number; shadow?: ShadowSettings; color?: ColorAdjustments }

export function ImageProcessor({ initial, onApply, onRestore }: {
  initial?: InitialProcessingImage;
  onApply?: (result: ImageProcessingResult) => Promise<void>;
  onRestore?: () => Promise<void>;
}) {
  const [source, setSource] = useState<File | null>(null);
  const [cutout, setCutout] = useState<Blob | null>(null);
  const [finished, setFinished] = useState<Blob | null>(null);
  const [toned, setToned] = useState<{ blob: Blob; id: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [status, setStatus] = useState('사진을 넣고 테스트를 실행하세요.');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [tone, setTone] = useState(45);
  const [color, setColor] = useState(() => normalizeColorAdjustments());
  const [shadow, setShadow] = useState<ShadowSettings>({ ...DEFAULT_SHADOW });
  const [checker, setChecker] = useState(true);
  const [actualSize, setActualSize] = useState(false);
  const [dimensions, setDimensions] = useState('');
  const [removalTime, setRemovalTime] = useState<number | null>(null);
  const [finishTime, setFinishTime] = useState<number | null>(null);
  const [cold, setCold] = useState(true);
  const [applying, setApplying] = useState(false);
  const worker = useRef<Worker | null>(null);
  const removeId = useRef(0), finishId = useRef(0);
  const sourceUrl = useBlobUrl(source), cutoutUrl = useBlobUrl(cutout), finishedUrl = useBlobUrl(finished);

  useEffect(() => {
    const instance = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' });
    worker.current = instance;
    instance.onmessage = ({ data }) => {
      if (data.kind === 'finished') {
        if (data.id !== finishId.current) return;
        setToned({ blob: data.blob, id: data.id }); setFinishTime(data.ms); return;
      }
      if (data.kind === 'error' && data.operation === 'finish') {
        if (data.id !== finishId.current) return;
        setError(data.message); setFinishing(false); return;
      }
      if (data.id !== removeId.current) return;
      if (data.kind === 'progress') {
        if (data.key.startsWith('compute')) setStatus('사진에서 제품을 분리하고 있습니다…');
        else setStatus(`모델·실행 파일 준비 중… ${(data.current / 1048576).toFixed(1)} / ${(data.total / 1048576).toFixed(1)} MB`);
      }
      if (data.kind === 'cutout') {
        setCutout(data.blob); setRemovalTime(data.ms); setCold(data.cold); setBusy(false);
        setStatus('누끼 완료 · 톤과 그림자 적용 중…');
      }
      if (data.kind === 'error') { setError(data.message); setBusy(false); setStatus('처리를 완료하지 못했습니다. 다시 실행할 수 있습니다.'); }
    };
    instance.onerror = () => { setError('이미지 처리 모듈을 시작하지 못했습니다. 페이지를 새로고침해주세요.'); setBusy(false); setFinishing(false); };
    return () => { instance.terminate(); worker.current = null; };
  }, []);

  useEffect(() => {
    if (!initial) return;
    let cancelled = false;
    const id = ++removeId.current; finishId.current++;
    setSource(null); setCutout(null); setFinished(null); setToned(null); setDimensions(''); setError('');
    setTone(initial.tone ?? 45); setShadow({ ...DEFAULT_SHADOW, ...initial.shadow });
    setColor(normalizeColorAdjustments(initial.color));
    setChecker(false); setBusy(true); setFinishing(false); setRemovalTime(null); setFinishTime(null);
    setStatus('이미지를 준비하고 있습니다…');
    void fetch(initial.source).then(response => {
      if (!response.ok) throw new Error('원본 이미지를 불러오지 못했습니다.');
      return response.blob();
    }).then(blob => {
      if (cancelled) return;
      const file = new File([blob], 'product-image', { type: blob.type });
      setSource(file);
      if (initial.cutout) {
        setCutout(initial.cutout); setBusy(false); setCold(false); setRemovalTime(0);
        setStatus('기존 누끼 결과를 불러왔습니다.');
      } else {
        setStatus('제품을 분리하고 있습니다. 처음에는 모델을 준비하는 시간이 포함됩니다.');
        worker.current?.postMessage({ kind: 'remove', id, file });
      }
    }).catch(error => { if (!cancelled) { setError(String(error?.message || error)); setBusy(false); } });
    return () => { cancelled = true; };
  }, [initial]);

  useEffect(() => {
    if (!cutout) return;
    const id = ++finishId.current;
    setFinishing(true);
    setFinished(null);
    setStatus('톤과 그림자를 적용하고 있습니다…');
    const timeout = setTimeout(() => worker.current?.postMessage({ kind: 'finish', id, blob: cutout, strength: tone / 100, shadow: false, color }), 100);
    return () => clearTimeout(timeout);
  }, [cutout, tone, color]);
  const changeColor = useCallback((value: ColorAdjustments) => { finishId.current++; setFinished(null); setColor(normalizeColorAdjustments(value)); if (cutout) setFinishing(true); }, [cutout]);
  const changeTone = (value: number) => { finishId.current++; setFinished(null); setTone(value); if (cutout) setFinishing(true); };

  const changeShadow = useCallback((next: ShadowSettings) => {
    setShadow(next); setFinished(null);
    if (toned) { setFinishing(true); setStatus('그림자 조절 중 · 화면에 바로 반영됩니다.'); }
  }, [toned]);
  const completeExport = useCallback((blob: Blob) => {
    if (!toned || toned.id !== finishId.current) return;
    setFinished(blob); setFinishing(false); setStatus('처리 완료 · 미리보기에서 보정 결과를 확인하세요.');
  }, [toned]);
  const previewError = useCallback((message: string) => { setError(message); setFinishing(false); }, []);

  const select = (files: FileList | null) => {
    if (busy || !files?.length) return;
    if (files.length !== 1 || !/^image\/(png|jpeg|webp|avif|bmp)$/.test(files[0].type)) {
      setError('JPG·PNG·WebP·AVIF·BMP 사진 한 장을 넣어주세요.'); return;
    }
    removeId.current++; finishId.current++;
    setSource(files[0]); setCutout(null); setFinished(null); setToned(null); setError(''); setDimensions('');
    setRemovalTime(null); setFinishTime(null); setFinishing(false);
    setStatus('준비되었습니다. 테스트 실행을 눌러주세요.');
  };
  const run = () => {
    if (!source || busy || !worker.current) return;
    const id = ++removeId.current; finishId.current++;
    setBusy(true); setError(''); setCutout(null); setFinished(null); setToned(null); setFinishing(false);
    setRemovalTime(null); setFinishTime(null); setStatus('처리를 시작합니다. 첫 실행은 모델을 준비하는 시간이 포함됩니다.');
    worker.current.postMessage({ kind: 'remove', id, file: source });
  };
  const name = source?.name.replace(/\.[^.]+$/, '') || 'product';
  const seconds = (ms: number | null) => ms === null ? '—' : `${(ms / 1000).toFixed(2)}초`;
  const commit = async (restore = false) => {
    setApplying(true);
    try {
      if (restore) await onRestore?.();
      else if (finished && cutout) await onApply?.({ image: finished, cutout, tone, shadow, color });
    } catch (error) { setError(String(error?.message || error)); }
    finally { setApplying(false); }
  };

  return <div className="image-processor"><main>
    {!initial && <>
    <header><div className="brand">B<span>이미지 실험실</span></div><span className="local-badge">로컬 테스트</span></header>
    <section className="intro"><h1>상품사진 테스트</h1><p>사진 한 장으로 누끼와 가벼운 톤·그림자 보정을 비교합니다.</p></section>
    <section className="tools" aria-label="테스트 도구">
      <label className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); select(e.dataTransfer.files); }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m4 18 6-6 4 4 3-3 4 4"/><circle cx="8" cy="8" r="1"/></svg>
        <span><strong>{source ? source.name : '사진을 끌어 놓거나 클릭하세요'}</strong><small>{source ? `${(source.size / 1048576).toFixed(1)} MB${dimensions ? ` · ${dimensions}` : ''}` : 'JPG · PNG · WebP · AVIF · BMP'}</small></span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/bmp" disabled={busy} onChange={e => { select(e.target.files); e.target.value = ''; }} aria-label="테스트 사진 선택" />
      </label>
      <div className="actions"><button className="primary" disabled={!source || busy} onClick={run}>{busy ? '처리 중…' : '테스트 실행'}</button><p>첫 실행은 모델 다운로드로 오래 걸릴 수 있습니다.<br/>사진은 이 브라우저에서 처리합니다.</p></div>
    </section>
    </>}
    <div className="status" role="status"><span className={busy || finishing ? 'pulse' : ''}></span>{status}</div>
    {error && <div className="error" role="alert">{error}</div>}
    <section className="adjust" aria-label="후보정 설정">
      <label className="tone">톤 보정 <input type="range" min="0" max="100" value={tone} onChange={e => changeTone(Number(e.target.value))} disabled={busy} aria-label="톤 보정 강도"/><output>{tone}%</output></label>
      <label><input type="checkbox" checked={checker} onChange={e => setChecker(e.target.checked)}/>체크 배경으로 보기</label>
      <label><input type="checkbox" checked={actualSize} onChange={e => setActualSize(e.target.checked)}/>원본 크기(100%)</label>
      <span className="hint">보정값을 바꿔도 누끼는 다시 계산하지 않습니다.</span>
    </section>
    <section className="shadow-adjust" aria-label="그림자 조절">
      <div className="shadow-heading"><label><input type="checkbox" checked={shadow.enabled} onChange={e => changeShadow({ ...shadow, enabled: e.target.checked })} disabled={busy}/>그림자 적용</label><button className="reset" onClick={() => changeShadow({ ...DEFAULT_SHADOW })} disabled={busy}>그림자 기본값</button></div>
      <div className="shadow-sliders">{shadowControls.map(control => <label key={control.key}>
        <span>{control.label}</span><input type="range" min={control.min} max={control.max} value={shadow[control.key]} onChange={e => changeShadow({ ...shadow, [control.key]: Number(e.target.value) })} disabled={busy || !shadow.enabled} aria-label={control.label}/><output>{shadow[control.key]}{control.unit}</output>
      </label>)}</div>
      <p>그림자 영역을 끌면 이동, 네모 손잡이는 크기, 둥근 ↻ 손잡이는 각도를 조절합니다. 이미지 밖으로 나간 그림자는 잘립니다.</p>
    </section>
    <div className="image-edit-workbench"><section className="comparison" aria-label="처리 결과 비교">
      {[
        { title: '원본', url: sourceUrl, note: '원본 파일 유지', download: '' },
        { title: '누끼 결과', url: cutout ? cutoutUrl : '', note: `${cold ? '세션 첫 실행 · ' : '세션 재실행 · '}${seconds(removalTime)}`, download: `${name}_cutout.png` },
        { title: '톤·그림자 적용', url: finished ? finishedUrl : '', note: `추가 보정 ${seconds(finishTime)}`, download: `${name}_finished.png` },
      ].map(item => <article key={item.title}><div className="panel-heading"><h2>{item.title}</h2>{item.download && item.url && <a href={item.url} download={item.download}>PNG 저장 ↗</a>}</div><div className={`image-stage ${checker ? 'checker' : ''} ${actualSize ? 'native-size' : ''}`}>
        {item.title === '톤·그림자 적용' && toned ? <ShadowPreview blob={toned.blob} settings={shadow} actualSize={actualSize} onChange={changeShadow} onExport={completeExport} onError={previewError}/> : item.url ? <img src={item.url} alt={item.title} onLoad={item.title === '원본' ? e => setDimensions(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`) : undefined}/> : <div className="empty">{item.title === '원본' ? '원본 사진을 넣어주세요' : busy ? '이미지 처리 중…' : '실행 후 결과가 표시됩니다'}</div>}
      </div><footer>{item.url ? item.note : '—'}</footer></article>)}
    </section><ColorAdjustmentsPanel value={color} blob={cutout} disabled={busy || !cutout || applying} onChange={changeColor}/></div>
    <p className="footnote">누끼는 가장자리와 작은 부품을 확대해 확인하세요. 기본 톤은 약하게, 레벨·커브는 설정한 값대로 적용합니다. 원본 해상도·비율·투명도는 유지합니다.</p>
    {initial && <div className="apply-bar"><button type="button" className="reset" onClick={() => void commit(true)} disabled={applying}>원본 사용</button><button type="button" className="reset" onClick={run} disabled={!source || busy || applying}>다시 처리</button><button type="button" className="primary" data-image-apply disabled={!finished || !cutout || busy || finishing || applying} onClick={() => void commit()}>{applying ? '적용 중…' : '이 이미지 적용'}</button></div>}
  </main></div>;
}
