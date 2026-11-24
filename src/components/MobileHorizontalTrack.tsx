import React, { useRef, useState } from 'react';

export const MOBILE_SLIDE_CARD_CLASS = 'w-[calc(47%-5px)] shrink-0 snap-start sm:w-auto';

interface MobileHorizontalTrackProps {
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function MobileHorizontalTrack({
  active = true,
  className = '',
  children,
}: MobileHorizontalTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  if (!active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={(e) => {
        // Let native touch scrolling handle real finger swipes at 60fps
        if (e.pointerType === 'touch') return;
        const el = trackRef.current;
        if (!el || el.scrollWidth <= el.clientWidth + 4) return;
        if ((e.target as HTMLElement).closest('button')) return;

        draggingRef.current = true;
        movedRef.current = false;
        startXRef.current = e.clientX;
        startScrollLeftRef.current = el.scrollLeft;
        el.style.scrollSnapType = 'none';
        setIsDragging(true);
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        const el = trackRef.current;
        if (!el) return;

        const delta = e.clientX - startXRef.current;
        if (Math.abs(delta) > 5) {
          movedRef.current = true;
        }
        el.scrollLeft = startScrollLeftRef.current - delta;
      }}
      onPointerUp={() => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setIsDragging(false);
        if (trackRef.current) {
          trackRef.current.style.scrollSnapType = '';
        }
        window.setTimeout(() => {
          movedRef.current = false;
        }, 60);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
        setIsDragging(false);
        if (trackRef.current) {
          trackRef.current.style.scrollSnapType = '';
        }
      }}
      onPointerLeave={() => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setIsDragging(false);
        if (trackRef.current) {
          trackRef.current.style.scrollSnapType = '';
        }
      }}
      onClickCapture={(e) => {
        if (movedRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className={`flex overflow-x-auto snap-x snap-mandatory gap-3 pb-1 no-scrollbar select-none sm:select-auto ${
        isDragging ? 'cursor-grabbing' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
