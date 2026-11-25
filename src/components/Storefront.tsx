import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  Heart,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useCart, type AddCartItemMeta } from '../context/CartContext';
import {
  extractSearchSuggestions,
  formatTaka,
  matchesPhoneCaseSearch,
  normalizePhoneCaseProduct,
  type PhoneCaseProduct,
} from '../models/phoneCase';
import type {
  Category,
  FooterConfigSettings,
  FooterLinkItem,
  HeaderConfigSettings,
  HeaderNavLink,
  OrderItem,
  Product,
} from '../types';
import { CartDrawer } from './CartDrawer';
import { CheckoutModal } from './CheckoutModal';
import {
  getSavedCustomerOrderTokens,
  MyOrdersSection,
  saveCustomerOrderToken,
} from './MyOrdersSection';
import { PhoneCaseGrid } from './PhoneCaseGrid';
import { ProductDetailView } from './ProductDetailView';
import { ProductQuickViewModal } from './ProductQuickViewModal';
import { StorefrontSearchBar } from './StorefrontSearchBar';
import { CatalogFilterBar, type CatalogSortOption } from './CatalogFilterBar';
import { CatalogShowcaseSections } from './CatalogShowcaseSections';
import { CustomerReviewsCarousel } from './CustomerReviewsCarousel';
import { FeaturedCategoriesSlider } from './FeaturedCategoriesSlider';
import { HeroBanner } from './HeroBanner';
import { TrustHighlights } from './TrustHighlights';
import { TrustedBySection } from './TrustedBySection';
import { usePersistedProducts } from '../hooks/usePersistedProducts';
import { applyDocumentFavicon } from '../utils/branding';
import { mergeFooterConfig, mergeHeaderConfig } from '../utils/headerFooterDefaults';
import {
  getCategoryAndDescendantNames,
  getRootCategoryFor,
  getSubcategories,
  getTopLevelCategories,
} from '../utils/categoryTree';
import { fetchPublicCategoriesFromFirestore } from '../services/categoryFirestore';

export interface PublicStoreSettings {
  storeName: string;
  tagline: string;
  logoUrl?: string;
  faviconUrl?: string;
  orderPrefix: string;
  takePreOrders: boolean;
  phone: string;
  email: string;
  address: string;
  openingHours: string;
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
  freeShippingThreshold: number;
  reviewsEnabled?: boolean;
  homeReviewsOnlyFiveStar?: boolean;
  shopPageColumns?: 2 | 3 | 4 | 5;
  headerConfig?: HeaderConfigSettings;
  footerConfig?: FooterConfigSettings;
  paymentGateways: {
    bkash: { enabled: boolean; mode: string; logoUrl?: string };
    nagad: { enabled: boolean; mode: string; logoUrl?: string };
    card: { enabled: boolean; provider: string; mode: string; logoUrl?: string };
    cod: { enabled: boolean; logoUrl?: string };
  };
}

interface StorefrontProps {
  onOpenAdmin: () => void;
}

const STOREFRONT_META_CACHE_KEY = 'classy_cases_storefront_meta_v1';

interface CachedStorefrontMeta {
  settings: PublicStoreSettings | null;
  categories: Category[];
}

function readCachedStorefrontMeta(): CachedStorefrontMeta {
  if (typeof window === 'undefined') {
    return { settings: null, categories: [] };
  }
  try {
    const raw = window.localStorage.getItem(STOREFRONT_META_CACHE_KEY);
    if (!raw) return { settings: null, categories: [] };
    const parsed = JSON.parse(raw) as Partial<CachedStorefrontMeta>;
    return {
      settings: parsed?.settings && typeof parsed.settings === 'object' ? parsed.settings : null,
      categories: Array.isArray(parsed?.categories) ? parsed.categories : [],
    };
  } catch {
    return { settings: null, categories: [] };
  }
}

function saveCachedStorefrontMeta(
  settings: PublicStoreSettings | null,
  categories: Category[]
) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STOREFRONT_META_CACHE_KEY,
      JSON.stringify({ settings, categories })
    );
  } catch {
    // ignore storage quota errors
  }
}

type StorefrontRoute =
  | { view: 'home' }
  | { view: 'checkout' }
  | { view: 'orders' }
  | { view: 'product'; productKey: string };

function parseStorefrontRoute(): StorefrontRoute {
  if (typeof window === 'undefined') return { view: 'home' };
  const rawPath = window.location.pathname;
  const rawHash = window.location.hash;
  const target = rawHash.startsWith('#/') ? rawHash.slice(1) : rawPath;
  const normalized = target.replace(/\/+$/, '') || '/';
  const lower = normalized.toLowerCase();

  if (lower === '/checkout') {
    return { view: 'checkout' };
  }
  if (lower === '/orders') {
    return { view: 'orders' };
  }
  if (lower.startsWith('/product/')) {
    const rawKey = normalized.slice('/product/'.length);
    if (rawKey) {
      try {
        return { view: 'product', productKey: decodeURIComponent(rawKey) };
      } catch {
        return { view: 'product', productKey: rawKey };
      }
    }
  }
  return { view: 'home' };
}

function pushStorefrontPath(path: string) {
  if (typeof window === 'undefined') return;
  const current = window.location.pathname.replace(/\/+$/, '') || '/';
  const target = path.replace(/\/+$/, '') || '/';
  if (current === target && !window.location.hash) return;
  try {
    window.history.pushState(null, '', target);
  } catch {
    window.location.hash = `#${target}`;
  }
}

function findProductByKey(
  products: PhoneCaseProduct[],
  key: string
): PhoneCaseProduct | null {
  const trimmed = key.trim().toLowerCase();
  if (!trimmed) return null;
  return (
    products.find((p) => p.id.toLowerCase() === trimmed) ||
    products.find((p) => (p.slug || '').toLowerCase() === trimmed) ||
    null
  );
}

