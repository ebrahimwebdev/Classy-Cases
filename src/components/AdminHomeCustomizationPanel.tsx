import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Film,
  GripVertical,
  LayoutGrid,
  Lock,
  MoreVertical,
  Plus,
  RotateCcw,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Category,
  HomeCustomizationConfig,
  HomeSectionConfig,
  HomeSectionType,
  ProductGridSourceMode,
  StorefrontPageConfig,
  StoreSettings,
} from '../types';
import {
  HOME_LAYOUT_PRESETS,
  mergeHomeCustomization,
} from '../utils/homeCustomizationDefaults';

interface AdminHomeCustomizationPanelProps {
  form: StoreSettings;
  sf: StorefrontPageConfig;
  categories?: Category[];
  hasUnsavedChanges?: boolean;
  updateStorefront: (patch: Partial<StorefrontPageConfig>) => void;
  onDiscardChanges?: () => void;
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
        checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SectionWireframe({ section }: { section: HomeSectionConfig }) {
  if (section.type === 'scrolling_notice') {
    return (
      <div className="w-14 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center px-1.5 shrink-0">
        <div className="w-full h-2.5 rounded-sm bg-indigo-100 dark:bg-indigo-500/20 flex items-center gap-1 px-1">
          <span className="w-3 h-1 rounded-full bg-indigo-400" />
          <span className="w-4 h-1 rounded-full bg-indigo-300" />
          <span className="w-2 h-1 rounded-full bg-indigo-400" />
        </div>
      </div>
    );
  }

  if (section.type === 'hero') {
    return (
      <div className="w-14 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-indigo-50/70 dark:bg-slate-800/80 p-1.5 flex flex-col justify-between shrink-0">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="w-5 h-1 rounded bg-indigo-400/80" />
            <div className="w-7 h-1 rounded bg-slate-300 dark:bg-slate-600" />
          </div>
          <div className="w-3.5 h-3.5 rounded bg-indigo-200 dark:bg-indigo-500/30" />
        </div>
        <div className="flex items-center justify-center gap-0.5">
          <span className="w-2 h-0.5 rounded-full bg-indigo-500" />
          <span className="w-1 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>
      </div>
    );
  }

  if (section.type === 'featured_categories') {
    const circle = section.categoryShape === 'circle';
    return (
      <div className="w-14 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-1.5 flex items-center justify-between gap-1 shrink-0">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span
              className={`w-2.5 h-2.5 bg-indigo-200 dark:bg-indigo-500/30 ${
                circle ? 'rounded-full' : 'rounded-sm'
              }`}
            />
            <span className="w-2 h-0.5 rounded bg-slate-300 dark:bg-slate-600" />
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'brand_strip' || section.type === 'trusted_by') {
    return (
      <div className="w-14 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-1.5 flex items-center justify-center gap-1 shrink-0">
        <span className="w-3 h-2 rounded-sm bg-slate-300 dark:bg-slate-600" />
        <span className="w-3.5 h-2 rounded-sm bg-indigo-300 dark:bg-indigo-500/40" />
        <span className="w-3 h-2 rounded-sm bg-slate-300 dark:bg-slate-600" />
      </div>
    );
  }

  if (section.type === 'promo_banner') {
    return (
      <div className="w-14 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-rose-50/70 dark:bg-rose-950/30 px-1.5 py-1 flex items-center justify-between shrink-0">
        <div className="space-y-1">
          <div className="w-6 h-1 rounded bg-rose-400/70" />
          <div className="w-4 h-1 rounded bg-slate-300 dark:bg-slate-600" />
          <div className="w-3.5 h-1.5 rounded-sm bg-rose-500/60" />
        </div>
        <div className="w-3.5 h-5 rounded-sm bg-rose-200/80 dark:bg-rose-500/20" />
      </div>
    );
  }

  if (section.type === 'trust_highlights') {
    return (
      <div className="w-14 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-1 grid grid-cols-3 gap-1 items-center shrink-0">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-5 rounded-sm bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/80" />
          </div>
        ))}
      </div>
    );
  }

  if (section.type === 'customer_reviews') {
    return (
      <div className="w-14 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-1 grid grid-cols-2 gap-1 items-center shrink-0">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-6 rounded-sm bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 p-0.5 flex flex-col justify-between"
          >
            <span className="w-3 h-0.5 rounded bg-amber-400" />
            <span className="w-4 h-0.5 rounded bg-slate-300 dark:bg-slate-500" />
            <span className="w-2.5 h-0.5 rounded bg-slate-200 dark:bg-slate-600" />
          </div>
        ))}
      </div>
    );
  }

  // Default: product_grid wireframe (4 product cards)
  return (
    <div className="w-14 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-1 grid grid-cols-4 gap-0.5 items-center shrink-0">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-6 rounded-[2px] bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 flex flex-col justify-between p-[1px]"
        >
          <div className="w-full h-3 rounded-[1px] bg-indigo-100/80 dark:bg-indigo-500/20" />
          <div className="w-full h-0.5 rounded bg-slate-300 dark:bg-slate-500" />
        </div>
      ))}
    </div>
  );
}

