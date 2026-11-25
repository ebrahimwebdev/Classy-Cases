import React from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Gift,
  Heart,
  Home,
  Info,
  LayoutGrid,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  User,
} from 'lucide-react';
import type {
  Category,
  FooterConfigSettings,
  HeaderConfigSettings,
  HeaderStyleType,
  MenuCategoryMode,
  MobileBottomBarItemId,
  MobileBottomBarStyleType,
  StoreSettings,
} from '../types';
import {
  DEFAULT_HEADER_CONFIG,
  DEFAULT_MOBILE_BOTTOM_BAR_ITEMS,
  normalizeWhatsAppUrl,
} from '../utils/headerFooterDefaults';
import { AdminLivePreviewPane } from './AdminLivePreviewPane';

interface AdminHeaderSettingsPanelProps {
  form: StoreSettings;
  hc: HeaderConfigSettings;
  fc: FooterConfigSettings;
  categories: Category[];
  updateHeader: (patch: Partial<HeaderConfigSettings>) => void;
  onOpenStorefront: () => void;
}

function SwitchToggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
        checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function HeaderStyleThumb({ style }: { style: HeaderStyleType }) {
  if (style === 'classic') {
    return (
      <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-2 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 rounded px-2 py-1.5 border border-slate-200/80 dark:border-slate-700">
          <span className="w-5 h-1.5 rounded bg-slate-300 dark:bg-slate-600" />
          <div className="flex items-center gap-1">
            <span className="w-3 h-1 rounded bg-slate-200 dark:bg-slate-700" />
            <span className="w-3 h-1 rounded bg-slate-200 dark:bg-slate-700" />
            <span className="w-3 h-1 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        </div>
        <div className="h-2.5 rounded bg-slate-200/50 dark:bg-slate-700/40" />
      </div>
    );
  }
  if (style === 'one-row') {
    return (
      <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-2 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-1.5 bg-white dark:bg-slate-900 rounded px-2 py-1.5 border border-slate-200/80 dark:border-slate-700">
          <span className="w-4 h-1.5 rounded bg-indigo-400" />
          <span className="flex-1 h-2.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          </div>
        </div>
      </div>
    );
  }
  if (style === 'two-row') {
    return (
      <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-2 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5 bg-white dark:bg-slate-900 rounded px-2 py-1 border border-slate-200/80 dark:border-slate-700">
          <span className="w-4 h-1.5 rounded bg-indigo-400" />
          <span className="flex-1 h-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-1">
          <span className="w-4 h-1 rounded bg-indigo-300" />
          <span className="w-4 h-1 rounded bg-slate-300 dark:bg-slate-600" />
          <span className="w-4 h-1 rounded bg-slate-300 dark:bg-slate-600" />
          <span className="w-4 h-1 rounded bg-slate-300 dark:bg-slate-600" />
        </div>
      </div>
    );
  }
  return (
    <div className="h-14 rounded-lg bg-slate-500/80 dark:bg-slate-700 border border-slate-400/50 p-2 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <span className="w-5 h-1.5 rounded bg-white/80" />
        <div className="flex items-center gap-1">
          <span className="w-3 h-1 rounded bg-white/50" />
          <span className="w-3 h-1 rounded bg-white/50" />
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
        </div>
      </div>
      <div className="h-3 rounded bg-white/20" />
    </div>
  );
}

function MobileBarThumb({ style }: { style: MobileBottomBarStyleType }) {
  if (style === 'classic') {
    return (
      <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col justify-between overflow-hidden">
        <div className="p-2 flex justify-end gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-1.5 px-3 flex items-center justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="w-2 h-2 rounded-xs bg-slate-300 dark:bg-slate-600" />
          ))}
        </div>
      </div>
    );
  }
  if (style === 'floating') {
    return (
      <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-2 flex flex-col justify-end">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full py-1.5 px-3 flex items-center justify-between shadow-2xs">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="w-2 h-2 rounded-xs bg-slate-300 dark:bg-slate-600" />
          ))}
        </div>
      </div>
    );
  }
  if (style === 'center-button') {
    return (
      <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col justify-end overflow-hidden">
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-1.5 px-3 flex items-center justify-between relative">
          <span className="w-2 h-2 rounded-xs bg-slate-300 dark:bg-slate-600" />
          <span className="w-2 h-2 rounded-xs bg-slate-300 dark:bg-slate-600" />
          <span className="w-4 h-4 -mt-3 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
          <span className="w-2 h-2 rounded-xs bg-slate-300 dark:bg-slate-600" />
          <span className="w-2 h-2 rounded-xs bg-slate-300 dark:bg-slate-600" />
        </div>
      </div>
    );
  }
  return (
    <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col justify-between overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-2.5 py-1.5 flex items-center justify-end gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>
      <div className="h-3" />
    </div>
  );
}

