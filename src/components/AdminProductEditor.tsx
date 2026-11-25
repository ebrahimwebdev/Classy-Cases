import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  AlignLeft,
  ArrowLeft,
  Bold,
  Box,
  ChevronDown,
  ClipboardCheck,
  DollarSign,
  ExternalLink,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  MessageSquareMore,
  Plus,
  Power,
  Quote,
  SlidersHorizontal,
  Sparkles,
  Strikethrough,
  Tag,
  Trash2,
  Truck,
  Underline,
  X,
} from 'lucide-react';
import type {
  Category,
  Product,
  ProductSpecification,
  ProductVariant,
  ProductVariantOption,
} from '../types';
import { buildHierarchicalCategories } from '../utils/categoryTree';

export interface PresetImageOption {
  label: string;
  url: string;
}

export interface ProductEditorPayload {
  title: string;
  slug: string;
  sku: string;
  category: string;
  brand: string;
  alsoShowIn: string[];
  brandModels: string[];
  variantOptions: ProductVariantOption[];
  variants: ProductVariant[];
  price: number;
  originalPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  trackStock: boolean;
  preOrderMode: 'store_default' | 'allow' | 'disallow';
  requiresShipping: boolean;
  weightKg: number;
  shippingClass: string;
  shortDescription: string;
  description: string;
  specifications: ProductSpecification[];
  customerPrompt: string;
  seoTitle: string;
  seoDescription: string;
  image: string;
  galleryImages: string[];
  active: boolean;
  featured: boolean;
}

