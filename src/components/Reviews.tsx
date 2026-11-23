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
              : 'fill-neutral-100 text-neutral-300'
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
      className="bg-neutral-50/40 p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">Customer Reviews &amp; Ratings</h4>
          <p className="text-xs text-neutral-500 mt-0.5">
            Feedback from phone case buyers across Bangladesh
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition-colors"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>{formOpen ? 'Cancel' : 'Write a Review'}</span>
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmitReview}
          className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Rafiul Islam"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 mb-1">Phone Model</label>
              {availableModels.length > 0 ? (
                <select
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
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
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200"
                />
              )}
            </div>
          </div>

          <div>
            <span className="block font-medium text-neutral-700 mb-1">Your Rating</span>
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
                        : 'fill-neutral-100 text-neutral-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-neutral-700 mb-1">Review *</label>
            <textarea
              rows={2}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share how the case fits, feels, and protects your phone..."
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
            />
          </div>

          {submitError && <p className="text-rose-600 font-medium">{submitError}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-neutral-950 text-white font-semibold hover:bg-neutral-800 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-xl bg-neutral-200/70" />
          <div className="h-20 rounded-xl bg-neutral-200/70" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-600">
          {error}
        </div>
      ) : data ? (
        <>
          {/* Rating Summary & Breakdown */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-4 text-center sm:text-left sm:border-r sm:border-neutral-100 sm:pr-4">
              <div className="text-3xl font-black text-neutral-950 tabular-nums leading-none">
                {data.averageRating.toFixed(1)}
              </div>
              <div className="mt-1.5">
                <StarRow rating={data.averageRating} size="md" />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 tabular-nums">
                Based on {data.totalCount} {data.totalCount === 1 ? 'review' : 'reviews'}
              </p>
            </div>

            <div className="sm:col-span-8 space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = data.ratingBreakdown[stars] || 0;
                const widthClass = getBarWidthClass(count, data.totalCount);
                return (
                  <div key={stars} className="flex items-center gap-2 text-[11px]">
                    <span className="w-6 text-neutral-600 font-medium tabular-nums shrink-0">
                      {stars}★
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div className={`h-full rounded-full bg-neutral-900 ${widthClass}`} />
                    </div>
                    <span className="w-5 text-right text-neutral-500 tabular-nums shrink-0">
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
                className="bg-white border border-neutral-200 rounded-xl p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900">{review.authorName}</span>
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Buyer
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StarRow rating={review.rating} />
                  {review.deviceModel && (
                    <span className="text-[11px] text-neutral-500">
                      Model: <strong className="text-neutral-700 font-medium">{review.deviceModel}</strong>
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-700 leading-relaxed">{review.comment}</p>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
