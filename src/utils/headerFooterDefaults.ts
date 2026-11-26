import type {
  FooterBlockConfig,
  FooterBlockType,
  FooterConfigSettings,
  FooterDesignType,
  FooterLinkItem,
  FooterSocialLinks,
  HeaderConfigSettings,
  HeaderNavLink,
  HeaderStyleType,
  MenuCategoryMode,
  MobileBottomBarItem,
  MobileBottomBarItemId,
  MobileBottomBarStyleType,
  PhoneMenuMode,
} from '../types';

export const DEFAULT_MOBILE_BOTTOM_BAR_ITEMS: MobileBottomBarItem[] = [
  { id: 'home', label: 'Home', enabled: true },
  { id: 'offers', label: 'Offers', enabled: true },
  { id: 'wishlist', label: 'Wishlist', enabled: true },
  { id: 'cart', label: 'Cart', enabled: true },
  { id: 'categories', label: 'Categories', enabled: true },
  { id: 'shop', label: 'Shop', enabled: false },
  { id: 'search', label: 'Search', enabled: false },
  { id: 'account', label: 'Account', enabled: false },
  { id: 'whatsapp', label: 'WhatsApp', enabled: false },
];

export const DEFAULT_HEADER_CONFIG: HeaderConfigSettings = {
  headerStyle: 'two-row',
  categoryPicturesInBar: false,
  whatsappInCategoryBar: false,
  whatsappUrl: '',
  showSearchIcon: true,
  showTrackOrderIcon: true,
  showWishlistIcon: true,
  showCartIcon: true,
  showOffersIcon: true,
  showAccountIcon: true,
  mobileBottomBarStyle: 'classic',
  mobileBottomBarItems: DEFAULT_MOBILE_BOTTOM_BAR_ITEMS.map((item) => ({ ...item })),
  menuCategoryMode: 'all',
  pickedCategoryIds: [],
  phoneMenuMode: 'all',
  topBarEnabled: true,
  topBarMessages: [],
  topBarBgColor: '#650108',
  topBarTextColor: '#F2E8D2',
  topBarShowOnMobile: true,
  headerBgColor: '#FAF4E6',
  headerTextColor: '#650108',
  stickyHeader: true,
  searchPlaceholder: 'Search products by name, description, or model...',
  myOrdersLabel: 'Track order',
  navLinks: [],
};

export const DEFAULT_SOCIAL_LINKS: FooterSocialLinks = {
  facebook: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  whatsapp: '',
  x: '',
};

export const DEFAULT_FOOTER_BLOCKS: FooterBlockConfig[] = [
  { id: 'blk-about', type: 'about', title: 'About', enabled: true },
  { id: 'blk-contact', type: 'contact', title: 'Contact details', enabled: true },
  { id: 'blk-social', type: 'social', title: 'Social links', enabled: true },
  { id: 'blk-help', type: 'help', title: 'Help', enabled: true },
  { id: 'blk-company', type: 'company', title: 'Company', enabled: true },
  { id: 'blk-newsletter', type: 'newsletter', title: 'Newsletter', enabled: true },
  { id: 'blk-payment-badges', type: 'payment-badges', title: 'Payment badges', enabled: false },
  { id: 'blk-trust-badges', type: 'trust-badges', title: 'Trust badges', enabled: false },
  { id: 'blk-copyright', type: 'copyright', title: 'Copyright line', enabled: true },
];

