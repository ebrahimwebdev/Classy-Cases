import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Heart,
  LayoutDashboard,
  Package,
  ShoppingBag,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import {
  extractSearchSuggestions,
  matchesPhoneCaseSearch,
  normalizePhoneCaseProduct,
  type PhoneCaseProduct,
} from '../models/phoneCase';
import type { Category, OrderItem, Product } from '../types';
import { CustomBrandLogo, MotorolaLogo, VivoLogo, XiaomiLogo } from './BrandLogos';
import { CartDrawer } from './CartDrawer';
import { CheckoutModal } from './CheckoutModal';
import {
  getSavedCustomerOrderTokens,
  MyOrdersSection,
  saveCustomerOrderToken,
} from './MyOrdersSection';
import { PhoneCaseGrid } from './PhoneCaseGrid';
import { ProductDetailView } from './ProductDetailView';
import { StorefrontSearchBar } from './StorefrontSearchBar';
import { TrustedBySection } from './TrustedBySection';

export interface PublicStoreSettings {
  storeName: string;
  tagline: string;
  orderPrefix: string;
  takePreOrders: boolean;
  phone: string;
  email: string;
  address: string;
  openingHours: string;
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
  freeShippingThreshold: number;
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
  const [products, setProducts] = useState<PhoneCaseProduct[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [infoModal, setInfoModal] = useState<{ title: string; content: string } | null>(null);

  // Active sub-views
  const [activeProduct, setActiveProduct] = useState<PhoneCaseProduct | null>(null);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);
  const [hasSavedOrders, setHasSavedOrders] = useState(() => getSavedCustomerOrderTokens().length > 0);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  async function fetchStorefront() {
    try {
      const res = await fetch('/api/storefront');
      const data = await res.json();
      setSettings(data.settings);
      setCategories(data.categories || []);
      setProducts(((data.products || []) as Product[]).map(normalizePhoneCaseProduct));
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStorefront();
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 2600);
  }

