import React, { useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, Smartphone, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatTaka } from '../models/phoneCase';
import { OrderSummary, type DeliveryZone } from './OrderSummary';

interface CartDrawerProps {
  shippingInsideDhaka?: number;
  shippingOutsideDhaka?: number;
  freeShippingThreshold?: number;
  deliveryZone?: DeliveryZone;
  onDeliveryZoneChange?: (zone: DeliveryZone) => void;
  onProceedToCheckout: () => void;
}

function DrawerThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
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
      className="w-16 h-16 rounded-lg object-cover border border-neutral-200 shrink-0"
    />
  );
}

export function CartDrawer({
  shippingInsideDhaka = 60,
  shippingOutsideDhaka = 120,
  freeShippingThreshold = 1500,
  deliveryZone,
  onDeliveryZoneChange,
  onProceedToCheckout,
}: CartDrawerProps) {
  const {
    items,
    cartCount,
    cartSubtotal,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    clearCart,
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

  const remainingForFreeShipping =
    freeShippingThreshold > 0 ? Math.max(0, freeShippingThreshold - cartSubtotal) : 0;
  const freeShippingProgress =
    freeShippingThreshold > 0 ? Math.min(100, (cartSubtotal / freeShippingThreshold) * 100) : 100;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      <div className="fixed inset-0" onClick={closeDrawer} aria-hidden="true" />

      <aside className="relative z-10 bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-neutral-900" />
            <h2 className="text-base font-bold text-neutral-900">
              Shopping Bag <span className="tabular-nums">({cartCount})</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-medium text-neutral-500 hover:text-red-600 transition-colors px-2 py-1"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close shopping bag"
              className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Free Shipping Meter */}
        {items.length > 0 && freeShippingThreshold > 0 && (
          <div className="px-5 sm:px-6 py-3 bg-neutral-50 border-b border-neutral-200 space-y-1.5">
            <p className="text-xs text-neutral-700 font-medium">
              {remainingForFreeShipping === 0 ? (
                <span>Free nationwide delivery unlocked</span>
              ) : (
                <span>
                  Add <strong className="tabular-nums">{formatTaka(remainingForFreeShipping)}</strong> more for free
                  delivery
                </span>
              )}
            </p>
            <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div
                style={{ width: `${freeShippingProgress}%` }}
                className="h-full bg-neutral-950 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        )}

        {/* Itemized List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7 text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Your shopping bag is empty</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Add phone cases from the storefront to see them here.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="px-5 py-2.5 rounded-xl bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.productId}-${item.model}`}
                className="flex gap-3 pb-4 border-b border-neutral-100 last:border-b-0"
              >
                <DrawerThumb src={item.image} alt={item.title} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 line-clamp-2">{item.title}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{item.model}</p>

                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <div className="flex items-center border border-neutral-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.model, -1)}
                        aria-label="Decrease quantity"
                        className="p-1.5 text-neutral-600 hover:text-neutral-900"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-semibold tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.model, 1)}
                        aria-label="Increase quantity"
                        className="p-1.5 text-neutral-600 hover:text-neutral-900"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-neutral-900 tabular-nums">
                        {formatTaka(item.price * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.model)}
                        aria-label={`Remove ${item.title}`}
                        className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
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