interface AdminProductEditorProps {
  editingProduct: Product | null;
  categories: Category[];
  presetImages: PresetImageOption[];
  saving?: boolean;
  onCancel: () => void;
  onSave: (payload: ProductEditorPayload) => Promise<void>;
  onCreateCategory?: (name: string) => Promise<void>;
  onViewStorefront?: () => void;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function RichToolbar({ onInsert }: { onInsert: (snippet: string) => void }) {
  const buttons = [
    { label: 'Bold', icon: <Bold className="w-3.5 h-3.5" />, snippet: '**bold**' },
    { label: 'Italic', icon: <Italic className="w-3.5 h-3.5" />, snippet: '_italic_' },
    { label: 'Underline', icon: <Underline className="w-3.5 h-3.5" />, snippet: '<u>text</u>' },
    { label: 'Strike', icon: <Strikethrough className="w-3.5 h-3.5" />, snippet: '~~text~~' },
  ];
  const textBtns = ['H1', 'H2', 'H3'];

  return (
    <div className="px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-1 text-slate-600 dark:text-slate-400">
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          title={b.label}
          onClick={() => onInsert(b.snippet)}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
        >
          {b.icon}
        </button>
      ))}
      <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
      {textBtns.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onInsert(`\n${'#'.repeat(Number(t[1]))} Heading\n`)}
          className="px-1.5 py-0.5 rounded text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
        >
          {t}
        </button>
      ))}
      <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
      <button
        type="button"
        title="Bullet list"
        onClick={() => onInsert('\n- Feature item')}
        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Numbered list"
        onClick={() => onInsert('\n1. Step or item')}
        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Quote"
        onClick={() => onInsert('\n> Note')}
        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function AdminProductEditor({
  editingProduct,
  categories,
  presetImages,
  saving = false,
  onCancel,
  onSave,
  onCreateCategory,
  onViewStorefront,
}: AdminProductEditorProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'variations'>('details');

  const initialRegular = editingProduct
    ? String(
        editingProduct.originalPrice > editingProduct.price
          ? editingProduct.originalPrice
          : editingProduct.price
      )
    : '0';
  const initialOffer = editingProduct
    ? String(
        editingProduct.originalPrice > editingProduct.price ? editingProduct.price : 0
      )
    : '0';

  const [name, setName] = useState(editingProduct?.title || '');
  const [sku, setSku] = useState(editingProduct?.sku || '');
  const [slug, setSlug] = useState(editingProduct?.slug || '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(editingProduct?.slug));

  const [seoOpen, setSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState(editingProduct?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(editingProduct?.seoDescription || '');

  const [regularPrice, setRegularPrice] = useState(initialRegular);
  const [offerPrice, setOfferPrice] = useState(initialOffer);
  const [costPrice, setCostPrice] = useState(String(editingProduct?.costPrice ?? 0));
  const [onHand, setOnHand] = useState(String(editingProduct?.stock ?? 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(editingProduct?.lowStockThreshold ?? 5)
  );
  const [preOrderMode, setPreOrderMode] = useState<'store_default' | 'allow' | 'disallow'>(
    editingProduct?.preOrderMode || 'store_default'
  );
  const [trackStock, setTrackStock] = useState(editingProduct?.trackStock !== false);

  const [requiresShipping, setRequiresShipping] = useState(
    editingProduct?.requiresShipping !== false
  );
  const [weightKg, setWeightKg] = useState(String(editingProduct?.weightKg ?? 0.5));
  const [shippingClass, setShippingClass] = useState(
    editingProduct?.shippingClass || 'No class'
  );

  const [shortDescription, setShortDescription] = useState(
    editingProduct?.shortDescription || ''
  );
  const [fullDescription, setFullDescription] = useState(editingProduct?.description || '');

  const [specsOpen, setSpecsOpen] = useState(
    Boolean(editingProduct?.specifications && editingProduct.specifications.length > 0)
  );
  const [specifications, setSpecifications] = useState<ProductSpecification[]>(
    editingProduct?.specifications || []
  );

  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [featured, setFeatured] = useState(editingProduct?.featured ?? true);

  const [askCustomerOpen, setAskCustomerOpen] = useState(Boolean(editingProduct?.customerPrompt));
  const [customerPrompt, setCustomerPrompt] = useState(editingProduct?.customerPrompt || '');

  const [brandModels, setBrandModels] = useState<string[]>(
    editingProduct?.brandModels && editingProduct.brandModels.length > 0
      ? editingProduct.brandModels
      : ['Standard Fit']
  );
  const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>(
    editingProduct?.variantOptions && editingProduct.variantOptions.length > 0
      ? editingProduct.variantOptions
      : [{ name: '', values: [] }]
  );
  const [variants, setVariants] = useState<ProductVariant[]>(editingProduct?.variants || []);
  const [optionValueDrafts, setOptionValueDrafts] = useState<Record<number, string>>({});

  const [active, setActive] = useState(editingProduct?.active !== false);

  const [mainImage, setMainImage] = useState(
    editingProduct?.image || presetImages[0]?.url || ''
  );
  const [galleryImages, setGalleryImages] = useState<string[]>(
    editingProduct?.galleryImages || []
  );
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  const [mainCategory, setMainCategory] = useState(
    editingProduct?.category || categories[0]?.name || 'Motorola'
  );
  const [alsoShowIn, setAlsoShowIn] = useState<string[]>(editingProduct?.alsoShowIn || []);
  const [brand, setBrand] = useState(
    editingProduct?.brand || editingProduct?.category || categories[0]?.name || ''
  );
  const [addingCategory, setAddingCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [formError, setFormError] = useState('');
  const [processingImages, setProcessingImages] = useState(0);

  const mainFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  const totalPhotosCount = (mainImage ? 1 : 0) + galleryImages.length;

  function handleNameChange(next: string) {
    setName(next);
    if (!slugManuallyEdited) {
      setSlug(slugify(next));
    }
  }

  function handleGenerateSku() {
    const prefix = (mainCategory || 'CC').slice(0, 3).toUpperCase();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setSku(`${prefix}-${randomCode}`);
  }

  async function optimizeProductImage(file: File): Promise<string> {
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Could not read the selected image file.'));
      };
      reader.onerror = () => reject(new Error('Could not read the selected image file.'));
      reader.readAsDataURL(file);
    });

    const lowerType = file.type.toLowerCase();
    const directTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
    if (file.size <= 450 * 1024 && directTypes.has(lowerType)) {
      return rawDataUrl;
    }

    return await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
        const width = Math.max(1, Math.round((img.width || maxDim) * scale));
        const height = Math.max(1, Math.round((img.height || maxDim) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputType = lowerType === 'image/png' ? 'image/webp' : 'image/jpeg';
        const compressed = canvas.toDataURL(outputType, 0.86);
        const fallback = compressed.startsWith(`data:${outputType}`)
          ? compressed
          : canvas.toDataURL('image/jpeg', 0.86);
        resolve(fallback.length < rawDataUrl.length || !directTypes.has(lowerType) ? fallback : rawDataUrl);
      };
      img.onerror = () => reject(new Error('Unsupported or corrupted image file. Please choose a PNG, JPG, or WEBP file.'));
      img.src = rawDataUrl;
    });
  }

  async function handleFileRead(file: File, onLoaded: (dataUrl: string) => void) {
    const lowerName = file.name.toLowerCase();
    const hasAllowedExt = /\.(png|jpe?g|webp|gif|avif|bmp|jfif)$/i.test(lowerName);
    if (
      (!file.type.startsWith('image/') && !hasAllowedExt) ||
      file.type === 'image/svg+xml' ||
      lowerName.endsWith('.svg')
    ) {
      setFormError('Please upload a PNG, JPG, WEBP, GIF, AVIF, or BMP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Image size must be under 10 MB.');
      return;
    }
    setFormError('');
    setProcessingImages((c) => c + 1);
    try {
      const optimized = await optimizeProductImage(file);
      onLoaded(optimized);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to process selected image.');
    } finally {
      setProcessingImages((c) => Math.max(0, c - 1));
    }
  }

  function rebuildVariants(nextOptions: ProductVariantOption[]) {
    const activeOpts = nextOptions.filter((o) => o.values.length > 0);
    if (activeOpts.length === 0) {
      setVariants([]);
      return;
    }

    const combinations = activeOpts.reduce<string[][]>(
      (acc, opt) => {
        const result: string[][] = [];
        for (const prefix of acc) {
          for (const val of opt.values) {
            result.push([...prefix, val]);
          }
        }
        return result;
      },
      [[]]
    );

    const baseReg = Math.max(0, Number(regularPrice) || 0);
    const baseOffer = Math.max(0, Number(offerPrice) || 0);
    const effectiveBasePrice = baseOffer > 0 && (baseReg === 0 || baseOffer < baseReg) ? baseOffer : baseReg;
    const baseStock = Math.max(0, Math.floor(Number(onHand) || 0));
    const baseSku = (sku || 'CC').trim();

    setVariants((prev) =>
      combinations.map((combo, idx) => {
        const label = combo.join(' / ');
        const existing = prev.find((v) => v.label === label);
        if (existing) return existing;
        const suffix = combo
          .map((part) => part.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase())
          .filter(Boolean)
          .join('-');
        return {
          id: `var-${idx + 1}-${suffix || 'OPT'}`,
          label,
          sku: `${baseSku}-${suffix || idx + 1}`,
          price: effectiveBasePrice,
          stock: baseStock,
          active: true,
        };
      })
    );
  }

  function updateVariantOptions(nextOptions: ProductVariantOption[]) {
    setVariantOptions(nextOptions);
    rebuildVariants(nextOptions);
  }

  function commitOptionValue(optionIndex: number, rawInput: string) {
    const parts = rawInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    const next = variantOptions.map((opt, idx) => {
      if (idx !== optionIndex) return opt;
      const merged = Array.from(new Set([...opt.values, ...parts]));
      return { ...opt, values: merged };
    });
    updateVariantOptions(next);
    setOptionValueDrafts((prev) => ({ ...prev, [optionIndex]: '' }));
  }

  function removeOptionValue(optionIndex: number, valToRemove: string) {
    const next = variantOptions.map((opt, idx) =>
      idx === optionIndex
        ? { ...opt, values: opt.values.filter((v) => v !== valToRemove) }
        : opt
    );
    updateVariantOptions(next);
  }

  async function handleQuickAddCategory() {
    const trimmed = quickCategoryName.trim();
    if (!trimmed || !onCreateCategory) return;
    try {
      setFormError('');
      await onCreateCategory(trimmed);
      setMainCategory(trimmed);
      setQuickCategoryName('');
      setAddingCategory(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create category');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (processingImages > 0) {
      setFormError('Please wait a moment for image upload to finish.');
      return;
    }
    if (name.trim().length < 2) {
      setFormError('Please enter a product name.');
      return;
    }

    const reg = Math.max(0, Number(regularPrice) || 0);
    const off = Math.max(0, Number(offerPrice) || 0);
    const hasValidOffer = off > 0 && (reg === 0 || off < reg);

    const cleanedOptions = variantOptions
      .map((o, idx) => ({
        name: o.name.trim() || `Option ${idx + 1}`,
        values: o.values.filter(Boolean),
      }))
      .filter((o) => o.values.length > 0);

    const modelOption = cleanedOptions.find((o) =>
      /model|device|phone|fit/i.test(o.name)
    );
    const derivedModels =
      modelOption && modelOption.values.length > 0
        ? modelOption.values
        : variants.length > 0 && brandModels.length === 1 && brandModels[0] === 'Standard Fit'
          ? variants.map((v) => v.label)
          : brandModels;

    const payload: ProductEditorPayload = {
      title: name.trim(),
      slug: slug.trim() || slugify(name),
      sku: sku.trim() || `CC-${Math.floor(1000 + Math.random() * 9000)}`,
      category: mainCategory,
      brand: brand.trim(),
      alsoShowIn,
      brandModels: derivedModels.length > 0 ? derivedModels : ['Standard Fit'],
      variantOptions: cleanedOptions,
      variants,
      price: hasValidOffer ? off : reg,
      originalPrice: hasValidOffer ? Math.max(reg, off) : reg,
      costPrice: Math.max(0, Number(costPrice) || 0),
      stock: Math.max(0, Math.floor(Number(onHand) || 0)),
      lowStockThreshold: Math.max(0, Math.floor(Number(lowStockThreshold) || 5)),
      trackStock,
      preOrderMode,
      requiresShipping,
      weightKg: Math.max(0, Number(weightKg) || 0),
      shippingClass,
      shortDescription: shortDescription.trim(),
      description: fullDescription.trim(),
      specifications: specifications.filter((s) => s.label.trim() && s.value.trim()),
      customerPrompt: customerPrompt.trim(),
      seoTitle: seoTitle.trim(),
      seoDescription: seoDescription.trim(),
      image: mainImage || presetImages[0]?.url || '',
      galleryImages: galleryImages.slice(0, 4),
      active,
      featured,
    };

    try {
      await onSave(payload);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save product. Please try again.');
    }
  }

  const canSubmit = name.trim().length >= 2 && !saving && processingImages === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-12">
      {/* Sticky Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Back to products"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {editingProduct && onViewStorefront && (
            <button
              type="button"
              onClick={onViewStorefront}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/70 inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View</span>
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              canSubmit
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>
              {processingImages > 0
                ? 'Processing image...'
                : saving
                  ? 'Saving...'
                  : editingProduct
                    ? 'Save Changes'
                    : 'Create Product'}
            </span>
          </button>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs font-medium text-rose-700 dark:text-rose-300">
          {formError}
        </div>
      )}

      {/* Underline Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`pb-2.5 font-semibold border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Product Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('variations')}
          className={`pb-2.5 font-semibold border-b-2 transition-colors ${
            activeTab === 'variations'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Product Variations
        </button>
      </div>

      {activeTab === 'variations' ? (
        <div className="space-y-5">
          {/* Options Card matching screenshot */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold">Options</h2>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>

            <div className="space-y-3">
              {variantOptions.map((opt, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0 w-20">
                      <span>Option {idx + 1}</span>
                      <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => {
                        const next = variantOptions.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item
                        );
                        setVariantOptions(next);
                      }}
                      placeholder="e.g. Color, Model, Size"
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (variantOptions.length === 1) {
                          updateVariantOptions([{ name: '', values: [] }]);
                          setOptionValueDrafts({});
                        } else {
                          updateVariantOptions(variantOptions.filter((_, i) => i !== idx));
                        }
                      }}
                      aria-label={`Remove Option ${idx + 1}`}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/70 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 flex flex-wrap items-center gap-1.5 focus-within:border-indigo-500 bg-white dark:bg-slate-900">
                    {opt.values.map((val) => (
                      <span
                        key={val}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-medium"
                      >
                        <span>{val}</span>
                        <button
                          type="button"
                          onClick={() => removeOptionValue(idx, val)}
                          aria-label={`Remove ${val}`}
                          className="text-indigo-400 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={optionValueDrafts[idx] || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw.includes(',')) {
                          commitOptionValue(idx, raw);
                        } else {
                          setOptionValueDrafts((prev) => ({ ...prev, [idx]: raw }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          commitOptionValue(idx, optionValueDrafts[idx] || '');
                        } else if (
                          e.key === 'Backspace' &&
                          !(optionValueDrafts[idx] || '') &&
                          opt.values.length > 0
                        ) {
                          removeOptionValue(idx, opt.values[opt.values.length - 1]);
                        }
                      }}
                      onBlur={() => {
                        const draft = optionValueDrafts[idx] || '';
                        if (draft.trim()) {
                          commitOptionValue(idx, draft);
                        }
                      }}
                      placeholder="Type values, press Enter or comma..."
                      className="flex-1 min-w-[180px] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none py-0.5 bg-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setVariantOptions((prev) => [...prev, { name: '', values: [] }])
              }
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 inline-flex items-center gap-1.5 pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Option</span>
            </button>
          </section>

          {/* Variants Card matching screenshot */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Variants</h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold tabular-nums">
                {variants.length}
              </span>
            </div>

            {variants.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500 dark:text-slate-400">
                  <Box className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">No variants yet</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Add options above, then save to create the variants.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Variant</th>
                      <th className="py-2.5 px-4 font-medium">SKU</th>
                      <th className="py-2.5 px-4 font-medium text-right">Price (৳)</th>
                      <th className="py-2.5 px-4 font-medium text-right">Stock</th>
                      <th className="py-2.5 px-4 font-medium text-center">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {variants.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{v.label}</td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => {
                              const next = variants.map((item, i) =>
                                i === idx ? { ...item, sku: e.target.value } : item
                              );
                              setVariants(next);
                            }}
                            className="w-36 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <input
                            type="number"
                            min={0}
                            value={v.price}
                            onChange={(e) => {
                              const next = variants.map((item, i) =>
                                i === idx ? { ...item, price: Math.max(0, Number(e.target.value) || 0) } : item
                              );
                              setVariants(next);
                            }}
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-right tabular-nums text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {trackStock && v.stock > 0 && v.stock < 5 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold whitespace-nowrap">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                Low Stock
                              </span>
                            )}
                            <input
                              type="number"
                              min={0}
                              value={v.stock}
                              onChange={(e) => {
                                const next = variants.map((item, i) =>
                                  i === idx ? { ...item, stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) } : item
                                );
                                setVariants(next);
                              }}
                              className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-right tabular-nums text-xs"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={v.active}
                            onChange={(e) => {
                              const next = variants.map((item, i) =>
                                i === idx ? { ...item, active: e.target.checked } : item
                              );
                              setVariants(next);
                            }}
                            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Basics Card */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Box className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xs font-bold">Basics</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="relative">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Magsafe Frosted Syndee Case for Motorola Edge 50"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <span>SKU</span>
                    <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. CC-MOT-001"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateSku}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-500/20 inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <span>URL slug</span>
                    <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="magsafe-frosted-syndee-case"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Collapsible SEO listing */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSeoOpen((v) => !v)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Search engine listing</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${
                        seoOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {seoOpen && (
                    <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/40">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Meta Title
                        </label>
                        <input
                          type="text"
                          value={seoTitle}
                          onChange={(e) => setSeoTitle(e.target.value)}
                          placeholder={name || 'SEO Page Title'}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Meta Description
                        </label>
                        <textarea
                          rows={2}
                          value={seoDescription}
                          onChange={(e) => setSeoDescription(e.target.value)}
                          placeholder="Search snippet summary..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Pricing & Inventory Card */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xs font-bold">Pricing &amp; Inventory</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Regular price (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={regularPrice}
                    onChange={(e) => setRegularPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Offer price (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Cost price (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Large On hand stock box matching reference */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span>On hand</span>
                    <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </label>
                  {trackStock && (Number(onHand) || 0) <= 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                      Out of Stock
                    </span>
                  ) : trackStock && (Number(onHand) || 0) < 5 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Low Stock (&lt; 5)
                    </span>
                  ) : null}
                </div>
                <input
                  type="number"
                  min={0}
                  value={onHand}
                  onChange={(e) => setOnHand(e.target.value)}
                  className="w-full text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none bg-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Low-stock threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Pre-orders when out of stock
                  </label>
                  <select
                    value={preOrderMode}
                    onChange={(e) => setPreOrderMode(e.target.value as typeof preOrderMode)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="store_default">Store default (Settings → General)</option>
                    <option value="allow">Allow pre-orders</option>
                    <option value="disallow">Do not allow</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span>Stock tracking</span>
                  <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="grid grid-cols-2 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-w-xs text-xs">
                  <button
                    type="button"
                    onClick={() => setTrackStock(true)}
                    className={`py-2 font-semibold transition-colors ${
                      trackStock
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    Track stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackStock(false)}
                    className={`py-2 font-semibold border-l border-slate-200 dark:border-slate-800 transition-colors ${
                      !trackStock
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    Don&apos;t track
                  </button>
                </div>
              </div>
            </section>

            {/* Shipping Card */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Truck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xs font-bold flex items-center gap-1">
                  <span>Shipping</span>
                  <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </h2>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <span>Requires shipping</span>
                  <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={requiresShipping}
                  onClick={() => setRequiresShipping((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    requiresShipping ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-slate-900 transition-transform shadow-xs ${
                      requiresShipping ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {requiresShipping && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <span>Weight</span>
                      <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    </label>
                    <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none min-w-0"
                      />
                      <span className="text-slate-500 dark:text-slate-400 font-medium ml-2">kg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Shipping class
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={shippingClass}
                        onChange={(e) => setShippingClass(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      >
                        <option value="No class">No class</option>
                        <option value="Standard Case">Standard Case</option>
                        <option value="Express Courier">Express Courier</option>
                        <option value="Fragile Armor">Fragile Armor</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setShippingClass('Standard Case')}
                        title="Use Standard Case class"
                        className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Description Card */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <AlignLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xs font-bold">Description</h2>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Short description
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <RichToolbar
                    onInsert={(snippet) => setShortDescription((prev) => `${prev}${snippet}`)}
                  />
                  <textarea
                    rows={3}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="One or two lines that sum the product up..."
                    className="w-full p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-y"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Full description
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <RichToolbar
                    onInsert={(snippet) => setFullDescription((prev) => `${prev}${snippet}`)}
                  />
                  <textarea
                    rows={6}
                    value={fullDescription}
                    onChange={(e) => setFullDescription(e.target.value)}
                    placeholder="Features, specifications, what's in the box..."
                    className="w-full p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-y"
                  />
                </div>
              </div>
            </section>

            {/* Key features & specifications */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span>Key features &amp; specifications</span>
                    <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Optional</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!specsOpen && specifications.length === 0) {
                      setSpecifications([{ label: 'Material', value: 'Frosted TPU + Polycarbonate' }]);
                    }
                    setSpecsOpen((v) => !v);
                  }}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 hover:text-indigo-600"
                >
                  <span>Add</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${specsOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
              {specsOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {specifications.map((spec, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                      <input
                        type="text"
                        value={spec.label}
                        onChange={(e) => {
                          const next = [...specifications];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setSpecifications(next);
                        }}
                        placeholder="Feature (e.g. MagSafe)"
                        className="sm:col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
                      />
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => {
                          const next = [...specifications];
                          next[idx] = { ...next[idx], value: e.target.value };
                          setSpecifications(next);
                        }}
                        placeholder="Value (e.g. N52 Strong Ring)"
                        className="sm:col-span-6 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSpecifications((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="sm:col-span-1 p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 justify-self-end"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSpecifications((prev) => [...prev, { label: '', value: '' }])
                    }
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add specification row</span>
                  </button>
                </div>
              )}
            </section>

            {/* More options */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setMoreOptionsOpen((v) => !v)}
                className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/70"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>More options</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${
                    moreOptionsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {moreOptionsOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Feature in Storefront New Arrivals
                    </span>
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
                    />
                  </label>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Quick-edit Compatible Models (comma separated)
                    </label>
                    <input
                      type="text"
                      value={brandModels.join(', ')}
                      onChange={(e) =>
                        setBrandModels(
                          e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Ask the customer for... */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setAskCustomerOpen((v) => !v)}
                className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/70"
              >
                <span className="flex items-center gap-2">
                  <MessageSquareMore className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Ask the customer for...</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${
                    askCustomerOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {askCustomerOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Optional customer instruction prompt
                  </label>
                  <input
                    type="text"
                    value={customerPrompt}
                    onChange={(e) => setCustomerPrompt(e.target.value)}
                    placeholder="e.g. Confirm your exact phone model before dispatch"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800"
                  />
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Status Card */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                <Power className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xs font-bold">Status</h2>
                <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              </div>

              <div className="grid grid-cols-2 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setActive(true)}
                  className={`py-2 font-semibold transition-colors ${
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setActive(false)}
                  className={`py-2 font-semibold border-l border-slate-200 dark:border-slate-800 transition-colors ${
                    !active
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </section>

            {/* Images Card */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <ImageIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <h2 className="text-xs font-bold">Images</h2>
                </div>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                Product photos{' '}
                <span className="font-normal text-slate-400 dark:text-slate-500 tabular-nums">
                  ({totalPhotosCount} / 5)
                </span>
              </div>

              {/* Main Photo Dropzone */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Main photo</span>
                  <button
                    type="button"
                    onClick={() => setShowPresetPicker((v) => !v)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {showPresetPicker ? 'Hide studio library' : 'Choose studio photo'}
                  </button>
                </div>

                {showPresetPicker && (
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    {presetImages.map((img) => (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => {
                          setMainImage(img.url);
                          setShowPresetPicker(false);
                        }}
                        className={`rounded-lg overflow-hidden border-2 aspect-square ${
                          mainImage === img.url ? 'border-indigo-600' : 'border-transparent'
                        }`}
                        title={img.label}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <input
                  ref={mainFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileRead(file, setMainImage);
                    e.target.value = '';
                  }}
                />

                {mainImage ? (
                  <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/60 group">
                    <img
                      src={mainImage}
                      alt={name || 'Main product'}
                      referrerPolicy="no-referrer"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => mainFileRef.current?.click()}
                        className="px-2.5 py-1 rounded-md bg-white/95 dark:bg-slate-900/95 text-[11px] font-semibold text-slate-900 dark:text-slate-100 hover:bg-white"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setMainImage('')}
                        className="px-2.5 py-1 rounded-md bg-rose-600 text-[11px] font-semibold text-white hover:bg-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => mainFileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) void handleFileRead(file, setMainImage);
                    }}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl py-8 px-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Add main photo</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Drag &amp; drop or click to upload (under 10 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Gallery Photos Dropzone */}
              <div className="space-y-2">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Gallery photos
                </span>

                <input
                  ref={galleryFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(
                      0,
                      Math.max(0, 4 - galleryImages.length)
                    );
                    files.forEach((f) =>
                      void handleFileRead(f, (url) =>
                        setGalleryImages((prev) =>
                          prev.length < 4 ? [...prev, url] : prev
                        )
                      )
                    );
                    e.target.value = '';
                  }}
                />

                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {galleryImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800"
                      >
                        <img
                          src={imgUrl}
                          alt={`Gallery ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Remove gallery photo"
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {galleryImages.length < 4 && (
                  <div
                    onClick={() => galleryFileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files || []).slice(
                        0,
                        Math.max(0, 4 - galleryImages.length)
                      );
                      files.forEach((f) =>
                        handleFileRead(f, (url) =>
                          setGalleryImages((prev) =>
                            prev.length < 4 ? [...prev, url] : prev
                          )
                        )
                      );
                    }}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl py-8 px-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Add to gallery</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Drag &amp; drop or click to upload (under 10 MB)
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Category & Brand Card */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3.5 text-xs">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Tag className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xs font-bold">Category &amp; Brand</h2>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <span>Main category</span>
                  <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={mainCategory}
                    onChange={(e) => setMainCategory(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    {buildHierarchicalCategories(categories).map(({ category: c, depth }) => (
                      <option key={c.id} value={c.name}>
                        {depth > 0 ? `${'  '.repeat(depth)}↳ ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAddingCategory((v) => !v)}
                    title="Add new category"
                    className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {addingCategory && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <input
                      type="text"
                      value={quickCategoryName}
                      onChange={(e) => setQuickCategoryName(e.target.value)}
                      placeholder="New category name..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddCategory}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Also show in
                </label>
                <select
                  value={alsoShowIn[0] || ''}
                  onChange={(e) =>
                    setAlsoShowIn(e.target.value ? [e.target.value] : [])
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                >
                  <option value="">None</option>
                  {buildHierarchicalCategories(categories)
                    .filter(({ category: c }) => c.name !== mainCategory)
                    .map(({ category: c, depth }) => (
                      <option key={c.id} value={c.name}>
                        {depth > 0 ? `${'  '.repeat(depth)}↳ ${c.name}` : c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Brand
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Select brand</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="Syndee">Syndee</option>
                    <option value="Classy Cases">Classy Cases</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setBrand(mainCategory)}
                    title="Match main category"
                    className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </form>
  );
}
