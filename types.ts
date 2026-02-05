// types.ts

export interface SummaryInfo {
  feature: string;   // 특징
  type: string;      // 타입
  material: string;  // 재질
  size: string;      // 치수
  weight: string;    // 무게
  power: string;     // 전원타입
  maker: string;     // 제조사 / 브랜드
}

export interface OptionItem {
  id: string;
  name: string;
  image: string | null;
}

export interface ProductData {
  productNameKr: string;
  productNameEn: string;
  brandName: string;
  summaryInfo: SummaryInfo;
  themeColor: string;
  options: OptionItem[];

  // Images (Base64)
  mainImage: string | null;
  packageImage: string | null;
  featureImage: string | null;
  
  // POINT 1 Images
  point1Image1: string | null;
  point1Image2: string | null;
  point1Image3?: string | null; // [추가] 선택형 이미지 3

  // POINT 2 Images
  point2Image1: string | null;
  point2Image2: string | null;
  point2Image3?: string | null; // [추가] 선택형 이미지 3

  sizeImage: string | null;
  videoInsertImage: string | null; // [추가] 동영상 삽입 (이미지)
  thumbnailImage: string | null;

  // Toggle Flags
  isPackageImageEnabled?: boolean;

  // AI Generated Text
  aiSummary: string;
  aiFeatureDesc: string;
  
  // POINT 1 Descriptions
  aiPoint1Desc: string;
  aiPoint1Desc2?: string; // [추가] 선택형 설명 2
  aiPoint1Desc3?: string; // [추가] 선택형 설명 3

  // POINT 2 Descriptions
  aiPoint2Desc: string;
  aiPoint2Desc2?: string; // [추가] 선택형 설명 2
  aiPoint2Desc3?: string; // [추가] 선택형 설명 3
}

export enum ImageType {
  MAIN = 'mainImage',
  PACKAGE = 'packageImage',
  FEATURE = 'featureImage',
  POINT1_1 = 'point1Image1',
  POINT1_2 = 'point1Image2',
  POINT1_3 = 'point1Image3', // [추가]
  POINT2_1 = 'point2Image1',
  POINT2_2 = 'point2Image2',
  POINT2_3 = 'point2Image3', // [추가]
  SIZE = 'sizeImage',
  VIDEO_INSERT = 'videoInsertImage', // [추가]
  THUMBNAIL = 'thumbnailImage'
}