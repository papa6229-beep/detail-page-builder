import React, { useState, useRef } from 'react';
import { toJpeg } from 'html-to-image'; 
import { ProductData } from './types';
import { INITIAL_PRODUCT_DATA, THUMBNAIL_PRESETS } from './constants';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Editor from './components/Editor';
import Preview from './components/Preview';
import ThumbnailPreview from './components/ThumbnailPreview';
import { generateCopywriting } from './services/geminiService';

const App: React.FC = () => {
  const [data, setData] = useState<ProductData>(INITIAL_PRODUCT_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('처리 중입니다...'); // ✅ 로딩 메시지 상태 추가
  
  const detailRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleGenerateAI = async () => {
    if (!data.productNameKr) {
      alert('상품명을 입력해주세요. AI가 상품명을 모르면 글을 못 씁니다!');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('AI가 문구를 작성 중입니다...'); // ✅ 메시지 설정
    try {
      const aiResult = await generateCopywriting(data);
      setData(prev => ({ ...prev, ...aiResult }));
    } catch (error) {
      console.error(error);
      alert('AI 문구 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportDetailPage = async () => {
    if (!detailRef.current) return;
    setIsLoading(true);
    setLoadingMessage('전체 이미지를 저장 중입니다...');
    try {
      const element = detailRef.current;
      await new Promise(resolve => setTimeout(resolve, 800)); // 이미지 로딩 대기

      // html-to-image 사용
      const dataUrl = await toJpeg(element, { quality: 0.9, backgroundColor: '#ffffff' });
      
      const link = document.createElement('a');
      link.download = `detail_page_${data.productNameKr || 'product'}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      // 에러 메시지 상세 출력
      alert(`이미지 저장 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportThumbnails = async () => {
    setIsLoading(true);
    setLoadingMessage('썸네일을 압축 저장 중입니다...');
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < THUMBNAIL_PRESETS.length; i++) {
        const ref = thumbnailRefs.current[i];
        if (ref) {
          const preset = THUMBNAIL_PRESETS[i];
          
          // html-to-image 사용
          const dataUrl = await toJpeg(ref, { quality: 1.0, backgroundColor: '#ffffff' });
          
          // dataURL에서 base64 데이터만 추출
          const imageData = dataUrl.split(',')[1];
          zip.file(`thumbnail_${preset.label}.jpg`, imageData, { base64: true });
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `thumbnails_${data.productNameKr || 'product'}.zip`);
      
    } catch (err) {
      console.error(err);
      alert(`썸네일 저장 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 개별 썸네일 다운로드 함수
  const downloadSingleThumbnail = async (index: number, label: string) => {
    const ref = thumbnailRefs.current[index];
    if (!ref) return;

    setIsLoading(true);
    setLoadingMessage(`썸네일(${label}) 저장 중...`);
    
    try {
      const dataUrl = await toJpeg(ref, { quality: 1.0, backgroundColor: '#ffffff' });
      
      const link = document.createElement('a');
      link.download = `thumbnail_${label}_${data.productNameKr || 'product'}.jpg`;
      link.href = dataUrl;
      link.click();
      
    } catch (error) {
       console.error(error);
       alert(`이미지 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ✅ 화면 전체 높이 고정 (overflow-hidden) -> 내부에서 스크롤 처리
    <div className="h-screen flex flex-col bg-gray-50 font-sans overflow-hidden">
      
      {/* 헤더 */}
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm flex-shrink-0 h-[70px]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-black text-lg">B</div>
          <h1 className="font-bold text-gray-800 text-lg">상세페이지 빌더 v3.0</h1>
        </div>
        <div className="flex gap-2">
           <button onClick={exportThumbnails} className="px-4 py-2 border border-gray-300 rounded text-sm font-bold hover:bg-gray-50">썸네일 저장</button>
           <button onClick={exportDetailPage} className="px-4 py-2 bg-black text-white rounded text-sm font-bold hover:bg-gray-800">전체 이미지 저장</button>
        </div>
      </nav>

      {/* 메인 영역 (flex-1로 남은 공간 다 차지) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* 에디터 (좌측) - 독립 스크롤 */}
        <aside className="w-full lg:w-[450px] border-r bg-white overflow-y-auto z-20 shadow-lg relative flex-shrink-0">
          <Editor 
            data={data} 
            onChange={setData} 
            onGenerateAI={handleGenerateAI} 
            isLoading={isLoading} 
          />
        </aside>

        {/* 프리뷰 (우측) - 독립 스크롤 (가로/세로 모두 가능) */}
        <section className="flex-1 bg-gray-100 overflow-auto relative p-8 flex justify-center">
           <div className="flex flex-col items-center gap-10 min-w-[800px] pb-20">
              {/* 상세페이지 프리뷰 */}
              <div className="shadow-2xl bg-white">
                 <Preview data={data} ref={detailRef} />
              </div>

              {/* 썸네일 프리뷰 */}
              <div className="bg-white p-6 rounded-xl shadow border w-full max-w-[800px]">
                 <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase text-center">Thumbnail Check</h3>
                 <div className="flex justify-center gap-4 flex-wrap">
                 <div className="flex justify-center gap-4 flex-wrap">
                    {THUMBNAIL_PRESETS.map((preset, i) => (
                       <div key={preset.label} className="flex flex-col items-center gap-2">
                          {/* 고정된 200px 너비 박스 안에 scale로 축소 표시 */}
                          <div style={{ width: 200, height: 200 * (preset.height / preset.width) }} className="border bg-gray-50 overflow-hidden relative shadow-sm rounded-lg">
                             <div className="origin-top-left" style={{ transform: `scale(${200/preset.width})` }}>
                                <ThumbnailPreview 
                                  data={data} 
                                  width={preset.width} 
                                  height={preset.height} 
                                  hidePackage={preset.hidePackage}
                                  ref={el => thumbnailRefs.current[i] = el} 
                                />
                             </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                             <span className="text-xs text-gray-500">{preset.label}</span>
                             <button
                               onClick={() => downloadSingleThumbnail(i, preset.label)}
                               className="px-3 py-1 bg-gray-800 text-white text-xs rounded hover:bg-black transition-colors"
                             >
                               다운로드
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
                 </div>
              </div>
           </div>
        </section>
      </main>

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center backdrop-blur-[2px]">
           <div className="bg-white px-8 py-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
               <p className="font-bold text-gray-800">{loadingMessage}</p> {/* ✅ 동적 메시지 표시 */}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;