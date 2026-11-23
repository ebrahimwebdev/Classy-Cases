import React, { useState } from 'react';
import { Truck } from 'lucide-react';
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
  const { cartSubtotal, cartCount, closeDrawer } = useCart();
  const [internalZone, setInternalZone] = useState<DeliveryZone>('inside_dhaka');

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
      className="p-5 sm:p-6 border-t border-neutral-200 bg-neutral-50 space-y-3.5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
          Order Summary
        </h3>
        <span className="text-[11px] font-medium text-neutral-500 tabular-nums">
          {cartCount} {cartCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Delivery Zone Toggle for Shipping Estimate */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
          <Truck className="w-3.5 h-3.5 text-neutral-500" />
          <span>Shipping Estimate Zone</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 bg-neutral-200/70 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setDeliveryZone('inside_dhaka')}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
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
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
              deliveryZone === 'outside_dhaka'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Outside Dhaka ({formatTaka(shippingOutsideDhaka)})
          </button>
        </div>
      </div>

      {/* Cost Breakdown */}
      <dl className="space-y-2 text-xs pt-1">
        <div className="flex items-center justify-between text-neutral-600">
          <dt>Subtotal</dt>
          <dd className="font-semibold text-neutral-900 tabular-nums">{formatTaka(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between text-neutral-600">
          <dt>Estimated Shipping</dt>
          <dd className="font-semibold tabular-nums">
            {qualifiesForFreeShipping ? (
              <span className="text-emerald-700">Free</span>
            ) : (
              <span className="text-neutral-900">{formatTaka(estimatedShipping)}</span>
            )}
          </dd>
        </div>
        <div className="pt-2.5 border-t border-neutral-200 flex items-center justify-between text-sm font-bold text-neutral-950">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatTaka(total)}</dd>
        </div>
      </dl>

      <p className="text-[11px] text-neutral-500">
        Pay securely online with bKash, Nagad, Visa/Mastercard, or Cash on Delivery.
      </p>

      <button
        type="button"
        onClick={() => {
          closeDrawer();
          onProceedToCheckout();
        }}
        className="w-full py-3 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
      >
        Proceed to Checkout
      </button>
    </section>
  );
}
