// constants.ts

import { ProductData } from './types';

export const DEFAULT_THEME_COLOR = '#E11D48'; // Rose 600

export const INITIAL_PRODUCT_DATA: ProductData = {
  productNameKr: '',
  productNameEn: '',
  brandName: '',
  summaryInfo: {
    feature: '',
    type: '',
    material: '',
    size: '',
    weight: '',
    power: '',
    maker: '',
  },
  themeColor: DEFAULT_THEME_COLOR,
  
  // ▼▼▼ [추가된 부분] 빈 옵션 리스트로 시작
  options: [],

  mainImage: null,
  packageImage: null,
  featureImage: null,
  point1Image1: null,
  point1Image2: null,
  point2Image1: null,
  point2Image2: null,
  sizeImage: null,
  thumbnailImage: null,
  aiSummary: '',
  aiFeatureDesc: '',
  aiPoint1Desc: '',
  aiPoint2Desc: ''
};

export const COLOR_PRESETS = [
  // 단색
  { type: 'solid', value: '#111111' },
  { type: 'solid', value: '#e11d48' },
  { type: 'solid', value: '#2563eb' },
  { type: 'solid', value: '#16a34a' },
  { type: 'solid', value: '#f59e0b' }, // 진한 옐로우

  // 그라데이션
  {
    type: 'gradient',
    value: 'linear-gradient(90deg, #facc15, #f59e0b)', // 옐로우 → 오렌지
  },
  {
    type: 'gradient',
    value: 'linear-gradient(90deg, #fde047, #f97316)', // 라이트 옐로우 → 딥 오렌지
  },
  {
    type: 'gradient',
    value: 'linear-gradient(90deg, #fbbf24, #dc2626)', // 옐로우 → 레드
  },
  {
    type: 'gradient',
    value: 'linear-gradient(90deg, #22c55e, #16a34a)', // 그린
  },
  {
    type: 'gradient',
    value: 'linear-gradient(90deg, #3b82f6, #1e3a8a)', // 블루
  },
];

export const THUMBNAIL_SIZES = [202, 400, 500];