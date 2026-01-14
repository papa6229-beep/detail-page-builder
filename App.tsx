
import React, { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
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
    try {
      const dataUrl = await toPng(detailRef.current, { 
        pixelRatio: 2,
        quality: 1,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `detail_page_${data.productNameKr || 'standard'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      alert('상세페이지 저장 중 오류가 발생했습니다.');
    }
  };

  const exportThumbnails = async () => {
    try {
      for (let i = 0; i < THUMBNAIL_SIZES.length; i++) {
        const ref = thumbnailRefs.current[i];
        if (ref) {
          const size = THUMBNAIL_SIZES[i];
          const dataUrl = await toPng(ref, { 
            pixelRatio: 2,
            width: size,
            height: size,
            backgroundColor: '#ffffff'
          });
          const link = document.createElement('a');
          link.download = `thumbnail_${size}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch (err) {
      console.error('Thumbnail export failed', err);
      alert('썸네일 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">상세페이지 빌더 <span className="text-gray-400 font-medium text-sm ml-2">v1.0 (PRO)</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportThumbnails}
            className="px-4 py-2 border-2 border-rose-100 text-rose-600 rounded-lg font-bold hover:bg-rose-50 transition-all flex items-center gap-2"
          >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Export Thumbnail
          </button>
          <button 
            onClick={exportDetailPage}
            className="px-6 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 shadow-md active:scale-95 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Export PNG (800px)
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Input Editor */}
        <aside className="w-1/3 min-w-[400px] border-r h-full p-4 overflow-hidden">
          <Editor 
            data={data} 
            onChange={setData} 
            onGenerateAI={handleGenerateAI} 
            isLoading={isLoading} 
          />
        </aside>

        {/* Right: Preview Areas */}
        <section className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden relative">
          <div className="flex items-center gap-4 p-4 border-b bg-white">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Preview Mode</span>
            <div className="flex gap-2">
                <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-600">DETAIL VIEW</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-600">THUMBNAILS</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto flex flex-col items-center">
             <div className="p-8 w-full flex flex-col items-center">
                <Preview data={data} ref={detailRef} />
                
                {/* Hidden/Helper Thumbnails for Export */}
                <div className="mt-20 p-10 bg-white shadow-lg rounded-2xl">
                    <h3 className="text-lg font-bold mb-6 text-gray-700 text-center uppercase tracking-widest">Thumbnail Variants</h3>
                    <div className="flex items-end gap-10">
                        {THUMBNAIL_SIZES.map((size, index) => (
                            <div key={size} className="flex flex-col items-center gap-3">
                                <span className="text-xs font-bold text-gray-400">{size}x{size} px</span>
                                {/* Fix TypeScript error in Ref callback by ensuring it returns void instead of the result of the assignment */}
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
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
