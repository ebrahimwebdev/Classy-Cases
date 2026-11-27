import React, { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PhoneCaseProduct } from '../models/phoneCase';
import type { Category } from '../types';
import { getCategoryAndDescendantNames, getTopLevelCategories } from '../utils/categoryTree';
import {
  buildProtectorSubcategoryCards,
  getProtectorCategorySets,
  isCameraProtectorProduct,
  isProtectorCategory,
  isProtectorProduct,
  isScreenProtectorProduct,
} from '../utils/protectorFilter';
import { PhoneCaseCard } from './PhoneCaseGrid';
import { MobileHorizontalTrack, MOBILE_SLIDE_CARD_CLASS } from './MobileHorizontalTrack';

const SHOWCASE_GRID_CLASSES: Record<2 | 3 | 4 | 5, string> = {
  2: 'sm:grid sm:grid-cols-2 lg:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0',
  3: 'sm:grid sm:grid-cols-3 lg:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0',
  4: 'sm:grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0',
  5: 'sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0',
};

interface ShowcaseBaseProps {
  products: PhoneCaseProduct[];
  wishlist: string[];
  loading: boolean;
  desktopColumns?: 2 | 3 | 4 | 5;
  title?: string;
  limit?: number;
  onSelectProduct: (product: PhoneCaseProduct) => void;
  onQuickView: (product: PhoneCaseProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: PhoneCaseProduct) => void;
  onViewAll: (category?: string) => void;
}

interface BestsellingShowcaseProps extends ShowcaseBaseProps {
  categories?: Category[];
}

