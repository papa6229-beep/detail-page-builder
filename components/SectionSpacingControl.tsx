import React, { useRef, useState } from 'react';
import type { SectionSpacingKey } from '../types';
import { clampSectionSpacing, MAX_SECTION_SPACING, SECTION_SPACING } from '../sectionSpacing';

interface SectionSpacingControlProps {
  sectionKey: SectionSpacingKey;
  value: number;
  onChange: (key: SectionSpacingKey, value: number) => void;
}

const SectionSpacingControl: React.FC<SectionSpacingControlProps> = ({ sectionKey, value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<{
    pointerId: number; y: number; value: number; scrollTop: number; scale: number; scroller: Element | null;
  } | null>(null);
  const definition = SECTION_SPACING[sectionKey];
  const finish = (element: HTMLDivElement) => {
    const previous = drag.current;
    drag.current = null;
    setIsDragging(false);
    if (previous && element.hasPointerCapture(previous.pointerId)) element.releasePointerCapture(previous.pointerId);
  };

  return (
    <div className="builder-spacing-anchor" data-editor-only="true">
      <div
        role="separator"
        tabIndex={0}
        aria-label={`${definition.label} 아래 간격`}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={MAX_SECTION_SPACING}
        aria-valuenow={value}
        aria-valuetext={`${value}px`}
        title="위아래로 드래그하여 간격 조절 · 더블클릭으로 기본 간격 복원"
        data-spacing-key={sectionKey}
        className={`builder-spacing-control ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          const element = event.currentTarget;
          const scroller = element.closest('.builder-workspace');
          const canvas = element.closest('#detail-page-container') as HTMLElement | null;
          element.focus({ preventScroll: true });
          drag.current = {
            pointerId: event.pointerId, y: event.clientY, value,
            scrollTop: scroller?.scrollTop ?? 0, scroller,
            scale: canvas ? canvas.getBoundingClientRect().width / canvas.offsetWidth : 1,
          };
          element.setPointerCapture(event.pointerId);
          setIsDragging(true);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.pointerId !== event.pointerId) return;
          event.preventDefault();
          const scrollDelta = (start.scroller?.scrollTop ?? 0) - start.scrollTop;
          onChange(sectionKey, clampSectionSpacing(start.value + (event.clientY - start.y + scrollDelta) / start.scale));
        }}
        onPointerUp={(event) => finish(event.currentTarget)}
        onPointerCancel={(event) => {
          if (drag.current) onChange(sectionKey, drag.current.value);
          finish(event.currentTarget);
        }}
        onLostPointerCapture={() => { drag.current = null; setIsDragging(false); }}
        onDoubleClick={() => onChange(sectionKey, definition.defaultValue)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && drag.current) {
            event.preventDefault();
            onChange(sectionKey, drag.current.value);
            finish(event.currentTarget);
            return;
          }
          let next: number;
          const step = event.shiftKey ? 16 : 4;
          if (event.key === 'ArrowUp') next = value - step;
          else if (event.key === 'ArrowDown') next = value + step;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = MAX_SECTION_SPACING;
          else return;
          event.preventDefault();
          onChange(sectionKey, clampSectionSpacing(next));
        }}
      >
        <span className="builder-spacing-label">
          <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M6 1v12M3 4l3-3 3 3M3 10l3 3 3-3" /></svg>
          {definition.label} 아래 간격 <strong>{value}px</strong>
        </span>
      </div>
    </div>
  );
};

export default SectionSpacingControl;
