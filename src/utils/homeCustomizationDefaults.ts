import type {
  HomeCustomizationConfig,
  HomeSectionConfig,
  HomeSectionType,
  ProductGridSourceMode,
} from '../types';

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  {
    id: 'scrolling_notice',
    type: 'scrolling_notice',
    label: 'Scrolling Notice',
    enabled: false,
    locked: true,
    title: 'Scrolling Notice',
    subtitle: 'Scrolling ticker',
    notices: [
      'Free shipping on orders ৳1,500+ across Bangladesh',
      '24-hour Dhaka dispatch · 7-day fit & quality replacement guarantee',
    ],
  },
  {
    id: 'hero',
    type: 'hero',
    label: 'Hero',
    enabled: true,
    locked: true,
    title: 'Hero',
    subtitle: 'Slider · Video reel',
  },
  {
    id: 'trust_highlights',
    type: 'trust_highlights',
    label: 'Trust Highlights',
    enabled: true,
    locked: true,
    title: 'Store Trust & Service Guarantees',
    subtitle: 'Service strip · Guarantees',
  },
  {
    id: 'featured_categories',
    type: 'featured_categories',
    label: 'Featured Categories',
    enabled: true,
    locked: true,
    title: 'Featured Categories',
    subtitle: 'Category slider · Rounded',
    categoryShape: 'rounded',
  },
  {
    id: 'bestselling',
    type: 'product_grid',
    label: 'Product Grid',
    enabled: true,
    locked: true,
    title: 'Bestselling',
    subtitle: 'Top products',
    sourceMode: 'bestselling',
    limit: 5,
  },
  {
    id: 'phone_cases',
    type: 'product_grid',
    label: 'Product Grid',
    enabled: true,
    locked: true,
    title: 'Phone Cases',
    subtitle: 'Brand tabs row',
    sourceMode: 'brand_tabs',
    limit: 5,
  },
  {
    id: 'screen_camera_protectors',
    type: 'product_grid',
    label: 'Product Grid',
    enabled: true,
    locked: true,
    title: 'Screen & Camera Protectors',
    subtitle: 'Camera & Screen protector tabs',
    sourceMode: 'protector_tabs',
    limit: 5,
  },
  {
    id: 'explore_more',
    type: 'product_grid',
    label: 'Product Grid',
    enabled: true,
    locked: true,
    title: 'Explore More Products',
    subtitle: 'Full catalog grid',
    sourceMode: 'explore_all',
    limit: 10,
  },
  {
    id: 'customer_reviews',
    type: 'customer_reviews',
    label: 'Customer Reviews',
    enabled: true,
    locked: true,
    title: 'Customer Reviews',
    subtitle: 'Verified buyer marquee',
  },
  {
    id: 'trusted_by',
    type: 'trusted_by',
    label: 'Brand Strip & Partners',
    enabled: true,
    locked: true,
    title: 'Trusted by Retail Partners, Couriers & Payment Networks',
    subtitle:
      'Backed by nationwide express logistics, verified payment gateways, and precision OEM case manufacturing across Bangladesh.',
  },
];

export const DEFAULT_HOME_CUSTOMIZATION: HomeCustomizationConfig = {
  sections: DEFAULT_HOME_SECTIONS.map((item) => ({
    ...item,
    notices: item.notices ? [...item.notices] : undefined,
  })),
  bestsellingLimit: 5,
  phoneCasesLimit: 5,
};

const VALID_TYPES = new Set<HomeSectionType>([
  'scrolling_notice',
  'hero',
  'featured_categories',
  'product_grid',
  'brand_strip',
  'promo_banner',
  'trust_highlights',
  'customer_reviews',
  'trusted_by',
]);

const VALID_SOURCE_MODES = new Set<ProductGridSourceMode>([
  'bestselling',
  'brand_tabs',
  'protector_tabs',
  'explore_all',
  'category',
  'newest',
  'discounted',
  'featured',
]);

const DEFAULT_SECTION_MAP = new Map<string, HomeSectionConfig>(
  DEFAULT_HOME_SECTIONS.map((section) => [section.id, section])
);

function inferTypeFromId(id: string): HomeSectionType {
  if (id === 'scrolling_notice' || id.startsWith('scrolling_notice_')) return 'scrolling_notice';
  if (id === 'hero' || id.startsWith('hero_')) return 'hero';
  if (id === 'featured_categories' || id.startsWith('featured_categories_')) return 'featured_categories';
  if (id === 'brand_strip' || id.startsWith('brand_strip_')) return 'brand_strip';
  if (id === 'promo_banner' || id.startsWith('promo_banner_')) return 'promo_banner';
  if (id === 'trust_highlights' || id.startsWith('trust_highlights_')) return 'trust_highlights';
  if (id === 'customer_reviews' || id.startsWith('customer_reviews_')) return 'customer_reviews';
  if (id === 'trusted_by' || id.startsWith('trusted_by_')) return 'trusted_by';
  return 'product_grid';
}

