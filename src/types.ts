export type PaymentMethod = 'bkash' | 'nagad' | 'card' | 'cod';
export type PaymentStatus = 'paid' | 'pending' | 'failed';
export type FulfillmentStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductVariantOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  label: string;
  sku: string;
  price: number;
  stock: number;
  active: boolean;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: string;
  brand?: string;
  alsoShowIn?: string[];
  brandModels: string[];
  variantOptions?: ProductVariantOption[];
  variants?: ProductVariant[];
  price: number;
  originalPrice: number;
  costPrice?: number;
  discountPercent: number;
  stock: number;
  lowStockThreshold?: number;
  trackStock?: boolean;
  preOrderMode?: 'store_default' | 'allow' | 'disallow';
  sku: string;
  image: string;
  galleryImages?: string[];
  shortDescription?: string;
  description: string;
  requiresShipping?: boolean;
  weightKg?: number;
  shippingClass?: string;
  specifications?: ProductSpecification[];
  customerPrompt?: string;
  seoTitle?: string;
  seoDescription?: string;
  active?: boolean;
  featured: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  brandKey: 'motorola' | 'vivo' | 'xiaomi' | 'custom';
  featured: boolean;
  active?: boolean;
  parentId?: string;
  description?: string;
  googleCategory?: string;
  seoTitle?: string;
  seoDescription?: string;
  image?: string;
  shippingClass?: string;
  isDefault?: boolean;
}

export interface OrderItem {
  productId: string;
  title: string;
  model: string;
  image: string;
  price: number;
  quantity: number;
}

