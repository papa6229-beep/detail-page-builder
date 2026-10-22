import { ImageType, type ProductData } from './types';
import type { ShadowSettings } from './lab/shadow';
import type { ColorAdjustments } from './lab/colorAdjustments';
import { clearChangedProductFraming } from './productFraming';
import { clearChangedPreviewTransforms } from './previewImageTransforms';

export interface SavedImageEdit { original: string; tone: number; shadow: ShadowSettings; color?: ColorAdjustments }
export interface ImageSlot { key: string; label: string; image: string }
const labels: Record<ImageType, string> = {
  mainImage: '메인 이미지', packageImage: '패키지 이미지', featureImage: '핵심 특징',
  point1Image1: '포인트 1-1', point1Image2: '포인트 1-2', point1Image3: '포인트 1-3',
  point2Image1: '포인트 2-1', point2Image2: '포인트 2-2', point2Image3: '포인트 2-3',
  sizeImage: '사이즈 이미지', videoInsertImage: '동영상 삽입 이미지', thumbnailImage: '썸네일 이미지',
};

export const canProcessImage = (image: string | null | undefined): image is string =>
  Boolean(image && image !== '__ENABLED__' && !/^data:image\/(gif|svg\+xml|x-icon|vnd.microsoft.icon)[;,]/i.test(image) && !/\.(gif|svg|ico)(?:[?#]|$)/i.test(image));

export function readImageSlot(data: ProductData, key: string): string | null {
  if (key.startsWith('option:')) return data.options.find(option => option.id === key.slice(7))?.image ?? null;
  return Object.values(ImageType).includes(key as ImageType) ? data[key as ImageType] ?? null : null;
}

export function getImageSlots(data: ProductData): ImageSlot[] {
  const slots: ImageSlot[] = [];
  const add = (key: string, label: string) => { const image = readImageSlot(data, key); if (canProcessImage(image)) slots.push({ key, label, image }); };
  add(ImageType.MAIN, labels.mainImage);
  add(ImageType.VIDEO_INSERT, labels.videoInsertImage);
  if (data.isPackageImageEnabled ?? true) add(ImageType.PACKAGE, labels.packageImage);
  data.options.forEach((option, i) => add(`option:${option.id}`, `옵션 ${i + 1}${option.name ? ` · ${option.name}` : ''}`));
  for (const key of [ImageType.FEATURE, ImageType.POINT1_1, ImageType.POINT1_2, ImageType.POINT1_3, ImageType.POINT2_1, ImageType.POINT2_2, ImageType.POINT2_3, ImageType.SIZE, ImageType.THUMBNAIL]) add(key, labels[key]);
  return slots;
}

export function writeImageSlot(data: ProductData, key: string, image: string, edit?: SavedImageEdit): ProductData {
  const imageEdits = { ...data.imageEdits };
  if (edit) imageEdits[key] = edit; else delete imageEdits[key];
  if (key.startsWith('option:')) return clearChangedPreviewTransforms(data, { ...data, imageEdits, options: data.options.map(option => option.id === key.slice(7) ? { ...option, image } : option) });
  if (!Object.values(ImageType).includes(key as ImageType)) return data;
  return clearChangedProductFraming(data, { ...data, [key]: image, imageEdits });
}

/** New uploads/deletions invalidate that slot's previous original and parameters. */
export function clearChangedImageEdits(previous: ProductData, next: ProductData): ProductData {
  const imageEdits = { ...next.imageEdits };
  for (const key of Object.keys(imageEdits)) if (readImageSlot(previous, key) !== readImageSlot(next, key)) delete imageEdits[key];
  return clearChangedProductFraming(previous, { ...next, imageEdits });
}

export function imageBlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('보정한 이미지를 적용하지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
}