function getSectionTypeMeta(section: HomeSectionConfig): {
  primaryName: string;
  styleMeta: string;
  detailLine: string;
} {
  if (section.type === 'scrolling_notice') {
    const count = section.notices?.filter((n) => n.trim()).length || 0;
    return {
      primaryName: 'Scrolling Notice',
      styleMeta: 'Scrolling ticker',
      detailLine: `${count} ${count === 1 ? 'notice' : 'notices'}`,
    };
  }
  if (section.type === 'hero') {
    return {
      primaryName: 'Hero',
      styleMeta: 'Slider · Video reel',
      detailLine: 'Active Hero Video Reels',
    };
  }
  if (section.type === 'featured_categories') {
    const shape = section.categoryShape === 'circle' ? 'Circular' : 'Rounded';
    return {
      primaryName: 'Featured Categories',
      styleMeta: `Category slider · ${shape}`,
      detailLine: `${section.title} · Automatic: featured categories`,
    };
  }
  if (section.type === 'brand_strip') {
    return {
      primaryName: 'Brand Strip',
      styleMeta: 'Logo carousel',
      detailLine: 'Automatic: all top brands',
    };
  }
  if (section.type === 'promo_banner') {
    return {
      primaryName: 'Promo Banner',
      styleMeta: 'Promotional banner',
      detailLine: section.title || 'Promotional banner',
    };
  }
  if (section.type === 'trust_highlights') {
    return {
      primaryName: 'Trust Highlights',
      styleMeta: 'Service strip',
      detailLine: 'Shipping, payment & warranty guarantees',
    };
  }
  if (section.type === 'customer_reviews') {
    return {
      primaryName: 'Customer Reviews',
      styleMeta: 'Testimonials marquee',
      detailLine: section.title || 'Customer Reviews',
    };
  }
  if (section.type === 'trusted_by') {
    return {
      primaryName: 'Trusted By',
      styleMeta: 'Partners & couriers',
      detailLine: section.title || 'Trusted by Retail Partners, Couriers & Payment Networks',
    };
  }

  // product_grid
  const mode = section.sourceMode || 'category';
  const limit = section.limit || 5;
  if (mode === 'bestselling') {
    return {
      primaryName: 'Product Grid',
      styleMeta: 'Top products',
      detailLine: `${section.title} · Top ${limit} products`,
    };
  }
  if (mode === 'brand_tabs') {
    return {
      primaryName: 'Product Grid',
      styleMeta: 'Brand tabs row',
      detailLine: `${section.title} · ${limit} products per brand`,
    };
  }
  if (mode === 'protector_tabs') {
    return {
      primaryName: 'Product Grid',
      styleMeta: 'Camera & Screen tabs',
      detailLine: `${section.title} · Camera & Screen Protector tabs`,
    };
  }
  if (mode === 'explore_all') {
    return {
      primaryName: 'Product Grid',
      styleMeta: 'All products grid',
      detailLine: `${section.title} · Carousel & full catalog`,
    };
  }
  if (mode === 'category') {
    return {
      primaryName: 'Product Grid',
      styleMeta: 'Product row',
      detailLine: `${section.title} · Category: ${section.categoryName || 'Uncategorized'}`,
    };
  }
  if (mode === 'discounted') {
    return {
      primaryName: 'Product Grid',
      styleMeta: 'Flash discounts row',
      detailLine: `${section.title} · Top ${limit} discounted products`,
    };
  }
  if (mode === 'featured') {
    return {
      primaryName: 'Product Grid',
      styleMeta: 'Featured row',
      detailLine: `${section.title} · ${limit} featured products`,
    };
  }
  return {
    primaryName: 'Product Grid',
    styleMeta: 'Newest products',
    detailLine: `${section.title} · Newest ${limit} products`,
  };
}

