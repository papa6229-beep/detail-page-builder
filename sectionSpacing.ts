import type { ProductData, SectionSpacingKey } from './types';

export const MAX_SECTION_SPACING = 600;
export const SECTION_SPACING: Record<SectionSpacingKey, { label: string; defaultValue: number }> = {
  main: { label: '메인 이미지', defaultValue: 64 },
  spec: { label: '스펙 정보', defaultValue: 80 },
  summary: { label: '핵심 요약', defaultValue: 40 },
  video: { label: '동영상 이미지', defaultValue: 40 },
  package: { label: '패키지 이미지', defaultValue: 64 },
  options: { label: '추가 옵션', defaultValue: 40 },
  feature: { label: '핵심 특징', defaultValue: 128 },
  point1: { label: 'Point 01', defaultValue: 128 },
  point2: { label: 'Point 02', defaultValue: 128 },
  size: { label: '사이즈 정보', defaultValue: 128 },
};

export const clampSectionSpacing = (value: number) => Math.min(MAX_SECTION_SPACING, Math.max(0, Math.round(value)));

export const getSectionSpacing = (data: ProductData, key: SectionSpacingKey) => {
  const value = data.sectionSpacing?.[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? clampSectionSpacing(value)
    : SECTION_SPACING[key].defaultValue;
};
