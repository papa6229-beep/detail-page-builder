// types.ts

export interface SummaryInfo {
  features: string;
  type: string;
  material: string;
  dimensions: string;
  weight: string;
  maker: string;
}

// ▼▼▼ [추가된 부분] 옵션 하나하나의 모양 정의
export interface OptionItem {
  id: string; // 구분을 위한 ID
  name: string;
  image: string | null;
}

export interface ProductData {
  productNameKr: string;
  productNameEn: string;
  brandName: string;
  summaryInfo: SummaryInfo;
  themeColor: string;
  
  // ▼▼▼ [추가된 부분] 옵션 리스트 (여러 개일 수 있으니까 배열로)
  options: OptionItem[];

  // Images (Base64)
  mainImage: string | null;
  packageImage: string | null;
  featureImage: string | null;
  point1Image1: string | null;
  point1Image2: string | null;
  point2Image1: string | null;
  point2Image2: string | null;
  sizeImage: string | null;
  thumbnailImage: string | null;

  // AI Generated Text
  aiSummary: string;
  aiFeatureDesc: string;
  aiPoint1Desc: string;
  aiPoint2Desc: string;
}

export enum ImageType {
  MAIN = 'mainImage',
  PACKAGE = 'packageImage',
  FEATURE = 'featureImage',
  POINT1_1 = 'point1Image1',
  POINT1_2 = 'point1Image2',
  POINT2_1 = 'point2Image1',
  POINT2_2 = 'point2Image2',
  SIZE = 'sizeImage',
  THUMBNAIL = 'thumbnailImage'
}