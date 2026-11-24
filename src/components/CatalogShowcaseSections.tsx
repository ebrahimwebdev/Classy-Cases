import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { PhoneCaseProduct } from '../models/phoneCase';
import type { Category } from '../types';
import { PhoneCaseCard } from './PhoneCaseGrid';
import { MobileHorizontalTrack, MOBILE_SLIDE_CARD_CLASS } from './MobileHorizontalTrack';

interface CatalogShowcaseSectionsProps {
  products: PhoneCaseProduct[];
  categories: Category[];
  wishlist: string[];
  loading: boolean;
  onSelectProduct: (product: PhoneCaseProduct) => void;
  onQuickView: (product: PhoneCaseProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: PhoneCaseProduct) => void;
  onViewAll: (category?: string) => void;
}

export function CatalogShowcaseSections({
  products,
  categories,
  wishlist,
  loading,
  onSelectProduct,
  onQuickView,
  onToggleWishlist,
  onAddToCart,
  onViewAll,
}: CatalogShowcaseSectionsProps) {
  const [phoneCaseBrand, setPhoneCaseBrand] = useState<string>('All');

  const bestsellingProducts = useMemo(() => {
    const sorted = [...products].sort(
      (a, b) =>
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        b.discountPercent - a.discountPercent
    );
    return sorted.slice(0, 10);
  }, [products]);

  const phoneCaseProducts = useMemo(() => {
    const filtered =
      phoneCaseBrand === 'All'
        ? products
        : products.filter(
            (p) =>
              p.category.toLowerCase() === phoneCaseBrand.toLowerCase() ||
              (p.alsoShowIn || []).some(
                (c) => c.toLowerCase() === phoneCaseBrand.toLowerCase()
              )
          );
    return filtered.slice(0, 10);
  }, [products, phoneCaseBrand]);

  if (loading && products.length === 0) {
    return null;
  }

  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-6 pb-4 space-y-12">
      {/* Row 1: BESTSELLING */}
      <section aria-labelledby="bestselling-heading">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2
            id="bestselling-heading"
            className="font-brand text-xl sm:text-2xl font-semibold text-[#650108] tracking-tight"
          >
            Bestselling
          </h2>
          <button
            type="button"
            onClick={() => onViewAll('All')}
            className="hidden sm:inline-block text-xs font-semibold uppercase tracking-[1.6px] text-[#650108] underline underline-offset-4 hover:opacity-75 whitespace-nowrap cursor-pointer"
          >
            view all
          </button>
        </div>

        <MobileHorizontalTrack className="sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0">
          {bestsellingProducts.map((product, idx) => (
            <PhoneCaseCard
              key={`best-${product.id}`}
              product={product}
              isWishlisted={wishlist.includes(product.id)}
              className={`${MOBILE_SLIDE_CARD_CLASS} ${idx >= 5 ? 'sm:hidden' : ''}`}
              onSelectProduct={onSelectProduct}
              onQuickView={onQuickView}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
            />
          ))}
        </MobileHorizontalTrack>

        <div className="mt-4 flex justify-center sm:hidden">
          <button
            type="button"
            onClick={() => onViewAll('All')}
            className="px-5 py-2.5 rounded-xl border border-[#650108] bg-[#FFFDF8] text-[#650108] text-xs font-semibold uppercase tracking-[1.6px] inline-flex items-center gap-2 hover:bg-[#650108] hover:text-[#F2E8D2] transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Row 2: PHONE CASES with Outlined Brand Tabs */}
      <section id="phone-cases-showcase" aria-labelledby="phone-cases-heading">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2
            id="phone-cases-heading"
            className="font-brand text-xl sm:text-2xl font-semibold text-[#650108] tracking-tight"
          >
            Phone Cases
          </h2>
          <button
            type="button"
            onClick={() => onViewAll(phoneCaseBrand)}
            className="hidden sm:inline-block text-xs font-semibold uppercase tracking-[1.6px] text-[#650108] underline underline-offset-4 hover:opacity-75 whitespace-nowrap cursor-pointer"
          >
            view all
          </button>
        </div>

        {/* Outlined Brand Filter Row matching reference layout */}
        <div
          role="tablist"
          aria-label="Filter Phone Cases showcase by brand"
          className="flex flex-wrap items-center gap-2 mb-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={phoneCaseBrand === 'All'}
            onClick={() => setPhoneCaseBrand('All')}
            className={`px-3.5 py-1.5 rounded-full border text-[11px] font-medium uppercase tracking-[1.5px] transition-colors cursor-pointer ${
              phoneCaseBrand === 'All'
                ? 'bg-[#650108] border-[#650108] text-[#F2E8D2]'
                : 'bg-[#FFFDF8] border-[#650108]/40 text-[#650108] hover:border-[#650108]'
            }`}
          >
            All Brands
          </button>
          {categories.map((cat) => {
            const active = phoneCaseBrand.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={`showcase-tab-${cat.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPhoneCaseBrand(active ? 'All' : cat.name)}
                className={`px-3.5 py-1.5 rounded-full border text-[11px] font-medium uppercase tracking-[1.5px] transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#650108] border-[#650108] text-[#F2E8D2]'
                    : 'bg-[#FFFDF8] border-[#650108]/40 text-[#650108] hover:border-[#650108]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {phoneCaseProducts.length === 0 ? (
          <div className="border border-[#DFCFB0] rounded-2xl py-10 text-center bg-[#FAF4E6] px-4">
            <p className="text-sm text-[#6B4C4E]">
              No phone cases found for {phoneCaseBrand} yet.
            </p>
          </div>
        ) : (
          <>
            <MobileHorizontalTrack className="sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0">
              {phoneCaseProducts.map((product, idx) => (
                <PhoneCaseCard
                  key={`cases-${product.id}`}
                  product={product}
                  isWishlisted={wishlist.includes(product.id)}
                  className={`${MOBILE_SLIDE_CARD_CLASS} ${idx >= 5 ? 'sm:hidden' : ''}`}
                  onSelectProduct={onSelectProduct}
                  onQuickView={onQuickView}
                  onToggleWishlist={onToggleWishlist}
                  onAddToCart={onAddToCart}
                />
              ))}
            </MobileHorizontalTrack>

            <div className="mt-4 flex justify-center sm:hidden">
              <button
                type="button"
                onClick={() => onViewAll(phoneCaseBrand)}
                className="px-5 py-2.5 rounded-xl border border-[#650108] bg-[#FFFDF8] text-[#650108] text-xs font-semibold uppercase tracking-[1.6px] inline-flex items-center gap-2 hover:bg-[#650108] hover:text-[#F2E8D2] transition-colors cursor-pointer"
              >
                <span>{phoneCaseBrand === 'All' ? 'View All' : `View All ${phoneCaseBrand}`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
