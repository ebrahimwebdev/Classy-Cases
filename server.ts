import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import type {
  Category,
  Coupon,
  DashboardAnalytics,
  Expense,
  FulfillmentStatus,
  HeroMobileLayoutConfig,
  HeroPlaybackSettings,
  HeroVideoSlideConfig,
  Order,
  OrderCourierInfo,
  OrderItem,
  PaymentMethod,
  Product,
  ProductReview,
  ProductVariant,
  ProductVariantOption,
  StoreSettings,
  Subscriber,
} from './src/types.ts';
import { isSqlConfigured } from './src/db/index.ts';
import {
  deleteCategoryFromSql,
  deleteExpenseFromSql,
  deleteHeroMediaFromSql,
  deleteProductFromSql,
  deleteReviewFromSql,
  getHeroMediaFromSql,
  insertCouponToSql,
  insertExpenseToSql,
  insertOrderToSql,
  insertReviewToSql,
  insertSubscriberToSql,
  listHeroMediaFromSql,
  loadOrSeedStoreFromSql,
  replaceProductsInSql,
  saveHeroMediaToSql,
  saveStoreConfigToSql,
  updateOrderInSql,
  updateReviewVerifiedInSql,
  upsertCategoryToSql,
  upsertProductToSql,
  type StoreSnapshot,
} from './src/db/storeRepo.ts';
import { getOrCreateUser, getUserByUid } from './src/db/users.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { optionalAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  createDefaultFooterConfig,
  DEFAULT_HEADER_CONFIG,
  mergeFooterConfig,
  mergeHeaderConfig,
} from './src/utils/headerFooterDefaults.ts';
import { mergeHomeCustomization } from './src/utils/homeCustomizationDefaults.ts';

dotenv.config();

interface AdminAuthRecord {
  salt: string;
  passwordHash: string;
  claimedAt: string;
}

interface PendingPaymentSession {
  id: string;
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
  paymentMethod: Exclude<PaymentMethod, 'cod'>;
  source: 'Web' | 'POS';
  channel: string;
  createdAt: number;
}

interface StoreDatabase extends StoreSnapshot {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  orders: Order[];
  subscribers: Subscriber[];
  coupons: Coupon[];
  expenses: Expense[];
  reviews: ProductReview[];
  adminAuth: AdminAuthRecord | null;
  adminOwnerUid?: string | null;
  sessionSecret?: string;
  catalogModified?: boolean;
}

const PRIMARY_DATA_DIR = path.resolve(process.cwd(), 'data');
const PRIMARY_DB_FILE = path.resolve(PRIMARY_DATA_DIR, 'store.json');
const FALLBACK_DATA_DIR = '/tmp/classy-cases-data';
const FALLBACK_DB_FILE = path.resolve(FALLBACK_DATA_DIR, 'store.json');
let activeDataDir = PRIMARY_DATA_DIR;
let activeDbFile = PRIMARY_DB_FILE;
const pendingPayments = new Map<string, PendingPaymentSession>();

function createInitialData(): StoreDatabase {
  const now = new Date().toISOString();
  return {
    settings: {
      storeName: 'Classy Cases',
      tagline: 'Premium phone cases, made to fit "Your Perfect Case". Everyday protection. Effortless style.',
      logoUrl: '',
      faviconUrl: '',
      orderPrefix: '',
      nextOrderNumber: 1001,
      takePreOrders: true,
      autoMovePending: true,
      costingMethod: 'FIFO',
      phone: '01799576210',
      email: 'mdebrahim.contact@gmail.com',
      address: 'Tilapara, Ekuria, Dhaka Jute Mills,',
      openingHours: '10:00 AM - 10:00 PM',
      shippingInsideDhaka: 60,
      shippingOutsideDhaka: 120,
      freeShippingThreshold: 1500,
      seoTitle: 'Classy Cases — Premium Phone Cases & Accessories',
      seoDescription: 'Premium phone cases, made to fit Your Perfect Case. Everyday protection. Effortless style.',
      paymentGateways: {
        bkash: { enabled: true, merchantNumber: '01799576210', mode: 'sandbox' },
        nagad: { enabled: true, merchantNumber: '01799576210', mode: 'sandbox' },
        card: { enabled: true, provider: 'SSLCommerz', storeId: 'classycases_live', mode: 'sandbox' },
        cod: { enabled: true },
      },
      storefrontConfig: {
        shopPageColumns: 5,
        showOutOfStock: true,
        showStockBadgeOnProduct: true,
        showRelatedProducts: true,
        checkoutRequireEmail: false,
        checkoutNoteEnabled: true,
        thankYouHeadline: 'Thank you for your order!',
        thankYouMessage: 'We have received your order and will confirm dispatch shortly.',
        reviewsEnabled: true,
        reviewsAutoApprove: true,
        homeReviewsOnlyFiveStar: true,
        homeCustomization: mergeHomeCustomization(),
        sizeGuideTitle: 'Phone Model & Case Fit Guide',
        sizeGuideNotes: 'Verify your exact device model under Settings -> About Phone before selecting your case.',
        offerPageTitle: 'Flash Deals & Combo Offers',
        offerPageBannerText: 'Up to 30% OFF on MagSafe & Carbon Armor Cases.',
        popupOfferEnabled: false,
        popupOfferHeadline: 'Get 10% OFF Your First Case',
        popupOfferCode: 'CLASSY10',
      },
      headerConfig: { ...DEFAULT_HEADER_CONFIG },
      footerConfig: createDefaultFooterConfig({
        storeName: 'Classy Cases',
        tagline: 'Premium phone cases, made to fit "Your Perfect Case". Everyday protection. Effortless style.',
        phone: '01799576210',
        email: 'mdebrahim.contact@gmail.com',
        address: 'Tilapara, Ekuria, Dhaka Jute Mills,',
        shippingInsideDhaka: 60,
        shippingOutsideDhaka: 120,
        freeShippingThreshold: 1500,
      }),
      orderSettings: {
        sources: ['Web', 'POS', 'Facebook Page', 'Instagram DM', 'WhatsApp'],
        quickNotes: ['Call customer before dispatch', 'Check exact camera cutout', 'Urgent same-day Dhaka delivery'],
      },
      deliverySettings: {
        shippingClasses: [
          { name: 'Standard Case', fee: 60, defaultWeightKg: 0.25 },
          { name: 'Fragile Armor', fee: 80, defaultWeightKg: 0.45 },
          { name: 'Express Courier', fee: 120, defaultWeightKg: 0.5 },
        ],
        courierProvider: 'Steadfast',
        courierApiKey: '',
        courierSecretKey: '',
        fraudCheckEnabled: true,
        fraudThresholdPercent: 30,
      },
      marketingSettings: {
        metaPixelId: '',
        gtmId: '',
        tiktokPixelId: '',
      },
      systemSettings: {
        smtpFromName: 'Classy Cases',
        smtpReplyTo: 'mdebrahim.contact@gmail.com',
        orderEmailNotifications: true,
        lowStockAlertEnabled: true,
        requireTwoFactorAdmin: false,
        invoiceHeaderNote: 'Classy Cases — Premium Everyday Protection',
        invoiceFooterNote: '7-day fit guarantee. Contact 01799576210 for support.',
        supportAccessEnabled: false,
      },
    },
    categories: [
      { id: 'cat-moto', name: 'Motorola', slug: 'motorola', brandKey: 'motorola', featured: true },
      { id: 'cat-vivo', name: 'VIVO', slug: 'vivo', brandKey: 'vivo', featured: true },
      { id: 'cat-xiaomi', name: 'Xiaomi', slug: 'xiaomi', brandKey: 'xiaomi', featured: true },
    ],
    products: [
      {
        id: 'prod-1',
        title: 'Magsafe Frosted Syndee Case for Motorola Edge 50',
        slug: 'magsafe-frosted-syndee-case-motorola-edge-50',
        category: 'Motorola',
        brandModels: ['Motorola Edge 50 Pro', 'Motorola Edge 50 Fusion', 'Motorola G85 5G'],
        price: 250,
        originalPrice: 350,
        discountPercent: 29,
        stock: 34,
        sku: 'CC-MOT-001',
        image: '/src/assets/images/case_magsafe_frosted_gold_1795455910914.jpg',
        description:
          'Anti-fingerprint frosted translucent matte back with strong N52 magnetic ring and raised metallic rose-gold camera bezel for everyday drop protection.',
        featured: true,
        createdAt: now,
      },
      {
        id: 'prod-2',
        title: 'Magsafe Frosted Syndee Case for Redmi Note 13',
        slug: 'magsafe-frosted-syndee-case-redmi-note-13',
        category: 'Xiaomi',
        brandModels: ['Redmi Note 13 Pro', 'Redmi Note 13 5G', 'Xiaomi 14 Civi'],
        price: 250,
        originalPrice: 350,
        discountPercent: 29,
        stock: 42,
        sku: 'CC-XIA-002',
        image: '/src/assets/images/case_magsafe_frosted_copper_1795455911268.jpg',
        description:
          'Translucent smoky frosted shield engineered with shock-absorbing TPU edges, tactile metallic buttons, and MagSafe wireless charging alignment.',
        featured: true,
        createdAt: now,
      },
      {
        id: 'prod-3',
        title: 'Solid Color Chubby with Electroplated Camera Frame',
        slug: 'solid-color-chubby-electroplated-camera-frame',
        category: 'VIVO',
        brandModels: ['Vivo V30 Pro', 'Vivo V40 5G', 'Vivo Y200e'],
        price: 250,
        originalPrice: 350,
        discountPercent: 29,
        stock: 28,
        sku: 'CC-VIV-003',
        image: '/src/assets/images/case_pastel_electroplated_1795455911610.jpg',
        description:
          'Soft-touch liquid silicone chubby bumper with plush microfiber lining and a precision electroplated silver lens guard.',
        featured: true,
        createdAt: now,
      },
      {
        id: 'prod-4',
        title: 'Camera Lens Holder Carbon fiber Pattern Matte Case',
        slug: 'camera-lens-holder-carbon-fiber-pattern-matte-case',
        category: 'Xiaomi',
        brandModels: ['Redmi Note 13 Pro+', 'Poco X6 Pro', 'Xiaomi 13T'],
        price: 850,
        originalPrice: 1050,
        discountPercent: 19,
        stock: 19,
        sku: 'CC-XIA-004',
        image: '/src/assets/images/case_carbon_lens_holder_1795455912129.jpg',
        description:
          'Woven carbon-fiber texture shell featuring an integrated 360-degree aluminum kickstand ring and recessed lens armor.',
        featured: true,
        createdAt: now,
      },
      {
        id: 'prod-5',
        title: 'Luxury Carbon Fiber Texture Matte PU Leather Case',
        slug: 'luxury-carbon-fiber-texture-matte-pu-leather-case',
        category: 'Motorola',
        brandModels: ['Motorola Edge 50 Ultra', 'Motorola Razr 50', 'Motorola Edge 40 Neo'],
        price: 600,
        originalPrice: 850,
        discountPercent: 29,
        stock: 24,
        sku: 'CC-MOT-005',
        image: '/src/assets/images/case_luxury_carbon_red_1795455912097.jpg',
        description:
          'Executive matte PU leather and aramid-inspired carbon weave finish accented with crimson racing trim and slim pocket-friendly profile.',
        featured: true,
        createdAt: now,
      },
      {
        id: 'prod-6',
        title: 'Crystal Clear Anti-Yellowing MagSafe Armor for VIVO',
        slug: 'crystal-clear-anti-yellowing-magsafe-armor-vivo',
        category: 'VIVO',
        brandModels: ['Vivo X100 Pro', 'Vivo V30', 'Vivo T3 5G'],
        price: 390,
        originalPrice: 550,
        discountPercent: 29,
        stock: 31,
        sku: 'CC-VIV-006',
        image: '/src/assets/images/case_crystal_clear_vivo_1795455912579.jpg',
        description:
          'Optical-grade Bayer TPU hybrid crystal case with air-pocket reinforced corners and embedded silver MagSafe array.',
        featured: true,
        createdAt: now,
      },
    ],
    orders: [],
    subscribers: [],
    coupons: [
      { id: 'coup-1', code: 'CLASSY10', discountPercent: 10, active: true },
      { id: 'coup-2', code: 'WELCOME15', discountPercent: 15, active: true },
    ],
    expenses: [],
    reviews: [],
    adminAuth: null,
    catalogModified: false,
  };
}

function loadDatabase(): StoreDatabase {
  const ensureWritableDir = (dir: string): boolean => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.accessSync(dir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  };

  if (ensureWritableDir(PRIMARY_DATA_DIR)) {
    activeDataDir = PRIMARY_DATA_DIR;
    activeDbFile = PRIMARY_DB_FILE;
  } else if (ensureWritableDir(FALLBACK_DATA_DIR)) {
    activeDataDir = FALLBACK_DATA_DIR;
    activeDbFile = FALLBACK_DB_FILE;
  }

  // Read existing bundled seed file even if primary dir is read-only
  const readCandidate = fs.existsSync(activeDbFile)
    ? activeDbFile
    : fs.existsSync(PRIMARY_DB_FILE)
      ? PRIMARY_DB_FILE
      : null;

  if (!readCandidate) {
    const initial = createInitialData();
    try {
      fs.writeFileSync(activeDbFile, JSON.stringify(initial, null, 2), 'utf8');
    } catch (err) {
      console.warn('Could not persist initial database file:', err);
    }
    return initial;
  }

  try {
    const raw = fs.readFileSync(readCandidate, 'utf8');
    const parsed = JSON.parse(raw) as StoreDatabase;
    if (!Array.isArray(parsed.expenses)) {
      parsed.expenses = [];
    }
    if (!Array.isArray(parsed.reviews)) {
      parsed.reviews = [];
    }
    if (readCandidate !== activeDbFile && !fs.existsSync(activeDbFile)) {
      try {
        fs.writeFileSync(activeDbFile, JSON.stringify(parsed, null, 2), 'utf8');
      } catch {
        // ignore copy error on read-only environments
      }
    }
    return parsed;
  } catch {
    const fallback = createInitialData();
    try {
      fs.writeFileSync(activeDbFile, JSON.stringify(fallback, null, 2), 'utf8');
    } catch {
      // ignore write error
    }
    return fallback;
  }
}

