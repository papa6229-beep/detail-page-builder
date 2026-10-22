import { drawShadow, findShadowBounds, normalizeShadow, type ShadowSettings } from './shadow';
import { applyColorAdjustments, type ColorAdjustments } from './colorAdjustments';

/** Mild automatic luminance followed by the user's levels/curves. Source and alpha remain separate. */
export async function finishImage(blob: Blob, strength: number, shadow: boolean | ShadowSettings, color?: ColorAdjustments): Promise<Blob> {
  const image = await createImageBitmap(blob);
  try {
    const { width, height } = image;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('이미지 처리 캔버스를 만들 수 없습니다.');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height);
    const histogram = new Uint32Array(256);
    let count = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels.data[i + 3] < 180) continue;
      const luma = Math.round(pixels.data[i] * .2126 + pixels.data[i + 1] * .7152 + pixels.data[i + 2] * .0722);
      histogram[luma]++; count++;
    }
    const percentile = (q: number) => {
      let sum = 0;
      for (let i = 0; i < 256; i++) { sum += histogram[i]; if (sum >= count * q) return i; }
      return 128;
    };
    const median = percentile(.5);
    const gamma = median < 100 ? .94 : median > 175 ? 1.02 : .98;
    const contrast = percentile(.95) - percentile(.05) < 100 ? 1.035 : 1.01;
    const amount = Math.max(0, Math.min(1, strength));
    if (count && amount) for (let i = 0; i < pixels.data.length; i += 4) {
      if (!pixels.data[i + 3]) continue;
      const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
      const y = (.2126 * r + .7152 * g + .0722 * b) / 255;
      if (y <= 0) continue;
      const curve = (Math.pow(y, gamma) - .5) * contrast + .5;
      const delta = Math.max(-.035, Math.min(.035, curve - y)) * amount;
      const gain = Math.min(Math.max(0, y + delta) / y, 255 / Math.max(r, g, b, 1));
      pixels.data[i] = Math.round(r * gain);
      pixels.data[i + 1] = Math.round(g * gain);
      pixels.data[i + 2] = Math.round(b * gain);
    }
    applyColorAdjustments(pixels.data, color);
    ctx.putImageData(pixels, 0, 0);
    const settings = normalizeShadow(shadow);
    const bounds = settings.enabled && settings.opacity > 0 ? findShadowBounds(pixels.data, width, height) : null;
    if (bounds) drawShadow(ctx, bounds, settings);
    return canvas.convertToBlob({ type: 'image/png' });
  } finally { image.close(); }
}