export function BestsellingShowcaseSection({
  products,
  categories = [],
  wishlist,
  loading,
  desktopColumns = 5,
  title,
  limit = 5,
  onSelectProduct,
  onQuickView,
  onToggleWishlist,
  onAddToCart,
  onViewAll,
}: BestsellingShowcaseProps) {
  const showcaseGridClass = SHOWCASE_GRID_CLASSES[desktopColumns];
  const safeLimit = Math.min(12, Math.max(2, Math.round(limit)));

  const bestsellingProducts = useMemo(() => {
    const sets = getProtectorCategorySets(categories);
    const nonProtectors = products.filter((p) => !isProtectorProduct(p, categories, sets));
    const sorted = [...nonProtectors].sort(
      (a, b) =>
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        b.discountPercent - a.discountPercent
    );
    return sorted.slice(0, safeLimit);
  }, [products, categories, safeLimit]);

  if (loading && products.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="bestselling-heading"
      className="max-w-[1180px] mx-auto px-3 sm:px-8 pt-6 pb-4"
    >
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2
            id="bestselling-heading"
            className="font-brand text-xl sm:text-2xl font-semibold text-[#650108] tracking-tight"
          >
            {title?.trim() || 'Bestselling'}
          </h2>
          <div className="w-10 h-[3px] bg-[#650108] mt-1.5" />
        </div>
        <button
          type="button"
          onClick={() => onViewAll('All')}
          className="hidden sm:inline-block text-xs font-semibold uppercase tracking-[1.6px] text-[#650108] hover:opacity-75 whitespace-nowrap cursor-pointer"
        >
          view all
        </button>
      </div>

      <MobileHorizontalTrack className={showcaseGridClass}>
        {bestsellingProducts.map((product) => (
          <PhoneCaseCard
            key={`best-${product.id}`}
            product={product}
            isWishlisted={wishlist.includes(product.id)}
            className={MOBILE_SLIDE_CARD_CLASS}
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
  );
}

interface PhoneCasesShowcaseProps extends ShowcaseBaseProps {
  categories: Category[];
}

export function PhoneCasesShowcaseSection({
  products,
  categories,
  wishlist,
  loading,
  desktopColumns = 5,
  title,
  limit = 5,
  onSelectProduct,
  onQuickView,
  onToggleWishlist,
  onAddToCart,
  onViewAll,
}: PhoneCasesShowcaseProps) {
  const showcaseGridClass = SHOWCASE_GRID_CLASSES[desktopColumns];
  const [phoneCaseBrand, setPhoneCaseBrand] = useState<string>('All');
  const safeLimit = Math.min(12, Math.max(2, Math.round(limit)));

  const topLevelCategories = useMemo(
    () => getTopLevelCategories(categories).filter((cat) => !isProtectorCategory(cat, categories)),
    [categories]
  );

  const phoneCaseProducts = useMemo(() => {
    const sets = getProtectorCategorySets(categories);
    const nonProtectors = products.filter((p) => !isProtectorProduct(p, categories, sets));
    const names = getCategoryAndDescendantNames(categories, phoneCaseBrand);
    const filtered =
      phoneCaseBrand === 'All'
        ? nonProtectors
        : nonProtectors.filter(
            (p) =>
              names.has(p.category.trim().toLowerCase()) ||
              (p.alsoShowIn || []).some((c) => names.has(c.trim().toLowerCase()))
          );
    return filtered.slice(0, safeLimit);
  }, [products, categories, phoneCaseBrand, safeLimit]);

  if (loading && products.length === 0) {
    return null;
  }

  return (
    <section
      id="phone-cases-showcase"
      aria-labelledby="phone-cases-heading"
      className="max-w-[1180px] mx-auto px-3 sm:px-8 pt-6 pb-4"
    >
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2
            id="phone-cases-heading"
            className="font-brand text-xl sm:text-2xl font-semibold text-[#650108] tracking-tight"
          >
            {title?.trim() || 'Phone Cases'}
          </h2>
          <div className="w-10 h-[3px] bg-[#650108] mt-1.5" />
        </div>
        <button
          type="button"
          onClick={() => onViewAll(phoneCaseBrand)}
          className="hidden sm:inline-block text-xs font-semibold uppercase tracking-[1.6px] text-[#650108] hover:opacity-75 whitespace-nowrap cursor-pointer"
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
        {topLevelCategories.map((cat) => {
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
          <MobileHorizontalTrack className={showcaseGridClass}>
            {phoneCaseProducts.map((product) => (
              <PhoneCaseCard
                key={`cases-${product.id}`}
                product={product}
                isWishlisted={wishlist.includes(product.id)}
                className={MOBILE_SLIDE_CARD_CLASS}
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
  );
}

export type ProtectorTab = 'all' | 'camera' | 'screen';

interface ProtectorsShowcaseProps extends Omit<ShowcaseBaseProps, 'onViewAll'> {
  categories: Category[];
  onViewAll: (category?: string, fallbackSearch?: string) => void;
}

export function ProtectorsShowcaseSection({
  products,
  categories,
  wishlist,
  loading,
  desktopColumns = 5,
  title,
  limit = 5,
  onSelectProduct,
  onQuickView,
  onToggleWishlist,
  onAddToCart,
  onViewAll,
}: ProtectorsShowcaseProps) {
  const showcaseGridClass = SHOWCASE_GRID_CLASSES[desktopColumns];
  const [selectedCardKey, setSelectedCardKey] = useState<string>('all');
  const [carouselPage, setCarouselPage] = useState(0);
  const pageSize = desktopColumns;
  const maxPoolSize = Math.max(15, Math.round(limit));

  const categorySets = useMemo(() => getProtectorCategorySets(categories), [categories]);

  const {
    screenProducts,
    cameraProducts,
    allProtectorProducts,
  } = useMemo(() => {
    const all: PhoneCaseProduct[] = [];
    const screen: PhoneCaseProduct[] = [];
    const camera: PhoneCaseProduct[] = [];

    for (const p of products) {
      if (!isProtectorProduct(p, categories, categorySets)) continue;
      all.push(p);
      if (isScreenProtectorProduct(p, categories, categorySets)) screen.push(p);
      if (isCameraProtectorProduct(p, categories, categorySets)) camera.push(p);
    }

    return {
      screenProducts: screen,
      cameraProducts: camera,
      allProtectorProducts: all,
    };
  }, [products, categories, categorySets]);

  const {
    cards: protectorTabs,
    parentCategoryName: parentProtectorCategoryName,
  } = useMemo(
    () => buildProtectorSubcategoryCards(categories, products),
    [categories, products]
  );

  const activeTab = useMemo(
    () => protectorTabs.find((c) => c.key === selectedCardKey),
    [protectorTabs, selectedCardKey]
  );

  const matchingProducts = useMemo(() => {
    let list: PhoneCaseProduct[] = allProtectorProducts;
    if (activeTab) {
      if (activeTab.kind === 'screen') {
        list = screenProducts;
      } else if (activeTab.kind === 'camera') {
        list = cameraProducts;
      } else if (activeTab.categoryName) {
        const names = getCategoryAndDescendantNames(categories, activeTab.categoryName);
        list = allProtectorProducts.filter(
          (p) =>
            names.has(p.category.trim().toLowerCase()) ||
            (p.alsoShowIn || []).some((c) => names.has(c.trim().toLowerCase()))
        );
      }
    }
    return list.slice(0, maxPoolSize);
  }, [activeTab, allProtectorProducts, screenProducts, cameraProducts, categories, maxPoolSize]);

  const totalPages = Math.max(1, Math.ceil(matchingProducts.length / pageSize));
  const safePage = Math.min(carouselPage, totalPages - 1);
  const desktopPageProducts = matchingProducts.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  );

  if (loading && products.length === 0) {
    return null;
  }

  const handleSelectTab = (nextKey: string) => {
    setSelectedCardKey((prev) => (prev === nextKey ? 'all' : nextKey));
    setCarouselPage(0);
  };

  const handleViewAll = () => {
    if (activeTab) {
      onViewAll(activeTab.categoryName);
      return;
    }
    onViewAll(parentProtectorCategoryName);
  };

  return (
    <section
      id="screen-camera-protectors-showcase"
      aria-labelledby="screen-camera-protectors-heading"
      className="max-w-[1180px] mx-auto px-3 sm:px-8 pt-6 pb-4"
    >
      {/* Header matching Phone Cases & reference layout */}
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2
            id="screen-camera-protectors-heading"
            className="font-brand text-xl sm:text-2xl font-semibold text-[#650108] tracking-tight"
          >
            {title?.trim() || 'Screen & Camera Protectors'}
          </h2>
          <div className="w-10 h-[3px] bg-[#650108] mt-1.5" />
        </div>
        <button
          type="button"
          onClick={handleViewAll}
          className="hidden sm:inline-block text-xs font-semibold uppercase tracking-[1.6px] text-[#650108] hover:opacity-75 whitespace-nowrap cursor-pointer"
        >
          view all
        </button>
      </div>

      {/* Outlined Subcategory Filter Pills */}
      <div
        role="tablist"
        aria-label="Filter Screen and Camera Protectors by subcategory"
        className="flex flex-wrap items-center gap-2 mb-5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedCardKey === 'all'}
          onClick={() => {
            setSelectedCardKey('all');
            setCarouselPage(0);
          }}
          className={`px-3.5 py-1.5 rounded-full border text-[11px] font-medium uppercase tracking-[1.5px] transition-colors cursor-pointer ${
            selectedCardKey === 'all'
              ? 'bg-[#650108] border-[#650108] text-[#F2E8D2]'
              : 'bg-[#FFFDF8] border-[#650108]/40 text-[#650108] hover:border-[#650108]'
          }`}
        >
          All Protectors
        </button>
        {protectorTabs.map((tab) => {
          const isSelected = selectedCardKey === tab.key;
          return (
            <button
              key={`protector-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleSelectTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-full border text-[11px] font-medium uppercase tracking-[1.5px] transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#650108] border-[#650108] text-[#F2E8D2]'
                  : 'bg-[#FFFDF8] border-[#650108]/40 text-[#650108] hover:border-[#650108]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Protector Products Row / Carousel */}
      {matchingProducts.length === 0 ? (
        <div className="border border-[#DFCFB0] rounded-2xl py-10 text-center bg-[#FAF4E6] px-4">
          <p className="text-sm font-medium text-[#650108]">
            {activeTab
              ? `No products found in ${activeTab.label} yet.`
              : 'No screen or camera protectors found yet.'}
          </p>
          <p className="text-xs text-[#6B4C4E] mt-1">
            Add products under your Screen Protector or Camera Protector category to showcase them here.
          </p>
        </div>
      ) : (
        <>
          <div className="relative">
            {/* Mobile horizontal swipe track */}
            <MobileHorizontalTrack className="sm:hidden">
              {matchingProducts.map((product) => (
                <PhoneCaseCard
                  key={`protectors-mobile-${product.id}`}
                  product={product}
                  isWishlisted={wishlist.includes(product.id)}
                  className={MOBILE_SLIDE_CARD_CLASS}
                  onSelectProduct={onSelectProduct}
                  onQuickView={onQuickView}
                  onToggleWishlist={onToggleWishlist}
                  onAddToCart={onAddToCart}
                />
              ))}
            </MobileHorizontalTrack>

            {/* Desktop product grid row */}
            <div className={`hidden ${showcaseGridClass}`}>
              {desktopPageProducts.map((product) => (
                <PhoneCaseCard
                  key={`protectors-${product.id}`}
                  product={product}
                  isWishlisted={wishlist.includes(product.id)}
                  onSelectProduct={onSelectProduct}
                  onQuickView={onQuickView}
                  onToggleWishlist={onToggleWishlist}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <>
                {safePage > 0 && (
                  <button
                    type="button"
                    onClick={() => setCarouselPage((p) => Math.max(0, p - 1))}
                    aria-label="Previous protector products"
                    className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#650108]/90 text-[#F2E8D2] shadow-lg items-center justify-center hover:bg-[#650108] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCarouselPage((p) => (p + 1) % totalPages)}
                  aria-label="Next protector products"
                  className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#650108]/90 text-[#F2E8D2] shadow-lg items-center justify-center hover:bg-[#650108] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <div className="mt-4 flex justify-center sm:hidden">
            <button
              type="button"
              onClick={handleViewAll}
              className="px-5 py-2.5 rounded-xl border border-[#650108] bg-[#FFFDF8] text-[#650108] text-xs font-semibold uppercase tracking-[1.6px] inline-flex items-center gap-2 hover:bg-[#650108] hover:text-[#F2E8D2] transition-colors cursor-pointer"
            >
              <span>
                {activeTab ? `View All ${activeTab.label}` : 'View All Protectors'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

interface CatalogShowcaseSectionsProps {
  products: PhoneCaseProduct[];
  categories: Category[];
  wishlist: string[];
  loading: boolean;
  desktopColumns?: 2 | 3 | 4 | 5;
  onSelectProduct: (product: PhoneCaseProduct) => void;
  onQuickView: (product: PhoneCaseProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: PhoneCaseProduct) => void;
  onViewAll: (category?: string) => void;
}

export function CatalogShowcaseSections(props: CatalogShowcaseSectionsProps) {
  return (
    <div className="space-y-6">
      <BestsellingShowcaseSection {...props} />
      <PhoneCasesShowcaseSection {...props} />
    </div>
  );
}
