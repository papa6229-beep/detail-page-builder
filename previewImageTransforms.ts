import type { ProductData } from './types';

export interface PreviewImageTransform { x: number; y: number; scale: number; angle: number }
export const DEFAULT_IMAGE_TRANSFORM: Readonly<PreviewImageTransform> = Object.freeze({ x: 0, y: 0, scale: 1, angle: 0 });
export function normalizeImageTransform(value?: Partial<PreviewImageTransform>, editKey?: string): PreviewImageTransform {
  const limit = (key: keyof PreviewImageTransform, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value?.[key]) ? value![key]! : DEFAULT_IMAGE_TRANSFORM[key]));
  // Small logos must be able to cross the whole image; their own size is not a useful movement bound.
  const positionLimit = editKey?.startsWith('watermark:') ? Number.MAX_SAFE_INTEGER : 300;
  return { x: limit('x', -positionLimit, positionLimit), y: limit('y', -positionLimit, positionLimit), scale: limit('scale', .15, 4), angle: ((Number.isFinite(value?.angle) ? value!.angle! : 0) % 360 + 540) % 360 - 180 };
}
export function hasImageTransform(value?: PreviewImageTransform) {
  const t = normalizeImageTransform(value); return t.x !== 0 || t.y !== 0 || t.scale !== 1 || t.angle !== 0;
}
export const isGifImage = (image?: string | null) => Boolean(image && (/^data:image\/gif[;,]/i.test(image) || /\.gif(?:[?#]|$)/i.test(image)));
export function transformSource(data: ProductData, key: string): string | null {
  if (key === 'thumbnailImage') return data.thumbnailImage || data.mainImage;
  if (key === 'thumbnailPackage') return data.packageImage;
  if (key.startsWith('watermark:')) return data.watermarkImage ?? null;
  if (key.startsWith('option:')) return data.options.find(option => option.id === key.slice(7))?.image ?? null;
  const image = data[key as keyof ProductData]; return typeof image === 'string' ? image : null;
}
export function clearChangedPreviewTransforms(previous: ProductData, next: ProductData): ProductData {
  const previewImageTransforms = { ...next.previewImageTransforms };
  for (const key of Object.keys(previewImageTransforms)) if (transformSource(previous, key) !== transformSource(next, key)) delete previewImageTransforms[key];
  return { ...next, previewImageTransforms };
}
