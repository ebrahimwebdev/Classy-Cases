import React, { useMemo, useState } from 'react';
import {
  ArrowUp,
  Gift,
  Heart,
  Home,
  Info,
  LayoutGrid,
  Mail,
  Menu,
  MessageCircle,
  Monitor,
  Package,
  Phone,
  RotateCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  User,
} from 'lucide-react';
import type {
  Category,
  FooterConfigSettings,
  HeaderConfigSettings,
  MobileBottomBarItemId,
  StoreSettings,
} from '../types';
import { resolveHeaderCategories } from './StorefrontHeader';

interface AdminLivePreviewPaneProps {
  form: StoreSettings;
  hc: HeaderConfigSettings;
  fc: FooterConfigSettings;
  categories: Category[];
  focusArea: 'header' | 'footer';
  onOpenStorefront: () => void;
}

export function AdminLivePreviewPane({
  form,
  hc,
  fc,
  categories,
  focusArea,
  onOpenStorefront,
}: AdminLivePreviewPaneProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [refreshTick, setRefreshTick] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const previewCategories = useMemo(
    () => resolveHeaderCategories(categories, hc),
    [categories, hc]
  );

  const validMessages = (hc.topBarMessages || []).map((m) => m.trim()).filter(Boolean);
  const showTopBar = hc.topBarEnabled && validMessages.length > 0;
  const activeMobileItems = hc.mobileBottomBarItems.filter((i) => i.enabled).slice(0, 5);
  const enabledBlocks = (fc.blocks || []).filter((b) => b.enabled);
  const hasBlock = (t: string) => enabledBlocks.some((b) => b.type === t);

  const design = fc.footerDesign || 'classic';
  const isDarkFooter = design === 'dark' || design === 'boxed';
  const isWhiteFooter = design === 'columns';
  const isCompactFooter = design === 'compact';

  const footerBg = isDarkFooter
    ? '#111115'
    : isWhiteFooter
      ? '#FFFFFF'
      : fc.footerBgColor || '#650108';
  const footerText = isDarkFooter
    ? '#F1F5F9'
    : isWhiteFooter
      ? '#1E293B'
      : fc.footerTextColor || '#F2E8D2';
  const activeSocialCount = Object.values(fc.socialLinks || {}).filter((u) => u && u.trim()).length;
  const customFooterLogo = fc.footerLogoUrl?.trim() || '';
  const resolvedFooterLogo = customFooterLogo || form.logoUrl?.trim() || '';
  const useFooterLogoBackdrop =
    fc.footerLogoBackdrop !== undefined
      ? fc.footerLogoBackdrop
      : !customFooterLogo && !isWhiteFooter;

  const renderFooterLogoMark = (size: 'desktop' | 'mobile') => {
    if (!fc.showBrandLogo) return null;
    if (resolvedFooterLogo) {
      return (
        <img
          src={resolvedFooterLogo}
          alt={form.storeName || 'Classy Cases'}
          referrerPolicy="no-referrer"
          className={`${
            size === 'desktop' ? 'h-5 max-w-[100px]' : 'h-4 max-w-[85px]'
          } w-auto object-contain ${
            useFooterLogoBackdrop ? 'bg-[#F2E8D2] px-1.5 py-0.5 rounded' : 'rounded'
          }`}
        />
      );
    }
    return (
      <div className={`font-brand ${size === 'desktop' ? 'text-xs' : 'text-[10px]'} font-bold`}>
        {form.storeName || 'Classy Cases'}
      </div>
    );
  };

  const renderMobileNavIcon = (id: MobileBottomBarItemId) => {
    const cls = 'w-3.5 h-3.5';
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

  const handleRefresh = () => {
    setSpinning(true);
    setRefreshTick((t) => t + 1);
    window.setTimeout(() => setSpinning(false), 350);
  };

  return (
    <div className="lg:sticky lg:top-20 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Live preview</span>
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <div className="ml-2 inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              title="Desktop preview"
              className={`p-1 rounded-md transition-colors ${
                device === 'desktop'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              title="Mobile preview"
              className={`p-1 rounded-md transition-colors ${
                device === 'mobile'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh preview"
            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded"
          >
            <RotateCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Preview Frame */}
      <div
        key={refreshTick}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col items-center"
      >
        {device === 'desktop' ? (
          <div className="w-full">
            <div className="rounded-xl border-[6px] border-slate-900 bg-white overflow-hidden shadow-md">
              {/* Top Bar */}
              {showTopBar && (
                <div
                  className="px-3 py-1 text-center text-[9px] font-medium truncate"
                  style={{ backgroundColor: hc.topBarBgColor, color: hc.topBarTextColor }}
                >
                  {validMessages[0]}
                </div>
              )}

              {/* Header */}
              <div
                className={`px-3 py-2 border-b ${
                  hc.headerStyle === 'overlay'
                    ? 'bg-slate-900/85 text-white border-white/15'
                    : 'border-black/10'
                }`}
                style={
                  hc.headerStyle === 'overlay'
                    ? undefined
                    : {
                        backgroundColor: hc.headerBgColor || '#FAF4E6',
                        color: hc.headerTextColor || '#650108',
                      }
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-brand text-xs font-bold truncate">
                      {form.storeName || 'Classy Cases'}
                    </span>
                    {hc.headerStyle !== 'two-row' && hc.headerStyle !== 'one-row' && (
                      <div className="flex items-center gap-2 text-[8.5px] opacity-80 truncate">
                        <span>All</span>
                        {previewCategories.slice(0, 3).map((c) => (
                          <span key={c.id}>{c.name}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {(hc.headerStyle === 'two-row' || hc.headerStyle === 'one-row') && hc.showSearchIcon && (
                    <div className="flex-1 max-w-[170px] bg-white/80 border border-black/10 rounded-md px-2 py-0.5 flex items-center gap-1 text-[8px] text-slate-500">
                      <Search className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{hc.searchPlaceholder || 'Search products...'}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hc.headerStyle !== 'two-row' && hc.headerStyle !== 'one-row' && hc.showSearchIcon && (
                      <Search className="w-3 h-3" />
                    )}
                    {hc.showOffersIcon && <Gift className="w-3 h-3" />}
                    {hc.showTrackOrderIcon && <Package className="w-3 h-3" />}
                    {hc.showWishlistIcon && <Heart className="w-3 h-3" />}
                    {hc.showAccountIcon !== false && <User className="w-3 h-3" />}
                    {hc.showCartIcon && <ShoppingBag className="w-3 h-3" />}
                  </div>
                </div>

                {hc.headerStyle === 'two-row' && (
                  <div className="mt-1.5 pt-1.5 border-t border-current/15 flex items-center justify-between gap-2 text-[8.5px]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-semibold">All</span>
                      {previewCategories.slice(0, 4).map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 whitespace-nowrap opacity-90">
                          {hc.categoryPicturesInBar && (
                            c.image ? (
                              <img src={c.image} alt="" className="w-2.5 h-2.5 rounded-full object-cover" />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full bg-current/15 inline-flex items-center justify-center text-[6px] font-bold">
                                {c.name.slice(0, 1).toUpperCase()}
                              </span>
                            )
                          )}
                          <span>{c.name}</span>
                        </span>
                      ))}
                    </div>
                    {hc.whatsappInCategoryBar && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[7.5px] font-semibold">
                        WhatsApp
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Middle body preview */}
              {focusArea === 'header' ? (
                <div className="bg-slate-50 px-4 py-6 text-center space-y-2 border-b border-slate-200">
                  <div className="text-[11px] font-bold text-slate-900">
                    {form.storeName || 'Classy Cases'} Storefront
                  </div>
                  <div className="text-[8.5px] text-slate-500 max-w-[240px] mx-auto">
                    {form.tagline || 'Everyday protection. Effortless style.'}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <span className="px-2.5 py-1 rounded bg-slate-900 text-white text-[8px] font-semibold">
                      Browse products
                    </span>
                    <span className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 text-[8px] font-semibold">
                      Track order
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 px-4 py-3 text-center border-b border-slate-200">
                  <div className="max-w-[200px] mx-auto bg-white border border-slate-200 rounded px-2 py-1 flex items-center justify-between text-[8px] text-slate-400">
                    <span>Search products...</span>
                    <Search className="w-2.5 h-2.5" />
                  </div>
                </div>
              )}

              {/* Footer Preview */}
              <div
                className="px-4 py-4 text-[8.5px]"
                style={{ backgroundColor: footerBg, color: footerText }}
              >
                {design === 'contact-strip' && (
                  <div className="grid grid-cols-3 gap-1.5 mb-3 pb-2 border-b border-current/15">
                    <div className="p-1.5 rounded border border-current/15 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      <span className="truncate font-semibold">Call</span>
                    </div>
                    <div className="p-1.5 rounded border border-current/15 flex items-center gap-1">
                      <MessageCircle className="w-2.5 h-2.5" />
                      <span className="truncate font-semibold">WhatsApp</span>
                    </div>
                    <div className="p-1.5 rounded border border-current/15 flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5" />
                      <span className="truncate font-semibold">Email</span>
                    </div>
                  </div>
                )}

                {design === 'dark' && hasBlock('newsletter') && (
                  <div className="mb-3 pb-2 border-b border-white/15 flex items-center justify-between gap-2">
                    <span className="font-semibold">{fc.newsletterTitle}</span>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[7.5px]">Email...</span>
                      <span className="px-2 py-0.5 rounded bg-white text-slate-900 text-[7.5px] font-semibold">
                        {fc.newsletterButtonText}
                      </span>
                    </div>
                  </div>
                )}

                {isCompactFooter ? (
                  <div className="text-center space-y-1.5">
                    {hasBlock('about') && (
                      <div className="flex justify-center">{renderFooterLogoMark('desktop')}</div>
                    )}
                    <div className="flex items-center justify-center gap-2 opacity-75 text-[8px]">
                      {hasBlock('help') && <span>Help Links</span>}
                      {hasBlock('company') && <span>Company Links</span>}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`grid gap-3 ${
                      design === 'boxed' ? 'grid-cols-3' : 'grid-cols-4'
                    }`}
                  >
                    {(hasBlock('about') || hasBlock('contact') || hasBlock('social')) && (
                      <div
                        className={`space-y-1 ${
                          design === 'boxed' ? 'p-2 rounded border border-white/15 bg-white/5' : ''
                        }`}
                      >
                        {hasBlock('about') && renderFooterLogoMark('desktop')}
                        {hasBlock('about') && fc.aboutText && (
                          <p className="opacity-70 line-clamp-2 text-[7.5px]">{fc.aboutText}</p>
                        )}
                        {hasBlock('contact') && fc.showWhatsappRow && (
                          <div className="opacity-80">{fc.whatsappLabel} {fc.whatsappLinkText}</div>
                        )}
                        {hasBlock('contact') && fc.showOpeningHours && (
                          <div className="opacity-70 truncate">{form.openingHours}</div>
                        )}
                        {hasBlock('about') && fc.showShopNowCta && (
                          <div className="font-semibold">{fc.shopNowLabel} →</div>
                        )}
                        {hasBlock('social') && activeSocialCount > 0 && (
                          <div className="pt-1 space-y-0.5">
                            {fc.socialHeading && (
                              <div className="font-brand font-semibold text-[8.5px]">
                                {fc.socialHeading}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              {Object.entries(fc.socialLinks || {})
                                .filter(([, url]) => url && url.trim())
                                .slice(0, 5)
                                .map(([key]) => (
                                  <span
                                    key={key}
                                    className="w-3.5 h-3.5 rounded-full border border-current/30 bg-white/10 inline-flex items-center justify-center text-[6px] uppercase font-bold"
                                  >
                                    {key.slice(0, 1)}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {hasBlock('help') && (
                      <div
                        className={`space-y-0.5 ${
                          design === 'boxed' ? 'p-2 rounded border border-white/15 bg-white/5' : ''
                        }`}
                      >
                        <div className="font-semibold mb-1">{fc.helpColumnTitle}</div>
                        {fc.helpLinks.slice(0, 4).map((l) => (
                          <div key={l.id} className="opacity-75 truncate">
                            {l.label}
                          </div>
                        ))}
                      </div>
                    )}

                    {hasBlock('company') && (
                      <div
                        className={`space-y-0.5 ${
                          design === 'boxed' ? 'p-2 rounded border border-white/15 bg-white/5' : ''
                        }`}
                      >
                        <div className="font-semibold mb-1">{fc.companyColumnTitle}</div>
                        {fc.companyLinks.slice(0, 3).map((l) => (
                          <div key={l.id} className="opacity-75 truncate">
                            {l.label}
                          </div>
                        ))}
                      </div>
                    )}

                    {hasBlock('newsletter') && design !== 'dark' && (
                      <div
                        className={`space-y-1 ${
                          design === 'boxed' ? 'p-2 rounded border border-white/15 bg-white/5' : ''
                        }`}
                      >
                        <div className="font-semibold">{fc.newsletterTitle}</div>
                        <p className="opacity-70 line-clamp-2 text-[7.5px]">
                          {fc.newsletterDescription}
                        </p>
                        <div className="flex items-center gap-1 pt-0.5">
                          <span className="flex-1 px-1.5 py-0.5 rounded border border-current/20 text-[7px] opacity-60 truncate">
                            {fc.newsletterPlaceholder}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[7px] font-semibold">
                            {fc.newsletterButtonText}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(hasBlock('payment-badges') || hasBlock('trust-badges')) && (
                  <div className="mt-2.5 pt-2 border-t border-current/15 flex flex-wrap items-center gap-1.5 text-[7.5px] opacity-80">
                    {hasBlock('payment-badges') && (
                      <span>
                        {[
                          fc.paymentBadges.cod && 'COD',
                          fc.paymentBadges.bkash && 'bKash',
                          fc.paymentBadges.nagad && 'Nagad',
                          fc.paymentBadges.card && 'Cards',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                    {hasBlock('trust-badges') && (
                      <span className="inline-flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {fc.trustBadges.slice(0, 2).join(' · ')}
                      </span>
                    )}
                  </div>
                )}

                {hasBlock('copyright') && (
                  <div className="mt-3 pt-2 border-t border-current/15 flex items-center justify-between text-[7.5px] opacity-70">
                    <span className="mx-auto">{fc.copyrightText}</span>
                    {fc.showScrollToTop && <ArrowUp className="w-2.5 h-2.5" />}
                  </div>
                )}
              </div>
            </div>
            {/* Monitor Stand */}
            <div className="w-10 h-3 bg-slate-200 dark:bg-slate-700 mx-auto" />
            <div className="w-24 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto" />
          </div>
        ) : (
          /* Mobile Frame */
          <div className="w-[270px] rounded-[26px] border-[5px] border-slate-900 bg-white overflow-hidden shadow-md relative">
            {showTopBar && hc.topBarShowOnMobile && (
              <div
                className="px-2 py-1 text-center text-[8px] font-medium truncate"
                style={{ backgroundColor: hc.topBarBgColor, color: hc.topBarTextColor }}
              >
                {validMessages[0]}
              </div>
            )}

            <div
              className="px-3 py-2 border-b border-black/10 flex items-center justify-between"
              style={{
                backgroundColor: hc.headerBgColor || '#FAF4E6',
                color: hc.headerTextColor || '#650108',
              }}
            >
              <div className="flex items-center gap-1.5">
                <Menu className="w-3.5 h-3.5" />
                <span className="font-brand text-xs font-bold">
                  {form.storeName || 'Classy Cases'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {hc.showTrackOrderIcon && <Package className="w-3 h-3" />}
                {hc.showWishlistIcon && <Heart className="w-3 h-3" />}
                {hc.showAccountIcon !== false && <User className="w-3 h-3" />}
                {hc.showCartIcon && <ShoppingBag className="w-3 h-3" />}
              </div>
            </div>

            {hc.showSearchIcon && (
              <div className="px-3 py-1.5 border-b border-slate-100">
                <div className="bg-slate-100 rounded-md px-2 py-1 flex items-center gap-1 text-[8px] text-slate-400">
                  <Search className="w-2.5 h-2.5" />
                  <span>Search cases...</span>
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-50 text-center space-y-1.5 min-h-[120px] flex flex-col justify-center">
              <div className="text-[10px] font-bold text-slate-900">{form.storeName}</div>
              <div className="text-[8px] text-slate-500">
                Phone menu: {hc.phoneMenuMode === 'same' ? 'Same as header' : 'All categories'}
              </div>
            </div>

            <div
              className="px-3 py-3 text-[8px] space-y-1.5 border-t border-slate-200"
              style={{ backgroundColor: footerBg, color: footerText }}
            >
              {hasBlock('about') && renderFooterLogoMark('mobile')}
              {hasBlock('help') && (
                <div className="opacity-75">
                  {fc.helpColumnTitle}: {fc.helpLinks.map((l) => l.label).slice(0, 3).join(', ')}
                </div>
              )}
              {hasBlock('copyright') && (
                <div className="pt-1 border-t border-current/15 text-center opacity-70">
                  {fc.copyrightText}
                </div>
              )}
            </div>

            {/* Mobile Bottom Bar Preview */}
            {hc.mobileBottomBarStyle !== 'off' && activeMobileItems.length > 0 && (
              <div
                className={`bg-white border-t border-slate-200 px-1.5 py-1.5 ${
                  hc.mobileBottomBarStyle === 'floating'
                    ? 'mx-2 mb-2 rounded-xl border shadow-md'
                    : ''
                }`}
              >
                <div
                  className="grid items-end text-center"
                  style={{ gridTemplateColumns: `repeat(${activeMobileItems.length}, minmax(0, 1fr))` }}
                >
                  {activeMobileItems.map((item, idx) => {
                    const isCenter =
                      hc.mobileBottomBarStyle === 'center-button' &&
                      idx === Math.floor(activeMobileItems.length / 2);
                    return (
                      <div key={item.id} className="flex flex-col items-center justify-center">
                        <span
                          className={
                            isCenter
                              ? 'w-7 h-7 -mt-3 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow'
                              : 'text-slate-700'
                          }
                        >
                          {renderMobileNavIcon(item.id)}
                        </span>
                        <span className="text-[7px] text-slate-600 mt-0.5 truncate max-w-full">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
        <span>Preview updates live as you edit.</span>
        <button
          type="button"
          onClick={onOpenStorefront}
          className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
        >
          Open Live Storefront
        </button>
      </div>
    </div>
  );
}
