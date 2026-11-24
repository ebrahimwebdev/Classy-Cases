import React from 'react';

interface PartnerLogo {
  id: string;
  name: string;
  category: string;
  mark: React.ReactNode;
}

const PARTNER_LOGOS: PartnerLogo[] = [
  {
    id: 'steadfast',
    name: 'Steadfast',
    category: 'Logistics',
    mark: (
      <svg viewBox="0 0 28 28" className="w-6 h-6 text-[#650108] shrink-0" aria-hidden="true">
        <rect x="2" y="5" width="24" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 14h10M14 10l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'bkash',
    name: 'bKash',
    category: 'Merchant Pay',
    mark: (
      <svg viewBox="0 0 28 28" className="w-6 h-6 text-[#650108] shrink-0" aria-hidden="true">
        <path d="M6 5l11 7-4 11-7-9V5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M17 12l5-2-3 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'sslcommerz',
    name: 'SSLCommerz',
    category: 'Verified Gateway',
    mark: (
      <svg viewBox="0 0 28 28" className="w-6 h-6 text-[#650108] shrink-0" aria-hidden="true">
        <path d="M14 3l9 4v6c0 5.5-3.8 10.2-9 12-5.2-1.8-9-6.5-9-12V7l9-4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10.5 14l2.5 2.5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'syndee',
    name: 'SYNDEE',
    category: 'OEM Molding',
    mark: (
      <svg viewBox="0 0 28 28" className="w-6 h-6 text-[#650108] shrink-0" aria-hidden="true">
        <rect x="6" y="3" width="16" height="22" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="14" cy="14" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="12.5" y="19.5" width="3" height="2.2" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'pathao',
    name: 'Pathao Courier',
    category: 'Dhaka Express',
    mark: (
      <svg viewBox="0 0 28 28" className="w-6 h-6 text-[#650108] shrink-0" aria-hidden="true">
        <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 18V10h5a3 3 0 010 6h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'nagad',
    name: 'Nagad',
    category: 'Digital Wallet',
    mark: (
      <svg viewBox="0 0 28 28" className="w-6 h-6 text-[#650108] shrink-0" aria-hidden="true">
        <circle cx="14" cy="14" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10.5 18V10l7 8V10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'redx',
    name: 'RedX',
    category: 'Parcel Network',
    mark: (
      <svg viewBox="0 0 28 28" className="w-6 h-6 text-[#650108] shrink-0" aria-hidden="true">
        <path d="M5 7h18v14H5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 11l10 6M19 11L9 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface PartnerTestimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  organization: string;
  metric: string;
}

const PARTNER_TESTIMONIALS: PartnerTestimonial[] = [
  {
    id: 'pt-1',
    quote:
      'Every frosted MagSafe batch arrives with exact camera bezel tolerances. Fit-related exchanges dropped below 0.8% across 1,400+ Motorola and Redmi shipments.',
    author: 'Arifur Rahman',
    role: 'Founder',
    organization: 'GadgetHub Dhaka',
    metric: '1,400+ Cases Supplied',
  },
  {
    id: 'pt-2',
    quote:
      'Consistent N52 magnet strength and anti-yellowing clarity make Classy Cases our fastest-turning protective case line across our Bashundhara retail counter.',
    author: 'Tasnimul Hasan',
    role: 'Lead Merchandiser',
    organization: 'MobileCorner BD',
    metric: '99.2% Fit Accuracy',
  },
  {
    id: 'pt-3',
    quote:
      'Same-day Steadfast handoff and clean SKU barcoding keep nationwide customer deliveries predictable inside and outside Dhaka every single week.',
    author: 'Farzana Chowdhury',
    role: 'Operations Head',
    organization: 'TechZone Chattogram',
    metric: '24–48h Dispatch SLA',
  },
];

export function TrustedBySection() {
  const repeatedLogos = [...PARTNER_LOGOS, ...PARTNER_LOGOS];

  return (
    <section
      aria-labelledby="trusted-by-heading"
      className="border-t border-[#DFCFB0] bg-[#F2E8D2]"
    >
      <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-10">
        {/* Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2
              id="trusted-by-heading"
              className="text-xl sm:text-2xl font-bold text-[#650108] tracking-tight [text-wrap:balance]"
            >
              Trusted by Retail Partners, Couriers &amp; Payment Networks
            </h2>
            <p className="text-[13px] sm:text-sm text-[#6B4C4E] mt-2 leading-relaxed">
              Backed by nationwide express logistics, verified payment gateways, and precision OEM case manufacturing across Bangladesh.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[13px] text-[#6B4C4E] tabular-nums shrink-0">
            <span className="font-semibold text-[#650108]">12,500+ Orders Fulfilled</span>
            <span aria-hidden="true" className="text-[#C9B38D]">·</span>
            <span>4.9/5 Partner Rating</span>
          </div>
        </div>

        {/* Continuous Marquee Strip */}
        <div className="relative overflow-hidden border border-[#DFCFB0] bg-[#FFFDF8] rounded-2xl py-5 marquee-container">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-[#FFFDF8] to-transparent z-10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-[#FFFDF8] to-transparent z-10"
          />

          <div className="flex w-max animate-marquee items-center">
            {repeatedLogos.map((partner, idx) => (
              <div
                key={`${partner.id}-${idx}`}
                className="flex items-center gap-3 px-6 sm:px-9 border-r border-[#EDE2C9] shrink-0"
              >
                {partner.mark}
                <div className="leading-tight">
                  <div className="text-[15px] font-bold tracking-tight text-[#650108] whitespace-nowrap">
                    {partner.name}
                  </div>
                  <div className="text-xs text-[#6B4C4E] whitespace-nowrap">
                    {partner.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {PARTNER_TESTIMONIALS.map((item) => (
            <blockquote
              key={item.id}
              className="border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] p-5 sm:p-6 flex flex-col justify-between gap-5"
            >
              <p className="text-[13px] sm:text-sm text-[#2B1416] leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </p>

              <footer className="pt-4 border-t border-[#EDE2C9] flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-[#650108] truncate">
                    {item.author}
                  </div>
                  <div className="text-xs text-[#6B4C4E] truncate mt-0.5">
                    {item.role} · {item.organization}
                  </div>
                </div>
                <div className="text-xs font-semibold text-[#650108] tabular-nums whitespace-nowrap shrink-0">
                  {item.metric}
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
