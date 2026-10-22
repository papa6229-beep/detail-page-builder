import React, { useEffect, useRef, useState } from 'react';
import type { ProductData } from '../types';
import { collectReviewFields, type TextSuggestion } from '../textReview';
import { hasTextReviewConnection, reviewProductText } from '../services/textReviewService';

export default function TextReviewDialog({ data, apiKey, onKeyChange, onApply, onClose }: {
  data: ProductData; apiKey: string; onKeyChange: (key: string) => void;
  onApply: (selected: TextSuggestion[]) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<TextSuggestion[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fields = collectReviewFields(data);
  useEffect(() => {
    const element = dialog.current, focused = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { request.current?.abort(); element?.close(); focused?.focus(); };
  }, []);
  const run = async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setSuggestions(null); setSelected(new Set());
    try {
      const result = await reviewProductText(fields, apiKey, controller.signal);
      if (!controller.signal.aborted) setSuggestions(result);
    } catch (error) { if (!controller.signal.aborted) setError(String(error?.message || error)); }
    finally { if (request.current === controller) setBusy(false); }
  };
  const cancel = () => { request.current?.abort(); setBusy(false); };
  return <dialog ref={dialog} className="builder-review-dialog" aria-label="전체 텍스트 오타 검수" onCancel={onClose}>
    <div className="builder-review-header"><div><h2>전체 텍스트 오타 검수</h2><p>상품 표현은 그대로 두고, 수정할 부분만 선택하세요.</p></div><button type="button" className="builder-button" onClick={onClose}>검수 닫기</button></div>
    <div className="builder-review-body">
      {!hasTextReviewConnection && <label className="builder-review-key">OpenRouter 연결 키<input type="password" value={apiKey} onChange={event => onKeyChange(event.target.value)} autoComplete="off" spellCheck={false} aria-label="OpenRouter 연결 키"/><small>기존 문구 작성에 쓰는 연결 키입니다. 저장하지 않으며 열린 빌더에서만 사용합니다.</small></label>}
      <div className="builder-review-tools"><span>{fields.length}개 입력 항목 · 상품명, 스펙, 옵션, 제목, 설명</span><button type="button" className="builder-button builder-button-primary" onClick={() => void run()} disabled={busy || !fields.length}>{busy ? '검수 중…' : '검수 시작'}</button>{busy && <button type="button" className="builder-button" onClick={cancel}>검수 중단</button>}</div>
      <p className="builder-review-note">검수 시작 시 입력한 텍스트만 AI에 전달합니다. 은어·브랜드명·비사전적 용어는 제안이 나오더라도 그대로 둘 수 있습니다.</p>
      {error && <p className="builder-review-error" role="alert">{error}</p>}
      {!fields.length && <p className="builder-review-empty">검수할 텍스트를 먼저 입력해주세요.</p>}
      {busy && <p className="builder-review-empty" role="status">오타 후보를 확인하고 있습니다. 본문은 변경하지 않습니다.</p>}
      {suggestions?.length === 0 && <p className="builder-review-empty" role="status">수정 후보가 없습니다. 검수에서 놓친 오타가 있을 수 있으니 최종 문구도 확인해주세요.</p>}
      {suggestions && suggestions.length > 0 && <div className="builder-review-results"><p>{suggestions.length}개 후보 · 기본 선택 없음</p>{suggestions.map(item => <label className="builder-review-candidate" key={item.id}>
        <input type="checkbox" checked={selected.has(item.id)} aria-label={`${item.label} 수정 선택`} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })}/>
        <div><strong>{item.label}</strong><p className="builder-review-context">{item.original.slice(Math.max(0, item.start - 35), item.start)}<mark>{item.before}</mark>{item.original.slice(item.end, item.end + 35)}</p><div className="builder-review-change"><del>{item.before}</del><span aria-hidden="true">→</span><ins>{item.after || '(삭제)'}</ins></div><p className="builder-review-reason">{item.reason}</p></div>
      </label>)}</div>}
    </div>
    <div className="builder-review-footer"><span>{selected.size}개 선택 · 선택하지 않은 표현은 유지됩니다.</span><button type="button" className="builder-button builder-button-primary" disabled={!selected.size || busy} onClick={() => onApply((suggestions ?? []).filter(item => selected.has(item.id)))}>선택한 수정 적용</button></div>
  </dialog>;
}