export interface OrderCourierInfo {
  provider: 'Steadfast' | 'Pathao' | 'RedX' | 'Manual';
  consignmentId: string;
  trackingCode: string;
  status: 'booked' | 'in_transit' | 'delivered' | 'cancelled';
  bookedAt: string;
  parcelWeightKg: number;
  codAmount: number;
  note?: string;
  mode?: 'api' | 'manual';
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryArea: 'inside_dhaka' | 'outside_dhaka';
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  couponCode?: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  transactionId: string;
  source: 'Web' | 'POS';
  channel: string;
  adminNote?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  courier?: OrderCourierInfo;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentGatewaySettings {
  bkash: {
    enabled: boolean;
    merchantNumber: string;
    mode: 'sandbox' | 'live';
    logoUrl?: string;
  };
  nagad: {
    enabled: boolean;
    merchantNumber: string;
    mode: 'sandbox' | 'live';
    logoUrl?: string;
  };
  card: {
    enabled: boolean;
    provider: string;
    storeId: string;
    mode: 'sandbox' | 'live';
    logoUrl?: string;
  };
  cod: {
    enabled: boolean;
    logoUrl?: string;
  };
}

export interface StorefrontPageConfig {
  shopPageColumns: 2 | 3 | 4 | 5;
  showOutOfStock: boolean;
  showStockBadgeOnProduct: boolean;
  showRelatedProducts: boolean;
  checkoutRequireEmail: boolean;
  checkoutNoteEnabled: boolean;
  thankYouHeadline: string;
  thankYouMessage: string;
  reviewsEnabled: boolean;
  reviewsAutoApprove: boolean;
  homeReviewsOnlyFiveStar?: boolean;
  sizeGuideTitle: string;
  sizeGuideNotes: string;
  offerPageTitle: string;
  offerPageBannerText: string;
  popupOfferEnabled: boolean;
  popupOfferHeadline: string;
  popupOfferCode: string;
}

export interface OrderConfigSettings {
  sources: string[];
  quickNotes: string[];
}

export interface ShippingClassRule {
  name: string;
  fee: number;
  defaultWeightKg: number;
}

export interface DeliveryConfigSettings {
  shippingClasses: ShippingClassRule[];
  courierProvider: 'Steadfast' | 'Pathao' | 'RedX' | 'None';
  courierApiKey: string;
  courierSecretKey: string;
  fraudCheckEnabled: boolean;
  fraudThresholdPercent: number;
}

export interface MarketingConfigSettings {
  metaPixelId: string;
  gtmId: string;
  tiktokPixelId: string;
}

export interface SystemConfigSettings {
  smtpFromName: string;
  smtpReplyTo: string;
  orderEmailNotifications: boolean;
  lowStockAlertEnabled: boolean;
  requireTwoFactorAdmin: boolean;
  invoiceHeaderNote: string;
  invoiceFooterNote: string;
  supportAccessEnabled: boolean;
}

export interface HeroVideoSlideConfig {
  id: string;
  label: string;
  kicker: string;
  headline: string;
  description: string;
  videoSrc: string;
  posterSrc: string;
  posterAlt: string;
  categoryTarget: string;
  featuredProductId: string;
  startingPrice: number;
  sortOrder: number;
  active: boolean;
}

export interface HeroMobileLayoutConfig {
  position: 'bottom-left' | 'center' | 'top-left';
  textSize: 'xs' | 'sm' | 'md';
  showKicker: boolean;
  showDescription: boolean;
  showExploreButton: boolean;
  showProductButton: boolean;
  showArrows: boolean;
}

export interface HeroPlaybackSettings {
  activeSlideId: string;
  autoAdvanceSeconds: number;
  mobileLayout?: HeroMobileLayoutConfig;
  updatedAtMs?: number;
}

export type HeaderStyleType = 'classic' | 'one-row' | 'two-row' | 'overlay';
export type MobileBottomBarStyleType = 'classic' | 'floating' | 'center-button' | 'off';
export type MobileBottomBarItemId =
  | 'home'
  | 'offers'
  | 'wishlist'
  | 'cart'
  | 'categories'
  | 'shop'
  | 'search'
  | 'account'
  | 'whatsapp';

export interface MobileBottomBarItem {
  id: MobileBottomBarItemId;
  label: string;
  enabled: boolean;
}

export type MenuCategoryMode = 'all' | 'featured' | 'featured_plus_picks' | 'only_picks';
export type PhoneMenuMode = 'all' | 'same';

export interface HeaderNavLink {
  id: string;
  label: string;
  action: 'home' | 'shop' | 'orders' | 'url';
  url?: string;
}

export interface HeaderConfigSettings {
  headerStyle: HeaderStyleType;
  categoryPicturesInBar: boolean;
  whatsappInCategoryBar: boolean;
  whatsappUrl?: string;
  showSearchIcon: boolean;
  showTrackOrderIcon: boolean;
  showWishlistIcon: boolean;
  showCartIcon: boolean;
  showOffersIcon: boolean;
  mobileBottomBarStyle: MobileBottomBarStyleType;
  mobileBottomBarItems: MobileBottomBarItem[];
  menuCategoryMode: MenuCategoryMode;
  pickedCategoryIds: string[];
  phoneMenuMode: PhoneMenuMode;
  topBarEnabled: boolean;
  topBarMessages: string[];
  topBarBgColor: string;
  topBarTextColor: string;
  topBarShowOnMobile: boolean;
  headerBgColor: string;
  headerTextColor: string;
  stickyHeader: boolean;
  searchPlaceholder: string;
  myOrdersLabel: string;
  navLinks: HeaderNavLink[];
}

export type FooterDesignType =
  | 'classic'
  | 'columns'
  | 'dark'
  | 'boxed'
  | 'contact-strip'
  | 'compact';

export type FooterBlockType =
  | 'about'
  | 'contact'
  | 'social'
  | 'help'
  | 'company'
  | 'newsletter'
  | 'payment-badges'
  | 'trust-badges'
  | 'copyright'
  | 'custom';

export interface FooterBlockConfig {
  id: string;
  type: FooterBlockType;
  title: string;
  enabled: boolean;
  customBody?: string;
  customLinks?: FooterLinkItem[];
}

export interface FooterLinkItem {
  id: string;
  label: string;
  action: 'orders' | 'catalog' | 'modal' | 'url';
  value: string;
}

export interface FooterSocialLinks {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
  x: string;
}

export interface FooterPaymentBadgesConfig {
  cod: boolean;
  bkash: boolean;
  nagad: boolean;
  card: boolean;
}

export interface FooterConfigSettings {
  footerDesign: FooterDesignType;
  blocks: FooterBlockConfig[];
  footerBgColor: string;
  footerTextColor: string;
  showBrandLogo: boolean;
  aboutText: string;
  showWhatsappRow: boolean;
  whatsappLabel: string;
  whatsappLinkText: string;
  whatsappUrl: string;
  showOpeningHours: boolean;
  showShopNowCta: boolean;
  shopNowLabel: string;
  socialHeading: string;
  socialLinks: FooterSocialLinks;
  helpColumnTitle: string;
  helpLinks: FooterLinkItem[];
  companyColumnTitle: string;
  companyLinks: FooterLinkItem[];
  newsletterTitle: string;
  newsletterDescription: string;
  newsletterPlaceholder: string;
  newsletterButtonText: string;
  paymentBadges: FooterPaymentBadgesConfig;
  trustBadges: string[];
  copyrightText: string;
  showScrollToTop: boolean;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  logoUrl?: string;
  faviconUrl?: string;
  orderPrefix: string;
  nextOrderNumber: number;
  takePreOrders: boolean;
  autoMovePending: boolean;
  costingMethod: 'FIFO' | 'Weighted Average';
  phone: string;
  email: string;
  address: string;
  openingHours: string;
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
  freeShippingThreshold: number;
  seoTitle: string;
  seoDescription: string;
  paymentGateways: PaymentGatewaySettings;
  storefrontConfig?: StorefrontPageConfig;
  headerConfig?: HeaderConfigSettings;
  footerConfig?: FooterConfigSettings;
  orderSettings?: OrderConfigSettings;
  deliverySettings?: DeliveryConfigSettings;
  marketingSettings?: MarketingConfigSettings;
  systemSettings?: SystemConfigSettings;
  heroVideos?: {
    slides: HeroVideoSlideConfig[];
    config: HeroPlaybackSettings;
    hiddenBuiltInVideos?: string[];
  };
}

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  authorName: string;
  deviceModel: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface DashboardAnalytics {
  totalOrders: number;
  bookedSales: number;
  deliveredSales: number;
  estimateFromOrders: number;
  placedCount: number;
  shippedOrDeliveredCount: number;
  needsAttentionOrders: Order[];
  hourlySeries: { label: string; today: number; yesterday: number }[];
  orderVolumeSeries: { label: string; placed: number; shipped: number }[];
  topProducts: { productId: string; title: string; image: string; unitsSold: number; revenue: number }[];
  ordersBySource: { source: string; count: number; total: number }[];
  salesByChannel: { channel: string; count: number; total: number }[];
  totalProducts: number;
  lowStockProducts: Product[];
}