const ADD_SECTION_OPTIONS: Array<{
  type: HomeSectionType;
  sourceMode?: ProductGridSourceMode;
  title: string;
  description: string;
}> = [
  {
    type: 'product_grid',
    sourceMode: 'category',
    title: 'Product Grid (Category Row)',
    description: 'Showcase products from a specific brand/category, newest arrivals, or flash deals.',
  },
  {
    type: 'product_grid',
    sourceMode: 'protector_tabs',
    title: 'Screen & Camera Protectors',
    description: 'Showcase Camera Protector and Screen Protector filter tabs before Explore More Products.',
  },
  {
    type: 'promo_banner',
    title: 'Promo Banner',
    description: 'Full-width promotional callout banner with headline, badge & shop CTA button.',
  },
  {
    type: 'scrolling_notice',
    title: 'Scrolling Notice',
    description: 'Top announcement marquee bar for shipping offers, coupons, and news.',
  },
  {
    type: 'brand_strip',
    title: 'Brand Strip',
    description: 'Compact horizontal strip of all brand logos linking directly to category pages.',
  },
  {
    type: 'featured_categories',
    title: 'Featured Categories Slider',
    description: 'Auto-sliding category cards slider in rounded or circular shape.',
  },
  {
    type: 'customer_reviews',
    title: 'Customer Reviews Carousel',
    description: 'Verified buyer feedback & star ratings marquee.',
  },
  {
    type: 'trust_highlights',
    title: 'Trust Highlights Strip',
    description: '3-card strip for secure payments, fast courier & warranty guarantees.',
  },
];

