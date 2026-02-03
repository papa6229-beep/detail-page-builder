import React, { forwardRef } from 'react';
import { ProductData } from '../types';

interface ThumbnailPreviewProps {
  data: ProductData;
  size: number;
}

const ThumbnailPreview = forwardRef<HTMLDivElement, ThumbnailPreviewProps>(({ data, size }, ref) => {
  const image = data.thumbnailImage || data.mainImage;

  // 썸네일 크기에 따른 스케일 비율 계산 (기준: 500px)
  const scale = size / 500;

  return (
    <div 
      ref={ref}
      style={{ width: `${size}px`, height: `${size}px` }}
      className="bg-white relative overflow-hidden flex items-center justify-center shrink-0 border border-gray-200 shadow-sm"
    >
      {/* 1. 이미지 영역 (Background Layer) 
        - inset-0을 주어 썸네일 전체 영역을 꽉 채우게 변경했습니다.
        - z-index를 0으로 두어 텍스트 뒤에 깔리게 합니다.
      */}
      <div className="absolute inset-0 flex items-center justify-center bg-white z-0">
        {image ? (
          <img src={image} className="w-full h-full object-contain" alt="Thumbnail" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200 font-bold" style={{ fontSize: `${20 * scale}px` }}>
            NO IMAGE
          </div>
        )}
      </div>

      {/* 2. 텍스트 정보 영역 (Overlay Layer)
        - position: absolute, bottom: 0 으로 이미지 위에 겹쳐집니다.
        - z-index를 10으로 두어 이미지보다 위에 뜹니다.
      */}
      <div 
        className="absolute left-0 bottom-0 w-full flex flex-col justify-end items-start font-sans z-10"
        style={{ 
          padding: `${24 * scale}px`, 
          gap: `${2 * scale}px`
        }}
      >
        {/* SINCE 1999 뱃지 & 슬로건 */}
        <div className="flex items-center" style={{ gap: `${6 * scale}px`, marginBottom: `${4 * scale}px` }}>
          <div 
            className="border border-gray-500 rounded-full flex items-center justify-center text-gray-600 font-bold bg-white/80 backdrop-blur-[2px]"
            style={{ 
              padding: `${2 * scale}px ${8 * scale}px`,
              fontSize: `${11 * scale}px`,
              borderWidth: `${1 * scale}px`,
              height: `${20 * scale}px`
            }}
          >
            SINCE 1999
          </div>
          <span 
            className="text-gray-800 font-bold tracking-tight bg-white/60 backdrop-blur-[1px] px-1 rounded"
            style={{ fontSize: `${13 * scale}px` }}
          >
            대한민국 No.1 성인용품점
          </span>
        </div>

        {/* 메인 브랜드 텍스트 (바나나몰 | BRAND NAME) */}
        <div className="flex items-end leading-none text-gray-900" style={{ gap: `${8 * scale}px` }}>
          {/* 바나나몰: stroke 효과를 줘서 더 두껍게 표현 */}
          <span 
            className="font-black tracking-tighter text-gray-900"
            style={{ 
              fontSize: `${38 * scale}px`,
              textShadow: `${1 * scale}px 0 0 currentColor` // 인위적으로 두께를 더 주는 트릭
            }}
          >
            바나나몰
          </span>
          
          <span 
            className="font-light text-gray-400"
            style={{ fontSize: `${36 * scale}px`, marginBottom: `${3 * scale}px` }}
          >
            |
          </span>
          
          <span 
            className="font-light uppercase tracking-tight truncate"
            style={{ 
              fontSize: `${38 * scale}px`,
              maxWidth: `${260 * scale}px`
            }}
          >
            {data.brandName || "BRAND"}
          </span>
        </div>

        {/* URL */}
        <div 
          className="text-gray-800 font-bold tracking-wide mt-1"
          style={{ fontSize: `${18 * scale}px` }}
        >
          bananamall.co.kr
        </div>
      </div>

      {/* 3. 패키지 이미지 오버레이 (우측 하단) */}
      {(data.packageImage && (data.isPackageImageEnabled ?? true)) && (
        <img
          src={data.packageImage}
          className="absolute z-20 object-contain"
          alt="Package Overlay"
          style={{
            maxWidth: '20%',
            height: 'auto',
            bottom: `${12 * scale}px`,
            right: `${12 * scale}px`,
          }}
        />
      )}
    </div>
  );
});

export default ThumbnailPreview;