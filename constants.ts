
import { ProductData } from './types';

export const DEFAULT_THEME_COLOR = '#E11D48'; // Rose 600

export const INITIAL_PRODUCT_DATA: ProductData = {
  productNameKr: '',
  productNameEn: '',
  brandName: '',
  summaryInfo: {
    features: '',
    type: '',
    material: '',
    dimensions: '',
    weight: '',
    maker: ''
  },
  themeColor: DEFAULT_THEME_COLOR,
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
  { label: 'Rose', value: '#E11D48' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Blue', value: '#2563EB' },
  { label: 'Green', value: '#10B981' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Black', value: '#1F2937' },
];

export const THUMBNAIL_SIZES = [202, 400, 500];