function inferLabelFromType(type: HomeSectionType): string {
  switch (type) {
    case 'scrolling_notice':
      return 'Scrolling Notice';
    case 'hero':
      return 'Hero';
    case 'featured_categories':
      return 'Featured Categories';
    case 'product_grid':
      return 'Product Grid';
    case 'brand_strip':
      return 'Brand Strip';
    case 'promo_banner':
      return 'Promo Banner';
    case 'trust_highlights':
      return 'Trust Highlights';
    case 'customer_reviews':
      return 'Customer Reviews';
    case 'trusted_by':
      return 'Brand Strip & Partners';
  }
}

function clampLimit(val: unknown, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(12, Math.max(2, Math.round(num)));
}

function normalizeColumns(val: unknown): 2 | 3 | 4 | 5 | undefined {
  const num = Number(val);
  if (num === 2 || num === 3 || num === 4 || num === 5) return num;
  return undefined;
}

export function mergeHomeCustomization(
  raw?: Partial<HomeCustomizationConfig> | null
): HomeCustomizationConfig {
  const seen = new Set<string>();
  const mergedSections: HomeSectionConfig[] = [];
  const defaultBestselling = clampLimit(
    raw?.bestsellingLimit,
    DEFAULT_HOME_CUSTOMIZATION.bestsellingLimit
  );
  const defaultPhoneCases = clampLimit(
    raw?.phoneCasesLimit,
    DEFAULT_HOME_CUSTOMIZATION.phoneCasesLimit
  );

  if (Array.isArray(raw?.sections)) {
    for (const entry of raw.sections) {
      if (!entry || typeof entry !== 'object') continue;
      const id = typeof entry.id === 'string' ? entry.id.trim() : '';
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const base = DEFAULT_SECTION_MAP.get(id);
      const rawType = entry.type as HomeSectionType | undefined;
      const resolvedType: HomeSectionType =
        rawType && VALID_TYPES.has(rawType)
          ? rawType
          : base?.type || inferTypeFromId(id);

      const rawTitle = typeof entry.title === 'string' ? entry.title.trim() : '';
      const rawSubtitle = typeof entry.subtitle === 'string' ? entry.subtitle.trim() : '';
      const rawLabel = typeof entry.label === 'string' ? entry.label.trim() : '';

      const rawSource = entry.sourceMode as ProductGridSourceMode | undefined;
      const sourceMode: ProductGridSourceMode | undefined =
        resolvedType === 'product_grid'
          ? rawSource && VALID_SOURCE_MODES.has(rawSource)
            ? rawSource
            : base?.sourceMode || 'category'
          : undefined;

      const notices =
        resolvedType === 'scrolling_notice'
          ? Array.isArray(entry.notices)
            ? entry.notices.map((n) => String(n).trim()).filter(Boolean)
            : base?.notices
              ? [...base.notices]
              : ['Free shipping available across Bangladesh']
          : undefined;

      const sectionLimit =
        resolvedType === 'product_grid'
          ? clampLimit(
              entry.limit,
              id === 'bestselling'
                ? defaultBestselling
                : id === 'phone_cases'
                  ? defaultPhoneCases
                  : base?.limit || 4
            )
          : undefined;

      mergedSections.push({
        id,
        type: resolvedType,
        label: base?.label || rawLabel || inferLabelFromType(resolvedType),
        enabled: entry.enabled !== false,
        locked: base?.locked ?? Boolean(entry.locked),
        title: rawTitle || base?.title || inferLabelFromType(resolvedType),
        subtitle: rawSubtitle || base?.subtitle,
        ...(notices !== undefined ? { notices } : {}),
        ...(resolvedType === 'featured_categories'
          ? {
              categoryShape:
                entry.categoryShape === 'circle' ? 'circle' : 'rounded',
            }
          : {}),
        ...(resolvedType === 'product_grid'
          ? {
              sourceMode,
              categoryName:
                typeof entry.categoryName === 'string'
                  ? entry.categoryName.trim()
                  : base?.categoryName,
              limit: sectionLimit,
              columns: normalizeColumns(entry.columns),
            }
          : {}),
        ...(resolvedType === 'promo_banner'
          ? {
              promoBadge:
                typeof entry.promoBadge === 'string'
                  ? entry.promoBadge.trim()
                  : 'Limited Offer',
              promoCtaLabel:
                typeof entry.promoCtaLabel === 'string'
                  ? entry.promoCtaLabel.trim()
                  : 'Shop Now',
              promoTargetCategory:
                typeof entry.promoTargetCategory === 'string'
                  ? entry.promoTargetCategory.trim()
                  : 'All',
              promoImageUrl:
                typeof entry.promoImageUrl === 'string'
                  ? entry.promoImageUrl.trim()
                  : '',
              promoTheme:
                entry.promoTheme === 'cream' || entry.promoTheme === 'dark'
                  ? entry.promoTheme
                  : 'maroon',
            }
          : {}),
      });
    }
  }

  for (const base of DEFAULT_HOME_SECTIONS) {
    if (!seen.has(base.id)) {
      const cloned: HomeSectionConfig = {
        ...base,
        notices: base.notices ? [...base.notices] : undefined,
      };
      // Preserve scrolling_notice above hero when missing from older saved configs
      if (base.id === 'scrolling_notice') {
        mergedSections.unshift(cloned);
      } else if (base.id === 'screen_camera_protectors') {
        const exploreIdx = mergedSections.findIndex((s) => s.id === 'explore_more');
        if (exploreIdx >= 0) {
          mergedSections.splice(exploreIdx, 0, cloned);
        } else {
          mergedSections.push(cloned);
        }
      } else {
        mergedSections.push(cloned);
      }
    }
  }

  return {
    sections: mergedSections,
    bestsellingLimit: defaultBestselling,
    phoneCasesLimit: defaultPhoneCases,
  };
}

