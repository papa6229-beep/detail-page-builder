import type { ProductData } from './types';
import { clearChangedPreviewTransforms } from './previewImageTransforms';

export type FramingTarget = 'main' | 'thumbnail';
export interface ProductFraming {
  imageWidth: number; imageHeight: number;
  bounds: { left: number; top: number; width: number; height: number };
  ratio: number; zoom: number; offsetX: number; offsetY: number;
}
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));

export const framingSource = (data: ProductData, target: FramingTarget) => target === 'main' ? data.mainImage : data.thumbnailImage || data.mainImage;

export async function analyseProductFraming(source: string): Promise<ProductFraming> {
  const response = await fetch(source);
  if (!response.ok) throw new Error('사진을 불러오지 못했습니다. 다시 첨부해주세요.');
  const image = await createImageBitmap(await response.blob());
  try {
    const { width, height } = image;
    const canvas = new OffscreenCanvas(width, height), ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('사진을 분석할 수 없습니다.');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      // Keep visible translucent parts and contact shadows; ignore almost invisible blur tails.
      if (pixels[(y * width + x) * 4 + 3] < 16) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    if (right < left) throw new Error('보이는 제품 영역을 찾지 못했습니다. 사진을 확인해주세요.');
    if (left === 0 && top === 0 && right === width - 1 && bottom === height - 1) throw new Error('투명 여백이 없는 사진입니다. 누끼·보정 후 제품 크기를 맞춰주세요.');
    const bounds = { left, top, width: right - left + 1, height: bottom - top + 1 };
    return { imageWidth: width, imageHeight: height, bounds, ratio: clamp(bounds.width / bounds.height, .8, 2.5), zoom: 1, offsetX: 0, offsetY: 0 };
  } finally { image.close(); }
}

export function framingLayout(frame: ProductFraming, width: number, height: number, target: FramingTarget) {
  const areaHeight = target === 'thumbnail' ? Math.max(height * .3, height - width / 500 * 128) : height;
  const base = Math.min(width * .84 / frame.bounds.width, areaHeight * .84 / frame.bounds.height);
  const maximum = Math.min(width * .96 / frame.bounds.width, areaHeight * .96 / frame.bounds.height) / base;
  const zoom = clamp(Number.isFinite(frame.zoom) ? frame.zoom : 1, .35, maximum);
  const scale = base * zoom;
  const productWidth = frame.bounds.width * scale, productHeight = frame.bounds.height * scale;
  const centerX = clamp(width / 2 + (frame.offsetX || 0) / 100 * width, width * .02 + productWidth / 2, width * .98 - productWidth / 2);
  const centerY = clamp(areaHeight / 2 + (frame.offsetY || 0) / 100 * areaHeight, areaHeight * .02 + productHeight / 2, areaHeight * .98 - productHeight / 2);
  return {
    imageX: centerX - (frame.bounds.left + frame.bounds.width / 2) * scale,
    imageY: centerY - (frame.bounds.top + frame.bounds.height / 2) * scale,
    imageWidth: frame.imageWidth * scale, imageHeight: frame.imageHeight * scale,
    productX: centerX - productWidth / 2, productY: centerY - productHeight / 2, productWidth, productHeight,
    zoom, offsetX: (centerX - width / 2) / width * 100, offsetY: (centerY - areaHeight / 2) / areaHeight * 100, areaHeight,
  };
}

export function clearChangedProductFraming(previous: ProductData, next: ProductData): ProductData {
  const productFraming = { ...next.productFraming };
  for (const target of ['main', 'thumbnail'] as const) if (framingSource(previous, target) !== framingSource(next, target)) delete productFraming[target];
  return clearChangedPreviewTransforms(previous, { ...next, productFraming });
}

export const exportProductNode = (node: Node) => !(node instanceof HTMLElement && node.dataset.editorOnly === 'true');
