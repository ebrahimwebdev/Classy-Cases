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
import { formatTaka, type PhoneCaseProduct } from '../models/phoneCase';
import { PhoneCaseCard } from './PhoneCaseGrid';
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
  onAddToCart: (product: PhoneCaseProduct, model?: string, qty?: number) => void;
  onBuyNow: (product: PhoneCaseProduct, model?: string, qty?: number) => void;
  onOpenWhatsAppHelp: () => void;
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
    <div className="bg-white">
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
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white text-neutral-900 flex items-center justify-center shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={currentImg}
            alt={product.title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-full rounded-2xl object-contain"
          />
        </div>
      )}

      <div className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-5 sm:pt-7 pb-14 space-y-10">
        {/* Back Breadcrumb */}
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {product.category} &amp; All Cases</span>
          </button>
        </div>

        {/* Top 2-Column Hero Section matching reference screenshot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-start">
          {/* Left: Gallery */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
              <img
                src={currentImg}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />

              {/* Top-left Discount & SKU badges */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                {discountPct > 0 && (
                  <span className="px-2 py-1 rounded-md bg-neutral-950 text-white text-[11px] font-bold tabular-nums">
                    -{discountPct}%
                  </span>
                )}
                <span className="px-2 py-1 rounded-md bg-white/95 border border-neutral-200 text-neutral-800 text-[11px] font-mono font-semibold">
                  {displaySku}
                </span>
              </div>

              {/* Top-right Expand button */}
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label="Zoom product image"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 border border-neutral-200 text-neutral-700 hover:text-neutral-950 flex items-center justify-center shadow-xs transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Bottom-left Slide Counter */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-neutral-950/85 text-white text-[11px] font-mono font-medium tabular-nums">
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
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all bg-neutral-100 ${
                    idx === activeImageIdx
                      ? 'border-neutral-950 ring-1 ring-neutral-950'
                      : 'border-neutral-200 opacity-75 hover:opacity-100'
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
          <div className="lg:col-span-6 space-y-5">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-bold uppercase tracking-wider">
                {product.category}
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-neutral-950 leading-snug mt-2.5">
                {product.title}
              </h1>

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black text-neutral-950 tabular-nums">
                  {formatTaka(displayPrice)}
                </span>
                {displayOriginalPrice > displayPrice && (
                  <span className="text-base text-neutral-400 line-through tabular-nums">
                    {formatTaka(displayOriginalPrice)}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-900 text-xs font-bold tabular-nums">
                    -{discountPct}%
                  </span>
                )}
              </div>

              {savings > 0 && (
                <p className="text-xs font-semibold text-emerald-600 mt-1.5 tabular-nums">
                  You save {formatTaka(savings)} on this item
                </p>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-4 space-y-4">
              {/* Separate Option Rows matching reference screenshot (e.g. Color -> Choose one, Model -> Choose one) */}
              {optionGroups.length > 0 && (
                <div className="space-y-4">
                  {optionGroups.map((group) => {
                    const currentVal = selectedOptions[group.name];
                    return (
                      <div key={group.name}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs sm:text-[13px] font-bold text-neutral-950">
                            {group.name}
                          </span>
                          <span className="text-xs sm:text-[13px] text-neutral-500">
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
                                className={`px-4 py-2 rounded-lg text-xs sm:text-[13px] border transition-colors ${
                                  isSelected
                                    ? 'border-neutral-950 bg-neutral-950 text-white font-semibold'
                                    : 'border-neutral-300 bg-white text-neutral-900 font-medium hover:border-neutral-500'
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
                    <p className="text-xs font-medium text-red-600">{selectionError}</p>
                  )}
                </div>
              )}

              {/* Quantity + Add to cart */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center border border-neutral-200 rounded-xl h-11 px-1 bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-8 h-full flex items-center justify-center text-neutral-600 hover:text-neutral-950"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs sm:text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="w-8 h-full flex items-center justify-center text-neutral-600 hover:text-neutral-950"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!validateOptionSelection()) return;
                    onAddToCart(product, chosenModelOrVariant, quantity);
                  }}
                  className="flex-1 h-11 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
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
                    onBuyNow(product, chosenModelOrVariant, quantity);
                  }}
                  className="flex-1 h-11 rounded-xl bg-[#111111] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy now</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                  className="w-11 h-11 rounded-xl border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50 shrink-0 transition-colors"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isWishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-700'
                    }`}
                  />
                </button>
              </div>

              {/* Compare & Share */}
              <div className="flex items-center gap-5 pt-1 text-xs font-medium text-neutral-600">
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
                  className="inline-flex items-center gap-1.5 hover:text-neutral-950"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Compare</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 hover:text-neutral-950"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>

              {/* WhatsApp Need Help Choosing Card */}
              <button
                type="button"
                onClick={onOpenWhatsAppHelp}
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-950">Need help choosing?</div>
                    <div className="text-[11px] text-neutral-500">Chat with us on WhatsApp</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Tabbed Specifications / Shipping & Return Card */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="inline-flex items-center gap-1 bg-neutral-100/80 p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => setActiveInfoTab('specs')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeInfoTab === 'specs'
                  ? 'bg-white text-neutral-950 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Specifications
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTab('shipping')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeInfoTab === 'shipping'
                  ? 'bg-white text-neutral-950 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Shipping &amp; Return
            </button>
          </div>

          {activeInfoTab === 'specs' ? (
            <div className="divide-y divide-neutral-100 text-xs">
              <div className="py-3 grid grid-cols-3 gap-4">
                <span className="text-neutral-500">SKU</span>
                <span className="col-span-2 font-mono font-semibold text-neutral-900">
                  {displaySku}
                </span>
              </div>
              <div className="py-3 grid grid-cols-3 gap-4">
                <span className="text-neutral-500">Category</span>
                <span className="col-span-2 font-medium text-neutral-900">
                  {product.category}
                </span>
              </div>
              <div className="py-3 grid grid-cols-3 gap-4">
                <span className="text-neutral-500">Compatible Models</span>
                <span className="col-span-2 text-neutral-800">
                  {product.brandModels.join(', ')}
                </span>
              </div>
              {product.description && (
                <div className="py-3 grid grid-cols-3 gap-4">
                  <span className="text-neutral-500">Overview</span>
                  <span className="col-span-2 text-neutral-700 leading-relaxed">
                    {product.description}
                  </span>
                </div>
              )}
              {product.specifications?.map((spec, idx) => (
                <div key={idx} className="py-3 grid grid-cols-3 gap-4">
                  <span className="text-neutral-500">{spec.label}</span>
                  <span className="col-span-2 text-neutral-900 font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 text-xs">
              <div className="py-3 grid grid-cols-3 gap-4">
                <span className="text-neutral-500">Inside Dhaka</span>
                <span className="col-span-2 font-semibold text-neutral-900">
                  {formatTaka(shippingInsideDhaka)} (24–48 hours express delivery)
                </span>
              </div>
              <div className="py-3 grid grid-cols-3 gap-4">
                <span className="text-neutral-500">Outside Dhaka</span>
                <span className="col-span-2 font-semibold text-neutral-900">
                  {formatTaka(shippingOutsideDhaka)} (2–4 business days via courier)
                </span>
              </div>
              <div className="py-3 grid grid-cols-3 gap-4">
                <span className="text-neutral-500">Free Shipping</span>
                <span className="col-span-2 text-neutral-800">
                  Orders over {formatTaka(freeShippingThreshold)} qualify for free nationwide shipping.
                </span>
              </div>
              <div className="py-3 grid grid-cols-3 gap-4">
                <span className="text-neutral-500">Returns &amp; Exchange</span>
                <span className="col-span-2 text-neutral-700">
                  7-day hassle-free replacement guarantee if your case arrives damaged or does not fit your phone model.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Preserved Customer Reviews & Testimonials Section */}
        {reviewsEnabled && (
          <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <Reviews
              productId={product.id}
              availableModels={product.brandModels}
              selectedModel={chosenModelOrVariant}
            />
          </div>
        )}

        {/* "You may also like" 4-Card Section matching screenshot */}
        {relatedProducts.length > 0 && (
          <section className="pt-4 space-y-7">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950 text-center tracking-tight">
              You may also like
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {relatedProducts.map((rel) => (
                <PhoneCaseCard
                  key={rel.id}
                  product={rel}
                  isWishlisted={wishlist.includes(rel.id)}
                  onSelectProduct={onSelectProduct}
                  onToggleWishlist={onToggleWishlist}
                  onAddToCart={(p) => onAddToCart(p)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
