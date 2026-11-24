import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatTaka, type PhoneCaseProduct } from '../models/phoneCase';

interface HeroVideoSlide {
  id: string;
  label: string;
  kicker: string;
  headline: string;
  description: string;
  videoSrc: string;
  posterSrc: string;
  posterAlt: string;
  categoryTarget: string;
  featuredProductId: string;
  startingPrice: number;
}

const HERO_VIDEO_SLIDES: HeroVideoSlide[] = [
  {
    id: 'magsafe-video',
    label: 'MagSafe Frosted',
    kicker: 'Signature Showcase · Motorola · VIVO · Xiaomi',
    headline: 'Protect your phone with style.',
    description:
      'Frosted anti-fingerprint matte armor with integrated N52 MagSafe rings and raised metallic camera bezels.',
    videoSrc: '/assets/videos/hero-magsafe-reel.mp4',
    posterSrc: '/src/assets/images/hero_magsafe_showcase_1795548420846.jpg',
    posterAlt:
      'Frosted matte MagSafe phone cases with rose-gold and copper camera bezels on travertine stone',
    categoryTarget: 'All',
    featuredProductId: 'prod-1',
    startingPrice: 250,
  },
  {
    id: 'carbon-video',
    label: 'Carbon Armor',
    kicker: 'Executive Edition · Kickstand · Lens Guard',
    headline: 'Precision fit. Everyday armor.',
    description:
      'Woven aramid-textured protection paired with machined aluminum lens framing built for slim daily resilience.',
    videoSrc: '/assets/videos/hero-carbon-reel.mp4',
    posterSrc: '/src/assets/images/hero_carbon_armor_1795548421139.jpg',
    posterAlt:
      'Woven carbon-fiber smartphone case with crimson trim and aluminum camera lens ring on slate',
    categoryTarget: 'Motorola',
    featuredProductId: 'prod-5',
    startingPrice: 600,
  },
];

interface HeroBannerProps {
  products: PhoneCaseProduct[];
  onShopNow: (category?: string) => void;
  onInspectProduct: (product: PhoneCaseProduct) => void;
}

export function HeroBanner({
  products,
  onShopNow,
  onInspectProduct,
}: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentSlide = HERO_VIDEO_SLIDES[activeIndex];

  const matchedProduct = useMemo(() => {
    return (
      products.find((p) => p.id === currentSlide.featuredProductId) ||
      products.find(
        (p) =>
          currentSlide.categoryTarget !== 'All' &&
          p.category.toLowerCase() === currentSlide.categoryTarget.toLowerCase()
      ) ||
      products[0] ||
      null
    );
  }, [products, currentSlide]);

  const displayPrice = matchedProduct?.price ?? currentSlide.startingPrice;

  // Ensure HTML5 video plays continuously when slide changes
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || videoFailed[currentSlide.id]) return;

    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Browser autoplay policy fallback: keep poster visible cleanly
      });
    }
  }, [activeIndex, currentSlide.id, videoFailed]);

  // Auto-advance slides continuously
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_VIDEO_SLIDES.length);
    }, 9500);
    return () => window.clearInterval(timer);
  }, []);

  function handlePrevSlide() {
    setActiveIndex((prev) => (prev - 1 + HERO_VIDEO_SLIDES.length) % HERO_VIDEO_SLIDES.length);
  }

  function handleNextSlide() {
    setActiveIndex((prev) => (prev + 1) % HERO_VIDEO_SLIDES.length);
  }

  return (
    <section
      aria-label="Featured Video Showcase Hero"
      className="relative w-full bg-[#240306] overflow-hidden border-b border-[#4D0106]"
    >
      {/* Full-Bleed Video Backdrop */}
      <div className="relative w-full min-h-[380px] sm:min-h-[450px] lg:min-h-[520px] flex items-center">
        {videoFailed[currentSlide.id] ? (
          <img
            src={currentSlide.posterSrc}
            alt={currentSlide.posterAlt}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <video
            key={currentSlide.videoSrc}
            ref={videoRef}
            src={currentSlide.videoSrc}
            poster={currentSlide.posterSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() =>
              setVideoFailed((prev) => ({ ...prev, [currentSlide.id]: true }))
            }
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        )}

        {/* Editorial Contrast Scrims */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1A0203]/80 via-[#1A0203]/45 to-[#1A0203]/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1A0203]/70 via-transparent to-[#1A0203]/30"
        />

        {/* Foreground Content Aligned to Storefront Container */}
        <div className="relative z-10 w-full max-w-[1180px] mx-auto px-12 sm:px-14 lg:px-8 py-14 sm:py-16">
          <div className="max-w-xl">
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[1.75px] text-[#F2E8D2]/90">
              {currentSlide.kicker}
            </p>

            <h1 className="mt-3 font-brand text-[clamp(2rem,4.4vw,3.35rem)] font-semibold leading-[1.08] tracking-tight text-[#FBF6EA] text-balance">
              {currentSlide.headline}
            </h1>

            <p className="mt-3.5 text-sm sm:text-[15px] font-normal leading-relaxed text-[#F2E8D2]/90 max-w-md">
              {currentSlide.description}
            </p>

            <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onShopNow(currentSlide.categoryTarget)}
                className="px-6 py-2.5 sm:py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/45 text-[#FBF6EA] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#F2E8D2] hover:text-[#650108] hover:border-[#F2E8D2] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
              >
                <span>Explore</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              {matchedProduct && (
                <button
                  type="button"
                  onClick={() => onInspectProduct(matchedProduct)}
                  className="px-4 py-2.5 sm:py-3 rounded-xl bg-[#650108]/80 backdrop-blur-sm border border-[#F2E8D2]/25 text-[#F2E8D2] text-xs sm:text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#650108] hover:border-[#F2E8D2]/55 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span className="max-w-[175px] truncate">{matchedProduct.title}</span>
                  <span className="font-bold tabular-nums text-[#FBF6EA]">
                    {formatTaka(displayPrice)}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Subtle Left / Right Slide Chevrons */}
        <button
          type="button"
          onClick={handlePrevSlide}
          aria-label="Previous hero video"
          className="absolute left-2.5 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white/80 hover:text-white hover:bg-black/30 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
        </button>

        <button
          type="button"
          onClick={handleNextSlide}
          aria-label="Next hero video"
          className="absolute right-2.5 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white/80 hover:text-white hover:bg-black/30 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
        </button>

        {/* Bottom Center Slide Bars */}
        <div
          className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
          role="tablist"
          aria-label="Hero showcase videos"
        >
          {HERO_VIDEO_SLIDES.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Play ${slide.label} showcase video`}
                onClick={() => setActiveIndex(idx)}
                className={`h-1 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'w-7 bg-white shadow-xs'
                    : 'w-3.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
