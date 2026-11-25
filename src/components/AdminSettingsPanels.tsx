import React, { useState } from 'react';
import {
  Bell,
  Download,
  Globe,
  Layout,
  Mail,
  Monitor,
  Plug,
  Plus,
  Printer,
  RotateCcw,
  Share2,
  Shield,
  ShieldCheck,
  Store,
  Tag,
  Trash2,
  Truck,
  Upload,
  UserCog,
} from 'lucide-react';
import type {
  DeliveryConfigSettings,
  FooterConfigSettings,
  FooterLinkItem,
  HeaderConfigSettings,
  HeaderNavLink,
  MarketingConfigSettings,
  OrderConfigSettings,
  StorefrontPageConfig,
  StoreSettings,
  SystemConfigSettings,
} from '../types';
import {
  createDefaultFooterConfig,
  DEFAULT_HEADER_CONFIG,
  mergeFooterConfig,
  mergeHeaderConfig,
} from '../utils/headerFooterDefaults';

export type ExtendedSettingsTab =
  | 'Header'
  | 'Footer'
  | 'Shop Page'
  | 'Product Page'
  | 'Checkout'
  | 'Thank-you Page'
  | 'Product Reviews'
  | 'Size Guide'
  | 'Offer Page'
  | 'Popup Offer'
  | 'Order Sources'
  | 'Quick Notes'
  | 'Delivery Charges'
  | 'Shipping Classes & Weight'
  | 'Courier Integration'
  | 'Fraud Checking Accounts'
  | 'Marketing Connections'
  | 'Email'
  | 'Security'
  | 'Notifications'
  | 'Print Templates'
  | 'Export / Import'
  | 'Store data'
  | 'Support access';

interface AdminSettingsPanelsProps {
  activeTab: ExtendedSettingsTab;
  form: StoreSettings;
  setForm: React.Dispatch<React.SetStateAction<StoreSettings>>;
  onOpenStorefront: () => void;
  onStatusMessage: (msg: string) => void;
}

const DEFAULT_STOREFRONT: StorefrontPageConfig = {
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
  sizeGuideTitle: 'Phone Model & Case Fit Guide',
  sizeGuideNotes: 'Verify your exact device model under Settings -> About Phone before selecting your case.',
  offerPageTitle: 'Flash Deals & Combo Offers',
  offerPageBannerText: 'Up to 30% OFF on MagSafe & Carbon Armor Cases.',
  popupOfferEnabled: false,
  popupOfferHeadline: 'Get 10% OFF Your First Case',
  popupOfferCode: 'CLASSY10',
};

const DEFAULT_ORDERS: OrderConfigSettings = {
  sources: ['Web', 'POS', 'Facebook Page', 'Instagram DM', 'WhatsApp'],
  quickNotes: ['Call customer before dispatch', 'Check exact camera cutout', 'Urgent same-day Dhaka delivery'],
};

const DEFAULT_DELIVERY: DeliveryConfigSettings = {
  shippingClasses: [
    { name: 'Standard Case', fee: 60, defaultWeightKg: 0.25 },
    { name: 'Fragile Armor', fee: 80, defaultWeightKg: 0.45 },
  ],
  courierProvider: 'Steadfast',
  courierApiKey: '',
  courierSecretKey: '',
  fraudCheckEnabled: true,
  fraudThresholdPercent: 30,
};

const DEFAULT_MARKETING: MarketingConfigSettings = {
  metaPixelId: '',
  gtmId: '',
  tiktokPixelId: '',
};

