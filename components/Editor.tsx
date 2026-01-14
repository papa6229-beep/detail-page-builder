// components/Editor.tsx

import React, { useState } from 'react'; // useState 추가
import { ProductData, ImageType, SummaryInfo, OptionItem } from '../types';
import { COLOR_PRESETS } from '../constants';

interface EditorProps {
  data: ProductData;
  onChange: (data: ProductData) => void;
  onGenerateAI: () => void;
  isLoading: boolean;
}

const Editor: React.FC<EditorProps> = ({ data, onChange, onGenerateAI, isLoading }) => {
  // ▼▼▼ [추가] 확장 섹션 열림/닫힘 상태 관리
  const [showP1Ext, setShowP1Ext] = useState(false);
  const [showP2Ext, setShowP2Ext] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('summary_')) {
      const field = name.replace('summary_', '') as keyof SummaryInfo;
      onChange({
        ...data,
        summaryInfo: { ...data.summaryInfo, [field]: value }
      });
    } else {
      onChange({ ...data, [name]: value });
    }
  };

  const handleImageUpload = (type: ImageType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...data, [type]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // 옵션 핸들러들 (기존 유지)
  const addOption = () => {
    const newOption: OptionItem = { id: Date.now().toString(), name: '', image: null };
    onChange({ ...data, options: [...data.options, newOption] });
  };
  const removeOption = (id: string) => {
    onChange({ ...data, options: data.options.filter(opt => opt.id !== id) });
  };
  const updateOptionName = (id: string, name: string) => {
    onChange({ ...data, options: data.options.map(opt => opt.id === id ? { ...opt, name } : opt) });
  };
  const updateOptionImage = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({ ...data, options: data.options.map(opt => opt.id === id ? { ...opt, image: reader.result as string } : opt) });
    };
    reader.readAsDataURL(file);
  };

  const ImageInput = ({ label, type }: { label: string, type: ImageType }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-4">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload(type)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
        />
        {data[type] && <div className="w-12 h-12 rounded border bg-gray-50 overflow-hidden"><img src={data[type] as string} className="w-full h-full object-cover" /></div>}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full overflow-y-auto space-y-8">
      {/* 1. 기본 정보 & 2. 요약 정보 & 3. 옵션 정보 (기존 유지) */}
      {/* ... 리더님 기존 코드와 동일 ... */}
      
      {/* 4. 이미지 업로드 섹션 수정 */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
          이미지 업로드
        </h2>
        <ImageInput label="메인 이미지" type={ImageType.MAIN} />
        <ImageInput label="패키지 이미지" type={ImageType.PACKAGE} />
        <ImageInput label="메인 특징 이미지" type={ImageType.FEATURE} />
        
        {/* POINT 1 확장형 이미지 UI */}
        <div className="p-4 bg-gray-50 rounded-xl mb-4 border border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <ImageInput label="POINT 1 (1)" type={ImageType.POINT1_1} />
            <ImageInput label="POINT 1 (2)" type={ImageType.POINT1_2} />
          </div>
          {!showP1Ext ? (
            <button onClick={() => setShowP1Ext(true)} className="text-xs text-rose-600 font-bold hover:underline">+ 포인트 1 이미지 추가</button>
          ) : (
            <div className="mt-2 pt-4 border-t border-dashed border-gray-200">
              <ImageInput label="POINT 1 (3) - 선택" type={ImageType.POINT1_3} />
              <button onClick={() => setShowP1Ext(false)} className="text-xs text-gray-400 hover:underline">접기</button>
            </div>
          )}
        </div>

        {/* POINT 2 확장형 이미지 UI */}
        <div className="p-4 bg-gray-50 rounded-xl mb-4 border border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <ImageInput label="POINT 2 (1)" type={ImageType.POINT2_1} />
            <ImageInput label="POINT 2 (2)" type={ImageType.POINT2_2} />
          </div>
          {!showP2Ext ? (
            <button onClick={() => setShowP2Ext(true)} className="text-xs text-rose-600 font-bold hover:underline">+ 포인트 2 이미지 추가</button>
          ) : (
            <div className="mt-2 pt-4 border-t border-dashed border-gray-200">
              <ImageInput label="POINT 2 (3) - 선택" type={ImageType.POINT2_3} />
              <button onClick={() => setShowP2Ext(false)} className="text-xs text-gray-400 hover:underline">접기</button>
            </div>
          )}
        </div>

        <ImageInput label="사이즈 상세 이미지" type={ImageType.SIZE} />
        <ImageInput label="썸네일 개별 이미지 (선택)" type={ImageType.THUMBNAIL} />
      </section>

      {/* 5. 컬러 테마 & AI 문구 자동 생성 (기존 유지) */}

      {/* 6. AI 텍스트 수정 섹션 수정 */}
      <section className="pb-10">
         <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
          AI 텍스트 수정
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">핵심 특징 3줄</label>
            <textarea name="aiSummary" value={data.aiSummary} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md text-sm" />
          </div>
          
          {/* POINT 1 텍스트 확장 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">POINT 1 설명</label>
            <textarea name="aiPoint1Desc" value={data.aiPoint1Desc} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md text-sm" />
            {showP1Ext && (
              <div className="space-y-2 animate-fadeIn">
                <textarea name="aiPoint1Desc2" value={data.aiPoint1Desc2 || ''} onChange={handleInputChange} rows={2} className="w-full p-2 border border-rose-100 rounded-md text-sm bg-rose-50/30" placeholder="추가 설명 2 (이미지 2 다음에 위치)" />
                <textarea name="aiPoint1Desc3" value={data.aiPoint1Desc3 || ''} onChange={handleInputChange} rows={2} className="w-full p-2 border border-rose-100 rounded-md text-sm bg-rose-50/30" placeholder="추가 설명 3 (이미지 3 다음에 위치)" />
              </div>
            )}
          </div>

          {/* POINT 2 텍스트 확장 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">POINT 2 설명</label>
            <textarea name="aiPoint2Desc" value={data.aiPoint2Desc} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md text-sm" />
            {showP2Ext && (
              <div className="space-y-2 animate-fadeIn">
                <textarea name="aiPoint2Desc2" value={data.aiPoint2Desc2 || ''} onChange={handleInputChange} rows={2} className="w-full p-2 border border-rose-100 rounded-md text-sm bg-rose-50/30" placeholder="추가 설명 2" />
                <textarea name="aiPoint2Desc3" value={data.aiPoint2Desc3 || ''} onChange={handleInputChange} rows={2} className="w-full p-2 border border-rose-100 rounded-md text-sm bg-rose-50/30" placeholder="추가 설명 3" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Editor;