let db: StoreDatabase = createInitialData();
let storeLoaded = false;
let storeInitPromise: Promise<void> | null = null;

function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret) return envSecret;
  if (!db.sessionSecret) {
    db.sessionSecret = crypto.randomBytes(32).toString('hex');
    saveDatabase();
  }
  return db.sessionSecret;
}

async function ensureStoreLoaded(): Promise<void> {
  if (storeLoaded) return;
  if (storeInitPromise) {
    await storeInitPromise;
    return;
  }

  storeInitPromise = (async () => {
    const diskSnapshot = loadDatabase();
    if (!isSqlConfigured()) {
      db = diskSnapshot;
      if (!process.env.SESSION_SECRET?.trim() && !db.sessionSecret) {
        db.sessionSecret = crypto.randomBytes(32).toString('hex');
        saveDatabase();
      }
      storeLoaded = true;
      return;
    }

    const sqlSnapshot = await loadOrSeedStoreFromSql(() => {
      if (!process.env.SESSION_SECRET?.trim() && !diskSnapshot.sessionSecret) {
        diskSnapshot.sessionSecret = crypto.randomBytes(32).toString('hex');
      }
      return diskSnapshot;
    });

    db = {
      ...sqlSnapshot,
      expenses: Array.isArray(sqlSnapshot.expenses) ? sqlSnapshot.expenses : [],
      reviews: Array.isArray(sqlSnapshot.reviews) ? sqlSnapshot.reviews : [],
      adminOwnerUid: sqlSnapshot.adminOwnerUid ?? null,
    };

    if (!process.env.SESSION_SECRET?.trim() && !db.sessionSecret) {
      db.sessionSecret = crypto.randomBytes(32).toString('hex');
      await saveStoreConfigToSql({ sessionSecret: db.sessionSecret });
    }

    storeLoaded = true;
  })();

  try {
    await storeInitPromise;
  } finally {
    storeInitPromise = null;
  }
}

