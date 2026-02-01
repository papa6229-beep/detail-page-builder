import React from 'react';
import { ProductData, ImageType, SummaryInfo, OptionItem } from '../types';
import { COLOR_PRESETS } from '../constants';

interface EditorProps {
  data: ProductData;
  onChange: (data: ProductData) => void;
  onGenerateAI: () => void;
  isLoading: boolean;
}

const Editor: React.FC<EditorProps> = ({ data, onChange, onGenerateAI, isLoading }) => {

  /* ================= 공통 핸들러 ================= */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('summary_')) {
      const field = name.replace('summary_', '') as keyof SummaryInfo;
      onChange({ ...data, summaryInfo: { ...data.summaryInfo, [field]: value } });
    } else {
      onChange({ ...data, [name]: value });
    }
  };

  const handleImageUpload = (type: ImageType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({ ...data, [type]: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const ImageInput = ({ label, type }: { label: string; type: ImageType }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-4">
        <input type="file" accept="image/*" onChange={handleImageUpload(type)} />
        {!!data[type] && data[type].startsWith('data:') && (
  <img
    src={data[type] as string}
    className="w-24 h-24 rounded border object-cover"
    alt=""
  />
)}

      </div>
    </div>
  );

  /* ================= 옵션 ================= */
  const addOption = () => {
    const opt: OptionItem = { id: Date.now().toString(), name: '', image: null };
    onChange({ ...data, options: [...data.options, opt] });
  };

  const updateOptionName = (id: string, name: string) => {
    onChange({
      ...data,
      options: data.options.map(o => (o.id === id ? { ...o, name } : o)),
    });
  };

  const updateOptionImage = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({
        ...data,
        options: data.options.map(o =>
          o.id === id ? { ...o, image: reader.result as string } : o
        ),
      });
    };
    reader.readAsDataURL(file);
  };

  const removeOption = (id: string) => {
    onChange({ ...data, options: data.options.filter(o => o.id !== id) });
  };

  /* ================= 헬퍼 ================= */
  const toggleField = (key: string) => {
    onChange({ ...data, [key]: data[key as keyof ProductData] ? '' : '' });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full overflow-y-auto space-y-10">

      {/* 컬러 테마 */}
      <section>
        <h2 className="text-xl font-bold mb-4">컬러 테마</h2>
        <div className="flex gap-2 flex-wrap">
          {COLOR_PRESETS.map(p => (
            <button
              key={p.value}
              className={`w-8 h-8 rounded-full border-2 ${
                data.themeColor === p.value ? 'border-black scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: p.value }}
              onClick={() => onChange({ ...data, themeColor: p.value })}
            />
          ))}
          <input
            type="color"
            value={data.themeColor}
            onChange={e => onChange({ ...data, themeColor: e.target.value })}
          />
        </div>
      </section>

      {/* 기본 정보 */}
      <section>
        <h2 className="text-xl font-bold mb-4">기본 정보</h2>
        <input name="productNameKr" value={data.productNameKr} onChange={handleInputChange} className="w-full p-2 border rounded mb-2" placeholder="상품명 (한글)" />
        <input name="productNameEn" value={data.productNameEn} onChange={handleInputChange} className="w-full p-2 border rounded mb-2" placeholder="상품명 (영문)" />
        <input name="brandName" value={data.brandName} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="제조사명" />
      </section>

      {/* 메인 이미지 */}
      <section>
        <h2 className="text-xl font-bold mb-4">메인 이미지</h2>
        <ImageInput label="메인 이미지 파일 선택" type={ImageType.MAIN} />
      </section>

      {/* 요약 정보 */}
<section>
  <h2 className="text-xl font-bold mb-4">요약 정보</h2>

  {([
    { key: 'feature', label: '특징' },
    { key: 'type', label: '타입' },
    { key: 'material', label: '재질' },
    { key: 'size', label: '치수' },
    { key: 'weight', label: '무게' },
    { key: 'power', label: '전원타입' },
    { key: 'maker', label: '제조사' },
  ] as const).map(item => (
    <input
      key={item.key}
      name={`summary_${item.key}`}
      value={data.summaryInfo[item.key]}
      onChange={handleInputChange}
      className="w-full p-2 border rounded mb-2"
      placeholder={item.label}
    />
  ))}
</section>


      {/* 핵심 특징 */}
      <section>
        <h2 className="text-xl font-bold mb-4">핵심 특징 3줄</h2>
        <textarea name="aiSummary" value={data.aiSummary} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded" />
      </section>

      {/* 패키지 이미지 */}
      <section>
        <h2 className="text-xl font-bold mb-4">패키지 이미지</h2>
        <ImageInput label="패키지 이미지 파일 선택" type={ImageType.PACKAGE} />
      </section>

      {/* 옵션 */}
      <section>
        <h2 className="text-xl font-bold mb-4">옵션 (선택)</h2>
        <button onClick={addOption} className="mb-3 text-sm bg-black text-white px-3 py-1 rounded">+ 옵션 추가</button>
        {data.options.map((o, i) => (
          <div key={o.id} className="border p-3 rounded mb-3">
            <input value={o.name} onChange={e => updateOptionName(o.id, e.target.value)} className="w-full p-2 border rounded mb-2" placeholder={`옵션명 ${i + 1}`} />
            <input type="file" onChange={e => e.target.files && updateOptionImage(o.id, e.target.files[0])} />
            {o.image && <img src={o.image} className="w-10 h-10 mt-2" />}
            <button onClick={() => removeOption(o.id)} className="text-xs text-red-500 mt-2">삭제</button>
          </div>
        ))}
      </section>

      {/* 메인 특징 */}
      <section>
        <h2 className="text-xl font-bold mb-4">메인 특징 이미지</h2>
        <ImageInput label="메인 특징 이미지 파일 선택" type={ImageType.FEATURE} />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">메인 특징 설명</h2>
        <textarea name="aiFeatureDesc" value={data.aiFeatureDesc} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded" />
      </section>

      {/* POINT 1 (필수) */}
      <section>
        <h2 className="text-xl font-bold mb-4">POINT 1</h2>
        <ImageInput label="POINT 1 (1)" type={ImageType.POINT1_1} />
        <textarea
  name="aiPoint1Desc"
  value={data.aiPoint1Desc}
  onChange={handleInputChange}
  rows={2}
  className="w-full p-2 border rounded mb-6"
  placeholder="POINT 1의 핵심 설명을 입력하세요"
/>

      {/* POINT 1 선택 확장 (2, 3) */}
{[2, 3].map(n => {
  const imgKey = `point1Image${n}`;
  const descKey = `aiPoint1Desc${n}`;

  const hasImage = !!(data as any)[imgKey];
  const hasDesc = !!(data as any)[descKey];

  return (
    <div key={n} className="mb-6 space-y-3">
      <div className="text-sm font-bold text-gray-600">POINT 1 ({n})</div>

      {/* 이미지 토글 */}
      {!hasImage ? (
        <button
          type="button"
          className="text-xs text-rose-600"
          onClick={() =>
            onChange({ ...data, [imgKey]: '__ENABLED__' } as any)
          }
        >
          + 이미지 추가
        </button>
      ) : (
        <>
          <ImageInput
            label={`POINT 1 (${n}) 이미지`}
            type={ImageType[`POINT1_${n}` as keyof typeof ImageType]}
          />
          <button
            type="button"
            className="text-xs text-red-400"
            onClick={() =>
              onChange({ ...data, [imgKey]: '' } as any)
            }
          >
            − 이미지 제거
          </button>
        </>
      )}

      {/* 설명 토글 */}
      {!hasDesc ? (
        <button
          type="button"
          className="text-xs text-gray-500"
          onClick={() =>
            onChange({ ...data, [descKey]: '__ENABLED__' } as any)
          }
        >
          + 설명 추가
        </button>
      ) : (
        <>
          <textarea
            name={descKey}
            value={(data as any)[descKey] === '__ENABLED__' ? '' : (data as any)[descKey]}
            onChange={handleInputChange}
            rows={2}
            className="w-full p-2 border rounded"
            placeholder={`POINT 1 (${n}) 설명을 입력하세요`}
          />
          <button
            type="button"
            className="text-xs text-red-400"
            onClick={() =>
              onChange({ ...data, [descKey]: '' } as any)
            }
          >
            − 설명 제거
          </button>
        </>
      )}
    </div>
  );
})}

      </section>

     {/* POINT 2 (선택 확장형) */}
<section>
  <h2 className="text-xl font-bold mb-4">POINT 2</h2>

  {[1, 2, 3].map(n => {
    const imgKey = `point2Image${n === 1 ? '1' : n}`;
    const descKey = `aiPoint2Desc${n === 1 ? '' : n}`;

    const hasImage = !!(data as any)[imgKey];
    const hasDesc = !!(data as any)[descKey];

    return (
      <div key={n} className="mb-6 space-y-3">
        <div className="text-sm font-bold text-gray-600">POINT 2 ({n})</div>

        {/* 이미지 토글 */}
        {!hasImage ? (
          <button
            type="button"
            className="text-xs text-rose-600"
            onClick={() =>
              onChange({ ...data, [imgKey]: '__ENABLED__' } as any)
            }
          >
            + 이미지 추가
          </button>
        ) : (
          <>
            <ImageInput
              label={`POINT 2 (${n}) 이미지`}
              type={ImageType[`POINT2_${n}` as keyof typeof ImageType]}
            />
            <button
              type="button"
              className="text-xs text-red-400"
              onClick={() =>
                onChange({ ...data, [imgKey]: '' } as any)
              }
            >
              − 이미지 제거
            </button>
          </>
        )}

        {/* 설명 토글 */}
        {!hasDesc ? (
          <button
            type="button"
            className="text-xs text-gray-500"
            onClick={() =>
              onChange({ ...data, [descKey]: '__ENABLED__' } as any)
            }
          >
            + 설명 추가
          </button>
        ) : (
          <>
            <textarea
              name={descKey}
              value={(data as any)[descKey] === '__ENABLED__' ? '' : (data as any)[descKey]}
              onChange={handleInputChange}
              rows={2}
              className="w-full p-2 border rounded"
              placeholder={`POINT 2 (${n}) 설명을 입력하세요`}
            />
            <button
              type="button"
              className="text-xs text-red-400"
              onClick={() =>
                onChange({ ...data, [descKey]: '' } as any)
              }
            >
              − 설명 제거
            </button>
          </>
        )}
      </div>
    );
  })}
</section>

      {/* 사이즈 */}
      <section>
        <ImageInput label="사이즈 상세 이미지" type={ImageType.SIZE} />
        <ImageInput label="썸네일 개별 이미지" type={ImageType.THUMBNAIL} />
      </section>

      {/* 하단 버튼 */}
      <section className="sticky bottom-0 bg-white pt-4 border-t">
        <button onClick={onGenerateAI} disabled={isLoading} className="w-full py-4 bg-rose-600 text-white font-bold rounded">
          {isLoading ? 'AI 생성 중...' : 'AI 문구 자동 생성'}
        </button>
      </section>
    </div>
  );
};

export default Editor;
