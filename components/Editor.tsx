
import React from 'react';
import { ProductData, ImageType, SummaryInfo } from '../types';
import { COLOR_PRESETS } from '../constants';

interface EditorProps {
  data: ProductData;
  onChange: (data: ProductData) => void;
  onGenerateAI: () => void;
  isLoading: boolean;
}

const Editor: React.FC<EditorProps> = ({ data, onChange, onGenerateAI, isLoading }) => {
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
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
          기본 정보
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">상품명 (한글)</label>
            <input type="text" name="productNameKr" value={data.productNameKr} onChange={handleInputChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-rose-500 outline-none" placeholder="예: 바나나 소프트 실리콘 마사지기" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">상품명 (영문)</label>
            <input type="text" name="productNameEn" value={data.productNameEn} onChange={handleInputChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-rose-500 outline-none font-montserrat" placeholder="BANANA SOFT SILICONE MASSAGER" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">썸네일 제조사명</label>
            <input type="text" name="brandName" value={data.brandName} onChange={handleInputChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-rose-500 outline-none" placeholder="BRAND NAME" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
          요약 정보
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {(['features', 'type', 'material', 'dimensions', 'weight', 'maker'] as const).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{key}</label>
              <input type="text" name={`summary_${key}`} value={data.summaryInfo[key]} onChange={handleInputChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-rose-500 outline-none" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
          이미지 업로드
        </h2>
        <ImageInput label="메인 이미지" type={ImageType.MAIN} />
        <ImageInput label="패키지 이미지" type={ImageType.PACKAGE} />
        <ImageInput label="메인 특징 이미지" type={ImageType.FEATURE} />
        <div className="grid grid-cols-2 gap-4">
          <ImageInput label="POINT 1 (1)" type={ImageType.POINT1_1} />
          <ImageInput label="POINT 1 (2)" type={ImageType.POINT1_2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ImageInput label="POINT 2 (1)" type={ImageType.POINT2_1} />
          <ImageInput label="POINT 2 (2)" type={ImageType.POINT2_2} />
        </div>
        <ImageInput label="사이즈 상세 이미지" type={ImageType.SIZE} />
        <ImageInput label="썸네일 개별 이미지 (선택)" type={ImageType.THUMBNAIL} />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
          컬러 테마
        </h2>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange({ ...data, themeColor: p.value })}
              className={`w-8 h-8 rounded-full border-2 transition-all ${data.themeColor === p.value ? 'border-gray-900 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: p.value }}
              title={p.label}
            />
          ))}
          <input 
            type="color" 
            value={data.themeColor} 
            onChange={(e) => onChange({ ...data, themeColor: e.target.value })}
            className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-none overflow-hidden"
          />
        </div>
      </section>

      <section className="sticky bottom-0 bg-white py-4 border-t">
        <button
          onClick={onGenerateAI}
          disabled={isLoading}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'}`}
        >
          {isLoading ? 'AI 카피 생성 중...' : 'AI 문구 자동 생성'}
        </button>
      </section>

      <section>
         <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
          AI 텍스트 수정
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">핵심 특징 3줄</label>
            <textarea name="aiSummary" value={data.aiSummary} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-rose-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메인 특징 설명</label>
            <textarea name="aiFeatureDesc" value={data.aiFeatureDesc} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-rose-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">POINT 1 설명</label>
            <textarea name="aiPoint1Desc" value={data.aiPoint1Desc} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-rose-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">POINT 2 설명</label>
            <textarea name="aiPoint2Desc" value={data.aiPoint2Desc} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-rose-500 outline-none text-sm" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Editor;
