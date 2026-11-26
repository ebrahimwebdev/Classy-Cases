import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Film,
  Flame,
  LayoutGrid,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
} from 'lucide-react';
import type {
  HomeCustomizationConfig,
  HomeSectionConfig,
  HomeSectionId,
  StorefrontPageConfig,
  StoreSettings,
} from '../types';
import {
  DEFAULT_HOME_CUSTOMIZATION,
  mergeHomeCustomization,
} from '../utils/homeCustomizationDefaults';

interface AdminHomeCustomizationPanelProps {
  form: StoreSettings;
  sf: StorefrontPageConfig;
  updateStorefront: (patch: Partial<StorefrontPageConfig>) => void;
  onOpenStorefront: () => void;
  onNavigateSettingsTab?: (tab: string) => void;
  onStatusMessage?: (msg: string) => void;
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

function getSectionIcon(id: HomeSectionId) {
  switch (id) {
    case 'hero':
      return <Film className="w-4 h-4" />;
    case 'trust_highlights':
      return <ShieldCheck className="w-4 h-4" />;
    case 'featured_categories':
      return <Sparkles className="w-4 h-4" />;
    case 'bestselling':
      return <Flame className="w-4 h-4" />;
    case 'phone_cases':
      return <Smartphone className="w-4 h-4" />;
    case 'explore_more':
      return <LayoutGrid className="w-4 h-4" />;
    case 'customer_reviews':
      return <Star className="w-4 h-4" />;
    case 'trusted_by':
      return <Award className="w-4 h-4" />;
  }
}

export function AdminHomeCustomizationPanel({
  form,
  sf,
  updateStorefront,
  onOpenStorefront,
  onNavigateSettingsTab,
  onStatusMessage,
}: AdminHomeCustomizationPanelProps) {
  const hc = mergeHomeCustomization(sf.homeCustomization);
  const [expandedId, setExpandedId] = useState<HomeSectionId | null>('hero');

  const commitHomeConfig = (next: HomeCustomizationConfig) => {
    updateStorefront({ homeCustomization: next });
  };

  const updateSection = (
    id: HomeSectionId,
    patch: Partial<HomeSectionConfig>
  ) => {
    const nextSections = hc.sections.map((section) =>
      section.id === id ? { ...section, ...patch } : section
    );
    commitHomeConfig({ ...hc, sections: nextSections });
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= hc.sections.length) return;
    const nextSections = [...hc.sections];
    const [moved] = nextSections.splice(index, 1);
    nextSections.splice(target, 0, moved);
    commitHomeConfig({ ...hc, sections: nextSections });
  };

  const handleResetDefaults = () => {
    commitHomeConfig({
      ...DEFAULT_HOME_CUSTOMIZATION,
      sections: DEFAULT_HOME_CUSTOMIZATION.sections.map((s) => ({ ...s })),
    });
    onStatusMessage?.('Homepage sections reset to default layout. Click Save Changes to publish.');
  };

  const activeCount = hc.sections.filter((s) => s.enabled).length;

