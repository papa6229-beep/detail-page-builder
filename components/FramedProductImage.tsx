import React, { useLayoutEffect, useRef, useState } from 'react';
import { framingLayout, type FramingTarget, type ProductFraming } from '../productFraming';
import EditablePreviewImage, { PreviewImageEditingContext } from './EditablePreviewImage';
import { normalizeImageTransform } from '../previewImageTransforms';

export default function FramedProductImage({ src, alt, frame, target, label, externalScale = 1, onChange }: {
  src: string; alt: string; frame: ProductFraming; target: FramingTarget; label: string; externalScale?: number;
  onChange?: (frame: ProductFraming) => void;
}) {
  const editing = React.useContext(PreviewImageEditingContext);
  const editKey = target === 'main' ? 'mainImage' : 'thumbnailImage';
  const transform = normalizeImageTransform(editing?.transforms[editKey]);
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ width: 1, height: 1 });
  const drag = useRef<{ id: number; x: number; y: number; mode: 'move' | 'resize'; frame: ProductFraming; layout: ReturnType<typeof framingLayout>; scaleX: number; scaleY: number } | null>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => setView({ width: Math.max(1, element.clientWidth), height: Math.max(1, element.clientHeight) });
    measure(); const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const layout = framingLayout(frame, view.width, view.height, target);
  const commit = (next: ProductFraming) => {
    const constrained = framingLayout(next, view.width, view.height, target);
    onChange?.({ ...next, zoom: constrained.zoom, offsetX: constrained.offsetX, offsetY: constrained.offsetY });
  };
  const start = (event: React.PointerEvent<HTMLButtonElement>, mode: 'move' | 'resize') => {
    if (event.button !== 0 || !onChange) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    const rect = root.current!.getBoundingClientRect();
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, mode, frame: { ...frame, zoom: layout.zoom, offsetX: layout.offsetX, offsetY: layout.offsetY }, layout, scaleX: rect.width / view.width, scaleY: rect.height / view.height };
  };
  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = (event.clientX - current.x) / current.scaleX, dy = (event.clientY - current.y) / current.scaleY;
    const next = { ...current.frame };
    if (current.mode === 'move') { next.offsetX += dx / view.width * 100; next.offsetY += dy / current.layout.areaHeight * 100; }
    else {
      const { productWidth: w, productHeight: h } = current.layout;
      next.zoom *= 1 + 2 * (dx * w + dy * h) / (w * w + h * h);
    }
    commit(next);
  };
  const end = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>, resize = false) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const delta = (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) * (event.shiftKey ? 5 : 1);
    const next = { ...frame, zoom: layout.zoom, offsetX: layout.offsetX, offsetY: layout.offsetY };
    if (resize) next.zoom += delta * .02;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next.offsetX += delta;
    else next.offsetY += delta;
    commit(next);
  };
  const handleSize = 14 / externalScale;
  const angle = transform.angle * Math.PI / 180;
  const boxWidth = transform.scale * (Math.abs(Math.cos(angle)) * layout.productWidth + Math.abs(Math.sin(angle)) * layout.productHeight);
  const boxHeight = transform.scale * (Math.abs(Math.sin(angle)) * layout.productWidth + Math.abs(Math.cos(angle)) * layout.productHeight);
  return <div ref={root} className="builder-product-framing" style={editing ? { overflow: 'visible' } : undefined} data-product-framing={target} data-product-x={layout.productX + layout.productWidth / 2 + transform.x / 100 * layout.productWidth - boxWidth / 2} data-product-y={layout.productY + layout.productHeight / 2 + transform.y / 100 * layout.productHeight - boxHeight / 2} data-product-width={boxWidth} data-product-height={boxHeight}>
    <EditablePreviewImage editKey={editKey} instanceId={`${editKey}:${label}`} label={`${label} 제품`} box={{ left: layout.productX - layout.imageX, top: layout.productY - layout.imageY, width: layout.productWidth, height: layout.productHeight }} src={src} alt={alt} style={{ position: 'absolute', left: layout.imageX, top: layout.imageY, width: layout.imageWidth, height: layout.imageHeight, maxWidth: 'none', maxHeight: 'none', pointerEvents: 'none' }}/>
    {onChange && !editing && <div data-editor-only="true" className="builder-product-handles">
      <button type="button" aria-label={`${label} 제품 이동`} className="builder-product-hit" style={{ left: layout.productX, top: layout.productY, width: layout.productWidth, height: layout.productHeight }} onPointerDown={event => start(event, 'move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={event => keyboard(event)}/>
      <button type="button" aria-label={`${label} 제품 크기 조절`} className="builder-product-resize" style={{ left: Math.min(layout.productX + layout.productWidth + 3 / externalScale, view.width - handleSize - 2 / externalScale), top: Math.min(layout.productY + layout.productHeight + 3 / externalScale, view.height - handleSize - 2 / externalScale), width: handleSize, height: handleSize }} onPointerDown={event => start(event, 'resize')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={event => keyboard(event, true)}/>
    </div>}
  </div>;
}
