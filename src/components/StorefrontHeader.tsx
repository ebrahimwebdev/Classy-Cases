import React, { useEffect, useMemo, useState } from 'react';
import {
  Gift,
  Heart,
  Home,
  LayoutGrid,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Store,
  User,
  X,
} from 'lucide-react';
import type {
  Category,
  HeaderConfigSettings,
  MobileBottomBarItemId,
} from '../types';
import type { PhoneCaseProduct, SearchSuggestion } from '../models/phoneCase';
import { StorefrontSearchBar } from './StorefrontSearchBar';
import { getTopLevelCategories } from '../utils/categoryTree';

export function resolveHeaderCategories(
  allCategories: Category[],
  headerConfig: HeaderConfigSettings
): Category[] {
  const top = getTopLevelCategories(allCategories);
  const pickedSet = new Set(headerConfig.pickedCategoryIds || []);

  switch (headerConfig.menuCategoryMode) {
    case 'featured':
      return top.filter((c) => c.featured !== false);
    case 'featured_plus_picks': {
      const result: Category[] = [];
      const seen = new Set<string>();
      for (const c of top) {
        if (c.featured !== false || pickedSet.has(c.id)) {
          seen.add(c.id);
          result.push(c);
        }
      }
      for (const c of allCategories) {
        if (!seen.has(c.id) && pickedSet.has(c.id)) {
          seen.add(c.id);
          result.push(c);
        }
      }
      return result;
    }
    case 'only_picks': {
      if (pickedSet.size === 0) return [];
      return allCategories.filter((c) => pickedSet.has(c.id));
    }
    case 'all':
    default:
      return top;
  }
}

interface StorefrontHeaderProps {
  headerConfig: HeaderConfigSettings;
  storeName: string;
  logoUrl?: string;
  logoImgFailed: boolean;
  onLogoError: () => void;
  phone: string;
  categories: Category[];
  selectedCategory: string;
  products: PhoneCaseProduct[];
  searchQuery: string;
  searchSuggestions: SearchSuggestion[];
  wishlistCount: number;
  cartCount: number;
  hasSavedOrders: boolean;
  myOrdersOpen: boolean;
  isHomeBannerVisible: boolean;
  onSearchChange: (q: string) => void;
  onSubmitSearch: () => void;
  onSelectProduct: (productId: string) => void;
  onSelectCategory: (categoryName: string) => void;
  onNavigateHome: () => void;
  onOpenMyOrders: () => void;
  onOpenWishlist: () => void;
  onOpenCart: () => void;
  onOpenMobileMenu: () => void;
  onOpenOffers: () => void;
  onOpenWhatsApp: () => void;
  whatsappHref?: string;
}

