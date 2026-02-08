import React from 'react';
import { ProductData, OptionItem } from '../types';
import { COLOR_PRESETS } from '../constants';

// =============================================================================
// ✅ 컴포넌트들을 Editor 함수 밖으로 꺼냈습니다 (입력 끊김 해결의 핵심!)
// =============================================================================

// 1. 공통 이미지 업로더
const ImageUploader = React.memo(({ 
  label, value, subLabel, isSmall = false, targetId, onDelete, onChange 
}: { 
  label: string, value: string | null, subLabel?: string, isSmall?: boolean, targetId?: string, onDelete?: () => void, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void 
}) => {
  const hasImage = value && value !== '__ENABLED__';
  
  const scrollToPreview = () => {
    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="mb-4" onClick={scrollToPreview}>
      {/* 1. 상단 라벨 및 삭제 버튼 영역 */}
      <div className="flex justify-between items-end mb-1">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide cursor-default">
              {label} <span className="text-gray-300 font-normal">{subLabel}</span>
          </label>
          {onDelete && value && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="text-[10px] text-red-400 font-bold hover:text-red-600 underline focus:outline-none focus:text-red-600"
                aria-label={`${label} 삭제`}
              >
                삭제
              </button>
          )}
      </div>

      {/* 2. 업로드 영역 (Label로 감싸서 클릭 시 파일 선택창 자동 활성화) */}
      <label 
        className={`relative block w-full ${isSmall ? 'h-32' : 'aspect-video'} bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 transition-colors group cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent`}
      >
        {hasImage ? (
          <img src={value} alt={label} className="w-full h-full object-contain bg-white" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
            <span className="text-2xl mb-1" aria-hidden="true">+</span>
            <span className="text-[10px] font-bold">UPLOAD</span>
          </div>
        )}
        
        {/* 접근성을 위한 숨김 처리 (sr-only: 시각적으로만 숨김) */}
        <input 
            type="file" 
            accept="image/*" 
            className="sr-only" 
            onChange={onChange} 
            onClick={(e) => (e.currentTarget.value = '')} 
        />
      </label>
      
      {/* 3. 하단 편집 버튼 (독립적 영역으로 분리하여 클릭 간섭 제거) */}
      <div className="mt-2 flex justify-end">
        <a 
            href="https://new.express.adobe.com/" 
            target="_blank" 
            rel="noreferrer"
            className="text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 focus:ring-2 focus:ring-violet-300 focus:outline-none"
            onClick={(e) => e.stopPropagation()} 
        >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Adobe로 이미지 편집
        </a>
      </div>
    </div>
  );
});

