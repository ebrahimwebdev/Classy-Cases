import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Package,
  Star,
} from 'lucide-react';
import { formatTaka } from '../models/phoneCase';

export interface StorefrontReviewItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  productPrice: number;
  authorName: string;
  city: string;
  deviceModel: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

interface StorefrontReviewsPayload {
  reviews: StorefrontReviewItem[];
  averageRating: number;
  totalCount: number;
  fiveStarPercent: number;
}

interface CustomerReviewsCarouselProps {
  homeReviewsOnlyFiveStar?: boolean;
  onSelectProduct: (productId: string) => void;
}

function ReviewThumbnail({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-11 h-11 rounded-lg bg-white border border-[#EDE2C9] flex items-center justify-center text-[#8E6F70] shrink-0">
        <Package className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-11 h-11 rounded-lg object-cover border border-[#EDE2C9] bg-white shrink-0"
    />
  );
}

function formatShortDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Recent';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const REVIEWS_CACHE_KEY = 'classy_cases_reviews_cache_v1';

function readCachedReviews(onlyFiveStar?: boolean): StorefrontReviewsPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REVIEWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      onlyFiveStar?: boolean;
      payload?: StorefrontReviewsPayload;
    };
    if (
      parsed?.onlyFiveStar === Boolean(onlyFiveStar) &&
      parsed?.payload &&
      Array.isArray(parsed.payload.reviews)
    ) {
      return parsed.payload;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedReviews(onlyFiveStar: boolean | undefined, payload: StorefrontReviewsPayload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      REVIEWS_CACHE_KEY,
      JSON.stringify({ onlyFiveStar: Boolean(onlyFiveStar), payload })
    );
  } catch {
    // ignore storage quota errors
  }
}

