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
          <h1 className="text-6xl font-black mb-6 tracking-tight" style={{ color: themeColor }}>
            {productNameKr || "상품명을 입력하세요"}
          </h1>
          <p className="font-montserrat text-3xl font-medium tracking-[0.2em] text-gray-400 mb-12">
            {productNameEn || "PRODUCT ENGLISH NAME"}
          </p>
          
          <div className="w-full bg-gray-50 flex items-center justify-center overflow-hidden">
            {mainImage ? (
              <img src={mainImage} className="w-full h-auto block" alt="Main" />
            ) : (
              <div className="w-full aspect-[4/5] flex items-center justify-center">
                <span className="text-gray-300 font-bold text-5xl">MAIN IMAGE</span>
              </div>
            )}
          </div>
        </header>

        {/* 정보 요약 영역 */}
        <section className="px-10 py-20 bg-gray-50">
          <div className="rounded-2xl overflow-hidden shadow-sm bg-white">
            <div 
              className="py-6 px-6 text-white font-bold text-center text-3xl tracking-wider"
              style={{ background: `linear-gradient(90deg, ${themeColor}ee, ${themeColor}cc)` }}
            >
              PRODUCT SPECIFICATION
            </div>
            <div className="grid grid-cols-2 p-10 gap-y-10">
              {[
                { label: '특징', value: summaryInfo.features },
                { label: '타입', value: summaryInfo.type },
                { label: '재질', value: summaryInfo.material },
                { label: '치수', value: summaryInfo.dimensions },
                { label: '무게', value: summaryInfo.weight },
                { label: '제조사', value: summaryInfo.maker },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  {/* 라벨 2배 이상 확대 (text-xs -> text-2xl) */}
                  <span className="text-2xl font-black text-gray-400 mb-2 uppercase tracking-tighter">{item.label}</span>
                  {/* 내용 2배 이상 확대 (text-base -> text-3xl) */}
                  <span className="text-3xl text-gray-800 font-black">{item.value || '-'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 flex flex-col items-center">
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
              <h4 className="text-3xl font-black mb-2" style={{ color: themeColor }}>{productNameKr}</h4>
              <p className="font-montserrat text-xl font-bold text-gray-400 mb-2">{productNameEn}</p>
              <p className="text-lg font-bold tracking-[0.3em] text-gray-300 uppercase">Package Design</p>
            </div>
          </div>
        </section>

        {/* 옵션 섹션 */}
        {options.length > 0 && (
          <section className="px-10 py-16 bg-white border-t border-gray-100">
             <div className="flex items-center justify-center mb-10 gap-4">
                <div className="h-px w-10 bg-gray-300"></div>
                <h3 className="text-3xl font-bold tracking-wider text-gray-800 uppercase">Option Check</h3>
                <div className="h-px w-10 bg-gray-300"></div>
             </div>
             
             <div className="grid grid-cols-2 gap-8">
               {options.map((opt) => (
                 <div key={opt.id} className="flex flex-col items-center group">
                    <div className="w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4 border border-gray-100 flex items-center justify-center relative">
                       {opt.image ? (
                         <img src={opt.image} className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105" alt={opt.name} />
                       ) : (
                         <span className="text-gray-300 font-bold text-lg">NO IMAGE</span>
                       )}
                       <div className="absolute inset-0 border-2 border-transparent group-hover:border-rose-100 rounded-2xl transition-colors pointer-events-none"></div>
                    </div>
                    <span className="font-black text-2xl text-gray-800">{opt.name}</span>
                 </div>
               ))}
             </div>
          </section>
        )}

        {/* 상품 핵심 요약 영역 (2배 이상 확대) */}
        <section className="py-24 px-10 flex flex-col items-center text-center">
          <div className="w-20 h-1.5 bg-gray-200 mb-12"></div>
          <div className="space-y-6 max-w-3xl">
            {aiSummary.split('\n').map((line, i) => (
              <p 
                key={i} 
                // text-3xl -> text-5xl로 대폭 확대 및 font-black 적용
                className="text-5xl font-black leading-tight tracking-tight" 
                style={{ color: i % 2 === 0 ? themeColor : '#1f2937' }}
              >
                {line || "상품의 핵심 특징이 여기에 표시됩니다."}
              </p>
            ))}
          </div>
          <div className="w-20 h-1.5 bg-gray-200 mt-12"></div>
        </section>

        {/* 메인 특징 영역 */}
        <section className="pb-32">
          <div className="w-full flex flex-col items-center justify-center mb-10 mt-8">
            <div 
              className="px-20 py-2 mb-6 text-white font-bold text-2xl tracking-widest flex items-center justify-center"
              style={{ 
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${themeColor} 25%, ${themeColor} 75%, rgba(255,255,255,0) 100%)`,
                minWidth: '400px'
              }}
            >
              {/* 그라데이션 박스 안 상품명 1.5배 확대 */}
              <span className="leading-none text-2xl">{productNameKr || "상품명"}</span>
            </div>
            {/* 특징 타이틀 1.5배 확대 */}
            <h3 className="text-6xl font-black tracking-tight text-gray-800 mb-4 uppercase scale-y-110">
              특징
            </h3>
            <div className="flex flex-col items-center">
              {/* Check! 문구 1.5배 확대 */}
              <span className="font-serif text-4xl font-bold italic text-gray-600 mb-4 tracking-wide">Check!</span>
              <div className="w-1 h-16 bg-gray-400"></div>
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
          </div>

          <div className="px-10">
            <div className="w-full bg-gray-100 mb-10 overflow-hidden rounded-lg">
               {featureImage ? (
                <img src={featureImage} className="w-full h-auto block" alt="Feature" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-gray-300 font-bold text-4xl">FEATURE IMAGE</div>
              )}
            </div>
            <div className="max-w-3xl mx-auto text-center">
              {/* 포인트 설명 문구 1.5배 확대 (text-lg -> text-3xl) */}
              <p className="text-3xl leading-relaxed text-gray-800 font-black whitespace-pre-line">
                {aiFeatureDesc || "메인 특징에 대한 설명이 들어가는 공간입니다."}
              </p>
            </div>
          </div>
        </section>

        {/* POINT 1 영역 */}
        <section className="pb-32">
          <div className="w-full flex flex-col items-center justify-center mb-10 mt-8">
            <div 
              className="px-20 mb-6 text-white font-bold text-2xl tracking-widest flex items-center justify-center"
              style={{ 
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${themeColor} 25%, ${themeColor} 75%, rgba(255,255,255,0) 100%)`,
                minWidth: '400px',
                height: '54px'
              }}
            >
              <span className="leading-none">{productNameKr || "상품명"}</span>
            </div>
            <h3 className="text-6xl font-black tracking-tight text-gray-800 mb-4 uppercase scale-y-110">
              POINT 01
            </h3>
            <div className="flex flex-col items-center">
              <span className="font-serif text-4xl font-bold italic text-gray-600 mb-4 tracking-wide">Check!</span>
              <div className="w-1 h-16 bg-gray-400"></div>
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
          </div>

          <div className="px-10">
            <div className="w-full bg-gray-50 mb-12 overflow-hidden">
               {point1Image1 ? (
                <img src={point1Image1} className="w-full h-auto block" alt="Point 1-1" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-gray-200 font-bold text-4xl">POINT 1 IMAGE (1)</div>
              )}
            </div>
            <div className="max-w-3xl mx-auto text-center mb-20">
              {/* 포인트 설명 1.5배 확대 */}
              <p className="text-3xl leading-relaxed text-gray-800 font-black whitespace-pre-line">
                {aiPoint1Desc || "첫 번째 포인트에 대한 상세 설명이 들어갑니다."}
              </p>
            </div>
            <div className="w-full bg-gray-50 overflow-hidden">
               {point1Image2 ? (
                <img src={point1Image2} className="w-full h-auto block" alt="Point 1-2" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-gray-200 font-bold text-4xl">POINT 1 IMAGE (2)</div>
              )}
            </div>

            {/* 확장 구조 */}
            {(data as any).aiPoint1Desc2 && (
              <div className="max-w-3xl mx-auto text-center mt-20 mb-20">
                <p className="text-3xl leading-relaxed text-gray-800 font-black whitespace-pre-line">
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
              <div className="max-w-3xl mx-auto text-center mt-12">
                <p className="text-3xl leading-relaxed text-gray-800 font-black whitespace-pre-line">
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
              className="px-20 mb-6 text-white font-bold text-2xl tracking-widest flex items-center justify-center"
              style={{ 
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${themeColor} 25%, ${themeColor} 75%, rgba(255,255,255,0) 100%)`,
                minWidth: '400px',
                height: '54px'
              }}
            >
              <span className="leading-none">{productNameKr || "상품명"}</span>
            </div>
            <h3 className="text-6xl font-black tracking-tight text-gray-800 mb-4 uppercase scale-y-110">
              POINT 02
            </h3>
            <div className="flex flex-col items-center">
              <span className="font-serif text-4xl font-bold italic text-gray-600 mb-4 tracking-wide">Check!</span>
              <div className="w-1 h-16 bg-gray-400"></div>
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
          </div>

          <div className="px-10">
            <div className="w-full bg-gray-50 mb-12 overflow-hidden">
               {point2Image1 ? (
                <img src={point2Image1} className="w-full h-auto block" alt="Point 2-1" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-gray-200 font-bold text-4xl">POINT 2 IMAGE (1)</div>
              )}
            </div>
            <div className="max-w-3xl mx-auto text-center mb-20">
              <p className="text-3xl leading-relaxed text-gray-800 font-black whitespace-pre-line">
                {aiPoint2Desc || "두 번째 포인트에 대한 상세 설명이 들어갑니다."}
              </p>
            </div>
            <div className="w-full bg-gray-50 overflow-hidden">
               {point2Image2 ? (
                <img src={point2Image2} className="w-full h-auto block" alt="Point 2-2" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-gray-200 font-bold text-4xl">POINT 2 IMAGE (2)</div>
              )}
            </div>

            {/* 확장 구조 */}
            {(data as any).aiPoint2Desc2 && (
              <div className="max-w-3xl mx-auto text-center mt-20 mb-20">
                <p className="text-3xl leading-relaxed text-gray-800 font-black whitespace-pre-line">
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
              <div className="max-w-3xl mx-auto text-center mt-12">
                <p className="text-3xl leading-relaxed text-gray-800 font-black whitespace-pre-line">
                  {(data as any).aiPoint2Desc3}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 사이즈 영역 */}
        <section className="pb-32">
          <div className="w-full flex flex-col items-center justify-center mb-10 mt-8">
            <div 
              className="px-20 mb-6 text-white font-bold text-2xl tracking-widest flex items-center justify-center"
              style={{ 
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${themeColor} 25%, ${themeColor} 75%, rgba(255,255,255,0) 100%)`,
                minWidth: '400px',
                height: '54px'
              }}
            >
              <span className="leading-none">{productNameKr || "상품명"}</span>
            </div>

            <h3 className="text-6xl font-black tracking-tight text-gray-800 mb-4 uppercase scale-y-110">
              SIZE & INFO
            </h3>
            <div className="flex flex-col items-center">
              <span className="font-serif text-4xl font-bold italic text-gray-600 mb-4 tracking-wide">Check!</span>
              <div className="w-1 h-16 bg-gray-400"></div>
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
          </div>

          <div className="px-10 text-center">
            <div className="mb-16 inline-block px-12 py-6 border-4 rounded-full" style={{ borderColor: themeColor }}>
              <span className="text-2xl font-black text-gray-400 mr-4 uppercase">Weight</span>
              <span className="text-5xl font-black text-gray-800">{summaryInfo.weight || "-"}</span>
            </div>
            
            <div className="w-full bg-gray-50 rounded-2xl overflow-hidden p-8 mb-10">
               {sizeImage ? (
                <img src={sizeImage} className="w-full h-auto block" alt="Size Detail" />
              ) : (
                <div className="w-full py-20 flex items-center justify-center text-gray-200 font-bold text-4xl">SIZE DETAIL IMAGE</div>
              )}
            </div>

            {/* 사이즈 고정 문구 1.5배 확대 (text-sm -> text-2xl) */}
            <p className="text-2xl text-gray-400 font-black">
              ※ 사이즈와 무게는 모두 수작업으로 측정되어 오차가 있을 수 있습니다
            </p>
          </div>
        </section>
        
        <footer className="py-24 bg-gray-900 text-center">
          <p className="text-gray-500 text-2xl tracking-widest font-black">ALL RIGHTS RESERVED BY BANANAMALL</p>
        </footer>
      </div>
    </div>
  );
});

export default Preview;