// 2. 공통 텍스트 에디터 (memo 적용으로 성능 최적화)
const Textarea = React.memo(({ 
  label, value, placeholder, rows = 3, targetId, onDelete, onChange 
}: { 
  label: string, value: string, placeholder: string, rows?: number, targetId?: string, onDelete?: () => void, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void 
}) => {
  
  const handleFocus = () => {
    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="mb-5" onFocus={handleFocus}>
      <div className="flex justify-between items-end mb-2">
          <label className="block text-xs font-bold text-gray-700">{label}</label>
          {onDelete && value && <button onClick={onDelete} className="text-[10px] text-red-400 font-bold hover:text-red-600 underline">삭제</button>}
      </div>
      <textarea
        className="w-full p-3 border border-gray-200 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-black outline-none transition-shadow resize-y"
        value={value === '__ENABLED__' ? '' : value || ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
});

// =============================================================================
// 메인 Editor 컴포넌트
// =============================================================================

interface EditorProps {
  data: ProductData;
  onChange: (value: React.SetStateAction<ProductData>) => void;
  onGenerateAI: () => void;
  isLoading: boolean;
}

const Editor: React.FC<EditorProps> = ({ data, onChange, onGenerateAI, isLoading }) => {

  // --- 핸들러 함수들 ---
  
  // 스크롤 이동
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // 텍스트 변경
  const handleTextChange = (key: keyof ProductData) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange(prev => ({ ...prev, [key]: e.target.value }));
  };

  // 스펙 변경
  const handleSummaryChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(prev => ({
        ...prev,
        summaryInfo: { ...prev.summaryInfo, [key]: e.target.value }
    }));
  };

  // 이미지 업로드
  const handleImageChange = (key: keyof ProductData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onChange(prev => ({ ...prev, [key]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  // 컬러 변경
  const handleColorChange = (color: string) => {
    onChange(prev => ({ ...prev, themeColor: color }));
  };

  // 서브 포인트 제어 (활성화/삭제)
  const enableSlot = (key: keyof ProductData) => {
    onChange(prev => ({ ...prev, [key]: '__ENABLED__' }));
  };
  
  const removeSlot = (key: keyof ProductData) => {
    onChange(prev => ({ ...prev, [key]: key.toLowerCase().includes('image') ? null : '' }));
  };

  // 옵션 관련
  const addOption = () => {
    // 기본값: x=0, y=0, w=320, h=400 (적당한 크기)
    const newOption: OptionItem = { 
        id: Date.now().toString(), 
        name: '', 
        image: null,
        x: 0, 
        y: 0, 
        width: 320, 
        height: 400 
    };
    onChange(prev => ({ ...prev, options: [...prev.options, newOption] }));
  };
  const removeOption = (id: string) => {
    if (window.confirm('삭제하시겠습니까?')) {
        onChange(prev => ({ ...prev, options: prev.options.filter(o => o.id !== id) }));
    }
  };
  const updateOptionName = (id: string, name: string) => {
    onChange(prev => ({
        ...prev,
        options: prev.options.map(opt => opt.id === id ? { ...opt, name } : opt)
    }));
  };
  const updateOptionImage = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(prev => ({
            ...prev,
            options: prev.options.map(opt => opt.id === id ? { ...opt, image: reader.result as string } : opt)
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 서브포인트 렌더링 헬퍼
  const renderSubPoint = (n: number, prefix: 'point1' | 'point2', targetId: string) => {
    const imgKey = `${prefix}Image${n}` as keyof ProductData;
    const descKey = `ai${prefix.charAt(0).toUpperCase() + prefix.slice(1)}Desc${n}` as keyof ProductData;
    const isImgActive = (data as any)[imgKey];
    const isDescActive = (data as any)[descKey];

    if (!isImgActive && !isDescActive) {
        return (
            <div className="flex gap-2 mt-4">
                <button onClick={() => enableSlot(imgKey)} className="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all text-xs">+ 이미지 ({prefix}-{n})</button>
                <button onClick={() => enableSlot(descKey)} className="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 font-bold hover:border-green-400 hover:text-green-500 hover:bg-green-50 transition-all text-xs">+ 설명 ({prefix}-{n})</button>
            </div>
        );
    }

    return (
        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 animate-fade-in-down">
            <div className="text-xs font-bold text-gray-400 mb-2 uppercase">{prefix} - {n}</div>
            {isImgActive ? (
                <ImageUploader label={`Image ${prefix === 'point1' ? '1' : '2'}-${n}`} value={(data as any)[imgKey]} targetId={targetId} onDelete={() => removeSlot(imgKey)} onChange={handleImageChange(imgKey)} />
            ) : (
                <button onClick={() => enableSlot(imgKey)} className="w-full py-2 mb-4 border border-dashed border-gray-200 rounded text-xs text-gray-400 hover:bg-gray-50">+ 이미지 추가</button>
            )}
            {isDescActive ? (
                <Textarea label={`설명 ${prefix === 'point1' ? '1' : '2'}-${n}`} value={(data as any)[descKey]} placeholder="AI 작성 영역" targetId={targetId} onDelete={() => removeSlot(descKey)} onChange={handleTextChange(descKey)} />
            ) : (
                <button onClick={() => enableSlot(descKey)} className="w-full py-2 border border-dashed border-gray-200 rounded text-xs text-gray-400 hover:bg-gray-50">+ 설명 추가</button>
            )}
        </div>
    );
  };

  // 스펙 라벨 (한글)
  const SPEC_LABELS: Record<string, string> = {
    feature: '특징', type: '타입/종류', material: '재질/소재', size: '사이즈 (mm)', weight: '무게 (g)', power: '전원/충전', maker: '제조사'
  };

  return (
    <div className="p-6 pb-32 space-y-8 relative">
      
      {/* 1. 기본 설정 */}
      <section className="space-y-4" onClick={() => scrollTo('preview-top')}>
        <h2 className="text-lg font-black text-gray-900 border-b pb-2">📂 기본 설정</h2>
        <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">컬러 테마</label>
            <div className="flex gap-2 flex-wrap mb-2">
                {COLOR_PRESETS.map(p => (
                    <button key={p.value} onClick={() => handleColorChange(p.value)} className={`w-8 h-8 rounded-full border-2 transition-transform ${data.themeColor === p.value ? 'border-gray-600 scale-110' : 'border-transparent hover:scale-105'}`} style={{ background: p.value }} title={(p as any).label || p.value} />
                ))}
            </div>
             <div className="flex gap-2">
                <input type="color" className="w-10 h-10 rounded cursor-pointer border-none" value={data.themeColor} onChange={(e) => handleColorChange(e.target.value)} />
                <input type="text" className="flex-1 p-2 border border-gray-300 rounded uppercase text-sm" value={data.themeColor} onChange={(e) => handleColorChange(e.target.value)} />
             </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">상품명 (한글)</label>
          <input type="text" className="w-full p-3 border border-gray-300 rounded-lg font-bold" value={data.productNameKr} onChange={handleTextChange('productNameKr')} onFocus={() => scrollTo('preview-top')} placeholder="예: 바나나 오나홀" />
        </div>
        <div>
           <label className="block text-sm font-bold text-gray-700 mb-1">영문 상품명</label>
           <input type="text" className="w-full p-3 border border-gray-300 rounded-lg font-medium font-montserrat" value={data.productNameEn} onChange={handleTextChange('productNameEn')} onFocus={() => scrollTo('preview-top')} placeholder="BANANA ONAHOLE" />
        </div>
        <div>
           <label className="block text-sm font-bold text-gray-700 mb-1">제조사/브랜드명</label>
           <input type="text" className="w-full p-3 border border-gray-300 rounded-lg font-medium text-gray-600" value={data.brandName} onChange={handleTextChange('brandName')} onFocus={() => scrollTo('preview-top')} placeholder="예: BANANA MALL" />
        </div>
      </section>

      {/* 2. 메인 이미지 */}
      <section className="space-y-4" onClick={() => scrollTo('preview-main')}>
        <h2 className="text-lg font-black text-gray-900 border-b pb-2">🖼️ 메인 이미지</h2>
        <ImageUploader label="Main Image" value={data.mainImage} targetId="preview-main" onChange={handleImageChange('mainImage')} />
      </section>

      {/* 3. 스펙 정보 */}
      <section className="space-y-4" onClick={() => scrollTo('preview-spec')}>
         <h2 className="text-lg font-black text-gray-900 border-b pb-2">📝 스펙 정보</h2>
         <div className="grid grid-cols-2 gap-3">
            {Object.keys(SPEC_LABELS).map((key) => (
              <div key={key}>
                 <label className="block text-xs font-bold text-gray-500 mb-1 capitalize">{SPEC_LABELS[key]}</label>
                 <input type="text" className="w-full p-2 border border-gray-200 rounded text-sm" value={(data.summaryInfo as any)[key] || ''} onChange={handleSummaryChange(key)} onFocus={() => scrollTo('preview-spec')} />
              </div>
            ))}
         </div>
         <Textarea label="AI 생성 참고용 핵심 요약" value={data.aiSummary} placeholder="예: 강력한 진동, 부드러운 실리콘 재질..." rows={2} targetId="preview-spec" onChange={handleTextChange('aiSummary')} />
         
         {/* [추가] 동영상 삽입 (800x450) */}
         <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
            <ImageUploader 
                label="동영상 삽입 (이미지)" 
                subLabel="800x450 권장" 
                value={data.videoInsertImage} 
                targetId="preview-spec" 
                onChange={handleImageChange('videoInsertImage')} 
                onDelete={() => onChange(prev => ({ ...prev, videoInsertImage: null }))}
            />
         </div>
      </section>

      {/* 4. 패키지 이미지 정보 (분리됨) */}
      <section className="space-y-4" onClick={() => scrollTo('preview-package')}>
        <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-black text-gray-900">📦 패키지 이미지 설정</h2>
            <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={data.isPackageImageEnabled ?? true} 
                    onChange={(e) => onChange(prev => ({ ...prev, isPackageImageEnabled: e.target.checked }))} 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-900">{data.isPackageImageEnabled ? 'ON' : 'OFF'}</span>
            </label>
        </div>

        {data.isPackageImageEnabled && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in-down">
                <div className="col-span-1"><ImageUploader label="Package Image" value={data.packageImage} isSmall={true} targetId="preview-package" onChange={handleImageChange('packageImage')} /></div>
                 <div className="col-span-1 flex items-center justify-center text-xs text-gray-400">패키지 이미지는<br/>작게 출력됩니다.</div>
            </div>
        )}
      </section>

      {/* 5. 옵션 */}
      <section className="bg-gray-50 p-4 rounded-xl border border-gray-100" onClick={() => scrollTo('preview-option')}>
         <div className="flex justify-between items-center mb-4">
             <h2 className="text-md font-bold text-gray-900">✨ 추가 옵션 (Option)</h2>
             <button onClick={addOption} className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800">+ 추가</button>
         </div>
         {data.options.map((opt, i) => (
             <div key={opt.id} className="bg-white p-3 rounded border border-gray-200 mb-3 last:mb-0 relative" onFocus={() => scrollTo('preview-option')}>
                 <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-bold text-gray-400">Option {i + 1}</div>
                    <button onClick={() => removeOption(opt.id)} className="text-red-500 text-xs font-bold hover:underline px-2">삭제</button>
                 </div>
                 <input type="text" value={opt.name} onChange={(e) => updateOptionName(opt.id, e.target.value)} placeholder="옵션명" className="w-full p-2 border border-gray-200 rounded text-sm mb-2" />
                 <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 border">
                        {opt.image ? <img src={opt.image} className="w-full h-full object-cover" alt="opt" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>}
                    </div>
                    <input type="file" className="text-xs" onChange={(e) => updateOptionImage(opt.id, e)} />
                 </div>
             </div>
         ))}
      </section>

      {/* 5. 상세 포인트 */}
      <section className="space-y-6">
         <h2 className="text-lg font-black text-gray-900 border-b pb-2">✨ 상세 포인트</h2>
         
         {/* Feature */}
         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100" onClick={() => scrollTo('preview-feature')}>
            <h3 className="font-bold text-gray-800 mb-3">Feature (핵심 특징)</h3>
            {data.featureImage || data.aiFeatureDesc ? (
                <>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500">Main</span>
                        <button onClick={() => { removeSlot('featureImage'); removeSlot('aiFeatureDesc'); }} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded">🗑 섹션 삭제</button>
                    </div>
                    <ImageUploader label="Feature Image" value={data.featureImage} targetId="preview-feature" onChange={handleImageChange('featureImage')} onDelete={() => removeSlot('featureImage')} />
                    <Textarea label="AI 설명" value={data.aiFeatureDesc} placeholder="AI 작성 영역" targetId="preview-feature" onChange={handleTextChange('aiFeatureDesc')} onDelete={() => removeSlot('aiFeatureDesc')} />
                </>
            ) : (
                <button onClick={() => { enableSlot('featureImage'); enableSlot('aiFeatureDesc'); }} className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 font-bold hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all">+ Feature 섹션 추가하기</button>
            )}
         </div>

         {/* Point 1 */}
         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100" onClick={() => scrollTo('preview-point1')}>
            <h3 className="font-bold text-gray-800 mb-3">Point 01</h3>
            {data.point1Image1 || data.aiPoint1Desc || (data as any).point1Image2 || (data as any).point1Image3 ? (
             <>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500">Main</span>
                    <button onClick={() => { removeSlot('point1Image1'); removeSlot('aiPoint1Desc'); }} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded">🗑 섹션 삭제 (전체)</button>
                </div>
                <ImageUploader label="Image 1-1" value={data.point1Image1} targetId="preview-point1" onChange={handleImageChange('point1Image1')} onDelete={() => removeSlot('point1Image1')} />
                <Textarea label="설명 1-1" value={data.aiPoint1Desc} placeholder="AI 작성 영역" targetId="preview-point1" onChange={handleTextChange('aiPoint1Desc')} onDelete={() => removeSlot('aiPoint1Desc')} />
                
                {renderSubPoint(2, 'point1', 'preview-point1')}
                {renderSubPoint(3, 'point1', 'preview-point1')}
             </>
            ) : (
                <button onClick={() => { enableSlot('point1Image1'); enableSlot('aiPoint1Desc'); }} className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 font-bold hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all">+ Point 01 섹션 추가하기</button>
            )}
         </div>

         {/* Point 2 */}
         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100" onClick={() => scrollTo('preview-point2')}>
            <h3 className="font-bold text-gray-800 mb-3">Point 02</h3>
            {data.point2Image1 || data.aiPoint2Desc ? (
               <>
                 <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-gray-500">Main</span>
                     <button onClick={() => { removeSlot('point2Image1'); removeSlot('aiPoint2Desc'); }} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded">🗑 섹션 삭제</button>
                 </div>
                 <ImageUploader label="Image 2-1" value={data.point2Image1} targetId="preview-point2" onChange={handleImageChange('point2Image1')} onDelete={() => removeSlot('point2Image1')} />
                 <Textarea label="설명 2-1" value={data.aiPoint2Desc} placeholder="AI 작성 영역" targetId="preview-point2" onChange={handleTextChange('aiPoint2Desc')} onDelete={() => removeSlot('aiPoint2Desc')} />
                 
                 {renderSubPoint(2, 'point2', 'preview-point2')}
                 {renderSubPoint(3, 'point2', 'preview-point2')}
               </>
            ) : (
               <button onClick={() => { enableSlot('point2Image1'); enableSlot('aiPoint2Desc'); }} className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 font-bold hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition-all">+ Point 02 섹션 추가하기</button>
            )}
         </div>

         {/* Size & Thumb */}
         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100" onClick={() => scrollTo('preview-size')}>
            <h2 className="text-md font-bold text-gray-900 mb-3">📏 사이즈 및 썸네일</h2>
            <div className="grid grid-cols-2 gap-4">
                <ImageUploader label="Size Detail" value={data.sizeImage} targetId="preview-size" onChange={handleImageChange('sizeImage')} onDelete={() => removeSlot('sizeImage')} />
                <ImageUploader label="Thumbnail" value={data.thumbnailImage} targetId="preview-size" onChange={handleImageChange('thumbnailImage')} onDelete={() => removeSlot('thumbnailImage')} />
            </div>
         </div>
      </section>

      {/* AI Button */}
      <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 p-4 -mx-6 shadow-2xl">
        <button onClick={onGenerateAI} disabled={isLoading} className={`w-full py-4 rounded-xl font-black text-lg shadow-lg transform transition-all flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-rose-600 text-white hover:bg-rose-700 hover:scale-[1.01]'}`}>
          {isLoading ? <>AI가 문구 작성중...</> : <>✨ AI 문구 자동 생성하기</>}
        </button>
      </div>
    </div>
  );
};

export default Editor;