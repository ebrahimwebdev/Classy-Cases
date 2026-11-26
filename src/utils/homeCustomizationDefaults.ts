import type { HomeCustomizationConfig, HomeSectionConfig, HomeSectionId } from '../types';

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  {
    id: 'hero',
    label: 'Hero Video Banner',
    enabled: true,
    title: 'Hero Video Banner',
    subtitle: 'Fullscreen hero video slides, headline & CTA buttons',
  },
  {
    id: 'trust_highlights',
    label: 'Trust & Service Highlights',
    enabled: true,
    title: 'Store Trust & Service Guarantees',
    subtitle: 'Secure payments, fast courier dispatch & 7-day replacement guarantee',
  },
  {
    id: 'featured_categories',
    label: 'Featured Categories Slider',
    enabled: true,
    title: 'Featured Categories',
    subtitle: 'Continuous auto-sliding category brand cards',
  },
  {
    id: 'bestselling',
    label: 'Bestselling Products',
    enabled: true,
    title: 'Bestselling',
    subtitle: 'Highlighted featured & highest-discount cases',
  },
  {
    id: 'phone_cases',
    label: 'Phone Cases Showcase',
    enabled: true,
    title: 'Phone Cases',
    subtitle: 'Brand-tabbed showcase with instant category filter pills',
  },
  {
    id: 'explore_more',
    label: 'Explore More Products',
    enabled: true,
    title: 'Explore More Products',
    subtitle: 'Main homepage product carousel & expandable grid',
  },
  {
    id: 'customer_reviews',
    label: 'Customer Reviews',
    enabled: true,
    title: 'Customer Reviews',
    subtitle: 'Continuous verified buyer review carousel',
  },
  {
    id: 'trusted_by',
    label: 'Trusted By & Partners',
    enabled: true,
    title: 'Trusted by Retail Partners, Couriers & Payment Networks',
    subtitle:
      'Backed by nationwide express logistics, verified payment gateways, and precision OEM case manufacturing across Bangladesh.',
  },
];

export const DEFAULT_HOME_CUSTOMIZATION: HomeCustomizationConfig = {
  sections: DEFAULT_HOME_SECTIONS.map((item) => ({ ...item })),
  bestsellingLimit: 5,
  phoneCasesLimit: 5,
};

const VALID_SECTION_IDS = new Set<HomeSectionId>(
  DEFAULT_HOME_SECTIONS.map((section) => section.id)
);

const DEFAULT_SECTION_MAP = new Map<HomeSectionId, HomeSectionConfig>(
  DEFAULT_HOME_SECTIONS.map((section) => [section.id, section])
);

function clampLimit(val: unknown, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(12, Math.max(2, Math.round(num)));
}

export function mergeHomeCustomization(
  raw?: Partial<HomeCustomizationConfig> | null
): HomeCustomizationConfig {
  const seen = new Set<HomeSectionId>();
  const mergedSections: HomeSectionConfig[] = [];

  if (Array.isArray(raw?.sections)) {
    for (const entry of raw.sections) {
      if (!entry || typeof entry !== 'object') continue;
      const id = entry.id as HomeSectionId;
      if (!VALID_SECTION_IDS.has(id) || seen.has(id)) continue;
      seen.add(id);
      const base = DEFAULT_SECTION_MAP.get(id)!;
      const rawTitle = typeof entry.title === 'string' ? entry.title.trim() : '';
      const rawSubtitle = typeof entry.subtitle === 'string' ? entry.subtitle.trim() : '';
      mergedSections.push({
        id,
        label: base.label,
        enabled: entry.enabled !== false,
        title: rawTitle || base.title,
        subtitle: rawSubtitle || base.subtitle,
      });
    }
  }

  for (const base of DEFAULT_HOME_SECTIONS) {
    if (!seen.has(base.id)) {
      mergedSections.push({ ...base });
    }
  }

  return {
    sections: mergedSections,
    bestsellingLimit: clampLimit(raw?.bestsellingLimit, DEFAULT_HOME_CUSTOMIZATION.bestsellingLimit),
    phoneCasesLimit: clampLimit(raw?.phoneCasesLimit, DEFAULT_HOME_CUSTOMIZATION.phoneCasesLimit),
  };
}
