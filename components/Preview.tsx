// components/Preview.tsx

import React, { forwardRef } from 'react';
import { ProductData } from '../types';

interface PreviewProps {
  data: ProductData;
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ data }, ref) => {
  const {
    productNameKr,
    productNameEn,
    themeColor,
    options,
    mainImage,
    packageImage,
    featureImage,
    point1Image1,
    point1Image2,
    point2Image1,
    point2Image2,
    sizeImage,
    summaryInfo,
    aiSummary,
    aiFeatureDesc,
    aiPoint1Desc,
    aiPoint2Desc,
  } = data;

  return (
    <div className="flex flex-col items-center bg-white p-0 overflow-y-auto h-full">
  <div 
    ref={ref}
    id="detail-page-container"
    className="bg-white overflow-hidden" 
    style={{ width: '800px', minHeight: '1200px' }}
  >
        {/* Header 영역 */}
        <header className="pt-20 pb-16 px-10 text-center flex flex-col items-center">
          <h1 className="text-5xl font-black mb-4 tracking-tight" style={{ color: themeColor }}>
            {productNameKr || "상품명을 입력하세요"}
          </h1>
          <p className="font-montserrat text-2xl font-medium tracking-[0.2em] text-gray-400 mb-12">
            {productNameEn || "PRODUCT ENGLISH NAME"}
          </p>
          
          {/* [수정 1] 메인 이미지: 고정 비율 제거 -> h-auto 적용 */}
          <div className="w-full bg-gray-50 flex items-center justify-center overflow-hidden">
            {mainImage ? (
              <img src={mainImage} className="w-full h-auto block" alt="Main" />
            ) : (
              // 이미지가 없을 때만 영역 확보를 위해 비율 유지
              <div className="w-full aspect-[4/5] flex items-center justify-center">
                <span className="text-gray-300 font-bold text-4xl">MAIN IMAGE</span>
              </div>
            )}
          </div>
        </header>

        {/* 정보 요약 영역 */}
        <section className="px-10 py-20 bg-gray-50">
          <div className="rounded-2xl overflow-hidden shadow-sm bg-white">
            <div 
              className="py-4 px-6 text-white font-bold text-center text-xl tracking-wider"
              style={{ background: `linear-gradient(90deg, ${themeColor}ee, ${themeColor}cc)` }}
            >
              PRODUCT SPECIFICATION
            </div>
            <div className="grid grid-cols-2 p-8 gap-y-6">
              {[
                { label: '특징', value: summaryInfo.features },
                { label: '타입', value: summaryInfo.type },
                { label: '재질', value: summaryInfo.material },
                { label: '치수', value: summaryInfo.dimensions },
                { label: '무게', value: summaryInfo.weight },
                { label: '제조사', value: summaryInfo.maker },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-tighter">{item.label}</span>
                  <span className="text-base text-gray-800 font-medium">{item.value || '-'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 flex flex-col items-center">
             {/* [수정 2] 패키지 이미지: 여기는 썸네일 느낌이라 정사각형 유지가 깔끔하지만, 
                 원하시면 여기도 h-auto로 풀 수 있습니다. 일단 요청대로 고정 비율(aspect-square)은 제거하고 
                 너비만 64(256px)로 제한하되 높이는 자동 조절되게 변경합니다. */}
             <div className="w-64 bg-white shadow-lg rounded-xl flex items-center justify-center overflow-hidden mb-8 border border-gray-100">
              {packageImage ? (
                <img src={packageImage} className="w-full h-auto block" alt="Package" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center">
                  <span className="text-gray-200 font-bold">PACKAGE IMAGE</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <h4 className="text-xl font-black mb-1" style={{ color: themeColor }}>{productNameKr}</h4>
              <p className="font-montserrat text-sm font-bold text-gray-400 mb-1">{productNameEn}</p>
              <p className="text-xs font-bold tracking-[0.3em] text-gray-300 uppercase">Package Design</p>
            </div>
          </div>
        </section>

        {/* 옵션 섹션 */}
        {options.length > 0 && (
          <section className="px-10 py-16 bg-white border-t border-gray-100">
             <div className="flex items-center justify-center mb-10 gap-4">
                <div className="h-px w-10 bg-gray-300"></div>
                <h3 className="text-2xl font-bold tracking-wider text-gray-800 uppercase">Option Check</h3>
                <div className="h-px w-10 bg-gray-300"></div>
             </div>
             
             <div className="grid grid-cols-2 gap-8">
               {options.map((opt) => (
                 <div key={opt.id} className="flex flex-col items-center group">
                    {/* 옵션은 그리드 정렬을 위해 정사각형 비율(aspect-square)을 유지하는 게 좋습니다. 
                        (안 그러면 들쑥날쑥해짐) 하지만 꽉 채우기 위해 object-cover를 쓸 수 있습니다. */}
                    <div className="w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4 border border-gray-100 flex items-center justify-center relative">
                       {opt.image ? (
                         <img src={opt.image} className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105" alt={opt.name} />
                       ) : (
                         <span className="text-gray-300 font-bold text-xs">NO IMAGE</span>
                       )}
                       <div className="absolute inset-0 border-2 border-transparent group-hover:border-rose-100 rounded-2xl transition-colors pointer-events-none"></div>
                    </div>
                    <span className="font-bold text-lg text-gray-800">{opt.name}</span>
                 </div>
               ))}
             </div>
          </section>
        )}

{/* 상품 핵심 요약 영역 */}
        <section className="py-24 px-10 flex flex-col items-center text-center">
          <div className="w-12 h-1 bg-gray-200 mb-12"></div>
          <div className="space-y-4 max-w-2xl">
            {aiSummary.split('\n').map((line, i) => (
              <p 
                key={i} 
                // ▼▼▼ 수정된 부분 ▼▼▼
                // 1. text-2xl -> text-3xl (글자 키움)
                // 2. font-bold -> font-black (가장 두껍게)
                // 3. tracking-tight (자간을 좁혀서 더 꽉 차 보이게)
                className="text-3xl font-black leading-relaxed tracking-tight" 
                style={{ color: i % 2 === 0 ? themeColor : '#374151' }}
              >
                {line || "상품의 핵심 특징이 여기에 표시됩니다."}
              </p>
            ))}
          </div>
          <div className="w-12 h-1 bg-gray-200 mt-12"></div>
        </section>

        {/* 메인 특징 영역 */}
        <section className="pb-32">
          {/* 헤더 부분 */}
          <div className="w-full flex flex-col items-center justify-center mb-10 mt-8">
            <div 
              className="px-20 py-1.5 mb-5 text-white font-bold text-sm tracking-widest flex items-center justify-center"
              style={{ 
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${themeColor} 25%, ${themeColor} 75%, rgba(255,255,255,0) 100%)`,
                minWidth: '320px'
              }}
            >
              {productNameKr || "상품명"}
            </div>
            <h3 className="text-4xl font-black tracking-tight text-gray-800 mb-2 uppercase scale-y-110">
              특징
            </h3>
            <div className="flex flex-col items-center">
              <span className="font-serif text-2xl font-bold italic text-gray-600 mb-3 tracking-wide">Check!</span>
              <div className="w-px h-12 bg-gray-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            </div>
          </div>

          <div className="px-10">
            {/* [수정 3] Feature Image: aspect-video 제거 -> h-auto */}
            <div className="w-full bg-gray-100 mb-10 overflow-hidden rounded-lg">
               {featureImage ? (
                <img src={featureImage} className="w-full h-auto block" alt="Feature" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-gray-300 font-bold text-2xl">FEATURE IMAGE</div>
              )}
            </div>
          <div className="max-w-xl mx-auto text-center">
  <p className="text-lg leading-loose text-gray-800 font-semibold whitespace-pre-line">
    {/* 1. text-gray-600 -> text-gray-800 (더 진하게) */}
    {/* 2. font-medium -> font-semibold (더 두껍게) */}
    {aiFeatureDesc || "메인 특징에 대한 설명이 들어가는 공간입니다."}
  </p>
</div>
          </div>
        </section>

        {/* POINT 1 영역 */}
        <section className="pb-32">
          <div className="w-full flex flex-col items-center justify-center mb-10 mt-8">
            <div 
              className="px-20 mb-5 text-white font-bold text-sm tracking-widest flex items-center justify-center"
              style={{ 
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${themeColor} 25%, ${themeColor} 75%, rgba(255,255,255,0) 100%)`,
                minWidth: '320px',
                height: '36px'
              }}
            >
              <span className="leading-none">{productNameKr || "상품명"}</span>
            </div>
            <h3 className="text-4xl font-black tracking-tight text-gray-800 mb-2 uppercase scale-y-110">
              POINT 01
            </h3>
            <div className="flex flex-col items-center">
              <span className="font-serif text-2xl font-bold italic text-gray-600 mb-3 tracking-wide">Check!</span>
              <div className="w-px h-12 bg-gray-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            </div>
          </div>

          <div className="px-10">
            {/* 1. 이미지 1 */}
            <div className="w-full bg-gray-50 mb-10 overflow-hidden">
               {point1Image1 ? (
                <img src={point1Image1} className="w-full h-auto block" alt="Point 1-1" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-gray-200 font-bold">POINT 1 IMAGE (1)</div>
              )}
            </div>
            {/* 2. 설명 1 (간격 mb-20으로 확장) */}
            <div className="max-w-xl mx-auto text-center mb-20">
              <p className="text-lg leading-loose text-gray-800 font-semibold whitespace-pre-line">
                {aiPoint1Desc || "첫 번째 포인트에 대한 상세 설명이 들어갑니다."}
              </p>
            </div>
            {/* 3. 이미지 2 */}
            <div className="w-full bg-gray-50 overflow-hidden">
               {point1Image2 ? (
                <img src={point1Image2} className="w-full h-auto block" alt="Point 1-2" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-gray-200 font-bold">POINT 1 IMAGE (2)</div>
              )}
            </div>

            {/* 확장 구조: 설명2, 이미지3, 설명3 (데이터 있을 때만 노출) */}
            {(data as any).aiPoint1Desc2 && (
              <div className="max-w-xl mx-auto text-center mt-20 mb-20">
                <p className="text-lg leading-loose text-gray-800 font-semibold whitespace-pre-line">
                  {(data as any).aiPoint1Desc2}
                </p>
              </div>
            )}
            {(data as any).point1Image3 && (
              <div className="w-full bg-gray-50 mb-20 overflow-hidden">
                <img src={(data as any).point1Image3} className="w-full h-auto block" alt="Point 1-3" />
              </div>
            )}
            {(data as any).aiPoint1Desc3 && (
              <div className="max-w-xl mx-auto text-center mt-10">
                <p className="text-lg leading-loose text-gray-800 font-semibold whitespace-pre-line">
                  {(data as any).aiPoint1Desc3}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* POINT 2 영역 */}
        <section className="pb-32">
          <div className="w-full flex flex-col items-center justify-center mb-10 mt-8">
            <div 
              className="px-20 mb-5 text-white font-bold text-sm tracking-widest flex items-center justify-center"
              style={{ 
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${themeColor} 25%, ${themeColor} 75%, rgba(255,255,255,0) 100%)`,
                minWidth: '320px',
                height: '36px'
              }}
            >
              <span className="leading-none">{productNameKr || "상품명"}</span>
            </div>
            <h3 className="text-4xl font-black tracking-tight text-gray-800 mb-2 uppercase scale-y-110">
              POINT 02
            </h3>
            <div className="flex flex-col items-center">
              <span className="font-serif text-2xl font-bold italic text-gray-600 mb-3 tracking-wide">Check!</span>
              <div className="w-px h-12 bg-gray-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            </div>
          </div>

          <div className="px-10">
            {/* 1. 이미지 1 */}
            <div className="w-full bg-gray-50 mb-10 overflow-hidden">
               {point2Image1 ? (
                <img src={point2Image1} className="w-full h-auto block" alt="Point 2-1" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-gray-200 font-bold">POINT 2 IMAGE (1)</div>
              )}
            </div>
            {/* 2. 설명 1 (간격 mb-20으로 확장) */}
            <div className="max-w-xl mx-auto text-center mb-20">
              <p className="text-lg leading-loose text-gray-800 font-semibold whitespace-pre-line">
                {aiPoint2Desc || "두 번째 포인트에 대한 상세 설명이 들어갑니다."}
              </p>
            </div>
            {/* 3. 이미지 2 */}
            <div className="w-full bg-gray-50 overflow-hidden">
               {point2Image2 ? (
                <img src={point2Image2} className="w-full h-auto block" alt="Point 2-2" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-gray-200 font-bold">POINT 2 IMAGE (2)</div>
              )}
            </div>

            {/* 확장 구조: 설명2, 이미지3, 설명3 (데이터 있을 때만 노출) */}
            {(data as any).aiPoint2Desc2 && (
              <div className="max-w-xl mx-auto text-center mt-20 mb-20">
                <p className="text-lg leading-loose text-gray-800 font-semibold whitespace-pre-line">
                  {(data as any).aiPoint2Desc2}
                </p>
              </div>
            )}
            {(data as any).point2Image3 && (
              <div className="w-full bg-gray-50 mb-20 overflow-hidden">
                <img src={(data as any).point2Image3} className="w-full h-auto block" alt="Point 2-3" />
              </div>
            )}
            {(data as any).aiPoint2Desc3 && (
              <div className="max-w-xl mx-auto text-center mt-10">
                <p className="text-lg leading-loose text-gray-800 font-semibold whitespace-pre-line">
                  {(data as any).aiPoint2Desc3}
                </p>
              </div>
            )}
          </div>
        </section>

      {/* 사이즈 영역 */}
<section className="pb-32">
  <div className="w-full flex flex-col items-center justify-center mb-10 mt-8">
    {/* ▼▼▼ 상자 내부 수직 정렬 수정 부분 ▼▼▼ */}
    <div 
      className="px-20 mb-5 text-white font-bold text-sm tracking-widest flex items-center justify-center"
      style={{ 
        background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${themeColor} 25%, ${themeColor} 75%, rgba(255,255,255,0) 100%)`,
        minWidth: '320px',
        height: '36px' // 높이를 명시적으로 지정
      }}
    >
      <span className="leading-none">{productNameKr || "상품명"}</span>
    </div>

    <h3 className="text-4xl font-black tracking-tight text-gray-800 mb-2 uppercase scale-y-110">
      SIZE & INFO
    </h3>
    <div className="flex flex-col items-center">
      <span className="font-serif text-2xl font-bold italic text-gray-600 mb-3 tracking-wide">Check!</span>
      <div className="w-px h-12 bg-gray-400"></div>
      <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
    </div>
  </div>

  <div className="px-10 text-center">
    <div className="mb-12 inline-block px-8 py-4 border-2 rounded-full" style={{ borderColor: themeColor }}>
      <span className="text-sm font-bold text-gray-400 mr-2 uppercase">Weight</span>
      <span className="text-2xl font-black text-gray-800">{summaryInfo.weight || "-"}</span>
    </div>
    
    <div className="w-full bg-gray-50 rounded-2xl overflow-hidden p-8 mb-6">
       {sizeImage ? (
        <img src={sizeImage} className="w-full h-auto block" alt="Size Detail" />
      ) : (
        <div className="w-full py-20 flex items-center justify-center text-gray-200 font-bold">SIZE DETAIL IMAGE</div>
      )}
    </div>

    {/* ▼▼▼ 무게 오차 관련 고정 문구 추가 ▼▼▼ */}
    <p className="text-sm text-gray-400 font-medium">
      ※ 사이즈와 무게는 모두 수작업으로 측정되어 오차가 있을 수 있습니다
    </p>
  </div>
</section>
        
        <footer className="py-20 bg-gray-900 text-center">
          <p className="text-gray-500 text-sm tracking-widest font-bold">ALL RIGHTS RESERVED BY BANANAMALL</p>
        </footer>
      </div>
    </div>
  );
});

export default Preview;