export function createDefaultFooterConfig(opts?: {
  storeName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  openingHours?: string;
  shippingInsideDhaka?: number;
  shippingOutsideDhaka?: number;
  freeShippingThreshold?: number;
}): FooterConfigSettings {
  const storeName = opts?.storeName || 'Classy Cases';
  const phone = opts?.phone || '01799576210';
  const email = opts?.email || 'mdebrahim.contact@gmail.com';
  const address = opts?.address || 'Tilapara, Ekuria, Dhaka Jute Mills';
  const inside = opts?.shippingInsideDhaka ?? 60;
  const outside = opts?.shippingOutsideDhaka ?? 120;
  const freeOver = opts?.freeShippingThreshold ?? 1500;

  return {
    footerDesign: 'classic',
    blocks: DEFAULT_FOOTER_BLOCKS.map((b) => ({ ...b })),
    footerBgColor: '#650108',
    footerTextColor: '#F2E8D2',
    showBrandLogo: true,
    aboutText: '',
    showWhatsappRow: true,
    whatsappLabel: 'WhatsApp:',
    whatsappLinkText: 'Chat with us',
    whatsappUrl: `https://wa.me/88${phone.replace(/\D/g, '')}`,
    showOpeningHours: true,
    showShopNowCta: true,
    shopNowLabel: 'Shop now',
    socialHeading: 'Follow Us',
    socialLinks: { ...DEFAULT_SOCIAL_LINKS },
    helpColumnTitle: 'Help',
    helpLinks: [
      { id: 'help-orders', label: 'Track Order', action: 'orders', value: '' },
      {
        id: 'help-shipping',
        label: 'Shipping',
        action: 'modal',
        value: `Inside Dhaka delivery is ৳${inside} (24–48 hours). Outside Dhaka courier delivery is ৳${outside} (2–4 business days). Free shipping on orders over ৳${freeOver}.`,
      },
      {
        id: 'help-returns',
        label: 'Returns & Exchanges',
        action: 'modal',
        value:
          '7-day hassle-free exchange if the case does not fit your phone model or arrives damaged. Contact us with your Order Number to arrange a replacement.',
      },
      {
        id: 'help-contact',
        label: 'Contact Us',
        action: 'modal',
        value: `Phone: ${phone} | Email: ${email} | Address: ${address}`,
      },
      {
        id: 'help-faq',
        label: 'FAQs',
        action: 'modal',
        value:
          'We accept bKash, Nagad, Visa/Mastercard (SSLCommerz), and Cash on Delivery nationwide. Every order receives an instant tracking number.',
      },
    ],
    companyColumnTitle: 'Company',
    companyLinks: [
      {
        id: 'comp-about',
        label: 'About Us',
        action: 'modal',
        value:
          opts?.tagline ||
          'Premium phone cases, made to fit "Your Perfect Case". Everyday protection. Effortless style.',
      },
      {
        id: 'comp-privacy',
        label: 'Privacy Policy',
        action: 'modal',
        value:
          'Your phone number, delivery address, and payment verification details are encrypted and used strictly for order fulfillment and courier tracking.',
      },
      {
        id: 'comp-terms',
        label: 'Terms & Conditions',
        action: 'modal',
        value:
          'All prices are in Bangladeshi Taka (৳). Online payments via bKash, Nagad, and Card are verified instantly prior to dispatch.',
      },
    ],
    newsletterTitle: 'Newsletter',
    newsletterDescription:
      'Subscribe for new arrivals, offers and updates. No spam — unsubscribe any time.',
    newsletterPlaceholder: 'Enter your email...',
    newsletterButtonText: 'Subscribe',
    paymentBadges: {
      cod: true,
      bkash: true,
      nagad: true,
      card: true,
    },
    trustBadges: [
      'Secure checkout',
      'Genuine quality',
      '7-day fit guarantee',
      'Fast BD delivery',
    ],
    copyrightText: `© 2026 ${storeName}. All Rights Reserved`,
    showScrollToTop: true,
  };
}

export function sanitizeHexColor(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : fallback;
}

export function sanitizeNavUrl(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return trimmed.slice(0, 300);
  }
  return `https://${trimmed}`.slice(0, 300);
}

const VALID_HEADER_STYLES: HeaderStyleType[] = ['classic', 'one-row', 'two-row', 'overlay'];
const VALID_MOBILE_BAR_STYLES: MobileBottomBarStyleType[] = [
  'classic',
  'floating',
  'center-button',
  'off',
];
const VALID_MOBILE_ITEM_IDS: MobileBottomBarItemId[] = [
  'home',
  'offers',
  'wishlist',
  'cart',
  'categories',
  'shop',
  'search',
  'account',
  'whatsapp',
];

function sanitizeWhatsAppInput(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().slice(0, 200);
  if (!trimmed) return '';
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return '';
  }
  return trimmed.replace(/[^\d+\-\s()]/g, '').trim().slice(0, 32);
}

