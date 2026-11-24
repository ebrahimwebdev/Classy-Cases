import React, { useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, Smartphone, SquarePen, Trash2, X } from 'lucide-react';
import { useCart, type CartEntry, type CartOptionTag } from '../context/CartContext';
import { formatTaka } from '../models/phoneCase';
import { OrderSummary, type DeliveryZone } from './OrderSummary';

interface CartDrawerProps {
  shippingInsideDhaka?: number;
  shippingOutsideDhaka?: number;
  freeShippingThreshold?: number;
  deliveryZone?: DeliveryZone;
  onDeliveryZoneChange?: (zone: DeliveryZone) => void;
  onProceedToCheckout: () => void;
  onEditItem?: (productId: string) => void;
}

function DrawerThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-16 h-16 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
        <Smartphone className="w-5 h-5 text-neutral-400" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-16 h-16 rounded-xl object-cover border border-neutral-200 shrink-0"
    />
  );
}

function getOptionTags(item: CartEntry): CartOptionTag[] {
  if (item.selectedOptions && item.selectedOptions.length > 0) {
    return item.selectedOptions;
  }
  const parts = item.model
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 2) {
    return [
      { name: 'Color', value: parts[0] },
      { name: 'Model', value: parts[1] },
    ];
  }
  if (parts.length > 2) {
    return parts.map((val, idx) => ({
      name: idx === 0 ? 'Option 1' : idx === parts.length - 1 ? 'Model' : `Option ${idx + 1}`,
      value: val,
    }));
  }
  return [{ name: 'Model', value: item.model || 'Standard Fit' }];
}

export function CartDrawer({
  shippingInsideDhaka = 60,
  shippingOutsideDhaka = 120,
  freeShippingThreshold = 1500,
  deliveryZone,
  onDeliveryZoneChange,
  onProceedToCheckout,
  onEditItem,
}: CartDrawerProps) {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
  } = useCart();

  useEffect(() => {
    if (!isDrawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart"
    >
      <div className="fixed inset-0" onClick={closeDrawer} aria-hidden="true" />

      <aside className="relative z-10 bg-white w-full max-w-[440px] h-full flex flex-col shadow-2xl">
        {/* Header matching screenshot */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-200 flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-medium text-neutral-950 tracking-tight">
            Shopping cart
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close shopping cart"
            className="p-1.5 rounded-lg text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Itemized Card List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7 text-neutral-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-neutral-900">Your shopping cart is empty</p>
                <p className="text-sm text-neutral-500 mt-1">
                  Add phone cases from the storefront to see them here.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="px-5 py-2.5 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => {
              const optionTags = getOptionTags(item);
              return (
                <div
                  key={`${item.productId}-${item.model}`}
                  className="rounded-2xl border border-neutral-200 bg-white p-3.5 sm:p-4 space-y-3"
                >
                  {/* Top Product Row */}
                  <div className="flex items-start gap-3.5">
                    <DrawerThumb src={item.image} alt={item.title} />
                    <p className="text-sm sm:text-[15px] font-semibold text-neutral-950 leading-snug line-clamp-2 flex-1 pt-0.5">
                      {item.title}
                    </p>
                  </div>

                  {/* Inner Gray Variant + Stepper Panel */}
                  <div className="bg-neutral-50 rounded-xl p-3.5 space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-2">
                        <div className="text-[13px] text-neutral-500 truncate">
                          SKU: <span className="font-mono">{item.sku || 'Standard'}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {optionTags.map((tag) => (
                            <span
                              key={`${tag.name}-${tag.value}`}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-neutral-200 bg-white text-xs text-neutral-500"
                            >
                              <span>{tag.name}:</span>
                              <strong className="font-semibold text-neutral-900">{tag.value}</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onEditItem && (
                          <button
                            type="button"
                            onClick={() => {
                              closeDrawer();
                              onEditItem(item.productId);
                            }}
                            aria-label={`Edit ${item.title}`}
                            className="w-9 h-9 rounded-xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.model)}
                          aria-label={`Remove ${item.title}`}
                          className="w-9 h-9 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Unit price + stepper + line total */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-neutral-500 tabular-nums">
                          {formatTaka(item.price)}
                        </span>
                        <div className="inline-flex items-center border border-neutral-200 bg-white rounded-xl h-9">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.model, -1)}
                            aria-label="Decrease quantity"
                            className="px-2.5 h-full flex items-center justify-center text-neutral-700 hover:text-neutral-950"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-sm font-medium text-neutral-950 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.model, 1)}
                            aria-label="Increase quantity"
                            className="px-2.5 h-full flex items-center justify-center text-neutral-700 hover:text-neutral-950"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <span className="text-[15px] font-bold text-neutral-950 tabular-nums">
                        {formatTaka(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Order Summary */}
        {items.length > 0 && (
          <OrderSummary
            shippingInsideDhaka={shippingInsideDhaka}
            shippingOutsideDhaka={shippingOutsideDhaka}
            freeShippingThreshold={freeShippingThreshold}
            deliveryZone={deliveryZone}
            onDeliveryZoneChange={onDeliveryZoneChange}
            onProceedToCheckout={onProceedToCheckout}
          />
        )}
      </aside>
    </div>
  );
}
