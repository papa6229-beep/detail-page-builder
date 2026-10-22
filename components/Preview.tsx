// components/Preview.tsx

import React, { forwardRef } from 'react';
import { Rnd } from 'react-rnd';
import { ProductData, SectionSpacingKey } from '../types';
import { getSectionSpacing, SECTION_SPACING } from '../sectionSpacing';
import SectionSpacingControl from './SectionSpacingControl';
import FramedProductImage from './FramedProductImage';
import RenderWatermark from './PreviewWatermark';
import type { ProductFraming } from '../productFraming';
import EditablePreviewImage, { PreviewImageEditingContext } from './EditablePreviewImage';
import { hasImageTransform, isGifImage } from '../previewImageTransforms';

// ✅ 그라데이션 여부 체크 헬퍼
const isGradient = (color: string) => color.toLowerCase().includes('gradient');

// ✅ 텍스트 강조 렌더링 함수 (##강조##)
const renderHighlightText = (text: string, themeColor: string) => {
  if (!text) return null;
  const parts = text.split(/(##.*?##)/g);

  return parts.map((part, i) => {
    if (part.startsWith('##') && part.endsWith('##')) {
      return (
        <span
          key={i}
          style={isGradient(themeColor) ? {
            backgroundImage: themeColor,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700
          } : { 
            color: themeColor, 
            fontWeight: 700 
          }}
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
  onProductFramingChange?: (frame: ProductFraming) => void;
  data: ProductData;
  onOptionLayoutChange: (id: string, layout: { x: number, y: number, width: number, height: number }) => void;
  onPackageLayoutChange: (layout: { x: number, y: number, width: number, height: number }) => void;
  onWatermarkLayoutChange: (id: string, layout: { x: number, y: number, width: number, height: number }) => void;
  onSectionSpacingChange: (key: SectionSpacingKey, value: number) => void;
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ data, onOptionLayoutChange, onPackageLayoutChange, onWatermarkLayoutChange, onSectionSpacingChange, onProductFramingChange }, ref) => {
  const editing = React.useContext(PreviewImageEditingContext);
  const [optionPhotoEdit, setOptionPhotoEdit] = React.useState<string | null>(null);
  const [packagePhotoEdit, setPackagePhotoEdit] = React.useState(false);
  React.useEffect(() => { setPackagePhotoEdit(false); }, [data.packageImage]);
  const imageOverflow = (key: string): React.CSSProperties | undefined => hasImageTransform(data.previewImageTransforms?.[key]) ? { overflow: 'visible', zIndex: 1 } : undefined;
  const spacingStyle = (key: SectionSpacingKey) => ({ paddingBottom: getSectionSpacing(data, key) });
  const sectionEnd = (key: SectionSpacingKey) => (
    <SectionSpacingControl sectionKey={key} value={getSectionSpacing(data, key)} onChange={onSectionSpacingChange} />
  );
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
    keyPrefix: string,
    dataKey?: string // [추가] 워터마크용 데이터 키
  ) => {
    if (!imgUrl && !desc) return null;

    return (
      <React.Fragment key={keyPrefix}>
        {/* 이미지 */}
        {imgUrl && (
          <div style={imageOverflow(dataKey || keyPrefix)} className="w-full bg-gray-50/50 mb-12 overflow-hidden shadow-[var(--shadow-xl)] rounded-2xl relative transition-all duration-200 ease-out hover:shadow-[var(--shadow-2xl)] border border-white/40 backdrop-blur-sm">
            <EditablePreviewImage editKey={dataKey || keyPrefix} label={`포인트 ${keyPrefix.replace(/^p/, '')}`} src={imgUrl} className="w-full h-auto block" alt={`${keyPrefix} Image`} />
            {dataKey && <RenderWatermark data={data} onWatermarkLayoutChange={onWatermarkLayoutChange} targetKey={dataKey} />}
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
                color: isGradient(themeColor) ? '#000' : themeColor, // 배경 숫자는 그라데이션 적용 시 너무 복잡해지므로 흑백 처리 혹은 투명도 조절
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
        data-image-canvas="detail"
        className="bg-white overflow-hidden shadow-[var(--shadow-xl)] transition-all duration-200 ease-out" 
        style={{ width: '800px', minHeight: '1200px', position: 'relative' }}
      >
        {/* 1. Header 영역 */}
        <header id="preview-top" className="pt-24 pb-16 px-10 text-center flex flex-col items-center" style={spacingStyle('main')}>
          <h1 className="text-5xl font-black mb-6 tracking-tight leading-tight break-keep" 
            style={isGradient(themeColor) ? {
                backgroundImage: themeColor,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent'
            } : { color: themeColor }}>
            {productNameKr || "상품명을 입력하세요"}
          </h1>
          <p className="font-montserrat text-2xl font-bold tracking-[0.15em] text-gray-400 mb-12 uppercase">
            {productNameEn || "PRODUCT ENGLISH NAME"}
          </p>
          
          <div id="preview-main" style={{ ...(data.productFraming?.main ? { aspectRatio: data.productFraming.main.ratio } : {}), ...imageOverflow('mainImage') }} className="w-full bg-gray-50/50 flex items-center justify-center overflow-hidden border border-white/40 rounded-2xl shadow-[var(--shadow-xl)] relative transition-all duration-200 ease-out backdrop-blur-md">
            {mainImage ? (
              data.productFraming?.main ? <FramedProductImage src={mainImage} alt="Main" frame={data.productFraming.main} target="main" label="메인" onChange={onProductFramingChange}/> : <EditablePreviewImage editKey="mainImage" label="메인 이미지" src={mainImage} className="w-full h-auto block" alt="Main" />
            ) : (
              <div className="w-full aspect-[4/5] flex items-center justify-center bg-gray-100/50 backdrop-blur-sm">
                <span className="text-gray-300 font-bold text-4xl">MAIN IMAGE</span>
              </div>
            )}
            <RenderWatermark data={data} onWatermarkLayoutChange={onWatermarkLayoutChange} targetKey="mainImage" />
          </div>
        </header>
        {sectionEnd('main')}

        {/* 2. 스펙 테이블 & 패키지 */}
        <section id="preview-spec" className="px-10 py-20 bg-gray-50/50" style={spacingStyle('spec')}>
          <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-xl)] bg-white/80 backdrop-blur-md border border-white/40 transition-all duration-200 ease-out">
            <div 
              className="py-5 px-6 text-white font-bold text-center text-2xl tracking-wider"
              style={{ background: isGradient(themeColor) ? themeColor : `linear-gradient(90deg, ${themeColor} 0%, ${themeColor}DD 100%)` }}
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
                <div key={idx} className="grid grid-cols-[120px_1fr] gap-4 py-4 border-b border-gray-200/50 last:border-b-0 items-center">
                  <div className="text-xl font-bold text-gray-500">{item.label}</div>
                  <div className="text-xl font-bold text-gray-800 leading-relaxed whitespace-pre-line">
                    {item.value || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>


        </section>
        {sectionEnd('spec')}

        {/* 3. 옵션 (있을 때만) */}


    {/* 4. 핵심 3줄 요약 (가장 임팩트 있는 구간) */}
        {/* ✅ 수정됨: py-0 -> pt-0 pb-40 (위는 붙이고, 아래는 넉넉하게 벌림) */}
        <section id="preview-summary" className="pt-0 pb-10 px-10 flex flex-col items-center text-center bg-white/80 backdrop-blur-sm" style={spacingStyle('summary')}>
          <div className="space-y-0 max-w-3xl">
            {formatSummaryLines(data.aiSummary).map((line, i) => (
              <p 
                key={i} 
                className="text-5xl font-black leading-tight tracking-tighter word-break-keep" 
                style={
                    (i % 2 === 0) ? (
                        isGradient(data.themeColor) ? {
                            backgroundImage: data.themeColor,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            color: 'transparent'
                        } : { color: data.themeColor }
                    ) : { color: '#1f2937' }
                }
              >
                {line || (i === 0 ? "상품의 핵심 특징이" : i === 1 ? "여기에 강렬하게" : "표시됩니다.")}
              </p>
            ))}
          </div>
        </section>
        {sectionEnd('summary')}

        {/* [추가] 동영상 삽입 이미지 (800x450) */}
        {data.videoInsertImage && (
          <React.Fragment>
          <section id="video-insert-section" className="pb-10 px-0 flex flex-col items-center bg-white/80 backdrop-blur-sm relative" style={spacingStyle('video')}>
            {isGifImage(data.videoInsertImage) ? <img
              src={data.videoInsertImage} 
              className="w-full h-auto aspect-[16/9] object-cover block" 
              alt="Video Insert" 
            /> : <EditablePreviewImage editKey="videoInsertImage" label="삽입 이미지" src={data.videoInsertImage} className="w-full h-auto aspect-[16/9] object-cover block" alt="Video Insert"/>}
          </section>
          {sectionEnd('video')}
          </React.Fragment>
        )}

        {/* 4-2. 패키지 디자인 (위치 이동됨) */}
        {(data.isPackageImageEnabled ?? true) && (
        <React.Fragment>
        <section id="preview-package" className="pb-16 px-10 flex flex-col items-center bg-white/80 backdrop-blur-sm relative"
             style={{ 
                ...spacingStyle('package'),
                position: 'relative',
                // 패키지 이미지 위치에 따라 섹션 높이 자동 조절
                minHeight: (data.packageLayout?.y || 0) + (data.packageLayout?.height || 550) + 150 + getSectionSpacing(data, 'package') - SECTION_SPACING.package.defaultValue
             }}
        >
             {/* Rnd 적용 */}
             <div className="absolute inset-0 flex justify-center" style={{ position: 'absolute', inset: 0 }}>
                <Rnd
                   data-package-card="true" tabIndex={-1}
                   disableDragging={packagePhotoEdit} enableResizing={packagePhotoEdit ? false : undefined}
                   cancel=".builder-option-tools, .builder-option-resize"
                   minWidth={120} minHeight={140}
                   onDragStart={event => { (event.target as HTMLElement).closest<HTMLElement>('[data-package-card]')?.focus({ preventScroll: true }); editing?.beginImageEdit?.(); }}
                   onResizeStart={() => editing?.beginImageEdit?.()}
                   resizeHandleComponent={{ bottomRight: <button type="button" data-editor-only="true" className="builder-option-resize" aria-label="패키지 박스 크기 조절" title="드래그 또는 방향키로 크기 조절" onKeyDown={event => { if (!event.key.startsWith('Arrow')) return; event.preventDefault(); const step = event.shiftKey ? 10 : 1; onPackageLayoutChange({ x: data.packageLayout?.x || 0, y: data.packageLayout?.y || 0, width: Math.max(120, (data.packageLayout?.width || 400) + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)), height: Math.max(140, (data.packageLayout?.height || 550) + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)) }); }}/> }}
                   size={{ width: data.packageLayout?.width || 400, height: data.packageLayout?.height || 550 }}
                   position={{ x: data.packageLayout?.x || 0, y: data.packageLayout?.y || 0 }}
                   onDragStop={(e, d) => {
                       onPackageLayoutChange({ 
                           x: d.x, 
                           y: d.y, 
                           width: data.packageLayout?.width || 400, 
                           height: data.packageLayout?.height || 550 
                       });
                       editing?.endImageEdit?.();
                   }}
                   onResizeStop={(e, direction, ref, delta, position) => {
                       onPackageLayoutChange({
                           width: parseInt(ref.style.width),
                           height: parseInt(ref.style.height),
                           ...position
                       });
                       editing?.endImageEdit?.();
                   }}
                   className="group z-10" // z-index 확보
                >
                    {editing && !packagePhotoEdit && <div className="builder-option-tools builder-package-tools" data-editor-only="true"><button type="button" aria-label="패키지 박스 편집" aria-pressed={true} onClick={() => editing.select(null)}>박스 편집</button><button type="button" aria-label="패키지 사진 편집" disabled={!packageImage} onClick={() => { setPackagePhotoEdit(true); editing.select('packageImage', 'packageImage'); }}>사진 편집</button><span>박스를 끌거나 모서리 조절</span></div>}
                    <div className="w-full h-full flex flex-col p-2 border-2 border-transparent group-hover:border-[#CA8A04] group-hover:bg-[#CA8A04]/5 rounded-xl transition-all select-none">
                        <div style={imageOverflow('packageImage')} className="w-full flex-1 min-h-0 bg-white/80 shadow-[var(--shadow-xl)] rounded-xl overflow-hidden border border-white/40 flex items-center justify-center relative pointer-events-none mb-4 transition-all duration-200 ease-out backdrop-blur-md">
                            {packageImage ? (
                            <EditablePreviewImage interactive={packagePhotoEdit} tools={editing && packagePhotoEdit ? <button type="button" aria-label="패키지 박스 편집" onClick={() => { setPackagePhotoEdit(false); editing.select(null); }}>박스 편집</button> : undefined} editKey="packageImage" label="패키지 이미지"
                                src={packageImage} 
                                className="block w-full h-full object-contain" 
                                alt="Package" 
                            />
                            ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100/50">
                                <span className="text-gray-300 font-bold">PACKAGE IMAGE</span>
                            </div>
                            )}
                            <RenderWatermark data={data} onWatermarkLayoutChange={onWatermarkLayoutChange} targetKey="packageImage" isFixed={true} />
                        </div>

                        {/* Package Design Text */}
                        <div className="text-center pointer-events-none">
                            <h4 className="text-xl font-black mb-1 truncate px-2" 
                                 style={isGradient(themeColor) ? {
                                    backgroundImage: themeColor,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    color: 'transparent'
                                } : { color: themeColor }}>
                                {productNameKr}
                            </h4>
                            <p className="text-sm font-bold tracking-[0.3em] text-gray-300 uppercase whitespace-nowrap">Package Design</p>
                        </div>
                        
                        {/* 크기 조절 핸들 시각적 힌트 */}
                        {!editing && <div className="absolute bottom-1 right-1 w-4 h-4 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 cursor-nwse-resize"></div>}
                    </div>
                </Rnd>
             </div>
        </section>
        {sectionEnd('package')}
        </React.Fragment>
        )}

        {/* 3. 옵션 (Draggable) */}
        {options.length > 0 && (
          <React.Fragment>
          <section id="preview-option" className="px-10 pb-10 pt-10 bg-white/80 backdrop-blur-md border-b border-white/40 relative"
             style={{ 
                ...spacingStyle('options'),
                // 가장 아래에 있는 요소의 y + height + 여유공간(100px)을 섹션 높이로 설정
                minHeight: options.length > 0 
                    ? Math.max(...options.map(o => (o.y || 0) + (o.height || 400))) + 150 + getSectionSpacing(data, 'options') - SECTION_SPACING.options.defaultValue
                    : 400 
             }}
          >
             <div className="flex items-center justify-center mb-12 gap-4 opacity-50">
                <div className="h-px w-12 bg-gray-300"></div>
                <h3 className="text-xl font-bold tracking-widest text-gray-800 uppercase">Option Check</h3>
                <div className="h-px w-12 bg-gray-300"></div>
             </div>
             
             {/* Rnd 캔버스 영역 */}
             <div className="w-full relative" style={{ position: 'relative', height: Math.max(...options.map(option => (option.y || 0) + (option.height || 400))) }}>
               {options.map((opt) => (
                 <Rnd
                   key={opt.id}
                   data-option-card={opt.id} tabIndex={-1}
                   disableDragging={optionPhotoEdit === opt.id} enableResizing={optionPhotoEdit === opt.id ? false : undefined}
                   cancel=".builder-option-tools, .builder-option-resize"
                   minWidth={120} minHeight={140}
                   onDragStart={event => { (event.target as HTMLElement).closest<HTMLElement>('[data-option-card]')?.focus({ preventScroll: true }); editing?.beginImageEdit?.(); }}
                   onResizeStart={() => editing?.beginImageEdit?.()}
                   resizeHandleComponent={{ bottomRight: <button type="button" data-editor-only="true" data-option-resize="bottomRight" className="builder-option-resize" aria-label={`옵션 ${options.indexOf(opt) + 1} 박스 크기 조절`} title="드래그 또는 방향키로 박스 크기 조절" onKeyDown={event => { const step = event.shiftKey ? 10 : 1; if (!event.key.startsWith('Arrow')) return; event.preventDefault(); onOptionLayoutChange(opt.id, { x: opt.x, y: opt.y, width: Math.max(120, opt.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)), height: Math.max(140, opt.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)) }); }}/> }}
                   size={{ width: opt.width || 320, height: opt.height || 400 }}
                   position={{ x: opt.x || 0, y: opt.y || 0 }}
                   onDragStop={(e, d) => {
                       onOptionLayoutChange(opt.id, { 
                           x: d.x, 
                           y: d.y, 
                           width: opt.width || 320, 
                           height: opt.height || 400 
                       });
                       editing?.endImageEdit?.();
                   }}
                   onResizeStop={(e, direction, ref, delta, position) => {
                       onOptionLayoutChange(opt.id, {
                           width: parseInt(ref.style.width),
                           height: parseInt(ref.style.height),
                           ...position
                       });
                       editing?.endImageEdit?.();
                   }}
                   className="group z-10" // z-index 확보
                 >
                    {/* 드래그 핸들 및 콘텐츠 */}
                    {editing && optionPhotoEdit !== opt.id && <div className="builder-option-tools" data-editor-only="true"><button type="button" aria-label={`옵션 ${options.indexOf(opt) + 1} 박스 편집`} aria-pressed={true} onClick={() => { setOptionPhotoEdit(null); editing.select(null); }}>박스 편집</button><button type="button" aria-label={`옵션 ${options.indexOf(opt) + 1} 사진 편집`} aria-pressed={false} disabled={!opt.image} onClick={() => { setOptionPhotoEdit(opt.id); editing.select(`option:${opt.id}`, `option:${opt.id}`); }}>사진 편집</button><span>박스를 끌거나 모서리 조절</span></div>}
                    <div className="w-full h-full flex flex-col p-2 border-2 border-transparent group-hover:border-blue-300 group-hover:bg-blue-50/10 rounded-xl transition-all select-none">
                        <div style={imageOverflow(`option:${opt.id}`)} className="w-full flex-1 min-h-0 bg-white rounded-3xl overflow-hidden mb-3 border-2 border-gray-100 flex items-center justify-center relative shadow-[var(--shadow-md)] transition-all duration-200 ease-out pointer-events-none hover:shadow-[var(--shadow-lg)]">
                           {opt.image ? (
                             <EditablePreviewImage interactive={optionPhotoEdit === opt.id} tools={editing && optionPhotoEdit === opt.id ? <button type="button" aria-label={`옵션 ${options.indexOf(opt) + 1} 박스 편집`} onClick={() => { setOptionPhotoEdit(null); editing.select(null); }}>박스 편집</button> : undefined} editKey={`option:${opt.id}`} label={`옵션 ${opt.name || options.indexOf(opt) + 1} 이미지`} src={opt.image} className="w-full h-full object-contain p-4" alt={opt.name} />
                           ) : (
                             <span className="text-gray-300 font-bold text-sm">NO IMAGE</span>
                           )}
                        </div>
                        <span className="font-bold text-lg text-gray-800 text-center block w-full pointer-events-none overflow-hidden text-ellipsis whitespace-nowrap">{opt.name}</span>
                        
                        {/* 크기 조절 핸들 시각적 힌트 (우측 하단) */}
                        {!editing && <div className="absolute bottom-1 right-1 w-4 h-4 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 cursor-nwse-resize"></div>}
                    </div>
                 </Rnd>
               ))}
             </div>
          </section>
          {sectionEnd('options')}
          </React.Fragment>
        )}

        {/* 5. 메인 특징 (Feature) - 조건부 렌더링 */}
        {(data.featureImage || data.aiFeatureDesc) && (
        <React.Fragment>
        <section id="preview-feature" className="pb-32" style={spacingStyle('feature')}>
          {/* 섹션 헤더 */}
          <div className="w-full flex flex-col items-center justify-center mb-12">
             <span className="text-sm font-bold tracking-[0.5em] text-gray-300 uppercase mb-2">Key Feature</span>
            <div className="px-12 py-3 mb-4 text-white font-bold tracking-widest text-lg rounded-full shadow-[var(--shadow-lg)] transition-all duration-200 ease-out"
              style={{ background: themeColor }}
            >
              {data.productNameKr || "상품명"}
            </div>
            <h3 className="text-5xl font-black text-gray-900 mb-6 uppercase">{data.featureTitle || "특징"}</h3>
             <div className="w-10 h-1 bg-gray-800"></div>
          </div>

          <div className="px-10">
            <div style={imageOverflow('featureImage')} className="w-full bg-gray-100/50 mb-12 overflow-hidden rounded-2xl shadow-[var(--shadow-xl)] relative transition-all duration-200 ease-out hover:shadow-[var(--shadow-2xl)] border border-white/40 backdrop-blur-sm">
               {data.featureImage ? (
                <EditablePreviewImage editKey="featureImage" label="특징 이미지" src={data.featureImage} className="w-full h-auto block" alt="Feature" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-gray-300 font-bold text-3xl">FEATURE IMAGE</div>
              )}
               <RenderWatermark data={data} onWatermarkLayoutChange={onWatermarkLayoutChange} targetKey="featureImage" />
            </div>
            {data.aiFeatureDesc && (
            <div className="max-w-3xl mx-auto text-center px-4">
              <p className="text-xl leading-9 text-gray-700 font-medium whitespace-pre-line break-keep">
                {data.aiFeatureDesc}
              </p>
            </div>
            )}
          </div>
        </section>
        {sectionEnd('feature')}
        </React.Fragment>
        )}

        {/* 6. POINT 1 (필수 -> 조건부 변경) */}
        {(data.point1Image1 || data.aiPoint1Desc || (data as any).point1Image2 || (data as any).point1Image3) && (
        <React.Fragment>
        <section id="preview-point1" className="pb-32" style={spacingStyle('point1')}>
          {/* 섹션 헤더 */}
          <div className="w-full flex flex-col items-center justify-center mb-16">
            <div className="px-12 py-3 mb-4 text-white font-bold tracking-widest text-lg rounded-full shadow-[var(--shadow-lg)] transition-all duration-200 ease-out"
              style={{ background: data.themeColor }}
            >
              {data.productNameKr || "상품명"}
            </div>
            <span className="font-serif text-4xl font-bold italic text-gray-200 mb-[-20px] z-0">Point.01</span>
            <h3 className="text-6xl font-black text-gray-900 z-10" style={{ textShadow: '2px 2px 0px #fff' }}>{data.point1Title || "POINT 01"}</h3>
             <div className="w-1 h-12 bg-gray-300 mt-4"></div>
          </div>

          <div className="px-10">
            {/* 기본 1세트 */}
            {renderSubPoint(point1Image1, aiPoint1Desc, "01", "p1-1", 'point1Image1')}
            
            {/* 확장 2세트 (있을 때만) */}
            {renderSubPoint(
                (data as any).point1Image2, 
                (data as any).aiPoint1Desc2, 
                "01", 
                "p1-2",
                "point1Image2"
            )}
            
            {/* 확장 3세트 (있을 때만) */}
             {renderSubPoint(
                (data as any).point1Image3, 
                (data as any).aiPoint1Desc3, 
                "01", 
                "p1-3",
                "point1Image3"
            )}
          </div>
        </section>
        {sectionEnd('point1')}
        </React.Fragment>
        )}


        {/* 7. POINT 2 (조건부 렌더링) */}
        {isPoint2Active && (
        <React.Fragment>
        <section id="preview-point2" className="pb-32" style={spacingStyle('point2')}>
           {/* 섹션 헤더 */}
          <div className="w-full flex flex-col items-center justify-center mb-16">
            <div className="px-12 py-3 mb-4 text-white font-bold tracking-widest text-lg rounded-full shadow-[var(--shadow-lg)] transition-all duration-200 ease-out"
              style={{ background: data.themeColor }}
            >
              {data.productNameKr || "상품명"}
            </div>
            <span className="font-serif text-4xl font-bold italic text-gray-200 mb-[-20px] z-0">Point.02</span>
            <h3 className="text-6xl font-black text-gray-900 z-10" style={{ textShadow: '2px 2px 0px #fff' }}>{data.point2Title || "POINT 02"}</h3>
             <div className="w-1 h-12 bg-gray-300 mt-4"></div>
          </div>

          <div className="px-10">
            {/* 기본 1세트 */}
             {renderSubPoint(point2Image1, aiPoint2Desc, "02", "p2-1", 'point2Image1')}

            {/* 확장 2세트 */}
             {renderSubPoint(
                (data as any).point2Image2, 
                (data as any).aiPoint2Desc2, 
                "02", 
                "p2-2",
                "point2Image2"
            )}

            {/* 확장 3세트 */}
             {renderSubPoint(
                (data as any).point2Image3, 
                (data as any).aiPoint2Desc3, 
                "02", 
                "p2-3",
                "point2Image3"
            )}
          </div>
        </section>
        {sectionEnd('point2')}
        </React.Fragment>
        )}

        {/* 8. 사이즈 & 인포 - 조건부 렌더링 */}
        {(data.sizeImage || data.summaryInfo.weight) && (
        <React.Fragment>
        <section id="preview-size" className="pb-32 bg-gray-50 pt-20" style={spacingStyle('size')}>
          <div className="w-full flex flex-col items-center justify-center mb-12">
            <div className="px-12 py-3 mb-4 text-white font-bold tracking-widest text-lg rounded-full shadow-[var(--shadow-lg)] transition-all duration-200 ease-out"
              style={{ background: data.themeColor }}
            >
              {data.productNameKr || "상품명"}
            </div>
            <h3 className="text-4xl font-black text-gray-800 mb-4 uppercase">SIZE & INFO</h3>
             <div className="w-16 h-1 bg-gray-800"></div>
          </div>

          <div className="px-10 text-center">
            {/* 무게 뱃지 */}
            {data.summaryInfo.weight && (
            <div 
                className="inline-flex items-center justify-center px-12 py-6 bg-white rounded-full shadow-[var(--shadow-lg)] mb-16 transition-all duration-200 ease-out hover:shadow-[var(--shadow-xl)]" 
                style={isGradient(themeColor) ? {
                    background: `linear-gradient(#fff, #fff) padding-box, ${themeColor} border-box`,
                    border: '2px solid transparent'
                } : { 
                    border: `2px solid ${themeColor}` 
                }}
            >
              <span className="text-lg font-bold text-gray-400 mr-4 uppercase tracking-widest">Weight</span>
              <span className="text-4xl font-black text-gray-900">{summaryInfo.weight}</span>
            </div>
            )}
            
            <div style={imageOverflow('sizeImage')} className="w-full bg-white/80 rounded-3xl overflow-hidden p-8 mb-8 shadow-[var(--shadow-xl)] border border-white/40 transition-all duration-200 ease-out hover:shadow-[var(--shadow-2xl)] backdrop-blur-md">
               {sizeImage ? (
                <EditablePreviewImage editKey="sizeImage" label="사이즈 이미지" src={sizeImage} className="w-full h-auto block" alt="Size Detail" />
              ) : (
                <div className="w-full py-32 flex items-center justify-center text-gray-200 font-bold text-3xl">SIZE DETAIL</div>
              )}
               <RenderWatermark data={data} onWatermarkLayoutChange={onWatermarkLayoutChange} targetKey="sizeImage" />
            </div>

            <p className="text-lg text-gray-500 font-bold">
              ※ 측정 방법에 따라 약간의 오차가 있을 수 있습니다.
            </p>
          </div>
        </section>
        {sectionEnd('size')}
        </React.Fragment>
        )}
        
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
