
export interface SummaryInfo {
  features: string;
  type: string;
  material: string;
  dimensions: string;
  weight: string;
  maker: string;
}

export interface ProductData {
  productNameKr: string;
  productNameEn: string;
  brandName: string;
  summaryInfo: SummaryInfo;
  themeColor: string;
  
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