  return (
    <div className="space-y-4">
      {/* Header Summary Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Home Customization
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30">
              {activeCount} / {hc.sections.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Control visibility, display order, section headings, and product limits for every section on your storefront homepage. Remember to click Save Changes above to publish.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Order</span>
          </button>
          <button
            type="button"
            onClick={onOpenStorefront}
            className="px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-500/10 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Preview Storefront</span>
          </button>
        </div>
      </div>

      {/* Ordered List of Homepage Sections */}
      <div className="space-y-3">
        {hc.sections.map((section, idx) => {
          const isExpanded = expandedId === section.id;
          const isReviewsBlockedGlobally =
            section.id === 'customer_reviews' && sf.reviewsEnabled === false;

          return (
            <div
              key={section.id}
              className={`bg-white dark:bg-slate-900 border rounded-xl transition-colors ${
                section.enabled
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-slate-200/70 dark:border-slate-800/70 opacity-80'
              }`}
            >
              {/* Section Row Header */}
              <div className="p-4 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                    #{idx + 1}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      section.enabled
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200/70 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {getSectionIcon(section.id)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {section.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                          section.enabled && !isReviewsBlockedGlobally
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isReviewsBlockedGlobally
                          ? 'Reviews Disabled'
                          : section.enabled
                            ? 'Visible'
                            : 'Hidden'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {section.subtitle || section.title}
                    </p>
                  </div>
                </div>

                {/* Actions: Reorder, Toggle, Expand */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, -1)}
                      title="Move Section Up"
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === hc.sections.length - 1}
                      onClick={() => moveSection(idx, 1)}
                      title="Move Section Down"
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-l border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <SwitchToggle
                    checked={section.enabled}
                    onChange={(next) => updateSection(section.id, { enabled: next })}
                    ariaLabel={`Show ${section.label} on homepage`}
                  />

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : section.id)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Section Options */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 rounded-b-xl space-y-4">
                  {/* Hero Section Controls */}
                  {section.id === 'hero' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Manage Hero video uploads, slide headlines, Explore button, and mobile phone-view layout inside{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">Hero Video</span> settings.
                      </div>
                      {onNavigateSettingsTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateSettingsTab('Hero Video')}
                          className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Open Hero Video Settings</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Trust Highlights Controls */}
                  {section.id === 'trust_highlights' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div>
                          Currently showing: Inside Dhaka{' '}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            ৳{form.shippingInsideDhaka}
                          </span>
                          {' · '}Outside Dhaka{' '}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            ৳{form.shippingOutsideDhaka}
                          </span>
                          {' · '}Free Shipping{' '}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            ৳{form.freeShippingThreshold}+
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Delivery fees shown in this banner come directly from your Delivery Charges &amp; General settings.
                        </p>
                      </div>
                      {onNavigateSettingsTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateSettingsTab('Delivery Charges')}
                          className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <span>Edit Delivery Charges</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Heading Input for content sections */}
                  {(section.id === 'featured_categories' ||
                    section.id === 'bestselling' ||
                    section.id === 'phone_cases' ||
                    section.id === 'explore_more' ||
                    section.id === 'customer_reviews' ||
                    section.id === 'trusted_by') && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Section Heading
                      </label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) =>
                          updateSection(section.id, { title: e.target.value })
                        }
                        className="w-full max-w-lg px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}

                  {/* Bestselling Count */}
                  {section.id === 'bestselling' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Products to Show in Bestselling Row
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[3, 4, 5, 6, 8, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              commitHomeConfig({ ...hc, bestsellingLimit: num })
                            }
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                              hc.bestsellingLimit === num
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {num} items
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phone Cases Count */}
                  {section.id === 'phone_cases' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Products to Show per Brand Tab
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[3, 4, 5, 6, 8, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              commitHomeConfig({ ...hc, phoneCasesLimit: num })
                            }
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                              hc.phoneCasesLimit === num
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {num} items
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explore More Grid Settings */}
                  {section.id === 'explore_more' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                          Desktop Product Columns (Explore More &amp; Showcase Rows)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {([2, 3, 4, 5] as const).map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => updateStorefront({ shopPageColumns: col })}
                              className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                sf.shopPageColumns === col
                                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {col} Columns
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Show Out-of-Stock Products
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Display sold-out items with an Out of Stock badge instead of hiding them
                          </div>
                        </div>
                        <SwitchToggle
                          checked={sf.showOutOfStock}
                          onChange={(next) => updateStorefront({ showOutOfStock: next })}
                          ariaLabel="Show out of stock products"
                        />
                      </div>
                    </div>
                  )}

                  {/* Customer Reviews Controls */}
                  {section.id === 'customer_reviews' && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Show only 5-star reviews on Homepage
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Only display 5-star rated verified reviews inside this homepage carousel
                          </div>
                        </div>
                        <SwitchToggle
                          checked={sf.homeReviewsOnlyFiveStar !== false}
                          onChange={(next) =>
                            updateStorefront({ homeReviewsOnlyFiveStar: next })
                          }
                          ariaLabel="Homepage show only 5-star reviews"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Customer Reviews Feature Enabled
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Master switch for reviews across both Homepage and Product pages
                          </div>
                        </div>
                        <SwitchToggle
                          checked={sf.reviewsEnabled !== false}
                          onChange={(next) => updateStorefront({ reviewsEnabled: next })}
                          ariaLabel="Enable customer reviews globally"
                        />
                      </div>
                    </div>
                  )}

                  {/* Trusted By Subtitle */}
                  {section.id === 'trusted_by' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Section Subtitle / Description
                      </label>
                      <textarea
                        rows={2}
                        value={section.subtitle || ''}
                        onChange={(e) =>
                          updateSection(section.id, { subtitle: e.target.value })
                        }
                        className="w-full max-w-lg px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
