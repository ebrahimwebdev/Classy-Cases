import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Heart,
  LayoutDashboard,
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
import type { Category, OrderItem, Product } from '../types';
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
import { CustomerReviewsCarousel } from './CustomerReviewsCarousel';
import { FeaturedCategoriesSlider } from './FeaturedCategoriesSlider';
import { TrustedBySection } from './TrustedBySection';
import { usePersistedProducts } from '../hooks/usePersistedProducts';
import { applyDocumentFavicon } from '../utils/branding';

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
  paymentGateways: {
    bkash: { enabled: boolean; mode: string };
    nagad: { enabled: boolean; mode: string };
    card: { enabled: boolean; provider: string; mode: string };
    cod: { enabled: boolean };
  };
}

interface StorefrontProps {
  onOpenAdmin: () => void;
}

export function Storefront({ onOpenAdmin }: StorefrontProps) {
  const [settings, setSettings] = useState<PublicStoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [infoModal, setInfoModal] = useState<{ title: string; content: string } | null>(null);

  // Active sub-views
  const [activeProduct, setActiveProduct] = useState<PhoneCaseProduct | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<PhoneCaseProduct | null>(null);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);
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
      setSettings(data.settings);
      setLogoImgFailed(false);
      setFailedCatImages({});
      setCategories(data.categories || []);
      syncWithServerCatalog(
        (data.products || []) as Product[],
        Boolean(data.catalogModified)
      );
    } catch {
      // ignore transient error; localStorage products remain available
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStorefront();
  }, []);

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

  function openMyOrders() {
    setCheckoutOpen(false);
    setActiveProduct(null);
    setMyOrdersOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase() ||
        (p.alsoShowIn || []).some((c) => c.toLowerCase() === selectedCategory.toLowerCase());
      return matchesCategory && matchesPhoneCaseSearch(p, searchQuery);
    });
  }, [products, selectedCategory, searchQuery]);

  const searchSuggestions = useMemo(
    () => extractSearchSuggestions(products, searchQuery, 8),
    [products, searchQuery]
  );

  function handleSearchChange(nextQuery: string) {
    setSearchQuery(nextQuery);
    setCarouselPage(0);
    if (nextQuery.trim() !== '') {
      setCheckoutOpen(false);
      setActiveProduct(null);
      setMyOrdersOpen(false);
    }
  }

  function handleQuickSelectCategory(categoryName: string) {
    setCheckoutOpen(false);
    setActiveProduct(null);
    setMyOrdersOpen(false);
    setSelectedCategory(categoryName);
    setCarouselPage(0);
    setTimeout(() => {
      document.getElementById('new-arrivals-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 30);
  }

  function scrollToCatalog() {
    setCheckoutOpen(false);
    setActiveProduct(null);
    setMyOrdersOpen(false);
    setTimeout(() => {
      const el = document.getElementById('new-arrivals-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 30);
  }

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(carouselPage, totalPages - 1);
  const displayedProducts =
    viewAll || selectedCategory !== 'All' || searchQuery.trim() !== ''
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
      <header className="bg-[#FAF4E6] border-b border-[#DFCFB0] relative z-30">
        <div className="sticky top-0 z-30 bg-[#FAF4E6] border-b border-[#E6D9BE] md:border-b-0">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 min-h-14 sm:min-h-[76px] py-2 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-8">
            {/* Zone 1: Mobile Menu Icon + Brand Wordmark */}
            <div className="flex items-center gap-1.5 sm:gap-0 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                className="md:hidden w-8 h-8 -ml-1.5 rounded-lg text-[#650108] hover:bg-[#650108]/10 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
              >
                <Menu className="w-[18px] h-[18px] stroke-[1.75]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setCheckoutOpen(false);
                  setActiveProduct(null);
                  setMyOrdersOpen(false);
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setViewAll(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="font-brand text-xl sm:text-[26px] font-black tracking-tight text-[#650108] whitespace-nowrap shrink-0 cursor-pointer flex items-center"
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
            </div>

          {/* Zone 2: Search Bar */}
          <div className="hidden md:block flex-1 max-w-xl">
            <StorefrontSearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onSubmitSearch={scrollToCatalog}
              onSelectProduct={(productId) => {
                const found = products.find((p) => p.id === productId);
                if (found) {
                  setCheckoutOpen(false);
                  setMyOrdersOpen(false);
                  setActiveProduct(found);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              onSelectCategory={handleQuickSelectCategory}
              suggestions={searchSuggestions}
              placeholder="Search products by name, description, or model..."
            />
          </div>

          {/* Zone 3: Utility Actions + Admin Portal */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openMyOrders}
              title="My Orders & Tracking"
              className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-auto lg:px-2.5 rounded-lg transition-colors relative inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold cursor-pointer ${
                myOrdersOpen
                  ? 'bg-[#650108] text-[#F2E8D2]'
                  : 'text-[#650108] hover:bg-[#650108]/10'
              }`}
              aria-label="My Orders"
            >
              <Package className="w-[18px] h-[18px] stroke-[1.75] shrink-0" />
              <span className="hidden lg:inline">My Orders</span>
              {hasSavedOrders && !myOrdersOpen && (
                <span className="absolute top-1 right-1 lg:static w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setWishlistOpen(true)}
              title="My Favorites"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-[#650108] hover:bg-[#650108]/10 transition-colors relative inline-flex items-center justify-center cursor-pointer"
              aria-label="Open My Favorites"
            >
              <Heart
                className={`w-[18px] h-[18px] stroke-[1.75] shrink-0 ${
                  wishlistProducts.length > 0 ? 'fill-[#650108] text-[#650108]' : ''
                }`}
              />
              {wishlistProducts.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#650108] text-[#F2E8D2] text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {wishlistProducts.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openDrawer}
              title="Shopping Bag"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-[#650108] hover:bg-[#650108]/10 transition-colors relative inline-flex items-center justify-center cursor-pointer"
              aria-label="Open shopping bag"
            >
              <ShoppingBag className="w-[18px] h-[18px] stroke-[1.75] shrink-0" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#650108] text-[#F2E8D2] text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenAdmin}
              title="Store Admin"
              aria-label="Open Store Admin"
              className="ml-1 w-8 h-8 sm:w-auto sm:h-9 sm:px-3 rounded-lg border border-[#650108]/35 text-[13px] font-semibold text-[#650108] hover:bg-[#650108] hover:text-[#F2E8D2] hover:border-[#650108] transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="w-[17px] h-[17px] stroke-[1.75] shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
          </div>
        </div>

        {/* Mobile search row */}
        <div className="md:hidden px-4 pt-2.5 pb-3.5 bg-[#FAF4E6]">
          <StorefrontSearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onSubmitSearch={scrollToCatalog}
            onSelectProduct={(productId) => {
              const found = products.find((p) => p.id === productId);
              if (found) {
                setCheckoutOpen(false);
                setMyOrdersOpen(false);
                setActiveProduct(found);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            onSelectCategory={handleQuickSelectCategory}
            suggestions={searchSuggestions}
            placeholder="Search by name or description..."
            compact
          />
        </div>

        {/* Solid Maroon Category Strip */}
        <nav className="bg-[#650108] text-[#F2E8D2] border-t border-[#4D0106]">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 h-11 flex items-center justify-start sm:justify-center gap-5 sm:gap-8 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setCheckoutOpen(false);
                setActiveProduct(null);
                setMyOrdersOpen(false);
                setSelectedCategory('All');
                setCarouselPage(0);
              }}
              className={`text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === 'All' && !myOrdersOpen && !checkoutOpen ? 'text-[#FFFFFF] font-semibold' : 'text-[#F2E8D2]/80 hover:text-white'
              }`}
            >
              All categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCheckoutOpen(false);
                  setActiveProduct(null);
                  setMyOrdersOpen(false);
                  setSelectedCategory(cat.name);
                  setCarouselPage(0);
                  setTimeout(() => {
                    document.getElementById('new-arrivals-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 30);
                }}
                className={`text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  !myOrdersOpen && !checkoutOpen && selectedCategory.toLowerCase() === cat.name.toLowerCase()
                    ? 'text-[#FFFFFF] font-semibold'
                    : 'text-[#F2E8D2]/80 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {checkoutOpen && settings ? (
          <CheckoutModal
            isOpen={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
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
                setCheckoutOpen(false);
                setMyOrdersOpen(false);
                setActiveProduct(found);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          />
        ) : myOrdersOpen ? (
          <MyOrdersSection
            products={products}
            onBackToShop={() => {
              setMyOrdersOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
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
            onBack={() => setActiveProduct(null)}
            onSelectProduct={(product) => {
              setActiveProduct(product);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onToggleWishlist={toggleWishlist}
            onAddToCart={(product, model, qty = 1, meta) => {
              addToCart(product, model, qty, meta);
              openDrawer();
            }}
            onBuyNow={(product, model, qty = 1, meta) => {
              addToCart(product, model, qty, meta);
              setCheckoutOpen(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenWhatsAppHelp={() =>
              setInfoModal({
                title: 'WhatsApp Case Fit Help',
                content: `Message or call our team at ${settings?.phone || '01799576210'} (${settings?.openingHours || '10:00 AM - 10:00 PM'}) for instant confirmation on camera cutouts and model compatibility for "${activeProduct.title}".`,
              })
            }
            onShareToast={showToast}
          />
        ) : (
          <>
            {/* Featured Categories (collapsed during active top search so filtered results appear right away) */}
            {searchQuery.trim() === '' && (
              <FeaturedCategoriesSlider
                categories={categories}
                selectedCategory={selectedCategory}
                failedCatImages={failedCatImages}
                onImageError={(catId) =>
                  setFailedCatImages((prev) => ({ ...prev, [catId]: true }))
                }
                onSelectCategory={(categoryName) => {
                  setSelectedCategory(categoryName);
                  setCarouselPage(0);
                  document
                    .getElementById('new-arrivals-section')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            )}

            {/* New Arrivals / Catalog Grid */}
            <section id="new-arrivals-section" className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-6 pb-16">
              <div className="flex flex-wrap items-end justify-between mb-5 gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#650108] tracking-tight">
                    {searchQuery.trim() !== ''
                      ? selectedCategory === 'All'
                        ? `Results for "${searchQuery.trim()}"`
                        : `${selectedCategory} Cases matching "${searchQuery.trim()}"`
                      : selectedCategory === 'All'
                        ? 'New Arrivals'
                        : `${selectedCategory} Cases`}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="w-10 h-[3px] bg-[#650108]" />
                    {(searchQuery.trim() !== '' || selectedCategory !== 'All') && (
                      <span className="text-xs text-[#6B4C4E] tabular-nums">
                        {filteredProducts.length} {filteredProducts.length === 1 ? 'case' : 'cases'} found
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {selectedCategory !== 'All' && searchQuery.trim() !== '' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      className="text-[13px] font-medium text-[#650108]/80 hover:text-[#650108] underline underline-offset-4 whitespace-nowrap cursor-pointer"
                    >
                      Search all brands
                    </button>
                  )}
                  {(selectedCategory !== 'All' || searchQuery.trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('All');
                        setSearchQuery('');
                        setViewAll(false);
                      }}
                      className="text-[13px] font-medium text-[#6B4C4E] hover:text-[#650108] whitespace-nowrap cursor-pointer"
                    >
                      Reset filter
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewAll((v) => !v)}
                    className="text-xs font-semibold tracking-wider uppercase text-[#650108] underline underline-offset-4 inline-flex items-center gap-1.5 hover:opacity-75 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{viewAll ? 'SHOW CAROUSEL' : 'VIEW ALL ITEMS'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Real-time Name & Category Filter Toolbar */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div
                  role="tablist"
                  aria-label="Filter products by category"
                  className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#E4D5B7] overflow-x-auto no-scrollbar max-w-full"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === 'All'}
                    onClick={() => {
                      setSelectedCategory('All');
                      setCarouselPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      selectedCategory === 'All'
                        ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                        : 'text-[#5A2D30] hover:text-[#650108]'
                    }`}
                  >
                    All ({products.length})
                  </button>
                  {categories.map((cat) => {
                    const catActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                    const catCount = products.filter(
                      (p) =>
                        p.category.toLowerCase() === cat.name.toLowerCase() ||
                        (p.alsoShowIn || []).some((c) => c.toLowerCase() === cat.name.toLowerCase())
                    ).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        aria-selected={catActive}
                        onClick={() => {
                          setSelectedCategory(catActive ? 'All' : cat.name);
                          setCarouselPage(0);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors tabular-nums cursor-pointer ${
                          catActive
                            ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                            : 'text-[#5A2D30] hover:text-[#650108]'
                        }`}
                      >
                        {cat.name} ({catCount})
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#650108]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Filter by product name, description, or category..."
                    aria-label="Filter catalog products in real time"
                    className="w-full pl-9 pr-8 py-2 text-xs bg-[#FFFDF8] border border-[#DFCFB0] rounded-xl text-[#2B1416] placeholder:text-[#8E6F70] focus:outline-none focus:border-[#650108] transition-colors [&::-webkit-search-cancel-button]:hidden"
                  />
                  {searchQuery.trim() !== '' && (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      aria-label="Clear filter"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E6F70] hover:text-[#650108] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <PhoneCaseGrid
                products={displayedProducts}
                loading={loading}
                wishlist={wishlist}
                searchQuery={searchQuery}
                showCarouselControls={!viewAll && selectedCategory === 'All' && searchQuery.trim() === ''}
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCarouselPage}
                onSelectProduct={(product) => {
                  setActiveProduct(product);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onQuickView={(product) => setQuickViewProduct(product)}
                onToggleWishlist={toggleWishlist}
                onAddToCart={(product) => addToCart(product)}
                onResetFilters={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
              />
            </section>

            {/* Customer Reviews Carousel */}
            {settings?.reviewsEnabled !== false && (
              <CustomerReviewsCarousel
                onSelectProduct={(productId) => {
                  const found = products.find((p) => p.id === productId);
                  if (found) {
                    setActiveProduct(found);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              />
            )}

            {/* Trusted By Partner Marquee & Testimonials */}
            <TrustedBySection />
          </>
        )}
      </main>

      {/* Footer in Deep Maroon & Cream */}
      <footer className="border-t border-[#4D0106] bg-[#650108] text-[#F2E8D2] relative">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Column 1 */}
          <div className="space-y-3">
            <div className="font-brand text-2xl font-black text-[#F2E8D2]">
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
            <p className="text-[13px] sm:text-sm text-[#F2E8D2]/80 leading-relaxed">
              WhatsApp:{' '}
              <button
                type="button"
                onClick={() =>
                  setInfoModal({
                    title: 'WhatsApp Support',
                    content: `Reach our support desk directly on WhatsApp or call ${settings?.phone || '01799576210'} (${settings?.openingHours || '10:00 AM - 10:00 PM'}). Pickup & Studio Address: ${settings?.address || 'Tilapara, Ekuria, Dhaka Jute Mills'}.`,
                  })
                }
                className="text-[#F2E8D2] font-medium hover:underline"
              >
                Chat with us ({settings?.phone || '01799576210'})
              </button>
            </p>
            <button
              type="button"
              onClick={scrollToCatalog}
              className="inline-flex items-center gap-1 text-[13px] sm:text-sm font-semibold text-[#F2E8D2] underline underline-offset-4 hover:opacity-80"
            >
              <span>Shop now</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Column 2: Help */}
          <div>
            <h3 className="text-base font-semibold text-[#F2E8D2] mb-3.5">Help</h3>
            <ul className="space-y-2.5 text-[13px] sm:text-sm text-[#F2E8D2]/80">
              <li>
                <button type="button" onClick={openMyOrders} className="hover:text-white font-medium text-[#F2E8D2]">
                  My Orders &amp; Tracking
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModal({
                      title: 'Shipping & Delivery',
                      content: `Inside Dhaka delivery is ৳${settings?.shippingInsideDhaka ?? 60} (24–48 hours). Outside Dhaka courier delivery is ৳${settings?.shippingOutsideDhaka ?? 120} (2–4 business days). Free shipping on orders over ৳${settings?.freeShippingThreshold ?? 1500}.`,
                    })
                  }
                  className="hover:text-white"
                >
                  Shipping
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModal({
                      title: 'Returns & Exchanges',
                      content:
                        '7-day hassle-free exchange if the case does not fit your phone model or arrives damaged. Contact us with your Order Number to arrange a replacement.',
                    })
                  }
                  className="hover:text-white"
                >
                  Returns & Exchanges
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModal({
                      title: 'Contact Us',
                      content: `Phone: ${settings?.phone || '01799576210'} | Email: ${settings?.email || 'mdebrahim.contact@gmail.com'} | Address: ${settings?.address || 'Tilapara, Ekuria, Dhaka Jute Mills'}`,
                    })
                  }
                  className="hover:text-white"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModal({
                      title: 'Frequently Asked Questions',
                      content:
                        'We accept bKash, Nagad, Visa/Mastercard (SSLCommerz), and Cash on Delivery nationwide. Every order receives an instant tracking number.',
                    })
                  }
                  className="hover:text-white"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="text-base font-semibold text-[#F2E8D2] mb-3.5">Company</h3>
            <ul className="space-y-2.5 text-[13px] sm:text-sm text-[#F2E8D2]/80">
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModal({
                      title: 'About Classy Cases',
                      content:
                        settings?.tagline ||
                        'Premium phone cases, made to fit "Your Perfect Case". Everyday protection. Effortless style.',
                    })
                  }
                  className="hover:text-white"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModal({
                      title: 'Privacy Policy',
                      content:
                        'Your phone number, delivery address, and payment verification details are encrypted and used strictly for order fulfillment and courier tracking.',
                    })
                  }
                  className="hover:text-white"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModal({
                      title: 'Terms & Conditions',
                      content:
                        'All prices are in Bangladeshi Taka (৳). Online payments via bKash, Nagad, and Card are verified instantly prior to dispatch.',
                    })
                  }
                  className="hover:text-white"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenAdmin} className="hover:text-white font-medium text-[#F2E8D2]">
                  Store Admin Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h3 className="text-base font-semibold text-[#F2E8D2] mb-2.5">Newsletter</h3>
            <p className="text-[13px] sm:text-sm text-[#F2E8D2]/80 leading-relaxed mb-3.5">
              Subscribe for new arrivals, offers and updates. No spam — unsubscribe any time.
            </p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex items-center border border-[#F2E8D2]/30 rounded-lg p-1 bg-[#FFFDF8] focus-within:border-[#F2E8D2]"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 min-w-0 px-2.5 py-2 text-[13px] text-[#2B1416] placeholder:text-[#8E6F70] bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-md bg-[#650108] text-[#F2E8D2] text-[13px] font-medium inline-flex items-center gap-1 hover:bg-[#4A0106] whitespace-nowrap shrink-0"
              >
                <span>Subscribe</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </form>
            {newsletterMsg && <p className="text-xs text-[#F2E8D2] mt-1.5">{newsletterMsg}</p>}
          </div>
        </div>

        {/* Scroll to top + Copyright */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className="hidden sm:flex absolute right-6 bottom-12 w-9 h-9 rounded-full border border-[#F2E8D2]/30 bg-[#F2E8D2] shadow-xs items-center justify-center text-[#650108] hover:bg-white"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 pb-8">
          <div className="border-t border-[#F2E8D2]/20 pt-6 text-center text-[13px] text-[#F2E8D2]/75">
            © 2026 {settings?.storeName || 'Classy Cases'}. All Rights Reserved
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
        onProceedToCheckout={() => {
          setMyOrdersOpen(false);
          setActiveProduct(null);
          setCheckoutOpen(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onEditItem={(productId) => {
          const found = products.find((p) => p.id === productId);
          if (found) {
            setCheckoutOpen(false);
            setMyOrdersOpen(false);
            setActiveProduct(found);
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
          setActiveProduct(product);
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
                  setCheckoutOpen(false);
                  setActiveProduct(null);
                  setMyOrdersOpen(false);
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setViewAll(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="font-brand text-2xl font-black tracking-tight text-[#650108] text-left"
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
                  placeholder="Search for products..."
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

              {/* Hairline Navigation List */}
              <nav aria-label="Store categories" className="divide-y divide-[#E4D5B7]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCheckoutOpen(false);
                    setActiveProduct(null);
                    setMyOrdersOpen(false);
                    setSelectedCategory('All');
                    setSearchQuery('');
                    setViewAll(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full text-left py-3.5 text-[15px] font-medium text-[#2B1416] hover:text-[#650108] cursor-pointer"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSelectedCategory('All');
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
                    setSelectedCategory('All');
                    setCarouselPage(0);
                    scrollToCatalog();
                  }}
                  className="w-full text-left py-3.5 text-[15px] font-medium text-[#2B1416] hover:text-[#650108] cursor-pointer"
                >
                  All categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCheckoutOpen(false);
                      setActiveProduct(null);
                      setMyOrdersOpen(false);
                      setSelectedCategory(cat.name);
                      setCarouselPage(0);
                      setTimeout(() => {
                        document
                          .getElementById('new-arrivals-section')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }, 40);
                    }}
                    className="w-full text-left py-3.5 text-[15px] font-medium text-[#2B1416] hover:text-[#650108] cursor-pointer"
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
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

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openMyOrders();
                  }}
                  className="w-full bg-[#650108] hover:bg-[#4D0106] rounded-xl py-3 px-4 text-[13px] font-semibold text-[#F2E8D2] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4 stroke-[1.75]" />
                  <span>Track order</span>
                </button>
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
                  <span className="underline underline-offset-4">Need help? Chat on WhatsApp</span>
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
                <h2 className="text-base font-bold text-[#650108]">
                  My Favorites ({wishlistProducts.length})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {wishlistProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFavorites}
                    className="text-xs font-medium text-[#6B4C4E] hover:text-[#650108] underline underline-offset-4 cursor-pointer"
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
                        setCheckoutOpen(false);
                        setMyOrdersOpen(false);
                        setActiveProduct(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                          setCheckoutOpen(false);
                          setMyOrdersOpen(false);
                          setActiveProduct(p);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-left text-sm font-semibold text-[#2B1416] line-clamp-2 hover:text-[#650108] cursor-pointer"
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
              <h3 className="text-lg font-bold text-[#650108]">{infoModal.title}</h3>
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
