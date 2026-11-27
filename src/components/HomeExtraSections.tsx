import React, { useMemo } from 'react';
import { ArrowRight, Megaphone } from 'lucide-react';
import type { PhoneCaseProduct } from '../models/phoneCase';
import type { Category, ProductGridSourceMode } from '../types';
import { getCategoryAndDescendantNames, getTopLevelCategories } from '../utils/categoryTree';
import {
  isProtectorCategory,
  isProtectorProduct,
  PROTECTOR_CATEGORY_RE,
} from '../utils/protectorFilter';
import { CustomBrandLogo, MotorolaLogo, VivoLogo, XiaomiLogo } from './BrandLogos';
import { MobileHorizontalTrack, MOBILE_SLIDE_CARD_CLASS } from './MobileHorizontalTrack';
import { PhoneCaseCard } from './PhoneCaseGrid';

const SHOWCASE_GRID_CLASSES: Record<2 | 3 | 4 | 5, string> = {
  2: 'sm:grid sm:grid-cols-2 lg:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0',
  3: 'sm:grid sm:grid-cols-3 lg:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0',
  4: 'sm:grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0',
  5: 'sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0',
};

export function ScrollingNoticeBar({ notices }: { notices: string[] }) {
  const cleanNotices = notices.map((n) => n.trim()).filter(Boolean);
  if (cleanNotices.length === 0) return null;

  const loopItems =
    cleanNotices.length === 1
      ? [cleanNotices[0], cleanNotices[0], cleanNotices[0], cleanNotices[0]]
      : [...cleanNotices, ...cleanNotices, ...cleanNotices];

  return (
    <div
      role="region"
      aria-label="Store Announcements"
      className="bg-[#650108] text-[#F2E8D2] border-b border-[#4A0106] overflow-hidden"
    >
      <div className="max-w-[1180px] mx-auto px-3 sm:px-8 py-2 flex items-center gap-3 overflow-hidden">
        <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F2E8D2]/15 text-[#F2E8D2]">
          <Megaphone className="w-3 h-3" aria-hidden="true" />
        </span>
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-6 whitespace-nowrap text-xs font-medium tracking-wide">
            {loopItems.map((text, idx) => (
              <React.Fragment key={`${idx}-${text.slice(0, 12)}`}>
                <span>{text}</span>
                {idx < loopItems.length - 1 && (
                  <span aria-hidden="true" className="text-[#F2E8D2]/45">
                    •
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PromoBannerSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  ctaLabel?: string;
  targetCategory?: string;
  imageUrl?: string;
  theme?: 'maroon' | 'cream' | 'dark';
  onShopNow: (categoryName?: string) => void;
}

export function PromoBannerSection({
  title,
  subtitle,
  badge,
  ctaLabel,
  targetCategory,
  imageUrl,
  theme = 'maroon',
  onShopNow,
}: PromoBannerSectionProps) {
  const palette =
    theme === 'cream'
      ? {
          wrap: 'bg-[#FAF4E6] border-[#DFCFB0] text-[#2B1416]',
          badge: 'bg-[#650108]/10 text-[#650108]',
          heading: 'text-[#650108]',
          sub: 'text-[#5E4042]',
          btn: 'bg-[#650108] text-[#F2E8D2] hover:bg-[#4A0106]',
        }
      : theme === 'dark'
        ? {
            wrap: 'bg-[#2B1416] border-[#432325] text-[#F2E8D2]',
            badge: 'bg-[#F2E8D2]/15 text-[#F2E8D2]',
            heading: 'text-[#FFFDF8]',
            sub: 'text-[#E7D8C3]',
            btn: 'bg-[#F2E8D2] text-[#2B1416] hover:bg-white',
          }
        : {
            wrap: 'bg-[#650108] border-[#4A0106] text-[#F2E8D2]',
            badge: 'bg-[#F2E8D2]/15 text-[#F2E8D2]',
            heading: 'text-[#FFFDF8]',
            sub: 'text-[#F2E8D2]/85',
            btn: 'bg-[#F2E8D2] text-[#650108] hover:bg-white',
          };

  return (
    <section className="max-w-[1180px] mx-auto px-3 sm:px-8 py-4 sm:py-6">
      <div
        className={`rounded-2xl border overflow-hidden grid grid-cols-1 ${
          imageUrl ? 'md:grid-cols-[1.4fr_1fr]' : ''
        } items-center shadow-xs ${palette.wrap}`}
      >
        <div className="p-6 sm:p-9 space-y-3">
          {badge && (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[1.6px] ${palette.badge}`}
            >
              {badge}
            </span>
          )}
          <h2
            className={`font-brand text-2xl sm:text-3xl font-semibold tracking-tight ${palette.heading}`}
          >
            {title || 'Special Collection Offer'}
          </h2>
          {subtitle && (
            <p className={`text-sm leading-relaxed max-w-xl ${palette.sub}`}>
              {subtitle}
            </p>
          )}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onShopNow(targetCategory || 'All')}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[1.5px] inline-flex items-center gap-2 transition-colors cursor-pointer ${palette.btn}`}
            >
              <span>{ctaLabel?.trim() || 'Shop Now'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {imageUrl && (
          <div className="h-48 sm:h-60 md:h-full bg-black/10 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}

interface CustomProductRowSectionProps {
  sectionId: string;
  title: string;
  sourceMode: ProductGridSourceMode;
  categoryName?: string;
  limit?: number;
  desktopColumns?: 2 | 3 | 4 | 5;
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

export function CustomProductRowSection({
  sectionId,
  title,
  sourceMode,
  categoryName,
  limit = 5,
  desktopColumns = 5,
  products,
  categories,
  wishlist,
  loading,
  onSelectProduct,
  onQuickView,
  onToggleWishlist,
  onAddToCart,
  onViewAll,
}: CustomProductRowSectionProps) {
  const showcaseGridClass = SHOWCASE_GRID_CLASSES[desktopColumns];
  const safeLimit = Math.min(12, Math.max(2, Math.round(limit)));

  const rowProducts = useMemo(() => {
    const isExplicitProtectorCategory =
      sourceMode === 'category' &&
      Boolean(categoryName && PROTECTOR_CATEGORY_RE.test(categoryName.trim()));

    let list = isExplicitProtectorCategory
      ? [...products]
      : products.filter((p) => !isProtectorProduct(p, categories));

    if (sourceMode === 'category' && categoryName && categoryName !== 'All') {
      const names = getCategoryAndDescendantNames(categories, categoryName);
      list = list.filter(
        (p) =>
          names.has(p.category.trim().toLowerCase()) ||
          (p.alsoShowIn || []).some((c) => names.has(c.trim().toLowerCase()))
      );
    } else if (sourceMode === 'discounted') {
      list = list
        .filter((p) => p.discountPercent > 0)
        .sort((a, b) => b.discountPercent - a.discountPercent);
    } else if (sourceMode === 'featured') {
      list = list
        .filter((p) => Boolean(p.featured))
        .concat(list.filter((p) => !p.featured));
    } else if (sourceMode === 'bestselling') {
      list.sort(
        (a, b) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          b.discountPercent - a.discountPercent
      );
    } else if (sourceMode === 'newest') {
      list.reverse();
    }
    return list.slice(0, safeLimit);
  }, [products, categories, sourceMode, categoryName, safeLimit]);

  if (loading && products.length === 0) return null;
  if (rowProducts.length === 0) return null;

  const targetCat = sourceMode === 'category' && categoryName ? categoryName : 'All';

  return (
    <section
      aria-labelledby={`heading-${sectionId}`}
      className="max-w-[1180px] mx-auto px-3 sm:px-8 pt-6 pb-4"
    >
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2
            id={`heading-${sectionId}`}
            className="font-brand text-xl sm:text-2xl font-semibold text-[#650108] tracking-tight"
          >
            {title?.trim() || categoryName || 'Featured Products'}
          </h2>
          <div className="w-10 h-[3px] bg-[#650108] mt-1.5" />
        </div>
        <button
          type="button"
          onClick={() => onViewAll(targetCat)}
          className="hidden sm:inline-block text-xs font-semibold uppercase tracking-[1.6px] text-[#650108] hover:opacity-75 whitespace-nowrap cursor-pointer"
        >
          view all
        </button>
      </div>

      <MobileHorizontalTrack className={showcaseGridClass}>
        {rowProducts.map((product) => (
          <PhoneCaseCard
            key={`${sectionId}-${product.id}`}
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
          onClick={() => onViewAll(targetCat)}
          className="px-5 py-2.5 rounded-xl border border-[#650108] bg-[#FFFDF8] text-[#650108] text-xs font-semibold uppercase tracking-[1.6px] inline-flex items-center gap-2 hover:bg-[#650108] hover:text-[#F2E8D2] transition-colors cursor-pointer"
        >
          <span>{targetCat === 'All' ? 'View All' : `View All ${targetCat}`}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}

interface BrandStripSectionProps {
  title?: string;
  categories: Category[];
  failedCatImages: Record<string, boolean>;
  onImageError: (catId: string) => void;
  onSelectCategory: (categoryName: string) => void;
}

export function BrandStripSection({
  title,
  categories,
  failedCatImages,
  onImageError,
  onSelectCategory,
}: BrandStripSectionProps) {
  const brands = useMemo(
    () => getTopLevelCategories(categories).filter((c) => !isProtectorCategory(c, categories)),
    [categories]
  );
  if (brands.length === 0) return null;

  return (
    <section className="max-w-[1180px] mx-auto px-3 sm:px-8 py-6">
      {title && (
        <h2 className="font-brand text-lg sm:text-xl font-semibold text-[#650108] text-center mb-4 tracking-tight">
          {title}
        </h2>
      )}
      <div className="border border-[#DFCFB0] bg-[#FFFDF8] rounded-2xl p-4 sm:p-5 flex items-center gap-4 overflow-x-auto no-scrollbar justify-start sm:justify-center">
        {brands.map((cat) => (
          <button
            key={`brand-strip-${cat.id}`}
            type="button"
            onClick={() => onSelectCategory(cat.name)}
            className="shrink-0 px-4 py-2 rounded-xl border border-[#EDE2C9] bg-[#FAF4E6]/60 hover:border-[#650108]/50 hover:bg-[#FAF4E6] transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            {cat.image && !failedCatImages[cat.id] ? (
              <img
                src={cat.image}
                alt={cat.name}
                referrerPolicy="no-referrer"
                onError={() => onImageError(cat.id)}
                className="w-7 h-7 rounded-md object-contain"
              />
            ) : (
              <div className="scale-75 origin-center">
                {cat.brandKey === 'motorola' && <MotorolaLogo />}
                {cat.brandKey === 'vivo' && <VivoLogo />}
                {cat.brandKey === 'xiaomi' && <XiaomiLogo />}
                {cat.brandKey === 'custom' && <CustomBrandLogo name={cat.name} />}
              </div>
            )}
            <span className="text-xs font-semibold text-[#650108] whitespace-nowrap">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
