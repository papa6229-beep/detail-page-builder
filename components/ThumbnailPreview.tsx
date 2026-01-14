
import React, { forwardRef } from 'react';
import { ProductData } from '../types';

interface ThumbnailPreviewProps {
  data: ProductData;
  size: number;
}

const ThumbnailPreview = forwardRef<HTMLDivElement, ThumbnailPreviewProps>(({ data, size }, ref) => {
  const image = data.thumbnailImage || data.mainImage;

  return (
    <div 
      ref={ref}
      style={{ width: `${size}px`, height: `${size}px` }}
      className="bg-white relative overflow-hidden flex items-center justify-center shrink-0 border border-gray-100"
    >
      {/* Product Image */}
      <div className="absolute inset-0 p-4">
        {image ? (
          <img src={image} className="w-full h-full object-contain" alt="Thumbnail" />
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-200 text-xs font-bold">
            IMAGE
          </div>
        )}
      </div>

      {/* Brand & Badge Info (Left Bottom) */}
      <div className="absolute left-3 bottom-10 flex flex-col text-left">
        <span className="text-[10px] font-bold text-gray-400 leading-none">SINCE 1999</span>
        <span className="text-[11px] font-black text-gray-800 leading-none mt-0.5">대한민국 No.1 성인용품점</span>
      </div>

      {/* Bottom Branding Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-white border-t border-gray-50 px-3 flex items-center justify-between">
         <div className="flex items-center gap-1.5">
            <span className="text-rose-600 font-black text-[10px]">바나나몰</span>
            <div className="w-[1px] h-2 bg-gray-200"></div>
            <span className="text-gray-500 font-bold text-[10px] uppercase truncate max-w-[80px]">
                {data.brandName || "BRAND"}
            </span>
         </div>
         <span className="text-gray-300 font-montserrat text-[10px] font-bold tracking-tighter">bananamall.co.kr</span>
      </div>
    </div>
  );
});

export default ThumbnailPreview;
