export interface ShadowSettings {
  enabled: boolean;
  opacity: number;
  offsetX: number;
  offsetY: number;
  blur: number;
  width: number;
  depth: number;
  angle: number;
}

export interface ProductBounds { left: number; right: number; top: number; bottom: number }
export interface ShadowMask { silhouette: OffscreenCanvas; contact: OffscreenCanvas; padding: number }

/** Geometry must include translucent products; tone statistics deliberately use a stricter alpha cutoff. */
export function findShadowBounds(pixels: Uint8ClampedArray, width: number, height: number): ProductBounds | null {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return right >= left ? { left, right, top, bottom } : null;
}

export function createShadowMask(source: CanvasImageSource, bounds: ProductBounds): ShadowMask {
  const { left, right, top, bottom } = bounds;
  const width = right - left + 1, height = bottom - top + 1;
  const mask = new OffscreenCanvas(width, height);
  const ctx = mask.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('그림자 마스크를 만들 수 없습니다.');
  ctx.drawImage(source, left, top, width, height, 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const padding = Math.max(2, Math.ceil(height * .045));
  const contact = new OffscreenCanvas(width, height + padding);
  const contactCtx = contact.getContext('2d');
  if (!contactCtx) throw new Error('접촉 그림자를 만들 수 없습니다.');
  const footprint = contactCtx.createImageData(width, contact.height);
  // Trace each column's underside instead of squeezing the whole silhouette into a line.
  // Higher parts cast less contact shadow; translucent material remains lighter.
  for (let x = 0; x < width; x++) {
    let edge = -1, coverage = 0;
    for (let y = 0; y < height; y++) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha < 16) continue;
      edge = y; coverage = Math.max(coverage, alpha);
    }
    if (edge < 0) continue;
    // A translucent body can sit just above a lower opaque base. Avoid multiplying
    // two severe discounts there: it still needs a visible, tight contact edge.
    // Fully transparent columns remain empty, and opaque floor contacts keep 1:1 strength.
    const proximity = Math.exp(-(height - 1 - edge) / Math.max(1, height * .5));
    const alpha = 255 * Math.pow(coverage / 255, .3) * proximity;
    for (let y = edge; y <= Math.min(contact.height - 1, edge + padding); y++) {
      const fade = 1 - (y - edge) / (padding + 1);
      footprint.data[(y * width + x) * 4 + 3] = Math.round(alpha * fade);
    }
  }
  contactCtx.putImageData(footprint, 0, 0);
  return { silhouette: mask, contact, padding };
}

export const DEFAULT_SHADOW: Readonly<ShadowSettings> = Object.freeze({
  enabled: true, opacity: 45, offsetX: 0, offsetY: 0, blur: 6, width: 100, depth: 100, angle: 0,
});

export function normalizeShadow(value: boolean | ShadowSettings): ShadowSettings {
  const source = typeof value === 'boolean' ? { ...DEFAULT_SHADOW, enabled: value } : value;
  const limit = (key: keyof Omit<ShadowSettings, 'enabled'>, min: number, max: number) =>
    Math.max(min, Math.min(max, Number.isFinite(source?.[key]) ? source[key] : DEFAULT_SHADOW[key]));
  return {
    enabled: source?.enabled ?? true,
    opacity: limit('opacity', 0, 100), offsetX: limit('offsetX', -100, 100), offsetY: limit('offsetY', -100, 100),
    blur: limit('blur', 0, 30), width: limit('width', 25, 250), depth: limit('depth', 25, 500),
    angle: ((Number.isFinite(source?.angle) ? source.angle : 0) % 360 + 540) % 360 - 180,
  };
}

/** Project the existing alpha silhouette onto the floor; no generated product pixels. */
export function drawShadow(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  bounds: ProductBounds,
  settings: ShadowSettings,
  cachedMask?: ShadowMask,
) {
  if (!settings.enabled || settings.opacity === 0) return;
  const { left, right, top, bottom } = bounds;
  const productWidth = right - left + 1, productHeight = bottom - top + 1;
  const mask = cachedMask ?? createShadowMask(ctx.canvas, bounds);

  const footprintWidth = productWidth * settings.width / 100;
  const centerX = (left + right) / 2 + productWidth * settings.offsetX / 100;
  const baseline = bottom + productHeight * settings.offsetY / 100;
  const depth = settings.depth / 100;
  const softness = Math.min(productWidth, productHeight) * settings.blur / 100;
  const ambientHeight = Math.max(3, productHeight * .18 * depth);
  // Canvas filters use output pixels, while the silhouette follows the current transform.
  const transform = ctx.getTransform();
  const pixelScale = Math.sqrt(Math.abs(transform.a * transform.d - transform.b * transform.c)) || 1;
  ctx.save();
  try {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.translate(centerX, baseline);
    ctx.rotate((settings.angle ?? 0) * Math.PI / 180);
    // The tight contact layer is nearest the product; ambient light spreads behind it.
    ctx.globalAlpha = settings.opacity / 100;
    ctx.filter = `blur(${Math.max(.5, softness * .22) * pixelScale}px)`;
    ctx.drawImage(mask.contact, -footprintWidth / 2, -(productHeight - 1) * depth, footprintWidth, (productHeight + mask.padding) * depth);
    ctx.globalAlpha = settings.opacity / 100 * .75;
    ctx.filter = `blur(${Math.max(.4, softness) * pixelScale}px)`;
    ctx.drawImage(mask.silhouette, -footprintWidth / 2, -ambientHeight * .7, footprintWidth, ambientHeight);
  } finally { ctx.restore(); }
}