export function AdminHomeCustomizationPanel({
  form,
  sf,
  categories = [],
  hasUnsavedChanges = false,
  updateStorefront,
  onDiscardChanges,
  onOpenStorefront,
  onNavigateSettingsTab,
  onStatusMessage,
}: AdminHomeCustomizationPanelProps) {
  const hc = useMemo(
    () => mergeHomeCustomization(sf.homeCustomization),
    [sf.homeCustomization]
  );

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [newNoticeInput, setNewNoticeInput] = useState('');
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        openMenuId &&
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openMenuId]);

  const categoryNameSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of categories) {
      if (c.active !== false && c.name.trim()) {
        set.add(c.name.trim().toLowerCase());
      }
    }
    return set;
  }, [categories]);

  const activeCategoryNames = useMemo(
    () =>
      categories
        .filter((c) => c.active !== false && c.name.trim())
        .map((c) => c.name.trim()),
    [categories]
  );

  const commitHomeConfig = (next: HomeCustomizationConfig) => {
    updateStorefront({ homeCustomization: next });
  };

  const updateSection = (id: string, patch: Partial<HomeSectionConfig>) => {
    const nextSections = hc.sections.map((section) =>
      section.id === id ? { ...section, ...patch } : section
    );
    commitHomeConfig({ ...hc, sections: nextSections });
  };

  const reorderSections = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= hc.sections.length ||
      toIndex >= hc.sections.length
    ) {
      return;
    }
    const nextSections = [...hc.sections];
    const [moved] = nextSections.splice(fromIndex, 1);
    nextSections.splice(toIndex, 0, moved);
    commitHomeConfig({ ...hc, sections: nextSections });
  };

  const duplicateSection = (section: HomeSectionConfig) => {
    const clone: HomeSectionConfig = {
      ...section,
      id: `${section.type}_${Date.now()}`,
      locked: false,
      title: `${section.title} (Copy)`,
      notices: section.notices ? [...section.notices] : undefined,
    };
    const idx = hc.sections.findIndex((s) => s.id === section.id);
    const nextSections = [...hc.sections];
    nextSections.splice(idx + 1, 0, clone);
    commitHomeConfig({ ...hc, sections: nextSections });
    setOpenMenuId(null);
  };

  const deleteSection = (id: string) => {
    const nextSections = hc.sections.filter((s) => s.id !== id);
    commitHomeConfig({ ...hc, sections: nextSections });
    if (editingSectionId === id) setEditingSectionId(null);
    setOpenMenuId(null);
  };

  const handleAddSection = (opt: (typeof ADD_SECTION_OPTIONS)[number]) => {
    const id = `${opt.type}_${Date.now()}`;
    const defaultCategory = activeCategoryNames[0] || 'Motorola';
    let created: HomeSectionConfig;

    if (opt.type === 'scrolling_notice') {
      created = {
        id,
        type: 'scrolling_notice',
        label: 'Scrolling Notice',
        enabled: true,
        title: 'Store Announcements',
        notices: [
          'Free shipping on orders ৳1,500+ across Bangladesh',
          'Same-day dispatch on orders confirmed before 4 PM',
        ],
      };
    } else if (opt.type === 'promo_banner') {
      created = {
        id,
        type: 'promo_banner',
        label: 'Promo Banner',
        enabled: true,
        title: 'MagSafe & Armor Series Drop',
        subtitle: 'Limited-edition protective phone cases engineered for clean magnetic grip.',
        promoBadge: 'Featured Drop',
        promoCtaLabel: 'Shop Collection',
        promoTargetCategory: 'All',
        promoTheme: 'maroon',
      };
    } else if (opt.type === 'product_grid') {
      const mode = opt.sourceMode || 'category';
      created = {
        id,
        type: 'product_grid',
        label: 'Product Grid',
        enabled: true,
        title:
          mode === 'protector_tabs'
            ? 'Screen & Camera Protectors'
            : `${defaultCategory} Collection`,
        sourceMode: mode,
        ...(mode === 'category' ? { categoryName: defaultCategory } : {}),
        limit: mode === 'protector_tabs' ? 5 : 4,
      };
    } else if (opt.type === 'brand_strip') {
      created = {
        id,
        type: 'brand_strip',
        label: 'Brand Strip',
        enabled: true,
        title: 'Shop by Brand',
      };
    } else if (opt.type === 'featured_categories') {
      created = {
        id,
        type: 'featured_categories',
        label: 'Featured Categories',
        enabled: true,
        title: 'Featured Categories',
        categoryShape: 'rounded',
      };
    } else if (opt.type === 'customer_reviews') {
      created = {
        id,
        type: 'customer_reviews',
        label: 'Customer Reviews',
        enabled: true,
        title: 'Customer Reviews',
      };
    } else {
      created = {
        id,
        type: opt.type,
        label: opt.title,
        enabled: true,
        title: opt.title,
      };
    }

    commitHomeConfig({
      ...hc,
      sections: [...hc.sections, created],
    });
    setAddModalOpen(false);
    setEditingSectionId(created.id);
    onStatusMessage?.('Section added to Page Order. Customize it and click Save Changes.');
  };

  const applyPreset = (presetId: string) => {
    const preset = HOME_LAYOUT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    commitHomeConfig(mergeHomeCustomization(preset.config));
    setPresetsModalOpen(false);
    onStatusMessage?.(`Applied "${preset.name}" layout. Click Save Changes to publish.`);
  };

  const editingSection = hc.sections.find((s) => s.id === editingSectionId) || null;
  const visibleCount = hc.sections.filter((s) => s.enabled).length;

  return (
    <div className="space-y-4">
      {/* Action Toolbar matching reference header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Drag rows to reorder homepage sections, toggle visibility, or click Edit to customize.
        </p>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {onDiscardChanges && (
            <button
              type="button"
              disabled={!hasUnsavedChanges}
              onClick={onDiscardChanges}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:pointer-events-none inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard Changes</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setPresetsModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Pre Layouts</span>
          </button>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Section</span>
          </button>
        </div>
      </div>

      {/* Main Page Order Container (matches reference single-card layout) */}
      <div
        ref={menuContainerRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-visible"
      >
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Page Order
          </h2>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tabular-nums">
            {visibleCount} of {hc.sections.length} visible
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {hc.sections.map((section, idx) => {
            const meta = getSectionTypeMeta(section);
            const missingCategoryWarning =
              section.type === 'product_grid' &&
              section.sourceMode === 'category' &&
              section.categoryName &&
              categories.length > 0 &&
              !categoryNameSet.has(section.categoryName.trim().toLowerCase());

            return (
              <div
                key={section.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverIndex !== idx) setDragOverIndex(idx);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== idx) {
                    reorderSections(dragIndex, idx);
                  }
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={`px-3 sm:px-5 py-3 flex items-center gap-3 transition-colors ${
                  dragOverIndex === idx && dragIndex !== idx
                    ? 'bg-indigo-50/60 dark:bg-indigo-500/10 border-t-2 border-t-indigo-500'
                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                } ${!section.enabled ? 'opacity-65' : ''}`}
              >
                {/* 6-dot drag handle */}
                <button
                  type="button"
                  title="Drag to reorder"
                  className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
                >
                  <GripVertical className="w-4 h-4" />
                </button>

                {/* Mini Wireframe Preview */}
                <SectionWireframe section={section} />

                {/* Section Title & Metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {meta.primaryName}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {meta.styleMeta}
                    </span>
                    {section.locked && (
                      <Lock
                        className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {meta.detailLine}
                  </div>
                </div>

                {/* Optional Missing Category Pill */}
                {missingCategoryWarning && (
                  <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 shrink-0">
                    The chosen category is no longer available
                  </span>
                )}

                {/* Right Row Controls: Switch, Edit, More Menu */}
                <div className="flex items-center gap-2 sm:gap-2.5 ml-auto shrink-0 relative">
                  <SwitchToggle
                    checked={section.enabled}
                    onChange={(next) => updateSection(section.id, { enabled: next })}
                    ariaLabel={`Toggle ${meta.primaryName}`}
                  />

                  <button
                    type="button"
                    title="Edit"
                    aria-label={`Edit ${meta.primaryName}`}
                    onClick={() => setEditingSectionId(section.id)}
                    className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <SquarePen className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    title="More actions"
                    aria-label={`More actions for ${meta.primaryName}`}
                    onClick={() =>
                      setOpenMenuId((prev) => (prev === section.id ? null : section.id))
                    }
                    className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenuId === section.id && (
                    <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionId(section.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <SquarePen className="w-3.5 h-3.5" />
                        <span>Edit Section</span>
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          reorderSections(idx, idx - 1);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>Move Up</span>
                      </button>
                      <button
                        type="button"
                        disabled={idx === hc.sections.length - 1}
                        onClick={() => {
                          reorderSections(idx, idx + 1);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>Move Down</span>
                      </button>
                      {section.type !== 'hero' && (
                        <button
                          type="button"
                          onClick={() => duplicateSection(section)}
                          className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Duplicate</span>
                        </button>
                      )}
                      {!section.locked && (
                        <button
                          type="button"
                          onClick={() => deleteSection(section.id)}
                          className="w-full px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 mt-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Section</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Section Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Edit {getSectionTypeMeta(editingSection).primaryName}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure content and layout, then Save Changes to publish.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSectionId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Show on Homepage
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Toggle whether this section appears on your live storefront home page
                  </div>
                </div>
                <SwitchToggle
                  checked={editingSection.enabled}
                  onChange={(next) =>
                    updateSection(editingSection.id, { enabled: next })
                  }
                  ariaLabel="Toggle section visibility"
                />
              </div>

              {/* Scrolling Notice Editor */}
              {editingSection.type === 'scrolling_notice' && (
                <div className="space-y-3">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">
                    Ticker Announcements
                  </div>
                  <div className="space-y-2">
                    {(editingSection.notices || []).map((notice, nIdx) => (
                      <div key={nIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={notice}
                          onChange={(e) => {
                            const next = [...(editingSection.notices || [])];
                            next[nIdx] = e.target.value;
                            updateSection(editingSection.id, { notices: next });
                          }}
                          className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (editingSection.notices || []).filter(
                              (_, i) => i !== nIdx
                            );
                            updateSection(editingSection.id, { notices: next });
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newNoticeInput}
                      onChange={(e) => setNewNoticeInput(e.target.value)}
                      placeholder="Add new announcement text..."
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newNoticeInput.trim();
                        if (!val) return;
                        updateSection(editingSection.id, {
                          notices: [...(editingSection.notices || []), val],
                        });
                        setNewNoticeInput('');
                      }}
                      className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Hero Editor */}
              {editingSection.type === 'hero' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Hero video reels, headlines, Explore CTA button, and mobile-view text positioning are managed in the Hero Video editor.
                  </p>
                  {onNavigateSettingsTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSectionId(null);
                        onNavigateSettingsTab('Hero Video');
                      }}
                      className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Open Hero Video Settings</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Trust Highlights Info */}
              {editingSection.type === 'trust_highlights' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="text-slate-700 dark:text-slate-200">
                    Inside Dhaka: <strong>৳{form.shippingInsideDhaka}</strong> · Outside Dhaka:{' '}
                    <strong>৳{form.shippingOutsideDhaka}</strong> · Free Shipping:{' '}
                    <strong>৳{form.freeShippingThreshold}+</strong>
                  </div>
                  {onNavigateSettingsTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSectionId(null);
                        onNavigateSettingsTab('Delivery Charges');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Edit Delivery Charges</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Heading Field for most content sections */}
              {editingSection.type !== 'scrolling_notice' &&
                editingSection.type !== 'hero' &&
                editingSection.type !== 'trust_highlights' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Section Heading
                    </label>
                    <input
                      type="text"
                      value={editingSection.title}
                      onChange={(e) =>
                        updateSection(editingSection.id, { title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

              {/* Featured Categories Shape */}
              {editingSection.type === 'featured_categories' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Category Card Shape
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['rounded', 'circle'] as const).map((shape) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() =>
                          updateSection(editingSection.id, { categoryShape: shape })
                        }
                        className={`py-2 px-3 rounded-lg border font-semibold capitalize cursor-pointer ${
                          (editingSection.categoryShape || 'rounded') === shape
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Grid Options */}
              {editingSection.type === 'product_grid' && (
                <div className="space-y-4">
                  {editingSection.sourceMode !== 'explore_all' &&
                    editingSection.sourceMode !== 'brand_tabs' &&
                    editingSection.sourceMode !== 'protector_tabs' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Products Source
                          </label>
                          <select
                            value={editingSection.sourceMode || 'category'}
                            onChange={(e) =>
                              updateSection(editingSection.id, {
                                sourceMode: e.target.value as ProductGridSourceMode,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                          >
                            <option value="bestselling">Bestselling / Top Products</option>
                            <option value="category">Specific Category / Brand</option>
                            <option value="newest">Newest Arrivals</option>
                            <option value="discounted">On Sale / Discounted</option>
                            <option value="featured">Featured Picks</option>
                          </select>
                        </div>

                        {(editingSection.sourceMode || 'category') === 'category' && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Category
                            </label>
                            <select
                              value={editingSection.categoryName || ''}
                              onChange={(e) =>
                                updateSection(editingSection.id, {
                                  categoryName: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                            >
                              <option value="">All Categories</option>
                              {activeCategoryNames.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}

                  {editingSection.sourceMode !== 'explore_all' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Products to Show
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[3, 4, 5, 6, 8, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              const nextSections = hc.sections.map((s) =>
                                s.id === editingSection.id ? { ...s, limit: num } : s
                              );
                              commitHomeConfig({
                                ...hc,
                                sections: nextSections,
                                ...(editingSection.id === 'bestselling'
                                  ? { bestsellingLimit: num }
                                  : {}),
                                ...(editingSection.id === 'phone_cases'
                                  ? { phoneCasesLimit: num }
                                  : {}),
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                              (editingSection.limit || 5) === num
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Desktop Columns
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {([2, 3, 4, 5] as const).map((col) => {
                        const activeCol =
                          editingSection.sourceMode === 'explore_all'
                            ? sf.shopPageColumns
                            : editingSection.columns || sf.shopPageColumns;
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              if (editingSection.sourceMode === 'explore_all') {
                                updateStorefront({ shopPageColumns: col });
                              } else {
                                updateSection(editingSection.id, { columns: col });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                              activeCol === col
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {col} Columns
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Promo Banner Options */}
              {editingSection.type === 'promo_banner' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Description / Sub-headline
                    </label>
                    <textarea
                      rows={2}
                      value={editingSection.subtitle || ''}
                      onChange={(e) =>
                        updateSection(editingSection.id, { subtitle: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Badge Label
                      </label>
                      <input
                        type="text"
                        value={editingSection.promoBadge || ''}
                        onChange={(e) =>
                          updateSection(editingSection.id, { promoBadge: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={editingSection.promoCtaLabel || ''}
                        onChange={(e) =>
                          updateSection(editingSection.id, { promoCtaLabel: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Target Category
                      </label>
                      <select
                        value={editingSection.promoTargetCategory || 'All'}
                        onChange={(e) =>
                          updateSection(editingSection.id, {
                            promoTargetCategory: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      >
                        <option value="All">All Products</option>
                        {activeCategoryNames.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Banner Theme
                      </label>
                      <select
                        value={editingSection.promoTheme || 'maroon'}
                        onChange={(e) =>
                          updateSection(editingSection.id, {
                            promoTheme: e.target.value as 'maroon' | 'cream' | 'dark',
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      >
                        <option value="maroon">Signature Maroon</option>
                        <option value="cream">Warm Cream</option>
                        <option value="dark">Espresso Dark</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Optional Banner Image URL (HTTPS)
                    </label>
                    <input
                      type="text"
                      value={editingSection.promoImageUrl || ''}
                      onChange={(e) =>
                        updateSection(editingSection.id, { promoImageUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Customer Reviews Options */}
              {editingSection.type === 'customer_reviews' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Show only 5-star reviews
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Filter homepage Customer Reviews marquee to 5-star ratings only
                      </div>
                    </div>
                    <SwitchToggle
                      checked={sf.homeReviewsOnlyFiveStar !== false}
                      onChange={(next) =>
                        updateStorefront({ homeReviewsOnlyFiveStar: next })
                      }
                      ariaLabel="Homepage 5-star reviews only"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Reviews Enabled Globally
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Master switch for reviews across homepage and product pages
                      </div>
                    </div>
                    <SwitchToggle
                      checked={sf.reviewsEnabled !== false}
                      onChange={(next) => updateStorefront({ reviewsEnabled: next })}
                      ariaLabel="Enable reviews globally"
                    />
                  </div>
                </div>
              )}

              {/* Trusted By Subtitle */}
              {editingSection.type === 'trusted_by' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Section Description
                  </label>
                  <textarea
                    rows={3}
                    value={editingSection.subtitle || ''}
                    onChange={(e) =>
                      updateSection(editingSection.id, { subtitle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/50">
              <button
                type="button"
                onClick={onOpenStorefront}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Preview Storefront
              </button>
              <button
                type="button"
                onClick={() => setEditingSectionId(null)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Add Section
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose a section block to append to your Homepage Page Order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              {ADD_SECTION_OPTIONS.map((opt, idx) => (
                <button
                  key={`${opt.type}-${idx}`}
                  type="button"
                  onClick={() => handleAddSection(opt)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {opt.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {opt.description}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pre Layouts Modal */}
      {presetsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Pre Layouts
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Apply a curated homepage section order preset in one click.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPresetsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
              {HOME_LAYOUT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {preset.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
