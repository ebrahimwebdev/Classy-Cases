import type {
  FooterConfigSettings,
  FooterLinkItem,
  FooterSocialLinks,
  HeaderConfigSettings,
  HeaderNavLink,
} from '../types';

export const DEFAULT_HEADER_CONFIG: HeaderConfigSettings = {
  announcementEnabled: false,
  announcementText: 'Free delivery across Bangladesh on orders over ৳1,500!',
  announcementBgColor: '#650108',
  announcementTextColor: '#F2E8D2',
  headerBgColor: '#FAF4E6',
  headerTextColor: '#650108',
  stickyHeader: true,
  showSearchBar: true,
  searchPlaceholder: 'Search products by name, description, or model...',
  showMyOrdersButton: true,
  myOrdersLabel: 'My Orders',
  showFavoritesButton: true,
  showCartButton: true,
  navLinks: [],
};

export const DEFAULT_SOCIAL_LINKS: FooterSocialLinks = {
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com',
  tiktok: 'https://tiktok.com',
  youtube: 'https://youtube.com',
  whatsapp: 'https://wa.me/8801799576210',
  x: '',
};

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
    footerBgColor: '#650108',
    footerTextColor: '#F2E8D2',
    showBrandLogo: true,
    aboutText: '',
    showWhatsappRow: true,
    whatsappLabel: 'WhatsApp:',
    whatsappLinkText: `Chat with us (${phone})`,
    whatsappUrl: '',
    showShopNowCta: true,
    shopNowLabel: 'Shop now',
    showSocialLinks: true,
    socialHeading: 'Follow Us',
    socialLinks: { ...DEFAULT_SOCIAL_LINKS },
    helpColumnTitle: 'Help',
    helpLinks: [
      { id: 'help-orders', label: 'My Orders & Tracking', action: 'orders', value: '' },
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
    showNewsletter: true,
    newsletterTitle: 'Newsletter',
    newsletterDescription:
      'Subscribe for new arrivals, offers and updates. No spam — unsubscribe any time.',
    newsletterPlaceholder: 'Enter your email',
    newsletterButtonText: 'Subscribe',
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

export function mergeHeaderConfig(raw?: Partial<HeaderConfigSettings> | null): HeaderConfigSettings {
  const src = raw && typeof raw === 'object' ? raw : {};
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
    announcementEnabled: Boolean(src.announcementEnabled),
    announcementText:
      typeof src.announcementText === 'string'
        ? src.announcementText.trim().slice(0, 200)
        : DEFAULT_HEADER_CONFIG.announcementText,
    announcementBgColor: sanitizeHexColor(
      src.announcementBgColor,
      DEFAULT_HEADER_CONFIG.announcementBgColor
    ),
    announcementTextColor: sanitizeHexColor(
      src.announcementTextColor,
      DEFAULT_HEADER_CONFIG.announcementTextColor
    ),
    headerBgColor: sanitizeHexColor(src.headerBgColor, DEFAULT_HEADER_CONFIG.headerBgColor),
    headerTextColor: sanitizeHexColor(src.headerTextColor, DEFAULT_HEADER_CONFIG.headerTextColor),
    stickyHeader: src.stickyHeader !== false,
    showSearchBar: src.showSearchBar !== false,
    searchPlaceholder:
      typeof src.searchPlaceholder === 'string' && src.searchPlaceholder.trim()
        ? src.searchPlaceholder.trim().slice(0, 120)
        : DEFAULT_HEADER_CONFIG.searchPlaceholder,
    showMyOrdersButton: src.showMyOrdersButton !== false,
    myOrdersLabel:
      typeof src.myOrdersLabel === 'string' && src.myOrdersLabel.trim()
        ? src.myOrdersLabel.trim().slice(0, 30)
        : DEFAULT_HEADER_CONFIG.myOrdersLabel,
    showFavoritesButton: src.showFavoritesButton !== false,
    showCartButton: src.showCartButton !== false,
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

export function mergeFooterConfig(
  raw?: Partial<FooterConfigSettings> | null,
  storeDefaults?: Parameters<typeof createDefaultFooterConfig>[0]
): FooterConfigSettings {
  const def = createDefaultFooterConfig(storeDefaults);
  const src = raw && typeof raw === 'object' ? raw : {};
  const rawSocial: Partial<FooterSocialLinks> =
    src.socialLinks && typeof src.socialLinks === 'object' ? src.socialLinks : {};

  return {
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
    whatsappUrl: sanitizeNavUrl(src.whatsappUrl),
    showShopNowCta: src.showShopNowCta !== false,
    shopNowLabel:
      typeof src.shopNowLabel === 'string' && src.shopNowLabel.trim()
        ? src.shopNowLabel.trim().slice(0, 40)
        : def.shopNowLabel,
    showSocialLinks: src.showSocialLinks !== false,
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
    showNewsletter: src.showNewsletter !== false,
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
    copyrightText:
      typeof src.copyrightText === 'string' && src.copyrightText.trim()
        ? src.copyrightText.trim().slice(0, 120)
        : def.copyrightText,
    showScrollToTop: src.showScrollToTop !== false,
  };
}
