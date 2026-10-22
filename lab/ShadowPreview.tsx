import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createShadowMask, drawShadow, findShadowBounds, normalizeShadow, type ProductBounds, type ShadowSettings, type ShadowMask } from './shadow';

type Mode = 'move' | 'width' | 'depth' | 'both' | 'rotate';
interface Resource { image: ImageBitmap; bounds: ProductBounds | null; mask?: ShadowMask }
interface Props {
  blob: Blob;
  settings: ShadowSettings;
  actualSize: boolean;
  onChange: (settings: ShadowSettings) => void;
  onExport: (blob: Blob) => void;
  onError: (message: string) => void;
}

/** The cached product and alpha mask repaint on animation frames; PNG encoding waits for idle. */
export function ShadowPreview({ blob, settings, actualSize, onChange, onExport, onError }: Props) {
  const surface = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [resource, setResource] = useState<Resource | null>(null);
  const [view, setView] = useState({ width: 1, height: 1 });
  const [interacting, setInteracting] = useState(false);
  const gesture = useRef<{ id: number; mode: Mode; x: number; y: number; settings: ShadowSettings; productWidth: number; baseHeight: number; centerX: number; centerY: number; startAngle: number } | null>(null);

  useEffect(() => {
    let cancelled = false, bitmap: ImageBitmap | null = null;
    setResource(null);
    void createImageBitmap(blob).then(image => {
      bitmap = image;
      if (cancelled) { image.close(); return; }
      const c = new OffscreenCanvas(image.width, image.height);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('미리보기 캔버스를 만들 수 없습니다.');
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      const bounds = findShadowBounds(pixels, image.width, image.height);
      setResource({ image, bounds, mask: bounds ? createShadowMask(image, bounds) : undefined });
    }).catch(error => { if (!cancelled) onError(String(error?.message || error)); });
    return () => { cancelled = true; bitmap?.close(); };
  }, [blob, onError]);

  useLayoutEffect(() => {
    const stage = surface.current?.parentElement;
    if (!stage || !resource) return;
    const measure = () => {
      const { width, height } = resource.image;
      const scale = actualSize ? 1 : Math.min(1, stage.clientWidth / width, stage.clientHeight / height);
      setView({ width: width * scale, height: height * scale });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(stage);
    return () => observer.disconnect();
  }, [resource, actualSize]);

  useLayoutEffect(() => {
    if (!resource || !canvas.current) return;
    const frame = requestAnimationFrame(() => {
      try {
        const target = canvas.current;
        if (!target) return;
        const { image, bounds, mask } = resource;
        const scale = actualSize ? 1 : Math.min(1, view.width * window.devicePixelRatio / image.width);
        target.width = Math.max(1, Math.round(image.width * scale));
        target.height = Math.max(1, Math.round(image.height * scale));
        const ctx = target.getContext('2d');
        if (!ctx) throw new Error('미리보기를 표시할 수 없습니다.');
        ctx.scale(target.width / image.width, target.height / image.height);
        ctx.drawImage(image, 0, 0);
        if (bounds) drawShadow(ctx, bounds, settings, mask);
        Object.assign(target.dataset, {
          offsetX: String(settings.offsetX), offsetY: String(settings.offsetY), shadowWidth: String(settings.width),
          shadowDepth: String(settings.depth), opacity: String(settings.opacity), blur: String(settings.blur), dragging: String(interacting), angle: String(settings.angle ?? 0),
        });
      } catch (error) { onError(String(error?.message || error)); }
    });
    return () => cancelAnimationFrame(frame);
  }, [resource, settings, view, actualSize, interacting, onError]);

  useEffect(() => {
    if (!resource || interacting) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      try {
        const { image, bounds, mask } = resource;
        const output = new OffscreenCanvas(image.width, image.height);
        const ctx = output.getContext('2d');
        if (!ctx) throw new Error('저장용 이미지를 만들 수 없습니다.');
        ctx.drawImage(image, 0, 0);
        if (bounds) drawShadow(ctx, bounds, settings, mask);
        void output.convertToBlob({ type: 'image/png' }).then(result => { if (!cancelled) onExport(result); })
          .catch(error => { if (!cancelled) onError(String(error?.message || error)); });
      } catch (error) { if (!cancelled) onError(String(error?.message || error)); }
    }, 120);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [resource, settings, interacting, onExport, onError]);

  const bounds = resource?.bounds;
  const scale = resource ? view.width / resource.image.width : 1;
  const productWidth = bounds ? (bounds.right - bounds.left + 1) * scale : 1;
  const productHeight = bounds ? (bounds.bottom - bounds.top + 1) * scale : 1;
  const baseHeight = Math.max(28, productHeight * .18);
  const frameWidth = productWidth * settings.width / 100;
  const frameHeight = baseHeight * settings.depth / 100;
  const centerX = bounds ? (bounds.left + bounds.right) / 2 * scale + productWidth * settings.offsetX / 100 : 0;
  const centerY = bounds ? bounds.bottom * scale + productHeight * settings.offsetY / 100 : 0;

  const start = (event: React.PointerEvent<HTMLButtonElement>, mode: Mode) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = surface.current!.getBoundingClientRect();
    const pivotX = rect.left + centerX, pivotY = rect.top + centerY;
    gesture.current = { id: event.pointerId, mode, x: event.clientX, y: event.clientY, settings, productWidth, baseHeight, centerX: pivotX, centerY: pivotY, startAngle: Math.atan2(event.clientY - pivotY, event.clientX - pivotX) };
    setInteracting(true);
  };
  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    const next = { ...drag.settings };
    if (drag.mode === 'move') {
      next.offsetX += dx / drag.productWidth * 100;
      next.offsetY += dy / productHeight * 100;
    } else if (drag.mode === 'rotate') {
      const angle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX);
      next.angle = (drag.settings.angle ?? 0) + (angle - drag.startAngle) * 180 / Math.PI;
      if (event.shiftKey) next.angle = Math.round(next.angle / 15) * 15;
    } else {
      const angle = (drag.settings.angle ?? 0) * Math.PI / 180;
      const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
      const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
      if (drag.mode !== 'depth') next.width += localX * 2 / drag.productWidth * 100;
      if (drag.mode !== 'width') next.depth += localY * 2 / drag.baseHeight * 100;
    }
    onChange(normalizeShadow(next));
  };
  const end = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null; setInteracting(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>, mode: Mode) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const next = { ...settings }, step = event.shiftKey ? 5 : 1;
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const delta = (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) * step;
    if (mode === 'rotate') next.angle = (next.angle ?? 0) + delta;
    else if (mode === 'move') { if (horizontal) next.offsetX += delta; else next.offsetY += delta; }
    else if (horizontal && mode !== 'depth') next.width += delta * 5;
    else if (!horizontal && mode !== 'width') next.depth += delta * 5;
    onChange(normalizeShadow(next));
  };
  const handle = (mode: Mode, label: string, className: string) => <button type="button" className={className} aria-label={label} title={`${label} · 드래그 또는 방향키`} onPointerDown={e => start(e, mode)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={e => keyboard(e, mode)}>{mode === 'rotate' ? '↻' : null}</button>;

  return <div ref={surface} className="shadow-surface" style={{ width: view.width, height: view.height }}>
    <canvas ref={canvas} role="img" aria-label="톤·그림자 적용" style={{ width: view.width, height: view.height }}/>
    {bounds && settings.enabled && <div className={`shadow-transform ${interacting ? 'active' : ''}`} style={{ left: centerX - frameWidth / 2, top: centerY - frameHeight / 2, width: frameWidth, height: frameHeight, transform: `rotate(${settings.angle ?? 0}deg)` }}>
      {handle('move', '그림자 이동', 'shadow-move')}
      {handle('width', '그림자 가로 크기 조절', 'shadow-handle horizontal')}
      {handle('depth', '그림자 세로 크기 조절', 'shadow-handle vertical')}
      {handle('both', '그림자 크기 조절', 'shadow-handle corner')}
      {handle('rotate', '그림자 회전', 'shadow-handle rotate')}
      <output className="shadow-angle">{Math.round(settings.angle ?? 0)}°</output>
    </div>}
  </div>;
}