export function CustomerReviewsCarousel({
  homeReviewsOnlyFiveStar,
  onSelectProduct,
}: CustomerReviewsCarouselProps) {
  const initialCached = useMemo(
    () => readCachedReviews(homeReviewsOnlyFiveStar),
    [homeReviewsOnlyFiveStar]
  );
  const [payload, setPayload] = useState<StorefrontReviewsPayload | null>(initialCached);
  const [loading, setLoading] = useState(() => !initialCached);
  const [isDragging, setIsDragging] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/reviews', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load reviews');
        return (await res.json()) as StorefrontReviewsPayload;
      })
      .then((data) => {
        setPayload(data);
        saveCachedReviews(homeReviewsOnlyFiveStar, data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [homeReviewsOnlyFiveStar]);

  const filteredReviews = useMemo(() => payload?.reviews || [], [payload?.reviews]);

  const baseLoopSet = useMemo(() => {
    if (filteredReviews.length <= 1) return filteredReviews;
    const minItems = 8;
    const copies = Math.ceil(minItems / filteredReviews.length);
    const expanded: StorefrontReviewItem[] = [];
    for (let i = 0; i < copies; i += 1) {
      expanded.push(...filteredReviews);
    }
    return expanded;
  }, [filteredReviews]);

  const repeatedReviews = useMemo(() => {
    if (baseLoopSet.length <= 1) return baseLoopSet;
    return [...baseLoopSet, ...baseLoopSet];
  }, [baseLoopSet]);

  const shouldSlide = filteredReviews.length > 1;

  useEffect(() => {
    if (!shouldSlide) return;

    let rafId = 0;
    let lastTime = performance.now();
    const speedPxPerSec = 36;

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
  }, [shouldSlide]);

  if (loading) {
    return (
      <section
        aria-label="Customer Reviews"
        className="border-t border-[#DFCFB0] bg-[#EAE0C8]/65"
      >
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-6">
          <div className="h-8 w-56 rounded-lg bg-[#DFCFB0]/75 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-60 rounded-2xl bg-[#FFFDF8] border border-[#DFCFB0] animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!payload || payload.reviews.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="customer-reviews-heading"
      className="border-t border-[#DFCFB0] bg-[#EAE0C8]/65 py-12 sm:py-16 space-y-7"
    >
      <div className="max-w-[1180px] mx-auto px-4 sm:px-8">
        {/* Section Header + Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2">
            <h2
              id="customer-reviews-heading"
              className="font-brand text-2xl sm:text-[28px] font-semibold text-[#650108] tracking-tight [text-wrap:balance]"
            >
              Customer Reviews
            </h2>
            <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-[#6B4C4E] tabular-nums">
              <div
                className="inline-flex items-center gap-0.5"
                aria-label={`Average rating ${payload.averageRating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(payload.averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-[#F2E8D2] text-[#CBB894]'
                    }`}
                  />
                ))}
              </div>
              <span className="font-semibold text-[#650108]">
                {payload.averageRating.toFixed(1)} out of 5
              </span>
              <span aria-hidden="true" className="text-[#C9B38D]">
                ·
              </span>
              <span>
                {payload.fiveStarPercent}% five-star feedback across {payload.totalCount} verified case reviews
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Continuous Marquee Slide Viewport */}
      {filteredReviews.length === 0 ? (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8">
          <div className="bg-[#FFFDF8] border border-[#DFCFB0] rounded-2xl p-8 text-center text-sm text-[#6B4C4E]">
            No customer reviews match this rating filter yet.
          </div>
        </div>
      ) : (
        <div className={shouldSlide ? 'w-full' : 'max-w-[1180px] mx-auto px-4 sm:px-8'}>
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Verified customer reviews"
            onPointerDown={(e) => {
              if (!shouldSlide) return;
              if ((e.target as HTMLElement).closest('button')) return;
              draggingRef.current = true;
              dragMovedRef.current = false;
              setIsDragging(true);
              dragStartXRef.current = e.clientX;
              dragStartOffsetRef.current = offsetRef.current;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!draggingRef.current) return;
              const deltaX = dragStartXRef.current - e.clientX;
              if (Math.abs(deltaX) > 4) {
                dragMovedRef.current = true;
              }
              offsetRef.current = dragStartOffsetRef.current + deltaX;
            }}
            onPointerUp={() => {
              draggingRef.current = false;
              setIsDragging(false);
            }}
            onPointerCancel={() => {
              draggingRef.current = false;
              setIsDragging(false);
            }}
            className={`relative overflow-hidden py-1 -my-1 select-none touch-pan-y ${
              shouldSlide ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
          >
            <div ref={trackRef} className="flex w-max items-stretch will-change-transform">
              {repeatedReviews.map((review, idx) => (
                <div
                  key={`${review.id}-loop-${idx}`}
                  className={`shrink-0 pr-5 ${
                    shouldSlide
                      ? 'w-[300px] sm:w-[348px] lg:w-[384px]'
                      : 'w-full max-w-[384px]'
                  }`}
                >
                  <article className="h-full bg-[#FFFDF8] border border-[#DFCFB0] rounded-2xl p-6 flex flex-col justify-between gap-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#650108]/35 hover:shadow-md">
                    <div className="space-y-4">
                      {/* Rating + Date */}
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className="inline-flex items-center gap-0.5"
                          aria-label={`${review.rating} out of 5 stars`}
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-[#F2E8D2] text-[#CBB894]'
                              }`}
                            />
                          ))}
                        </div>
                        <time
                          dateTime={review.createdAt}
                          className="text-xs text-[#8E6F70] tabular-nums"
                        >
                          {formatShortDate(review.createdAt)}
                        </time>
                      </div>

                      {/* Quote */}
                      <p className="text-[14px] text-[#2B1416] leading-relaxed">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Reviewer Attribution (Zero-Pill Unboxed Metadata) */}
                      <div>
                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#650108]">
                          <span>{review.authorName}</span>
                          {review.verifiedPurchase && (
                            <CheckCircle2
                              className="w-3.5 h-3.5 text-emerald-700 shrink-0"
                              aria-label="Verified Buyer"
                            />
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#6B4C4E]">
                          <span>{review.city}</span>
                          <span aria-hidden="true" className="text-[#C9B38D]">
                            ·
                          </span>
                          <span className="text-[#2B1416] font-medium">{review.deviceModel}</span>
                          {review.verifiedPurchase && (
                            <>
                              <span aria-hidden="true" className="text-[#C9B38D]">
                                ·
                              </span>
                              <span>Verified buyer</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Purchased Case Link */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!dragMovedRef.current) {
                            onSelectProduct(review.productId);
                          }
                        }}
                        className="w-full pt-4 border-t border-[#EDE2C9] flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
                      >
                        <ReviewThumbnail src={review.productImage} alt={review.productTitle} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[#2B1416] truncate group-hover:text-[#650108]">
                            {review.productTitle}
                          </div>
                          <div className="text-xs font-normal text-[#6B4C4E] tabular-nums mt-0.5">
                            <span className="font-bold text-[#650108]">{formatTaka(review.productPrice)}</span> · View case
                          </div>
                        </div>
                      </button>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
