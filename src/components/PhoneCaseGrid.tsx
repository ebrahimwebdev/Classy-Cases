import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Heart, ShoppingBag, Smartphone } from 'lucide-react';
import { formatTaka, type PhoneCaseProduct } from '../models/phoneCase';

interface PhoneCaseCardProps {
  product: PhoneCaseProduct;
  isWishlisted: boolean;
  onSelectProduct: (product: PhoneCaseProduct) => void;
  onQuickView?: (product: PhoneCaseProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: PhoneCaseProduct) => void;
}

export function PhoneCaseCard({
  product,
  isWishlisted,
  onSelectProduct,
  onQuickView,
  onToggleWishlist,
  onAddToCart,
}: PhoneCaseCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <article className="border border-[#DFCFB0] rounded-xl bg-[#FFFDF8] p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-[#650108]/40">
      <div>
        <div
          onClick={() => onSelectProduct(product)}
          className="relative aspect-square rounded-lg overflow-hidden bg-white border border-[#EDE2C9] mb-2.5 sm:mb-3 cursor-pointer group"
        >
          {imageError ? (
            <div className="w-full h-full bg-gradient-to-br from-[#FAF4E6] to-[#F2E8D2] flex flex-col items-center justify-center p-3 text-center">
              <Smartphone className="w-7 h-7 text-[#650108]/50 mb-1.5" />
              <span className="text-[11px] font-medium text-[#6B4C4E] line-clamp-2">{product.title}</span>
            </div>
          ) : (
            <img
              src={product.image}
              alt={product.title}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}

          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(product.id);
              }}
              title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FFFDF8]/95 border border-[#DFCFB0] flex items-center justify-center shadow-xs hover:bg-white transition-colors"
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-[#650108] text-[#650108]' : 'text-[#650108]'}`} />
            </button>

            {onQuickView && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickView(product);
                }}
                title="Quick View"
                aria-label={`Quick view ${product.title}`}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FFFDF8]/95 border border-[#DFCFB0] text-[#650108] flex items-center justify-center shadow-xs hover:bg-white transition-colors"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>

        <h3
          onClick={() => onSelectProduct(product)}
          className="text-[13px] sm:text-sm font-semibold text-[#2B1416] leading-snug line-clamp-2 min-h-[2.4rem] sm:min-h-[2.6rem] cursor-pointer hover:text-[#650108]"
        >
          {product.title}
        </h3>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-sm sm:text-[15px] font-bold text-[#650108] tabular-nums">
            {formatTaka(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-xs sm:text-[13px] text-[#9B7E7F] line-through tabular-nums">
              {formatTaka(product.originalPrice)}
            </span>
          )}
          {product.discountPercent > 0 && (
            <span className="bg-[#650108] text-[#F2E8D2] text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums">
              -{product.discountPercent}%
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAddToCart(product)}
        className="mt-3 w-full py-2.5 px-3 rounded-lg border border-[#650108]/35 bg-[#FFFDF8] text-xs sm:text-[13px] font-semibold text-[#650108] flex items-center justify-center gap-1.5 hover:bg-[#650108] hover:text-[#F2E8D2] hover:border-[#650108] transition-colors whitespace-nowrap"
      >
        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
        <span>Add to Cart</span>
      </button>
    </article>
  );
}

interface PhoneCaseGridProps {
  products: PhoneCaseProduct[];
  loading: boolean;
  wishlist: string[];
  searchQuery?: string;
  showCarouselControls: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelectProduct: (product: PhoneCaseProduct) => void;
  onQuickView?: (product: PhoneCaseProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: PhoneCaseProduct) => void;
  onResetFilters: () => void;
}

export function PhoneCaseGrid({
  products,
  loading,
  wishlist,
  searchQuery = '',
  showCarouselControls,
  currentPage,
  totalPages,
  onPageChange,
  onSelectProduct,
  onQuickView,
  onToggleWishlist,
  onAddToCart,
  onResetFilters,
}: PhoneCaseGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-[#DFCFB0] bg-[#FFFDF8] rounded-xl p-2.5 sm:p-3 animate-pulse">
            <div className="aspect-square rounded-lg bg-[#EADEC2]/70 mb-3" />
            <div className="h-4 bg-[#EADEC2]/70 rounded w-4/5 mb-2" />
            <div className="h-4 bg-[#EADEC2]/70 rounded w-2/5 mb-4" />
            <div className="h-9 bg-[#EADEC2]/70 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    const trimmedQuery = searchQuery.trim();
    return (
      <div className="border border-[#DFCFB0] rounded-2xl py-14 text-center bg-[#FAF4E6] px-4">
        <p className="text-sm font-medium text-[#2B1416]">
          {trimmedQuery
            ? `No phone cases matched "${trimmedQuery}".`
            : 'No phone cases matched your filter.'}
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-3 px-4 py-2 rounded-lg bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] transition-colors"
        >
          Show All Cases
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {products.map((product) => (
          <PhoneCaseCard
            key={product.id}
            product={product}
            isWishlisted={wishlist.includes(product.id)}
            onSelectProduct={onSelectProduct}
            onQuickView={onQuickView}
            onToggleWishlist={onToggleWishlist}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>

      {showCarouselControls && totalPages > 1 && (
        <>
          {currentPage > 0 && (
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
              aria-label="Previous products"
              className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#650108]/90 text-[#F2E8D2] shadow-lg items-center justify-center hover:bg-[#650108] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onPageChange((currentPage + 1) % totalPages)}
            aria-label="Next products"
            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#650108]/90 text-[#F2E8D2] shadow-lg items-center justify-center hover:bg-[#650108] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => onPageChange((currentPage - 1 + totalPages) % totalPages)}
              aria-label="Previous page"
              className="lg:hidden w-8 h-8 rounded-full border border-[#C9B38D] flex items-center justify-center text-[#650108] hover:bg-[#FAF4E6]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onPageChange(idx)}
                  aria-label={`Page ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentPage ? 'w-5 bg-[#650108]' : 'w-1.5 bg-[#CBB894] hover:bg-[#650108]/50'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => onPageChange((currentPage + 1) % totalPages)}
              aria-label="Next page"
              className="lg:hidden w-8 h-8 rounded-full border border-[#C9B38D] flex items-center justify-center text-[#650108] hover:bg-[#FAF4E6]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
