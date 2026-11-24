import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, ShoppingBag, Smartphone } from 'lucide-react';
import { formatTaka, type PhoneCaseProduct } from '../models/phoneCase';

interface PhoneCaseCardProps {
  product: PhoneCaseProduct;
  isWishlisted: boolean;
  onSelectProduct: (product: PhoneCaseProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: PhoneCaseProduct) => void;
}

export function PhoneCaseCard({
  product,
  isWishlisted,
  onSelectProduct,
  onToggleWishlist,
  onAddToCart,
}: PhoneCaseCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <article className="border border-neutral-200 rounded-xl bg-white p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <div
          onClick={() => onSelectProduct(product)}
          className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100 mb-2.5 sm:mb-3 cursor-pointer group"
        >
          {imageError ? (
            <div className="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex flex-col items-center justify-center p-3 text-center">
              <Smartphone className="w-7 h-7 text-neutral-400 mb-1.5" />
              <span className="text-[11px] font-medium text-neutral-600 line-clamp-2">{product.title}</span>
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

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product.id);
            }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/95 border border-neutral-200 flex items-center justify-center shadow-xs hover:bg-white transition-colors"
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-700'}`} />
          </button>
        </div>

        <h3
          onClick={() => onSelectProduct(product)}
          className="text-[13px] sm:text-sm font-semibold text-neutral-900 leading-snug line-clamp-2 min-h-[2.4rem] sm:min-h-[2.6rem] cursor-pointer hover:underline"
        >
          {product.title}
        </h3>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-sm sm:text-[15px] font-bold text-neutral-900 tabular-nums">
            {formatTaka(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-xs sm:text-[13px] text-neutral-400 line-through tabular-nums">
              {formatTaka(product.originalPrice)}
            </span>
          )}
          {product.discountPercent > 0 && (
            <span className="bg-[#D91E18] text-white text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums">
              -{product.discountPercent}%
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAddToCart(product)}
        className="mt-3 w-full py-2.5 px-3 rounded-lg border border-neutral-300 bg-white text-xs sm:text-[13px] font-semibold text-neutral-900 flex items-center justify-center gap-1.5 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 transition-colors whitespace-nowrap"
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
  onToggleWishlist,
  onAddToCart,
  onResetFilters,
}: PhoneCaseGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-neutral-200 rounded-xl p-2.5 sm:p-3 animate-pulse">
            <div className="aspect-square rounded-lg bg-neutral-100 mb-3" />
            <div className="h-4 bg-neutral-100 rounded w-4/5 mb-2" />
            <div className="h-4 bg-neutral-100 rounded w-2/5 mb-4" />
            <div className="h-9 bg-neutral-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    const trimmedQuery = searchQuery.trim();
    return (
      <div className="border border-neutral-200 rounded-2xl py-14 text-center bg-neutral-50 px-4">
        <p className="text-sm font-medium text-neutral-700">
          {trimmedQuery
            ? `No phone cases matched "${trimmedQuery}".`
            : 'No phone cases matched your filter.'}
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-3 px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
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
              className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-neutral-950/90 text-white shadow-lg items-center justify-center hover:bg-neutral-950 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onPageChange((currentPage + 1) % totalPages)}
            aria-label="Next products"
            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-neutral-950/90 text-white shadow-lg items-center justify-center hover:bg-neutral-950 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => onPageChange((currentPage - 1 + totalPages) % totalPages)}
              aria-label="Previous page"
              className="lg:hidden w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 hover:bg-neutral-100"
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
                    idx === currentPage ? 'w-5 bg-neutral-950' : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => onPageChange((currentPage + 1) % totalPages)}
              aria-label="Next page"
              className="lg:hidden w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 hover:bg-neutral-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
