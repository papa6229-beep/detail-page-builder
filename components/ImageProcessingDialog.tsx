import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { imageBlobToDataUrl, type ImageSlot, type SavedImageEdit } from '../imageProcessing';
import type { ImageProcessingResult } from '../lab/ImageProcessor';
import type { ShadowSettings } from '../lab/shadow';
import { normalizeColorAdjustments, type ColorAdjustments } from '../lab/colorAdjustments';

const ImageProcessor = lazy(() => import('../lab/ImageProcessor').then(module => ({ default: module.ImageProcessor })));
export interface ProcessingSession { slots: ImageSlot[]; edits: Record<string, SavedImageEdit> }

export default function ImageProcessingDialog({ session, cache, onCommit, onClose }: {
  session: ProcessingSession;
  cache: Map<string, { original: string; cutout: Blob }>;
  onCommit: (slot: ImageSlot, image: string, edit?: SavedImageEdit) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [carry, setCarry] = useState(true);
  const [incoming, setIncoming] = useState<{ tone: number; shadow: ShadowSettings; color: ColorAdjustments } | null>(null);
  const lastApplied = useRef<{ tone: number; shadow: ShadowSettings; color: ColorAdjustments } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const slot = session.slots[index];
  const edit = session.edits[slot.key];
  const original = edit?.original ?? slot.image;
  const initial = useMemo(() => ({
    id: slot.key, source: original,
    cutout: cache.get(slot.key)?.original === original ? cache.get(slot.key)?.cutout : undefined,
    tone: incoming?.tone ?? edit?.tone, shadow: incoming?.shadow ?? edit?.shadow,
    color: incoming?.color ?? edit?.color,
  }), [slot, original, edit, cache, incoming]);
  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); focused?.focus(); };
  }, []);
  const next = () => { if (index + 1 < session.slots.length) { setIncoming(carry ? lastApplied.current : null); setIndex(index + 1); } else onClose(); };
  const apply = async (result: ImageProcessingResult) => {
    setSaving(true);
    try {
      const image = await imageBlobToDataUrl(result.image);
      onCommit(slot, image, { original, tone: result.tone, shadow: result.shadow, color: result.color });
      lastApplied.current = { tone: result.tone, shadow: { ...result.shadow }, color: normalizeColorAdjustments(result.color) };
      cache.set(slot.key, { original, cutout: result.cutout }); next();
    } finally { setSaving(false); }
  };
  const restore = async () => { onCommit(slot, original); cache.delete(slot.key); next(); };
  return <dialog ref={dialog} className="builder-image-dialog" aria-label="이미지 보정" onCancel={event => { if (saving) event.preventDefault(); else onClose(); }}>
    <div className="builder-image-dialog-header"><div><h2>이미지 보정 · {slot.label}</h2><p><span>{index + 1} / {session.slots.length}</span> · 한 장씩 확인하고 적용하세요. GIF·워터마크 로고는 원본을 유지합니다.</p></div><div><button type="button" className="builder-button" disabled={saving} onClick={next}>건너뛰기</button><button type="button" className="builder-button" disabled={saving} onClick={onClose}>편집 닫기</button></div></div>
    {index + 1 < session.slots.length && <label className="builder-settings-carry"><input type="checkbox" aria-label="다음 사진에도 이 보정값 사용" checked={carry} onChange={event => setCarry(event.target.checked)}/>다음 사진에도 이 보정값 사용<small>‘적용’으로 확정한 톤·레벨·커브·그림자 설정에서 시작합니다.</small></label>}
    <Suspense fallback={<p className="builder-processing-loading">이미지 편집기를 준비하고 있습니다…</p>}><ImageProcessor initial={initial} onApply={apply} onRestore={restore}/></Suspense>
  </dialog>;
}
