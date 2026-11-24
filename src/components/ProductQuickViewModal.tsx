import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  X,
} from 'lucide-react';
import type { AddCartItemMeta } from '../context/CartContext';
import { formatTaka, type PhoneCaseProduct } from '../models/phoneCase';

interface ProductQuickViewModalProps {
  product: PhoneCaseProduct | null;
  isWishlisted: boolean;
  takePreOrders?: boolean;
  shippingInsideDhaka?: number;
  shippingOutsideDhaka?: number;
  onClose: () => void;
  onAddToCart: (
    product: PhoneCaseProduct,
    model?: string,
    qty?: number,
    meta?: AddCartItemMeta
  ) => void;
  onToggleWishlist: (productId: string) => void;
  onOpenFullDetails: (product: PhoneCaseProduct) => void;
}

export function ProductQuickViewModal({
  product,
  isWishlisted,
  takePreOrders = false,
  shippingInsideDhaka = 60,
  shippingOutsideDhaka = 120,
  onClose,
  onAddToCart,
  onToggleWishlist,
  onOpenFullDetails,
}: ProductQuickViewModalProps) {
  const images = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set([product.image, ...(product.galleryImages || [])].filter(Boolean)));
  }, [product]);

  const optionGroups = useMemo(() => {
    if (!product) return [];

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
  const [imageError, setImageError] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectionError, setSelectionError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product) return;
    setActiveImageIdx(0);
    setImageError(false);
    setQuantity(1);
    setSelectionError('');
    const initialSelection: Record<string, string> = {};
    for (const group of optionGroups) {
      if (group.values.length === 1) {
        initialSelection[group.name] = group.values[0];
      }
    }
    setSelectedOptions(initialSelection);
  }, [product, optionGroups]);

  useEffect(() => {
    if (!product) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const allOptionsSelected = optionGroups.every((g) => Boolean(selectedOptions[g.name]));
  const combinedSelectionLabel = allOptionsSelected
    ? optionGroups.map((g) => selectedOptions[g.name]).join(' / ')
    : '';

  const activeVariant =
    product.variants && product.variants.length > 0 && allOptionsSelected
      ? product.variants.find(
          (v) =>
            v.active !== false &&
            v.label
              .split('/')
              .map((p) => p.trim())
              .join(' / ')
              .toLowerCase() === combinedSelectionLabel.toLowerCase()
        )
      : undefined;

  const displayPrice = activeVariant ? activeVariant.price : product.price;
  const displayOriginalPrice =
    product.originalPrice > displayPrice ? product.originalPrice : displayPrice;
  const discountPct =
    displayOriginalPrice > displayPrice
      ? Math.round(((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100)
      : product.discountPercent;
  const displaySku = activeVariant?.sku || product.sku;
  const effectiveStock = activeVariant ? activeVariant.stock : product.stock;
  const canPreOrder =
    product.preOrderMode === 'allow' || (product.preOrderMode !== 'disallow' && takePreOrders);
  const outOfStock = product.trackStock !== false && effectiveStock <= 0 && !canPreOrder;
  const maxQty =
    product.trackStock !== false && !canPreOrder && effectiveStock > 0 ? effectiveStock : 99;

  const currentImg = images[activeImageIdx] || product.image;

  function handleAddToCartClick() {
    if (!product || outOfStock) return;
    const missing = optionGroups
      .filter((g) => !selectedOptions[g.name])
      .map((g) => g.name);
    if (missing.length > 0) {
      setSelectionError(`Please select ${missing.join(' & ')} before adding to cart.`);
      return;
    }

    const chosenModelOrVariant =
      activeVariant?.label ||
      combinedSelectionLabel ||
      product.brandModels[0] ||
      'Standard Fit';

    const meta: AddCartItemMeta = {
      sku: displaySku,
      price: displayPrice,
      selectedOptions: optionGroups
        .filter((g) => Boolean(selectedOptions[g.name]))
        .map((g) => ({ name: g.name, value: selectedOptions[g.name] })),
    };

    onAddToCart(product, chosenModelOrVariant, quantity, meta);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#FFFDF8] border border-[#DFCFB0] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Top Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 bg-[#FAF4E6] border-b border-[#DFCFB0] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-medium text-[#6B4C4E] truncate">
            <span className="font-semibold text-[#650108]">{product.category}</span>
            {product.brand && product.brand !== product.category && (
              <>
                <span aria-hidden="true">·</span>
                <span>{product.brand}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px]">{displaySku}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick view"
            className="w-8 h-8 rounded-lg border border-[#DFCFB0] bg-[#FFFDF8] text-[#650108] hover:bg-[#650108] hover:text-[#F2E8D2] hover:border-[#650108] flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-7">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
            {/* Left: Studio Image + Gallery */}
            <div className="md:col-span-5 space-y-3">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#EDE2C9]">
                {imageError || !currentImg ? (
                  <div className="w-full h-full bg-gradient-to-br from-[#FAF4E6] to-[#F2E8D2] flex flex-col items-center justify-center p-6 text-center">
                    <Smartphone className="w-10 h-10 text-[#650108]/45 mb-2" />
                    <span className="text-xs font-medium text-[#6B4C4E]">{product.title}</span>
                  </div>
                ) : (
                  <img
                    src={currentImg}
                    alt={product.title}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                )}

                {discountPct > 0 && (
                  <span className="absolute top-3 left-3 bg-[#650108] text-[#F2E8D2] text-xs font-semibold px-2 py-0.5 rounded tabular-nums">
                    -{discountPct}% OFF
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={`${imgUrl}-${idx}`}
                      type="button"
                      onClick={() => {
                        setActiveImageIdx(idx);
                        setImageError(false);
                      }}
                      aria-label={`View image ${idx + 1}`}
                      className={`w-14 h-14 rounded-lg overflow-hidden border bg-white shrink-0 transition-all ${
                        idx === activeImageIdx
                          ? 'border-[#650108] ring-2 ring-[#650108]/25'
                          : 'border-[#DFCFB0] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${product.title} thumbnail ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Title, Price, Options, Add to Cart, Detailed Specs */}
            <div className="md:col-span-7 flex flex-col gap-5">
              <div>
                <h2
                  id="quick-view-title"
                  className="text-xl sm:text-2xl font-medium text-[#2B1416] leading-snug tracking-tight"
                >
                  {product.title}
                </h2>

                <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
                  <span className="text-2xl font-bold text-[#650108] tabular-nums">
                    {formatTaka(displayPrice)}
                  </span>
                  {displayOriginalPrice > displayPrice && (
                    <span className="text-sm text-[#9B7E7F] line-through tabular-nums">
                      {formatTaka(displayOriginalPrice)}
                    </span>
                  )}
                  <span className="text-xs font-medium text-[#6B4C4E] ml-auto tabular-nums">
                    {outOfStock
                      ? 'Currently out of stock'
                      : product.trackStock !== false && effectiveStock > 0
                        ? effectiveStock < 5
                          ? `Low stock (${effectiveStock} left)`
                          : `In stock (${effectiveStock} available)`
                        : 'Available for order'}
                  </span>
                </div>

                {(product.shortDescription || product.description) && (
                  <p className="mt-3 text-[13px] sm:text-sm text-[#4A2D2F] leading-relaxed">
                    {product.shortDescription || product.description}
                  </p>
                )}
              </div>

              {/* Variant / Phone Model Option Selectors */}
              {optionGroups.length > 0 && (
                <div className="space-y-3.5 pt-1 border-t border-[#EDE2C9]">
                  {optionGroups.map((group) => (
                    <div key={group.name} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#2B1416] uppercase tracking-[1.6px]">
                          {group.name}
                        </span>
                        {selectedOptions[group.name] && (
                          <span className="font-medium text-[#650108]">
                            {selectedOptions[group.name]}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.values.map((val) => {
                          const isSelected = selectedOptions[group.name] === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setSelectedOptions((prev) => ({ ...prev, [group.name]: val }));
                                setSelectionError('');
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-[#650108] text-[#F2E8D2] border-[#650108]'
                                  : 'bg-[#FAF4E6] text-[#2B1416] border-[#DFCFB0] hover:border-[#650108]/60'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{val}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {selectionError && (
                    <p className="text-xs font-medium text-red-700">{selectionError}</p>
                  )}
                </div>
              )}

              {/* Quantity + Add to Cart + Wishlist */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <div className="inline-flex items-center border border-[#DFCFB0] rounded-xl bg-[#FAF4E6] h-11">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-9 h-full flex items-center justify-center text-[#650108] hover:bg-[#F2E8D2] rounded-l-xl transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center text-sm font-semibold text-[#2B1416] tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    aria-label="Increase quantity"
                    className="w-9 h-full flex items-center justify-center text-[#650108] hover:bg-[#F2E8D2] rounded-r-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={handleAddToCartClick}
                  className="flex-1 min-w-[180px] h-11 px-5 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#4D0106] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>{outOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label={isWishlisted ? 'Remove from favorites' : 'Save to favorites'}
                  className="w-11 h-11 rounded-xl border border-[#DFCFB0] bg-[#FAF4E6] flex items-center justify-center hover:bg-[#F2E8D2] shrink-0 transition-colors"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isWishlisted ? 'fill-[#650108] text-[#650108]' : 'text-[#650108]'
                    }`}
                  />
                </button>
              </div>

              {/* Detailed Specifications Table */}
              <div className="border border-[#DFCFB0] rounded-xl bg-[#FAF4E6]/65 overflow-hidden">
                <div className="px-4 py-2.5 bg-[#FAF4E6] border-b border-[#DFCFB0] flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[1.6px] text-[#650108]">
                    Detailed Specifications
                  </h3>
                  <button
                    type="button"
                    onClick={() => onOpenFullDetails(product)}
                    className="text-xs font-semibold text-[#650108] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Full Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <dl className="divide-y divide-[#EDE2C9] text-xs sm:text-[13px] px-4">
                  <div className="py-2.5 grid grid-cols-3 gap-3">
                    <dt className="text-[#6B4C4E]">SKU</dt>
                    <dd className="col-span-2 font-mono font-semibold text-[#650108]">
                      {displaySku}
                    </dd>
                  </div>
                  <div className="py-2.5 grid grid-cols-3 gap-3">
                    <dt className="text-[#6B4C4E]">Category</dt>
                    <dd className="col-span-2 font-medium text-[#2B1416]">{product.category}</dd>
                  </div>
                  <div className="py-2.5 grid grid-cols-3 gap-3">
                    <dt className="text-[#6B4C4E]">Compatible Models</dt>
                    <dd className="col-span-2 text-[#2B1416]">{product.brandModels.join(', ')}</dd>
                  </div>
                  {product.specifications?.map((spec, idx) => (
                    <div key={`${spec.label}-${idx}`} className="py-2.5 grid grid-cols-3 gap-3">
                      <dt className="text-[#6B4C4E]">{spec.label}</dt>
                      <dd className="col-span-2 font-medium text-[#2B1416]">{spec.value}</dd>
                    </div>
                  ))}
                  {product.weightKg ? (
                    <div className="py-2.5 grid grid-cols-3 gap-3">
                      <dt className="text-[#6B4C4E]">Weight</dt>
                      <dd className="col-span-2 text-[#2B1416] tabular-nums">{product.weightKg} kg</dd>
                    </div>
                  ) : null}
                  <div className="py-2.5 grid grid-cols-3 gap-3">
                    <dt className="text-[#6B4C4E]">Delivery</dt>
                    <dd className="col-span-2 text-[#2B1416] tabular-nums">
                      Inside Dhaka {formatTaka(shippingInsideDhaka)} · Outside Dhaka{' '}
                      {formatTaka(shippingOutsideDhaka)}
                    </dd>
                  </div>
                  {product.description && product.description !== product.shortDescription && (
                    <div className="py-2.5 grid grid-cols-3 gap-3">
                      <dt className="text-[#6B4C4E]">Details</dt>
                      <dd className="col-span-2 text-[#2B1416] leading-relaxed">
                        {product.description}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
