// components/Preview.tsx

import React, { forwardRef } from 'react';
import { ProductData } from '../types';

// ✅ 텍스트 강조 렌더링 함수 (##강조##)
const renderHighlightText = (text: string, themeColor: string) => {
  if (!text) return null;
  const parts = text.split(/(##.*?##)/g);

  return parts.map((part, i) => {
    if (part.startsWith('##') && part.endsWith('##')) {
      return (
        <span
          key={i}
          style={{ color: themeColor, fontWeight: 700 }}
        >
          {part.replace(/##/g, '')}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

// ✅ 요약 정보 3줄 포맷팅
const formatSummaryLines = (text: string): string[] => {
  if (!text) return ['', '', ''];

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.slice(0, 20)) // 글자수 제한 살짝 여유있게
    .slice(0, 3);

  while (lines.length < 3) {
    lines.push('');
  }
  return lines;
};

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
    aiFeatureDesc,
    aiPoint1Desc,
    aiPoint2Desc,
    summaryInfo,
    aiSummary,
    sizeImage,
    point2Image1, // Destructuring 추가
  } = data;

  // ✅ 반복되는 서브 포인트(이미지+설명+배경숫자)를 그리는 헬퍼 함수
  const renderSubPoint = (
    imgUrl: string | undefined,
    desc: string | undefined,
    bgNumber: string,
    keyPrefix: string
  ) => {
    if (!imgUrl && !desc) return null;

    return (
      <React.Fragment key={keyPrefix}>
        {/* 이미지 */}
        {imgUrl && (
          <div className="w-full bg-gray-50 mb-12 overflow-hidden shadow-sm rounded-lg">
            <img src={imgUrl} className="w-full h-auto block" alt={`${keyPrefix} Image`} />
          </div>
        )}

        {/* 설명 + 배경 숫자 */}
        {desc && (
          <div className="relative max-w-[520px] mx-auto text-center mb-24 last:mb-0">
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none select-none"
              style={{
                fontSize: '200px',
                fontWeight: 900,
                color: themeColor,
                opacity: 0.05,
                lineHeight: 1,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              {bgNumber}
            </div>

            <p className="relative z-10 text-lg leading-relaxed text-gray-700 font-medium whitespace-pre-line break-keep">
              {renderHighlightText(desc, themeColor)}
            </p>
          </div>
        )}
      </React.Fragment>
    );
  };

  // Point 2 활성화 여부 체크 (하나라도 데이터가 있으면 렌더링)
  const isPoint2Active = 
    point2Image1 || 
    aiPoint2Desc || 
    (data as any).point2Image2 || 
    (data as any).aiPoint2Desc2 || 
    (data as any).point2Image3 || 
    (data as any).aiPoint2Desc3;

  return (
    <div className="flex flex-col items-center bg-gray-100 p-0 overflow-y-auto h-full">
      <div 
        ref={ref}
        id="detail-page-container"
        className="bg-white overflow-hidden shadow-2xl" 
        style={{ width: '800px', minHeight: '1200px' }}
      >
        {/* 1. Header 영역 */}
        <header className="pt-24 pb-16 px-10 text-center flex flex-col items-center">
          <h1 className="text-5xl font-black mb-6 tracking-tight leading-tight break-keep" style={{ color: themeColor }}>
            {productNameKr || "상품명을 입력하세요"}
          </h1>
          <p className="font-montserrat text-2xl font-bold tracking-[0.15em] text-gray-400 mb-12 uppercase">
            {productNameEn || "PRODUCT ENGLISH NAME"}
          </p>
          
          <div className="w-full bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 rounded-lg shadow-inner">
            {mainImage ? (
              <img src={mainImage} className="w-full h-auto block" alt="Main" />
            ) : (
              <div className="w-full aspect-[4/5] flex items-center justify-center bg-gray-100">
                <span className="text-gray-300 font-bold text-4xl">MAIN IMAGE</span>
              </div>
            )}
          </div>
        </header>

        {/* 2. 스펙 테이블 & 패키지 */}
        <section className="px-10 py-20 bg-gray-50">
          <div className="rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100">
            <div 
              className="py-5 px-6 text-white font-bold text-center text-2xl tracking-wider"
              style={{ background: `linear-gradient(90deg, ${themeColor} 0%, ${themeColor}DD 100%)` }}
            >
              PRODUCT SPECIFICATION
            </div>
            <div className="p-10">
              {[
                { label: '특징', value: summaryInfo.feature },
                { label: '타입', value: summaryInfo.type },
                { label: '재질', value: summaryInfo.material },
                { label: '치수', value: summaryInfo.size },
                { label: '무게', value: summaryInfo.weight },
                { label: '전원', value: summaryInfo.power },
                { label: '제조사', value: summaryInfo.maker },
              ].map((item, idx) => (
                <div key={idx} className="grid grid-cols-[120px_1fr] gap-4 py-4 border-b border-gray-100 last:border-b-0 items-center">
                  <div className="text-lg font-bold text-gray-500">{item.label}</div>
                  <div className="text-lg font-bold text-gray-800 leading-relaxed whitespace-pre-line">
                    {item.value || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>

         <div className="mt-20 flex flex-col items-center">
  {/* ▼ 수정됨: w-[400px] 고정을 풀고, 내부 이미지 크기에 맞춰 박스가 늘어나도록 변경 */}
  <div className="bg-white shadow-xl rounded-xl overflow-hidden mb-8 border border-gray-100 transform rotate-1 hover:rotate-0 transition-transform duration-500 flex items-center justify-center">
    {packageImage ? (
      /* ▼ 핵심 수정: 가로 최대 400px OR 세로 최대 550px (둘 중 먼저 닿는 쪽에 맞춤) */
      <img 
        src={packageImage} 
        className="block w-auto h-auto max-w-[400px] max-h-[550px]" 
        alt="Package" 
      />
    ) : (
      /* 이미지가 없을 땐 기본 박스 크기 유지 */
      <div className="w-[400px] aspect-square flex items-center justify-center bg-gray-100">
        <span className="text-gray-300 font-bold">PACKAGE IMAGE</span>
      </div>
    )}
  </div>
  
  <div className="text-center">
    <h4 className="text-2xl font-black mb-1" style={{ color: themeColor }}>{productNameKr}</h4>
    <p className="text-base font-bold tracking-[0.3em] text-gray-300 uppercase">Package Design</p>
  </div>
</div>
        </section>

        {/* 3. 옵션 (있을 때만) */}
        {options.length > 0 && (
          <section className="px-10 py-20 bg-white border-b border-gray-100">
             <div className="flex items-center justify-center mb-12 gap-4 opacity-50">
                <div className="h-px w-12 bg-gray-300"></div>
                <h3 className="text-xl font-bold tracking-widest text-gray-800 uppercase">Option Check</h3>
                <div className="h-px w-12 bg-gray-300"></div>
             </div>
             
             <div className="grid grid-cols-2 gap-x-8 gap-y-12">
               {options.map((opt) => (
                 <div key={opt.id} className="flex flex-col items-center group">
                    <div className="w-full aspect-square bg-white rounded-3xl overflow-hidden mb-5 border-2 border-gray-100 flex items-center justify-center relative shadow-sm group-hover:border-rose-200 transition-colors">
                       {opt.image ? (
                         <img src={opt.image} className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105" alt={opt.name} />
                       ) : (
                         <span className="text-gray-300 font-bold text-sm">NO IMAGE</span>
                       )}
                    </div>
                    <span className="font-bold text-lg text-gray-800">{opt.name}</span>
                 </div>
               ))}
             </div>
          </section>
        )}

    {/* 4. 핵심 3줄 요약 (가장 임팩트 있는 구간) */}
        {/* ✅ 수정됨: py-0 -> pt-0 pb-40 (위는 붙이고, 아래는 넉넉하게 벌림) */}
        <section className="pt-0 pb-40 px-10 flex flex-col items-center text-center bg-white">
          <div className="space-y-0 max-w-3xl">
            {formatSummaryLines(data.aiSummary).map((line, i) => (
              <p 
                key={i} 
                className="text-5xl font-black leading-tight tracking-tighter word-break-keep" 
                style={{ color: i % 2 === 0 ? data.themeColor : '#1f2937' }}
              >
                {line || (i === 0 ? "상품의 핵심 특징이" : i === 1 ? "여기에 강렬하게" : "표시됩니다.")}
              </p>
            ))}
          </div>
        </section>

        {/* 5. 메인 특징 (Feature) */}
        <section className="pb-32">
          {/* 섹션 헤더 */}
          <div className="w-full flex flex-col items-center justify-center mb-12">
             <span className="text-sm font-bold tracking-[0.5em] text-gray-300 uppercase mb-2">Key Feature</span>
            <div className="px-12 py-3 mb-4 text-white font-bold tracking-widest text-lg rounded-full shadow-lg"
              style={{ background: data.themeColor }}
            >
              {data.productNameKr || "상품명"}
            </div>
            <h3 className="text-5xl font-black text-gray-900 mb-6 uppercase">특징</h3>
             <div className="w-10 h-1 bg-gray-800"></div>
          </div>

          <div className="px-10">
            <div className="w-full bg-gray-100 mb-12 overflow-hidden rounded-2xl shadow-sm">
               {data.featureImage ? (
                <img src={data.featureImage} className="w-full h-auto block" alt="Feature" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-gray-300 font-bold text-3xl">FEATURE IMAGE</div>
              )}
            </div>
            <div className="max-w-3xl mx-auto text-center px-4">
              <p className="text-xl leading-9 text-gray-700 font-medium whitespace-pre-line break-keep">
                {data.aiFeatureDesc}
              </p>
            </div>
          </div>
        </section>

        {/* 6. POINT 1 (필수) */}
        <section className="pb-32">
          {/* 섹션 헤더 */}
          <div className="w-full flex flex-col items-center justify-center mb-16">
            <div className="px-12 py-3 mb-4 text-white font-bold tracking-widest text-lg rounded-full shadow-lg"
              style={{ background: data.themeColor }}
            >
              {data.productNameKr || "상품명"}
            </div>
            <span className="font-serif text-4xl font-bold italic text-gray-200 mb-[-20px] z-0">Point.01</span>
            <h3 className="text-6xl font-black text-gray-900 z-10" style={{ textShadow: '2px 2px 0px #fff' }}>POINT 01</h3>
             <div className="w-1 h-12 bg-gray-300 mt-4"></div>
          </div>

          <div className="px-10">
            {/* 기본 1세트 */}
            {renderSubPoint(point1Image1, aiPoint1Desc, "01", "p1-1")}
            
            {/* 확장 2세트 (있을 때만) */}
            {renderSubPoint(
                (data as any).point1Image2, 
                (data as any).aiPoint1Desc2, 
                "01", 
                "p1-2"
            )}
            
            {/* 확장 3세트 (있을 때만) */}
             {renderSubPoint(
                (data as any).point1Image3, 
                (data as any).aiPoint1Desc3, 
                "01", 
                "p1-3"
            )}
          </div>
        </section>


        {/* 7. POINT 2 (조건부 렌더링) */}
        {isPoint2Active && (
        <section className="pb-32">
           {/* 섹션 헤더 */}
          <div className="w-full flex flex-col items-center justify-center mb-16">
            <div className="px-12 py-3 mb-4 text-white font-bold tracking-widest text-lg rounded-full shadow-lg"
              style={{ background: data.themeColor }}
            >
              {data.productNameKr || "상품명"}
            </div>
            <span className="font-serif text-4xl font-bold italic text-gray-200 mb-[-20px] z-0">Point.02</span>
            <h3 className="text-6xl font-black text-gray-900 z-10" style={{ textShadow: '2px 2px 0px #fff' }}>POINT 02</h3>
             <div className="w-1 h-12 bg-gray-300 mt-4"></div>
          </div>

          <div className="px-10">
            {/* 기본 1세트 */}
             {renderSubPoint(point2Image1, aiPoint2Desc, "02", "p2-1")}

            {/* 확장 2세트 */}
             {renderSubPoint(
                (data as any).point2Image2, 
                (data as any).aiPoint2Desc2, 
                "02", 
                "p2-2"
            )}

            {/* 확장 3세트 */}
             {renderSubPoint(
                (data as any).point2Image3, 
                (data as any).aiPoint2Desc3, 
                "02", 
                "p2-3"
            )}
          </div>
        </section>
        )}

        {/* 8. 사이즈 & 인포 */}
        <section className="pb-32 bg-gray-50 pt-20">
          <div className="w-full flex flex-col items-center justify-center mb-12">
            <div className="px-12 py-3 mb-4 text-white font-bold tracking-widest text-lg rounded-full shadow-lg"
              style={{ background: data.themeColor }}
            >
              {data.productNameKr || "상품명"}
            </div>
            <h3 className="text-4xl font-black text-gray-800 mb-4 uppercase">SIZE & INFO</h3>
             <div className="w-16 h-1 bg-gray-800"></div>
          </div>

          <div className="px-10 text-center">
            {/* 무게 뱃지 */}
            <div className="inline-flex items-center justify-center px-12 py-6 bg-white border-2 rounded-full shadow-lg mb-16" style={{ borderColor: themeColor }}>
              <span className="text-lg font-bold text-gray-400 mr-4 uppercase tracking-widest">Weight</span>
              <span className="text-4xl font-black text-gray-900">{summaryInfo.weight || "-"}</span>
            </div>
            
            <div className="w-full bg-white rounded-3xl overflow-hidden p-8 mb-8 shadow-sm border border-gray-100">
               {sizeImage ? (
                <img src={sizeImage} className="w-full h-auto block" alt="Size Detail" />
              ) : (
                <div className="w-full py-32 flex items-center justify-center text-gray-200 font-bold text-3xl">SIZE DETAIL</div>
              )}
            </div>

            <p className="text-lg text-gray-500 font-bold">
              ※ 측정 방법에 따라 약간의 오차가 있을 수 있습니다.
            </p>
          </div>
        </section>
        
        {/* 9. Footer */}
        <footer className="py-20 bg-gray-900 text-center">
          <div className="mb-4">
             <span className="text-rose-500 font-black text-2xl">BANANAMALL</span>
          </div>
          <p className="text-gray-600 text-sm tracking-widest font-medium">COPYRIGHT © BANANAMALL ALL RIGHTS RESERVED.</p>
        </footer>
      </div>
    </div>
  );
});

export default Preview;