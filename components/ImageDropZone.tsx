import React, { useEffect, useRef, useState } from 'react';

interface ImageDropZoneProps {
  label: string;
  className?: string;
  children: React.ReactNode;
  onImageChange: (dataUrl: string) => void;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const ImageDropZone: React.FC<ImageDropZoneProps> = ({
  label, className = '', children, onImageChange, onClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const dragDepth = useRef(0);
  const readerRef = useRef<FileReader | null>(null);

  useEffect(() => () => {
    readerRef.current?.abort();
    readerRef.current = null;
  }, []);

  const selectFiles = (files: FileList | null) => {
    // Supersede an in-flight read even when the newer selection is invalid.
    const previousReader = readerRef.current;
    readerRef.current = null;
    previousReader?.abort();
    if (!files?.length) return;
    if (files.length !== 1) {
      setError('한 번에 이미지 한 장만 넣어주세요.');
      return;
    }
    const file = files[0];
    const isImage = file.type.startsWith('image/') || (
      !file.type && /\.(png|jpe?g|jfif|gif|webp|bmp|svg|avif|ico)$/i.test(file.name)
    );
    if (!isImage) {
      setError('이미지 파일만 넣을 수 있습니다.');
      return;
    }

    setError('');
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      if (readerRef.current !== reader) return;
      readerRef.current = null;
      if (typeof reader.result === 'string') onImageChange(reader.result);
    };
    reader.onerror = () => {
      if (readerRef.current !== reader) return;
      readerRef.current = null;
      setError('이미지를 읽지 못했습니다. 파일을 다시 선택해주세요.');
    };
    // Keep the original bytes and format, including animated GIFs.
    reader.readAsDataURL(file);
  };

  const isFileDrag = (event: React.DragEvent<HTMLDivElement>) =>
    Array.from(event.dataTransfer.types).includes('Files');

  return (
    <div
      role="group"
      aria-label={`${label} 이미지 첨부`}
      className={`builder-image-drop ${isDragging ? 'is-dragging' : ''} ${className}`}
      onClick={onClick}
      onChange={(event) => {
        const input = event.target;
        if (input instanceof HTMLInputElement && input.type === 'file') {
          selectFiles(input.files);
          input.value = '';
        }
      }}
      onDragEnter={(event) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        if (dragDepth.current === 0) return;
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = 0;
        setIsDragging(false);
        if (!event.dataTransfer.files.length) {
          setError('이미지 파일을 직접 끌어다 놓아주세요.');
          return;
        }
        selectFiles(event.dataTransfer.files);
      }}
    >
      {children}
      {error && <p className="builder-drop-error" role="alert">{error}</p>}
    </div>
  );
};

export default ImageDropZone;
