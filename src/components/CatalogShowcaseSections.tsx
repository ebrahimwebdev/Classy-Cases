import React, { useMemo, useState } from 'react';
import { ArrowRight, ShieldCheck, Smartphone } from 'lucide-react';
import type { PhoneCaseProduct } from '../models/phoneCase';
import type { Category } from '../types';
import { getCategoryAndDescendantNames, getTopLevelCategories } from '../utils/categoryTree';
import {
  CAMERA_PROTECTOR_RE,
  COMBINED_PROTECTOR_CATEGORY_RE,
  getProtectorCategorySets,
  isCameraProtectorProduct,
  isProtectorCategory,
  isProtectorProduct,
  isScreenProtectorProduct,
  PROTECTOR_CATEGORY_RE,
  SCREEN_PROTECTOR_RE,
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

interface ProtectorVisualCard {
  key: string;
  kind: 'screen' | 'camera' | 'custom';
  label: string;
  categoryName?: string;
  image?: string;
}

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
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const safeLimit = Math.min(12, Math.max(2, Math.round(limit)));

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
    visualCards,
    parentProtectorCategoryName,
    screenCategoryName,
    cameraCategoryName,
  } = useMemo(() => {
    const activeCats = categories.filter((c) => c.active !== false && c.name.trim());
    const combinedParent = activeCats.find((c) => COMBINED_PROTECTOR_CATEGORY_RE.test(c.name.trim()));

    const findBestMatch = (re: RegExp): Category | undefined => {
      const childMatch = combinedParent
        ? activeCats.find(
            (c) =>
              c.parentId === combinedParent.id &&
              !COMBINED_PROTECTOR_CATEGORY_RE.test(c.name) &&
              re.test(c.name)
          )
        : undefined;
      if (childMatch) return childMatch;
      return activeCats.find((c) => !COMBINED_PROTECTOR_CATEGORY_RE.test(c.name) && re.test(c.name));
    };

    const screenCat = findBestMatch(SCREEN_PROTECTOR_RE);
    const cameraCat = findBestMatch(CAMERA_PROTECTOR_RE);

    const cards: ProtectorVisualCard[] = [
      {
        key: 'screen',
        kind: 'screen',
        label: screenCat?.name?.trim() || 'Screen Protector',
        categoryName: screenCat?.name?.trim(),
        image: screenCat?.image?.trim() || screenProducts[0]?.image || undefined,
      },
      {
        key: 'camera',
        kind: 'camera',
        label: cameraCat?.name?.trim() || 'Camera Protector',
        categoryName: cameraCat?.name?.trim(),
        image: cameraCat?.image?.trim() || cameraProducts[0]?.image || undefined,
      },
    ];

    if (combinedParent) {
      const knownIds = new Set([screenCat?.id, cameraCat?.id].filter(Boolean));
      for (const child of activeCats) {
        if (child.parentId === combinedParent.id && !knownIds.has(child.id)) {
          cards.push({
            key: `cat-${child.id}`,
            kind: 'custom',
            label: child.name.trim(),
            categoryName: child.name.trim(),
            image: child.image?.trim() || undefined,
          });
        }
      }
    }

    const fallbackParent =
      combinedParent?.name?.trim() ||
      activeCats.find((c) => PROTECTOR_CATEGORY_RE.test(c.name))?.name?.trim() ||
      '';

    return {
      visualCards: cards,
      parentProtectorCategoryName: fallbackParent,
      screenCategoryName: screenCat?.name?.trim() || fallbackParent,
      cameraCategoryName: cameraCat?.name?.trim() || fallbackParent,
    };
  }, [categories, screenProducts, cameraProducts]);

  const activeCard = useMemo(
    () => visualCards.find((c) => c.key === selectedCardKey),
    [visualCards, selectedCardKey]
  );

  const displayedProducts = useMemo(() => {
    if (!activeCard) {
      return allProtectorProducts.slice(0, safeLimit);
    }
    if (activeCard.kind === 'screen') {
      return screenProducts.slice(0, safeLimit);
    }
    if (activeCard.kind === 'camera') {
      return cameraProducts.slice(0, safeLimit);
    }
    if (activeCard.categoryName) {
      const names = getCategoryAndDescendantNames(categories, activeCard.categoryName);
      return allProtectorProducts
        .filter(
          (p) =>
            names.has(p.category.trim().toLowerCase()) ||
            (p.alsoShowIn || []).some((c) => names.has(c.trim().toLowerCase()))
        )
        .slice(0, safeLimit);
    }
    return allProtectorProducts.slice(0, safeLimit);
  }, [activeCard, allProtectorProducts, screenProducts, cameraProducts, categories, safeLimit]);

  if (loading && products.length === 0) {
    return null;
  }

  const handleViewAll = () => {
    if (activeCard?.kind === 'screen') {
      if (screenCategoryName) {
        onViewAll(screenCategoryName);
      } else {
        onViewAll('All', 'screen protector');
      }
      return;
    }
    if (activeCard?.kind === 'camera') {
      if (cameraCategoryName) {
        onViewAll(cameraCategoryName);
      } else {
        onViewAll('All', 'camera protector');
      }
      return;
    }
    if (activeCard?.categoryName) {
      onViewAll(activeCard.categoryName);
      return;
    }
    if (parentProtectorCategoryName) {
      onViewAll(parentProtectorCategoryName);
    } else {
      onViewAll('All', 'protector');
    }
  };

  return (
    <section
      id="screen-camera-protectors-showcase"
      aria-labelledby="screen-camera-protectors-heading"
      className="max-w-[1180px] mx-auto px-3 sm:px-8 pt-8 pb-6"
    >
      {/* Centered Heading matching reference design */}
      <div className="relative flex items-center justify-center mb-6 sm:mb-8">
        <h2
          id="screen-camera-protectors-heading"
          className="font-brand text-lg sm:text-2xl font-semibold text-[#650108] uppercase tracking-[0.12em] sm:tracking-[0.16em] text-center"
        >
          {title?.trim() || 'Screen & Camera Protectors'}
        </h2>
        <button
          type="button"
          onClick={handleViewAll}
          className="hidden sm:inline-block sm:absolute sm:right-0 text-xs font-semibold uppercase tracking-[1.6px] text-[#650108] hover:opacity-75 whitespace-nowrap cursor-pointer"
        >
          view all
        </button>
      </div>

      {/* Category Picture Cards Row matching reference layout */}
      <div
        role="tablist"
        aria-label="Screen and Camera Protector Categories"
        className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-start gap-4 sm:gap-5 mb-6"
      >
        {visualCards.map((card) => {
          const isSelected = selectedCardKey === card.key;
          const hasValidImage = Boolean(card.image && !failedImages[card.key]);
          return (
            <button
              key={card.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() =>
                setSelectedCardKey((prev) => (prev === card.key ? 'all' : card.key))
              }
              className="group flex flex-col items-center w-full sm:w-[190px] md:w-[205px] focus:outline-none cursor-pointer"
            >
              <div
                className={`w-full aspect-square rounded-2xl bg-white border flex items-center justify-center p-2.5 overflow-hidden transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md ${
                  isSelected
                    ? 'border-[#650108] ring-2 ring-[#650108]/25 shadow-sm'
                    : 'border-[#DFCFB0]/80 shadow-xs group-hover:border-[#650108]/50'
                }`}
              >
                {hasValidImage ? (
                  <img
                    src={card.image}
                    alt={card.label}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [card.key]: true }))
                    }
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-[#FAF4E6] flex flex-col items-center justify-center gap-2 text-[#650108]/75">
                    {card.kind === 'camera' ? (
                      <ShieldCheck className="w-10 h-10 stroke-[1.5]" aria-hidden="true" />
                    ) : (
                      <Smartphone className="w-10 h-10 stroke-[1.5]" aria-hidden="true" />
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B4C4E]">
                      {card.label}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`mt-2.5 text-xs sm:text-[13px] font-bold uppercase tracking-[0.06em] text-center transition-colors ${
                  isSelected ? 'text-[#650108]' : 'text-[#2B1416] group-hover:text-[#650108]'
                }`}
              >
                {card.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active filter chip when narrowed down to Screen or Camera card */}
      {activeCard && (
        <div className="flex items-center justify-between gap-3 mb-4 px-1">
          <div className="flex items-center gap-2 text-xs text-[#6B4C4E]">
            <span>
              Showing <strong className="text-[#650108]">{activeCard.label}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedCardKey('all')}
              className="underline font-medium text-[#650108] hover:opacity-75 cursor-pointer"
            >
              Show All
            </button>
          </div>
          <button
            type="button"
            onClick={handleViewAll}
            className="text-xs font-semibold text-[#650108] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open {activeCard.label} Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Protector Products Row */}
      {displayedProducts.length === 0 ? (
        <div className="border border-[#DFCFB0] rounded-2xl py-8 text-center bg-[#FAF4E6] px-4">
          <p className="text-sm font-medium text-[#650108]">
            {activeCard
              ? `No products found in ${activeCard.label} yet.`
              : 'No screen or camera protectors found yet.'}
          </p>
          <p className="text-xs text-[#6B4C4E] mt-1">
            Add products under your Screen Protector or Camera Protector category to showcase them here.
          </p>
        </div>
      ) : (
        <>
          <MobileHorizontalTrack className={showcaseGridClass}>
            {displayedProducts.map((product) => (
              <PhoneCaseCard
                key={`protectors-${product.id}`}
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
              onClick={handleViewAll}
              className="px-5 py-2.5 rounded-xl border border-[#650108] bg-[#FFFDF8] text-[#650108] text-xs font-semibold uppercase tracking-[1.6px] inline-flex items-center gap-2 hover:bg-[#650108] hover:text-[#F2E8D2] transition-colors cursor-pointer"
            >
              <span>
                {activeCard ? `View All ${activeCard.label}` : 'View All Protectors'}
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
