import React, { useEffect, useRef, useState } from 'react';
import { CURVE_CHANNELS, DEFAULT_LEVELS, curveTable, identityCurve, normalizeColorAdjustments, type ColorAdjustments, type CurveChannel, type CurvePoint, type LevelsSettings } from './colorAdjustments';

const channelNames: Record<CurveChannel, string> = { rgb: 'RGB 전체', red: '빨강', green: '초록', blue: '파랑' };
const levelControls: { key: keyof LevelsSettings; label: string; min: number; max: number; step: number }[] = [
  { key: 'black', label: '입력 검정', min: 0, max: 254, step: 1 }, { key: 'gamma', label: '중간톤 감마', min: .1, max: 3, step: .01 }, { key: 'white', label: '입력 흰색', min: 1, max: 255, step: 1 },
  { key: 'outputBlack', label: '출력 검정', min: 0, max: 254, step: 1 }, { key: 'outputWhite', label: '출력 흰색', min: 1, max: 255, step: 1 },
];
export function ColorAdjustmentsPanel({ value, blob, disabled, onChange }: { value: ColorAdjustments; blob: Blob | null; disabled: boolean; onChange: (value: ColorAdjustments) => void }) {
  const [histogram, setHistogram] = useState<number[]>([]), [channel, setChannel] = useState<CurveChannel>('rgb'), [selected, setSelected] = useState(2);
  const graph = useRef<SVGSVGElement>(null), drag = useRef<{ id: number; index: number } | null>(null);
  const current = useRef(value); current.current = value;
  const points = value.curves[channel], point = points[Math.min(selected, points.length - 1)];
  useEffect(() => {
    let cancelled = false;
    if (!blob) { setHistogram([]); return; }
    void createImageBitmap(blob).then(image => {
      try {
        const scale = Math.min(1, 512 / Math.max(image.width, image.height));
        const canvas = new OffscreenCanvas(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
        const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data, bins = new Array(256).fill(0);
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] >= 16) bins[Math.round(pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722)] += pixels[i + 3] / 255;
        if (!cancelled) setHistogram(bins);
      } finally { image.close(); }
    }).catch(() => { if (!cancelled) setHistogram([]); });
    return () => { cancelled = true; };
  }, [blob]);
  const updateLevels = (key: keyof LevelsSettings, next: number) => {
    const levels = { ...current.current.levels, [key]: next };
    if (key === 'black') levels.black = Math.min(next, levels.white - 1);
    if (key === 'outputBlack') levels.outputBlack = Math.min(next, levels.outputWhite - 1);
    onChange(normalizeColorAdjustments({ ...current.current, levels }));
  };
  const updatePoints = (next: CurvePoint[]) => onChange(normalizeColorAdjustments({ ...current.current, curves: { ...current.current.curves, [channel]: next } }));
  const editPoint = (index: number, x: number, y: number) => {
    const next = current.current.curves[channel].map(p => ({ ...p })), last = next.length - 1;
    next[index] = { x: index === 0 ? 0 : index === last ? 255 : Math.max(next[index - 1].x + 1, Math.min(next[index + 1].x - 1, Math.round(x))), y: Math.max(0, Math.min(255, Math.round(y))) };
    updatePoints(next);
  };
  const position = (event: React.PointerEvent<SVGElement>) => { const rect = graph.current!.getBoundingClientRect(); return { x: Math.max(0, Math.min(255, (event.clientX - rect.left) / rect.width * 255)), y: Math.max(0, Math.min(255, 255 - (event.clientY - rect.top) / rect.height * 255)) }; };
  const table = curveTable(points), max = Math.max(1, ...histogram);
  const hist = histogram.length ? `0,100 ${histogram.map((value, i) => `${i},${100 - Math.sqrt(value / max) * 92}`).join(' ')} 255,100` : '';
  return <details className="color-adjust" open><summary>레벨 · 커브 <span>밝기와 색상을 직접 조절</span></summary><div className="color-adjust-grid">
    <section aria-label="레벨 조절"><div className="color-panel-heading"><h3>레벨</h3><button type="button" className="reset" disabled={disabled} onClick={() => onChange(normalizeColorAdjustments({ ...value, levels: { ...DEFAULT_LEVELS } }))}>레벨 초기화</button></div><svg className="color-histogram" viewBox="0 0 255 100" preserveAspectRatio="none" role="img" aria-label="누끼 원본 밝기 분포"><polygon points={hist}/></svg><div className="color-levels">{levelControls.map(control => <label key={control.key}><span>{control.label}</span><input type="range" aria-label={control.label} min={control.min} max={control.max} step={control.step} value={value.levels[control.key]} disabled={disabled} onChange={event => updateLevels(control.key, Number(event.target.value))}/><input type="number" aria-label={`${control.label} 값`} min={control.min} max={control.max} step={control.step} value={value.levels[control.key]} disabled={disabled} onChange={event => { if (event.target.value !== '') updateLevels(control.key, Number(event.target.value)); }}/></label>)}</div></section>
    <section aria-label="커브 조절"><div className="color-panel-heading"><h3>커브</h3><select value={channel} aria-label="커브 채널" onChange={event => { setChannel(event.target.value as CurveChannel); setSelected(2); }} disabled={disabled}>{CURVE_CHANNELS.map(key => <option value={key} key={key}>{channelNames[key]}</option>)}</select><button type="button" className="reset" disabled={disabled} onClick={() => { updatePoints(identityCurve()); setSelected(2); }}>현재 채널 초기화</button></div>
    <svg ref={graph} viewBox="0 0 255 255" preserveAspectRatio="none" className={`color-curve ${channel}`} aria-label={`${channelNames[channel]} 커브 그래프`} role="group" onPointerDown={event => { if (disabled || event.button !== 0 || event.target !== event.currentTarget || points.length >= 9) return; const p = position(event); if (p.x < 1 || p.x > 254 || points.some(v => Math.abs(v.x - p.x) < 2)) return; const next = [...points, { x: Math.round(p.x), y: Math.round(p.y) }].sort((a, b) => a.x - b.x); const index = next.findIndex(v => v.x === Math.round(p.x)); updatePoints(next); setSelected(index); drag.current = { id: event.pointerId, index }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { const active = drag.current; if (!active || event.pointerId !== active.id) return; const p = position(event); editPoint(active.index, p.x, p.y); }} onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      {[64, 128, 192].map(v => <path key={v} d={`M${v} 0V255M0 ${v}H255`} className="curve-grid"/>)}<path d="M0 255L255 0" className="curve-diagonal"/><polyline className="curve-line" points={Array.from(table, (v, i) => `${i},${255 - v}`).join(' ')}/>
      {points.map((p, index) => <circle key={index} cx={p.x} cy={255 - p.y} r={selected === index ? 5 : 4} role="button" tabIndex={disabled ? -1 : 0} aria-label={`커브 점 ${index + 1}`} aria-disabled={disabled} className={selected === index ? 'selected' : ''} onFocus={() => setSelected(index)} onPointerDown={event => { if (disabled || event.button !== 0) return; event.preventDefault(); event.stopPropagation(); event.currentTarget.focus(); setSelected(index); drag.current = { id: event.pointerId, index }; graph.current?.setPointerCapture(event.pointerId); }} onKeyDown={event => { if (disabled) return; const step = event.shiftKey ? 10 : 1; if (event.key.startsWith('Arrow')) { event.preventDefault(); editPoint(index, p.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), p.y + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0)); } }}/>)}</svg>
      <div className="curve-point-values"><label>입력<input type="number" aria-label="커브 선택점 입력" min="0" max="255" value={point.x} disabled={disabled || selected === 0 || selected >= points.length - 1} onChange={event => { if (event.target.value !== '') editPoint(Math.min(selected, points.length - 1), Number(event.target.value), point.y); }}/></label><label>출력<input type="number" aria-label="커브 선택점 출력" min="0" max="255" value={point.y} disabled={disabled} onChange={event => { if (event.target.value !== '') editPoint(Math.min(selected, points.length - 1), point.x, Number(event.target.value)); }}/></label><button type="button" className="reset" disabled={disabled || selected === 0 || selected >= points.length - 1} onClick={() => { updatePoints(points.filter((_, i) => i !== selected)); setSelected(0); }}>선택점 삭제</button></div><p className="color-help">점을 드래그하거나 방향키로 조절하세요. 빈 곳을 누르면 점이 추가됩니다.</p>
    </section></div></details>;
}
