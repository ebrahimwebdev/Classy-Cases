import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Category } from '../types';
import { getRootCategoryFor, getTopLevelCategories } from '../utils/categoryTree';
import { CustomBrandLogo, MotorolaLogo, VivoLogo, XiaomiLogo } from './BrandLogos';

interface FeaturedCategoriesSliderProps {
  categories: Category[];
  selectedCategory: string;
  failedCatImages: Record<string, boolean>;
  onImageError: (catId: string) => void;
  onSelectCategory: (categoryName: string) => void;
}

export function FeaturedCategoriesSlider({
  categories,
  selectedCategory,
  failedCatImages,
  onImageError,
  onSelectCategory,
}: FeaturedCategoriesSliderProps) {
  const featuredCategories = useMemo(
    () => getTopLevelCategories(categories).filter((c) => c.featured !== false),
    [categories]
  );
  const activeRoot = useMemo(
    () => getRootCategoryFor(categories, selectedCategory),
    [categories, selectedCategory]
  );

  const shouldSlide = featuredCategories.length >= 2;

  const baseLoopSet = useMemo(() => {
    if (!shouldSlide) return featuredCategories;
    const minItems = 16;
    const copies = Math.ceil(minItems / featuredCategories.length);
    const expanded: Category[] = [];
    for (let i = 0; i < copies; i += 1) {
      expanded.push(...featuredCategories);
    }
    return expanded;
  }, [featuredCategories, shouldSlide]);

  const repeatedCategories = useMemo(() => {
    if (!shouldSlide) return baseLoopSet;
    return [...baseLoopSet, ...baseLoopSet];
  }, [baseLoopSet, shouldSlide]);

  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!shouldSlide) return;

    let rafId = 0;
    let lastTime = performance.now();
    const speedPxPerSec = 34;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const track = trackRef.current;
      if (track) {
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0) {
          if (!draggingRef.current) {
            offsetRef.current += speedPxPerSec * dt;
          }
          offsetRef.current = ((offsetRef.current % halfWidth) + halfWidth) % halfWidth;
          track.style.transform = `translate3d(-${offsetRef.current.toFixed(2)}px, 0, 0)`;
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [shouldSlide, repeatedCategories.length]);

  if (featuredCategories.length === 0) {
    return null;
  }

  return (
    <section className="pt-8 sm:pt-10 pb-6 sm:pb-8">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-8">
        <h2 className="font-brand text-xl sm:text-2xl font-semibold text-[#650108] text-center mb-5 sm:mb-7 tracking-tight">
          Featured Categories
        </h2>
      </div>

      {!shouldSlide ? (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 flex justify-center">
          {featuredCategories.map((cat) => {
            const isActive = activeRoot?.id === cat.id || selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(isActive ? 'All' : cat.name)}
                className="group flex flex-col items-center focus:outline-none"
              >
                <div
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border bg-[#FFFDF8] flex items-center justify-center transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md p-2 overflow-hidden ${
                    isActive
                      ? 'border-[#650108] ring-2 ring-[#650108]'
                      : 'border-[#DFCFB0] group-hover:border-[#650108]/50'
                  }`}
                >
                  {cat.image && !failedCatImages[cat.id] ? (
                    <img
                      key={cat.image}
                      src={cat.image}
                      alt={cat.name}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      onError={() => onImageError(cat.id)}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="scale-[0.82] sm:scale-100">
                      {cat.brandKey === 'motorola' && <MotorolaLogo />}
                      {cat.brandKey === 'vivo' && <VivoLogo />}
                      {cat.brandKey === 'xiaomi' && <XiaomiLogo />}
                      {cat.brandKey === 'custom' && <CustomBrandLogo name={cat.name} />}
                    </div>
                  )}
                </div>
                <span className="mt-2 sm:mt-2.5 text-[13px] font-medium text-[#650108]">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          onPointerDown={(e) => {
            draggingRef.current = true;
            dragMovedRef.current = false;
            pointerIdRef.current = e.pointerId;
            dragStartXRef.current = e.clientX;
            dragStartOffsetRef.current = offsetRef.current;
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            const deltaX = dragStartXRef.current - e.clientX;
            if (!dragMovedRef.current && Math.abs(deltaX) > 6) {
              dragMovedRef.current = true;
              setIsDragging(true);
              if (pointerIdRef.current !== null && !e.currentTarget.hasPointerCapture(pointerIdRef.current)) {
                try {
                  e.currentTarget.setPointerCapture(pointerIdRef.current);
                } catch {
                  // ignore if pointer already released
                }
              }
            }
            if (dragMovedRef.current) {
              offsetRef.current = dragStartOffsetRef.current + deltaX;
            }
          }}
          onPointerUp={() => {
            draggingRef.current = false;
            pointerIdRef.current = null;
            setIsDragging(false);
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
            pointerIdRef.current = null;
            setIsDragging(false);
          }}
          className={`w-full relative overflow-hidden py-2 -my-2 select-none touch-pan-y ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <div ref={trackRef} className="flex w-max items-start will-change-transform">
            {repeatedCategories.map((cat, idx) => {
              const isActive = activeRoot?.id === cat.id || selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <div key={`${cat.id}-slide-${idx}`} className="shrink-0 pr-3.5 sm:pr-5">
                  <button
                    type="button"
                    onClick={() => {
                      if (dragMovedRef.current) {
                        dragMovedRef.current = false;
                        return;
                      }
                      onSelectCategory(isActive ? 'All' : cat.name);
                    }}
                    className="group flex flex-col items-center focus:outline-none"
                  >
                    <div
                      className={`w-[104px] h-[104px] sm:w-32 sm:h-32 rounded-2xl border bg-[#FFFDF8] flex items-center justify-center transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md p-2 overflow-hidden ${
                        isActive
                          ? 'border-[#650108] ring-2 ring-[#650108]'
                          : 'border-[#DFCFB0] group-hover:border-[#650108]/50'
                      }`}
                    >
                      {cat.image && !failedCatImages[cat.id] ? (
                        <img
                          key={cat.image}
                          src={cat.image}
                          alt={cat.name}
                          draggable={false}
                          referrerPolicy="no-referrer"
                          onError={() => onImageError(cat.id)}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl"
                        />
                      ) : (
                        <div className="scale-[0.78] sm:scale-100">
                          {cat.brandKey === 'motorola' && <MotorolaLogo />}
                          {cat.brandKey === 'vivo' && <VivoLogo />}
                          {cat.brandKey === 'xiaomi' && <XiaomiLogo />}
                          {cat.brandKey === 'custom' && <CustomBrandLogo name={cat.name} />}
                        </div>
                      )}
                    </div>
                    <span className="mt-2 sm:mt-2.5 text-[13px] font-medium text-[#650108] whitespace-nowrap">
                      {cat.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
