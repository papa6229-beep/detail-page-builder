import React from 'react';
import { Rnd } from 'react-rnd';
import type { ProductData } from '../types';
import EditablePreviewImage, { PreviewImageEditingContext } from './EditablePreviewImage';

// ✅ 워터마크 렌더러
const RenderWatermark = ({ data, onWatermarkLayoutChange, targetKey, containerWidth, containerHeight, isFixed = false }: { data: ProductData; onWatermarkLayoutChange: (id: string, layout: { x: number; y: number; width: number; height: number }) => void; targetKey: string, containerWidth?: number, containerHeight?: number, isFixed?: boolean }) => {
  const editing = React.useContext(PreviewImageEditingContext);
  const names: Record<string, string> = { mainImage: '메인', packageImage: '패키지', featureImage: '특징', point1Image1: '포인트 1-1', point1Image2: '포인트 1-2', point1Image3: '포인트 1-3', point2Image1: '포인트 2-1', point2Image2: '포인트 2-2', point2Image3: '포인트 2-3', sizeImage: '사이즈' };
  const label = `${names[targetKey] ?? '이미지'} 워터마크`;
  const settings = data.watermarkSettings?.[targetKey];
  if (!data.watermarkImage || !settings?.show) return null;

  if (isFixed) {
      return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
               <EditablePreviewImage editKey={`watermark:${targetKey}`} label={label}
                  src={data.watermarkImage}
                  className="object-contain" // 크기는 일단 원본 비율 유지하거나 적절히 제한
                  style={{ width: settings?.width ? `${settings.width}px` : '150px', height: settings?.height ? `${settings.height}px` : 'auto', opacity: 0.9 }}
                  alt="watermark"
               />
          </div>
      );
  }

  // 초기 위치/크기 설정 (중앙 정렬)
  const defaultWidth = 100;
  const defaultHeight = 100; // 비율에 따라 자동 조절됨
  const x = settings.x ?? (containerWidth ? (containerWidth - defaultWidth) / 2 : 0);
  const y = settings.y ?? (containerHeight ? (containerHeight - defaultHeight) / 2 : 0);

  if (editing) return <div style={{ position: 'absolute', left: x, top: y, width: settings.width || defaultWidth, height: settings.height || defaultHeight, zIndex: 50, pointerEvents: 'none' }}>
    <EditablePreviewImage editKey={`watermark:${targetKey}`} label={label} src={data.watermarkImage} className="w-full h-full object-contain pointer-events-none select-none" alt="watermark"/>
  </div>;

  return (
      <Rnd
        disableDragging={Boolean(editing)} enableResizing={editing ? false : undefined}
          size={{ width: settings.width || defaultWidth, height: settings.height || defaultHeight }}
          position={{ x: x, y: y }}
          onDragStop={(e, d) => {
              onWatermarkLayoutChange(targetKey, {
                  x: d.x,
                  y: d.y,
                  width: settings.width || defaultWidth,
                  height: settings.height || defaultHeight
              });
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
              onWatermarkLayoutChange(targetKey, {
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                  ...position
              });
          }}
          bounds="parent"
          className="z-50 group" // 최상위 레이어
      >
          <div className="w-full h-full relative cursor-move">
               <EditablePreviewImage editKey={`watermark:${targetKey}`} label={label}
                  src={data.watermarkImage}
                  className="w-full h-full object-contain pointer-events-none select-none"
                  alt="watermark"
               />
               {/* 호버 시 테두리 표시 */}
               {!editing && <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-400 rounded transition-colors"></div>}
               {/* 리사이즈 핸들 */}
               {!editing && <div className="absolute bottom-[-4px] right-[-4px] w-3 h-3 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 cursor-nwse-resize"></div>}
          </div>
      </Rnd>
  );
};

export default RenderWatermark;
