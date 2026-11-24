import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatTaka } from '../models/phoneCase';

export type DeliveryZone = 'inside_dhaka' | 'outside_dhaka';

export interface OrderSummaryProps {
  shippingInsideDhaka?: number;
  shippingOutsideDhaka?: number;
  freeShippingThreshold?: number;
  deliveryZone?: DeliveryZone;
  onDeliveryZoneChange?: (zone: DeliveryZone) => void;
  onProceedToCheckout: () => void;
}

export function calculateOrderTotals({
  subtotal,
  deliveryZone,
  shippingInsideDhaka,
  shippingOutsideDhaka,
  freeShippingThreshold,
}: {
  subtotal: number;
  deliveryZone: DeliveryZone;
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
  freeShippingThreshold: number;
}) {
  const qualifiesForFreeShipping =
    subtotal > 0 && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;
  const baseShipping =
    deliveryZone === 'outside_dhaka' ? shippingOutsideDhaka : shippingInsideDhaka;
  const estimatedShipping = subtotal === 0 || qualifiesForFreeShipping ? 0 : baseShipping;
  const total = subtotal + estimatedShipping;

  return {
    subtotal,
    estimatedShipping,
    total,
    qualifiesForFreeShipping,
  };
}

export function OrderSummary({
  shippingInsideDhaka = 60,
  shippingOutsideDhaka = 120,
  freeShippingThreshold = 1500,
  deliveryZone: controlledZone,
  onDeliveryZoneChange,
  onProceedToCheckout,
}: OrderSummaryProps) {
  const { cartSubtotal, closeDrawer } = useCart();
  const [internalZone, setInternalZone] = useState<DeliveryZone>('inside_dhaka');
  const [showShippingEstimator, setShowShippingEstimator] = useState(false);

  const deliveryZone = controlledZone ?? internalZone;
  const setDeliveryZone = (next: DeliveryZone) => {
    if (onDeliveryZoneChange) {
      onDeliveryZoneChange(next);
    } else {
      setInternalZone(next);
    }
  };

  const { subtotal, estimatedShipping, total, qualifiesForFreeShipping } = calculateOrderTotals({
    subtotal: cartSubtotal,
    deliveryZone,
    shippingInsideDhaka,
    shippingOutsideDhaka,
    freeShippingThreshold,
  });

  return (
    <section
      aria-label="Order Summary"
      className="px-5 sm:px-6 pt-4 pb-5 border-t border-neutral-200 bg-white space-y-3.5"
    >
      {/* Subtotal line matching screenshot */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-normal text-neutral-900">Subtotal</span>
        <span className="text-xl font-bold text-neutral-950 tabular-nums">
          {formatTaka(subtotal)}
        </span>
      </div>

      {/* Shipping estimate toggle & breakdown */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-[13px] text-neutral-500">
          <span>
            {qualifiesForFreeShipping
              ? 'Free nationwide delivery unlocked'
              : 'Delivery charge calculated at checkout'}
          </span>
          <button
            type="button"
            onClick={() => setShowShippingEstimator((v) => !v)}
            className="text-xs font-semibold text-neutral-800 underline underline-offset-4 hover:text-neutral-950 shrink-0"
          >
            {showShippingEstimator ? 'Hide estimate' : 'Estimate total'}
          </button>
        </div>

        {showShippingEstimator && (
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5 text-[13px]">
            <div className="grid grid-cols-2 gap-1.5 bg-neutral-200/70 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setDeliveryZone('inside_dhaka')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  deliveryZone === 'inside_dhaka'
                    ? 'bg-white text-neutral-950 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Inside Dhaka ({formatTaka(shippingInsideDhaka)})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryZone('outside_dhaka')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  deliveryZone === 'outside_dhaka'
                    ? 'bg-white text-neutral-950 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Outside Dhaka ({formatTaka(shippingOutsideDhaka)})
              </button>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>Estimated Shipping</span>
              <span className="font-semibold text-neutral-900 tabular-nums">
                {qualifiesForFreeShipping ? 'Free' : formatTaka(estimatedShipping)}
              </span>
            </div>
            <div className="flex items-center justify-between font-bold text-neutral-950 pt-1.5 border-t border-neutral-200">
              <span>Estimated Total</span>
              <span className="tabular-nums">{formatTaka(total)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 pt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setShowShippingEstimator((v) => !v)}
          className="py-3 px-4 rounded-xl border border-neutral-300 bg-white text-neutral-950 text-sm font-semibold hover:bg-neutral-50 transition-colors"
        >
          View cart
        </button>

        <button
          type="button"
          onClick={() => {
            closeDrawer();
            onProceedToCheckout();
          }}
          className="py-3 px-4 rounded-xl bg-[#111111] text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
        >
          Check out
        </button>
      </div>
    </section>
  );
}