export function StorefrontHeader({
  headerConfig,
  storeName,
  logoUrl,
  logoImgFailed,
  onLogoError,
  categories,
  selectedCategory,
  searchQuery,
  searchSuggestions,
  wishlistCount,
  cartCount,
  hasSavedOrders,
  myOrdersOpen,
  isHomeBannerVisible,
  onSearchChange,
  onSubmitSearch,
  onSelectProduct,
  onSelectCategory,
  onNavigateHome,
  onOpenMyOrders,
  onOpenWishlist,
  onOpenCart,
  onOpenMobileMenu,
  onOpenOffers,
  onOpenWhatsApp,
  whatsappHref,
}: StorefrontHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [classicSearchOpen, setClassicSearchOpen] = useState(false);
  const [topBarIndex, setTopBarIndex] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const validTopBarMessages = useMemo(
    () => (headerConfig.topBarMessages || []).map((m) => m.trim()).filter(Boolean),
    [headerConfig.topBarMessages]
  );

  useEffect(() => {
    if (validTopBarMessages.length <= 1) return;
    const id = window.setInterval(() => {
      setTopBarIndex((i) => (i + 1) % validTopBarMessages.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [validTopBarMessages.length]);

  const menuCategories = useMemo(
    () => resolveHeaderCategories(categories, headerConfig),
    [categories, headerConfig]
  );

  const isOverlayActive =
    headerConfig.headerStyle === 'overlay' && isHomeBannerVisible && !scrolled;

  const isOneRow = headerConfig.headerStyle === 'one-row';
  const isTwoRow = headerConfig.headerStyle === 'two-row';
  const hasCenterSearchBar = isOneRow || isTwoRow;
  const showTopBar = headerConfig.topBarEnabled && validTopBarMessages.length > 0;

  const headerTextColor = isOverlayActive ? '#FFFFFF' : headerConfig.headerTextColor;
  const headerBgStyle = isOverlayActive
    ? 'linear-gradient(180deg, rgba(20,6,8,0.68) 0%, rgba(20,6,8,0.28) 70%, rgba(20,6,8,0) 100%)'
    : undefined;

  const headerPositionClass =
    headerConfig.headerStyle === 'overlay' && isHomeBannerVisible
      ? 'fixed top-0 inset-x-0 z-30 transition-colors duration-200'
      : `${headerConfig.stickyHeader ? 'sticky top-0' : 'relative'} z-30 transition-colors duration-200`;

  return (
    <header
      className={headerPositionClass}
      style={{
        backgroundColor: isOverlayActive ? 'transparent' : headerConfig.headerBgColor,
        backgroundImage: headerBgStyle,
        color: headerTextColor,
      }}
    >
      {/* Top Announcement Bar */}
      {showTopBar && (
        <div
          className={`${
            headerConfig.topBarShowOnMobile ? 'block' : 'hidden md:block'
          } px-4 py-1.5 text-center text-xs font-medium tracking-wide`}
          style={{
            backgroundColor: headerConfig.topBarBgColor,
            color: headerConfig.topBarTextColor,
          }}
        >
          {validTopBarMessages[topBarIndex % validTopBarMessages.length]}
        </div>
      )}

      {/* Main Header Row */}
      <div
        className={
          isOverlayActive
            ? 'border-b border-white/15'
            : 'border-b border-[#E6D9BE]'
        }
      >
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 min-h-14 sm:min-h-[70px] py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-5">
          {/* Left: Mobile Menu + Brand Wordmark (+ Inline Menu for Classic / Overlay) */}
          <div className="flex items-center gap-2 sm:gap-5 min-w-0">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open menu"
              className="md:hidden w-8 h-8 -ml-1.5 rounded-lg hover:bg-black/5 transition-colors shrink-0 inline-flex items-center justify-center cursor-pointer"
              style={{ color: headerTextColor }}
            >
              <Menu className="w-[22px] h-[22px] stroke-[1.8]" />
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="font-brand text-xl sm:text-[26px] font-semibold tracking-tight whitespace-nowrap shrink-0 cursor-pointer flex items-center"
              style={{ color: headerTextColor }}
            >
              {logoUrl && !logoImgFailed ? (
                <img
                  src={logoUrl}
                  alt={storeName || 'Classy Cases'}
                  referrerPolicy="no-referrer"
                  onError={onLogoError}
                  className="h-8 sm:h-10 w-auto max-w-[165px] sm:max-w-[180px] object-contain"
                />
              ) : (
                storeName || 'Classy Cases'
              )}
            </button>

            {/* Classic & Overlay inline category menu */}
            {!hasCenterSearchBar && menuCategories.length > 0 && (
              <nav
                aria-label="Header categories"
                className="hidden md:flex items-center gap-4 lg:gap-5 text-[13.5px] font-medium ml-2 overflow-x-auto no-scrollbar"
              >
                <button
                  type="button"
                  onClick={() => onSelectCategory('All')}
                  className={`whitespace-nowrap transition-opacity cursor-pointer ${
                    selectedCategory === 'All' ? 'font-bold underline underline-offset-4' : 'hover:opacity-75'
                  }`}
                  style={{ color: headerTextColor }}
                >
                  All Cases
                </button>
                {menuCategories.slice(0, 7).map((cat) => {
                  const active = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onSelectCategory(cat.name)}
                      className={`whitespace-nowrap transition-opacity cursor-pointer ${
                        active ? 'font-bold underline underline-offset-4' : 'hover:opacity-75'
                      }`}
                      style={{ color: headerTextColor }}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Center: Big Search Bar for One-Row & Two-Row styles */}
          {hasCenterSearchBar && headerConfig.showSearchIcon && (
            <div className="hidden md:block flex-1 max-w-xl">
              <StorefrontSearchBar
                value={searchQuery}
                onChange={onSearchChange}
                onSubmitSearch={onSubmitSearch}
                onSelectProduct={onSelectProduct}
                onSelectCategory={onSelectCategory}
                suggestions={searchSuggestions}
                placeholder={headerConfig.searchPlaceholder}
              />
            </div>
          )}

          {/* Right: Utility Action Icons */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            {!hasCenterSearchBar && headerConfig.showSearchIcon && (
              <button
                type="button"
                onClick={() => setClassicSearchOpen((v) => !v)}
                title="Search cases"
                aria-label="Toggle search"
                className="hidden md:inline-flex w-9 h-9 rounded-lg hover:bg-black/5 transition-colors items-center justify-center cursor-pointer"
                style={{ color: headerTextColor }}
              >
                {classicSearchOpen ? (
                  <X className="w-[20px] h-[20px] stroke-[1.8]" />
                ) : (
                  <Search className="w-[20px] h-[20px] stroke-[1.8]" />
                )}
              </button>
            )}

            {headerConfig.showOffersIcon && (
              <button
                type="button"
                onClick={onOpenOffers}
                title="Offers & Deals"
                aria-label="Offers & Deals"
                className="w-8 h-8 sm:w-9 sm:h-9 lg:w-auto lg:px-2.5 rounded-lg hover:bg-black/5 transition-colors inline-flex items-center justify-center gap-1.5 text-[13px] font-medium cursor-pointer"
                style={{ color: headerTextColor }}
              >
                <Gift className="w-[20px] h-[20px] stroke-[1.8] shrink-0" />
                <span className="hidden lg:inline">Offers</span>
              </button>
            )}

            {headerConfig.showTrackOrderIcon && (
              <button
                type="button"
                onClick={onOpenMyOrders}
                title={headerConfig.myOrdersLabel || 'Track order'}
                className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-auto lg:px-2.5 rounded-lg transition-colors relative inline-flex items-center justify-center gap-1.5 text-[13px] font-medium cursor-pointer ${
                  myOrdersOpen ? 'bg-[#650108] text-[#F2E8D2]' : 'hover:bg-black/5'
                }`}
                style={myOrdersOpen ? undefined : { color: headerTextColor }}
                aria-label={headerConfig.myOrdersLabel || 'Track order'}
              >
                <Package className="w-[20px] h-[20px] sm:w-[21px] sm:h-[21px] stroke-[1.8] shrink-0" />
                <span className="hidden lg:inline">{headerConfig.myOrdersLabel || 'Track order'}</span>
                {hasSavedOrders && !myOrdersOpen && (
                  <span className="absolute top-0.5 right-0.5 lg:static w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            )}

            {headerConfig.showWishlistIcon && (
              <button
                type="button"
                onClick={onOpenWishlist}
                title="Wishlist"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-black/5 transition-colors relative inline-flex items-center justify-center cursor-pointer"
                style={{ color: headerTextColor }}
                aria-label="Open Wishlist"
              >
                <Heart
                  className={`w-[20px] h-[20px] sm:w-[21px] sm:h-[21px] stroke-[1.8] shrink-0 ${
                    wishlistCount > 0 ? 'fill-current' : ''
                  }`}
                />
                {wishlistCount > 0 && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-[#650108] text-[#F2E8D2] text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            {headerConfig.showCartIcon && (
              <button
                type="button"
                onClick={onOpenCart}
                title="Cart"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-black/5 transition-colors relative inline-flex items-center justify-center cursor-pointer"
                style={{ color: headerTextColor }}
                aria-label="Open cart"
              >
                <ShoppingBag className="w-[20px] h-[20px] sm:w-[21px] sm:h-[21px] stroke-[1.8] shrink-0" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-[#650108] text-[#F2E8D2] text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Classic / Overlay expandable desktop search */}
        {!hasCenterSearchBar && classicSearchOpen && headerConfig.showSearchIcon && (
          <div
            className="hidden md:block border-t border-black/10 px-4 sm:px-8 py-2.5"
            style={{ backgroundColor: headerConfig.headerBgColor, color: headerConfig.headerTextColor }}
          >
            <div className="max-w-xl mx-auto">
              <StorefrontSearchBar
                value={searchQuery}
                onChange={onSearchChange}
                onSubmitSearch={() => {
                  setClassicSearchOpen(false);
                  onSubmitSearch();
                }}
                onSelectProduct={(id) => {
                  setClassicSearchOpen(false);
                  onSelectProduct(id);
                }}
                onSelectCategory={(cat) => {
                  setClassicSearchOpen(false);
                  onSelectCategory(cat);
                }}
                suggestions={searchSuggestions}
                placeholder={headerConfig.searchPlaceholder}
                compact
              />
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Two-row Category Bar */}
      {isTwoRow && (
        <div
          className="hidden md:block border-b border-[#E6D9BE]/80"
          style={{ backgroundColor: headerConfig.headerBgColor }}
        >
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-2 flex items-center justify-between gap-4">
            <nav
              aria-label="Category bar"
              className="flex items-center gap-2 lg:gap-3 overflow-x-auto no-scrollbar"
            >
              <button
                type="button"
                onClick={() => onSelectCategory('All')}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-[#650108] text-[#F2E8D2]'
                    : 'hover:bg-black/5'
                }`}
                style={selectedCategory === 'All' ? undefined : { color: headerConfig.headerTextColor }}
              >
                All Categories
              </button>
              {menuCategories.map((cat) => {
                const active = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectCategory(cat.name)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#650108] text-[#F2E8D2] font-semibold'
                        : 'hover:bg-black/5'
                    }`}
                    style={active ? undefined : { color: headerConfig.headerTextColor }}
                  >
                    {headerConfig.categoryPicturesInBar && cat.image && (
                      <img
                        src={cat.image}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover shrink-0 border border-black/10"
                      />
                    )}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </nav>

            {headerConfig.whatsappInCategoryBar && (
              whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onOpenWhatsApp}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Mobile Search Row */}
      {headerConfig.showSearchIcon && (
        <div
          className={`md:hidden px-4 pt-2.5 pb-3 ${
            isOverlayActive ? 'bg-black/25 backdrop-blur-xs' : 'border-b border-[#E6D9BE]'
          }`}
          style={isOverlayActive ? undefined : { backgroundColor: headerConfig.headerBgColor }}
        >
          <StorefrontSearchBar
            value={searchQuery}
            onChange={onSearchChange}
            onSubmitSearch={onSubmitSearch}
            onSelectProduct={onSelectProduct}
            onSelectCategory={onSelectCategory}
            suggestions={searchSuggestions}
            placeholder={headerConfig.searchPlaceholder}
            compact
          />
        </div>
      )}
    </header>
  );
}

interface MobileBottomBarProps {
  headerConfig: HeaderConfigSettings;
  wishlistCount: number;
  cartCount: number;
  activeTab?: MobileBottomBarItemId;
  whatsappHref?: string;
  onAction: (id: MobileBottomBarItemId) => void;
}

export function StorefrontMobileBottomBar({
  headerConfig,
  wishlistCount,
  cartCount,
  activeTab = 'home',
  whatsappHref,
  onAction,
}: MobileBottomBarProps) {
  if (headerConfig.mobileBottomBarStyle === 'off') return null;

  const activeItems = headerConfig.mobileBottomBarItems
    .filter((item) => item.enabled)
    .slice(0, 5);
  if (activeItems.length === 0) return null;

  const renderIcon = (id: MobileBottomBarItemId, isCenter = false) => {
    const cls = isCenter ? 'w-5 h-5' : 'w-4.5 h-4.5';
    switch (id) {
      case 'home':
        return <Home className={cls} />;
      case 'offers':
        return <Gift className={cls} />;
      case 'wishlist':
        return <Heart className={cls} />;
      case 'cart':
        return <ShoppingBag className={cls} />;
      case 'categories':
        return <LayoutGrid className={cls} />;
      case 'shop':
        return <Store className={cls} />;
      case 'search':
        return <Search className={cls} />;
      case 'account':
        return <User className={cls} />;
      case 'whatsapp':
        return <MessageCircle className={cls} />;
    }
  };

  const isFloating = headerConfig.mobileBottomBarStyle === 'floating';
  const isCenterBtn = headerConfig.mobileBottomBarStyle === 'center-button';
  const midIdx = Math.floor(activeItems.length / 2);

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className={`md:hidden fixed z-40 ${
        isFloating
          ? 'bottom-3 inset-x-3 rounded-2xl border border-[#DFCFB0] bg-[#FAF4E6]/95 backdrop-blur-md shadow-xl px-2 py-1.5'
          : 'bottom-0 inset-x-0 border-t border-[#DFCFB0] bg-[#FAF4E6]/95 backdrop-blur-md shadow-[0_-4px_18px_rgba(43,20,22,0.08)] px-1 py-1.5'
      }`}
    >
      <div
        className="grid items-end"
        style={{ gridTemplateColumns: `repeat(${activeItems.length}, minmax(0, 1fr))` }}
      >
        {activeItems.map((item, idx) => {
          const isCenter = isCenterBtn && idx === midIdx;
          const isActive = activeTab === item.id;
          const badge =
            item.id === 'cart'
              ? cartCount
              : item.id === 'wishlist'
                ? wishlistCount
                : 0;

          if (isCenter) {
            const centerInner = (
              <>
                <span className="relative w-12 h-12 rounded-full bg-[#650108] text-[#F2E8D2] shadow-lg flex items-center justify-center ring-4 ring-[#FAF4E6]">
                  {renderIcon(item.id, true)}
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#F2E8D2] text-[#650108] text-[9px] font-bold flex items-center justify-center tabular-nums">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold text-[#650108] mt-1 truncate max-w-full">
                  {item.label}
                </span>
              </>
            );
            if (item.id === 'whatsapp' && whatsappHref) {
              return (
                <a
                  key={item.id}
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat on WhatsApp"
                  className="flex flex-col items-center justify-center -mt-5 cursor-pointer"
                >
                  {centerInner}
                </a>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onAction(item.id)}
                className="flex flex-col items-center justify-center -mt-5 cursor-pointer"
              >
                {centerInner}
              </button>
            );
          }

          const tabInner = (
            <>
              <span className="relative">
                {renderIcon(item.id)}
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-3.5 h-3.5 px-1 rounded-full bg-[#650108] text-[#F2E8D2] text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] mt-0.5 truncate max-w-full">{item.label}</span>
            </>
          );

          if (item.id === 'whatsapp' && whatsappHref) {
            return (
              <a
                key={item.id}
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
                  isActive ? 'text-[#650108] font-semibold' : 'text-[#6B4C4E] hover:text-[#650108]'
                }`}
              >
                {tabInner}
              </a>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAction(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-[#650108] font-semibold' : 'text-[#6B4C4E] hover:text-[#650108]'
              }`}
            >
              {tabInner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