function getMobileItemIcon(id: MobileBottomBarItemId) {
  const cls = 'w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0';
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
}

export function AdminHeaderSettingsPanel({
  form,
  hc,
  fc,
  categories,
  updateHeader,
  onOpenStorefront,
}: AdminHeaderSettingsPanelProps) {
  const enabledMobileCount = hc.mobileBottomBarItems.filter((i) => i.enabled).length;

  const toggleMobileItem = (id: MobileBottomBarItemId) => {
    const target = hc.mobileBottomBarItems.find((i) => i.id === id);
    if (!target) return;
    if (!target.enabled && enabledMobileCount >= 5) {
      return;
    }
    updateHeader({
      mobileBottomBarItems: hc.mobileBottomBarItems.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      ),
    });
  };

  const moveMobileItem = (index: number, delta: -1 | 1) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= hc.mobileBottomBarItems.length) return;
    const copy = [...hc.mobileBottomBarItems];
    const [moved] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, moved);
    updateHeader({ mobileBottomBarItems: copy });
  };

  const togglePickedCategory = (catId: string) => {
    const set = new Set(hc.pickedCategoryIds || []);
    if (set.has(catId)) set.delete(catId);
    else set.add(catId);
    updateHeader({ pickedCategoryIds: Array.from(set) });
  };

  const validTopMessages = (hc.topBarMessages || []).map((m) => m.trim()).filter(Boolean);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
      {/* Left Column: Header Settings Cards */}
      <div className="lg:col-span-6 space-y-4">
        {/* 1. Header Style */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Header style</h2>
            <button
              type="button"
              onClick={() => updateHeader({ ...DEFAULT_HEADER_CONFIG })}
              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                {
                  id: 'classic',
                  title: 'Classic',
                  desc: 'Logo, menu and icons on one row',
                },
                {
                  id: 'one-row',
                  title: '1-row',
                  desc: 'Logo, big search bar and icons without category bar',
                },
                {
                  id: 'two-row',
                  title: 'Two-row',
                  desc: 'Big search bar above a category bar',
                },
                {
                  id: 'overlay',
                  title: 'Overlay',
                  desc: 'See-through over the home banner',
                },
              ] as const
            ).map((opt) => {
              const selected = hc.headerStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateHeader({ headerStyle: opt.id })}
                  className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selected
                      ? 'border-indigo-500 ring-1 ring-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                  <HeaderStyleThumb style={opt.id} />
                  <div className="mt-2.5 font-semibold text-slate-900 dark:text-slate-100">
                    {opt.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Category pictures in the category bar</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <SwitchToggle
                checked={hc.categoryPicturesInBar}
                onChange={(v) => updateHeader({ categoryPicturesInBar: v })}
                ariaLabel="Category pictures in the category bar"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>WhatsApp button in the category bar</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <SwitchToggle
                checked={hc.whatsappInCategoryBar}
                onChange={(v) => updateHeader({ whatsappInCategoryBar: v })}
                ariaLabel="WhatsApp button in the category bar"
              />
            </div>
          </div>
        </div>

        {/* 2. Header Icons */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Header icons</h2>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Search <Info className="w-3 h-3 text-slate-400" />
              </span>
              <SwitchToggle
                checked={hc.showSearchIcon}
                onChange={(v) => updateHeader({ showSearchIcon: v })}
                ariaLabel="Toggle Search icon"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Track order <Info className="w-3 h-3 text-slate-400" />
              </span>
              <SwitchToggle
                checked={hc.showTrackOrderIcon}
                onChange={(v) => updateHeader({ showTrackOrderIcon: v })}
                ariaLabel="Toggle Track order icon"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Wishlist <Info className="w-3 h-3 text-slate-400" />
              </span>
              <SwitchToggle
                checked={hc.showWishlistIcon}
                onChange={(v) => updateHeader({ showWishlistIcon: v })}
                ariaLabel="Toggle Wishlist icon"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Cart <Info className="w-3 h-3 text-slate-400" />
              </span>
              <SwitchToggle
                checked={hc.showCartIcon}
                onChange={(v) => updateHeader({ showCartIcon: v })}
                ariaLabel="Toggle Cart icon"
              />
            </div>

            <div className="sm:col-span-1 flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-slate-700 dark:text-slate-300">Offers</div>
                <div className="text-[10.5px] text-slate-400 leading-tight mt-0.5">
                  Shows only while your Offers page is on.
                </div>
              </div>
              <SwitchToggle
                checked={hc.showOffersIcon}
                onChange={(v) => updateHeader({ showOffersIcon: v })}
                ariaLabel="Toggle Offers icon"
              />
            </div>
          </div>
        </div>

        {/* 3. Mobile Bottom Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Mobile bottom bar
            </h2>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                {
                  id: 'classic',
                  title: 'Classic',
                  desc: 'Full-width bar along the bottom',
                },
                {
                  id: 'floating',
                  title: 'Floating',
                  desc: 'Rounded bar floating above the edge',
                },
                {
                  id: 'center-button',
                  title: 'Center button',
                  desc: 'Big round button in the middle',
                },
                {
                  id: 'off',
                  title: 'Off',
                  desc: 'Icons stay in the header',
                },
              ] as const
            ).map((opt) => {
              const selected = hc.mobileBottomBarStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateHeader({ mobileBottomBarStyle: opt.id })}
                  className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selected
                      ? 'border-indigo-500 ring-1 ring-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                  <MobileBarThumb style={opt.id} />
                  <div className="mt-2.5 font-semibold text-slate-900 dark:text-slate-100">
                    {opt.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Items list */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Items</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                  {enabledMobileCount} Of 5
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateHeader({
                    mobileBottomBarItems: DEFAULT_MOBILE_BOTTOM_BAR_ITEMS.map((i) => ({ ...i })),
                  })
                }
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Reset To Automatic
              </button>
            </div>

            <div className="space-y-1.5">
              {hc.mobileBottomBarItems.map((item, idx) => {
                const disabled = !item.enabled && enabledMobileCount >= 5;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                      item.enabled
                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        : 'border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-800/30'
                    }`}
                  >
                    <label
                      className={`flex items-center gap-2.5 flex-1 min-w-0 ${
                        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        disabled={disabled}
                        onChange={() => toggleMobileItem(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {getMobileItemIcon(item.id)}
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <span>{item.label}</span>
                          {(item.id === 'categories' ||
                            item.id === 'account' ||
                            item.id === 'whatsapp') && <Info className="w-3 h-3 text-slate-400" />}
                        </div>
                        {item.id === 'offers' && (
                          <div className="text-[10.5px] text-slate-400">
                            Shows only while your Offers page is on.
                          </div>
                        )}
                      </div>
                    </label>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveMobileItem(idx, -1)}
                        aria-label={`Move ${item.label} up`}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === hc.mobileBottomBarItems.length - 1}
                        onClick={() => moveMobileItem(idx, 1)}
                        aria-label={`Move ${item.label} down`}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {(hc.mobileBottomBarItems.some((item) => item.id === 'whatsapp' && item.enabled) ||
              hc.whatsappInCategoryBar) && (
              <div className="mt-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 space-y-1.5">
                <label className="block text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                  Direct WhatsApp Number or Chat Link
                </label>
                <input
                  type="text"
                  value={hc.whatsappUrl || ''}
                  onChange={(e) => updateHeader({ whatsappUrl: e.target.value })}
                  placeholder={fc.whatsappUrl || form.phone || '01799576210 or https://wa.me/8801799576210'}
                  className="w-full px-3 py-1.5 text-xs border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10.5px] text-emerald-800/80 dark:text-emerald-300/80 truncate">
                  Opens directly:{' '}
                  <span className="font-mono">
                    {normalizeWhatsAppUrl(
                      hc.whatsappUrl || fc.whatsappUrl || fc.socialLinks?.whatsapp,
                      form.phone
                    )}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Menu Categories */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Menu categories
            </h2>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="space-y-2.5">
            {(
              [
                { id: 'all', label: 'All categories' },
                { id: 'featured', label: 'Featured only' },
                { id: 'featured_plus_picks', label: 'Featured + my picks' },
                { id: 'only_picks', label: 'Only my picks' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2.5 cursor-pointer text-slate-800 dark:text-slate-200"
              >
                <input
                  type="radio"
                  name="menuCategoryMode"
                  checked={hc.menuCategoryMode === opt.id}
                  onChange={() => updateHeader({ menuCategoryMode: opt.id as MenuCategoryMode })}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium flex items-center gap-1.5">
                  <span>{opt.label}</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </span>
              </label>
            ))}
          </div>

          {(hc.menuCategoryMode === 'featured_plus_picks' ||
            hc.menuCategoryMode === 'only_picks') && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Select categories for your picks
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const picked = (hc.pickedCategoryIds || []).includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => togglePickedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                        picked
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Phone menu shows
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="phoneMenuMode"
                  checked={hc.phoneMenuMode === 'all'}
                  onChange={() => updateHeader({ phoneMenuMode: 'all' })}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>All categories</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="phoneMenuMode"
                  checked={hc.phoneMenuMode === 'same'}
                  onChange={() => updateHeader({ phoneMenuMode: 'same' })}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Same as the header menu</span>
              </label>
            </div>
          </div>
        </div>

        {/* 5. Top Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Top bar</h2>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              <SwitchToggle
                checked={hc.topBarEnabled}
                onChange={(v) => updateHeader({ topBarEnabled: v })}
                ariaLabel="Toggle top bar"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {hc.topBarEnabled ? 'Top bar is shown' : 'Top bar is hidden'}
              </span>
            </div>
          </div>

          {validTopMessages.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Add a message below. An empty top bar does not show.</span>
            </div>
          )}

          {hc.topBarMessages.length > 0 && (
            <div className="space-y-2">
              {hc.topBarMessages.map((msg, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={msg}
                    onChange={(e) => {
                      const next = [...hc.topBarMessages];
                      next[idx] = e.target.value;
                      updateHeader({ topBarMessages: next });
                    }}
                    placeholder="Free delivery across Bangladesh on orders over ৳1,500!"
                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateHeader({
                        topBarMessages: hc.topBarMessages.filter((_, i) => i !== idx),
                      })
                    }
                    aria-label="Remove message"
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              updateHeader({
                topBarMessages: [
                  ...(hc.topBarMessages || []),
                  'Free delivery across Bangladesh on orders over ৳1,500!',
                ],
              })
            }
            className="px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold inline-flex items-center gap-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Message</span>
          </button>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={hc.topBarBgColor}
                onChange={(e) => updateHeader({ topBarBgColor: e.target.value })}
                className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                aria-label="Top bar background color"
              />
              <div className="relative flex-1 max-w-[180px]">
                <input
                  type="text"
                  value={hc.topBarBgColor}
                  onChange={(e) => updateHeader({ topBarBgColor: e.target.value })}
                  placeholder="Background"
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-[11px]"
                />
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                Background <Info className="w-3 h-3" />
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={hc.topBarTextColor}
                onChange={(e) => updateHeader({ topBarTextColor: e.target.value })}
                className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                aria-label="Top bar text color"
              />
              <div className="relative flex-1 max-w-[180px]">
                <input
                  type="text"
                  value={hc.topBarTextColor}
                  onChange={(e) => updateHeader({ topBarTextColor: e.target.value })}
                  placeholder="Text"
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-[11px]"
                />
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                Text <Info className="w-3 h-3" />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <SwitchToggle
              checked={hc.topBarShowOnMobile}
              onChange={(v) => updateHeader({ topBarShowOnMobile: v })}
              ariaLabel="Show top bar on mobile"
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Show on mobile
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Live Preview */}
      <div className="lg:col-span-6">
        <AdminLivePreviewPane
          form={form}
          hc={hc}
          fc={fc}
          categories={categories}
          focusArea="header"
          onOpenStorefront={onOpenStorefront}
        />
      </div>
    </div>
  );
}
