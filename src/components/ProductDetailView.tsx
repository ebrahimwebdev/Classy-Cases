import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronRight,
  Heart,
  Maximize2,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  X,
  Zap,
} from 'lucide-react';
import type { AddCartItemMeta } from '../context/CartContext';
import { formatTaka, type PhoneCaseProduct } from '../models/phoneCase';
import { PhoneCaseCard } from './PhoneCaseGrid';
import { MobileHorizontalTrack, MOBILE_SLIDE_CARD_CLASS } from './MobileHorizontalTrack';
import { Reviews } from './Reviews';

interface ProductDetailViewProps {
  product: PhoneCaseProduct;
  relatedProducts: PhoneCaseProduct[];
  wishlist: string[];
  shippingInsideDhaka?: number;
  shippingOutsideDhaka?: number;
  freeShippingThreshold?: number;
  reviewsEnabled?: boolean;
  onBack: () => void;
  onSelectProduct: (product: PhoneCaseProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (
    product: PhoneCaseProduct,
    model?: string,
    qty?: number,
    meta?: AddCartItemMeta
  ) => void;
  onBuyNow: (
    product: PhoneCaseProduct,
    model?: string,
    qty?: number,
    meta?: AddCartItemMeta
  ) => void;
  onOpenWhatsAppHelp: () => void;
  whatsappHref?: string;
  onShareToast: (message: string) => void;
}

export function ProductDetailView({
  product,
  relatedProducts,
  wishlist,
  shippingInsideDhaka = 60,
  shippingOutsideDhaka = 120,
  freeShippingThreshold = 1500,
  reviewsEnabled = true,
  onBack,
  onSelectProduct,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onOpenWhatsAppHelp,
  whatsappHref,
  onShareToast,
}: ProductDetailViewProps) {
  const images = Array.from(
    new Set([product.image, ...(product.galleryImages || [])].filter(Boolean))
  );

  const optionGroups = React.useMemo(() => {
    const validOptions = (product.variantOptions || [])
      .map((opt) => ({
        name: opt.name.trim(),
        values: Array.from(new Set(opt.values.map((v) => v.trim()).filter(Boolean))),
      }))
      .filter((opt) => opt.name && opt.values.length > 0);

    if (validOptions.length > 0) {
      return validOptions;
    }

    const activeVariants = (product.variants || []).filter((v) => v.active !== false);
    if (activeVariants.length > 0) {
      const splitRows = activeVariants.map((v) =>
        v.label.split('/').map((part) => part.trim()).filter(Boolean)
      );
      const maxCols = Math.max(...splitRows.map((parts) => parts.length));
      if (maxCols > 1) {
        return Array.from({ length: maxCols }, (_, colIdx) => ({
          name: colIdx === 0 ? 'Option 1' : colIdx === 1 ? 'Model' : `Option ${colIdx + 1}`,
          values: Array.from(
            new Set(splitRows.map((parts) => parts[colIdx]).filter((v): v is string => Boolean(v)))
          ),
        })).filter((g) => g.values.length > 0);
      }
      return [
        {
          name: 'Variant',
          values: Array.from(new Set(activeVariants.map((v) => v.label.trim()).filter(Boolean))),
        },
      ];
    }

    if (product.brandModels.length > 0) {
      return [
        {
          name: 'Model',
          values: product.brandModels,
        },
      ];
    }

    return [];
  }, [product]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    if (optionGroups.length === 1 && optionGroups[0].values.length === 1) {
      return { [optionGroups[0].name]: optionGroups[0].values[0] };
    }
    return {};
  });
  const [selectionError, setSelectionError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeInfoTab, setActiveInfoTab] = useState<'specs' | 'shipping'>('specs');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [compareActive, setCompareActive] = useState(false);

  useEffect(() => {
    setActiveImageIdx(0);
    if (optionGroups.length === 1 && optionGroups[0].values.length === 1) {
      setSelectedOptions({ [optionGroups[0].name]: optionGroups[0].values[0] });
    } else {
      setSelectedOptions({});
    }
    setSelectionError('');
    setQuantity(1);
    setActiveInfoTab('specs');
    setZoomOpen(false);
  }, [product, optionGroups]);

  const allOptionsSelected = optionGroups.every((g) => Boolean(selectedOptions[g.name]));
  const combinedSelectionLabel = allOptionsSelected
    ? optionGroups.map((g) => selectedOptions[g.name]).join(' / ')
    : '';