function saveDatabase(): void {
  try {
    if (!fs.existsSync(activeDataDir)) {
      fs.mkdirSync(activeDataDir, { recursive: true });
    }
    fs.writeFileSync(activeDbFile, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    try {
      if (!fs.existsSync(FALLBACK_DATA_DIR)) {
        fs.mkdirSync(FALLBACK_DATA_DIR, { recursive: true });
      }
      activeDataDir = FALLBACK_DATA_DIR;
      activeDbFile = FALLBACK_DB_FILE;
      fs.writeFileSync(activeDbFile, JSON.stringify(db, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist store database:', err);
    }
  }
}

function hashPassword(password: string, salt?: string): { salt: string; passwordHash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, passwordHash: derived };
}

function verifyScryptPassword(password: string, record: AdminAuthRecord): boolean {
  const derived = crypto.scryptSync(password, record.salt, 64);
  const stored = Buffer.from(record.passwordHash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

function verifyEnvPasscode(candidate: string, expected: string): boolean {
  const h1 = crypto.createHash('sha256').update(candidate).digest();
  const h2 = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(h1, h2);
}

function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      iat: Date.now(),
      exp: Date.now() + 90 * 24 * 60 * 60 * 1000,
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  const b1 = Buffer.from(sig);
  const b2 = Buffer.from(expectedSig);
  if (b1.length !== b2.length || !crypto.timingSafeEqual(b1, b2)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number; role?: string };
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function normalizePhoneTail(phone: string): string {
  return phone.replace(/\D/g, '').slice(-8);
}

function createCustomerOrderToken(phone: string): string {
  const tail = normalizePhoneTail(phone);
  const payload = Buffer.from(
    JSON.stringify({
      role: 'customer_orders',
      tail,
      iat: Date.now(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyCustomerOrderToken(token: string): string | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  const b1 = Buffer.from(sig);
  const b2 = Buffer.from(expectedSig);
  if (b1.length !== b2.length || !crypto.timingSafeEqual(b1, b2)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
      role?: string;
      tail?: string;
    };
    if (
      parsed.role === 'customer_orders' &&
      typeof parsed.tail === 'string' &&
      parsed.tail.length >= 8 &&
      typeof parsed.exp === 'number' &&
      parsed.exp > Date.now()
    ) {
      return parsed.tail;
    }
    return null;
  } catch {
    return null;
  }
}

const ADMIN_COOKIE_NAME = 'cc_admin_session';
const ADMIN_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header || typeof header !== 'string') return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const proto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return proto === 'https';
}

function setAdminSessionCookie(req: Request, res: Response, token: string): void {
  const https = isHttpsRequest(req);
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${ADMIN_COOKIE_MAX_AGE_SECONDS}`,
    'HttpOnly',
    https ? 'Secure' : '',
    https ? 'SameSite=None' : 'SameSite=Lax',
    https ? 'Partitioned' : '',
  ].filter(Boolean);
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAdminSessionCookie(req: Request, res: Response): void {
  const https = isHttpsRequest(req);
  const parts = [
    `${ADMIN_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    https ? 'Secure' : '',
    https ? 'SameSite=None' : 'SameSite=Lax',
    https ? 'Partitioned' : '',
  ].filter(Boolean);
  res.setHeader('Set-Cookie', parts.join('; '));
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function extractAdminCookieToken(req: Request): string | null {
  const cookies = parseCookies(req);
  return cookies[ADMIN_COOKIE_NAME] || null;
}

function isSameOriginMutation(req: Request): boolean {
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return true;
  const expectedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!expectedHost) return false;
  const sourceHeader = req.headers.origin || req.headers.referer;
  if (!sourceHeader || typeof sourceHeader !== 'string') return false;
  try {
    return new URL(sourceHeader).host.toLowerCase() === expectedHost;
  } catch {
    return false;
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const bearerToken = extractBearerToken(req);
  if (bearerToken) {
    if (verifySessionToken(bearerToken)) {
      next();
      return;
    }
    if (bearerToken.split('.').length === 3) {
      try {
        const decoded = await adminAuth.verifyIdToken(bearerToken);
        const existingUser = isSqlConfigured() ? await getUserByUid(decoded.uid) : null;
        if (
          existingUser?.role === 'admin' ||
          (db.adminOwnerUid && db.adminOwnerUid === decoded.uid)
        ) {
          next();
          return;
        }
      } catch {
        // Fall through to cookie / 401
      }
    }
  }

  const cookieToken = extractAdminCookieToken(req);
  if (cookieToken && verifySessionToken(cookieToken)) {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    if (isMutation && !isSameOriginMutation(req)) {
      res.status(403).json({ error: 'Cross-origin request blocked' });
      return;
    }
    next();
    return;
  }

  res.status(401).json({ error: 'Admin authentication required' });
}

function sanitizeSettingsForPublic(settings: StoreSettings) {
  return {
    storeName: settings.storeName,
    tagline: settings.tagline,
    logoUrl: settings.logoUrl || '',
    faviconUrl: settings.faviconUrl || '',
    orderPrefix: settings.orderPrefix,
    takePreOrders: settings.takePreOrders,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    openingHours: settings.openingHours,
    shippingInsideDhaka: settings.shippingInsideDhaka,
    shippingOutsideDhaka: settings.shippingOutsideDhaka,
    freeShippingThreshold: settings.freeShippingThreshold,
    reviewsEnabled: settings.storefrontConfig?.reviewsEnabled !== false,
    homeReviewsOnlyFiveStar: settings.storefrontConfig?.homeReviewsOnlyFiveStar !== false,
    homeCustomization: mergeHomeCustomization(settings.storefrontConfig?.homeCustomization),
    shopPageColumns: ([2, 3, 4, 5].includes(Number(settings.storefrontConfig?.shopPageColumns))
      ? Number(settings.storefrontConfig?.shopPageColumns)
      : 5) as 2 | 3 | 4 | 5,
    headerConfig: mergeHeaderConfig(settings.headerConfig),
    footerConfig: mergeFooterConfig(settings.footerConfig, {
      storeName: settings.storeName,
      tagline: settings.tagline,
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      openingHours: settings.openingHours,
      shippingInsideDhaka: settings.shippingInsideDhaka,
      shippingOutsideDhaka: settings.shippingOutsideDhaka,
      freeShippingThreshold: settings.freeShippingThreshold,
    }),
    paymentGateways: {
      bkash: {
        enabled: settings.paymentGateways.bkash.enabled,
        mode: settings.paymentGateways.bkash.mode,
        logoUrl: settings.paymentGateways.bkash.logoUrl || '',
      },
      nagad: {
        enabled: settings.paymentGateways.nagad.enabled,
        mode: settings.paymentGateways.nagad.mode,
        logoUrl: settings.paymentGateways.nagad.logoUrl || '',
      },
      card: {
        enabled: settings.paymentGateways.card.enabled,
        provider: settings.paymentGateways.card.provider,
        mode: settings.paymentGateways.card.mode,
        logoUrl: settings.paymentGateways.card.logoUrl || '',
      },
      cod: {
        enabled: settings.paymentGateways.cod.enabled,
        logoUrl: settings.paymentGateways.cod.logoUrl || '',
      },
    },
  };
}

function buildOrderCalculation(
  rawItems: Array<{ productId: string; quantity: number; model?: string }>,
  deliveryArea: 'inside_dhaka' | 'outside_dhaka',
  couponCode?: string
) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Cart is empty');
  }

  const orderItems: OrderItem[] = [];
  let subtotal = 0;

  for (const reqItem of rawItems) {
    if (!reqItem || typeof reqItem.productId !== 'string' || !Number.isInteger(reqItem.quantity) || reqItem.quantity < 1) {
      throw new Error('Invalid order item');
    }
    const product = db.products.find((p) => p.id === reqItem.productId);
    if (!product) {
      throw new Error('Product not found');
    }
    if (!db.settings.takePreOrders && product.stock < reqItem.quantity) {
      throw new Error(`Insufficient stock for ${product.title}`);
    }
    const lineTotal = product.price * reqItem.quantity;
    subtotal += lineTotal;
    orderItems.push({
      productId: product.id,
      title: product.title,
      model: (reqItem.model || product.brandModels[0] || 'Standard Fit').slice(0, 80),
      image: product.image,
      price: product.price,
      quantity: reqItem.quantity,
    });
  }

  let discountAmount = 0;
  let appliedCoupon: string | undefined;
  if (couponCode && typeof couponCode === 'string') {
    const normalized = couponCode.trim().toUpperCase();
    const coupon = db.coupons.find((c) => c.code === normalized && c.active);
    if (coupon) {
      discountAmount = Math.round((subtotal * coupon.discountPercent) / 100);
      appliedCoupon = coupon.code;
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const baseShipping =
    deliveryArea === 'outside_dhaka' ? db.settings.shippingOutsideDhaka : db.settings.shippingInsideDhaka;
  const shippingFee =
    db.settings.freeShippingThreshold > 0 && afterDiscount >= db.settings.freeShippingThreshold ? 0 : baseShipping;
  const total = afterDiscount + shippingFee;

  return { orderItems, subtotal, discountAmount, appliedCoupon, shippingFee, total };
}

async function finalizeOrder(params: {
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
  paymentStatus: 'paid' | 'pending';
  transactionId: string;
  source: 'Web' | 'POS';
  channel: string;
  userId?: number;
}): Promise<Order> {
  const num = db.settings.nextOrderNumber;
  db.settings.nextOrderNumber += 1;
  const orderNumber = `${db.settings.orderPrefix}${num}`;
  const now = new Date().toISOString();

  const updatedProducts: Product[] = [];
  for (const item of params.items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
      updatedProducts.push(product);
    }
  }

  const order: Order = {
    id: `ord-${crypto.randomUUID().slice(0, 8)}`,
    orderNumber,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    customerEmail: params.customerEmail,
    deliveryAddress: params.deliveryAddress,
    deliveryArea: params.deliveryArea,
    items: params.items,
    subtotal: params.subtotal,
    shippingFee: params.shippingFee,
    discountAmount: params.discountAmount,
    couponCode: params.couponCode,
    total: params.total,
    paymentMethod: params.paymentMethod,
    paymentStatus: params.paymentStatus,
    fulfillmentStatus: params.paymentStatus === 'paid' ? 'confirmed' : 'pending',
    transactionId: params.transactionId,
    source: params.source,
    channel: params.channel,
    createdAt: now,
    updatedAt: now,
  };

  if (isSqlConfigured()) {
    await insertOrderToSql(order, db.settings, updatedProducts, params.userId);
  }
  db.orders.unshift(order);
  saveDatabase();
  return order;
}

function computeDashboardAnalytics(): DashboardAnalytics {
  const validOrders = db.orders.filter((o) => o.fulfillmentStatus !== 'cancelled');
  const totalOrders = validOrders.length;
  const bookedSales = validOrders.reduce((acc, o) => acc + o.total, 0);
  const deliveredSales = validOrders
    .filter((o) => o.fulfillmentStatus === 'delivered' || o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + o.total, 0);
  const estimateFromOrders = validOrders.reduce((acc, o) => acc + Math.round(o.total * 0.35), 0);

  const placedCount = validOrders.length;
  const shippedOrDeliveredCount = validOrders.filter(
    (o) => o.fulfillmentStatus === 'shipped' || o.fulfillmentStatus === 'delivered'
  ).length;

  const needsAttentionOrders = validOrders.filter(
    (o) => o.fulfillmentStatus === 'pending' || o.fulfillmentStatus === 'confirmed'
  );

  const hourBuckets = [0, 3, 6, 9, 12, 15, 18, 21];
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const hourlySeries = hourBuckets.map((h) => {
    const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    const today = validOrders.filter((o) => {
      if (!o.createdAt.startsWith(todayStr)) return false;
      const oh = new Date(o.createdAt).getHours();
      return oh >= h && oh < h + 3;
    }).length;
    const yesterday = validOrders.filter((o) => {
      if (!o.createdAt.startsWith(yesterdayDate)) return false;
      const oh = new Date(o.createdAt).getHours();
      return oh >= h && oh < h + 3;
    }).length;
    return { label, today, yesterday };
  });

  const dayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const orderVolumeSeries = [{ label: dayLabel, placed: placedCount, shipped: shippedOrDeliveredCount }];

  const productMap = new Map<string, { productId: string; title: string; image: string; unitsSold: number; revenue: number }>();
  for (const ord of validOrders) {
    for (const item of ord.items) {
      const existing = productMap.get(item.productId) || {
        productId: item.productId,
        title: item.title,
        image: item.image,
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += item.quantity;
      existing.revenue += item.price * item.quantity;
      productMap.set(item.productId, existing);
    }
  }
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);

  const sourceMap = new Map<string, { source: string; count: number; total: number }>();
  const channelMap = new Map<string, { channel: string; count: number; total: number }>();
  for (const ord of validOrders) {
    const s = sourceMap.get(ord.source) || { source: ord.source, count: 0, total: 0 };
    s.count += 1;
    s.total += ord.total;
    sourceMap.set(ord.source, s);

    const c = channelMap.get(ord.channel) || { channel: ord.channel, count: 0, total: 0 };
    c.count += 1;
    c.total += ord.total;
    channelMap.set(ord.channel, c);
  }

  return {
    totalOrders,
    bookedSales,
    deliveredSales,
    estimateFromOrders,
    placedCount,
    shippedOrDeliveredCount,
    needsAttentionOrders,
    hourlySeries,
    orderVolumeSeries,
    topProducts,
    ordersBySource: Array.from(sourceMap.values()),
    salesByChannel: Array.from(channelMap.values()),
    totalProducts: db.products.length,
    lowStockProducts: db.products.filter((p) => p.trackStock !== false && p.stock < 5),
  };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  const ensureHeroVideosDir = () => {
    const dir = path.resolve(activeDataDir, 'hero-videos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  };

  const getPublicHeroVideosDir = () => {
    return path.resolve(process.cwd(), 'public', 'media', 'hero-videos');
  };

  const getDistHeroVideosDir = () => {
    return path.resolve(process.cwd(), 'dist', 'media', 'hero-videos');
  };

  const writeHeroMediaMirrors = (filename: string, rawBuffer: Buffer) => {
    const primaryDir = ensureHeroVideosDir();
    fs.writeFileSync(path.join(primaryDir, filename), rawBuffer);

    const mirrorDirs = [getPublicHeroVideosDir()];
    const distRoot = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distRoot)) {
      mirrorDirs.push(getDistHeroVideosDir());
    }
    for (const mirrorDir of mirrorDirs) {
      try {
        if (!fs.existsSync(mirrorDir)) {
          fs.mkdirSync(mirrorDir, { recursive: true });
        }
        fs.writeFileSync(path.join(mirrorDir, filename), rawBuffer);
      } catch {
        // Ignore read-only mirror directories in restricted runtimes
      }
    }
  };

  const inferHeroMediaMime = (fileName: string, fallback = 'video/mp4') => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.webm')) return 'video/webm';
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.ogv')) return 'video/ogg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    return fallback;
  };

  const serveMediaBufferWithRange = (
    req: Request,
    res: Response,
    buffer: Buffer,
    mimeType: string
  ) => {
    const total = buffer.length;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.setHeader('Content-Type', mimeType);

    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', total);
      res.status(200).end();
      return;
    }

    const rangeHeader = req.headers.range;
    if (rangeHeader && typeof rangeHeader === 'string' && rangeHeader.startsWith('bytes=')) {
      const match = rangeHeader.replace('bytes=', '').match(/^(\d*)-(\d*)$/);
      if (match) {
        const start = match[1] ? Number.parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(total - 1, Number.parseInt(match[2], 10)) : total - 1;
        if (!Number.isNaN(start) && !Number.isNaN(end) && start >= 0 && start <= end && start < total) {
          const chunk = buffer.subarray(start, end + 1);
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
          res.setHeader('Content-Length', chunk.length);
          res.end(chunk);
          return;
        }
        res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
        return;
      }
    }

    res.status(200);
    res.setHeader('Content-Length', total);
    res.end(buffer);
  };

  app.use('/media/hero-videos', (req, res, next) => {
    express.static(ensureHeroVideosDir(), {
      maxAge: '7d',
      fallthrough: true,
    })(req, res, next);
  });

  app.use('/media/hero-videos', (req, res, next) => {
    const pubDir = getPublicHeroVideosDir();
    if (!fs.existsSync(pubDir)) {
      next();
      return;
    }
    express.static(pubDir, {
      maxAge: '7d',
      fallthrough: true,
    })(req, res, next);
  });

  app.use('/media/hero-videos', (req, res, next) => {
    const distDirHero = getDistHeroVideosDir();
    if (!fs.existsSync(distDirHero)) {
      next();
      return;
    }
    express.static(distDirHero, {
      maxAge: '7d',
      fallthrough: true,
    })(req, res, next);
  });

  app.use('/media/hero-videos', async (req, res) => {
    const rawBase = path.basename(req.path || '').trim();
    if (isSqlConfigured() && rawBase && /^[a-zA-Z0-9._-]+$/.test(rawBase)) {
      try {
        const record = await getHeroMediaFromSql(rawBase);
        if (record && record.buffer.length > 0) {
          try {
            writeHeroMediaMirrors(rawBase, record.buffer);
          } catch {
            // ignore mirror cache errors
          }
          serveMediaBufferWithRange(
            req,
            res,
            record.buffer,
            inferHeroMediaMime(rawBase, record.mimeType)
          );
          return;
        }
      } catch {
        // fall through to 404
      }
    }
    res.status(404).json({ error: 'Hero video file not found' });
  });

  app.use(
    '/assets/videos',
    express.static(path.resolve(process.cwd(), 'public/assets/videos'), {
      maxAge: '1d',
      fallthrough: true,
    })
  );

  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', async (_req, res, next) => {
    try {
      await ensureStoreLoaded();
      next();
    } catch (err) {
      console.error('Failed to initialize Cloud SQL store:', err);
      res.status(503).json({ error: 'Database temporarily unavailable. Please try again shortly.' });
    }
  });

  const isSafeImageSource = (val: unknown): val is string => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    return (
      trimmed.startsWith('/src/assets/') ||
      trimmed.startsWith('/assets/') ||
      /^https?:\/\//i.test(trimmed) ||
      /^data:image\/(png|jpeg|jpg|pjpeg|webp|gif|avif|bmp|x-icon|vnd\.microsoft\.icon)(?:;charset=[^;]+)?;base64,[A-Za-z0-9+/=\s]+$/i.test(
        trimmed
      )
    );
  };

  function buildSimulatedReviews(product: Product): ProductReview[] {
    const models =
      product.brandModels && product.brandModels.length > 0
        ? product.brandModels
        : [`${product.category} Series`];
    const seed = product.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    const templates = [
      {
        authorName: 'Tanvir Ahmed',
        rating: 5,
        daysAgo: 3,
        comment: `Cutouts line up perfectly on my ${models[0]}. The buttons feel crisp and the raised camera lip protects the lenses on flat tables.`,
      },
      {
        authorName: 'Nusrat Jahan',
        rating: 5,
        daysAgo: 8,
        comment: `Ordered for my ${models[1 % models.length]} and received delivery in Dhaka within 24 hours. Grip feels premium without making the phone bulky.`,
      },
      {
        authorName: 'Sabbir Hossain',
        rating: seed % 2 === 0 ? 5 : 4,
        daysAgo: 14,
        comment: `Really happy with the finish and build quality at ৳${product.price}. Fits ${models[2 % models.length]} snugly with zero wobble.`,
      },
      {
        authorName: 'Farhana Karim',
        rating: 4,
        daysAgo: 21,
        comment: `Nice matte texture that keeps fingerprints away. Color and packaging matched the photos exactly.`,
      },
    ];

    return templates.map((tpl, idx) => ({
      id: `sim-rev-${product.id}-${idx + 1}`,
      productId: product.id,
      authorName: tpl.authorName,
      deviceModel: models[idx % models.length],
      rating: tpl.rating,
      comment: tpl.comment,
      verifiedPurchase: true,
      createdAt: new Date(Date.now() - tpl.daysAgo * 86400000).toISOString(),
    }));
  }

  // Public Storefront APIs
  app.get('/api/storefront', (_req, res) => {
    res.json({
      settings: sanitizeSettingsForPublic(db.settings),
      categories: db.categories.filter((c) => c.active !== false),
      products: db.products.filter((p) => p.active !== false),
      catalogModified: Boolean(db.catalogModified),
    });
  });

  app.get('/api/hero-videos', (_req, res) => {
    const saved = db.settings.heroVideos;
    if (saved && Array.isArray(saved.slides) && saved.slides.length > 0) {
      res.json({
        slides: saved.slides,
        config: saved.config || {
          activeSlideId: saved.slides[0].id,
          autoAdvanceSeconds: 9,
        },
      });
      return;
    }
    res.json({ slides: [], config: null });
  });

  app.get('/api/reviews', (_req, res) => {
    const activeProducts = db.products.filter((p) => p.active !== false);
    const productMap = new Map(activeProducts.map((p) => [p.id, p]));
    const fallbackProduct = activeProducts[0];

    const cities = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Cumilla', 'Gazipur', 'Narayanganj'];

    const userStorefrontReviews = (db.reviews || [])
      .map((rev, idx) => {
        const prod = productMap.get(rev.productId) || fallbackProduct;
        if (!prod) return null;
        return {
          id: rev.id,
          productId: prod.id,
          productTitle: prod.title,
          productImage: prod.image,
          productPrice: prod.price,
          authorName: rev.authorName,
          city: cities[idx % cities.length],
          deviceModel: rev.deviceModel || prod.brandModels[0] || 'Standard Fit',
          rating: rev.rating,
          comment: rev.comment,
          verifiedPurchase: rev.verifiedPurchase,
          createdAt: rev.createdAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const showcaseReviews = activeProducts.slice(0, 6).flatMap((prod, pIdx) => {
      const sim = buildSimulatedReviews(prod);
      const selected =
        activeProducts.length <= 2
          ? sim
          : pIdx < 3
            ? sim.slice(0, 2)
            : sim.slice(0, 1);
      return selected.map((rev, rIdx) => ({
        id: `storefront-${rev.id}`,
        productId: prod.id,
        productTitle: prod.title,
        productImage: prod.image,
        productPrice: prod.price,
        authorName: rev.authorName,
        city: cities[(pIdx + rIdx * 3) % cities.length],
        deviceModel: rev.deviceModel,
        rating: rev.rating,
        comment: rev.comment,
        verifiedPurchase: true,
        createdAt: rev.createdAt,
      }));
    });

    const onlyFiveStar = db.settings.storefrontConfig?.homeReviewsOnlyFiveStar !== false;
    const allCombined = [...userStorefrontReviews, ...showcaseReviews];
    const combined = (onlyFiveStar
      ? allCombined.filter((r) => r.rating >= 5)
      : allCombined
    ).slice(0, 12);
    const totalCount = combined.length;
    const sum = combined.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = totalCount > 0 ? Number((sum / totalCount).toFixed(1)) : 5.0;
    const fiveStarCount = combined.filter((r) => r.rating >= 5).length;

    res.json({
      reviews: combined,
      averageRating,
      totalCount,
      fiveStarPercent: totalCount > 0 ? Math.round((fiveStarCount / totalCount) * 100) : 100,
      onlyFiveStar,
    });
  });

  app.get('/api/products/:id/reviews', (req, res) => {
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const userReviews = (db.reviews || []).filter((r) => r.productId === product.id);
    const simulated = buildSimulatedReviews(product);
    const allReviews = [...userReviews, ...simulated];
    const totalCount = allReviews.length;
    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = totalCount > 0 ? Number((sum / totalCount).toFixed(1)) : 0;

    const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of allReviews) {
      const bucket = Math.min(5, Math.max(1, Math.round(r.rating)));
      ratingBreakdown[bucket] = (ratingBreakdown[bucket] || 0) + 1;
    }

    res.json({
      reviews: allReviews,
      averageRating,
      totalCount,
      ratingBreakdown,
    });
  });

  app.post('/api/products/:id/reviews', async (req, res) => {
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const authorName = typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';
    const deviceModel =
      typeof req.body?.deviceModel === 'string' && req.body.deviceModel.trim()
        ? req.body.deviceModel.trim()
        : product.brandModels[0] || 'Standard Fit';
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    const rating = Math.round(Number(req.body?.rating));

    if (authorName.length < 2) {
      res.status(400).json({ error: 'Please enter your name' });
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5 stars' });
      return;
    }
    if (comment.length < 5) {
      res.status(400).json({ error: 'Please write a short review (at least 5 characters)' });
      return;
    }

    const review: ProductReview = {
      id: `rev-${crypto.randomUUID().slice(0, 8)}`,
      productId: product.id,
      authorName: authorName.slice(0, 60),
      deviceModel: deviceModel.slice(0, 60),
      rating,
      comment: comment.slice(0, 500),
      verifiedPurchase: false,
      createdAt: new Date().toISOString(),
    };

    try {
      if (isSqlConfigured()) {
        await insertReviewToSql(review);
      }
      db.reviews.unshift(review);
      saveDatabase();
      res.status(201).json({ review });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save review' });
    }
  });

  app.post('/api/coupons/validate', (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const coupon = db.coupons.find((c) => c.code === code && c.active);
    if (!coupon) {
      res.status(404).json({ error: 'Invalid or expired promo code' });
      return;
    }
    res.json({ code: coupon.code, discountPercent: coupon.discountPercent });
  });

  app.post('/api/newsletter', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }
    try {
      if (!db.subscribers.some((s) => s.email === email)) {
        const sub: Subscriber = {
          id: `sub-${crypto.randomUUID().slice(0, 8)}`,
          email,
          subscribedAt: new Date().toISOString(),
        };
        if (isSqlConfigured()) {
          await insertSubscriberToSql(sub);
        }
        db.subscribers.unshift(sub);
        saveDatabase();
      }
      res.json({ ok: true, message: 'Subscribed to Classy Cases updates' });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Subscription failed' });
    }
  });

  app.get('/api/orders/track', (req, res) => {
    const orderNumber = typeof req.query.orderNumber === 'string' ? req.query.orderNumber.trim() : '';
    const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : '';
    if (!orderNumber || !phone) {
      res.status(400).json({ error: 'Order number and phone number are required' });
      return;
    }
    const phoneTail = normalizePhoneTail(phone);
    if (phoneTail.length < 8) {
      res.status(400).json({ error: 'Please enter a valid phone number' });
      return;
    }
    const found = db.orders.find(
      (o) =>
        o.orderNumber.toLowerCase() === orderNumber.toLowerCase() &&
        normalizePhoneTail(o.customerPhone) === phoneTail
    );
    if (!found) {
      res.status(404).json({ error: 'No matching order found. Please check your Order ID and phone number.' });
      return;
    }
    res.json({
      order: found,
      customerOrderToken: createCustomerOrderToken(found.customerPhone),
    });
  });

  app.post('/api/orders/history', (req, res) => {
    const rawTokens = Array.isArray(req.body?.tokens) ? req.body.tokens : [];
    const lookupOrderNumber =
      typeof req.body?.orderNumber === 'string'
        ? req.body.orderNumber.trim().replace(/^#/, '')
        : '';
    const lookupPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';

    const verifiedTails = new Set<string>();
    for (const token of rawTokens.slice(0, 20)) {
      const tail = verifyCustomerOrderToken(token);
      if (tail) {
        verifiedTails.add(tail);
      }
    }

    let newToken: string | undefined;
    if (lookupOrderNumber || lookupPhone) {
      if (!lookupOrderNumber || !lookupPhone) {
        res.status(400).json({ error: 'Both Order Number and Phone Number are required to verify an order.' });
        return;
      }
      const phoneTail = normalizePhoneTail(lookupPhone);
      if (phoneTail.length < 8) {
        res.status(400).json({ error: 'Please enter a valid phone number.' });
        return;
      }
      const matched = db.orders.find(
        (o) =>
          o.orderNumber.toLowerCase() === lookupOrderNumber.toLowerCase() &&
          normalizePhoneTail(o.customerPhone) === phoneTail
      );
      if (!matched) {
        res.status(404).json({ error: 'No matching order found. Please verify your Order Number and Phone Number.' });
        return;
      }
      verifiedTails.add(normalizePhoneTail(matched.customerPhone));
      newToken = createCustomerOrderToken(matched.customerPhone);
    }

    if (verifiedTails.size === 0) {
      res.json({ orders: [] });
      return;
    }

    const orders = db.orders
      .filter((o) => verifiedTails.has(normalizePhoneTail(o.customerPhone)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ orders, newToken });
  });

  // Checkout & Online Payment Gateway Routes
  app.post('/api/checkout/initiate', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const {
        customerName,
        customerPhone,
        customerEmail = '',
        district = '',
        deliveryAddress,
        deliveryArea = 'inside_dhaka',
        items,
        couponCode,
        paymentMethod,
        source = 'Web',
      } = req.body || {};

      if (typeof customerName !== 'string' || customerName.trim().length < 2) {
        res.status(400).json({ error: 'Full name is required' });
        return;
      }
      if (typeof deliveryAddress !== 'string' || deliveryAddress.trim().length < 5) {
        res.status(400).json({ error: 'Complete delivery address is required' });
        return;
      }
      if (source !== 'POS' && (typeof district !== 'string' || district.trim().length < 2)) {
        res.status(400).json({ error: 'District is required' });
        return;
      }
      if (typeof customerPhone !== 'string' || customerPhone.replace(/\D/g, '').length < 8) {
        res.status(400).json({ error: 'Valid phone number is required' });
        return;
      }
      if (!['bkash', 'nagad', 'card', 'cod'].includes(paymentMethod)) {
        res.status(400).json({ error: 'Unsupported payment method' });
        return;
      }

      const gatewayConfig = db.settings.paymentGateways[paymentMethod as PaymentMethod];
      if (!gatewayConfig?.enabled) {
        res.status(400).json({ error: 'Selected payment method is currently disabled' });
        return;
      }

      const area = deliveryArea === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
      const calc = buildOrderCalculation(items, area, couponCode);

      if (paymentMethod === 'cod') {
        const order = await finalizeOrder({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: typeof customerEmail === 'string' ? customerEmail.trim() : '',
          deliveryAddress: deliveryAddress.trim(),
          deliveryArea: area,
          items: calc.orderItems,
          subtotal: calc.subtotal,
          shippingFee: calc.shippingFee,
          discountAmount: calc.discountAmount,
          couponCode: calc.appliedCoupon,
          total: calc.total,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          transactionId: `COD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          source: source === 'POS' ? 'POS' : 'Web',
          channel: 'Direct Storefront',
          userId: req.dbUserId,
        });
        res.json({
          status: 'completed',
          order,
          customerOrderToken: createCustomerOrderToken(order.customerPhone),
        });
        return;
      }

      const paymentSessionId = `pay_${crypto.randomUUID()}`;
      pendingPayments.set(paymentSessionId, {
        id: paymentSessionId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: typeof customerEmail === 'string' ? customerEmail.trim() : '',
        deliveryAddress: deliveryAddress.trim(),
        deliveryArea: area,
        items: calc.orderItems,
        subtotal: calc.subtotal,
        shippingFee: calc.shippingFee,
        discountAmount: calc.discountAmount,
        couponCode: calc.appliedCoupon,
        total: calc.total,
        paymentMethod,
        source: source === 'POS' ? 'POS' : 'Web',
        channel:
          paymentMethod === 'bkash'
            ? 'bKash Checkout'
            : paymentMethod === 'nagad'
              ? 'Nagad Checkout'
              : 'SSLCommerz Card',
        createdAt: Date.now(),
      });

      res.json({
        status: 'awaiting_payment',
        paymentSessionId,
        amount: calc.total,
        subtotal: calc.subtotal,
        shippingFee: calc.shippingFee,
        discountAmount: calc.discountAmount,
        paymentMethod,
        mode: 'mode' in gatewayConfig ? gatewayConfig.mode : 'sandbox',
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Checkout failed' });
    }
  });

  app.post('/api/payments/verify', optionalAuth, async (req: AuthRequest, res) => {
    const { paymentSessionId, accountNumber, pinOrOtp, cardNumber } = req.body || {};
    if (typeof paymentSessionId !== 'string') {
      res.status(400).json({ error: 'Invalid payment session' });
      return;
    }
    const session = pendingPayments.get(paymentSessionId);
    if (!session || Date.now() - session.createdAt > 15 * 60 * 1000) {
      res.status(404).json({ error: 'Payment session expired or not found' });
      return;
    }

    if (session.paymentMethod === 'bkash' || session.paymentMethod === 'nagad') {
      const digits = typeof accountNumber === 'string' ? accountNumber.replace(/\D/g, '') : '';
      const code = typeof pinOrOtp === 'string' ? pinOrOtp.trim() : '';
      if (digits.length < 11) {
        res.status(400).json({ error: 'Please enter a valid 11-digit mobile wallet number' });
        return;
      }
      if (code.length < 4) {
        res.status(400).json({ error: 'Please enter the 4–6 digit verification code / PIN' });
        return;
      }
    } else if (session.paymentMethod === 'card') {
      const cardDigits = typeof cardNumber === 'string' ? cardNumber.replace(/\D/g, '') : '';
      if (cardDigits.length < 12) {
        res.status(400).json({ error: 'Please enter a valid Visa or Mastercard number' });
        return;
      }
    }

    pendingPayments.delete(paymentSessionId);
    const prefix =
      session.paymentMethod === 'bkash' ? 'BKS' : session.paymentMethod === 'nagad' ? 'NGD' : 'SSL';
    const transactionId = `${prefix}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

    try {
      const order = await finalizeOrder({
        customerName: session.customerName,
        customerPhone: session.customerPhone,
        customerEmail: session.customerEmail,
        deliveryAddress: session.deliveryAddress,
        deliveryArea: session.deliveryArea,
        items: session.items,
        subtotal: session.subtotal,
        shippingFee: session.shippingFee,
        discountAmount: session.discountAmount,
        couponCode: session.couponCode,
        total: session.total,
        paymentMethod: session.paymentMethod,
        paymentStatus: 'paid',
        transactionId,
        source: session.source,
        channel: session.channel,
        userId: req.dbUserId,
      });

      res.json({
        status: 'paid',
        order,
        customerOrderToken: createCustomerOrderToken(order.customerPhone),
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Payment confirmation failed' });
    }
  });

  // Admin Auth Routes
  app.get('/api/admin/auth/status', (req, res) => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    const needsSetup = !envPasscode && !db.adminAuth;
    const bearerToken = extractBearerToken(req);
    const cookieToken = extractAdminCookieToken(req);
    const hasValidSession = Boolean(
      (bearerToken && verifySessionToken(bearerToken)) ||
        (cookieToken && verifySessionToken(cookieToken))
    );

    if (hasValidSession) {
      const refreshedToken = createSessionToken();
      setAdminSessionCookie(req, res, refreshedToken);
      res.json({ needsSetup, authenticated: true, token: refreshedToken });
      return;
    }

    res.json({ needsSetup, authenticated: false });
  });

  app.post('/api/admin/auth/setup', async (req, res) => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode || db.adminAuth) {
      res.status(409).json({ error: 'Admin password is already configured' });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    try {
      const hashed = hashPassword(password);
      db.adminAuth = {
        salt: hashed.salt,
        passwordHash: hashed.passwordHash,
        claimedAt: new Date().toISOString(),
      };
      if (isSqlConfigured()) {
        await saveStoreConfigToSql({ adminAuth: db.adminAuth });
      }
      saveDatabase();
      const token = createSessionToken();
      setAdminSessionCookie(req, res, token);
      res.json({ token });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Admin setup failed' });
    }
  });

  app.post('/api/admin/auth/firebase', async (req, res) => {
    const bearer = extractBearerToken(req);
    const idToken = bearer || (typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '');
    if (!idToken) {
      res.status(401).json({ error: 'Google sign-in token is required' });
      return;
    }

    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      const email = (decoded.email || '').trim().toLowerCase();
      const existingUser = isSqlConfigured() ? await getUserByUid(decoded.uid) : null;
      const storeOwnerEmail = (db.settings.email || '').trim().toLowerCase();

      const isAuthorized =
        existingUser?.role === 'admin' ||
        (db.adminOwnerUid && db.adminOwnerUid === decoded.uid) ||
        (!db.adminOwnerUid && (!db.adminAuth || (email && storeOwnerEmail && email === storeOwnerEmail)));

      if (!isAuthorized) {
        res.status(403).json({
          error: 'This Google account does not have store admin access. Sign in with the store owner Google account or admin password.',
        });
        return;
      }

      if (!db.adminOwnerUid) {
        db.adminOwnerUid = decoded.uid;
        if (isSqlConfigured()) {
          await saveStoreConfigToSql({ adminOwnerUid: decoded.uid });
        }
        saveDatabase();
      }

      if (isSqlConfigured()) {
        await getOrCreateUser(decoded.uid, decoded.email || '', 'admin');
      }

      const token = createSessionToken();
      setAdminSessionCookie(req, res, token);
      res.json({ token, user: { uid: decoded.uid, email: decoded.email || '' } });
    } catch (err) {
      console.error('Firebase admin auth failed:', err);
      res.status(401).json({ error: 'Google sign-in verification failed. Please try again.' });
    }
  });

  app.post('/api/admin/auth/login', (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();

    if (envPasscode) {
      if (!verifyEnvPasscode(password, envPasscode)) {
        res.status(401).json({ error: 'Invalid admin password' });
        return;
      }
      const token = createSessionToken();
      setAdminSessionCookie(req, res, token);
      res.json({ token });
      return;
    }

    if (!db.adminAuth) {
      res.status(400).json({ error: 'Admin account has not been claimed yet' });
      return;
    }

    if (!verifyScryptPassword(password, db.adminAuth)) {
      res.status(401).json({ error: 'Invalid admin password' });
      return;
    }

    const token = createSessionToken();
    setAdminSessionCookie(req, res, token);
    res.json({ token });
  });

  app.post('/api/admin/auth/logout', (req, res) => {
    clearAdminSessionCookie(req, res);
    res.json({ ok: true });
  });

  // Protected Admin Routes
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    res.json({
      analytics: computeDashboardAnalytics(),
      orders: db.orders,
      products: db.products,
      categories: db.categories,
      settings: db.settings,
      subscribers: db.subscribers,
      coupons: db.coupons,
      expenses: db.expenses || [],
      reviews: db.reviews || [],
      catalogModified: Boolean(db.catalogModified),
    });
  });

  app.post('/api/admin/products/sync', requireAdmin, async (req, res) => {
    const incoming = req.body?.products;
    if (!Array.isArray(incoming)) {
      res.status(400).json({ error: 'Invalid products payload' });
      return;
    }

    const sanitized: Product[] = incoming
      .filter((item): item is Product => Boolean(item && typeof item === 'object' && typeof item.title === 'string' && item.title.trim()))
      .map((item) => {
        const price = Number.isFinite(Number(item.price)) ? Math.max(0, Number(item.price)) : 0;
        const originalPrice = Number.isFinite(Number(item.originalPrice)) ? Math.max(0, Number(item.originalPrice)) : price;
        const safeImg = isSafeImageSource(item.image)
          ? item.image.trim()
          : '/src/assets/images/case_magsafe_frosted_gold_1795455910914.jpg';
        const safeGallery = Array.isArray(item.galleryImages)
          ? item.galleryImages.filter(isSafeImageSource).map((g) => g.trim()).slice(0, 4)
          : [];
        return {
          ...item,
          id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `prod-${crypto.randomUUID().slice(0, 8)}`,
          title: item.title.trim(),
          price,
          originalPrice,
          discountPercent: originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0,
          stock: Number.isFinite(Number(item.stock)) ? Math.max(0, Math.floor(Number(item.stock))) : 0,
          image: safeImg,
          galleryImages: safeGallery,
          brandModels: Array.isArray(item.brandModels) && item.brandModels.length > 0 ? item.brandModels.map(String) : ['Standard Fit'],
        };
      });

    try {
      if (isSqlConfigured()) {
        await replaceProductsInSql(sanitized);
      }
      db.products = sanitized;
      db.catalogModified = true;
      saveDatabase();
      res.json({ products: db.products, catalogModified: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to sync products' });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    const body = req.body || {};
    const {
      title,
      slug,
      category,
      brand,
      alsoShowIn,
      price,
      originalPrice,
      costPrice,
      stock,
      lowStockThreshold,
      trackStock,
      preOrderMode,
      sku,
      image,
      galleryImages,
      shortDescription,
      description,
      requiresShipping,
      weightKg,
      shippingClass,
      specifications,
      customerPrompt,
      seoTitle,
      seoDescription,
      brandModels,
      variantOptions,
      variants,
      active,
      featured,
    } = body;

    if (typeof title !== 'string' || title.trim().length < 2) {
      res.status(400).json({ error: 'Product name is required' });
      return;
    }
    const numericPrice = Number(price);
    const numericOriginal = Number(originalPrice) || numericPrice;
    const numericCost = Math.max(0, Number(costPrice) || 0);
    const numericStock = Math.max(0, Math.floor(Number(stock) || 0));
    const numericLowStock = Math.max(0, Math.floor(Number(lowStockThreshold ?? 5) || 5));
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      res.status(400).json({ error: 'Valid price is required' });
      return;
    }
    const discountPercent =
      numericOriginal > numericPrice ? Math.round(((numericOriginal - numericPrice) / numericOriginal) * 100) : 0;
    if (typeof image === 'string' && image.trim() !== '' && !isSafeImageSource(image)) {
      res.status(400).json({ error: 'Invalid product image format. Please upload a PNG, JPG, WEBP, or GIF image.' });
      return;
    }
    const safeImage =
      typeof image === 'string' && image.trim() !== ''
        ? image.trim()
        : '/src/assets/images/case_magsafe_frosted_gold_1795455910914.jpg';
    const safeGallery = Array.isArray(galleryImages)
      ? galleryImages.filter(isSafeImageSource).map((g) => g.trim()).slice(0, 4)
      : [];

    const fallbackSlug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const safeVariantOptions: ProductVariantOption[] = Array.isArray(variantOptions)
      ? variantOptions
          .filter((o) => o && typeof o.name === 'string' && Array.isArray(o.values))
          .map((o) => ({
            name: o.name.trim(),
            values: o.values.map((v: unknown) => String(v).trim()).filter(Boolean),
          }))
          .filter((o) => o.name.length > 0 && o.values.length > 0)
      : [];

    const safeVariants: ProductVariant[] = Array.isArray(variants)
      ? variants
          .filter((v) => v && typeof v.label === 'string' && v.label.trim())
          .map((v, idx) => ({
            id: typeof v.id === 'string' && v.id.trim() ? v.id.trim() : `var-${idx + 1}`,
            label: v.label.trim(),
            sku: typeof v.sku === 'string' ? v.sku.trim() : '',
            price: Number.isFinite(Number(v.price)) ? Math.max(0, Number(v.price)) : numericPrice,
            stock: Number.isFinite(Number(v.stock)) ? Math.max(0, Math.floor(Number(v.stock))) : numericStock,
            active: typeof v.active === 'boolean' ? v.active : true,
          }))
      : [];

    const product: Product = {
      id: `prod-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim(),
      slug: typeof slug === 'string' && slug.trim() ? slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') : fallbackSlug,
      category: typeof category === 'string' && category.trim() ? category.trim() : 'Motorola',
      brand: typeof brand === 'string' ? brand.trim() : '',
      alsoShowIn: Array.isArray(alsoShowIn) ? alsoShowIn.map(String).filter(Boolean) : [],
      brandModels: Array.isArray(brandModels) && brandModels.length > 0 ? brandModels.map(String) : ['Standard Fit'],
      variantOptions: safeVariantOptions,
      variants: safeVariants,
      price: numericPrice,
      originalPrice: numericOriginal,
      costPrice: numericCost,
      discountPercent,
      stock: numericStock,
      lowStockThreshold: numericLowStock,
      trackStock: typeof trackStock === 'boolean' ? trackStock : true,
      preOrderMode: preOrderMode === 'allow' || preOrderMode === 'disallow' ? preOrderMode : 'store_default',
      sku: typeof sku === 'string' && sku.trim() ? sku.trim() : `CC-${Date.now().toString().slice(-4)}`,
      image: safeImage,
      galleryImages: safeGallery,
      shortDescription: typeof shortDescription === 'string' ? shortDescription.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
      requiresShipping: typeof requiresShipping === 'boolean' ? requiresShipping : true,
      weightKg: Number.isFinite(Number(weightKg)) ? Math.max(0, Number(weightKg)) : 0.5,
      shippingClass: typeof shippingClass === 'string' ? shippingClass.trim() : 'No class',
      specifications: Array.isArray(specifications)
        ? specifications
            .filter((s) => s && typeof s.label === 'string' && typeof s.value === 'string')
            .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
        : [],
      customerPrompt: typeof customerPrompt === 'string' ? customerPrompt.trim() : '',
      seoTitle: typeof seoTitle === 'string' ? seoTitle.trim() : '',
      seoDescription: typeof seoDescription === 'string' ? seoDescription.trim() : '',
      active: typeof active === 'boolean' ? active : true,
      featured: Boolean(featured),
      createdAt: new Date().toISOString(),
    };
    try {
      if (isSqlConfigured()) {
        await upsertProductToSql(product, 0);
        await saveStoreConfigToSql({ catalogModified: true });
      }
      db.products.unshift(product);
      db.catalogModified = true;
      saveDatabase();
      res.status(201).json({ product });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create product' });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const body = req.body || {};
    const {
      title,
      slug,
      category,
      brand,
      alsoShowIn,
      price,
      originalPrice,
      costPrice,
      stock,
      lowStockThreshold,
      trackStock,
      preOrderMode,
      sku,
      image,
      galleryImages,
      shortDescription,
      description,
      requiresShipping,
      weightKg,
      shippingClass,
      specifications,
      customerPrompt,
      seoTitle,
      seoDescription,
      brandModels,
      variantOptions,
      variants,
      active,
      featured,
    } = body;

    if (typeof title === 'string' && title.trim()) product.title = title.trim();
    if (typeof slug === 'string' && slug.trim()) {
      product.slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    }
    if (typeof category === 'string' && category.trim()) product.category = category.trim();
    if (typeof brand === 'string') product.brand = brand.trim();
    if (Array.isArray(alsoShowIn)) product.alsoShowIn = alsoShowIn.map(String).filter(Boolean);
    if (price !== undefined && Number.isFinite(Number(price)) && Number(price) >= 0) {
      product.price = Number(price);
    }
    if (originalPrice !== undefined && Number.isFinite(Number(originalPrice)) && Number(originalPrice) >= 0) {
      product.originalPrice = Number(originalPrice);
    }
    if (costPrice !== undefined && Number.isFinite(Number(costPrice)) && Number(costPrice) >= 0) {
      product.costPrice = Number(costPrice);
    }
    product.discountPercent =
      product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;
    if (stock !== undefined && Number.isFinite(Number(stock))) {
      product.stock = Math.max(0, Math.floor(Number(stock)));
    }
    if (lowStockThreshold !== undefined && Number.isFinite(Number(lowStockThreshold))) {
      product.lowStockThreshold = Math.max(0, Math.floor(Number(lowStockThreshold)));
    }
    if (typeof trackStock === 'boolean') product.trackStock = trackStock;
    if (preOrderMode === 'store_default' || preOrderMode === 'allow' || preOrderMode === 'disallow') {
      product.preOrderMode = preOrderMode;
    }
    if (typeof sku === 'string' && sku.trim()) product.sku = sku.trim();
    if (typeof image === 'string' && image.trim() !== '') {
      if (!isSafeImageSource(image)) {
        res.status(400).json({ error: 'Invalid product image format. Please upload a PNG, JPG, WEBP, or GIF image.' });
        return;
      }
      product.image = image.trim();
    }
    if (Array.isArray(galleryImages)) {
      product.galleryImages = galleryImages.filter(isSafeImageSource).map((g) => g.trim()).slice(0, 4);
    }
    if (typeof shortDescription === 'string') product.shortDescription = shortDescription.trim();
    if (typeof description === 'string') product.description = description.trim();
    if (typeof requiresShipping === 'boolean') product.requiresShipping = requiresShipping;
    if (weightKg !== undefined && Number.isFinite(Number(weightKg))) {
      product.weightKg = Math.max(0, Number(weightKg));
    }
    if (typeof shippingClass === 'string') product.shippingClass = shippingClass.trim();
    if (Array.isArray(specifications)) {
      product.specifications = specifications
        .filter((s) => s && typeof s.label === 'string' && typeof s.value === 'string')
        .map((s) => ({ label: s.label.trim(), value: s.value.trim() }));
    }
    if (typeof customerPrompt === 'string') product.customerPrompt = customerPrompt.trim();
    if (typeof seoTitle === 'string') product.seoTitle = seoTitle.trim();
    if (typeof seoDescription === 'string') product.seoDescription = seoDescription.trim();
    if (Array.isArray(brandModels)) product.brandModels = brandModels.map(String);
    if (Array.isArray(variantOptions)) {
      product.variantOptions = variantOptions
        .filter((o) => o && typeof o.name === 'string' && Array.isArray(o.values))
        .map((o) => ({
          name: o.name.trim(),
          values: o.values.map((v: unknown) => String(v).trim()).filter(Boolean),
        }))
        .filter((o) => o.name.length > 0 && o.values.length > 0);
    }
    if (Array.isArray(variants)) {
      product.variants = variants
        .filter((v) => v && typeof v.label === 'string' && v.label.trim())
        .map((v, idx) => ({
          id: typeof v.id === 'string' && v.id.trim() ? v.id.trim() : `var-${idx + 1}`,
          label: v.label.trim(),
          sku: typeof v.sku === 'string' ? v.sku.trim() : '',
          price: Number.isFinite(Number(v.price)) ? Math.max(0, Number(v.price)) : product.price,
          stock: Number.isFinite(Number(v.stock)) ? Math.max(0, Math.floor(Number(v.stock))) : product.stock,
          active: typeof v.active === 'boolean' ? v.active : true,
        }));
    }
    if (typeof active === 'boolean') product.active = active;
    if (typeof featured === 'boolean') product.featured = featured;

    try {
      if (isSqlConfigured()) {
        await upsertProductToSql(product);
        await saveStoreConfigToSql({ catalogModified: true });
      }
      db.catalogModified = true;
      saveDatabase();
      res.json({ product });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update product' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    try {
      if (isSqlConfigured()) {
        await deleteProductFromSql(req.params.id);
        await saveStoreConfigToSql({ catalogModified: true });
      }
      db.products.splice(idx, 1);
      db.catalogModified = true;
      saveDatabase();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete product' });
    }
  });

  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 1) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const rawSlugSource = typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : name;
    let slug = rawSlugSource
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) {
      slug = `category-${crypto.randomUUID().slice(0, 6)}`;
    }

    if (db.categories.some((c) => c.slug.toLowerCase() === slug.toLowerCase())) {
      res.status(409).json({ error: `A category with URL "/${slug}" already exists.` });
      return;
    }

    const rawImage = typeof body.image === 'string' ? body.image.trim() : '';
    if (rawImage && !isSafeImageSource(rawImage)) {
      res.status(400).json({
        error: 'Category image must be an HTTPS image URL or PNG/JPG/WEBP/GIF/AVIF/ICO upload.',
      });
      return;
    }

    const category: Category = {
      id: `cat-${crypto.randomUUID().slice(0, 6)}`,
      name,
      slug,
      brandKey: 'custom',
      featured: body.featured !== false,
      active: body.active !== false,
      parentId: typeof body.parentId === 'string' ? body.parentId.trim() : '',
      description: typeof body.description === 'string' ? body.description.trim() : '',
      googleCategory: typeof body.googleCategory === 'string' ? body.googleCategory.trim() : '',
      seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle.trim() : '',
      seoDescription: typeof body.seoDescription === 'string' ? body.seoDescription.trim() : '',
      image: rawImage,
      shippingClass: typeof body.shippingClass === 'string' ? body.shippingClass.trim() : 'No class',
    };
    try {
      if (isSqlConfigured()) {
        await upsertCategoryToSql(category, db.categories.length);
      }
      db.categories.push(category);
      saveDatabase();
      res.status(201).json({ category });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create category' });
    }
  });

  app.put('/api/admin/categories/reorder', requireAdmin, async (req, res) => {
    const orderedIds = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : null;

    if (!orderedIds || orderedIds.length === 0) {
      res.status(400).json({ error: 'orderedIds array is required' });
      return;
    }

    const byId = new Map(db.categories.map((c) => [c.id, c]));
    const nextList: Category[] = [];
    const seen = new Set<string>();

    for (const id of orderedIds) {
      const cat = byId.get(id);
      if (cat && !seen.has(id)) {
        seen.add(id);
        nextList.push(cat);
      }
    }
    for (const cat of db.categories) {
      if (!seen.has(cat.id)) {
        seen.add(cat.id);
        nextList.push(cat);
      }
    }

    try {
      db.categories = nextList;
      if (isSqlConfigured()) {
        for (let i = 0; i < nextList.length; i += 1) {
          await upsertCategoryToSql(nextList[i], i);
        }
      }
      saveDatabase();
      res.json({ categories: db.categories });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to reorder categories' });
    }
  });

  app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    const category = db.categories.find((c) => c.id === req.params.id);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    const body = req.body || {};
    if (typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (trimmed.length < 1) {
        res.status(400).json({ error: 'Category name is required' });
        return;
      }
      category.name = trimmed;
    }
    if (typeof body.slug === 'string' && body.slug.trim()) {
      const nextSlug = body.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (
        nextSlug &&
        db.categories.some((c) => c.id !== category.id && c.slug.toLowerCase() === nextSlug.toLowerCase())
      ) {
        res.status(409).json({ error: `URL "/${nextSlug}" is already used by another category.` });
        return;
      }
      if (nextSlug) category.slug = nextSlug;
    }
    if (typeof body.active === 'boolean') category.active = body.active;
    if (typeof body.featured === 'boolean') category.featured = body.featured;
    if (typeof body.parentId === 'string') {
      const nextParentId = body.parentId.trim();
      category.parentId = nextParentId === category.id ? '' : nextParentId;
    }
    if (typeof body.description === 'string') category.description = body.description.trim();
    if (typeof body.googleCategory === 'string') category.googleCategory = body.googleCategory.trim();
    if (typeof body.seoTitle === 'string') category.seoTitle = body.seoTitle.trim();
    if (typeof body.seoDescription === 'string') category.seoDescription = body.seoDescription.trim();
    if (typeof body.shippingClass === 'string') category.shippingClass = body.shippingClass.trim();
    if (body.image !== undefined) {
      const rawImage = typeof body.image === 'string' ? body.image.trim() : '';
      if (rawImage && !isSafeImageSource(rawImage)) {
        res.status(400).json({
          error: 'Category image must be an HTTPS image URL or PNG/JPG/WEBP/GIF/AVIF/ICO upload.',
        });
        return;
      }
      category.image = rawImage;
    }
    try {
      if (isSqlConfigured()) {
        await upsertCategoryToSql(category);
      }
      saveDatabase();
      res.json({ category });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update category' });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    const idx = db.categories.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    const deletedId = db.categories[idx].id;
    try {
      if (isSqlConfigured()) {
        await deleteCategoryFromSql(deletedId);
      }
      db.categories.splice(idx, 1);
      for (const child of db.categories) {
        if (child.parentId === deletedId) {
          child.parentId = '';
          if (isSqlConfigured()) {
            await upsertCategoryToSql(child);
          }
        }
      }
      saveDatabase();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete category' });
    }
  });

  app.post('/api/admin/categories/sync', requireAdmin, async (req, res) => {
    const incoming = req.body?.categories;
    if (!Array.isArray(incoming)) {
      res.status(400).json({ error: 'Invalid categories payload' });
      return;
    }

    const existingById = new Map(db.categories.map((c) => [c.id, c]));
    let changed = false;

    for (let i = 0; i < incoming.length; i += 1) {
      const raw = incoming[i];
      if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.name !== 'string') {
        continue;
      }
      const id = raw.id.trim();
      const name = raw.name.trim();
      if (!id || !name) continue;
      const rawImage = typeof raw.image === 'string' ? raw.image.trim() : '';
      const safeImg = rawImage && isSafeImageSource(rawImage) ? rawImage : '';
      const slugSource = typeof raw.slug === 'string' && raw.slug.trim() ? raw.slug.trim() : name;
      const slug =
        slugSource
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '') || id.toLowerCase();
      const brandKey =
        raw.brandKey === 'motorola' || raw.brandKey === 'vivo' || raw.brandKey === 'xiaomi'
          ? raw.brandKey
          : 'custom';
      const normalized: Category = {
        id,
        name,
        slug,
        brandKey,
        featured: raw.featured !== false,
        active: raw.active !== false,
        parentId: typeof raw.parentId === 'string' && raw.parentId.trim() !== id ? raw.parentId.trim() : '',
        description: typeof raw.description === 'string' ? raw.description.trim() : '',
        googleCategory: typeof raw.googleCategory === 'string' ? raw.googleCategory.trim() : '',
        seoTitle: typeof raw.seoTitle === 'string' ? raw.seoTitle.trim() : '',
        seoDescription: typeof raw.seoDescription === 'string' ? raw.seoDescription.trim() : '',
        image: safeImg,
        shippingClass: typeof raw.shippingClass === 'string' ? raw.shippingClass.trim() : 'No class',
        isDefault: Boolean(raw.isDefault),
      };

      const prev = existingById.get(id);
      if (!prev) {
        db.categories.push(normalized);
        existingById.set(id, normalized);
        if (isSqlConfigured()) {
          await upsertCategoryToSql(normalized, db.categories.length);
        }
        changed = true;
      }
    }

    if (changed) {
      saveDatabase();
    }
    res.json({ categories: db.categories });
  });

  app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const {
      fulfillmentStatus,
      paymentStatus,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryArea,
      adminNote,
      courier,
      restoreStock,
    } = req.body || {};

    const now = new Date().toISOString();
    const prevStatus = order.fulfillmentStatus;
    const allowedFulfillment: FulfillmentStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (fulfillmentStatus && allowedFulfillment.includes(fulfillmentStatus)) {
      order.fulfillmentStatus = fulfillmentStatus;
      if (fulfillmentStatus === 'confirmed' && !order.confirmedAt) {
        order.confirmedAt = now;
      }
      if (fulfillmentStatus === 'shipped') {
        if (!order.confirmedAt) order.confirmedAt = now;
        if (!order.shippedAt) order.shippedAt = now;
        if (order.courier && order.courier.status === 'booked') {
          order.courier.status = 'in_transit';
        }
      }
      if (fulfillmentStatus === 'delivered') {
        if (!order.confirmedAt) order.confirmedAt = now;
        if (!order.shippedAt) order.shippedAt = now;
        if (!order.deliveredAt) order.deliveredAt = now;
        if (order.paymentMethod === 'cod') {
          order.paymentStatus = 'paid';
        }
        if (order.courier) {
          order.courier.status = 'delivered';
        }
      }
      if (fulfillmentStatus === 'cancelled') {
        if (order.courier) {
          order.courier.status = 'cancelled';
        }
        if (restoreStock === true && prevStatus !== 'cancelled') {
          for (const item of order.items) {
            const product = db.products.find((p) => p.id === item.productId);
            if (product && product.trackStock !== false) {
              product.stock = Math.max(0, product.stock + item.quantity);
              if (isSqlConfigured()) {
                await upsertProductToSql(product);
              }
            }
          }
        }
      }
    }

    if (paymentStatus && ['paid', 'pending', 'failed'].includes(paymentStatus)) {
      order.paymentStatus = paymentStatus;
    }

    if (typeof customerName === 'string' && customerName.trim()) {
      order.customerName = customerName.trim().slice(0, 120);
    }
    if (typeof customerPhone === 'string' && customerPhone.trim()) {
      order.customerPhone = customerPhone.trim().slice(0, 32);
    }
    if (typeof deliveryAddress === 'string' && deliveryAddress.trim()) {
      order.deliveryAddress = deliveryAddress.trim().slice(0, 300);
    }
    if (deliveryArea === 'inside_dhaka' || deliveryArea === 'outside_dhaka') {
      order.deliveryArea = deliveryArea;
    }
    if (typeof adminNote === 'string') {
      order.adminNote = adminNote.trim().slice(0, 500);
    }
    if (courier && typeof courier === 'object') {
      const existing = order.courier;
      const validProvider = ['Steadfast', 'Pathao', 'RedX', 'Manual'].includes(courier.provider)
        ? courier.provider
        : existing?.provider || 'Manual';
      const validCourierStatus = ['booked', 'in_transit', 'delivered', 'cancelled'].includes(courier.status)
        ? courier.status
        : existing?.status || 'booked';
      order.courier = {
        provider: validProvider,
        consignmentId:
          typeof courier.consignmentId === 'string' && courier.consignmentId.trim()
            ? courier.consignmentId.trim().slice(0, 80)
            : existing?.consignmentId || '',
        trackingCode:
          typeof courier.trackingCode === 'string' && courier.trackingCode.trim()
            ? courier.trackingCode.trim().slice(0, 80)
            : existing?.trackingCode || '',
        status: validCourierStatus,
        bookedAt: existing?.bookedAt || now,
        parcelWeightKg:
          Number.isFinite(Number(courier.parcelWeightKg)) && Number(courier.parcelWeightKg) > 0
            ? Number(courier.parcelWeightKg)
            : existing?.parcelWeightKg || 0.25,
        codAmount:
          Number.isFinite(Number(courier.codAmount)) && Number(courier.codAmount) >= 0
            ? Number(courier.codAmount)
            : existing?.codAmount ?? (order.paymentStatus === 'paid' ? 0 : order.total),
        note: typeof courier.note === 'string' ? courier.note.trim().slice(0, 300) : existing?.note,
        mode: courier.mode === 'api' || courier.mode === 'manual' ? courier.mode : existing?.mode || 'manual',
      };
    }

    order.updatedAt = now;
    try {
      if (isSqlConfigured()) {
        await updateOrderInSql(order);
      }
      saveDatabase();
      res.json({ order });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update order' });
    }
  });

  app.post('/api/admin/orders/:id/courier-book', requireAdmin, async (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (order.fulfillmentStatus === 'cancelled') {
      res.status(400).json({ error: 'Cannot book a courier for a cancelled order.' });
      return;
    }

    const {
      provider: rawProvider,
      parcelWeightKg: rawWeight,
      codAmount: rawCod,
      note: rawNote,
      trackingCode: rawTracking,
      consignmentId: rawConsignment,
      markShipped = false,
      mode: requestedMode,
    } = req.body || {};

    const provider: OrderCourierInfo['provider'] = ['Steadfast', 'Pathao', 'RedX', 'Manual'].includes(rawProvider)
      ? rawProvider
      : db.settings.deliverySettings?.courierProvider &&
          db.settings.deliverySettings.courierProvider !== 'None'
        ? db.settings.deliverySettings.courierProvider
        : 'Steadfast';

    const parcelWeightKg =
      Number.isFinite(Number(rawWeight)) && Number(rawWeight) > 0 ? Number(rawWeight) : 0.25;
    const codAmount =
      Number.isFinite(Number(rawCod)) && Number(rawCod) >= 0
        ? Math.round(Number(rawCod))
        : order.paymentStatus === 'paid'
          ? 0
          : order.total;
    const note = typeof rawNote === 'string' ? rawNote.trim().slice(0, 300) : '';
    const manualTracking = typeof rawTracking === 'string' ? rawTracking.trim() : '';
    const manualConsignment = typeof rawConsignment === 'string' ? rawConsignment.trim() : '';

    const now = new Date().toISOString();
    let finalTrackingCode = manualTracking;
    let finalConsignmentId = manualConsignment;
    let bookingMode: 'api' | 'manual' = 'manual';

    const apiKey = db.settings.deliverySettings?.courierApiKey?.trim() || '';
    const secretKey = db.settings.deliverySettings?.courierSecretKey?.trim() || '';

    if (
      provider === 'Steadfast' &&
      requestedMode !== 'manual' &&
      !manualTracking &&
      apiKey &&
      secretKey
    ) {
      try {
        const sfRes = await fetch('https://portal.packzy.com/api/v1/create_order', {
          method: 'POST',
          headers: {
            'Api-Key': apiKey,
            'Secret-Key': secretKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invoice: order.orderNumber,
            recipient_name: order.customerName,
            recipient_phone: order.customerPhone,
            recipient_address: order.deliveryAddress,
            cod_amount: codAmount,
            note: note || `Classy Cases #${order.orderNumber}`,
          }),
          signal: AbortSignal.timeout(8000),
        });
        const sfData = (await sfRes.json().catch(() => ({}))) as {
          status?: number;
          message?: string;
          errors?: Record<string, string[]>;
          consignment?: {
            consignment_id?: number | string;
            tracking_code?: string;
          };
        };
        if (!sfRes.ok || !sfData.consignment?.tracking_code) {
          const detail =
            sfData.message ||
            (sfData.errors ? Object.values(sfData.errors).flat().join(', ') : '') ||
            `Steadfast API returned ${sfRes.status}`;
          res.status(400).json({ error: `Steadfast booking failed: ${detail}` });
          return;
        }
        finalConsignmentId = String(sfData.consignment.consignment_id || order.orderNumber);
        finalTrackingCode = String(sfData.consignment.tracking_code);
        bookingMode = 'api';
      } catch (err) {
        res.status(502).json({
          error: `Could not reach Steadfast API (${err instanceof Error ? err.message : 'network error'}). You can book in Manual mode with your consignment/tracking code.`,
        });
        return;
      }
    }

    if (!finalTrackingCode || !finalConsignmentId) {
      const prefixMap: Record<OrderCourierInfo['provider'], string> = {
        Steadfast: 'STF',
        Pathao: 'PTH',
        RedX: 'RDX',
        Manual: 'MAN',
      };
      const prefix = prefixMap[provider];
      const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      if (!finalConsignmentId) {
        finalConsignmentId = `${prefix}-CN-${order.orderNumber}-${suffix}`;
      }
      if (!finalTrackingCode) {
        finalTrackingCode = `${prefix}-${order.orderNumber}-${suffix}`;
      }
    }

    order.courier = {
      provider,
      consignmentId: finalConsignmentId,
      trackingCode: finalTrackingCode,
      status: markShipped ? 'in_transit' : 'booked',
      bookedAt: now,
      parcelWeightKg,
      codAmount,
      note: note || undefined,
      mode: bookingMode,
    };

    if (!order.confirmedAt) {
      order.confirmedAt = now;
    }
    if (markShipped) {
      order.fulfillmentStatus = 'shipped';
      if (!order.shippedAt) order.shippedAt = now;
    } else if (order.fulfillmentStatus === 'pending') {
      order.fulfillmentStatus = 'confirmed';
    }
    order.updatedAt = now;

    try {
      if (isSqlConfigured()) {
        await updateOrderInSql(order);
      }
      saveDatabase();
      res.json({ order });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save courier booking' });
    }
  });

  app.post('/api/admin/pos-order', requireAdmin, async (req, res) => {
    try {
      const { customerName, customerPhone, items, paymentMethod = 'cod' } = req.body || {};
      const calc = buildOrderCalculation(items, 'inside_dhaka');
      const order = await finalizeOrder({
        customerName: typeof customerName === 'string' && customerName.trim() ? customerName.trim() : 'Walk-in Customer',
        customerPhone: typeof customerPhone === 'string' && customerPhone.trim() ? customerPhone.trim() : '01700000000',
        customerEmail: '',
        deliveryAddress: 'In-Store Pickup — Dhaka Counter',
        deliveryArea: 'inside_dhaka',
        items: calc.orderItems,
        subtotal: calc.subtotal,
        shippingFee: 0,
        discountAmount: 0,
        total: calc.subtotal,
        paymentMethod: ['bkash', 'nagad', 'card', 'cod'].includes(paymentMethod) ? paymentMethod : 'cod',
        paymentStatus: 'paid',
        transactionId: `POS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        source: 'POS',
        channel: 'Point of Sale',
      });
      res.status(201).json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'POS order failed' });
    }
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    const body = req.body || {};
    const s = db.settings;
    const isSafeBrandAsset = (val: unknown): val is string =>
      typeof val === 'string' &&
      (val.trim() === '' ||
        val.trim().startsWith('/src/assets/') ||
        val.trim().startsWith('/assets/') ||
        val.trim().startsWith('https://') ||
        /^data:image\/(png|jpeg|jpg|webp|gif|avif|bmp|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$/i.test(
          val.trim()
        ));

    if (typeof body.storeName === 'string' && body.storeName.trim()) s.storeName = body.storeName.trim();
    if (typeof body.tagline === 'string') s.tagline = body.tagline.trim();
    if (body.logoUrl !== undefined) {
      if (!isSafeBrandAsset(body.logoUrl)) {
        res.status(400).json({ error: 'Logo must be an HTTPS image URL or PNG/JPG/WEBP/GIF upload.' });
        return;
      }
      s.logoUrl = body.logoUrl.trim();
    }
    if (body.faviconUrl !== undefined) {
      if (!isSafeBrandAsset(body.faviconUrl)) {
        res.status(400).json({ error: 'Favicon must be an HTTPS image URL or PNG/JPG/WEBP/GIF/ICO upload.' });
        return;
      }
      s.faviconUrl = body.faviconUrl.trim();
    }
    if (typeof body.orderPrefix === 'string') s.orderPrefix = body.orderPrefix.trim().slice(0, 10);
    if (typeof body.takePreOrders === 'boolean') s.takePreOrders = body.takePreOrders;
    if (typeof body.autoMovePending === 'boolean') s.autoMovePending = body.autoMovePending;
    if (body.costingMethod === 'FIFO' || body.costingMethod === 'Weighted Average') s.costingMethod = body.costingMethod;
    if (typeof body.phone === 'string') s.phone = body.phone.trim();
    if (typeof body.email === 'string') s.email = body.email.trim();
    if (typeof body.address === 'string') s.address = body.address.trim();
    if (typeof body.openingHours === 'string') s.openingHours = body.openingHours.trim();
    if (Number.isFinite(Number(body.shippingInsideDhaka))) s.shippingInsideDhaka = Math.max(0, Number(body.shippingInsideDhaka));
    if (Number.isFinite(Number(body.shippingOutsideDhaka))) s.shippingOutsideDhaka = Math.max(0, Number(body.shippingOutsideDhaka));
    if (Number.isFinite(Number(body.freeShippingThreshold))) s.freeShippingThreshold = Math.max(0, Number(body.freeShippingThreshold));
    if (typeof body.seoTitle === 'string') s.seoTitle = body.seoTitle.trim();
    if (typeof body.seoDescription === 'string') s.seoDescription = body.seoDescription.trim();
    if (body.paymentGateways && typeof body.paymentGateways === 'object') {
      const pg = body.paymentGateways;
      if (pg.bkash) {
        s.paymentGateways.bkash.enabled = Boolean(pg.bkash.enabled);
        if (typeof pg.bkash.merchantNumber === 'string') s.paymentGateways.bkash.merchantNumber = pg.bkash.merchantNumber.trim();
        if (pg.bkash.mode === 'sandbox' || pg.bkash.mode === 'live') s.paymentGateways.bkash.mode = pg.bkash.mode;
        if (pg.bkash.logoUrl !== undefined) {
          if (!isSafeBrandAsset(pg.bkash.logoUrl)) {
            res.status(400).json({ error: 'bKash logo must be an HTTPS image URL or PNG/JPG/WEBP/GIF upload.' });
            return;
          }
          s.paymentGateways.bkash.logoUrl = pg.bkash.logoUrl.trim();
        }
      }
      if (pg.nagad) {
        s.paymentGateways.nagad.enabled = Boolean(pg.nagad.enabled);
        if (typeof pg.nagad.merchantNumber === 'string') s.paymentGateways.nagad.merchantNumber = pg.nagad.merchantNumber.trim();
        if (pg.nagad.mode === 'sandbox' || pg.nagad.mode === 'live') s.paymentGateways.nagad.mode = pg.nagad.mode;
        if (pg.nagad.logoUrl !== undefined) {
          if (!isSafeBrandAsset(pg.nagad.logoUrl)) {
            res.status(400).json({ error: 'Nagad logo must be an HTTPS image URL or PNG/JPG/WEBP/GIF upload.' });
            return;
          }
          s.paymentGateways.nagad.logoUrl = pg.nagad.logoUrl.trim();
        }
      }
      if (pg.card) {
        s.paymentGateways.card.enabled = Boolean(pg.card.enabled);
        if (typeof pg.card.storeId === 'string') s.paymentGateways.card.storeId = pg.card.storeId.trim();
        if (pg.card.mode === 'sandbox' || pg.card.mode === 'live') s.paymentGateways.card.mode = pg.card.mode;
        if (pg.card.logoUrl !== undefined) {
          if (!isSafeBrandAsset(pg.card.logoUrl)) {
            res.status(400).json({ error: 'Card gateway logo must be an HTTPS image URL or PNG/JPG/WEBP/GIF upload.' });
            return;
          }
          s.paymentGateways.card.logoUrl = pg.card.logoUrl.trim();
        }
      }
      if (pg.cod) {
        s.paymentGateways.cod.enabled = Boolean(pg.cod.enabled);
        if (pg.cod.logoUrl !== undefined) {
          if (!isSafeBrandAsset(pg.cod.logoUrl)) {
            res.status(400).json({ error: 'COD icon must be an HTTPS image URL or PNG/JPG/WEBP/GIF upload.' });
            return;
          }
          s.paymentGateways.cod.logoUrl = pg.cod.logoUrl.trim();
        }
      }
    }
    if (body.storefrontConfig && typeof body.storefrontConfig === 'object') {
      const sc = body.storefrontConfig;
      s.storefrontConfig = {
        shopPageColumns: ([2, 3, 4, 5].includes(Number(sc.shopPageColumns))
          ? Number(sc.shopPageColumns)
          : 5) as 2 | 3 | 4 | 5,
        showOutOfStock: sc.showOutOfStock !== false,
        showStockBadgeOnProduct: sc.showStockBadgeOnProduct !== false,
        showRelatedProducts: sc.showRelatedProducts !== false,
        checkoutRequireEmail: Boolean(sc.checkoutRequireEmail),
        checkoutNoteEnabled: sc.checkoutNoteEnabled !== false,
        thankYouHeadline: typeof sc.thankYouHeadline === 'string' ? sc.thankYouHeadline.trim() : 'Thank you for your order!',
        thankYouMessage: typeof sc.thankYouMessage === 'string' ? sc.thankYouMessage.trim() : '',
        reviewsEnabled: sc.reviewsEnabled !== false,
        reviewsAutoApprove: sc.reviewsAutoApprove !== false,
        homeReviewsOnlyFiveStar: sc.homeReviewsOnlyFiveStar !== false,
        homeCustomization: mergeHomeCustomization(
          sc.homeCustomization || s.storefrontConfig?.homeCustomization
        ),
        sizeGuideTitle: typeof sc.sizeGuideTitle === 'string' ? sc.sizeGuideTitle.trim() : 'Phone Model & Case Fit Guide',
        sizeGuideNotes: typeof sc.sizeGuideNotes === 'string' ? sc.sizeGuideNotes.trim() : '',
        offerPageTitle: typeof sc.offerPageTitle === 'string' ? sc.offerPageTitle.trim() : 'Flash Deals & Combo Offers',
        offerPageBannerText: typeof sc.offerPageBannerText === 'string' ? sc.offerPageBannerText.trim() : '',
        popupOfferEnabled: Boolean(sc.popupOfferEnabled),
        popupOfferHeadline: typeof sc.popupOfferHeadline === 'string' ? sc.popupOfferHeadline.trim() : '',
        popupOfferCode: typeof sc.popupOfferCode === 'string' ? sc.popupOfferCode.trim().toUpperCase() : '',
      };
    }
    if (body.headerConfig && typeof body.headerConfig === 'object') {
      s.headerConfig = mergeHeaderConfig(body.headerConfig);
    }
    if (body.footerConfig && typeof body.footerConfig === 'object') {
      s.footerConfig = mergeFooterConfig(body.footerConfig, {
        storeName: s.storeName,
        tagline: s.tagline,
        phone: s.phone,
        email: s.email,
        address: s.address,
        openingHours: s.openingHours,
        shippingInsideDhaka: s.shippingInsideDhaka,
        shippingOutsideDhaka: s.shippingOutsideDhaka,
        freeShippingThreshold: s.freeShippingThreshold,
      });
    }
    if (body.orderSettings && typeof body.orderSettings === 'object') {
      const os = body.orderSettings;
      s.orderSettings = {
        sources: Array.isArray(os.sources) ? os.sources.map((x: unknown) => String(x).trim()).filter(Boolean) : [],
        quickNotes: Array.isArray(os.quickNotes) ? os.quickNotes.map((x: unknown) => String(x).trim()).filter(Boolean) : [],
      };
    }
    if (body.deliverySettings && typeof body.deliverySettings === 'object') {
      const ds = body.deliverySettings;
      s.deliverySettings = {
        shippingClasses: Array.isArray(ds.shippingClasses)
          ? ds.shippingClasses
              .filter((c: unknown) => c && typeof (c as { name?: unknown }).name === 'string')
              .map((c: { name: string; fee?: unknown; defaultWeightKg?: unknown }) => ({
                name: c.name.trim(),
                fee: Math.max(0, Number(c.fee) || 0),
                defaultWeightKg: Math.max(0, Number(c.defaultWeightKg) || 0),
              }))
              .filter((c: { name: string }) => c.name.length > 0)
          : [],
        courierProvider:
          ds.courierProvider === 'Steadfast' ||
          ds.courierProvider === 'Pathao' ||
          ds.courierProvider === 'RedX'
            ? ds.courierProvider
            : 'None',
        courierApiKey: typeof ds.courierApiKey === 'string' ? ds.courierApiKey.trim() : '',
        courierSecretKey: typeof ds.courierSecretKey === 'string' ? ds.courierSecretKey.trim() : '',
        fraudCheckEnabled: ds.fraudCheckEnabled !== false,
        fraudThresholdPercent: Math.min(100, Math.max(0, Number(ds.fraudThresholdPercent) || 30)),
      };
    }
    if (body.marketingSettings && typeof body.marketingSettings === 'object') {
      const ms = body.marketingSettings;
      s.marketingSettings = {
        metaPixelId: typeof ms.metaPixelId === 'string' ? ms.metaPixelId.trim() : '',
        gtmId: typeof ms.gtmId === 'string' ? ms.gtmId.trim() : '',
        tiktokPixelId: typeof ms.tiktokPixelId === 'string' ? ms.tiktokPixelId.trim() : '',
      };
    }
    if (body.systemSettings && typeof body.systemSettings === 'object') {
      const sys = body.systemSettings;
      s.systemSettings = {
        smtpFromName: typeof sys.smtpFromName === 'string' ? sys.smtpFromName.trim() : s.storeName,
        smtpReplyTo: typeof sys.smtpReplyTo === 'string' ? sys.smtpReplyTo.trim() : s.email,
        orderEmailNotifications: sys.orderEmailNotifications !== false,
        lowStockAlertEnabled: sys.lowStockAlertEnabled !== false,
        requireTwoFactorAdmin: Boolean(sys.requireTwoFactorAdmin),
        invoiceHeaderNote: typeof sys.invoiceHeaderNote === 'string' ? sys.invoiceHeaderNote.trim() : '',
        invoiceFooterNote: typeof sys.invoiceFooterNote === 'string' ? sys.invoiceFooterNote.trim() : '',
        supportAccessEnabled: Boolean(sys.supportAccessEnabled),
      };
    }
    try {
      if (isSqlConfigured()) {
        await saveStoreConfigToSql({ settings: s });
      }
      saveDatabase();
      res.json({ settings: s });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save settings' });
    }
  });

  app.get('/api/admin/hero-videos/library', requireAdmin, async (_req, res) => {
    const hiddenSet = new Set(db.settings.heroVideos?.hiddenBuiltInVideos || []);
    const items: Array<{ name: string; url: string; source: 'bundled' | 'uploaded'; sizeBytes?: number }> = [];
    const bundledDir = path.resolve(process.cwd(), 'public', 'assets', 'videos');
    try {
      if (fs.existsSync(bundledDir)) {
        for (const file of fs.readdirSync(bundledDir)) {
          if (/\.(mp4|webm|mov|ogv)$/i.test(file)) {
            const url = `/assets/videos/${file}`;
            if (hiddenSet.has(url)) continue;
            const stat = fs.statSync(path.join(bundledDir, file));
            items.push({
              name: file,
              url,
              source: 'bundled',
              sizeBytes: stat.size,
            });
          }
        }
      }
    } catch {
      // ignore bundled dir read error
    }

    const seenUrls = new Set<string>();
    const uploadedEntries: Array<{
      name: string;
      url: string;
      source: 'uploaded';
      sizeBytes: number;
      mtimeMs: number;
    }> = [];

    for (const dir of [ensureHeroVideosDir(), getPublicHeroVideosDir()]) {
      try {
        if (!fs.existsSync(dir)) continue;
        for (const file of fs.readdirSync(dir)) {
          if (!/\.(mp4|webm|mov|ogv)$/i.test(file)) continue;
          const url = `/media/hero-videos/${file}`;
          if (seenUrls.has(url)) continue;
          seenUrls.add(url);
          const stat = fs.statSync(path.join(dir, file));
          uploadedEntries.push({
            name: file,
            url,
            source: 'uploaded',
            sizeBytes: stat.size,
            mtimeMs: stat.mtimeMs,
          });
        }
      } catch {
        // ignore uploaded dir read error
      }
    }

    if (isSqlConfigured()) {
      try {
        const sqlFiles = await listHeroMediaFromSql();
        for (const entry of sqlFiles) {
          if (!/\.(mp4|webm|mov|ogv)$/i.test(entry.filename)) continue;
          const url = `/media/hero-videos/${entry.filename}`;
          if (seenUrls.has(url)) continue;
          seenUrls.add(url);
          uploadedEntries.push({
            name: entry.filename,
            url,
            source: 'uploaded',
            sizeBytes: entry.sizeBytes,
            mtimeMs: entry.mtimeMs,
          });
        }
      } catch {
        // ignore SQL library list fallback error
      }
    }

    uploadedEntries.sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const entry of uploadedEntries) {
      items.push({
        name: entry.name,
        url: entry.url,
        source: entry.source,
        sizeBytes: entry.sizeBytes,
      });
    }

    res.json({ videos: items });
  });

  app.post(
    '/api/admin/hero-videos/upload',
    requireAdmin,
    express.raw({
      type: () => true,
      limit: '25mb',
    }),
    async (req, res) => {
      const rawBuffer = req.body;
      if (!Buffer.isBuffer(rawBuffer) || rawBuffer.length === 0) {
        res.status(400).json({ error: 'No video file payload was received.' });
        return;
      }

      const rawName = String(req.headers['x-filename'] || 'hero-video.mp4').trim();
      const preserveRaw = String(req.headers['x-preserve-filename'] || '').trim();
      const extMatch = rawName.toLowerCase().match(/\.(mp4|webm|mov|ogv)$/);
      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      const ext = extMatch
        ? extMatch[1]
        : contentType.includes('webm')
          ? 'webm'
          : contentType.includes('quicktime')
            ? 'mov'
            : contentType.includes('ogg')
              ? 'ogv'
              : 'mp4';

      const baseSlug = rawName
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'hero-video';

      const filename =
        preserveRaw && /^[a-zA-Z0-9._-]+\.(mp4|webm|mov|ogv)$/i.test(preserveRaw)
          ? path.basename(preserveRaw)
          : `${Date.now()}-${baseSlug}.${ext}`;
      const mimeType = inferHeroMediaMime(filename, contentType || 'video/mp4');

      try {
        writeHeroMediaMirrors(filename, rawBuffer);
        if (isSqlConfigured()) {
          await saveHeroMediaToSql(filename, mimeType, rawBuffer);
        }
        res.status(201).json({
          url: `/media/hero-videos/${filename}`,
          filename,
          sizeBytes: rawBuffer.length,
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Failed to store uploaded video file',
        });
      }
    }
  );

  app.post(
    '/api/admin/hero-videos/poster',
    requireAdmin,
    express.raw({
      type: () => true,
      limit: '2mb',
    }),
    async (req, res) => {
      const rawBuffer = req.body;
      if (!Buffer.isBuffer(rawBuffer) || rawBuffer.length === 0) {
        res.status(400).json({ error: 'No poster image payload was received.' });
        return;
      }

      const rawName = String(req.headers['x-filename'] || 'hero-poster.jpg').trim();
      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      const ext = contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
          ? 'webp'
          : 'jpg';
      const baseSlug =
        rawName
          .replace(/\.[^.]+$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 36) || 'hero-poster';

      const filename = `poster-${Date.now()}-${baseSlug}.${ext}`;
      const mimeType = inferHeroMediaMime(filename, contentType || 'image/jpeg');
      try {
        writeHeroMediaMirrors(filename, rawBuffer);
        if (isSqlConfigured()) {
          await saveHeroMediaToSql(filename, mimeType, rawBuffer);
        }
        res.status(201).json({
          url: `/media/hero-videos/${filename}`,
          filename,
          sizeBytes: rawBuffer.length,
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Failed to store hero poster image',
        });
      }
    }
  );

  app.put('/api/admin/hero-videos/config', requireAdmin, async (req, res) => {
    const rawSlides = Array.isArray(req.body?.slides) ? req.body.slides : null;
    if (!rawSlides || rawSlides.length === 0) {
      res.status(400).json({ error: 'At least one hero video slide is required.' });
      return;
    }

    const isSafeVideo = (url: string) =>
      url.startsWith('https://') ||
      url.startsWith('/assets/videos/') ||
      url.startsWith('/media/hero-videos/');

    const isSafePoster = (url: string) =>
      url === '' ||
      url.startsWith('https://') ||
      url.startsWith('/src/assets/images/') ||
      url.startsWith('/assets/') ||
      url.startsWith('/media/');

    const sanitizedSlides: HeroVideoSlideConfig[] = [];
    const seenIds = new Set<string>();

    for (let idx = 0; idx < rawSlides.length; idx++) {
      const item = rawSlides[idx] as Record<string, unknown>;
      if (!item || typeof item !== 'object') continue;
      const rawId = typeof item.id === 'string' ? item.id.trim().toLowerCase() : `slide-${idx + 1}`;
      const cleanId = rawId.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || `slide-${idx + 1}`;
      if (seenIds.has(cleanId)) continue;
      seenIds.add(cleanId);

      const videoSrc = typeof item.videoSrc === 'string' ? item.videoSrc.trim().slice(0, 1000) : '';
      if (!videoSrc || !isSafeVideo(videoSrc)) {
        res.status(400).json({
          error: `Invalid video URL for slide "${typeof item.label === 'string' ? item.label : cleanId}".`,
        });
        return;
      }

      const posterSrc = typeof item.posterSrc === 'string' ? item.posterSrc.trim().slice(0, 1000) : '';
      if (!isSafePoster(posterSrc)) {
        res.status(400).json({
          error: `Invalid poster URL for slide "${typeof item.label === 'string' ? item.label : cleanId}".`,
        });
        return;
      }

      sanitizedSlides.push({
        id: cleanId,
        label: (typeof item.label === 'string' && item.label.trim() ? item.label.trim() : 'Hero Video').slice(0, 60),
        kicker: (typeof item.kicker === 'string' ? item.kicker.trim() : '').slice(0, 140),
        headline: (typeof item.headline === 'string' && item.headline.trim() ? item.headline.trim() : 'Protect your phone with style.').slice(0, 140),
        description: (typeof item.description === 'string' ? item.description.trim() : '').slice(0, 320),
        videoSrc,
        posterSrc,
        posterAlt: (typeof item.posterAlt === 'string' ? item.posterAlt.trim() : 'Hero showcase slide').slice(0, 200),
        categoryTarget: (typeof item.categoryTarget === 'string' && item.categoryTarget.trim() ? item.categoryTarget.trim() : 'All').slice(0, 60),
        featuredProductId: (typeof item.featuredProductId === 'string' ? item.featuredProductId.trim() : '').slice(0, 64),
        startingPrice: Math.min(1000000, Math.max(0, Number(item.startingPrice) || 0)),
        sortOrder: Math.min(100, Math.max(0, Math.round(Number(item.sortOrder) ?? idx))),
        active: item.active !== false,
      });
    }

    if (sanitizedSlides.length === 0) {
      res.status(400).json({ error: 'At least one valid hero video slide is required.' });
      return;
    }

    const rawConfig = (req.body?.config && typeof req.body.config === 'object' ? req.body.config : {}) as Record<string, unknown>;
    const requestedActiveId = typeof rawConfig.activeSlideId === 'string' ? rawConfig.activeSlideId.trim().slice(0, 64) : '';
    const activeSlideId = sanitizedSlides.some((s) => s.id === requestedActiveId)
      ? requestedActiveId
      : sanitizedSlides[0].id;
    const autoAdvanceSeconds = Math.min(
      30,
      Math.max(3, Math.round(Number(rawConfig.autoAdvanceSeconds) || 9))
    );

    const rawMobile = (
      rawConfig.mobileLayout && typeof rawConfig.mobileLayout === 'object'
        ? rawConfig.mobileLayout
        : {}
    ) as Record<string, unknown>;
    const validPositions = ['bottom-left', 'center', 'top-left'] as const;
    const validSizes = ['xs', 'sm', 'md'] as const;
    const mobilePosition = validPositions.includes(rawMobile.position as typeof validPositions[number])
      ? (rawMobile.position as HeroMobileLayoutConfig['position'])
      : 'bottom-left';
    const mobileTextSize = validSizes.includes(rawMobile.textSize as typeof validSizes[number])
      ? (rawMobile.textSize as HeroMobileLayoutConfig['textSize'])
      : 'xs';

    const sanitizedMobileLayout: HeroMobileLayoutConfig = {
      position: mobilePosition,
      textSize: mobileTextSize,
      showKicker: rawMobile.showKicker === true,
      showDescription: rawMobile.showDescription === true,
      showExploreButton: rawMobile.showExploreButton !== false,
      showProductButton: rawMobile.showProductButton === true,
      showArrows: rawMobile.showArrows === true,
    };

    const sanitizedConfig: HeroPlaybackSettings = {
      activeSlideId,
      autoAdvanceSeconds,
      mobileLayout: sanitizedMobileLayout,
      updatedAtMs: Date.now(),
    };

    db.settings.heroVideos = {
      slides: sanitizedSlides.sort((a, b) => a.sortOrder - b.sortOrder),
      config: sanitizedConfig,
      hiddenBuiltInVideos: db.settings.heroVideos?.hiddenBuiltInVideos || [],
    };

    try {
      if (isSqlConfigured()) {
        await saveStoreConfigToSql({ settings: db.settings });
      }
      saveDatabase();
      res.json(db.settings.heroVideos);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to save hero video configuration',
      });
    }
  });

  app.delete('/api/admin/hero-videos/file', requireAdmin, async (req, res) => {
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const isUploaded = rawUrl.startsWith('/media/hero-videos/');
    const isBundled = rawUrl.startsWith('/assets/videos/');
    if (!isUploaded && !isBundled) {
      res.status(400).json({ error: 'Only library hero video files can be deleted.' });
      return;
    }

    const fileName = path.basename(rawUrl);
    if (!fileName || !/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      res.status(400).json({ error: 'Invalid video file name.' });
      return;
    }

    if (isBundled) {
      const normalizedUrl = `/assets/videos/${fileName}`;
      const existingHero = db.settings.heroVideos;
      const hidden = new Set(existingHero?.hiddenBuiltInVideos || []);
      hidden.add(normalizedUrl);
      db.settings.heroVideos = {
        slides: existingHero?.slides || [],
        config: existingHero?.config || { activeSlideId: 'magsafe-video', autoAdvanceSeconds: 9 },
        hiddenBuiltInVideos: Array.from(hidden),
      };

      const bundledDir = path.resolve(process.cwd(), 'public', 'assets', 'videos');
      const targetPath = path.resolve(bundledDir, fileName);
      if (targetPath.startsWith(bundledDir + path.sep) && fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch {
          // Public folder may be read-only in production; hiddenBuiltInVideos persists removal
        }
      }

      try {
        if (isSqlConfigured()) {
          await saveStoreConfigToSql({ settings: db.settings });
        }
        saveDatabase();
        res.json({ ok: true, deletedUrl: normalizedUrl });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Failed to remove built-in reel',
        });
      }
      return;
    }

    const candidateDirs = [ensureHeroVideosDir(), getPublicHeroVideosDir(), getDistHeroVideosDir()];
    try {
      for (const dir of candidateDirs) {
        const targetPath = path.resolve(dir, fileName);
        if (!targetPath.startsWith(dir + path.sep)) continue;
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
      }
      if (isSqlConfigured()) {
        await deleteHeroMediaFromSql(fileName);
      }
      res.json({ ok: true, deletedUrl: `/media/hero-videos/${fileName}` });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to delete uploaded video file',
      });
    }
  });

  app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const discountPercent = Number(req.body?.discountPercent);
    if (!code || !Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 90) {
      res.status(400).json({ error: 'Valid coupon code and discount (1–90%) required' });
      return;
    }
    if (db.coupons.some((c) => c.code === code)) {
      res.status(409).json({ error: 'Coupon code already exists' });
      return;
    }
    const coupon: Coupon = {
      id: `coup-${crypto.randomUUID().slice(0, 6)}`,
      code,
      discountPercent,
      active: true,
    };
    try {
      if (isSqlConfigured()) {
        await insertCouponToSql(coupon);
      }
      db.coupons.unshift(coupon);
      saveDatabase();
      res.status(201).json({ coupon });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create coupon' });
    }
  });

  app.post('/api/admin/expenses', requireAdmin, async (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const category = typeof req.body?.category === 'string' && req.body.category.trim() ? req.body.category.trim() : 'Operations';
    const amount = Number(req.body?.amount);
    const date = typeof req.body?.date === 'string' && req.body.date.trim() ? req.body.date.trim() : new Date().toISOString().slice(0, 10);
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';

    if (title.length < 2 || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'Valid expense title and positive amount are required' });
      return;
    }

    const expense: Expense = {
      id: `exp-${crypto.randomUUID().slice(0, 8)}`,
      title,
      category,
      amount,
      date,
      note,
      createdAt: new Date().toISOString(),
    };
    try {
      if (isSqlConfigured()) {
        await insertExpenseToSql(expense);
      }
      db.expenses.unshift(expense);
      saveDatabase();
      res.status(201).json({ expense });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save expense' });
    }
  });

  app.delete('/api/admin/expenses/:id', requireAdmin, async (req, res) => {
    const idx = db.expenses.findIndex((e) => e.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    try {
      if (isSqlConfigured()) {
        await deleteExpenseFromSql(req.params.id);
      }
      db.expenses.splice(idx, 1);
      saveDatabase();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete expense' });
    }
  });

  app.patch('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
    const review = (db.reviews || []).find((r) => r.id === req.params.id);
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    const verifiedPurchase =
      typeof req.body?.verifiedPurchase === 'boolean'
        ? req.body.verifiedPurchase
        : !review.verifiedPurchase;

    try {
      if (isSqlConfigured()) {
        await updateReviewVerifiedInSql(review.id, verifiedPurchase);
      }
      review.verifiedPurchase = verifiedPurchase;
      saveDatabase();
      res.json({ review });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update review' });
    }
  });

  app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
    const list = db.reviews || [];
    const idx = list.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    try {
      if (isSqlConfigured()) {
        await deleteReviewFromSql(req.params.id);
      }
      list.splice(idx, 1);
      db.reviews = list;
      saveDatabase();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete review' });
    }
  });

  // Vite Dev Middleware or Static Production Build
  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' &&
      Boolean(process.env.K_SERVICE) &&
      fs.existsSync(path.join(distDir, 'index.html')));
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Classy Cases server listening on http://localhost:${PORT}`);
    void ensureStoreLoaded().catch(() => {});
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