export function Storefront({ onOpenAdmin }: StorefrontProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        onOpenAdmin();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenAdmin]);

  const initialMeta = useMemo(() => readCachedStorefrontMeta(), []);
  const initialRoute = useMemo(() => parseStorefrontRoute(), []);

  const [settings, setSettings] = useState<PublicStoreSettings | null>(initialMeta.settings);
  const [categories, setCategories] = useState<Category[]>(initialMeta.categories);
  const {
    products: persistedProducts,
    hasCachedCatalog,
    syncWithServerCatalog,
  } = usePersistedProducts({ activeOnly: true });
  const products = useMemo(
    () => persistedProducts.map(normalizePhoneCaseProduct),
    [persistedProducts]
  );
  const [loading, setLoading] = useState(() => !hasCachedCatalog);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [sortBy, setSortBy] = useState<CatalogSortOption>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewAll, setViewAll] = useState(false);
  const [carouselPage, setCarouselPage] = useState(0);

  const {
    items: cart,
    cartCount,
    openDrawer,
    addItem,
    clearCart,
  } = useCart();

  const FAVORITES_STORAGE_KEY = 'classy_cases_favorites_v1';

  function readStoredFavorites(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? Array.from(new Set(parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)))
        : [];
    } catch {
      return [];
    }
  }

  const [wishlist, setWishlist] = useState<string[]>(readStoredFavorites);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedDrawerCatIds, setExpandedDrawerCatIds] = useState<Record<string, boolean>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(() => initialRoute.view === 'checkout');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [infoModal, setInfoModal] = useState<{ title: string; content: string } | null>(null);

  // Active sub-views
  const [pendingProductKey, setPendingProductKey] = useState<string | null>(() =>
    initialRoute.view === 'product' ? initialRoute.productKey : null
  );
  const [activeProduct, setActiveProduct] = useState<PhoneCaseProduct | null>(() => {
    if (initialRoute.view !== 'product') return null;
    const cachedList = persistedProducts.map(normalizePhoneCaseProduct);
    return findProductByKey(cachedList, initialRoute.productKey);
  });
  const [quickViewProduct, setQuickViewProduct] = useState<PhoneCaseProduct | null>(null);
  const [myOrdersOpen, setMyOrdersOpen] = useState(() => initialRoute.view === 'orders');
  const [hasSavedOrders, setHasSavedOrders] = useState(() => getSavedCustomerOrderTokens().length > 0);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [logoImgFailed, setLogoImgFailed] = useState(false);
  const [failedCatImages, setFailedCatImages] = useState<Record<string, boolean>>({});

  async function fetchStorefront() {
    try {
      const res = await fetch('/api/storefront');
      const data = await res.json();
      const nextSettings = data.settings || null;
      const serverCategories: Category[] = Array.isArray(data.categories) ? data.categories : [];
      setSettings(nextSettings);
      setLogoImgFailed(false);
      setFailedCatImages({});
      setCategories(serverCategories);
      saveCachedStorefrontMeta(nextSettings, serverCategories);
      syncWithServerCatalog(
        (data.products || []) as Product[],
        Boolean(data.catalogModified)
      );
      setLoading(false);

      // Merge any additional active sub-categories stored in Firestore without blocking initial reload
      void fetchPublicCategoriesFromFirestore()
        .then((firestoreCategories) => {
          if (!Array.isArray(firestoreCategories) || firestoreCategories.length === 0) {
            return;
          }
          const mergedMap = new Map<string, Category>();
          for (const cat of serverCategories) {
            mergedMap.set(cat.id, cat);
          }
          for (const fsCat of firestoreCategories) {
            mergedMap.set(fsCat.id, fsCat);
          }
          const merged = Array.from(mergedMap.values());
          setCategories(merged);
          saveCachedStorefrontMeta(nextSettings, merged);
        })
        .catch(() => {
          // ignore transient Firestore read errors on storefront
        });
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStorefront();
  }, []);

  useEffect(() => {
    if (!pendingProductKey) return;
    const matched = findProductByKey(products, pendingProductKey);
    if (matched) {
      setActiveProduct(matched);
    } else if (!loading && products.length > 0) {
      setPendingProductKey(null);
      setActiveProduct(null);
      pushStorefrontPath('/');
    }
  }, [products, pendingProductKey, loading]);

  useEffect(() => {
    function handlePopState() {
      const route = parseStorefrontRoute();
      if (route.view === 'checkout') {
        setMyOrdersOpen(false);
        setActiveProduct(null);
        setPendingProductKey(null);
        setCheckoutOpen(true);
      } else if (route.view === 'orders') {
        setCheckoutOpen(false);
        setActiveProduct(null);
        setPendingProductKey(null);
        setMyOrdersOpen(true);
      } else if (route.view === 'product') {
        setCheckoutOpen(false);
        setMyOrdersOpen(false);
        setPendingProductKey(route.productKey);
        setActiveProduct(findProductByKey(products, route.productKey));
      } else {
        setCheckoutOpen(false);
        setMyOrdersOpen(false);
        setActiveProduct(null);
        setPendingProductKey(null);
      }
    }
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [products]);

  useEffect(() => {
    if (!settings) return;
    applyDocumentFavicon(settings.faviconUrl, settings.storeName);
  }, [settings?.faviconUrl, settings?.storeName]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // ignore storage quota errors
    }
  }, [wishlist]);

  useEffect(() => {
    function handleStorageSync(event: StorageEvent) {
      if (event.key === FAVORITES_STORAGE_KEY) {
        setWishlist(readStoredFavorites());
      }
    }
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 2600);
  }

  function navigateHome(scrollTop = false) {
    setCheckoutOpen(false);
    setActiveProduct(null);
    setPendingProductKey(null);
    setMyOrdersOpen(false);
    pushStorefrontPath('/');
    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function navigateProduct(product: PhoneCaseProduct) {
    setCheckoutOpen(false);
    setMyOrdersOpen(false);
    setPendingProductKey(product.slug || product.id);
    setActiveProduct(product);
    pushStorefrontPath(`/product/${encodeURIComponent(product.slug || product.id)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateCheckout() {
    setMyOrdersOpen(false);
    setActiveProduct(null);
    setPendingProductKey(null);
    setCheckoutOpen(true);
    pushStorefrontPath('/checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openMyOrders() {
    setCheckoutOpen(false);
    setActiveProduct(null);
    setPendingProductKey(null);
    setMyOrdersOpen(true);
    pushStorefrontPath('/orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const effectiveCategories = useMemo<Category[]>(() => {
    if (categories.length > 0) return categories;
    const seen = new Map<string, Category>();
    for (const p of products) {
      const name = p.category?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        const brandKey =
          key === 'motorola' || key === 'vivo' || key === 'xiaomi' ? key : 'custom';
        seen.set(key, {
          id: `derived-${key}`,
          name,
          slug: key.replace(/[^a-z0-9]+/g, '-'),
          brandKey,
          featured: true,
        });
      }
    }
    return Array.from(seen.values());
  }, [categories, products]);

  const topLevelCategories = useMemo(
    () => getTopLevelCategories(effectiveCategories),
    [effectiveCategories]
  );

  const activeCategoryRoot = useMemo(
    () => getRootCategoryFor(effectiveCategories, selectedCategory),
    [effectiveCategories, selectedCategory]
  );

  const availableModels = useMemo(() => {
    const modelSet = new Set<string>();
    const categoryNames = getCategoryAndDescendantNames(effectiveCategories, selectedCategory);
    for (const p of products) {
      const matchesBrand =
        selectedCategory === 'All' ||
        categoryNames.has(p.category.trim().toLowerCase()) ||
        (p.alsoShowIn || []).some((c) => categoryNames.has(c.trim().toLowerCase()));
      if (!matchesBrand) continue;
      for (const m of p.brandModels || []) {
        const trimmed = m.trim();
        if (trimmed) modelSet.add(trimmed);
      }
    }
    return Array.from(modelSet).sort((a, b) => a.localeCompare(b));
  }, [products, effectiveCategories, selectedCategory]);

  function applyCategorySelection(nextCategory: string) {
    setSelectedCategory(nextCategory);
    setCarouselPage(0);
    if (selectedModel !== 'All') {
      const categoryNames = getCategoryAndDescendantNames(effectiveCategories, nextCategory);
      const nextBrandHasModel = products.some((p) => {
        const matchesBrand =
          nextCategory === 'All' ||
          categoryNames.has(p.category.trim().toLowerCase()) ||
          (p.alsoShowIn || []).some((c) => categoryNames.has(c.trim().toLowerCase()));
        return (
          matchesBrand &&
          (p.brandModels || []).some((m) => m.trim().toLowerCase() === selectedModel.toLowerCase())
        );
      });
      if (!nextBrandHasModel) {
        setSelectedModel('All');
      }
    }
  }

  function resetAllFilters() {
    setSelectedCategory('All');
    setSelectedModel('All');
    setSortBy('featured');
    setInStockOnly(false);
    setSearchQuery('');
    setViewAll(false);
    setCarouselPage(0);
  }

  const filteredProducts = useMemo(() => {
    const categoryNames = getCategoryAndDescendantNames(effectiveCategories, selectedCategory);
    const filtered = products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        categoryNames.has(p.category.trim().toLowerCase()) ||
        (p.alsoShowIn || []).some((c) => categoryNames.has(c.trim().toLowerCase()));
      const matchesModel =
        selectedModel === 'All' ||
        (p.brandModels || []).some((m) => m.trim().toLowerCase() === selectedModel.toLowerCase());
      const matchesStock = !inStockOnly || p.stock > 0;
      return matchesCategory && matchesModel && matchesStock && matchesPhoneCaseSearch(p, searchQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'discount_desc') {
        return (
          b.discountPercent - a.discountPercent ||
          Number(Boolean(b.featured)) - Number(Boolean(a.featured))
        );
      }
      if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });
  }, [products, effectiveCategories, selectedCategory, selectedModel, inStockOnly, sortBy, searchQuery]);

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedModel !== 'All' ||
    inStockOnly ||
    sortBy !== 'featured' ||
    searchQuery.trim() !== '';

  const searchSuggestions = useMemo(
    () => extractSearchSuggestions(products, searchQuery, 8),
    [products, searchQuery]
  );

  function handleSearchChange(nextQuery: string) {
    setSearchQuery(nextQuery);
    setCarouselPage(0);
    if (nextQuery.trim() !== '') {
      navigateHome();
    }
  }

  function handleQuickSelectCategory(categoryName: string) {
    navigateHome();
    applyCategorySelection(categoryName);
    setTimeout(() => {
      document.getElementById('new-arrivals-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 30);
  }

  function scrollToCatalog() {
    navigateHome();
    setTimeout(() => {
      const el = document.getElementById('new-arrivals-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 30);
  }

  const desktopColumns: 2 | 3 | 4 | 5 =
    settings?.shopPageColumns && [2, 3, 4, 5].includes(settings.shopPageColumns)
      ? settings.shopPageColumns
      : 5;
  const pageSize = desktopColumns;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(carouselPage, totalPages - 1);
  const displayedProducts =
    viewAll || hasActiveFilters
      ? filteredProducts
      : filteredProducts.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function addToCart(product: Product, model?: string, qty = 1, meta?: AddCartItemMeta) {
    addItem(product, model, qty, meta);
    showToast(`Added "${product.title.slice(0, 28)}..." to bag`);
  }

  function toggleWishlist(productId: string) {
    const exists = wishlist.includes(productId);
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
    showToast(exists ? 'Removed from My Favorites' : 'Saved to My Favorites');
  }

  function clearAllFavorites() {
    setWishlist([]);
    showToast('Cleared My Favorites');
  }

  function addAllFavoritesToBag() {
    if (wishlistProducts.length === 0) return;
    for (const prod of wishlistProducts) {
      addItem(prod);
    }
    setWishlistOpen(false);
    showToast(`Added ${wishlistProducts.length} favorite ${wishlistProducts.length === 1 ? 'case' : 'cases'} to bag`);
    openDrawer();
  }

  async function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNewsletterMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewsletterMsg(data.error || 'Could not subscribe');
        return;
      }
      setNewsletterEmail('');
      setNewsletterMsg('Subscribed! Watch your inbox for new drops.');
    } catch {
      setNewsletterMsg('Network error. Try again.');
    }
  }

  function handleBuyAgain(orderItems: OrderItem[]) {
    let added = 0;
    for (const item of orderItems) {
      const match = products.find((p) => p.id === item.productId && p.active !== false);
      if (match) {
        addItem(match, item.model, item.quantity);
        added += 1;
      }
    }
    if (added > 0) {
      showToast(`Added ${added} ${added === 1 ? 'item' : 'items'} back to your bag`);
      openDrawer();
    } else {
      showToast('Those items are currently unavailable.');
    }
  }

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  const headerConfig = useMemo(
    () => mergeHeaderConfig(settings?.headerConfig),
    [settings?.headerConfig]
  );

  const footerConfig = useMemo(
    () =>
      mergeFooterConfig(settings?.footerConfig, {
        storeName: settings?.storeName,
        tagline: settings?.tagline,
        phone: settings?.phone,
        email: settings?.email,
        address: settings?.address,
        openingHours: settings?.openingHours,
        shippingInsideDhaka: settings?.shippingInsideDhaka,
        shippingOutsideDhaka: settings?.shippingOutsideDhaka,
        freeShippingThreshold: settings?.freeShippingThreshold,
      }),
    [settings]
  );

  function handleHeaderNavAction(item: HeaderNavLink) {
    if (item.action === 'home') {
      resetAllFilters();
      navigateHome(true);
    } else if (item.action === 'orders') {
      openMyOrders();
    } else if (item.action === 'shop') {
      applyCategorySelection('All');
      setViewAll(true);
      scrollToCatalog();
    }
  }

  function handleFooterLinkAction(item: FooterLinkItem) {
    if (item.action === 'orders') {
      openMyOrders();
    } else if (item.action === 'catalog') {
      scrollToCatalog();
    } else if (item.action === 'modal') {
      setInfoModal({
        title: item.label,
        content: item.value || `${settings?.storeName || 'Classy Cases'} customer support.`,
      });
    }
  }

  const activeSocialItems = [
    {
      key: 'facebook',
      label: 'Facebook',
      url: footerConfig.socialLinks.facebook,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H8v3h2.2V21h3.3Z" />
        </svg>
      ),
    },
    {
      key: 'instagram',
      label: 'Instagram',
      url: footerConfig.socialLinks.instagram,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      url: footerConfig.socialLinks.tiktok,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.3Z" />
        </svg>
      ),
    },
    {
      key: 'youtube',
      label: 'YouTube',
      url: footerConfig.socialLinks.youtube,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M21.58 7.19a2.75 2.75 0 0 0-1.94-1.95C17.93 4.75 12 4.75 12 4.75s-5.93 0-7.64.49A2.75 2.75 0 0 0 2.42 7.2 28.8 28.8 0 0 0 2 12a28.8 28.8 0 0 0 .42 4.81 2.75 2.75 0 0 0 1.94 1.95c1.71.49 7.64.49 7.64.49s5.93 0 7.64-.49a2.75 2.75 0 0 0 1.94-1.95A28.8 28.8 0 0 0 22 12a28.8 28.8 0 0 0-.42-4.81ZM10 15.1V8.9L15.4 12 10 15.1Z" />
        </svg>
      ),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      url: footerConfig.socialLinks.whatsapp,
      icon: <MessageCircle className="w-4 h-4" aria-hidden="true" />,
    },
    {
      key: 'x',
      label: 'X (Twitter)',
      url: footerConfig.socialLinks.x,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
        </svg>
      ),
    },
  ].filter((item) => Boolean(item.url && item.url.trim()));

  return (
    <div className="min-h-screen flex flex-col bg-[#F2E8D2] text-[#2B1416] overflow-x-clip">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 z-50 bg-[#650108] text-[#F2E8D2] border border-[#F2E8D2]/25 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header
        className={`${headerConfig.stickyHeader ? 'sticky top-0' : 'relative'} z-30`}
        style={{
          backgroundColor: headerConfig.headerBgColor,
          color: headerConfig.headerTextColor,
        }}
      >
        {headerConfig.announcementEnabled && headerConfig.announcementText && (
          <div
            className="px-4 py-1.5 text-center text-xs font-medium tracking-wide"
            style={{
              backgroundColor: headerConfig.announcementBgColor,
              color: headerConfig.announcementTextColor,
            }}
          >
            {headerConfig.announcementText}
          </div>
        )}

        <div className="border-b border-[#E6D9BE]">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 min-h-14 sm:min-h-[76px] py-2 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-6">
            {/* Zone 1: Mobile Menu Icon + Brand Wordmark */}
            <div className="flex items-center gap-1.5 sm:gap-5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                className="md:hidden w-8 h-8 -ml-1.5 rounded-lg hover:bg-black/5 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
                style={{ color: headerConfig.headerTextColor }}
              >
                <Menu className="w-[22px] h-[22px] stroke-[1.8]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  resetAllFilters();
                  navigateHome(true);
                }}
                className="font-brand text-xl sm:text-[26px] font-semibold tracking-tight whitespace-nowrap shrink-0 cursor-pointer flex items-center"
                style={{ color: headerConfig.headerTextColor }}
              >
                {settings?.logoUrl && !logoImgFailed ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.storeName || 'Classy Cases'}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoImgFailed(true)}
                    className="h-8 sm:h-10 w-auto max-w-[165px] sm:max-w-[180px] object-contain"
                  />
                ) : (
                  settings?.storeName || 'Classy Cases'
                )}
              </button>

              {headerConfig.navLinks.length > 0 && (
                <nav
                  aria-label="Header navigation"
                  className="hidden lg:flex items-center gap-4 text-[13px] font-medium"
                >
                  {headerConfig.navLinks.map((link) =>
                    link.action === 'url' && link.url ? (
                      <a
                        key={link.id}
                        href={link.url}
                        target={link.url.startsWith('http') ? '_blank' : undefined}
                        rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="whitespace-nowrap hover:opacity-75 transition-opacity"
                        style={{ color: headerConfig.headerTextColor }}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => handleHeaderNavAction(link)}
                        className="whitespace-nowrap hover:opacity-75 transition-opacity cursor-pointer"
                        style={{ color: headerConfig.headerTextColor }}
                      >
                        {link.label}
                      </button>
                    )
                  )}
                </nav>
              )}
            </div>

          {/* Zone 2: Search Bar */}
          {headerConfig.showSearchBar && (
            <div className="hidden md:block flex-1 max-w-xl">
              <StorefrontSearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                onSubmitSearch={scrollToCatalog}
                onSelectProduct={(productId) => {
                  const found = products.find((p) => p.id === productId);
                  if (found) {
                    navigateProduct(found);
                  }
                }}
                onSelectCategory={handleQuickSelectCategory}
                suggestions={searchSuggestions}
                placeholder={headerConfig.searchPlaceholder}
              />
            </div>
          )}

          {/* Zone 3: Utility Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {headerConfig.showMyOrdersButton && (
              <button
                type="button"
                onClick={openMyOrders}
                title={headerConfig.myOrdersLabel || 'My Orders & Tracking'}
                className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-auto lg:px-2.5 rounded-lg transition-colors relative inline-flex items-center justify-center gap-1.5 text-[13px] font-medium cursor-pointer ${
                  myOrdersOpen
                    ? 'bg-[#650108] text-[#F2E8D2]'
                    : 'hover:bg-black/5'
                }`}
                style={myOrdersOpen ? undefined : { color: headerConfig.headerTextColor }}
                aria-label={headerConfig.myOrdersLabel || 'My Orders'}
              >
                <Package className="w-[21px] h-[21px] sm:w-[22px] sm:h-[22px] stroke-[1.8] shrink-0" />
                <span className="hidden lg:inline">{headerConfig.myOrdersLabel}</span>
                {hasSavedOrders && !myOrdersOpen && (
                  <span className="absolute top-0.5 right-0.5 lg:static w-2 h-2 rounded-full bg-emerald-600" />
                )}
              </button>
            )}

            {headerConfig.showFavoritesButton && (
              <button
                type="button"
                onClick={() => setWishlistOpen(true)}
                title="My Favorites"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-black/5 transition-colors relative inline-flex items-center justify-center cursor-pointer"
                style={{ color: headerConfig.headerTextColor }}
                aria-label="Open My Favorites"
              >
                <Heart
                  className={`w-[21px] h-[21px] sm:w-[22px] sm:h-[22px] stroke-[1.8] shrink-0 ${
                    wishlistProducts.length > 0 ? 'fill-current' : ''
                  }`}
                />
                {wishlistProducts.length > 0 && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-[#650108] text-[#F2E8D2] text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {wishlistProducts.length}
                  </span>
                )}
              </button>
            )}

            {headerConfig.showCartButton && (
              <button
                type="button"
                onClick={openDrawer}
                title="Shopping Bag"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-black/5 transition-colors relative inline-flex items-center justify-center cursor-pointer"
                style={{ color: headerConfig.headerTextColor }}
                aria-label="Open shopping bag"
              >
                <ShoppingBag className="w-[21px] h-[21px] sm:w-[22px] sm:h-[22px] stroke-[1.8] shrink-0" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-[#650108] text-[#F2E8D2] text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
          </div>
        </div>

        {/* Mobile search row */}
        {headerConfig.showSearchBar && (
          <div
            className="md:hidden px-4 pt-2.5 pb-3.5 border-b border-[#E6D9BE]"
            style={{ backgroundColor: headerConfig.headerBgColor }}
          >
            <StorefrontSearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onSubmitSearch={scrollToCatalog}
              onSelectProduct={(productId) => {
                const found = products.find((p) => p.id === productId);
                if (found) {
                  navigateProduct(found);
                }
              }}
              onSelectCategory={handleQuickSelectCategory}
              suggestions={searchSuggestions}
              placeholder={headerConfig.searchPlaceholder}
              compact
            />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {checkoutOpen ? (
          settings ? (
            <CheckoutModal
              isOpen={checkoutOpen}
              onClose={() => navigateHome(true)}
              cart={cart}
              products={products}
              settings={settings}
              deliveryArea={deliveryArea}
              onDeliveryAreaChange={setDeliveryArea}
              onOrderCompleted={(_order, customerOrderToken) => {
                if (customerOrderToken) {
                  saveCustomerOrderToken(customerOrderToken);
                  setHasSavedOrders(true);
                }
                clearCart();
                fetchStorefront();
              }}
              onViewMyOrders={openMyOrders}
              onEditCart={openDrawer}
              onEditItem={(productId) => {
                const found = products.find((p) => p.id === productId);
                if (found) {
                  navigateProduct(found);
                }
              }}
            />
          ) : (
            <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-20 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#650108]/25 border-t-[#650108] animate-spin" />
              <p className="text-sm font-medium text-[#6B4C4E]">Loading checkout...</p>
            </div>
          )
        ) : myOrdersOpen ? (
          <MyOrdersSection
            products={products}
            onBackToShop={() => navigateHome(true)}
            onBuyAgain={handleBuyAgain}
          />
        ) : activeProduct ? (
          <ProductDetailView
            product={activeProduct}
            relatedProducts={[
              ...products.filter(
                (p) =>
                  p.id !== activeProduct.id &&
                  p.category.toLowerCase() === activeProduct.category.toLowerCase()
              ),
              ...products.filter(
                (p) =>
                  p.id !== activeProduct.id &&
                  p.category.toLowerCase() !== activeProduct.category.toLowerCase()
              ),
            ].slice(0, 4)}
            wishlist={wishlist}
            shippingInsideDhaka={settings?.shippingInsideDhaka}
            shippingOutsideDhaka={settings?.shippingOutsideDhaka}
            freeShippingThreshold={settings?.freeShippingThreshold}
            onBack={() => navigateHome(true)}
            onSelectProduct={navigateProduct}
            onToggleWishlist={toggleWishlist}
            onAddToCart={(product, model, qty = 1, meta) => {
              addToCart(product, model, qty, meta);
              openDrawer();
            }}
            onBuyNow={(product, model, qty = 1, meta) => {
              addToCart(product, model, qty, meta);
              navigateCheckout();
            }}
            onOpenWhatsAppHelp={() =>
              setInfoModal({
                title: 'WhatsApp Case Fit Help',
                content: `Message or call our team at ${settings?.phone || '01799576210'} (${settings?.openingHours || '10:00 AM - 10:00 PM'}) for instant confirmation on camera cutouts and model compatibility for "${activeProduct.title}".`,
              })
            }
            onShareToast={showToast}
          />
        ) : pendingProductKey && loading ? (
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-20 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#650108]/25 border-t-[#650108] animate-spin" />
            <p className="text-sm font-medium text-[#6B4C4E]">Loading product...</p>
          </div>
        ) : (
          <>
            {/* Premium Hero Banner & Trust Section (collapsed during active top search so filtered results appear right away) */}
            {searchQuery.trim() === '' && (
              <>
                <HeroBanner
                  products={products}
                  onShopNow={(categoryName) => {
                    applyCategorySelection(categoryName || 'All');
                    document
                      .getElementById('new-arrivals-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onInspectProduct={navigateProduct}
                />
                <TrustHighlights
                  shippingInsideDhaka={settings?.shippingInsideDhaka}
                  shippingOutsideDhaka={settings?.shippingOutsideDhaka}
                  freeShippingThreshold={settings?.freeShippingThreshold}
                />
              </>
            )}

            {/* Featured Categories (collapsed during active top search so filtered results appear right away) */}
            {searchQuery.trim() === '' && (
              <FeaturedCategoriesSlider
                categories={effectiveCategories}
                selectedCategory={selectedCategory}
                failedCatImages={failedCatImages}
                onImageError={(catId) =>
                  setFailedCatImages((prev) => ({ ...prev, [catId]: true }))
                }
                onSelectCategory={(categoryName) => {
                  applyCategorySelection(categoryName);
                  document
                    .getElementById('new-arrivals-section')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            )}

            {/* Bestselling & Brand-Tabbed Phone Cases Showcase Rows */}
            {searchQuery.trim() === '' && (
              <CatalogShowcaseSections
                products={products}
                categories={effectiveCategories}
                wishlist={wishlist}
                loading={loading}
                desktopColumns={desktopColumns}
                onSelectProduct={navigateProduct}
                onQuickView={(product) => setQuickViewProduct(product)}
                onToggleWishlist={toggleWishlist}
                onAddToCart={(product) => addToCart(product)}
                onViewAll={(categoryName) => {
                  applyCategorySelection(categoryName || 'All');
                  setViewAll(true);
                  document
                    .getElementById('new-arrivals-section')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            )}

            {/* Explore More Products / Full Filterable Catalog */}
            <section id="new-arrivals-section" className="max-w-[1180px] mx-auto px-3 sm:px-8 pt-8 pb-16">
              <div className="flex flex-wrap items-end justify-between mb-5 gap-4">
                <div>
                  <h2 className="font-brand text-2xl sm:text-[28px] font-semibold text-[#650108] tracking-tight">
                    {searchQuery.trim() !== ''
                      ? selectedCategory === 'All'
                        ? `Results for "${searchQuery.trim()}"`
                        : `${selectedCategory} Cases matching "${searchQuery.trim()}"`
                      : selectedCategory === 'All'
                        ? 'Explore More Products'
                        : `${selectedCategory} Cases`}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <div className="w-10 h-[3px] bg-[#650108]" />
                    {hasActiveFilters && (
                      <span className="text-xs font-normal text-[#6B4C4E] tabular-nums">
                        {filteredProducts.length} {filteredProducts.length === 1 ? 'case' : 'cases'} found
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {selectedCategory !== 'All' && searchQuery.trim() !== '' && (
                    <button
                      type="button"
                      onClick={() => applyCategorySelection('All')}
                      className="text-[13px] font-semibold text-[#650108]/80 hover:text-[#650108] whitespace-nowrap cursor-pointer"
                    >
                      Search all brands
                    </button>
                  )}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="text-[13px] font-semibold text-[#6B4C4E] hover:text-[#650108] whitespace-nowrap cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
                  {!hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => setViewAll((v) => !v)}
                      className="hidden sm:inline-flex text-xs font-semibold tracking-[1.6px] uppercase text-[#650108] items-center gap-1.5 hover:opacity-75 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{viewAll ? 'SHOW CAROUSEL' : 'VIEW ALL ITEMS'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <CatalogFilterBar
                categories={effectiveCategories}
                products={products}
                selectedCategory={selectedCategory}
                selectedModel={selectedModel}
                availableModels={availableModels}
                sortBy={sortBy}
                inStockOnly={inStockOnly}
                searchQuery={searchQuery}
                onSelectCategory={applyCategorySelection}
                onSelectModel={(model) => {
                  setSelectedModel(model);
                  setCarouselPage(0);
                }}
                onSortChange={(nextSort) => {
                  setSortBy(nextSort);
                  setCarouselPage(0);
                }}
                onToggleInStockOnly={() => {
                  setInStockOnly((prev) => !prev);
                  setCarouselPage(0);
                }}
                onSearchChange={handleSearchChange}
              />

              <PhoneCaseGrid
                products={displayedProducts}
                mobileProducts={filteredProducts}
                loading={loading}
                wishlist={wishlist}
                searchQuery={searchQuery}
                desktopColumns={desktopColumns}
                showCarouselControls={!viewAll && !hasActiveFilters}
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCarouselPage}
                onSelectProduct={navigateProduct}
                onQuickView={(product) => setQuickViewProduct(product)}
                onToggleWishlist={toggleWishlist}
                onAddToCart={(product) => addToCart(product)}
                onResetFilters={resetAllFilters}
              />

              {!viewAll && !hasActiveFilters && filteredProducts.length > pageSize && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setViewAll(true)}
                    className="px-6 py-3 rounded-xl border border-[#650108] bg-[#FFFDF8] text-[#650108] text-xs font-semibold uppercase tracking-[1.6px] inline-flex items-center gap-2 hover:bg-[#650108] hover:text-[#F2E8D2] transition-colors cursor-pointer"
                  >
                    <span>Explore More Products</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>

            {/* Customer Reviews Carousel */}
            {settings?.reviewsEnabled !== false && (
              <CustomerReviewsCarousel
                homeReviewsOnlyFiveStar={settings?.homeReviewsOnlyFiveStar}
                onSelectProduct={(productId) => {
                  const found = products.find((p) => p.id === productId);
                  if (found) {
                    navigateProduct(found);
                  }
                }}
              />
            )}

            {/* Trusted By Partner Marquee & Testimonials */}
            <TrustedBySection
              paymentLogos={{
                bkash: settings?.paymentGateways?.bkash?.logoUrl,
                nagad: settings?.paymentGateways?.nagad?.logoUrl,
                card: settings?.paymentGateways?.card?.logoUrl,
              }}
            />
          </>
        )}
      </main>

      {/* Customizable Footer */}
      <footer
        className="border-t border-black/15 relative"
        style={{
          backgroundColor: footerConfig.footerBgColor,
          color: footerConfig.footerTextColor,
        }}
      >
        <div
          className={`max-w-[1180px] mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 ${
            footerConfig.showNewsletter ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
          } gap-8 lg:gap-10`}
        >
          {/* Column 1: Brand, Contact, CTA & Social Media */}
          <div className="space-y-3.5">
            {footerConfig.showBrandLogo && (
              <div className="font-brand text-2xl font-semibold">
                {settings?.logoUrl && !logoImgFailed ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.storeName || 'Classy Cases'}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoImgFailed(true)}
                    className="h-9 w-auto max-w-[180px] object-contain bg-[#F2E8D2] px-2 py-1 rounded-lg"
                  />
                ) : (
                  settings?.storeName || 'Classy Cases'
                )}
              </div>
            )}

            {footerConfig.aboutText && (
              <p className="text-[13px] opacity-85 leading-relaxed">{footerConfig.aboutText}</p>
            )}

            {footerConfig.showWhatsappRow && (
              <p className="text-[13px] sm:text-sm opacity-85 leading-relaxed">
                {footerConfig.whatsappLabel ? `${footerConfig.whatsappLabel} ` : ''}
                {footerConfig.whatsappUrl ? (
                  <a
                    href={footerConfig.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: footerConfig.footerTextColor }}
                  >
                    {footerConfig.whatsappLinkText}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setInfoModal({
                        title: 'WhatsApp Support',
                        content: `Reach our support desk directly on WhatsApp or call ${settings?.phone || '01799576210'} (${settings?.openingHours || '10:00 AM - 10:00 PM'}). Pickup & Studio Address: ${settings?.address || 'Tilapara, Ekuria, Dhaka Jute Mills'}.`,
                      })
                    }
                    className="font-medium hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ color: footerConfig.footerTextColor }}
                  >
                    {footerConfig.whatsappLinkText}
                  </button>
                )}
              </p>
            )}

            {footerConfig.showShopNowCta && (
              <div>
                <button
                  type="button"
                  onClick={scrollToCatalog}
                  className="inline-flex items-center gap-1 text-[13px] sm:text-sm font-semibold hover:opacity-80 cursor-pointer"
                  style={{ color: footerConfig.footerTextColor }}
                >
                  <span>{footerConfig.shopNowLabel}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Social Media Icons */}
            {footerConfig.showSocialLinks && activeSocialItems.length > 0 && (
              <div className="pt-1.5 space-y-2">
                {footerConfig.socialHeading && (
                  <h3 className="font-brand text-lg font-semibold">
                    {footerConfig.socialHeading}
                  </h3>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {activeSocialItems.map((soc) => (
                    <a
                      key={soc.key}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={soc.label}
                      title={soc.label}
                      className="w-9 h-9 rounded-full border border-current/25 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      style={{ color: footerConfig.footerTextColor }}
                    >
                      {soc.icon}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Help Links */}
          <div>
            <h3 className="font-brand text-lg font-semibold mb-3.5">
              {footerConfig.helpColumnTitle}
            </h3>
            <ul className="space-y-2.5 text-[13px] sm:text-sm opacity-85">
              {footerConfig.helpLinks.map((item) => (
                <li key={item.id}>
                  {item.action === 'url' && item.value ? (
                    <a
                      href={item.value}
                      target={item.value.startsWith('http') ? '_blank' : undefined}
                      rel={item.value.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="hover:opacity-100 font-medium hover:underline"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFooterLinkAction(item)}
                      className="hover:opacity-100 font-medium cursor-pointer text-left"
                    >
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company Links */}
          <div>
            <h3 className="font-brand text-lg font-semibold mb-3.5">
              {footerConfig.companyColumnTitle}
            </h3>
            <ul className="space-y-2.5 text-[13px] sm:text-sm opacity-85">
              {footerConfig.companyLinks.map((item) => (
                <li key={item.id}>
                  {item.action === 'url' && item.value ? (
                    <a
                      href={item.value}
                      target={item.value.startsWith('http') ? '_blank' : undefined}
                      rel={item.value.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="hover:opacity-100 font-medium hover:underline"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFooterLinkAction(item)}
                      className="hover:opacity-100 font-medium cursor-pointer text-left"
                    >
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          {footerConfig.showNewsletter && (
            <div>
              <h3 className="font-brand text-lg font-semibold mb-2.5">
                {footerConfig.newsletterTitle}
              </h3>
              <p className="text-[13px] sm:text-sm font-normal opacity-80 leading-relaxed mb-3.5">
                {footerConfig.newsletterDescription}
              </p>
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex items-center border border-current/30 rounded-lg p-1 bg-[#FFFDF8] focus-within:border-current"
              >
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={footerConfig.newsletterPlaceholder}
                  className="flex-1 min-w-0 px-2.5 py-2 text-[13px] text-[#2B1416] placeholder:text-[#8E6F70] bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-md bg-[#650108] text-[#F2E8D2] text-[13px] font-semibold inline-flex items-center gap-1 hover:bg-[#4A0106] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{footerConfig.newsletterButtonText}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </form>
              {newsletterMsg && <p className="text-xs mt-1.5">{newsletterMsg}</p>}
            </div>
          )}
        </div>

        {/* Scroll to top + Copyright */}
        {footerConfig.showScrollToTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
            className="hidden sm:flex absolute right-6 bottom-12 w-9 h-9 rounded-full border border-[#F2E8D2]/30 bg-[#F2E8D2] shadow-xs items-center justify-center text-[#650108] hover:bg-white cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 pb-8">
          <div className="border-t border-current/20 pt-6 text-center text-[13px] opacity-80">
            {footerConfig.copyrightText}
          </div>
        </div>
      </footer>

      {/* Persistent Slide-Out Shopping Bag Drawer */}
      <CartDrawer
        shippingInsideDhaka={settings?.shippingInsideDhaka}
        shippingOutsideDhaka={settings?.shippingOutsideDhaka}
        freeShippingThreshold={settings?.freeShippingThreshold}
        deliveryZone={deliveryArea}
        onDeliveryZoneChange={setDeliveryArea}
        onProceedToCheckout={navigateCheckout}
        onEditItem={(productId) => {
          const found = products.find((p) => p.id === productId);
          if (found) {
            navigateProduct(found);
          }
        }}
      />

      <ProductQuickViewModal
        product={quickViewProduct}
        isWishlisted={quickViewProduct ? wishlist.includes(quickViewProduct.id) : false}
        takePreOrders={settings?.takePreOrders}
        shippingInsideDhaka={settings?.shippingInsideDhaka}
        shippingOutsideDhaka={settings?.shippingOutsideDhaka}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={(product, model, qty, meta) => {
          addToCart(product, model, qty, meta);
          setQuickViewProduct(null);
        }}
        onToggleWishlist={toggleWishlist}
        onOpenFullDetails={(product) => {
          setQuickViewProduct(null);
          navigateProduct(product);
        }}
      />

      {/* Mobile Slide-Out Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/45"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="relative z-10 w-[84vw] max-w-[340px] bg-[#FAF4E6] h-full flex flex-col shadow-2xl overflow-y-auto"
          >
            {/* Drawer Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  resetAllFilters();
                  navigateHome(true);
                }}
                className="font-brand text-2xl font-semibold tracking-tight text-[#650108] text-left"
              >
                {settings?.logoUrl && !logoImgFailed ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.storeName || 'Classy Cases'}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoImgFailed(true)}
                    className="h-8 w-auto max-w-[170px] object-contain"
                  />
                ) : (
                  settings?.storeName || 'Classy Cases'
                )}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 -mr-2 rounded-lg text-[#650108] hover:bg-[#650108]/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-6 flex-1 flex flex-col">
              {/* Mobile Drawer Search Box */}
              {headerConfig.showSearchBar && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    scrollToCatalog();
                  }}
                  className="mt-1 mb-3 flex items-center gap-2.5 bg-[#FFFDF8] border border-[#DFCFB0] rounded-xl px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-[#650108]"
                >
                  <Search className="w-4 h-4 text-[#650108]/70 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={headerConfig.searchPlaceholder || 'Search for products...'}
                    className="w-full bg-transparent text-sm text-[#2B1416] placeholder:text-[#8E6F70] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      aria-label="Clear search"
                      className="text-[#8E6F70] hover:text-[#650108]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>
              )}

              {/* Hairline Navigation List */}
              <nav aria-label="Store categories" className="divide-y divide-[#E4D5B7]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    resetAllFilters();
                    navigateHome(true);
                  }}
                  className="w-full text-left py-3.5 text-[15px] font-medium text-[#2B1416] hover:text-[#650108] cursor-pointer"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    applyCategorySelection('All');
                    setViewAll(true);
                    scrollToCatalog();
                  }}
                  className="w-full text-left py-3.5 text-[15px] font-medium text-[#2B1416] hover:text-[#650108] cursor-pointer"
                >
                  Shop
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    applyCategorySelection('All');
                    scrollToCatalog();
                  }}
                  className="w-full text-left py-3.5 text-[15px] font-medium text-[#2B1416] hover:text-[#650108] cursor-pointer"
                >
                  All categories
                </button>
                {topLevelCategories.map((cat) => {
                  const subCategories = getSubcategories(effectiveCategories, cat.id);
                  const hasSubs = subCategories.length > 0;
                  const isBranchActive = activeCategoryRoot?.id === cat.id;
                  const isExactActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                  const isExpanded = expandedDrawerCatIds[cat.id] ?? isBranchActive;

                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigateHome();
                            applyCategorySelection(cat.name);
                            setTimeout(() => {
                              document
                                .getElementById('new-arrivals-section')
                                ?.scrollIntoView({ behavior: 'smooth' });
                            }, 40);
                          }}
                          className={`flex-1 text-left py-3.5 text-[15px] transition-colors cursor-pointer ${
                            isExactActive || isBranchActive
                              ? 'font-semibold text-[#650108]'
                              : 'font-medium text-[#2B1416] hover:text-[#650108]'
                          }`}
                        >
                          {cat.name}
                        </button>

                        {hasSubs && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDrawerCatIds((prev) => ({
                                ...prev,
                                [cat.id]: !isExpanded,
                              }))
                            }
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${cat.name} sub-categories`}
                            className="p-2 -mr-1 rounded-lg text-[#6B4C4E] hover:text-[#650108] hover:bg-[#650108]/10 transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-150 ${
                                isExpanded ? 'rotate-180 text-[#650108]' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {hasSubs && isExpanded && (
                        <div className="pl-3 pb-2.5 ml-1.5 border-l border-[#DFCFB0] space-y-0.5">
                          {subCategories.map((sub) => {
                            const subActive =
                              selectedCategory.toLowerCase() === sub.name.toLowerCase();
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                  navigateHome();
                                  applyCategorySelection(sub.name);
                                  setTimeout(() => {
                                    document
                                      .getElementById('new-arrivals-section')
                                      ?.scrollIntoView({ behavior: 'smooth' });
                                  }, 40);
                                }}
                                className={`w-full text-left py-2 px-2.5 rounded-lg text-[13.5px] transition-colors cursor-pointer ${
                                  subActive
                                    ? 'font-semibold text-[#650108] bg-[#650108]/8'
                                    : 'font-normal text-[#5A2D30] hover:text-[#650108] hover:bg-[#EADEC2]/50'
                                }`}
                              >
                                {sub.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {headerConfig.navLinks.map((link) =>
                  link.action === 'url' && link.url ? (
                    <a
                      key={link.id}
                      href={link.url}
                      target={link.url.startsWith('http') ? '_blank' : undefined}
                      rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-left py-3.5 text-[15px] font-medium text-[#2B1416] hover:text-[#650108]"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleHeaderNavAction(link);
                      }}
                      className="w-full text-left py-3.5 text-[15px] font-medium text-[#2B1416] hover:text-[#650108] cursor-pointer"
                    >
                      {link.label}
                    </button>
                  )
                )}
              </nav>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2.5">
                <div className={`grid gap-2.5 ${headerConfig.showFavoritesButton ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {headerConfig.showFavoritesButton && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setWishlistOpen(true);
                      }}
                      className="bg-[#EADEC2] hover:bg-[#DFCFB0] rounded-xl py-3 px-3 text-[13px] font-semibold text-[#650108] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 stroke-[1.75] ${wishlistProducts.length > 0 ? 'fill-[#650108] text-[#650108]' : ''}`} />
                      <span>My Favorites{wishlistProducts.length > 0 ? ` (${wishlistProducts.length})` : ''}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setInfoModal({
                        title: 'Contact Us',
                        content: `Phone: ${settings?.phone || '01799576210'} | Email: ${settings?.email || 'mdebrahim.contact@gmail.com'} | Address: ${settings?.address || 'Tilapara, Ekuria, Dhaka Jute Mills'}`,
                      });
                    }}
                    className="bg-[#EADEC2] hover:bg-[#DFCFB0] rounded-xl py-3 px-3 text-[13px] font-semibold text-[#650108] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4 stroke-[1.75]" />
                    <span>Contact Us</span>
                  </button>
                </div>

                {headerConfig.showMyOrdersButton && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openMyOrders();
                    }}
                    className="w-full bg-[#650108] hover:bg-[#4D0106] rounded-xl py-3 px-4 text-[13px] font-semibold text-[#F2E8D2] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Package className="w-4 h-4 stroke-[1.75]" />
                    <span>{headerConfig.myOrdersLabel || 'Track order'}</span>
                  </button>
                )}
              </div>

              {/* WhatsApp Support Link */}
              <div className="mt-5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setInfoModal({
                      title: 'WhatsApp Support',
                      content: `Message or call us on WhatsApp at ${settings?.phone || '01799576210'} (${settings?.openingHours || '10:00 AM - 10:00 PM'}) for instant case compatibility checks and order assistance.`,
                    });
                  }}
                  className="inline-flex items-center gap-2 text-[14px] font-medium text-[#650108] hover:text-[#4A0106] cursor-pointer"
                >
                  <MessageCircle className="w-4.5 h-4.5 stroke-[1.9] shrink-0" />
                  <span>Need help? Chat on WhatsApp</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* My Favorites Drawer */}
      {wishlistOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex justify-end">
          <div
            className="fixed inset-0"
            onClick={() => setWishlistOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="My Favorites"
            className="relative z-10 bg-[#FAF4E6] w-full max-w-md h-full flex flex-col shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-[#DFCFB0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 fill-[#650108] text-[#650108]" />
                <h2 className="font-brand text-lg font-semibold text-[#650108]">
                  My Favorites ({wishlistProducts.length})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {wishlistProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFavorites}
                    className="text-xs font-medium text-[#6B4C4E] hover:text-[#650108] cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setWishlistOpen(false)}
                  aria-label="Close My Favorites"
                  className="p-1.5 rounded-lg text-[#650108] hover:bg-[#650108]/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {wishlistProducts.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#EADEC2] text-[#650108] flex items-center justify-center mx-auto">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-[#650108]">
                    Your My Favorites list is empty
                  </div>
                  <p className="text-xs text-[#6B4C4E] max-w-xs mx-auto leading-relaxed">
                    Tap the heart icon on any phone case to save your favorites here across visits.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setWishlistOpen(false);
                      scrollToCatalog();
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] cursor-pointer"
                  >
                    Browse Cases
                  </button>
                </div>
              ) : (
                wishlistProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 pb-4 border-b border-[#DFCFB0]">
                    <button
                      type="button"
                      onClick={() => {
                        setWishlistOpen(false);
                        navigateProduct(p);
                      }}
                      className="shrink-0 cursor-pointer"
                    >
                      <img
                        src={p.image}
                        alt={p.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-lg object-cover border border-[#DFCFB0] bg-white"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          setWishlistOpen(false);
                          navigateProduct(p);
                        }}
                        className="text-left text-sm font-medium text-[#2B1416] line-clamp-2 hover:text-[#650108] cursor-pointer"
                      >
                        {p.title}
                      </button>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#6B4C4E] tabular-nums">
                        <span className="font-bold text-[#650108] text-sm">{formatTaka(p.price)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{p.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          addToCart(p);
                          setWishlistOpen(false);
                          openDrawer();
                        }}
                        className="px-3 py-2 rounded-lg bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] cursor-pointer"
                      >
                        Add to bag
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleWishlist(p.id)}
                        aria-label={`Remove ${p.title} from My Favorites`}
                        title="Remove from My Favorites"
                        className="p-2 rounded-lg text-[#6B4C4E] hover:text-[#650108] hover:bg-[#650108]/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {wishlistProducts.length > 0 && (
              <div className="p-5 border-t border-[#DFCFB0] bg-[#F2E8D2]/70">
                <button
                  type="button"
                  onClick={addAllFavoritesToBag}
                  className="w-full py-3 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106] transition-colors cursor-pointer"
                >
                  Add All Favorites to Bag ({wishlistProducts.length})
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Simple Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF4E6] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DFCFB0] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-brand text-xl font-semibold text-[#650108]">{infoModal.title}</h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="p-1 text-[#6B4C4E] hover:text-[#650108]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#2B1416] leading-relaxed">{infoModal.content}</p>
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106]"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