const DEFAULT_SYSTEM: SystemConfigSettings = {
  smtpFromName: 'Classy Cases',
  smtpReplyTo: 'mdebrahim.contact@gmail.com',
  orderEmailNotifications: true,
  lowStockAlertEnabled: true,
  requireTwoFactorAdmin: false,
  invoiceHeaderNote: 'Classy Cases — Premium Everyday Protection',
  invoiceFooterNote: '7-day fit guarantee.',
  supportAccessEnabled: false,
};

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div>
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</div>
        {hint && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors p-0.5 shrink-0 ${
          checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white dark:bg-slate-900 transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function AdminSettingsPanels({
  activeTab,
  form,
  setForm,
  onOpenStorefront,
  onStatusMessage,
}: AdminSettingsPanelsProps) {
  const [newSource, setNewSource] = useState('');
  const [newQuickNote, setNewQuickNote] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassFee, setNewClassFee] = useState('60');
  const [newClassWeight, setNewClassWeight] = useState('0.3');

  const sf = { ...DEFAULT_STOREFRONT, ...(form.storefrontConfig || {}) };
  const os = { ...DEFAULT_ORDERS, ...(form.orderSettings || {}) };
  const ds = { ...DEFAULT_DELIVERY, ...(form.deliverySettings || {}) };
  const ms = { ...DEFAULT_MARKETING, ...(form.marketingSettings || {}) };
  const sys = { ...DEFAULT_SYSTEM, ...(form.systemSettings || {}) };
  const hc = mergeHeaderConfig(form.headerConfig);
  const fc = mergeFooterConfig(form.footerConfig, {
    storeName: form.storeName,
    tagline: form.tagline,
    phone: form.phone,
    email: form.email,
    address: form.address,
    openingHours: form.openingHours,
    shippingInsideDhaka: form.shippingInsideDhaka,
    shippingOutsideDhaka: form.shippingOutsideDhaka,
    freeShippingThreshold: form.freeShippingThreshold,
  });

  const updateStorefront = (patch: Partial<StorefrontPageConfig>) =>
    setForm((prev) => ({ ...prev, storefrontConfig: { ...sf, ...patch } }));

  const updateHeader = (patch: Partial<HeaderConfigSettings>) =>
    setForm((prev) => ({ ...prev, headerConfig: { ...hc, ...patch } }));

  const updateFooter = (patch: Partial<FooterConfigSettings>) =>
    setForm((prev) => ({ ...prev, footerConfig: { ...fc, ...patch } }));

  const updateOrders = (patch: Partial<OrderConfigSettings>) =>
    setForm((prev) => ({ ...prev, orderSettings: { ...os, ...patch } }));

  const updateDelivery = (patch: Partial<DeliveryConfigSettings>) =>
    setForm((prev) => ({ ...prev, deliverySettings: { ...ds, ...patch } }));

  const updateMarketing = (patch: Partial<MarketingConfigSettings>) =>
    setForm((prev) => ({ ...prev, marketingSettings: { ...ms, ...patch } }));

  const updateSystem = (patch: Partial<SystemConfigSettings>) =>
    setForm((prev) => ({ ...prev, systemSettings: { ...sys, ...patch } }));

  if (activeTab === 'Header') {
    const updateNavLink = (id: string, patch: Partial<HeaderNavLink>) => {
      updateHeader({
        navLinks: hc.navLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      });
    };

    return (
      <div className="space-y-4 text-xs">
        {/* Announcement Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layout className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Top Announcement Bar</span>
            </h2>
            <button
              type="button"
              onClick={() => updateHeader({ ...DEFAULT_HEADER_CONFIG })}
              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Header Defaults</span>
            </button>
          </div>

          <ToggleRow
            label="Show announcement bar above header"
            hint="Display a promo or delivery notice banner at the very top of the storefront"
            checked={hc.announcementEnabled}
            onChange={(v) => updateHeader({ announcementEnabled: v })}
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Announcement Text
              </label>
              <input
                type="text"
                value={hc.announcementText}
                onChange={(e) => updateHeader({ announcementText: e.target.value })}
                placeholder="Free delivery across Bangladesh on orders over ৳1,500!"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Banner Background
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hc.announcementBgColor}
                  onChange={(e) => updateHeader({ announcementBgColor: e.target.value })}
                  className="w-9 h-9 rounded border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={hc.announcementBgColor}
                  onChange={(e) => updateHeader({ announcementBgColor: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Banner Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hc.announcementTextColor}
                  onChange={(e) => updateHeader({ announcementTextColor: e.target.value })}
                  className="w-9 h-9 rounded border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={hc.announcementTextColor}
                  onChange={(e) => updateHeader({ announcementTextColor: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Header Appearance & Controls */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Header Layout, Colors &amp; Action Buttons
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Header Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hc.headerBgColor}
                  onChange={(e) => updateHeader({ headerBgColor: e.target.value })}
                  className="w-9 h-9 rounded border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={hc.headerBgColor}
                  onChange={(e) => updateHeader({ headerBgColor: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Header Brand &amp; Icon Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hc.headerTextColor}
                  onChange={(e) => updateHeader({ headerTextColor: e.target.value })}
                  className="w-9 h-9 rounded border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={hc.headerTextColor}
                  onChange={(e) => updateHeader({ headerTextColor: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <ToggleRow
              label="Sticky header while scrolling"
              hint="Keep the navigation bar pinned to the top on scroll"
              checked={hc.stickyHeader}
              onChange={(v) => updateHeader({ stickyHeader: v })}
            />
            <ToggleRow
              label="Show product search bar"
              hint="Display search input with instant suggestions in header"
              checked={hc.showSearchBar}
              onChange={(v) => updateHeader({ showSearchBar: v })}
            />
            <ToggleRow
              label="Show My Orders & Tracking button"
              hint="Let customers jump directly to order tracking from the header"
              checked={hc.showMyOrdersButton}
              onChange={(v) => updateHeader({ showMyOrdersButton: v })}
            />
            <ToggleRow
              label="Show Favorites (Wishlist) button"
              hint="Display heart icon & saved favorites drawer trigger"
              checked={hc.showFavoritesButton}
              onChange={(v) => updateHeader({ showFavoritesButton: v })}
            />
            <ToggleRow
              label="Show Shopping Bag button"
              hint="Display cart drawer icon and live item counter"
              checked={hc.showCartButton}
              onChange={(v) => updateHeader({ showCartButton: v })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Search Bar Placeholder
              </label>
              <input
                type="text"
                value={hc.searchPlaceholder}
                onChange={(e) => updateHeader({ searchPlaceholder: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                My Orders Button Label
              </label>
              <input
                type="text"
                value={hc.myOrdersLabel}
                onChange={(e) => updateHeader({ myOrdersLabel: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Custom Header Menu Links */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Custom Header Menu Links
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Optional desktop &amp; mobile drawer navigation links (e.g. Home, Shop, Track Order, Offers)
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateHeader({
                  navLinks: [
                    ...hc.navLinks,
                    {
                      id: `nav-${Date.now()}`,
                      label: 'Shop Cases',
                      action: 'shop',
                      url: '',
                    },
                  ],
                })
              }
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold inline-flex items-center gap-1 hover:bg-indigo-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Link</span>
            </button>
          </div>

          {hc.navLinks.length === 0 ? (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              No custom header links added yet. Click &quot;Add Link&quot; to add quick navigation items.
            </div>
          ) : (
            <div className="space-y-2">
              {hc.navLinks.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                >
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateNavLink(item.id, { label: e.target.value })}
                    placeholder="Link label"
                    className="sm:col-span-4 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                  <select
                    value={item.action}
                    onChange={(e) =>
                      updateNavLink(item.id, {
                        action: e.target.value as HeaderNavLink['action'],
                      })
                    }
                    className="sm:col-span-3 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="home">Go to Home</option>
                    <option value="shop">Scroll to Shop Catalog</option>
                    <option value="orders">Open My Orders</option>
                    <option value="url">Custom URL</option>
                  </select>
                  {item.action === 'url' ? (
                    <input
                      type="url"
                      value={item.url || ''}
                      onChange={(e) => updateNavLink(item.id, { url: e.target.value })}
                      placeholder="https://..."
                      className="sm:col-span-4 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  ) : (
                    <div className="sm:col-span-4 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                      Navigates inside storefront
                    </div>
                  )}
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        updateHeader({
                          navLinks: hc.navLinks.filter((l) => l.id !== item.id),
                        })
                      }
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded"
                      aria-label="Delete header link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'Footer') {
    const updateFooterLink = (
      col: 'helpLinks' | 'companyLinks',
      id: string,
      patch: Partial<FooterLinkItem>
    ) => {
      updateFooter({
        [col]: fc[col].map((l) => (l.id === id ? { ...l, ...patch } : l)),
      });
    };

    const addFooterLink = (col: 'helpLinks' | 'companyLinks') => {
      updateFooter({
        [col]: [
          ...fc[col],
          {
            id: `${col}-${Date.now()}`,
            label: 'New Link',
            action: 'modal',
            value: 'Add details or popup information here.',
          },
        ],
      });
    };

    const removeFooterLink = (col: 'helpLinks' | 'companyLinks', id: string) => {
      updateFooter({
        [col]: fc[col].filter((l) => l.id !== id),
      });
    };

    return (
      <div className="space-y-4 text-xs">
        {/* Colors & Brand Column */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Footer Theme &amp; Brand Column</span>
            </h2>
            <button
              type="button"
              onClick={() =>
                updateFooter(
                  createDefaultFooterConfig({
                    storeName: form.storeName,
                    tagline: form.tagline,
                    phone: form.phone,
                    email: form.email,
                    address: form.address,
                    openingHours: form.openingHours,
                    shippingInsideDhaka: form.shippingInsideDhaka,
                    shippingOutsideDhaka: form.shippingOutsideDhaka,
                    freeShippingThreshold: form.freeShippingThreshold,
                  })
                )
              }
              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Footer Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Footer Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fc.footerBgColor}
                  onChange={(e) => updateFooter({ footerBgColor: e.target.value })}
                  className="w-9 h-9 rounded border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={fc.footerBgColor}
                  onChange={(e) => updateFooter({ footerBgColor: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Footer Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fc.footerTextColor}
                  onChange={(e) => updateFooter({ footerTextColor: e.target.value })}
                  className="w-9 h-9 rounded border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={fc.footerTextColor}
                  onChange={(e) => updateFooter({ footerTextColor: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <ToggleRow
              label="Show Brand Logo / Store Name in Footer"
              checked={fc.showBrandLogo}
              onChange={(v) => updateFooter({ showBrandLogo: v })}
            />
            <ToggleRow
              label="Show WhatsApp Support row"
              checked={fc.showWhatsappRow}
              onChange={(v) => updateFooter({ showWhatsappRow: v })}
            />
            <ToggleRow
              label="Show Shop Now button"
              checked={fc.showShopNowCta}
              onChange={(v) => updateFooter({ showShopNowCta: v })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Short Brand Description (Optional)
              </label>
              <input
                type="text"
                value={fc.aboutText}
                onChange={(e) => updateFooter({ aboutText: e.target.value })}
                placeholder="Everyday protection & signature style for your smartphone."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                WhatsApp Prefix Label
              </label>
              <input
                type="text"
                value={fc.whatsappLabel}
                onChange={(e) => updateFooter({ whatsappLabel: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                WhatsApp Link Text
              </label>
              <input
                type="text"
                value={fc.whatsappLinkText}
                onChange={(e) => updateFooter({ whatsappLinkText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                WhatsApp Direct URL (Optional)
              </label>
              <input
                type="url"
                value={fc.whatsappUrl}
                onChange={(e) => updateFooter({ whatsappUrl: e.target.value })}
                placeholder="https://wa.me/8801799576210 (leave blank for info popup)"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Shop Now CTA Label
              </label>
              <input
                type="text"
                value={fc.shopNowLabel}
                onChange={(e) => updateFooter({ shopNowLabel: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Footer Social Media Links</span>
            </h2>
          </div>

          <ToggleRow
            label="Show social media icons in footer"
            hint="Leave any individual platform URL empty to hide that icon"
            checked={fc.showSocialLinks}
            onChange={(v) => updateFooter({ showSocialLinks: v })}
          />

          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              Social Section Label
            </label>
            <input
              type="text"
              value={fc.socialHeading}
              onChange={(e) => updateFooter({ socialHeading: e.target.value })}
              placeholder="Follow Us"
              className="w-full max-w-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                { key: 'facebook', label: 'Facebook URL', placeholder: 'https://facebook.com/yourpage' },
                { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/yourhandle' },
                { key: 'tiktok', label: 'TikTok URL', placeholder: 'https://tiktok.com/@yourhandle' },
                { key: 'youtube', label: 'YouTube URL', placeholder: 'https://youtube.com/@yourchannel' },
                { key: 'whatsapp', label: 'WhatsApp URL', placeholder: 'https://wa.me/8801799576210' },
                { key: 'x', label: 'X / Twitter URL', placeholder: 'https://x.com/yourhandle' },
              ] as const
            ).map((soc) => (
              <div key={soc.key}>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>{soc.label}</span>
                </label>
                <input
                  type="url"
                  value={fc.socialLinks[soc.key]}
                  onChange={(e) =>
                    updateFooter({
                      socialLinks: {
                        ...fc.socialLinks,
                        [soc.key]: e.target.value,
                      },
                    })
                  }
                  placeholder={soc.placeholder}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Help & Company Link Columns */}
        {(
          [
            {
              colKey: 'helpLinks' as const,
              titleKey: 'helpColumnTitle' as const,
              heading: 'Footer Column 2 (Help Links)',
            },
            {
              colKey: 'companyLinks' as const,
              titleKey: 'companyColumnTitle' as const,
              heading: 'Footer Column 3 (Company Links)',
            },
          ]
        ).map((colCfg) => (
          <div
            key={colCfg.colKey}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {colCfg.heading}
              </h2>
              <button
                type="button"
                onClick={() => addFooterLink(colCfg.colKey)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold inline-flex items-center gap-1 hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Column Heading
              </label>
              <input
                type="text"
                value={fc[colCfg.titleKey]}
                onChange={(e) => updateFooter({ [colCfg.titleKey]: e.target.value })}
                className="w-full max-w-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold"
              />
            </div>

            <div className="space-y-2 pt-1">
              {fc[colCfg.colKey].map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) =>
                        updateFooterLink(colCfg.colKey, item.id, { label: e.target.value })
                      }
                      placeholder="Link Label"
                      className="sm:col-span-5 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                    />
                    <select
                      value={item.action}
                      onChange={(e) =>
                        updateFooterLink(colCfg.colKey, item.id, {
                          action: e.target.value as FooterLinkItem['action'],
                        })
                      }
                      className="sm:col-span-6 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="modal">Open Info Popup</option>
                      <option value="url">Open URL / Link</option>
                      <option value="orders">Open My Orders &amp; Tracking</option>
                      <option value="catalog">Scroll to Shop Catalog</option>
                    </select>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeFooterLink(colCfg.colKey, item.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded"
                        aria-label="Delete footer link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {(item.action === 'modal' || item.action === 'url') && (
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) =>
                        updateFooterLink(colCfg.colKey, item.id, { value: e.target.value })
                      }
                      placeholder={
                        item.action === 'url'
                          ? 'https://... or /orders'
                          : 'Popup text shown when customer clicks this link'
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Newsletter & Bottom Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Newsletter &amp; Copyright Bottom Bar
          </h2>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <ToggleRow
              label="Show Newsletter column in footer"
              checked={fc.showNewsletter}
              onChange={(v) => updateFooter({ showNewsletter: v })}
            />
            <ToggleRow
              label="Show Scroll-to-Top button"
              checked={fc.showScrollToTop}
              onChange={(v) => updateFooter({ showScrollToTop: v })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Newsletter Heading
              </label>
              <input
                type="text"
                value={fc.newsletterTitle}
                onChange={(e) => updateFooter({ newsletterTitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Newsletter Button Text
              </label>
              <input
                type="text"
                value={fc.newsletterButtonText}
                onChange={(e) => updateFooter({ newsletterButtonText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Newsletter Description
              </label>
              <input
                type="text"
                value={fc.newsletterDescription}
                onChange={(e) => updateFooter({ newsletterDescription: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Email Input Placeholder
              </label>
              <input
                type="text"
                value={fc.newsletterPlaceholder}
                onChange={(e) => updateFooter({ newsletterPlaceholder: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Copyright Text
              </label>
              <input
                type="text"
                value={fc.copyrightText}
                onChange={(e) => updateFooter({ copyrightText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'Shop Page') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Shop Page Layout</h2>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Desktop Product Grid Columns
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-md text-xs">
            {([2, 3, 4, 5] as const).map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => updateStorefront({ shopPageColumns: col })}
                className={`py-2 rounded-lg border font-semibold cursor-pointer ${
                  sf.shopPageColumns === col
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                {col} Columns
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            Sets how many product cards appear per row on desktop (4 or 5 recommended), then click Save Changes.
          </p>
        </div>
        <ToggleRow
          label="Show Out of Stock products on Storefront"
          hint="Display sold-out cases with an Out of Stock badge instead of hiding them"
          checked={sf.showOutOfStock}
          onChange={(v) => updateStorefront({ showOutOfStock: v })}
        />
      </div>
    );
  }

  if (activeTab === 'Product Page') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Product Page Preferences</h2>
        <ToggleRow
          label="Show stock availability badge"
          hint="Show remaining unit counts or In Stock indicator next to price"
          checked={sf.showStockBadgeOnProduct}
          onChange={(v) => updateStorefront({ showStockBadgeOnProduct: v })}
        />
        <ToggleRow
          label="Show related phone cases"
          hint="Suggest matching cases on the product details view"
          checked={sf.showRelatedProducts}
          onChange={(v) => updateStorefront({ showRelatedProducts: v })}
        />
      </div>
    );
  }

  if (activeTab === 'Checkout') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Checkout Fields &amp; Flow</h2>
        <ToggleRow
          label="Require customer email at checkout"
          hint="Make email address mandatory alongside name, phone, and address"
          checked={sf.checkoutRequireEmail}
          onChange={(v) => updateStorefront({ checkoutRequireEmail: v })}
        />
        <ToggleRow
          label="Allow delivery instruction notes"
          hint="Let customers specify exact phone model or courier gate notes"
          checked={sf.checkoutNoteEnabled}
          onChange={(v) => updateStorefront({ checkoutNoteEnabled: v })}
        />
      </div>
    );
  }

  if (activeTab === 'Thank-you Page') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Thank-you Page Message</h2>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Confirmation Headline</label>
          <input
            type="text"
            value={sf.thankYouHeadline}
            onChange={(e) => updateStorefront({ thankYouHeadline: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Confirmation Sub-message</label>
          <textarea
            rows={3}
            value={sf.thankYouMessage}
            onChange={(e) => updateStorefront({ thankYouMessage: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'Product Reviews') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Product Reviews</h2>
        <ToggleRow
          label="Enable customer reviews &amp; star ratings"
          hint="Show rating breakdown and review submission form in product details"
          checked={sf.reviewsEnabled}
          onChange={(v) => updateStorefront({ reviewsEnabled: v })}
        />
        <ToggleRow
          label="Publish submitted reviews automatically"
          hint="Instantly display new customer reviews without manual moderation"
          checked={sf.reviewsAutoApprove}
          onChange={(v) => updateStorefront({ reviewsAutoApprove: v })}
        />
        <ToggleRow
          label="Homepage: Show only 5-star reviews"
          hint="Filter the homepage Customer Reviews section to display only 5-star rated reviews"
          checked={sf.homeReviewsOnlyFiveStar !== false}
          onChange={(v) => updateStorefront({ homeReviewsOnlyFiveStar: v })}
        />
      </div>
    );
  }

  if (activeTab === 'Size Guide') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Size &amp; Device Fit Guide</h2>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Guide Title</label>
          <input
            type="text"
            value={sf.sizeGuideTitle}
            onChange={(e) => updateStorefront({ sizeGuideTitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Fit Verification Instructions</label>
          <textarea
            rows={3}
            value={sf.sizeGuideNotes}
            onChange={(e) => updateStorefront({ sizeGuideNotes: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'Offer Page') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Offer Page Configuration</h2>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Offer Page Heading</label>
          <input
            type="text"
            value={sf.offerPageTitle}
            onChange={(e) => updateStorefront({ offerPageTitle: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Promotional Banner Copy</label>
          <textarea
            rows={2}
            value={sf.offerPageBannerText}
            onChange={(e) => updateStorefront({ offerPageBannerText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'Popup Offer') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Popup Offer</h2>
        <ToggleRow
          label="Enable Storefront Offer Popup"
          hint="Display a promotional discount popup for first-time visitors"
          checked={sf.popupOfferEnabled}
          onChange={(v) => updateStorefront({ popupOfferEnabled: v })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Popup Headline</label>
            <input
              type="text"
              value={sf.popupOfferHeadline}
              onChange={(e) => updateStorefront({ popupOfferHeadline: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Promo Code</label>
            <input
              type="text"
              value={sf.popupOfferCode}
              onChange={(e) => updateStorefront({ popupOfferCode: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono uppercase"
            />
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'Order Sources') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Order Sources</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="Add order source (e.g. TikTok Shop, Daraz)"
            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = newSource.trim();
              if (!trimmed || os.sources.includes(trimmed)) return;
              updateOrders({ sources: [...os.sources, trimmed] });
              setNewSource('');
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
          {os.sources.map((src) => (
            <div key={src} className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="font-medium text-slate-800 dark:text-slate-200">{src}</span>
              <button
                type="button"
                onClick={() => updateOrders({ sources: os.sources.filter((s) => s !== src) })}
                className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                aria-label={`Remove ${src}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'Quick Notes') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Quick Order Notes</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newQuickNote}
            onChange={(e) => setNewQuickNote(e.target.value)}
            placeholder="Add preset dispatch/packing note..."
            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = newQuickNote.trim();
              if (!trimmed || os.quickNotes.includes(trimmed)) return;
              updateOrders({ quickNotes: [...os.quickNotes, trimmed] });
              setNewQuickNote('');
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
          {os.quickNotes.map((note) => (
            <div key={note} className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-slate-800 dark:text-slate-200">{note}</span>
              <button
                type="button"
                onClick={() => updateOrders({ quickNotes: os.quickNotes.filter((n) => n !== note) })}
                className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                aria-label={`Remove ${note}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'Delivery Charges') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Delivery Charges</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Inside Dhaka (৳)</label>
            <input
              type="number"
              min={0}
              value={form.shippingInsideDhaka}
              onChange={(e) => setForm({ ...form, shippingInsideDhaka: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Outside Dhaka (৳)</label>
            <input
              type="number"
              min={0}
              value={form.shippingOutsideDhaka}
              onChange={(e) => setForm({ ...form, shippingOutsideDhaka: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Free Shipping Over (৳)</label>
            <input
              type="number"
              min={0}
              value={form.freeShippingThreshold}
              onChange={(e) => setForm({ ...form, freeShippingThreshold: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums"
            />
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'Shipping Classes & Weight') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Shipping Classes &amp; Weight</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Class name (e.g. Heavy Box)"
            className="sm:col-span-2 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
          <input
            type="number"
            min={0}
            value={newClassFee}
            onChange={(e) => setNewClassFee(e.target.value)}
            placeholder="Fee (৳)"
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums"
          />
          <div className="flex gap-1.5">
            <input
              type="number"
              step="0.05"
              min={0}
              value={newClassWeight}
              onChange={(e) => setNewClassWeight(e.target.value)}
              placeholder="kg"
              className="w-20 px-2.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums"
            />
            <button
              type="button"
              onClick={() => {
                if (!newClassName.trim()) return;
                updateDelivery({
                  shippingClasses: [
                    ...ds.shippingClasses,
                    {
                      name: newClassName.trim(),
                      fee: Math.max(0, Number(newClassFee) || 0),
                      defaultWeightKg: Math.max(0, Number(newClassWeight) || 0.25),
                    },
                  ],
                });
                setNewClassName('');
              }}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              Add
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
          {ds.shippingClasses.map((cls) => (
            <div key={cls.name} className="px-3.5 py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{cls.name}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400 tabular-nums">
                  ৳{cls.fee} · {cls.defaultWeightKg} kg
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateDelivery({
                    shippingClasses: ds.shippingClasses.filter((c) => c.name !== cls.name),
                  })
                }
                className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'Courier Integration') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Courier Integration</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Active Courier Partner</label>
            <select
              value={ds.courierProvider}
              onChange={(e) =>
                updateDelivery({
                  courierProvider: e.target.value as DeliveryConfigSettings['courierProvider'],
                })
              }
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900"
            >
              <option value="Steadfast">Steadfast Courier</option>
              <option value="Pathao">Pathao Parcel</option>
              <option value="RedX">RedX Logistics</option>
              <option value="None">Manual / None</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">API Key</label>
            <input
              type="text"
              value={ds.courierApiKey}
              onChange={(e) => updateDelivery({ courierApiKey: e.target.value })}
              placeholder="Enter courier API key..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Secret Key</label>
            <input
              type="password"
              value={ds.courierSecretKey}
              onChange={(e) => updateDelivery({ courierSecretKey: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
            />
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'Fraud Checking Accounts') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Fraud Checking Accounts</span>
        </h2>
        <ToggleRow
          label="Enable automated customer return-ratio screening"
          hint="Flag COD orders if historical cancellation rate exceeds your threshold"
          checked={ds.fraudCheckEnabled}
          onChange={(v) => updateDelivery({ fraudCheckEnabled: v })}
        />
        <div className="max-w-xs">
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Risk Alert Cancellation Threshold (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={ds.fraudThresholdPercent}
            onChange={(e) =>
              updateDelivery({ fraudThresholdPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
            }
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums"
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'Marketing Connections') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Plug className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Marketing Connections</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Meta Pixel ID</label>
            <input
              type="text"
              value={ms.metaPixelId}
              onChange={(e) => updateMarketing({ metaPixelId: e.target.value })}
              placeholder="e.g. 123456789012345"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Google Tag Manager ID</label>
            <input
              type="text"
              value={ms.gtmId}
              onChange={(e) => updateMarketing({ gtmId: e.target.value })}
              placeholder="e.g. GTM-XXXXXXX"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">TikTok Pixel ID</label>
            <input
              type="text"
              value={ms.tiktokPixelId}
              onChange={(e) => updateMarketing({ tiktokPixelId: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
            />
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'Email') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Email Sender Settings</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Sender Name</label>
            <input
              type="text"
              value={sys.smtpFromName}
              onChange={(e) => updateSystem({ smtpFromName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Reply-To Address</label>
            <input
              type="email"
              value={sys.smtpReplyTo}
              onChange={(e) => updateSystem({ smtpReplyTo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'Security') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Security</span>
        </h2>
        <ToggleRow
          label="Require stricter admin verification for settings updates"
          hint="Enforce stricter session verification before changing payment or courier credentials"
          checked={sys.requireTwoFactorAdmin}
          onChange={(v) => updateSystem({ requireTwoFactorAdmin: v })}
        />
      </div>
    );
  }

  if (activeTab === 'Notifications') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Notifications</span>
        </h2>
        <ToggleRow
          label="New order email &amp; dashboard alerts"
          hint="Notify store administrators when new Web or POS orders arrive"
          checked={sys.orderEmailNotifications}
          onChange={(v) => updateSystem({ orderEmailNotifications: v })}
        />
        <ToggleRow
          label="Low-stock warning notifications"
          hint="Highlight products on the dashboard when stock drops below threshold"
          checked={sys.lowStockAlertEnabled}
          onChange={(v) => updateSystem({ lowStockAlertEnabled: v })}
        />
      </div>
    );
  }

  if (activeTab === 'Print Templates') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Print Templates (Invoices &amp; Packing Slips)</span>
        </h2>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Invoice Header Subtitle</label>
          <input
            type="text"
            value={sys.invoiceHeaderNote}
            onChange={(e) => updateSystem({ invoiceHeaderNote: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Invoice Footer Return Policy</label>
          <textarea
            rows={2}
            value={sys.invoiceFooterNote}
            onChange={(e) => updateSystem({ invoiceFooterNote: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'Export / Import') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Export / Import Settings</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Download a JSON backup of your store configuration or restore a saved settings file.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(form, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `classy-cases-settings-${new Date().toISOString().slice(0, 10)}.json`;
              link.click();
              URL.revokeObjectURL(url);
              onStatusMessage('Settings JSON exported.');
            }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Settings JSON</span>
          </button>

          <label className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Settings JSON</span>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const parsed = JSON.parse(await file.text()) as Partial<StoreSettings>;
                  setForm((prev) => ({ ...prev, ...parsed }));
                  onStatusMessage('Imported JSON loaded into editor — click Save Changes to apply.');
                } catch {
                  onStatusMessage('Invalid settings JSON file.');
                }
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>
    );
  }

  if (activeTab === 'Store data') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Store Data &amp; Storage</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Your products, orders, categories, reviews, and configuration are persisted safely in your local JSON store.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenStorefront}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 inline-flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Open Live Storefront</span>
          </button>
        </div>
      </div>
    );
  }

  // Support access
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <UserCog className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span>Support Access</span>
      </h2>
      <ToggleRow
        label="Allow temporary store diagnostic review"
        hint="Grant read-only troubleshooting access for store configuration support"
        checked={sys.supportAccessEnabled}
        onChange={(v) => updateSystem({ supportAccessEnabled: v })}
      />
    </div>
  );
}
