import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatTaka, type PhoneCaseProduct } from '../models/phoneCase';
import {
  DEFAULT_HERO_CONFIG,
  DEFAULT_HERO_MOBILE_LAYOUT,
  DEFAULT_HERO_VIDEO_SLIDES,
  fetchPublicHeroConfig,
  fetchPublicHeroSlides,
  loadCachedHeroState,
  saveCachedHeroState,
  type HeroMobileLayoutConfig,
  type HeroPlaybackConfig,
  type HeroVideoSlide,
} from '../services/heroVideoFirestore';

interface HeroBannerProps {
  products: PhoneCaseProduct[];
  onShopNow: (category?: string) => void;
  onInspectProduct: (product: PhoneCaseProduct) => void;
}

function forcePlayVideo(videoEl: HTMLVideoElement | null) {
  if (!videoEl) return;
  videoEl.defaultMuted = true;
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.setAttribute('muted', '');
  videoEl.setAttribute('playsinline', '');
  if (videoEl.paused) {
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Browser autoplay policy fallback: keep poster visible cleanly
      });
    }
  }
}

export function HeroBanner({
  products,
  onShopNow,
  onInspectProduct,
}: HeroBannerProps) {
  const initialCacheRef = useRef(loadCachedHeroState());
  const hasCachedHeroRef = useRef(Boolean(initialCacheRef.current?.slides?.length));
  const [slides, setSlides] = useState<HeroVideoSlide[]>(
    () => initialCacheRef.current?.slides || []
  );
  const [heroReady, setHeroReady] = useState<boolean>(
    () => Boolean(initialCacheRef.current?.slides?.length)
  );
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState<number>(
    () =>
      initialCacheRef.current?.config?.autoAdvanceSeconds ??
      DEFAULT_HERO_CONFIG.autoAdvanceSeconds
  );
  const [mobileLayout, setMobileLayout] = useState<HeroMobileLayoutConfig>(() => ({
    ...DEFAULT_HERO_MOBILE_LAYOUT,
    ...(initialCacheRef.current?.config?.mobileLayout || {}),
  }));
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const cachedSlides = initialCacheRef.current?.slides;
    const activeId = initialCacheRef.current?.config?.activeSlideId;
    if (cachedSlides && activeId) {
      const idx = cachedSlides.findIndex((s) => s.id === activeId);
      if (idx >= 0) return idx;
    }
    return 0;
  });
  const [videoFailed, setVideoFailed] = useState<Record<string, boolean>>({});
  const [activeVideoCanPlay, setActiveVideoCanPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasAppliedInitialSelectionRef = useRef<boolean>(
    Boolean(initialCacheRef.current?.slides?.length)
  );
  const lastSlidesJsonRef = useRef<string>(
    initialCacheRef.current?.slides ? JSON.stringify(initialCacheRef.current.slides) : ''
  );

  const applyResolvedHero = useCallback(
    (
      nextSlides: HeroVideoSlide[],
      activeConfig: HeroPlaybackConfig | null,
      forceSelectActiveId = false
    ) => {
      const nextJson = JSON.stringify(nextSlides);
      if (nextJson !== lastSlidesJsonRef.current) {
        lastSlidesJsonRef.current = nextJson;
        setSlides(nextSlides);
        setVideoFailed((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      }
      setHeroReady(true);

      const nextMobileLayout: HeroMobileLayoutConfig = activeConfig?.mobileLayout
        ? { ...DEFAULT_HERO_MOBILE_LAYOUT, ...activeConfig.mobileLayout }
        : DEFAULT_HERO_MOBILE_LAYOUT;
      setMobileLayout((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextMobileLayout) ? prev : nextMobileLayout
      );

      const nextAutoAdvance =
        typeof activeConfig?.autoAdvanceSeconds === 'number' &&
        Number.isFinite(activeConfig.autoAdvanceSeconds)
          ? activeConfig.autoAdvanceSeconds
          : DEFAULT_HERO_CONFIG.autoAdvanceSeconds;
      setAutoAdvanceSeconds((prev) => (prev === nextAutoAdvance ? prev : nextAutoAdvance));

      if (activeConfig?.activeSlideId && (!hasAppliedInitialSelectionRef.current || forceSelectActiveId)) {
        const matchIdx = nextSlides.findIndex(
          (s) => s.id === activeConfig.activeSlideId
        );
        if (matchIdx >= 0) {
          setActiveIndex(matchIdx);
        }
        hasAppliedInitialSelectionRef.current = true;
      }

      saveCachedHeroState(nextSlides, {
        activeSlideId: activeConfig?.activeSlideId || nextSlides[0]?.id || '',
        autoAdvanceSeconds: nextAutoAdvance,
        mobileLayout: nextMobileLayout,
      });
    },
    []
  );

  const loadPersistedHeroSlides = useCallback(
    async (forceSelectActiveId = false) => {
      try {
        const parallelFirestore = !hasCachedHeroRef.current;
        const serverPromise = fetch('/api/hero-videos')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null) as Promise<{
          slides?: HeroVideoSlide[];
          config?: HeroPlaybackConfig | null;
        } | null>;

        const remoteSlidesPromise = parallelFirestore
          ? fetchPublicHeroSlides().catch(() => [])
          : null;
        const remoteConfigPromise = parallelFirestore
          ? fetchPublicHeroConfig().catch(() => null)
          : null;

        const serverRes = await serverPromise;
        const serverSlides = Array.isArray(serverRes?.slides)
          ? serverRes.slides.filter((s) => s.active !== false)
          : [];

        if (serverSlides.length > 0) {
          applyResolvedHero(
            serverSlides,
            serverRes?.config || null,
            forceSelectActiveId
          );
          return;
        }

        const [remoteSlides, remoteConfig] = await Promise.all([
          remoteSlidesPromise || fetchPublicHeroSlides().catch(() => []),
          remoteConfigPromise || fetchPublicHeroConfig().catch(() => null),
        ]);

        const nextSlides =
          remoteSlides.length > 0 ? remoteSlides : DEFAULT_HERO_VIDEO_SLIDES;
        const activeConfig: HeroPlaybackConfig | null =
          remoteConfig || serverRes?.config || null;

        applyResolvedHero(nextSlides, activeConfig, forceSelectActiveId);
      } catch {
        setHeroReady((ready) => {
          if (!ready) {
            setSlides(DEFAULT_HERO_VIDEO_SLIDES);
          }
          return true;
        });
      }
    },
    [applyResolvedHero]
  );

  useEffect(() => {
    void loadPersistedHeroSlides(false);
    function handleRefresh() {
      void loadPersistedHeroSlides(true);
    }
    window.addEventListener('hero-videos-updated', handleRefresh);
    return () => window.removeEventListener('hero-videos-updated', handleRefresh);
  }, [loadPersistedHeroSlides]);

  const safeIndex = activeIndex < slides.length ? activeIndex : 0;
  const currentSlide = slides[safeIndex] || DEFAULT_HERO_VIDEO_SLIDES[0];
  const nextSlide =
    slides.length > 1 ? slides[(safeIndex + 1) % slides.length] : null;

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

  // Enforce DOM muted/playsInline attributes synchronously and trigger playback immediately
  useLayoutEffect(() => {
    setActiveVideoCanPlay(false);
    if (!heroReady || videoFailed[currentSlide.id]) return;
    forcePlayVideo(videoRef.current);
  }, [heroReady, safeIndex, currentSlide.id, currentSlide.videoSrc, videoFailed]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        forcePlayVideo(videoRef.current);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Auto-advance slides continuously
  useEffect(() => {
    if (slides.length <= 1) return;
    const intervalMs = Math.max(3, autoAdvanceSeconds) * 1000;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [slides.length, autoAdvanceSeconds]);

  function handlePrevSlide() {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }

  function handleNextSlide() {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }

  const mobileAlignClass =
    mobileLayout.position === 'bottom-left'
      ? 'items-end sm:items-center'
      : mobileLayout.position === 'top-left'
        ? 'items-start sm:items-center'
        : 'items-center';

  const mobilePaddingYClass =
    mobileLayout.position === 'bottom-left'
      ? 'pt-6 pb-8 sm:py-16'
      : mobileLayout.position === 'top-left'
        ? 'pt-6 pb-10 sm:py-16'
        : 'py-10 sm:py-16';

  const mobilePaddingXClass = mobileLayout.showArrows
    ? 'px-11 sm:px-14 lg:px-8'
    : 'px-5 sm:px-14 lg:px-8';

  const mobileHeadlineClass =
    mobileLayout.textSize === 'xs'
      ? 'text-[15px] leading-[1.2] sm:text-[clamp(2.25rem,4.4vw,3.35rem)] sm:leading-[1.08]'
      : mobileLayout.textSize === 'sm'
        ? 'text-lg leading-[1.18] sm:text-[clamp(2.25rem,4.4vw,3.35rem)] sm:leading-[1.08]'
        : 'text-xl leading-[1.15] sm:text-[clamp(2.25rem,4.4vw,3.35rem)] sm:leading-[1.08]';

  const showMobileCtaRow =
    mobileLayout.showExploreButton || (mobileLayout.showProductButton && Boolean(matchedProduct));

  return (
    <section
      aria-label="Featured Video Showcase Hero"
      className="relative w-full overflow-hidden"
    >
      {/* Full-Bleed Video Backdrop */}
      <div
        className={`relative w-full min-h-[250px] sm:min-h-[450px] lg:min-h-[520px] flex ${mobileAlignClass}`}
      >
        {!heroReady ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 w-full h-full bg-[#240306]"
          />
        ) : videoFailed[currentSlide.id] || !currentSlide.videoSrc ? (
          <img
            src={
              currentSlide.posterSrc ||
              '/src/assets/images/hero_magsafe_showcase_1795548420846.jpg'
            }
            alt={currentSlide.posterAlt || currentSlide.headline}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <>
            <video
              key={currentSlide.videoSrc}
              ref={videoRef}
              src={currentSlide.videoSrc}
              poster={currentSlide.posterSrc || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => forcePlayVideo(e.currentTarget)}
              onLoadedData={(e) => forcePlayVideo(e.currentTarget)}
              onCanPlay={(e) => {
                setActiveVideoCanPlay(true);
                forcePlayVideo(e.currentTarget);
              }}
              onPlaying={() => setActiveVideoCanPlay(true)}
              onError={() =>
                setVideoFailed((prev) => ({ ...prev, [currentSlide.id]: true }))
              }
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {activeVideoCanPlay &&
              nextSlide &&
              nextSlide.videoSrc &&
              nextSlide.videoSrc !== currentSlide.videoSrc && (
                <video
                  key={`preload-${nextSlide.videoSrc}`}
                  src={nextSlide.videoSrc}
                  preload="auto"
                  muted
                  playsInline
                  aria-hidden="true"
                  className="hidden"
                />
              )}
          </>
        )}

        {/* Editorial Contrast Scrims (hidden on mobile phones per user request) */}
        <div
          aria-hidden="true"
          className="hidden sm:block pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1A0203]/80 via-[#1A0203]/45 to-[#1A0203]/20"
        />
        <div
          aria-hidden="true"
          className="hidden sm:block pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1A0203]/85 via-[#1A0203]/25 to-[#1A0203]/25"
        />

        {/* Foreground Content Aligned to Storefront Container */}
        {heroReady && (
          <div
            className={`relative z-10 w-full max-w-[1180px] mx-auto ${mobilePaddingXClass} ${mobilePaddingYClass}`}
          >
            <div className="max-w-xl">
              <p
                className={`${
                  mobileLayout.showKicker ? 'block' : 'hidden sm:block'
                } text-[10px] sm:text-xs font-medium uppercase tracking-[1.75px] text-[#F2E8D2]/90`}
              >
                {currentSlide.kicker}
              </p>

              <h1
                className={`${
                  mobileLayout.showKicker ? 'mt-1.5 sm:mt-3' : 'mt-0 sm:mt-3'
                } font-brand ${mobileHeadlineClass} font-semibold tracking-tight text-[#FBF6EA] text-balance max-w-[230px] sm:max-w-none`}
              >
                {currentSlide.headline}
              </h1>

              <p
                className={`${
                  mobileLayout.showDescription ? 'block' : 'hidden sm:block'
                } mt-1.5 sm:mt-3.5 text-xs sm:text-[15px] font-normal leading-relaxed text-[#F2E8D2]/90 max-w-md`}
              >
                {currentSlide.description}
              </p>

              <div
                className={`${
                  showMobileCtaRow ? 'flex' : 'hidden sm:flex'
                } mt-2.5 sm:mt-7 flex-wrap items-center gap-2 sm:gap-3`}
              >
                <button
                  type="button"
                  onClick={() => onShopNow(currentSlide.categoryTarget)}
                  className={`${
                    mobileLayout.showExploreButton
                      ? 'inline-flex'
                      : 'hidden sm:inline-flex'
                  } px-3.5 py-1.5 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl bg-white/15 backdrop-blur-md border border-white/45 text-[#FBF6EA] text-[11px] sm:text-sm font-semibold items-center gap-1.5 sm:gap-2 hover:bg-[#F2E8D2] hover:text-[#650108] hover:border-[#F2E8D2] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer`}
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                </button>

                {matchedProduct && (
                  <button
                    type="button"
                    onClick={() => onInspectProduct(matchedProduct)}
                    className={`${
                      mobileLayout.showProductButton
                        ? 'inline-flex'
                        : 'hidden sm:inline-flex'
                    } px-3 py-1.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-[#650108]/80 backdrop-blur-sm border border-[#F2E8D2]/25 text-[#F2E8D2] text-[11px] sm:text-sm font-semibold items-center gap-1.5 sm:gap-2 hover:bg-[#650108] hover:border-[#F2E8D2]/55 transition-colors whitespace-nowrap shrink-0 cursor-pointer`}
                  >
                    <span className="max-w-[145px] sm:max-w-[175px] truncate">
                      {matchedProduct.title}
                    </span>
                    <span className="font-bold tabular-nums text-[#FBF6EA]">
                      {formatTaka(displayPrice)}
                    </span>
                    <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subtle Left / Right Slide Chevrons */}
        {heroReady && slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevSlide}
              aria-label="Previous hero video"
              className={`${
                mobileLayout.showArrows ? 'flex left-2' : 'hidden sm:flex'
              } sm:left-5 top-1/2 -translate-y-1/2 absolute z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full text-white/80 hover:text-white hover:bg-black/30 items-center justify-center transition-colors cursor-pointer`}
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
            </button>

            <button
              type="button"
              onClick={handleNextSlide}
              aria-label="Next hero video"
              className={`${
                mobileLayout.showArrows ? 'flex right-2' : 'hidden sm:flex'
              } sm:right-5 top-1/2 -translate-y-1/2 absolute z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full text-white/80 hover:text-white hover:bg-black/30 items-center justify-center transition-colors cursor-pointer`}
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
            </button>

            {/* Bottom Center Slide Bars */}
            <div
              className="absolute bottom-2.5 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
              role="tablist"
              aria-label="Hero showcase videos"
            >
              {slides.map((slide, idx) => {
                const isActive = idx === safeIndex;
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
          </>
        )}
      </div>
    </section>
  );
}