  function openMyOrders() {
    setActiveProduct(null);
    setMyOrdersOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesCategory && matchesPhoneCaseSearch(p, searchQuery);
  });

  const searchSuggestions = extractSearchSuggestions(products, searchQuery, 6);

  function handleSearchChange(nextQuery: string) {
    setSearchQuery(nextQuery);
    setCarouselPage(0);
    if (nextQuery.trim() !== '') {
      setActiveProduct(null);
      setMyOrdersOpen(false);
    }
  }

  function scrollToCatalog() {
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

  function addToCart(product: Product, model?: string, qty = 1) {
    addItem(product, model, qty);
    showToast(`Added "${product.title.slice(0, 28)}..." to bag`);
  }

  function toggleWishlist(productId: string) {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
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
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 overflow-x-clip">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 z-50 bg-neutral-950 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="bg-white border-b border-neutral-200 relative z-30">
        <div className="sticky top-0 z-30 bg-white border-b border-neutral-100 md:border-b-0">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
            {/* Zone 1: Brand Wordmark */}
            <button
              type="button"
              onClick={() => {
                setActiveProduct(null);
                setMyOrdersOpen(false);
                setSelectedCategory('All');
                setSearchQuery('');
                setViewAll(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="font-brand text-xl sm:text-[26px] font-black tracking-tight text-black whitespace-nowrap shrink-0 cursor-pointer"
            >
              {settings?.storeName || 'Classy Cases'}
            </button>

          {/* Zone 2: Search Bar */}
          <div className="hidden md:block flex-1 max-w-xl">
            <StorefrontSearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onSubmitSearch={scrollToCatalog}
              suggestions={searchSuggestions}
              placeholder="Search by case model or brand (e.g. Motorola, Redmi Note 13)..."
            />
          </div>

          {/* Zone 3: Utility Actions + Admin Portal */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openMyOrders}
              title="My Orders & Tracking"
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg transition-colors relative inline-flex items-center gap-1.5 text-xs font-semibold ${
                myOrdersOpen
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-800 hover:bg-neutral-100'
              }`}
              aria-label="My Orders"
            >
              <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[1.75]" />
              <span className="hidden lg:inline">My Orders</span>
              {hasSavedOrders && !myOrdersOpen && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setWishlistOpen(true)}
              title="Wishlist"
              className="p-2 rounded-lg text-neutral-800 hover:bg-neutral-100 transition-colors relative"
              aria-label="Open wishlist"
            >
              <Heart className="w-5 h-5 stroke-[1.75]" />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openDrawer}
              title="Shopping Bag"
              className="p-2 rounded-lg text-neutral-800 hover:bg-neutral-100 transition-colors relative"
              aria-label="Open shopping bag"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenAdmin}
              className="ml-0.5 sm:ml-1 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors whitespace-nowrap shrink-0"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
          </div>
        </div>

        {/* Mobile search row */}
        <div className="md:hidden px-4 py-2.5 bg-white">
          <StorefrontSearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onSubmitSearch={scrollToCatalog}
            suggestions={searchSuggestions}
            placeholder="Search case model or brand..."
            compact
          />
        </div>

        {/* Solid Black Category Strip */}
        <nav className="bg-[#0a0a0a] text-white border-t border-neutral-900">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 h-10 flex items-center justify-start sm:justify-center gap-5 sm:gap-8 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setActiveProduct(null);
                setMyOrdersOpen(false);
                setSelectedCategory('All');
                setCarouselPage(0);
              }}
              className={`text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === 'All' && !myOrdersOpen ? 'text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveProduct(null);
                  setMyOrdersOpen(false);
                  setSelectedCategory(cat.name);
                  setCarouselPage(0);
                  setTimeout(() => {
                    document.getElementById('new-arrivals-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 30);
                }}
                className={`text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  !myOrdersOpen && selectedCategory.toLowerCase() === cat.name.toLowerCase()
                    ? 'text-white font-semibold underline underline-offset-4'
                    : 'text-neutral-300 hover:text-white'
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
        {myOrdersOpen ? (
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
            onAddToCart={(product, model, qty = 1) => {
              addToCart(product, model, qty);
              openDrawer();
            }}
            onBuyNow={(product, model, qty = 1) => {
              addToCart(product, model, qty);
              setCheckoutOpen(true);
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
            {/* Featured Categories */}
            <section className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-6 sm:pb-8">
              <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 text-center mb-5 sm:mb-7 tracking-tight">
                Featured Categories
              </h2>

              <div className="grid grid-cols-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center gap-3 sm:gap-5 max-w-md sm:max-w-none mx-auto">
                {categories.map((cat) => {
                  const isActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(isActive ? 'All' : cat.name);
                        setCarouselPage(0);
                        document.getElementById('new-arrivals-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="group flex flex-col items-center focus:outline-none w-full sm:w-auto"
                    >
                      <div
                        className={`w-full aspect-square max-w-[112px] sm:w-32 sm:h-32 sm:max-w-none rounded-2xl border bg-white flex items-center justify-center transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md p-2 ${
                          isActive ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'
                        }`}
                      >
                        <div className="scale-[0.78] sm:scale-100">
                          {cat.brandKey === 'motorola' && <MotorolaLogo />}
                          {cat.brandKey === 'vivo' && <VivoLogo />}
                          {cat.brandKey === 'xiaomi' && <XiaomiLogo />}
                          {cat.brandKey === 'custom' && <CustomBrandLogo name={cat.name} />}
                        </div>
                      </div>
                      <span className="mt-2 sm:mt-2.5 text-xs font-semibold text-neutral-900">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* New Arrivals / Catalog Grid */}
            <section id="new-arrivals-section" className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-6 pb-16">
              <div className="flex flex-wrap items-end justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                    {searchQuery.trim() !== ''
                      ? selectedCategory === 'All'
                        ? `Results for "${searchQuery.trim()}"`
                        : `${selectedCategory} Cases matching "${searchQuery.trim()}"`
                      : selectedCategory === 'All'
                        ? 'New Arrivals'
                        : `${selectedCategory} Cases`}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="w-10 h-[3px] bg-neutral-950" />
                    {searchQuery.trim() !== '' && (
                      <span className="text-xs text-neutral-500 tabular-nums">
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
                      className="text-xs font-medium text-neutral-700 hover:text-neutral-950 underline underline-offset-4 whitespace-nowrap"
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
                      className="text-xs font-medium text-neutral-500 hover:text-neutral-900 whitespace-nowrap"
                    >
                      Reset filter
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewAll((v) => !v)}
                    className="text-[11px] font-semibold tracking-wider uppercase text-neutral-900 underline underline-offset-4 inline-flex items-center gap-1.5 hover:opacity-75 whitespace-nowrap shrink-0"
                  >
                    <span>{viewAll ? 'SHOW CAROUSEL' : 'VIEW ALL ITEMS'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
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
                onToggleWishlist={toggleWishlist}
                onAddToCart={(product) => addToCart(product)}
                onResetFilters={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
              />
            </section>

            {/* Trusted By Partner Marquee & Testimonials */}
            <TrustedBySection />
          </>
        )}
      </main>

      {/* Footer matching Screenshot 1 */}
      <footer className="border-t border-neutral-200 bg-white relative">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Column 1 */}
          <div className="space-y-3">
            <div className="font-brand text-2xl font-black text-black">
              {settings?.storeName || 'Classy Cases'}
            </div>
            <p className="text-xs text-neutral-600">
              WhatsApp:{' '}
              <button
                type="button"
                onClick={() =>
                  setInfoModal({
                    title: 'WhatsApp Support',
                    content: `Reach our support desk directly on WhatsApp or call ${settings?.phone || '01799576210'} (${settings?.openingHours || '10:00 AM - 10:00 PM'}). Pickup & Studio Address: ${settings?.address || 'Tilapara, Ekuria, Dhaka Jute Mills'}.`,
                  })
                }
                className="text-neutral-900 font-medium hover:underline"
              >
                Chat with us ({settings?.phone || '01799576210'})
              </button>
            </p>
            <button
              type="button"
              onClick={scrollToCatalog}
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 underline underline-offset-4 hover:opacity-75"
            >
              <span>Shop now</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Column 2: Help */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Help</h3>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li>
                <button type="button" onClick={openMyOrders} className="hover:text-neutral-950 font-medium text-neutral-800">
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
                  className="hover:text-neutral-950"
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
                  className="hover:text-neutral-950"
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
                  className="hover:text-neutral-950"
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
                  className="hover:text-neutral-950"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Company</h3>
            <ul className="space-y-2 text-xs text-neutral-600">
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
                  className="hover:text-neutral-950"
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
                  className="hover:text-neutral-950"
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
                  className="hover:text-neutral-950"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenAdmin} className="hover:text-neutral-950 font-medium">
                  Store Admin Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Newsletter</h3>
            <p className="text-xs text-neutral-600 leading-relaxed mb-3">
              Subscribe for new arrivals, offers and updates. No spam — unsubscribe any time.
            </p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex items-center border border-neutral-200 rounded-lg p-1 bg-white focus-within:border-neutral-400"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-neutral-950 text-white text-xs font-medium inline-flex items-center gap-1 hover:bg-neutral-800 whitespace-nowrap shrink-0"
              >
                <span>Subscribe</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </form>
            {newsletterMsg && <p className="text-[11px] text-neutral-600 mt-1.5">{newsletterMsg}</p>}
          </div>
        </div>

        {/* Scroll to top + Copyright */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className="hidden sm:flex absolute right-6 bottom-12 w-9 h-9 rounded-full border border-neutral-200 bg-white shadow-xs items-center justify-center text-neutral-700 hover:bg-neutral-50"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 pb-8">
          <div className="border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500">
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
        onProceedToCheckout={() => setCheckoutOpen(true)}
      />

      {/* Wishlist Drawer */}
      {wishlistOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                <h2 className="text-base font-bold">Saved Items ({wishlistProducts.length})</h2>
              </div>
              <button
                type="button"
                onClick={() => setWishlistOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {wishlistProducts.length === 0 ? (
                <div className="text-center py-16 text-sm text-neutral-500">
                  Tap the heart icon on any case to save it here.
                </div>
              ) : (
                wishlistProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 pb-4 border-b border-neutral-100">
                    <img
                      src={p.image}
                      alt={p.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover border border-neutral-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 line-clamp-2">{p.title}</p>
                      <p className="text-xs font-bold mt-1 tabular-nums">৳{p.price}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(p);
                        setWishlistOpen(false);
                        openDrawer();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-950 text-white text-xs font-semibold shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Simple Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">{infoModal.title}</h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="p-1 text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">{infoModal.content}</p>
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-950 text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {settings && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          cart={cart}
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
        />
      )}
    </div>
  );
}
