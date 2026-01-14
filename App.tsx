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

  // ▼▼▼ 상세페이지 JPG (800px 정사이즈 + 품질 1.0) 저장 기능 ▼▼▼
  const exportDetailPage = async () => {
    if (!detailRef.current) return;
    
    setIsLoading(true);
    try {
      const element = detailRef.current;
      
      // 이미지가 완전히 렌더링될 수 있도록 대기
      await new Promise(resolve => setTimeout(resolve, 800)); 

      const fullHeight = element.scrollHeight; 

      const canvas = await html2canvas(element, {
        scale: 1,             // ⭐ 가로 800px 정사이즈 유지를 위해 1배수 설정
        useCORS: true,        
        allowTaint: false,    // 데이터 유실 방지
        width: 800,           
        height: fullHeight,   
        windowWidth: 800,     
        windowHeight: fullHeight,
        x: 0,
        y: 0,
        scrollY: 0,
        backgroundColor: '#ffffff' 
      });

      // ⭐ 품질을 1.0(최상)으로 설정하여 1배수에서도 선명도 유지
      const image = canvas.toDataURL('image/jpeg', 1.0); 
      
      const link = document.createElement('a');
      link.download = `detail_page_${data.productNameKr || 'standard'}_800px.jpg`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      alert('상세페이지 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ▼▼▼ 썸네일 JPG 저장 기능 ▼▼▼
  const exportThumbnails = async () => {
    setIsLoading(true);
    try {
      for (let i = 0; i < THUMBNAIL_SIZES.length; i++) {
        const ref = thumbnailRefs.current[i];
        if (ref) {
          const size = THUMBNAIL_SIZES[i];
          
          const canvas = await html2canvas(ref, {
            scale: 1,         // 썸네일 정사이즈
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            width: size,
            height: size,
            windowWidth: size,
            windowHeight: size
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
      console.error('Thumbnail export failed', err);
      alert('썸네일 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 font-sans">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center">
             <span className="text-white font-black text-xl">B</span>
          </div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">상세페이지 빌더 <span className="text-gray-400 font-medium text-sm ml-2">v3.0</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportThumbnails}
            disabled={isLoading}
            className="px-4 py-2 border-2 border-rose-100 text-rose-600 rounded-lg font-bold hover:bg-rose-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Export Thumbnail (JPG)
          </button>
          <button 
            onClick={exportDetailPage}
            disabled={isLoading}
            className="px-6 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:bg-gray-400"
          >
            {isLoading ? (
               <span>처리중...</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Export JPG (800px)
              </>
            )}
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[500px] border-r h-full p-4 overflow-hidden shrink-0 bg-white z-10">
          <Editor 
            data={data} 
            onChange={setData} 
            onGenerateAI={handleGenerateAI} 
            isLoading={isLoading} 
          />
        </aside>

        <section className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden relative">
           <div className="flex-1 overflow-y-auto flex flex-col items-center p-8">
              <div className="w-full flex flex-col items-center">
                 <Preview data={data} ref={detailRef} />
              </div>
              
              <div className="mt-20 p-10 bg-white shadow-lg rounded-2xl border border-gray-200">
                  <h3 className="text-lg font-bold mb-6 text-gray-700 text-center uppercase tracking-widest">Thumbnail Variants</h3>
                  <div className="flex items-end gap-10 flex-wrap justify-center">
                      {THUMBNAIL_SIZES.map((size, index) => (
                          <div key={size} className="flex flex-col items-center gap-3">
                              <span className="text-xs font-bold text-gray-400">{size}x{size} px</span>
                              <ThumbnailPreview 
                                  data={data} 
                                  size={size} 
                                  ref={(el) => { thumbnailRefs.current[index] = el; }} 
                              />
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