  const activeVariant = React.useMemo(() => {
    if (!product.variants || product.variants.length === 0 || !allOptionsSelected) {
      return undefined;
    }
    const target = combinedSelectionLabel.toLowerCase();
    return product.variants.find(
      (v) =>
        v.active !== false &&
        v.label
          .split('/')
          .map((p) => p.trim())
          .join(' / ')
          .toLowerCase() === target
    );
  }, [product.variants, allOptionsSelected, combinedSelectionLabel]);

  const displayPrice = activeVariant ? activeVariant.price : product.price;
  const displayOriginalPrice =
    product.originalPrice > displayPrice ? product.originalPrice : displayPrice;
  const savings = Math.max(0, displayOriginalPrice - displayPrice);
  const discountPct =
    displayOriginalPrice > displayPrice
      ? Math.round(((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100)
      : product.discountPercent;
  const displaySku = activeVariant?.sku || product.sku;
  const chosenModelOrVariant =
    activeVariant?.label ||
    combinedSelectionLabel ||
    product.brandModels[0] ||
    'Standard Fit';

  const cartItemMeta: AddCartItemMeta = {
    sku: displaySku,
    price: displayPrice,
    selectedOptions: optionGroups
      .filter((g) => Boolean(selectedOptions[g.name]))
      .map((g) => ({ name: g.name, value: selectedOptions[g.name] })),
  };

  const isWishlisted = wishlist.includes(product.id);
  const currentImg = images[activeImageIdx] || product.image;

  function validateOptionSelection(): boolean {
    const missing = optionGroups
      .filter((g) => !selectedOptions[g.name])
      .map((g) => g.name);
    if (missing.length > 0) {
      setSelectionError(`Please choose ${missing.join(' & ')} first.`);
      return false;
    }
    setSelectionError('');
    return true;
  }

  async function handleShare() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        onShareToast('Product link copied to clipboard.');
        return;
      }
    } catch {
      // fallback below
    }
    onShareToast(`Sharing "${product.title}"`);
  }

  return (
    <div className="bg-[#F2E8D2]">
      {/* Lightbox Zoom Preview */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Close zoom preview"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#FAF4E6] text-[#650108] flex items-center justify-center shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={currentImg}
            alt={product.title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-full rounded-2xl object-contain bg-white"
          />
        </div>
      )}

      <div className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-5 sm:pt-7 pb-14 space-y-10">
        {/* Back Breadcrumb */}
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6B4C4E] hover:text-[#650108] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {product.category} &amp; All Cases</span>
          </button>
        </div>

        {/* Top 2-Column Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-start">
          {/* Left: Gallery */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-[#DFCFB0] shadow-xs">
              <img
                src={currentImg}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />

              {/* Top-left Discount & SKU badges */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                {discountPct > 0 && (
                  <span className="px-2 py-1 rounded-md bg-[#650108] text-[#F2E8D2] text-[11px] font-bold tabular-nums">
                    -{discountPct}%
                  </span>
                )}
                <span className="px-2 py-1 rounded-md bg-[#FAF4E6]/95 border border-[#DFCFB0] text-[#650108] text-[11px] font-mono font-semibold">
                  {displaySku}
                </span>
              </div>

              {/* Top-right Expand button */}
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label="Zoom product image"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#FAF4E6]/95 border border-[#DFCFB0] text-[#650108] hover:bg-[#650108] hover:text-[#F2E8D2] flex items-center justify-center shadow-xs transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Bottom-left Slide Counter */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-[#650108]/90 text-[#F2E8D2] text-[11px] font-mono font-medium tabular-nums">
                {String(activeImageIdx + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {images.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all bg-white ${
                    idx === activeImageIdx
                      ? 'border-[#650108] ring-1 ring-[#650108]'
                      : 'border-[#DFCFB0] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${product.title} angle ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Title, Price, Variants, Actions, Help Card */}
          <div className="lg:col-span-6 space-y-5 bg-[#FFFDF8] border border-[#DFCFB0] rounded-2xl p-5 sm:p-7 shadow-xs">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-md bg-[#F2E8D2] text-[#650108] text-[11px] font-semibold uppercase tracking-[1.6px]">
                {product.category}
              </span>
              <h1 className="text-2xl sm:text-[28px] font-medium text-[#2B1416] leading-snug mt-3">
                {product.title}
              </h1>

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <span className="text-3xl font-bold text-[#650108] tabular-nums">
                  {formatTaka(displayPrice)}
                </span>
                {displayOriginalPrice > displayPrice && (
                  <span className="text-lg text-[#8E6F70] line-through tabular-nums">
                    {formatTaka(displayOriginalPrice)}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="px-2.5 py-1 rounded-md bg-[#F2E8D2] text-[#650108] text-xs font-bold tabular-nums">
                    -{discountPct}%
                  </span>
                )}
              </div>

              {savings > 0 && (
                <p className="text-sm font-semibold text-emerald-700 mt-1.5 tabular-nums">
                  You save {formatTaka(savings)} on this item
                </p>
              )}
            </div>

            <div className="border-t border-[#EDE2C9] pt-4 space-y-4">
              {/* Separate Option Rows */}
              {optionGroups.length > 0 && (
                <div className="space-y-4">
                  {optionGroups.map((group) => {
                    const currentVal = selectedOptions[group.name];
                    return (
                      <div key={group.name}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-sm font-bold text-[#2B1416]">
                            {group.name}
                          </span>
                          <span className="text-sm text-[#6B4C4E]">
                            {currentVal || 'Choose one'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {group.values.map((val) => {
                            const isSelected = currentVal === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  setSelectedOptions((prev) => ({
                                    ...prev,
                                    [group.name]: prev[group.name] === val ? '' : val,
                                  }));
                                  setSelectionError('');
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                                  isSelected
                                    ? 'border-[#650108] bg-[#650108] text-[#F2E8D2]'
                                    : 'border-[#DFCFB0] bg-[#FAF4E6] text-[#2B1416] hover:border-[#650108]'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {selectionError && (
                    <p className="text-sm font-medium text-[#650108]">{selectionError}</p>
                  )}
                </div>
              )}

              {/* Quantity + Add to cart */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center border border-[#DFCFB0] rounded-xl h-12 px-1.5 bg-[#FAF4E6] shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-9 h-full flex items-center justify-center text-[#650108] hover:opacity-75"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-9 text-center text-sm font-semibold text-[#2B1416] tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="w-9 h-full flex items-center justify-center text-[#650108] hover:opacity-75"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!validateOptionSelection()) return;
                    onAddToCart(product, chosenModelOrVariant, quantity, cartItemMeta);
                  }}
                  className="flex-1 h-12 rounded-xl border border-[#650108]/40 bg-[#FAF4E6] text-[#650108] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#F2E8D2] transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to cart</span>
                </button>
              </div>

              {/* Buy now + Heart */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!validateOptionSelection()) return;
                    onBuyNow(product, chosenModelOrVariant, quantity, cartItemMeta);
                  }}
                  className="flex-1 h-12 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#4D0106] transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy now</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                  className="w-12 h-12 rounded-xl border border-[#DFCFB0] bg-[#FAF4E6] flex items-center justify-center hover:bg-[#F2E8D2] shrink-0 transition-colors"
                >
                  <Heart
                    className={`w-4.5 h-4.5 ${
                      isWishlisted ? 'fill-[#650108] text-[#650108]' : 'text-[#650108]'
                    }`}
                  />
                </button>
              </div>

              {/* Compare & Share */}
              <div className="flex items-center gap-6 pt-1 text-sm font-medium text-[#6B4C4E]">
                <button
                  type="button"
                  onClick={() => {
                    setCompareActive((v) => !v);
                    onShareToast(
                      compareActive
                        ? 'Removed from quick compare.'
                        : `${product.title.slice(0, 26)}... marked for comparison.`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 hover:text-[#650108]"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Compare</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 hover:text-[#650108]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>

              {/* WhatsApp Need Help Choosing Card */}
              {whatsappHref ? (
                <a
                  href={`${whatsappHref}${whatsappHref.includes('?') ? '&' : '?'}text=${encodeURIComponent(
                    `Hi! I need help choosing ${product.title}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full border border-[#DFCFB0] bg-[#FAF4E6] rounded-xl px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#F2E8D2] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#650108]/10 text-[#650108] flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#650108]">Need help choosing?</div>
                      <div className="text-xs text-[#6B4C4E]">Chat with us on WhatsApp</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8E6F70] shrink-0" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onOpenWhatsAppHelp}
                  className="w-full border border-[#DFCFB0] bg-[#FAF4E6] rounded-xl px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#F2E8D2] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#650108]/10 text-[#650108] flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#650108]">Need help choosing?</div>
                      <div className="text-xs text-[#6B4C4E]">Chat with us on WhatsApp</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8E6F70] shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Middle Tabbed Specifications / Shipping & Return Card */}
        <section className="bg-[#FFFDF8] border border-[#DFCFB0] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="inline-flex items-center gap-1 bg-[#E4D5B7] p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => setActiveInfoTab('specs')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeInfoTab === 'specs'
                  ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                  : 'text-[#6B4C4E] hover:text-[#650108]'
              }`}
            >
              Specifications
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTab('shipping')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeInfoTab === 'shipping'
                  ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                  : 'text-[#6B4C4E] hover:text-[#650108]'
              }`}
            >
              Shipping &amp; Return
            </button>
          </div>

          {activeInfoTab === 'specs' ? (
            <div className="divide-y divide-[#EDE2C9] text-sm">
              <div className="py-3.5 grid grid-cols-3 gap-4">
                <span className="text-[#6B4C4E]">SKU</span>
                <span className="col-span-2 font-mono font-semibold text-[#650108]">
                  {displaySku}
                </span>
              </div>
              <div className="py-3.5 grid grid-cols-3 gap-4">
                <span className="text-[#6B4C4E]">Category</span>
                <span className="col-span-2 font-medium text-[#2B1416]">
                  {product.category}
                </span>
              </div>
              <div className="py-3.5 grid grid-cols-3 gap-4">
                <span className="text-[#6B4C4E]">Compatible Models</span>
                <span className="col-span-2 text-[#2B1416]">
                  {product.brandModels.join(', ')}
                </span>
              </div>
              {product.description && (
                <div className="py-3.5 grid grid-cols-3 gap-4">
                  <span className="text-[#6B4C4E]">Overview</span>
                  <span className="col-span-2 text-[#2B1416] leading-relaxed">
                    {product.description}
                  </span>
                </div>
              )}
              {product.specifications?.map((spec, idx) => (
                <div key={idx} className="py-3.5 grid grid-cols-3 gap-4">
                  <span className="text-[#6B4C4E]">{spec.label}</span>
                  <span className="col-span-2 text-[#2B1416] font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[#EDE2C9] text-sm">
              <div className="py-3.5 grid grid-cols-3 gap-4">
                <span className="text-[#6B4C4E]">Inside Dhaka</span>
                <span className="col-span-2 font-semibold text-[#2B1416]">
                  {formatTaka(shippingInsideDhaka)} (24–48 hours express delivery)
                </span>
              </div>
              <div className="py-3.5 grid grid-cols-3 gap-4">
                <span className="text-[#6B4C4E]">Outside Dhaka</span>
                <span className="col-span-2 font-semibold text-[#2B1416]">
                  {formatTaka(shippingOutsideDhaka)} (2–4 business days via courier)
                </span>
              </div>
              <div className="py-3.5 grid grid-cols-3 gap-4">
                <span className="text-[#6B4C4E]">Free Shipping</span>
                <span className="col-span-2 text-[#2B1416]">
                  Orders over {formatTaka(freeShippingThreshold)} qualify for free nationwide shipping.
                </span>
              </div>
              <div className="py-3.5 grid grid-cols-3 gap-4">
                <span className="text-[#6B4C4E]">Returns &amp; Exchange</span>
                <span className="col-span-2 text-[#2B1416]">
                  7-day hassle-free replacement guarantee if your case arrives damaged or does not fit your phone model.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Preserved Customer Reviews & Testimonials Section */}
        {reviewsEnabled && (
          <div className="border border-[#DFCFB0] rounded-2xl overflow-hidden bg-[#FFFDF8] shadow-xs">
            <Reviews
              productId={product.id}
              availableModels={product.brandModels}
              selectedModel={chosenModelOrVariant}
            />
          </div>
        )}

        {/* "You may also like" 4-Card Section */}
        {relatedProducts.length > 0 && (
          <section className="pt-4 space-y-7">
            <h2 className="font-brand text-2xl sm:text-3xl font-semibold text-[#650108] text-center tracking-tight">
              You may also like
            </h2>
            <MobileHorizontalTrack className="sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-5 sm:overflow-visible sm:pb-0">
              {relatedProducts.map((rel) => (
                <PhoneCaseCard
                  key={rel.id}
                  product={rel}
                  isWishlisted={wishlist.includes(rel.id)}
                  className={MOBILE_SLIDE_CARD_CLASS}
                  onSelectProduct={onSelectProduct}
                  onToggleWishlist={onToggleWishlist}
                  onAddToCart={(p) => onAddToCart(p)}
                />
              ))}
            </MobileHorizontalTrack>
          </section>
        )}
      </div>
    </div>
  );
}
