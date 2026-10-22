import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeImageTransform, hasImageTransform, type PreviewImageTransform } from '../previewImageTransforms';

interface EditingContext {
  selected: string | null; select: (id: string | null, key?: string) => void;
  transforms: Record<string, PreviewImageTransform>;
  change: (key: string, value?: PreviewImageTransform) => void;
  beginImageEdit?: () => void; endImageEdit?: () => void;
  revision: unknown;
}
export const PreviewImageEditingContext = createContext<EditingContext | null>(null);
interface Box { left: number; top: number; width: number; height: number }
interface Geometry { canvas: HTMLElement; centerX: number; centerY: number; box: Box; factor: number }
type Mode = 'move' | 'resize' | 'rotate';

export default function EditablePreviewImage({ editKey, instanceId = editKey, label, box: suppliedBox, interactive = true, tools, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { editKey: string; instanceId?: string; label: string; box?: Box; interactive?: boolean; tools?: React.ReactNode }) {
  const editing = useContext(PreviewImageEditingContext);
  const image = useRef<HTMLImageElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [loaded, setLoaded] = useState(0);
  const value = normalizeImageTransform(editing?.transforms[editKey], editKey);
  const selected = editing?.selected === instanceId;
  const drag = useRef<{ id: number; mode: Mode; x: number; y: number; value: PreviewImageTransform; centerX: number; centerY: number; radius: number; angle: number; geometry: Geometry } | null>(null);

  useLayoutEffect(() => {
    const element = image.current;
    const canvas = element?.closest('[data-image-canvas]') as HTMLElement | null;
    if (!element || !canvas || !editing) return;
    const measure = () => {
      const width = element.offsetWidth, height = element.offsetHeight;
      if (!width || !height) return;
      const css = getComputedStyle(element);
      let box = suppliedBox ?? { left: 0, top: 0, width, height };
      if (!suppliedBox && css.objectFit === 'contain' && element.naturalWidth && element.naturalHeight) {
        const px = parseFloat(css.paddingLeft) + parseFloat(css.paddingRight), py = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
        const ratio = Math.min((width - px) / element.naturalWidth, (height - py) / element.naturalHeight);
        const w = element.naturalWidth * ratio, h = element.naturalHeight * ratio;
        box = { left: (width - w) / 2, top: (height - h) / 2, width: w, height: h };
      }
      let left = element.offsetLeft, top = element.offsetTop;
      let parent = element.offsetParent as HTMLElement | null;
      while (parent && parent !== canvas) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(parent).transform);
        left += parent.offsetLeft + parent.clientLeft + matrix.m41;
        top += parent.offsetTop + parent.clientTop + matrix.m42;
        parent = parent.offsetParent as HTMLElement | null;
      }
      if (parent !== canvas) return;
      const factor = canvas.getBoundingClientRect().width / canvas.offsetWidth;
      const next = { canvas, centerX: left + box.left + box.width / 2 + value.x / 100 * box.width, centerY: top + box.top + box.height / 2 + value.y / 100 * box.height, box, factor };
      setGeometry(previous => previous?.canvas === canvas && Math.abs(previous.centerX - next.centerX) < .01 && Math.abs(previous.centerY - next.centerY) < .01 && previous.factor === factor && Object.keys(box).every(key => previous.box[key as keyof Box] === box[key as keyof Box]) ? previous : next);
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(element); observer.observe(canvas);
    return () => observer.disconnect();
  }, [editing?.revision, editing?.selected, editing !== null, props.src, loaded, suppliedBox?.left, suppliedBox?.top, suppliedBox?.width, suppliedBox?.height, value.x, value.y, value.scale, value.angle]);

  const box = suppliedBox ?? geometry?.box;
  const style: React.CSSProperties = { ...props.style, ...(editing ? { pointerEvents: 'none', userSelect: 'none' } : {}) };
  if (box && hasImageTransform(value)) {
    style.transformOrigin = `${box.left + box.width / 2}px ${box.top + box.height / 2}px`;
    style.transform = `translate(${value.x / 100 * box.width}px, ${value.y / 100 * box.height}px) rotate(${value.angle}deg) scale(${value.scale})`;
  }
  const start = (event: React.PointerEvent<HTMLButtonElement>, mode: Mode) => {
    if (!editing || !geometry || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); editing.select(instanceId, editKey);
    event.currentTarget.focus({ preventScroll: true }); editing.beginImageEdit?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = geometry.canvas.getBoundingClientRect();
    const cx = rect.left + (geometry.centerX + geometry.canvas.clientLeft) * geometry.factor;
    const cy = rect.top + (geometry.centerY + geometry.canvas.clientTop) * geometry.factor;
    drag.current = { id: event.pointerId, mode, x: event.clientX, y: event.clientY, value, geometry, centerX: cx, centerY: cy, radius: Math.max(1, Math.hypot(event.clientX - cx, event.clientY - cy)), angle: Math.atan2(event.clientY - cy, event.clientX - cx) };
  };
  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId || !editing) return;
    const next = { ...current.value }, g = current.geometry;
    if (current.mode === 'move') { next.x += (event.clientX - current.x) / g.factor / g.box.width * 100; next.y += (event.clientY - current.y) / g.factor / g.box.height * 100; }
    if (current.mode === 'resize') next.scale *= Math.hypot(event.clientX - current.centerX, event.clientY - current.centerY) / current.radius;
    if (current.mode === 'rotate') { next.angle += (Math.atan2(event.clientY - current.centerY, event.clientX - current.centerX) - current.angle) * 180 / Math.PI; if (event.shiftKey) next.angle = Math.round(next.angle / 15) * 15; }
    editing.change(editKey, normalizeImageTransform(next, editKey));
  };
  const end = (event: React.PointerEvent<HTMLButtonElement>) => { if (drag.current?.id !== event.pointerId) return; drag.current = null; editing?.endImageEdit?.(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };
  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>, mode: Mode) => {
    if (!editing || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const next = { ...value }, delta = (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) * (event.shiftKey ? 5 : 1);
    if (mode === 'rotate') next.angle += delta;
    else if (mode === 'resize') next.scale += delta * .02;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next.x += delta;
    else next.y += delta;
    editing.change(editKey, normalizeImageTransform(next, editKey));
  };
  const handle = (mode: Mode, title: string, className: string, size: number) => <button type="button" aria-label={`${label} ${title}`} title={`${title} · 드래그 또는 방향키`} className={className} style={mode === 'move' ? undefined : { width: size, height: size, fontSize: size * .8 }} onFocus={() => editing?.select(instanceId, editKey)} onPointerDown={event => start(event, mode)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={event => keyboard(event, mode)}>{mode === 'rotate' ? '↻' : null}</button>;
  return <>
    <img {...props} ref={image} draggable={false} data-preview-image={editKey} data-image-x={value.x} data-image-y={value.y} data-image-scale={value.scale} data-image-angle={value.angle} style={style} onLoad={event => { setLoaded(n => n + 1); props.onLoad?.(event); }}/>
    {editing && interactive && geometry && createPortal(<div data-editor-only="true" className="builder-picture-ui">
      <div className="builder-picture-selection" data-image-selection={selected ? editKey : undefined} style={{ left: geometry.centerX - geometry.box.width * value.scale / 2, top: geometry.centerY - geometry.box.height * value.scale / 2, width: geometry.box.width * value.scale, height: geometry.box.height * value.scale, transform: `rotate(${value.angle}deg)` }}>
        {handle('move', '이동', 'builder-picture-move', 0)}
        {selected && <>{handle('resize', '크기 조절', 'builder-picture-resize', 16 / geometry.factor)}{handle('rotate', '회전', 'builder-picture-rotate', 23 / geometry.factor)}</>}
      </div>
      {(selected || tools) && <div className="builder-picture-tools" style={{ left: Math.max(3, Math.min(geometry.centerX, geometry.canvas.clientWidth - (tools ? 215 : 130) / geometry.factor)), top: Math.max(3, geometry.centerY - geometry.box.height * value.scale / 2 - 34 / geometry.factor), fontSize: 11 / geometry.factor }}><span>{Math.round(value.angle)}°</span><button type="button" aria-label={`${label} 배치 초기화`} onClick={event => { event.stopPropagation(); editing.change(editKey); }}>배치 초기화</button>{tools}</div>}
    </div>, geometry.canvas)}
  </>;
}