export function normalizeWhatsAppUrl(raw?: string, fallbackPhone?: string): string {
  const candidate = (raw || '').trim();
  if (candidate) {
    if (candidate.startsWith('https://') || candidate.startsWith('http://')) {
      return candidate;
    }
    const digits = candidate.replace(/\D/g, '');
    if (digits.length >= 6) {
      const normalized =
        digits.length === 11 && digits.startsWith('01') ? `88${digits}` : digits;
      return `https://wa.me/${normalized}`;
    }
  }
  const phoneDigits = (fallbackPhone || '01799576210').replace(/\D/g, '');
  if (!phoneDigits) return 'https://wa.me/8801799576210';
  const normalizedPhone =
    phoneDigits.length === 11 && phoneDigits.startsWith('01')
      ? `88${phoneDigits}`
      : phoneDigits;
  return `https://wa.me/${normalizedPhone}`;
}
const VALID_MENU_CAT_MODES: MenuCategoryMode[] = [
  'all',
  'featured',
  'featured_plus_picks',
  'only_picks',
];
const VALID_PHONE_MENU_MODES: PhoneMenuMode[] = ['all', 'same'];

export function mergeHeaderConfig(
  raw?: Partial<HeaderConfigSettings> | Record<string, unknown> | null
): HeaderConfigSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<HeaderConfigSettings> &
    Record<string, unknown>;

  const headerStyle: HeaderStyleType = VALID_HEADER_STYLES.includes(
    src.headerStyle as HeaderStyleType
  )
    ? (src.headerStyle as HeaderStyleType)
    : DEFAULT_HEADER_CONFIG.headerStyle;

  const mobileBottomBarStyle: MobileBottomBarStyleType = VALID_MOBILE_BAR_STYLES.includes(
    src.mobileBottomBarStyle as MobileBottomBarStyleType
  )
    ? (src.mobileBottomBarStyle as MobileBottomBarStyleType)
    : DEFAULT_HEADER_CONFIG.mobileBottomBarStyle;

  const menuCategoryMode: MenuCategoryMode = VALID_MENU_CAT_MODES.includes(
    src.menuCategoryMode as MenuCategoryMode
  )
    ? (src.menuCategoryMode as MenuCategoryMode)
    : DEFAULT_HEADER_CONFIG.menuCategoryMode;

  const phoneMenuMode: PhoneMenuMode = VALID_PHONE_MENU_MODES.includes(
    src.phoneMenuMode as PhoneMenuMode
  )
    ? (src.phoneMenuMode as PhoneMenuMode)
    : DEFAULT_HEADER_CONFIG.phoneMenuMode;

  let mobileBottomBarItems: MobileBottomBarItem[];
  if (Array.isArray(src.mobileBottomBarItems) && src.mobileBottomBarItems.length > 0) {
    const seen = new Set<MobileBottomBarItemId>();
    const parsed: MobileBottomBarItem[] = [];
    for (const entry of src.mobileBottomBarItems) {
      if (!entry || typeof entry !== 'object') continue;
      const id = entry.id as MobileBottomBarItemId;
      if (!VALID_MOBILE_ITEM_IDS.includes(id) || seen.has(id)) continue;
      seen.add(id);
      const def = DEFAULT_MOBILE_BOTTOM_BAR_ITEMS.find((d) => d.id === id)!;
      parsed.push({
        id,
        label:
          typeof entry.label === 'string' && entry.label.trim()
            ? entry.label.trim().slice(0, 24)
            : def.label,
        enabled: Boolean(entry.enabled),
      });
    }
    for (const def of DEFAULT_MOBILE_BOTTOM_BAR_ITEMS) {
      if (!seen.has(def.id)) {
        parsed.push({ ...def, enabled: false });
      }
    }
    mobileBottomBarItems = parsed;
  } else {
    mobileBottomBarItems = DEFAULT_MOBILE_BOTTOM_BAR_ITEMS.map((item) => ({ ...item }));
  }

  const pickedCategoryIds = Array.isArray(src.pickedCategoryIds)
    ? src.pickedCategoryIds
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map((id) => id.trim().slice(0, 64))
    : [];

  // Backwards compatibility with legacy announcement fields
  let topBarMessages: string[] = [];
  if (Array.isArray(src.topBarMessages)) {
    topBarMessages = src.topBarMessages
      .filter((m): m is string => typeof m === 'string')
      .map((m) => m.slice(0, 200));
  } else if (
    Boolean(src.announcementEnabled) &&
    typeof src.announcementText === 'string' &&
    src.announcementText.trim()
  ) {
    topBarMessages = [src.announcementText.trim().slice(0, 200)];
  }

  const navLinks: HeaderNavLink[] = Array.isArray(src.navLinks)
    ? src.navLinks
        .filter((l): l is HeaderNavLink => Boolean(l && typeof l.label === 'string' && l.label.trim()))
        .map((l, idx) => ({
          id: typeof l.id === 'string' && l.id.trim() ? l.id.trim() : `nav-${idx + 1}`,
          label: l.label.trim().slice(0, 40),
          action:
            l.action === 'home' || l.action === 'shop' || l.action === 'orders' || l.action === 'url'
              ? l.action
              : 'shop',
          url: l.action === 'url' ? sanitizeNavUrl(l.url) : undefined,
        }))
    : DEFAULT_HEADER_CONFIG.navLinks;

  return {
    headerStyle,
    categoryPicturesInBar: Boolean(src.categoryPicturesInBar),
    whatsappInCategoryBar: Boolean(src.whatsappInCategoryBar),
    whatsappUrl: sanitizeWhatsAppInput(src.whatsappUrl),
    showSearchIcon:
      src.showSearchIcon !== undefined
        ? Boolean(src.showSearchIcon)
        : src.showSearchBar !== undefined
          ? Boolean(src.showSearchBar)
          : DEFAULT_HEADER_CONFIG.showSearchIcon,
    showTrackOrderIcon:
      src.showTrackOrderIcon !== undefined
        ? Boolean(src.showTrackOrderIcon)
        : src.showMyOrdersButton !== undefined
          ? Boolean(src.showMyOrdersButton)
          : DEFAULT_HEADER_CONFIG.showTrackOrderIcon,
    showWishlistIcon:
      src.showWishlistIcon !== undefined
        ? Boolean(src.showWishlistIcon)
        : src.showFavoritesButton !== undefined
          ? Boolean(src.showFavoritesButton)
          : DEFAULT_HEADER_CONFIG.showWishlistIcon,
    showCartIcon:
      src.showCartIcon !== undefined
        ? Boolean(src.showCartIcon)
        : src.showCartButton !== undefined
          ? Boolean(src.showCartButton)
          : DEFAULT_HEADER_CONFIG.showCartIcon,
    showOffersIcon:
      src.showOffersIcon !== undefined
        ? Boolean(src.showOffersIcon)
        : DEFAULT_HEADER_CONFIG.showOffersIcon,
    showAccountIcon:
      src.showAccountIcon !== undefined
        ? Boolean(src.showAccountIcon)
        : DEFAULT_HEADER_CONFIG.showAccountIcon,
    mobileBottomBarStyle,
    mobileBottomBarItems,
    menuCategoryMode,
    pickedCategoryIds,
    phoneMenuMode,
    topBarEnabled:
      src.topBarEnabled !== undefined
        ? Boolean(src.topBarEnabled)
        : DEFAULT_HEADER_CONFIG.topBarEnabled,
    topBarMessages,
    topBarBgColor: sanitizeHexColor(
      src.topBarBgColor ?? src.announcementBgColor,
      DEFAULT_HEADER_CONFIG.topBarBgColor
    ),
    topBarTextColor: sanitizeHexColor(
      src.topBarTextColor ?? src.announcementTextColor,
      DEFAULT_HEADER_CONFIG.topBarTextColor
    ),
    topBarShowOnMobile:
      src.topBarShowOnMobile !== undefined
        ? Boolean(src.topBarShowOnMobile)
        : DEFAULT_HEADER_CONFIG.topBarShowOnMobile,
    headerBgColor: sanitizeHexColor(src.headerBgColor, DEFAULT_HEADER_CONFIG.headerBgColor),
    headerTextColor: sanitizeHexColor(src.headerTextColor, DEFAULT_HEADER_CONFIG.headerTextColor),
    stickyHeader: src.stickyHeader !== false,
    searchPlaceholder:
      typeof src.searchPlaceholder === 'string' && src.searchPlaceholder.trim()
        ? src.searchPlaceholder.trim().slice(0, 120)
        : DEFAULT_HEADER_CONFIG.searchPlaceholder,
    myOrdersLabel:
      typeof src.myOrdersLabel === 'string' && src.myOrdersLabel.trim()
        ? src.myOrdersLabel.trim().slice(0, 30)
        : DEFAULT_HEADER_CONFIG.myOrdersLabel,
    navLinks,
  };
}

