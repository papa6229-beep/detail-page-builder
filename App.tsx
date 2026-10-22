import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { toJpeg } from "html-to-image";
import { ProductData, SectionSpacingKey } from "./types";
import { clampSectionSpacing } from "./sectionSpacing";
import { INITIAL_PRODUCT_DATA, THUMBNAIL_PRESETS } from "./constants";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Editor from "./components/Editor";
import Preview from "./components/Preview";
import ThumbnailPreview from "./components/ThumbnailPreview";
import { generateCopywriting } from "./services/geminiService";
import ImageProcessingDialog, { type ProcessingSession } from "./components/ImageProcessingDialog";
import { clearChangedImageEdits, getImageSlots, readImageSlot, writeImageSlot, type ImageSlot, type SavedImageEdit } from "./imageProcessing";
import TextReviewDialog from './components/TextReviewDialog';
import { applyTextSuggestions, type TextSuggestion } from './textReview';
import { analyseProductFraming, framingSource, exportProductNode, type FramingTarget, type ProductFraming } from './productFraming';
import { PreviewImageEditingContext } from './components/EditablePreviewImage';
import { normalizeImageTransform, isGifImage, type PreviewImageTransform } from './previewImageTransforms';
import { BuilderDocumentStore } from './documentStore';
import { useProjectWorkspace } from './useProjectWorkspace';
import ProjectManagerDialog from './components/ProjectManagerDialog';
import BuilderHome from './components/BuilderHome';
import { version } from './package.json';

