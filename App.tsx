import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas'; 
import { ProductData } from './types';
import { INITIAL_PRODUCT_DATA, THUMBNAIL_SIZES } from './constants';
import Editor from './components/Editor';
import Preview from './components/Preview';
import ThumbnailPreview from './components/ThumbnailPreview';
import { generateCopywriting } from './services/geminiService';

const App: React.FC = () => {
  const [data, setData] = useState<ProductData>(INITIAL_PRODUCT_DATA);
  const [isLoading, setIsLoading] = useState(false);
  
  const detailRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleGenerateAI = async () => {
    if (!data.productNameKr) {
      alert('상품명을 먼저 입력해주세요.');
      return;
    }
    setIsLoading(true);
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
    try {
      const element = detailRef.current;
      await new Promise(resolve => setTimeout(resolve, 800)); 
      const fullHeight = element.scrollHeight; 
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        width: 800,
        height: fullHeight,
        windowWidth: 800,
        windowHeight: fullHeight,
        x: 0, y: 0, scrollY: 0,
        backgroundColor: '#ffffff' 
      });
      const image = canvas.toDataURL('image/jpeg', 1.0); 
      const link = document.createElement('a');
      link.download = `detail_page_${data.productNameKr || 'standard'}.jpg`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportThumbnails = async () => {
    setIsLoading(true);
    try {
      for (let i = 0; i < THUMBNAIL_SIZES.length; i++) {
        const ref = thumbnailRefs.current[i];
        if (ref) {
          const size = THUMBNAIL_SIZES[i];
          const canvas = await html2canvas(ref, {
            scale: 1, useCORS: true, backgroundColor: '#ffffff',
            width: size, height: size, windowWidth: size, windowHeight: size
          });
          const image = canvas.toDataURL('image/jpeg', 1.0);
          const link = document.createElement('a');
          link.download = `thumbnail_${size}.jpg`;
          link.href = image;
          link.click();
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (err) {
      alert('썸네일 저장 중 오류 발생');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 font-sans overflow-x-hidden">
      {/* 📱 반응형 네비게이션 */}
      <nav className="bg-white border-b px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-sm z-30 sticky top-0 gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-8 h-8 bg-rose-600 rounded flex items-center justify-center shrink-0">
             <span className="text-white font-black text-lg">B</span>
          </div>
          <h1 className="text-base font-black text-gray-800 truncate">상세페이지 빌더 v3.0</h1>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={exportThumbnails} className="flex-1 md:flex-none px-3 py-2 border border-rose-200 text-rose-600 rounded-lg font-bold text-xs whitespace-nowrap">
            Thumbnail
          </button>
          <button onClick={exportDetailPage} className="flex-1 md:flex-none px-3 py-2 bg-rose-600 text-white rounded-lg font-bold text-xs shadow-md whitespace-nowrap">
            Export JPG
          </button>
        </div>
      </nav>

      {/* 📱 메인 레이아웃: 모바일(Column) / 데스크톱(Row) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 에디터 영역: 모바일에서는 상단에 위치하고 높이를 제한하여 프리뷰를 볼 수 있게 함 */}
        <aside className="w-full lg:w-[400px] xl:w-[480px] border-b lg:border-r h-[50vh] lg:h-full overflow-y-auto bg-white z-20 shrink-0">
          <Editor 
            data={data} 
            onChange={setData} 
            onGenerateAI={handleGenerateAI} 
            isLoading={isLoading} 
          />
        </aside>

        {/* 프리뷰 영역: 남은 공간을 차지 */}
        <section className="flex-1 bg-gray-200 overflow-y-auto relative p-4 md:p-8">
           <div className="flex flex-col items-center min-w-min">
              {/* 실제 800px 결과물을 모바일 화면 크기에 맞게 축소해서 보여주는 컨테이너 */}
              <div className="max-w-full overflow-x-auto lg:overflow-visible shadow-2xl rounded-lg overflow-hidden origin-top scale-[0.5] sm:scale-[0.7] md:scale-100">
                 <Preview data={data} ref={detailRef} />
              </div>
              
              {/* 썸네일 영역 */}
              <div className="mt-12 p-6 bg-white shadow-lg rounded-2xl border border-gray-200 w-full max-w-[800px]">
                  <h3 className="text-sm font-bold mb-6 text-gray-400 text-center uppercase tracking-widest">Thumbnail Variants</h3>
                  <div className="flex items-center gap-6 flex-wrap justify-center">
                      {THUMBNAIL_SIZES.map((size, index) => (
                          <div key={size} className="flex flex-col items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400">{size}px</span>
                              <div className="scale-75 origin-top">
                                <ThumbnailPreview data={data} size={size} ref={(el) => { thumbnailRefs.current[index] = el; }} />
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
           </div>
        </section>
      </main>
    </div>
  );
};

export default App;