export interface HomeLayoutPreset {
  id: string;
  name: string;
  description: string;
  config: HomeCustomizationConfig;
}

export const HOME_LAYOUT_PRESETS: HomeLayoutPreset[] = [
  {
    id: 'default_full',
    name: 'Full Signature Storefront',
    description: 'Hero reel, trust strip, featured categories, bestselling, phone cases, catalog grid, reviews & partners.',
    config: DEFAULT_HOME_CUSTOMIZATION,
  },
  {
    id: 'clean_minimal',
    name: 'Minimal Video & Products',
    description: 'Hero banner, featured categories, and main product catalog with customer reviews.',
    config: mergeHomeCustomization({
      sections: [
        { ...DEFAULT_SECTION_MAP.get('scrolling_notice')!, enabled: false },
        { ...DEFAULT_SECTION_MAP.get('hero')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('featured_categories')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('screen_camera_protectors')!, enabled: false },
        { ...DEFAULT_SECTION_MAP.get('explore_more')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('customer_reviews')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('trust_highlights')!, enabled: false },
        { ...DEFAULT_SECTION_MAP.get('bestselling')!, enabled: false },
        { ...DEFAULT_SECTION_MAP.get('phone_cases')!, enabled: false },
        { ...DEFAULT_SECTION_MAP.get('trusted_by')!, enabled: false },
      ],
    }),
  },
  {
    id: 'brand_showcase',
    name: 'Category & Brand First',
    description: 'Scrolling notice ticker on top, categories & brand showcase before hero & catalog rows.',
    config: mergeHomeCustomization({
      sections: [
        { ...DEFAULT_SECTION_MAP.get('scrolling_notice')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('featured_categories')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('hero')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('phone_cases')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('bestselling')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('trust_highlights')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('screen_camera_protectors')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('explore_more')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('customer_reviews')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('trusted_by')!, enabled: true },
      ],
    }),
  },
  {
    id: 'flash_drop',
    name: 'Flash Offer & Drop Focus',
    description: 'Scrolling ticker + promotional deal banner right under the hero slider with bestselling & reviews.',
    config: mergeHomeCustomization({
      sections: [
        { ...DEFAULT_SECTION_MAP.get('scrolling_notice')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('hero')!, enabled: true },
        {
          id: 'promo_banner_preset',
          type: 'promo_banner',
          label: 'Promo Banner',
          enabled: true,
          title: 'MagSafe & Matte Armor Flash Drop',
          subtitle: 'Up to 30% OFF on everyday protective cases with fast 24h Dhaka courier.',
          promoBadge: 'Flash Offer',
          promoCtaLabel: 'Shop Deals',
          promoTargetCategory: 'All',
          promoTheme: 'maroon',
        },
        { ...DEFAULT_SECTION_MAP.get('bestselling')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('featured_categories')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('phone_cases')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('screen_camera_protectors')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('explore_more')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('customer_reviews')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('trust_highlights')!, enabled: true },
        { ...DEFAULT_SECTION_MAP.get('trusted_by')!, enabled: true },
      ],
    }),
  },
];