const App: React.FC = () => {
  const storeRef = useRef<BuilderDocumentStore | null>(null);
  if (!storeRef.current) storeRef.current = new BuilderDocumentStore(structuredClone(INITIAL_PRODUCT_DATA));
  const store = storeRef.current;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const data = snapshot.data, setData = store.setData;
  const workspace = useProjectWorkspace(store, snapshot);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(() => { try { return sessionStorage.getItem('builder_editor_open') === '1'; } catch { return false; } });
  const startEditor = () => { try { sessionStorage.setItem('builder_editor_open', '1'); } catch {} setEditorOpen(true); };
  const showHome = async () => { try { await workspace.saveNow(); } catch {} try { sessionStorage.removeItem('builder_editor_open'); } catch {} setEditorOpen(false); };
  const latestData = useRef(data); latestData.current = data;
  const [fitting, setFitting] = useState<FramingTarget | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageKey, setSelectedImageKey] = useState<string | null>(null);
  const handlePreviewTransform = (key: string, value?: PreviewImageTransform) => store.edit(previous => {
    const previewImageTransforms = { ...previous.previewImageTransforms };
    if (value) previewImageTransforms[key] = normalizeImageTransform(value); else delete previewImageTransforms[key];
    return { ...previous, previewImageTransforms };
  });
  const handleFitImage = async (target: FramingTarget) => {
    const projectId = snapshot.project.id;
    const source = framingSource(data, target);
    if (!source || fitting) return;
    setFitting(target);
    try {
      const frame = await analyseProductFraming(source);
      if (store.getSnapshot().project.id !== projectId || framingSource(latestData.current, target) !== source) { setImageMessage('작업이나 사진이 변경되었습니다. 제품 크기 맞춤을 다시 눌러주세요.'); return; }
      store.edit(previous => {
        if (framingSource(previous, target) !== source) return previous;
        const previewImageTransforms = { ...previous.previewImageTransforms }; delete previewImageTransforms[target === 'main' ? 'mainImage' : 'thumbnailImage'];
        return { ...previous, productFraming: { ...previous.productFraming, [target]: frame }, previewImageTransforms };
      });
      setImageMessage(`${target === 'main' ? '메인 사진' : '썸네일'}의 제품 크기와 중심을 맞췄습니다. 제품을 직접 끌어 조절할 수 있습니다.`);
      requestAnimationFrame(() => document.getElementById(target === 'main' ? 'preview-main' : 'preview-thumbnails')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    } catch (error) { setImageMessage(String(error?.message || error)); }
    finally { setFitting(null); }
  };
  const handleProductFraming = (target: FramingTarget, frame?: ProductFraming) => store.edit(previous => {
    const productFraming = { ...previous.productFraming };
    const previewImageTransforms = { ...previous.previewImageTransforms }; delete previewImageTransforms[target === 'main' ? 'mainImage' : 'thumbnailImage'];
    if (frame) productFraming[target] = frame; else delete productFraming[target];
    return { ...previous, productFraming, previewImageTransforms };
  });
  const [imageSession, setImageSession] = useState<ProcessingSession | null>(null);
  const [imageMessage, setImageMessage] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewKey, setReviewKey] = useState('');
  const commitTextReview = (selected: TextSuggestion[]) => {
    const result = applyTextSuggestions(data, selected);
    setData(result.data); setReviewOpen(false);
    setImageMessage(`선택한 수정 ${result.applied}개를 적용했습니다.${result.skipped ? ` 원문이 달라진 ${result.skipped}개는 적용하지 않았습니다.` : ''}`);
  };
  const cutoutCache = useRef(new Map<string, { original: string; cutout: Blob }>());
  const changeData: React.Dispatch<React.SetStateAction<ProductData>> = value => setData(previous => {
    const next = typeof value === 'function' ? value(previous) : value;
    return clearChangedImageEdits(previous, next);
  });
  const openImageProcessing = (key?: string) => {
    const slots = getImageSlots(data).filter(slot => !key || slot.key === key);
    if (!slots.length) { setImageMessage('보정할 상품 사진을 먼저 넣어주세요. GIF·로고는 원본을 유지합니다.'); return; }
    setImageMessage(''); setImageSession({ slots, edits: { ...data.imageEdits } });
  };
  const commitImage = (slot: ImageSlot, image: string, edit?: SavedImageEdit) => {
    setData(previous => store.getSnapshot().project.id === snapshot.project.id && readImageSlot(previous, slot.key) === slot.image ? writeImageSlot(previous, slot.key, image, edit) : previous);
    setImageMessage(`${slot.label}에 ${edit ? '보정한 이미지' : '원본'}를 적용했습니다.`);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("처리 중입니다..."); // ✅ 로딩 메시지 상태 추가

  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => { cutoutCache.current.clear(); setSelectedImage(null); setSelectedImageKey(null); setImageSession(null); setReviewOpen(false); }, [snapshot.project.id]);
  useEffect(() => { if (workspace.notice) setImageMessage(workspace.notice); }, [workspace.notice]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.altKey || isLoading || workspace.busy || !editorOpen || document.querySelector('dialog[open]')) return;
      if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'z') { event.preventDefault(); if (event.shiftKey) store.redo(); else store.undo(); }
      else if (key === 'y') { event.preventDefault(); store.redo(); }
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, [store, isLoading, workspace.busy, editorOpen]);
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleGenerateAI = async () => {
    if (!data.productNameKr) {
      alert("상품명을 입력해주세요. AI가 상품명을 모르면 글을 못 씁니다!");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("AI가 문구를 작성 중입니다..."); // ✅ 메시지 설정
    try {
      const aiResult = await generateCopywriting(data);
      setData((prev) => ({ ...prev, ...aiResult }));
    } catch (error) {
      console.error(error);
      alert("AI 문구 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const cropImage = (
    image: HTMLImageElement,
    y: number,
    height: number,
    width: number,
  ): string => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // 원본 이미지에서 해당 영역만 잘라서 그리기
    // drawImage(image, sy, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(image, 0, y, width, height, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 1.0); // 최고 품질 1.0
  };

  const exportDetailPage = async () => {
    if (!detailRef.current) return;
    setIsLoading(true);
    setLoadingMessage("이미지 구조를 분석하고 저장 중입니다...");

    try {
      const element = detailRef.current;
      await new Promise((resolve) => setTimeout(resolve, 800)); // 이미지 로딩 대기

      // 1. 전체 이미지를 고화질로 캡처
      // ✅ pixelRatio: 1로 설정하여 800px 너비 유지 (기존 2 -> 1)
      const pixelRatio = 1;
      const dataUrl = await toJpeg(element, {
        quality: 1.0, // 최고 품질
        backgroundColor: "#ffffff",
        pixelRatio: pixelRatio,
        filter: exportProductNode,
      });

      const videoSection = element.querySelector(
        "#video-insert-section",
      ) as HTMLElement;
      const hasVideoData =
        data.videoInsertImage &&
        typeof data.videoInsertImage === "string" &&
        data.videoInsertImage.length > 0;

      // 2. 동영상 섹션이 없거나(데이터 없음 or DOM 없음) 체크
      // 데이터가 있어도 DOM이 없으면(예: 렌더링 타이밍 이슈) 일반 저장으로 처리하여 에러 방지
      if (!hasVideoData || !videoSection) {
        const link = document.createElement("a");
        link.download = `detail_page_${data.productNameKr || "product"}.jpg`;
        link.href = dataUrl;
        document.body.appendChild(link); // Firefox 등 호환성 위해 body에 추가
        link.click();
        document.body.removeChild(link);
      } else {
        try {
          // 3. 동영상 섹션이 있으면 3분할 저장 (ZIP)
          setLoadingMessage(
            "이미지를 3분할(상단/중단/하단)하여 저장 중입니다...",
          );

          // 위치 계산 (컨테이너 기준 상대 위치)
          const containerRect = element.getBoundingClientRect();

          // 섹션 내부의 실제 이미지 요소(img)를 찾아서 기준점으로 삼음
          const videoImgElement = videoSection.querySelector("img");

          if (!videoImgElement) {
            throw new Error("동영상 이미지를 찾을 수 없습니다.");
          }

          const animatedVideo = isGifImage(data.videoInsertImage);
          const videoImgRect = (animatedVideo ? videoImgElement : videoSection).getBoundingClientRect();

          // 좌표 및 크기 (pixelRatio 1이므로 그대로 사용)
          const videoTop = videoImgRect.top - containerRect.top;
          const videoHeight = videoImgRect.height;
          const totalHeight = containerRect.height;
          const width = containerRect.width;

          // 이미지 객체 생성 (전체 스크린샷 캔버스용)
          const img = new Image();

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("스크린샷 이미지 로드 실패"));
            img.src = dataUrl;
          });

          // 분할 작업
          const zip = new JSZip();

          // Part 1: 상단 (main1.jpg)
          const safeVideoTop = Math.max(0, videoTop);
          if (safeVideoTop > 0) {
            const part1Url = cropImage(img, 0, safeVideoTop, width);
            zip.file("main1.jpg", part1Url.split(",")[1], { base64: true });
          }

          // Part 2: 동영상 부분 (main2.gif)
          if (!data.videoInsertImage!.includes("base64,")) {
            throw new Error("동영상 이미지 데이터 형식이 잘못되었습니다.");
          }
          if (animatedVideo) {
            const originalGifData = data.videoInsertImage!.split(",")[1];
            zip.file("main2.gif", originalGifData, { base64: true });
          } else {
            zip.file("main2.jpg", cropImage(img, safeVideoTop, videoHeight, width).split(',')[1], { base64: true });
          }

          // Part 3: 하단 (main3.jpg)
          const part3Start = safeVideoTop + videoHeight;
          const part3Height = totalHeight - part3Start;

          if (part3Height > 0) {
            const part3Url = cropImage(img, part3Start, part3Height, width);
            zip.file("main3.jpg", part3Url.split(",")[1], { base64: true });
          }

          const content = await zip.generateAsync({ type: "blob" });
          saveAs(
            content,
            `detail_split_${data.productNameKr || "product"}.zip`,
          );
        } catch (splitError) {
          console.warn(
            "분할 저장 중 오류 발생, 전체 이미지 저장으로 전환합니다:",
            splitError,
          );
          // 분할 저장 실패 시 백업: 전체 이미지 저장
          const link = document.createElement("a");
          link.download = `detail_page_${data.productNameKr || "product"}.jpg`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (err) {
      console.error("Export failed", err);
      alert(
        `이미지 저장 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const exportThumbnails = async () => {
    setIsLoading(true);
    setLoadingMessage("썸네일을 압축 저장 중입니다...");
    try {
      const zip = new JSZip();

      for (let i = 0; i < THUMBNAIL_PRESETS.length; i++) {
        const ref = thumbnailRefs.current[i];
        if (ref) {
          const preset = THUMBNAIL_PRESETS[i];

          // html-to-image 사용
          const dataUrl = await toJpeg(ref, {
            filter: exportProductNode,
            quality: 1.0, // 최고 품질
            backgroundColor: "#ffffff",
            pixelRatio: 1,
          });

          // dataURL에서 base64 데이터만 추출
          const imageData = dataUrl.split(",")[1];
          zip.file(`thumbnail_${preset.label}.jpg`, imageData, {
            base64: true,
          });
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `thumbnails_${data.productNameKr || "product"}.zip`);
    } catch (err) {
      console.error(err);
      alert(
        `썸네일 저장 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
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
      const dataUrl = await toJpeg(ref, {
        filter: exportProductNode,
        quality: 1.0, // 최고 품질
        backgroundColor: "#ffffff",
        pixelRatio: 1,
      });

      const link = document.createElement("a");
      link.download = `thumbnail_${label}_${data.productNameKr || "product"}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error(error);
      alert(
        `이미지 저장 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 옵션 레이아웃 변경 핸들러
  const handleOptionLayoutChange = (
    id: string,
    layout: { x: number; y: number; width: number; height: number },
  ) => {
    setData((prev) => ({
      ...prev,
      options: prev.options.map((opt) =>
        opt.id === id ? { ...opt, ...layout } : opt,
      ),
    }));
  };

  // ✅ 패키지 이미지 레이아웃 변경 핸들러
  const handleSectionSpacingChange = (key: SectionSpacingKey, value: number) => {
    setData((prev) => ({
      ...prev,
      sectionSpacing: { ...prev.sectionSpacing, [key]: clampSectionSpacing(value) },
    }));
  };

  const handlePackageLayoutChange = (layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    setData((prev) => ({
      ...prev,
      packageLayout: layout,
    }));
  };

  // ✅ 썸네일 패키지 이미지 레이아웃 변경 핸들러 (500px 기준)
  const handleThumbnailPackageLayoutChange = (layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    setData((prev) => ({
      ...prev,
      thumbnailPackageLayout: layout,
    }));
  };

  // ✅ 워터마크 레이아웃 변경 핸들러
  const handleWatermarkLayoutChange = (
    id: string,
    layout: { x: number; y: number; width: number; height: number },
  ) => {
    setData((prev) => ({
      ...prev,
      watermarkSettings: {
        ...prev.watermarkSettings,
        [id]: { ...prev.watermarkSettings?.[id], ...layout, show: true },
      },
    }));
  };

  // ✅ 모든 워터마크 일괄 적용/해제 토글
  const toggleAllWatermarks = () => {
    if (!data.watermarkImage) {
      alert("먼저 워터마크 이미지를 등록해주세요 (메인 이미지 섹션)");
      return;
    }

    const targetKeys = [
      "mainImage",
      "featureImage",
      "point1Image1",
      "point1Image2",
      "point1Image3",
      "point2Image1",
      "point2Image2",
      "point2Image3",
      "sizeImage",
      "thumbnailImage",
      "packageImage",
    ];

    // 현재 하나라도 켜져 있으면 -> 전체 끄기, 다 꺼져 있으면 -> 전체 켜기
    const isAnyOn = targetKeys.some(
      (key) => data.watermarkSettings?.[key]?.show,
    );
    const nextState = !isAnyOn;

    const newSettings = { ...data.watermarkSettings };
    targetKeys.forEach((key) => {
      // 이미지가 있는 경우에만 적용
      if ((data as any)[key]) {
        newSettings[key] = {
          x: 0,
          y: 0,
          width: 100,
          height: 100, // 초기값 (Preview에서 자동 조정됨)
          ...(newSettings[key] || {}),
          show: nextState,
        };
      }
    });

    setData((prev) => ({ ...prev, watermarkSettings: newSettings }));
  };

  // ✅ 임시 저장 함수
  const saveTemporary = async () => {
    try {
      await workspace.saveNow();
      try { localStorage.setItem('builder_temp_save', JSON.stringify(store.getSnapshot().data)); } catch {}
      setImageMessage('현재 작업을 저장했습니다. 작업 보관함에서 이어서 열 수 있습니다.');
    } catch (error) {
      setImageMessage(String(error?.message || '저장하지 못했습니다. 작업 파일을 내려받아 보관해주세요.'));
    }
  };

  // ✅ 불러오기 함수
  const loadTemporary = () => {
    setProjectManagerOpen(true);
  };

  return (
    // ✅ 화면 전체 높이 고정 (overflow-hidden) -> 내부에서 스크롤 처리
    <div className="builder-app h-screen flex flex-col bg-[#020617] font-sans overflow-hidden text-slate-200">
      {/* 헤더 */}
      {editorOpen && workspace.hasActiveProject ? <>
      <nav className="builder-toolbar" aria-label="빌더 도구">
        <div className="builder-brand">
          <div className="builder-brand-mark" aria-hidden="true">
            B
          </div>
          <div>
            <h1 className="builder-brand-title">Detail Page Builder <span>v{version}</span></h1>
            <p className="builder-brand-caption"><span title={workspace.title}>{workspace.title}</span> · <span role="status" aria-label="자동 저장 상태">{workspace.status}</span></p>
          </div>
        </div>
        <div className="builder-actions">
          <button onClick={() => void showHome()} className="builder-button" disabled={isLoading || workspace.busy}>작업 홈</button>
          <button onClick={() => setReviewOpen(true)} className="builder-button" disabled={isLoading}>전체 텍스트 오타 검수</button>
          <button onClick={() => openImageProcessing()} className="builder-button" disabled={isLoading}>전체 이미지 보정</button>
          <button
            onClick={toggleAllWatermarks}
            className="builder-button builder-button-watermark"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            모든 워터마크{" "}
            {data.watermarkSettings &&
            Object.values(data.watermarkSettings).some((s: any) => s.show)
              ? "끄기"
              : "켜기"}
          </button>
          <div className="builder-toolbar-divider" aria-hidden="true"></div>
          <button
            onClick={saveTemporary}
            className="builder-button"
          >
            임시 저장
          </button>
          <button
            onClick={loadTemporary}
            className="builder-button"
          >
            불러오기
          </button>
          <div className="builder-toolbar-divider" aria-hidden="true"></div>
          <button
            onClick={exportThumbnails}
            className="builder-button"
          >
            썸네일 저장
          </button>
          <button
            onClick={exportDetailPage}
            className="builder-button builder-button-primary"
          >
            전체 이미지 저장
          </button>
        </div>
      </nav>

      {/* 메인 영역 (flex-1로 남은 공간 다 차지) */}
      <main className="builder-main flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 에디터 (좌측) - 독립 스크롤 */}
        <aside className="builder-editor w-full lg:w-[450px] overflow-y-auto relative flex-shrink-0" aria-label="상세페이지 입력 패널">
          <Editor
            data={data}
            onChange={changeData}
            onEditImage={openImageProcessing}
            onFitImage={handleFitImage}
            onResetFraming={target => handleProductFraming(target)}
            fitting={fitting}
            onGenerateAI={handleGenerateAI}
            isLoading={isLoading}
          />
        </aside>

        {/* 프리뷰 (우측) - 독립 스크롤 (가로/세로 모두 가능) */}
        <section className="builder-workspace flex-1 overflow-auto relative p-8 flex justify-center" aria-label="실시간 미리보기" onPointerDownCapture={event => { if (!(event.target as Element).closest('.builder-picture-ui')) setSelectedImage(null); }}>
          <PreviewImageEditingContext.Provider value={{ selected: selectedImage, select: (id, key) => { setSelectedImage(id); if (key) setSelectedImageKey(key); }, transforms: data.previewImageTransforms ?? {}, change: handlePreviewTransform, beginImageEdit: store.beginImageEdit, endImageEdit: store.endImageEdit, revision: data }}>
          <div className="flex flex-col items-center gap-10 min-w-[800px] pb-20">
            <div className="builder-preview-heading">
              <div><span className="builder-live-dot" aria-hidden="true"></span>실시간 미리보기</div>
              {!selectedImageKey && <span className="builder-canvas-size">사진 클릭 · 드래그/모서리/↻ 조절</span>}
              <div className="builder-history-controls"><button type="button" className="builder-button builder-button-small" aria-label="되돌리기" title="이미지 배치 되돌리기 · Ctrl+Z" disabled={!snapshot.canUndo || snapshot.imageGesture} onClick={store.undo}>↶ 되돌리기</button><button type="button" className="builder-button builder-button-small" aria-label="다시 실행" title="이미지 배치 다시 실행 · Ctrl+Shift+Z" disabled={!snapshot.canRedo || snapshot.imageGesture} onClick={store.redo}>↷ 다시 실행</button></div>
              {selectedImageKey && <button type="button" className="builder-button builder-button-small" onClick={() => handlePreviewTransform(selectedImageKey)}>선택 이미지 초기화</button>}
            </div>
            {/* 상세페이지 프리뷰 */}
            <div className="shadow-[var(--shadow-2xl)] bg-white transition-all duration-200 ease-out">
              <Preview
                data={data}
                ref={detailRef}
                onOptionLayoutChange={handleOptionLayoutChange}
                onPackageLayoutChange={handlePackageLayoutChange}
                onWatermarkLayoutChange={handleWatermarkLayoutChange}
                onSectionSpacingChange={handleSectionSpacingChange}
                onProductFramingChange={frame => handleProductFraming('main', frame)}
              />
            </div>

            {/* 썸네일 프리뷰 */}
            <div id="preview-thumbnails" className="builder-thumbnails p-6 w-full max-w-[800px]">
              <h3 className="builder-thumbnails-heading">
                썸네일 미리보기
              </h3>
              <div className="flex justify-center gap-4 flex-wrap">
                <div className="flex justify-center gap-4 flex-wrap">
                  {THUMBNAIL_PRESETS.map((preset, i) => (
                    <div
                      key={preset.label}
                      className="flex flex-col items-center gap-2"
                    >
                      {/* 고정된 200px 너비 박스 안에 scale로 축소 표시 */}
                      <div
                        style={{
                          width: 200,
                          height: 200 * (preset.height / preset.width),
                        }}
                        className="border bg-gray-50 overflow-hidden relative shadow-sm rounded-lg"
                      >
                        <div
                          className="origin-top-left"
                          style={{ transform: `scale(${200 / preset.width})` }}
                        >
                          <ThumbnailPreview
                            data={data}
                            width={preset.width}
                            height={preset.height}
                            hidePackage={preset.hidePackage}
                            externalScale={200 / preset.width}
                            onLayoutChange={handleThumbnailPackageLayoutChange}
                            onProductFramingChange={frame => handleProductFraming('thumbnail', frame)}
                            ref={(el) => (thumbnailRefs.current[i] = el)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="builder-thumbnail-size">
                          {preset.label}
                        </span>
                        <button
                          onClick={() =>
                            downloadSingleThumbnail(i, preset.label)
                          }
                          className="builder-button builder-button-small"
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
          </PreviewImageEditingContext.Provider>
        </section>
      </main>
      </> : <BuilderHome workspace={workspace} onStart={startEditor} onLibrary={() => setProjectManagerOpen(true)}/>}
      {workspace.error && <div className="builder-storage-error" role="alert">{workspace.error}<button type="button" className="builder-button" onClick={() => setProjectManagerOpen(true)}>작업 파일 보관하기</button></div>}
      {imageMessage && <div className="builder-image-message" role="status">{imageMessage}<button type="button" aria-label="안내 닫기" onClick={() => setImageMessage('')}>×</button></div>}
      {imageSession && <ImageProcessingDialog session={imageSession} cache={cutoutCache.current} onCommit={commitImage} onClose={() => setImageSession(null)}/>}
      {reviewOpen && <TextReviewDialog data={data} apiKey={reviewKey} onKeyChange={setReviewKey} onApply={commitTextReview} onClose={() => setReviewOpen(false)}/>}
      {projectManagerOpen && <ProjectManagerDialog store={store} workspace={workspace} onClose={() => setProjectManagerOpen(false)} onSelect={startEditor}/>}
      {(!workspace.ready || workspace.busy) && <div className="builder-workspace-loading" role="status">{workspace.busy ? '상품 작업을 여는 중…' : '저장한 작업을 확인하는 중…'}</div>}

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm transition-all duration-300">
          <div className="builder-loading px-8 py-6 rounded-2xl flex flex-col items-center gap-4">
            <div className="builder-spinner w-10 h-10 border-4 rounded-full animate-spin"></div>
            <p className="font-bold text-lg tracking-wide">{loadingMessage}</p>{" "}
            {/* ✅ 동적 메시지 표시 */}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
