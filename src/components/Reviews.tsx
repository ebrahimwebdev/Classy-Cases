import React, { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquarePlus, Star } from 'lucide-react';
import type { ProductReview } from '../types';

interface ReviewsProps {
  productId: string;
  availableModels?: string[];
  selectedModel?: string;
}

interface ReviewsResponse {
  reviews: ProductReview[];
  averageRating: number;
  totalCount: number;
  ratingBreakdown: Record<number, number>;
}

const WIDTH_STEP_CLASSES = [
  'w-0',
  'w-[10%]',
  'w-[20%]',
  'w-[30%]',
  'w-[40%]',
  'w-[50%]',
  'w-[60%]',
  'w-[70%]',
  'w-[80%]',
  'w-[90%]',
  'w-full',
] as const;

function getBarWidthClass(count: number, total: number): string {
  if (total <= 0 || count <= 0) return WIDTH_STEP_CLASSES[0];
  const step = Math.min(10, Math.max(1, Math.round((count / total) * 10)));
  return WIDTH_STEP_CLASSES[step];
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-[#F2E8D2] text-[#CBB894]'
          }`}
        />
      ))}
    </div>
  );
}

export function Reviews({
  productId,
  availableModels = [],
  selectedModel = '',
}: ReviewsProps) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [deviceModel, setDeviceModel] = useState(selectedModel || availableModels[0] || '');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    setDeviceModel(selectedModel || availableModels[0] || 'Standard Fit');
  }, [selectedModel, availableModels]);

  async function loadReviews(signal?: AbortSignal) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        signal,
      });
      if (!res.ok) {
        throw new Error('Unable to load reviews');
      }
      const json = (await res.json()) as ReviewsResponse;
      setData(json);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Could not load customer reviews right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setFormOpen(false);
    setSubmitError('');
    loadReviews(controller.signal);
    return () => controller.abort();
  }, [productId]);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName,
          deviceModel,
          rating,
          comment,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error || 'Could not post review');
        return;
      }
      setAuthorName('');
      setComment('');
      setRating(5);
      setFormOpen(false);
      await loadReviews();
    } catch {
      setSubmitError('Network error while submitting review.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Customer Reviews"
      className="bg-[#FAF4E6] p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-brand text-lg font-semibold text-[#650108]">Customer Reviews &amp; Ratings</h4>
          <p className="text-[13px] text-[#6B4C4E] mt-0.5">
            Feedback from phone case buyers across Bangladesh
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#650108]/35 bg-[#FFFDF8] text-[13px] font-semibold text-[#650108] hover:bg-[#650108] hover:text-[#F2E8D2] transition-colors"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>{formOpen ? 'Cancel' : 'Write a Review'}</span>
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmitReview}
          className="bg-[#FFFDF8] border border-[#DFCFB0] rounded-xl p-4 sm:p-5 space-y-3.5 text-[13px]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#2B1416] mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Rafiul Islam"
                className="w-full px-3 py-2 rounded-lg border border-[#DFCFB0] bg-white focus:outline-none focus:border-[#650108]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#2B1416] mb-1">Phone Model</label>
              {availableModels.length > 0 ? (
                <select
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DFCFB0] bg-white focus:outline-none focus:border-[#650108]"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="Your phone model"
                  className="w-full px-3 py-2 rounded-lg border border-[#DFCFB0] bg-white focus:outline-none focus:border-[#650108]"
                />
              )}
            </div>
          </div>

          <div>
            <span className="block font-medium text-[#2B1416] mb-1">Your Rating</span>
            <div className="inline-flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} stars`}
                  className="p-0.5 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-[#F2E8D2] text-[#CBB894]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#2B1416] mb-1">Review *</label>
            <textarea
              rows={2}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share how the case fits, feels, and protects your phone..."
              className="w-full px-3 py-2 rounded-lg border border-[#DFCFB0] bg-white focus:outline-none focus:border-[#650108]"
            />
          </div>

          {submitError && <p className="text-rose-600 font-medium">{submitError}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#650108] text-[#F2E8D2] font-semibold hover:bg-[#4D0106] disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-xl bg-[#DFCFB0]/70" />
          <div className="h-20 rounded-xl bg-[#DFCFB0]/70" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#DFCFB0] text-xs text-[#6B4C4E]">
          {error}
        </div>
      ) : data ? (
        <>
          {/* Rating Summary & Breakdown */}
          <div className="bg-[#FFFDF8] border border-[#DFCFB0] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-4 text-center sm:text-left sm:border-r sm:border-[#EDE2C9] sm:pr-4">
              <div className="text-3xl font-bold text-[#650108] tabular-nums leading-none">
                {data.averageRating.toFixed(1)}
              </div>
              <div className="mt-1.5">
                <StarRow rating={data.averageRating} size="md" />
              </div>
              <p className="text-xs text-[#6B4C4E] mt-1.5 tabular-nums">
                Based on {data.totalCount} {data.totalCount === 1 ? 'review' : 'reviews'}
              </p>
            </div>

            <div className="sm:col-span-8 space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = data.ratingBreakdown[stars] || 0;
                const widthClass = getBarWidthClass(count, data.totalCount);
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-[#6B4C4E] font-medium tabular-nums shrink-0">
                      {stars}★
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-[#F2E8D2] overflow-hidden">
                      <div className={`h-full rounded-full bg-[#650108] ${widthClass}`} />
                    </div>
                    <span className="w-5 text-right text-[#6B4C4E] tabular-nums shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Testimonials Feed */}
          <div className="space-y-3">
            {data.reviews.map((review) => (
              <article
                key={review.id}
                className="bg-[#FFFDF8] border border-[#DFCFB0] rounded-xl p-4 sm:p-5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#650108]">{review.authorName}</span>
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Buyer
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#8E6F70]">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StarRow rating={review.rating} />
                  {review.deviceModel && (
                    <span className="text-xs text-[#6B4C4E]">
                      Model: <strong className="text-[#2B1416] font-medium">{review.deviceModel}</strong>
                    </span>
                  )}
                </div>

                <p className="text-[13px] sm:text-sm text-[#2B1416] leading-relaxed">{review.comment}</p>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