function sanitizeFooterLinks(rawLinks: unknown, fallback: FooterLinkItem[]): FooterLinkItem[] {
  if (!Array.isArray(rawLinks)) return fallback;
  return rawLinks
    .filter((l): l is FooterLinkItem => Boolean(l && typeof l.label === 'string' && l.label.trim()))
    .map((l, idx) => ({
      id: typeof l.id === 'string' && l.id.trim() ? l.id.trim() : `flink-${idx + 1}`,
      label: l.label.trim().slice(0, 60),
      action:
        l.action === 'orders' || l.action === 'catalog' || l.action === 'modal' || l.action === 'url'
          ? l.action
          : 'modal',
      value:
        l.action === 'url'
          ? sanitizeNavUrl(l.value)
          : typeof l.value === 'string'
            ? l.value.trim().slice(0, 1000)
            : '',
    }));
}

const VALID_FOOTER_DESIGNS: FooterDesignType[] = [
  'classic',
  'columns',
  'dark',
  'boxed',
  'contact-strip',
  'compact',
];

const VALID_BLOCK_TYPES: FooterBlockType[] = [
  'about',
  'contact',
  'social',
  'help',
  'company',
  'newsletter',
  'payment-badges',
  'trust-badges',
  'copyright',
  'custom',
];

export function mergeFooterConfig(
  raw?: Partial<FooterConfigSettings> | Record<string, unknown> | null,
  storeDefaults?: Parameters<typeof createDefaultFooterConfig>[0]
): FooterConfigSettings {
  const def = createDefaultFooterConfig(storeDefaults);
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<FooterConfigSettings> &
    Record<string, unknown>;
  const rawSocial: Partial<FooterSocialLinks> =
    src.socialLinks && typeof src.socialLinks === 'object' ? src.socialLinks : {};

  const footerDesign: FooterDesignType = VALID_FOOTER_DESIGNS.includes(
    src.footerDesign as FooterDesignType
  )
    ? (src.footerDesign as FooterDesignType)
    : def.footerDesign;

  let blocks: FooterBlockConfig[];
  if (Array.isArray(src.blocks) && src.blocks.length > 0) {
    const parsed: FooterBlockConfig[] = [];
    const seenIds = new Set<string>();
    for (const item of src.blocks) {
      if (!item || typeof item !== 'object') continue;
      const type = VALID_BLOCK_TYPES.includes(item.type as FooterBlockType)
        ? (item.type as FooterBlockType)
        : 'custom';
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim().slice(0, 64)
          : `blk-${type}-${parsed.length + 1}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const defBlock = DEFAULT_FOOTER_BLOCKS.find((b) => b.type === type);
      parsed.push({
        id,
        type,
        title:
          typeof item.title === 'string' && item.title.trim()
            ? item.title.trim().slice(0, 60)
            : defBlock?.title || 'Custom block',
        enabled: Boolean(item.enabled),
        customBody:
          typeof item.customBody === 'string' ? item.customBody.slice(0, 600) : undefined,
        customLinks: Array.isArray(item.customLinks)
          ? sanitizeFooterLinks(item.customLinks, [])
          : undefined,
      });
    }
    blocks = parsed.length > 0 ? parsed : def.blocks.map((b) => ({ ...b }));
  } else {
    // Migrate legacy toggles into default blocks if present
    blocks = def.blocks.map((b) => {
      if (b.type === 'social' && src.showSocialLinks === false) {
        return { ...b, enabled: false };
      }
      if (b.type === 'newsletter' && src.showNewsletter === false) {
        return { ...b, enabled: false };
      }
      return { ...b };
    });
  }

  const rawPay =
    src.paymentBadges && typeof src.paymentBadges === 'object' ? src.paymentBadges : undefined;
  const paymentBadges = {
    cod: rawPay?.cod !== undefined ? Boolean(rawPay.cod) : def.paymentBadges.cod,
    bkash: rawPay?.bkash !== undefined ? Boolean(rawPay.bkash) : def.paymentBadges.bkash,
    nagad: rawPay?.nagad !== undefined ? Boolean(rawPay.nagad) : def.paymentBadges.nagad,
    card: rawPay?.card !== undefined ? Boolean(rawPay.card) : def.paymentBadges.card,
  };

  const trustBadges = Array.isArray(src.trustBadges)
    ? src.trustBadges
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().slice(0, 60))
    : def.trustBadges;

  return {
    footerDesign,
    blocks,
    footerBgColor: sanitizeHexColor(src.footerBgColor, def.footerBgColor),
    footerTextColor: sanitizeHexColor(src.footerTextColor, def.footerTextColor),
    showBrandLogo: src.showBrandLogo !== false,
    aboutText: typeof src.aboutText === 'string' ? src.aboutText.trim().slice(0, 300) : def.aboutText,
    showWhatsappRow: src.showWhatsappRow !== false,
    whatsappLabel:
      typeof src.whatsappLabel === 'string' ? src.whatsappLabel.trim().slice(0, 40) : def.whatsappLabel,
    whatsappLinkText:
      typeof src.whatsappLinkText === 'string' && src.whatsappLinkText.trim()
        ? src.whatsappLinkText.trim().slice(0, 80)
        : def.whatsappLinkText,
    whatsappUrl:
      src.whatsappUrl !== undefined ? sanitizeNavUrl(src.whatsappUrl) : def.whatsappUrl,
    showOpeningHours: src.showOpeningHours !== false,
    showShopNowCta: src.showShopNowCta !== false,
    shopNowLabel:
      typeof src.shopNowLabel === 'string' && src.shopNowLabel.trim()
        ? src.shopNowLabel.trim().slice(0, 40)
        : def.shopNowLabel,
    socialHeading:
      typeof src.socialHeading === 'string' ? src.socialHeading.trim().slice(0, 40) : def.socialHeading,
    socialLinks: {
      facebook:
        rawSocial.facebook !== undefined
          ? sanitizeNavUrl(rawSocial.facebook)
          : def.socialLinks.facebook,
      instagram:
        rawSocial.instagram !== undefined
          ? sanitizeNavUrl(rawSocial.instagram)
          : def.socialLinks.instagram,
      tiktok:
        rawSocial.tiktok !== undefined ? sanitizeNavUrl(rawSocial.tiktok) : def.socialLinks.tiktok,
      youtube:
        rawSocial.youtube !== undefined ? sanitizeNavUrl(rawSocial.youtube) : def.socialLinks.youtube,
      whatsapp:
        rawSocial.whatsapp !== undefined
          ? sanitizeNavUrl(rawSocial.whatsapp)
          : def.socialLinks.whatsapp,
      x: rawSocial.x !== undefined ? sanitizeNavUrl(rawSocial.x) : def.socialLinks.x,
    },
    helpColumnTitle:
      typeof src.helpColumnTitle === 'string' && src.helpColumnTitle.trim()
        ? src.helpColumnTitle.trim().slice(0, 40)
        : def.helpColumnTitle,
    helpLinks: sanitizeFooterLinks(src.helpLinks, def.helpLinks),
    companyColumnTitle:
      typeof src.companyColumnTitle === 'string' && src.companyColumnTitle.trim()
        ? src.companyColumnTitle.trim().slice(0, 40)
        : def.companyColumnTitle,
    companyLinks: sanitizeFooterLinks(src.companyLinks, def.companyLinks),
    newsletterTitle:
      typeof src.newsletterTitle === 'string' && src.newsletterTitle.trim()
        ? src.newsletterTitle.trim().slice(0, 50)
        : def.newsletterTitle,
    newsletterDescription:
      typeof src.newsletterDescription === 'string'
        ? src.newsletterDescription.trim().slice(0, 240)
        : def.newsletterDescription,
    newsletterPlaceholder:
      typeof src.newsletterPlaceholder === 'string' && src.newsletterPlaceholder.trim()
        ? src.newsletterPlaceholder.trim().slice(0, 60)
        : def.newsletterPlaceholder,
    newsletterButtonText:
      typeof src.newsletterButtonText === 'string' && src.newsletterButtonText.trim()
        ? src.newsletterButtonText.trim().slice(0, 30)
        : def.newsletterButtonText,
    paymentBadges,
    trustBadges,
    copyrightText:
      typeof src.copyrightText === 'string' && src.copyrightText.trim()
        ? src.copyrightText.trim().slice(0, 120)
        : def.copyrightText,
    showScrollToTop: src.showScrollToTop !== false,
  };
}
