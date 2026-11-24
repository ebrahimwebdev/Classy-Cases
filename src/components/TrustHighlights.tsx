import React from 'react';
import { Award, ShieldCheck, Truck } from 'lucide-react';
import { formatTaka } from '../models/phoneCase';

interface TrustHighlightsProps {
  shippingInsideDhaka?: number;
  shippingOutsideDhaka?: number;
  freeShippingThreshold?: number;
}

export function TrustHighlights({
  shippingInsideDhaka = 60,
  shippingOutsideDhaka = 120,
  freeShippingThreshold = 1500,
}: TrustHighlightsProps) {
  const pillars = [
    {
      id: 'secure-payments',
      icon: ShieldCheck,
      title: 'Secure Payments',
      description:
        'Verified encrypted checkout with instant mobile wallet, card, and cash-on-delivery support.',
      meta: 'bKash · Nagad · SSLCommerz · COD',
    },
    {
      id: 'fast-shipping',
      icon: Truck,
      title: 'Fast Shipping',
      description: `24-hour Dhaka dispatch (${formatTaka(shippingInsideDhaka)}) and ${formatTaka(shippingOutsideDhaka)} nationwide courier delivery.`,
      meta: `Free shipping on orders ${formatTaka(freeShippingThreshold)}+`,
    },
    {
      id: 'warranty',
      icon: Award,
      title: 'Fit & Quality Warranty',
      description:
        'Every case is inspected for exact camera cutouts with a 7-day replacement guarantee.',
      meta: '7-Day Easy Exchange · Authentic Stock',
    },
  ];

  return (
    <section
      aria-label="Store Trust and Service Guarantees"
      className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-5 sm:pt-7 pb-2"
    >
      <div className="rounded-2xl border border-[#DFCFB0] bg-[#DFCFB0] overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-px shadow-xs">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.id}
              className="bg-[#FAF4E6] px-5 py-5 sm:px-6 sm:py-6 flex items-start gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-[#650108]/8 border border-[#650108]/15 text-[#650108] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <h2 className="font-brand text-base font-semibold text-[#2B1416] tracking-tight">
                  {pillar.title}
                </h2>
                <p className="mt-1 text-[13px] font-normal text-[#5E4042] leading-relaxed">
                  {pillar.description}
                </p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[1.6px] text-[#650108] tabular-nums">
                  {pillar.meta}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
