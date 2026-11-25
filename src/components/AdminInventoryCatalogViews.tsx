import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Barcode,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudUpload,
  CornerDownRight,
  FolderPlus,
  GripVertical,
  Image as ImageIcon,
  Info,
  Layers,
  LayoutGrid,
  Link2,
  Loader2,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  SquarePen,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { formatTaka } from '../models/phoneCase';
import type { Category, Product } from '../types';
import {
  buildHierarchicalCategories,
  getCategoryAndDescendantNames,
  getTopLevelCategories,
} from '../utils/categoryTree';
import type { ProductEditorPayload } from './AdminProductEditor';

export type InventoryCatalogSection =
  | 'Import Product'
  | 'Categories'
  | 'Brands'
  | 'Warranties'
  | 'Stock Levels'
  | 'Stock Tracker'
  | 'Stock Adjustment'
  | 'Barcodes';

export interface CategoryFormPayload {
  name: string;
  slug?: string;
  parentId?: string;
  description?: string;
  googleCategory?: string;
  seoTitle?: string;
  seoDescription?: string;
  image?: string;
  active?: boolean;
  featured?: boolean;
  shippingClass?: string;
}

interface WarrantyRule {
  id: string;
  title: string;
  duration: string;
  coverage: string;
  active: boolean;
}

interface AdminInventoryCatalogViewsProps {
  section: InventoryCatalogSection;
  products: Product[];
  categories: Category[];
  shippingClasses?: string[];
  onQuickStockChange: (product: Product, delta: number) => Promise<void>;
  onCreateCategory: (payload: CategoryFormPayload | string) => Promise<void>;
  onUpdateCategory?: (id: string, payload: Partial<CategoryFormPayload>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onReorderCategories?: (nextCategories: Category[]) => Promise<void>;
  onAssignProductsToCategory?: (category: Category, selectedProductIds: string[]) => Promise<void>;
  onNewProductInCategory?: (category: Category) => void;
  onSyncCategoriesToFirestore?: () => Promise<void>;
  onCreateProduct: (payload: ProductEditorPayload) => Promise<void>;
  onEditProduct: (product: Product) => void;
}

const DEFAULT_WARRANTIES: WarrantyRule[] = [
  {
    id: 'war-1',
    title: '7-Day Fit & Replacement Guarantee',
    duration: '7 Days',
    coverage: 'Free instant replacement for wrong model fit or manufacturing defect.',
    active: true,
  },
  {
    id: 'war-2',
    title: '6-Month Anti-Yellowing Shield',
    duration: '6 Months',
    coverage: 'Covers crystal-clear and frosted MagSafe TPU back yellowing under normal use.',
    active: true,
  },
  {
    id: 'war-3',
    title: 'MagSafe Ring Adhesion Warranty',
    duration: '90 Days',
    coverage: 'Guaranteed N52 magnetic ring stability and kickstand hinge durability.',
    active: true,
  },
];

function slugifyCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CategoryBrandBadge({ category }: { category: Category }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [category.image]);

  if (category.image && !imgFailed) {
    return (
      <img
        key={category.image}
        src={category.image}
        alt={category.name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-10 h-10 rounded-xl object-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 shrink-0"
      />
    );
  }
  if (category.brandKey === 'motorola') {
    return (
      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0">
        <svg viewBox="0 0 64 64" className="w-6 h-6 text-white" fill="currentColor" aria-hidden="true">
          <path d="M32 6L17 50h5.4l5.2-15.6c1.2-3.6 2.8-5.2 4.4-5.2s3.2 1.6 4.4 5.2L41.6 50H47L32 6zm0 11.4l4.8 14.5c-1.2-2.2-2.8-3.5-4.8-3.5s-3.6 1.3-4.8 3.5L32 17.4z" />
        </svg>
      </div>
    );
  }
  if (category.brandKey === 'vivo') {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#415FFF] flex items-center justify-center shrink-0">
        <span className="text-white font-bold tracking-tight text-xs select-none">vivo</span>
      </div>
    );
  }
  if (category.brandKey === 'xiaomi') {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#FF6900] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 64 64" className="w-5.5 h-5.5 text-white" fill="currentColor" aria-hidden="true">
          <path d="M12 20h23c4.4 0 8 3.6 8 8v16h-7V28c0-1.1-.9-2-2-2H19v18h-7V20zm11 11h7v13h-7V31zm24-11h7v24h-7V20z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
      <ImageIcon className="w-4 h-4" />
    </div>
  );
}

export function AdminInventoryCatalogViews({
  section,
  products,
  categories,
  shippingClasses = [],
  onQuickStockChange,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onAssignProductsToCategory,
  onNewProductInCategory,
  onSyncCategoriesToFirestore,
  onCreateProduct,
  onEditProduct,
}: AdminInventoryCatalogViewsProps) {
  const { user: firebaseUser } = useFirebaseAuth();
  const [allCategoriesEnabled, setAllCategoriesEnabled] = useState(true);
  const [catActionError, setCatActionError] = useState('');
  const [catSyncMsg, setCatSyncMsg] = useState('');
  const [syncingFirestoreCats, setSyncingFirestoreCats] = useState(false);
  const [togglingCatId, setTogglingCatId] = useState<string | null>(null);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [reorderingCats, setReorderingCats] = useState(false);
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [dropTargetCatId, setDropTargetCatId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Assign products to category/sub-category modal
  const [assignModalCategory, setAssignModalCategory] = useState<Category | null>(null);
  const [assignSelectedIds, setAssignSelectedIds] = useState<Set<string>>(new Set());
  const [assignSearch, setAssignSearch] = useState('');
  const [assignFilterTab, setAssignFilterTab] = useState<'all' | 'assigned' | 'brand'>('all');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Add / Edit Category Modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catSlugTouched, setCatSlugTouched] = useState(false);
  const [catParentId, setCatParentId] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catSeoOpen, setCatSeoOpen] = useState(false);
  const [catGoogleCategory, setCatGoogleCategory] = useState('');
  const [catSeoTitle, setCatSeoTitle] = useState('');
  const [catSeoDescription, setCatSeoDescription] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catActive, setCatActive] = useState(true);
  const [catFeatured, setCatFeatured] = useState(false);
  const [catShippingClass, setCatShippingClass] = useState('No class');
  const [customShippingClasses, setCustomShippingClasses] = useState<string[]>([]);
  const [addingShippingClass, setAddingShippingClass] = useState(false);
  const [newShippingClassInput, setNewShippingClassInput] = useState('');
  const [catModalError, setCatModalError] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catImageProcessing, setCatImageProcessing] = useState(false);
  const [catPreviewFailed, setCatPreviewFailed] = useState(false);
  const catFileInputRef = useRef<HTMLInputElement>(null);

  const [warranties, setWarranties] = useState<WarrantyRule[]>(DEFAULT_WARRANTIES);
  const [newWarrantyTitle, setNewWarrantyTitle] = useState('');
  const [newWarrantyDuration, setNewWarrantyDuration] = useState('30 Days');
  const [newWarrantyCoverage, setNewWarrantyCoverage] = useState('');

  const [stockFilter, setStockFilter] = useState<'all' | 'healthy' | 'low' | 'out'>('all');
  const [customAdjustMap, setCustomAdjustMap] = useState<Record<string, string>>({});

  // Import product quick rows
  const [importTitle, setImportTitle] = useState('');
  const [importSku, setImportSku] = useState('');
  const [importCategory, setImportCategory] = useState(categories[0]?.name || 'Motorola');
  const [importPrice, setImportPrice] = useState('450');
  const [importStock, setImportStock] = useState('25');
  const [importMessage, setImportMessage] = useState('');
  const [importing, setImporting] = useState(false);

  const availableShippingClasses = useMemo(() => {
    const base = ['No class', 'Standard Case', 'Fragile Armor', 'Express Courier', ...shippingClasses, ...customShippingClasses];
    if (catShippingClass && !base.includes(catShippingClass)) base.push(catShippingClass);
    return Array.from(new Set(base.filter(Boolean)));
  }, [shippingClasses, customShippingClasses, catShippingClass]);

  const brandSummaries = useMemo(() => {
    const map = new Map<string, { name: string; count: number; totalStock: number }>();
    for (const cat of categories) {
      map.set(cat.name, { name: cat.name, count: 0, totalStock: 0 });
    }
    for (const p of products) {
      const bName = (p.brand || p.category || 'Classy Cases').trim();
      const entry = map.get(bName) || { name: bName, count: 0, totalStock: 0 };
      entry.count += 1;
      entry.totalStock += Math.max(0, p.stock);
      map.set(bName, entry);
    }
    return Array.from(map.values());
  }, [products, categories]);

  const filteredStockProducts = useMemo(() => {
    return products.filter((p) => {
      const isTracked = p.trackStock !== false;
      if (stockFilter === 'out') return isTracked && p.stock <= 0;
      if (stockFilter === 'low') return isTracked && p.stock > 0 && p.stock < 5;
      if (stockFilter === 'healthy') return !isTracked || p.stock >= 5;
      return true;
    });
  }, [products, stockFilter]);

  function openNewCategoryModal(defaultParentId = '') {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatSlugTouched(false);
    setCatParentId(defaultParentId);
    setCatDescription('');
    setCatSeoOpen(false);
    setCatGoogleCategory('');
    setCatSeoTitle('');
    setCatSeoDescription('');
    setCatImage('');
    setCatActive(true);
    setCatFeatured(false);
    setCatShippingClass('No class');
    setAddingShippingClass(false);
    setNewShippingClassInput('');
    setCatModalError('');
    setCatImageProcessing(false);
    setCatPreviewFailed(false);
    setCategoryModalOpen(true);
  }

  function openEditCategoryModal(cat: Category, expandSeo = false) {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatSlugTouched(true);
    setCatParentId(cat.parentId || '');
    setCatDescription(cat.description || '');
    setCatSeoOpen(expandSeo || Boolean(cat.googleCategory || cat.seoTitle || cat.seoDescription));
    setCatGoogleCategory(cat.googleCategory || '');
    setCatSeoTitle(cat.seoTitle || '');
    setCatSeoDescription(cat.seoDescription || '');
    setCatImage(cat.image || '');
    setCatActive(cat.active !== false);
    setCatFeatured(cat.featured !== false);
    setCatShippingClass(cat.shippingClass || 'No class');
    setAddingShippingClass(false);
    setNewShippingClassInput('');
    setCatModalError('');
    setCatImageProcessing(false);
    setCatPreviewFailed(false);
    setCategoryModalOpen(true);
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Could not read the selected image file.'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read the selected image file.'));
      reader.readAsDataURL(file);
    });
  }

  async function compressCategoryImageFile(file: File): Promise<string> {
    const rawDataUrl = await readFileAsDataUrl(file);
    const smallDirectTypes = new Set([
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
      'image/x-icon',
      'image/vnd.microsoft.icon',
    ]);
    if (file.size <= 350 * 1024 && smallDirectTypes.has(file.type.toLowerCase())) {
      return rawDataUrl;
    }

    return await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
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
        const compressed = canvas.toDataURL('image/png');
        resolve(compressed.length < rawDataUrl.length || file.type === 'image/avif' ? compressed : rawDataUrl);
      };
      img.onerror = () => reject(new Error('Unsupported or corrupted image file. Please choose a PNG, JPG, or WEBP file.'));
      img.src = rawDataUrl;
    });
  }

  async function handleCategoryImageUpload(file: File) {
    const lowerName = file.name.toLowerCase();
    const isIco = lowerName.endsWith('.ico');
    if ((!file.type.startsWith('image/') && !isIco) || file.type === 'image/svg+xml' || lowerName.endsWith('.svg')) {
      setCatModalError('Please upload a PNG, JPG, WEBP, GIF, AVIF, or ICO image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCatModalError('Category image size must be under 10 MB.');
      return;
    }
    setCatModalError('');
    setCatPreviewFailed(false);
    setCatImageProcessing(true);
    try {
      const processedUrl = await compressCategoryImageFile(file);
      setCatImage(processedUrl);
    } catch (err) {
      setCatModalError(err instanceof Error ? err.message : 'Failed to load image.');
    } finally {
      setCatImageProcessing(false);
    }
  }

  function formatCategoryActionError(err: unknown, fallback: string): string {
    let msg = err instanceof Error ? err.message : fallback;
    try {
      const parsed = JSON.parse(msg) as { error?: string };
      if (parsed?.error) msg = parsed.error;
    } catch {
      // plain error message
    }
    return msg;
  }

  async function handleSaveCategoryModal(e: React.FormEvent) {
    e.preventDefault();
    if (catImageProcessing) {
      setCatModalError('Please wait for the category image upload to finish.');
      return;
    }
    const trimmedName = catName.trim();
    if (!trimmedName) {
      setCatModalError('Category name is required.');
      return;
    }

    const effectiveSlug = catSlugTouched
      ? slugifyCategory(catSlug)
      : slugifyCategory(trimmedName);

    const payload: CategoryFormPayload = {
      name: trimmedName,
      slug: effectiveSlug || undefined,
      parentId: catParentId,
      description: catDescription.trim(),
      googleCategory: catGoogleCategory.trim(),
      seoTitle: catSeoTitle.trim(),
      seoDescription: catSeoDescription.trim(),
      image: catImage,
      active: catActive,
      featured: catFeatured,
      shippingClass: catShippingClass,
    };

    setCatSaving(true);
    setCatModalError('');
    try {
      if (editingCategory && onUpdateCategory) {
        await onUpdateCategory(editingCategory.id, payload);
      } else {
        await onCreateCategory(payload);
      }
      setCategoryModalOpen(false);
    } catch (err) {
      setCatModalError(
        formatCategoryActionError(err, 'Failed to save category. Please try again.')
      );
    } finally {
      setCatSaving(false);
    }
  }

  async function handleQuickToggleCategory(cat: Category, patch: Partial<CategoryFormPayload>) {
    if (!onUpdateCategory) return;
    setCatActionError('');
    setTogglingCatId(cat.id);
    try {
      await onUpdateCategory(cat.id, patch);
    } catch (err) {
      setCatActionError(formatCategoryActionError(err, 'Failed to update category.'));
    } finally {
      setTogglingCatId(null);
    }
  }

  async function handleRemoveCategory(cat: Category) {
    setCatActionError('');
    setDeletingCatId(cat.id);
    try {
      await onDeleteCategory(cat.id);
    } catch (err) {
      setCatActionError(formatCategoryActionError(err, 'Failed to delete category.'));
    } finally {
      setDeletingCatId(null);
    }
  }

  async function handleSyncCategoriesClick() {
    if (!onSyncCategoriesToFirestore) return;
    setCatActionError('');
    setCatSyncMsg('');
    setSyncingFirestoreCats(true);
    try {
      await onSyncCategoriesToFirestore();
      setCatSyncMsg(
        `Synced ${categories.length} ${categories.length === 1 ? 'category' : 'categories'} & sub-categories to Firestore.`
      );
    } catch (err) {
      setCatActionError(
        formatCategoryActionError(err, 'Failed to sync categories to Firestore.')
      );
    } finally {
      setSyncingFirestoreCats(false);
    }
  }

  function buildReorderedSiblingList(
    sourceId: string,
    targetId: string,
    position: 'before' | 'after'
  ): Category[] | null {
    const sourceCat = categories.find((c) => c.id === sourceId);
    const targetCat = categories.find((c) => c.id === targetId);
    if (!sourceCat || !targetCat || sourceId === targetId) return null;

    const sourceParentKey = sourceCat.parentId || '';
    const targetParentKey = targetCat.parentId || '';

    // Allow dropping a sub-category directly onto its parent row to move it first among children
    if (sourceParentKey && targetCat.id === sourceParentKey) {
      const siblings = categories.filter((c) => (c.parentId || '') === sourceParentKey);
      const reorderedSiblings = [sourceCat, ...siblings.filter((c) => c.id !== sourceId)];
      let siblingIdx = 0;
      return categories.map((c) =>
        (c.parentId || '') === sourceParentKey ? reorderedSiblings[siblingIdx++] : c
      );
    }

    // If dragging a top-level category over a sub-category row, resolve target to its top-level ancestor
    let effectiveTargetId = targetId;
    if (!sourceParentKey && targetParentKey) {
      let ancestor: Category | undefined = targetCat;
      const visited = new Set<string>();
      while (ancestor?.parentId && !visited.has(ancestor.id)) {
        visited.add(ancestor.id);
        ancestor = categories.find((c) => c.id === ancestor?.parentId);
      }
      if (!ancestor || ancestor.id === sourceId) return null;
      effectiveTargetId = ancestor.id;
    } else if (sourceParentKey !== targetParentKey) {
      return null;
    }

    const siblings = categories.filter((c) => (c.parentId || '') === sourceParentKey);
    const withoutSource = siblings.filter((c) => c.id !== sourceId);
    const targetIdx = withoutSource.findIndex((c) => c.id === effectiveTargetId);
    if (targetIdx === -1) return null;
    const insertIdx = position === 'after' ? targetIdx + 1 : targetIdx;
    const reorderedSiblings = [
      ...withoutSource.slice(0, insertIdx),
      sourceCat,
      ...withoutSource.slice(insertIdx),
    ];

    const unchanged = siblings.every((c, idx) => c.id === reorderedSiblings[idx]?.id);
    if (unchanged) return null;

    let siblingPointer = 0;
    return categories.map((c) =>
      (c.parentId || '') === sourceParentKey ? reorderedSiblings[siblingPointer++] : c
    );
  }

  async function commitCategoryReorder(nextCategories: Category[] | null) {
    if (!nextCategories || !onReorderCategories || reorderingCats) return;
    setCatActionError('');
    setReorderingCats(true);
    try {
      await onReorderCategories(nextCategories);
    } catch (err) {
      setCatActionError(formatCategoryActionError(err, 'Failed to save category order.'));
    } finally {
      setReorderingCats(false);
    }
  }

  async function handleNudgeCategory(cat: Category, direction: -1 | 1) {
    const parentKey = cat.parentId || '';
    const siblings = categories.filter((c) => (c.parentId || '') === parentKey);
    const currentIdx = siblings.findIndex((c) => c.id === cat.id);
    const swapIdx = currentIdx + direction;
    if (currentIdx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return;
    const target = siblings[swapIdx];
    const nextList = buildReorderedSiblingList(
      cat.id,
      target.id,
      direction === -1 ? 'before' : 'after'
    );
    await commitCategoryReorder(nextList);
  }

  function openAssignProductsModal(cat: Category) {
    const catKey = cat.name.trim().toLowerCase();
    const initialSelected = new Set<string>();
    for (const p of products) {
      const directMain = p.category.trim().toLowerCase() === catKey;
      const inAlso = (p.alsoShowIn || []).some((c) => c.trim().toLowerCase() === catKey);
      if (directMain || inAlso) {
        initialSelected.add(p.id);
      }
    }
    setAssignModalCategory(cat);
    setAssignSelectedIds(initialSelected);
    setAssignSearch('');
    setAssignFilterTab('all');
    setAssignError('');
  }

  async function handleSaveAssignedProducts() {
    if (!assignModalCategory || !onAssignProductsToCategory) return;
    setAssignError('');
    setAssignSaving(true);
    try {
      await onAssignProductsToCategory(
        assignModalCategory,
        Array.from(assignSelectedIds)
      );
      setCatSyncMsg(
        `Updated products inside "${assignModalCategory.name}" (${assignSelectedIds.size} selected).`
      );
      setAssignModalCategory(null);
    } catch (err) {
      setAssignError(
        formatCategoryActionError(err, 'Failed to save product assignments.')
      );
    } finally {
      setAssignSaving(false);
    }
  }

  async function handleImportSingleOrCsv(e: React.FormEvent) {
    e.preventDefault();
    if (!importTitle.trim()) return;
    setImporting(true);
    setImportMessage('');
    try {
      const priceNum = Math.max(0, Number(importPrice) || 0);
      await onCreateProduct({
        title: importTitle.trim(),
        slug: importTitle
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        sku: importSku.trim() || `IMP-${Math.floor(1000 + Math.random() * 9000)}`,
        category: importCategory,
        brand: importCategory,
        alsoShowIn: [],
        brandModels: ['Standard Fit'],
        variantOptions: [],
        variants: [],
        price: priceNum,
        originalPrice: priceNum,
        costPrice: Math.round(priceNum * 0.6),
        stock: Math.max(0, Math.floor(Number(importStock) || 0)),
        lowStockThreshold: 5,
        trackStock: true,
        preOrderMode: 'store_default',
        requiresShipping: true,
        weightKg: 0.3,
        shippingClass: 'Standard Case',
        shortDescription: '',
        description: `${importTitle.trim()} imported into Classy Cases inventory.`,
        specifications: [],
        customerPrompt: '',
        seoTitle: '',
        seoDescription: '',
        image: '/src/assets/images/case_magsafe_frosted_gold_1795455910914.jpg',
        galleryImages: [],
        active: true,
        featured: true,
      });
      setImportTitle('');
      setImportSku('');
      setImportMessage('Product imported to your Inventory catalog.');
    } finally {
      setImporting(false);
    }
  }

  async function handleCsvFile(file: File) {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      setImportMessage('CSV file appears empty (expected header + product rows).');
      return;
    }
    setImporting(true);
    let created = 0;
    try {
      for (const line of lines.slice(1)) {
        const [title, sku, category, priceStr, stockStr] = line.split(',').map((c) => c.trim());
        if (!title || title.length < 2) continue;
        const priceNum = Math.max(0, Number(priceStr) || 350);
        const stockNum = Math.max(0, Math.floor(Number(stockStr) || 10));
        await onCreateProduct({
          title,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          sku: sku || `CSV-${Math.floor(1000 + Math.random() * 9000)}`,
          category: category || categories[0]?.name || 'Motorola',
          brand: category || categories[0]?.name || 'Motorola',
          alsoShowIn: [],
          brandModels: ['Standard Fit'],
          variantOptions: [],
          variants: [],
          price: priceNum,
          originalPrice: priceNum,
          costPrice: 0,
          stock: stockNum,
          lowStockThreshold: 5,
          trackStock: true,
          preOrderMode: 'store_default',
          requiresShipping: true,
          weightKg: 0.3,
          shippingClass: 'Standard Case',
          shortDescription: '',
          description: title,
          specifications: [],
          customerPrompt: '',
          seoTitle: '',
          seoDescription: '',
          image: '/src/assets/images/case_magsafe_frosted_gold_1795455910914.jpg',
          galleryImages: [],
          active: true,
          featured: true,
        });
        created += 1;
      }
      setImportMessage(`Successfully imported ${created} product${created === 1 ? '' : 's'} from CSV.`);
    } finally {
      setImporting(false);
    }
  }

  if (section === 'Categories') {
    const autoSlugPreview = slugifyCategory(catName);
    const topLevelBrands = getTopLevelCategories(categories);
    const defaultBrandParentId = topLevelBrands[0]?.id || '';
    const subCategoryCount = categories.filter((c) => Boolean(c.parentId)).length;

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Categories &amp; Sub-categories
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {topLevelBrands.length} phone {topLevelBrands.length === 1 ? 'brand' : 'brands'} ·{' '}
              {subCategoryCount} sub-{subCategoryCount === 1 ? 'category' : 'categories'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAllCategoriesEnabled((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
              title="Toggle All Categories Page status"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>All Categories Page</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  allCategoriesEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            </button>
            {defaultBrandParentId && (
              <button
                type="button"
                onClick={() => openNewCategoryModal(defaultBrandParentId)}
                className="px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add Sub-category</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openNewCategoryModal()}
              className="px-4 py-2 rounded-xl bg-[#5B68EB] hover:bg-[#4C58D6] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Firestore Storage Status & Sync Bar */}
        {onSyncCategoriesToFirestore && (
          <div className="px-4 py-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  firebaseUser
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {firebaseUser
                    ? `Firestore Connected (${firebaseUser.email || 'Google Admin'})`
                    : 'Firestore Sync Ready'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {firebaseUser
                    ? 'New brands and sub-categories are automatically saved to Firestore.'
                    : 'Connect your Google account to sync all brands and sub-categories directly to Firestore.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={syncingFirestoreCats}
              onClick={handleSyncCategoriesClick}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60"
            >
              {syncingFirestoreCats ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>
                {firebaseUser ? 'Sync All to Firestore' : 'Connect Google & Sync to Firestore'}
              </span>
            </button>
          </div>
        )}

        {catSyncMsg && (
          <div className="px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{catSyncMsg}</span>
            </span>
            <button
              type="button"
              onClick={() => setCatSyncMsg('')}
              className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
              aria-label="Dismiss status"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {catActionError && (
          <div className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{catActionError}</span>
            </span>
            <button
              type="button"
              onClick={() => setCatActionError('')}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Categories</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Drag <span className="font-semibold">⋮⋮</span> or use ↑↓ arrows to reorder brands &amp; sub-categories. Click <span className="font-semibold">+ Products</span> on any row to add products.
              </p>
            </div>
            {reorderingCats && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving order...
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 pl-4 pr-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Products</th>
                  <th className="py-2.5 px-4 font-medium">Google category</th>
                  <th className="py-2.5 px-3 font-medium w-10">
                    <span className="sr-only">Featured</span>
                  </th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 pl-3 pr-6 font-medium text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {(() => {
                  const hierarchical = buildHierarchicalCategories(categories);
                  return hierarchical.map(({ category: cat, depth, parentName }) => {
                    const treeNames = getCategoryAndDescendantNames(categories, cat.name);
                    const count = products.filter(
                      (p) =>
                        treeNames.has(p.category.trim().toLowerCase()) ||
                        (p.alsoShowIn || []).some((c) => treeNames.has(c.trim().toLowerCase()))
                    ).length;
                    const isActive = cat.active !== false;
                    const isFeatured = cat.featured !== false;
                    const busy = togglingCatId === cat.id || deletingCatId === cat.id || reorderingCats;
                    const parentKey = cat.parentId || '';
                    const siblings = categories.filter((c) => (c.parentId || '') === parentKey);
                    const siblingIndex = siblings.findIndex((c) => c.id === cat.id);
                    const canMoveUp = siblingIndex > 0;
                    const canMoveDown = siblingIndex >= 0 && siblingIndex < siblings.length - 1;
                    const isDragging = draggedCatId === cat.id;
                    const isDropBefore = dropTargetCatId === cat.id && dropPosition === 'before';
                    const isDropAfter = dropTargetCatId === cat.id && dropPosition === 'after';
                    const draggedCat = draggedCatId ? categories.find((c) => c.id === draggedCatId) : undefined;
                    const canDropHere = Boolean(
                      draggedCat &&
                        draggedCat.id !== cat.id &&
                        ((draggedCat.parentId || '') === parentKey ||
                          (!draggedCat.parentId && depth > 0) ||
                          draggedCat.parentId === cat.id)
                    );

                    return (
                      <tr
                        key={cat.id}
                        draggable={Boolean(onReorderCategories) && !reorderingCats}
                        onDragStart={(e) => {
                          if (!onReorderCategories) return;
                          setDraggedCatId(cat.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', cat.id);
                        }}
                        onDragOver={(e) => {
                          if (!draggedCatId || draggedCatId === cat.id || !canDropHere) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          const rect = e.currentTarget.getBoundingClientRect();
                          const nextPos: 'before' | 'after' =
                            e.clientY - rect.top > rect.height / 2 ? 'after' : 'before';
                          if (dropTargetCatId !== cat.id || dropPosition !== nextPos) {
                            setDropTargetCatId(cat.id);
                            setDropPosition(nextPos);
                          }
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            if (dropTargetCatId === cat.id) {
                              setDropTargetCatId(null);
                              setDropPosition(null);
                            }
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const sourceId = draggedCatId || e.dataTransfer.getData('text/plain');
                          const pos = dropPosition || 'before';
                          setDraggedCatId(null);
                          setDropTargetCatId(null);
                          setDropPosition(null);
                          if (!sourceId || sourceId === cat.id) return;
                          const nextList = buildReorderedSiblingList(sourceId, cat.id, pos);
                          void commitCategoryReorder(nextList);
                        }}
                        onDragEnd={() => {
                          setDraggedCatId(null);
                          setDropTargetCatId(null);
                          setDropPosition(null);
                        }}
                        className={`transition-colors ${
                          isDragging
                            ? 'opacity-45 bg-indigo-50/70 dark:bg-indigo-500/10'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        } ${isDropBefore ? 'shadow-[inset_0_2px_0_0_#5B68EB]' : ''} ${
                          isDropAfter ? 'shadow-[inset_0_-2px_0_0_#5B68EB]' : ''
                        }`}
                      >
                        <td className="py-3.5 pl-4 pr-4">
                          <div
                            className="flex items-center gap-2.5"
                            style={depth > 0 ? { paddingLeft: `${Math.min(depth, 3) * 18}px` } : undefined}
                          >
                            {onReorderCategories && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <span
                                  className="p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing"
                                  title="Drag up or down to reorder"
                                  aria-label={`Drag ${cat.name} to reorder`}
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                                {siblings.length > 1 && (
                                  <div className="flex flex-col">
                                    <button
                                      type="button"
                                      disabled={!canMoveUp || reorderingCats}
                                      onClick={() => void handleNudgeCategory(cat, -1)}
                                      className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                                      title={`Move ${cat.name} up`}
                                      aria-label={`Move ${cat.name} up`}
                                    >
                                      <ArrowUp className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!canMoveDown || reorderingCats}
                                      onClick={() => void handleNudgeCategory(cat, 1)}
                                      className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                                      title={`Move ${cat.name} down`}
                                      aria-label={`Move ${cat.name} down`}
                                    >
                                      <ArrowDown className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            {depth > 0 && (
                              <CornerDownRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            )}
                            <CategoryBrandBadge category={cat} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {cat.name}
                                </span>
                                {depth > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                                    Sub-category
                                  </span>
                                )}
                                {cat.isDefault && (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                                    Default
                                  </span>
                                )}
                              </div>
                              {parentName && (
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                  Inside {parentName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 tabular-nums">
                          {onAssignProductsToCategory ? (
                            <button
                              type="button"
                              onClick={() => openAssignProductsModal(cat)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                                count === 0
                                  ? 'border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10'
                                  : 'bg-slate-100/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-300'
                              }`}
                              title={`Assign products to ${cat.name}`}
                            >
                              <span>
                                {count} {count === 1 ? 'product' : 'products'}
                              </span>
                              <Plus className="w-3 h-3 opacity-70" />
                            </button>
                          ) : (
                            <span
                              className={`text-[13px] ${
                                count === 0
                                  ? 'text-slate-400 dark:text-slate-500'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {count} {count === 1 ? 'product' : 'products'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => openEditCategoryModal(cat, true)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                              cat.googleCategory
                                ? 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 max-w-[200px] truncate'
                                : 'border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                            title={cat.googleCategory || 'Click to set Google category'}
                          >
                            <span className="font-bold text-slate-400 dark:text-slate-500">G</span>
                            <span className="truncate">{cat.googleCategory || 'Not set'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={busy || !onUpdateCategory}
                            onClick={() =>
                              handleQuickToggleCategory(cat, { featured: !isFeatured })
                            }
                            className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
                            title={isFeatured ? 'Featured on storefront' : 'Click to feature'}
                            aria-label={`Toggle featured for ${cat.name}`}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                isFeatured
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-400 dark:text-slate-500 hover:text-amber-400'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            disabled={busy || !onUpdateCategory}
                            onClick={() => handleQuickToggleCategory(cat, { active: !isActive })}
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                              isActive
                                ? 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/70'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                            title="Click to toggle category status"
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3.5 pl-3 pr-6 text-right">
                          <div className="inline-flex items-center gap-1">
                            {onAssignProductsToCategory && (
                              <button
                                type="button"
                                onClick={() => openAssignProductsModal(cat)}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title={`Add or manage products in ${cat.name}`}
                              >
                                <Package className="w-3.5 h-3.5" />
                                <span>+ Products</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openNewCategoryModal(cat.id)}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer"
                              aria-label={`Add sub-category inside ${cat.name}`}
                              title={`Add sub-category inside ${cat.name}`}
                            >
                              <FolderPlus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditCategoryModal(cat)}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                              aria-label={`Edit ${cat.name}`}
                              title="Edit category"
                            >
                              <SquarePen className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRemoveCategory(cat)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                              aria-label={`Remove ${cat.name}`}
                              title="Delete category"
                            >
                              {deletingCatId === cat.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                      No categories yet. Click &ldquo;+ Add Category&rdquo; to create your first category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New / Edit Category Modal */}
        {categoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-modal-title"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h2 id="category-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingCategory
                    ? catParentId
                      ? 'Edit sub-category'
                      : 'Edit category'
                    : catParentId
                      ? 'New sub-category'
                      : 'New category'}
                </h2>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategoryModal} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Column */}
                    <div className="md:col-span-7 space-y-4 md:pr-6 md:border-r md:border-slate-100">
                      <div>
                        <label
                          htmlFor="cat-name-input"
                          className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                        >
                          Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="cat-name-input"
                          type="text"
                          autoFocus
                          value={catName}
                          onChange={(e) => setCatName(e.target.value)}
                          placeholder="e.g. Samsung, iPhone, MagSafe Clear"
                          className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="cat-url-input"
                          className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                        >
                          <span>URL</span>
                          <Info className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        </label>
                        <input
                          id="cat-url-input"
                          type="text"
                          value={catSlugTouched ? catSlug : autoSlugPreview}
                          onChange={(e) => {
                            setCatSlugTouched(true);
                            setCatSlug(e.target.value);
                          }}
                          placeholder="made-from-the-name"
                          className="w-full px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                        />
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <Link2 className="w-3 h-3 shrink-0" />
                          <span>
                            {catSlugTouched && catSlug.trim()
                              ? `/${slugifyCategory(catSlug) || 'category'}`
                              : autoSlugPreview
                                ? `/${autoSlugPreview}`
                                : 'Made from the name when you save'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="cat-parent-select"
                          className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                        >
                          Parent brand / category
                        </label>
                        <select
                          id="cat-parent-select"
                          value={catParentId}
                          onChange={(e) => setCatParentId(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                        >
                          <option value="">None — top-level phone brand</option>
                          {buildHierarchicalCategories(categories)
                            .filter(({ category: c }) => {
                              if (!editingCategory) return true;
                              if (c.id === editingCategory.id) return false;
                              const desc = getCategoryAndDescendantNames(categories, editingCategory.name);
                              return !desc.has(c.name.trim().toLowerCase());
                            })
                            .map(({ category: c, depth }) => (
                              <option key={c.id} value={c.id}>
                                {depth > 0 ? `${'— '.repeat(depth)}${c.name}` : c.name}
                              </option>
                            ))}
                        </select>
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          Choose an existing phone brand (e.g. Motorola, VIVO, Xiaomi) to nest this as a sub-category.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="cat-description-input"
                          className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                        >
                          Description
                        </label>
                        <textarea
                          id="cat-description-input"
                          rows={3}
                          value={catDescription}
                          onChange={(e) => setCatDescription(e.target.value)}
                          placeholder="Add a description..."
                          className="w-full px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 resize-y"
                        />
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                        <button
                          type="button"
                          onClick={() => setCatSeoOpen((prev) => !prev)}
                          className="w-full flex items-center justify-between text-left py-1 cursor-pointer group"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">SEO</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                              {catGoogleCategory.trim()
                                ? `${catGoogleCategory.trim()} · ${catSeoTitle.trim() || 'custom listing'}`
                                : 'No Google category · search listing from the name'}
                            </div>
                          </div>
                          {catSeoOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600" />
                          )}
                        </button>

                        {catSeoOpen && (
                          <div className="mt-3 space-y-3 pt-2">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Google category
                              </label>
                              <input
                                type="text"
                                value={catGoogleCategory}
                                onChange={(e) => setCatGoogleCategory(e.target.value)}
                                placeholder="e.g. Mobile Phone Cases"
                                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                SEO Title
                              </label>
                              <input
                                type="text"
                                value={catSeoTitle}
                                onChange={(e) => setCatSeoTitle(e.target.value)}
                                placeholder="Title shown in search engines"
                                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                SEO Description
                              </label>
                              <textarea
                                rows={2}
                                value={catSeoDescription}
                                onChange={(e) => setCatSeoDescription(e.target.value)}
                                placeholder="Meta description for search results..."
                                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-5 space-y-5">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2.5">
                          <span>Image / Icon</span>
                          <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden shrink-0">
                            {catImage && !catPreviewFailed ? (
                              <img
                                key={catImage}
                                src={catImage}
                                alt="Category preview"
                                referrerPolicy="no-referrer"
                                onError={() => setCatPreviewFailed(true)}
                                className="w-full h-full object-contain p-1 bg-white dark:bg-slate-900"
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <input
                              ref={catFileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/x-icon,.ico"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleCategoryImageUpload(file);
                                e.target.value = '';
                              }}
                            />
                            <button
                              type="button"
                              disabled={catImageProcessing}
                              onClick={() => catFileInputRef.current?.click()}
                              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60"
                            >
                              {catImageProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <Upload className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                              )}
                              <span>{catImageProcessing ? 'Processing...' : 'Upload'}</span>
                            </button>
                            {catImage && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCatImage('');
                                    setCatPreviewFailed(false);
                                  }}
                                  className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 cursor-pointer"
                                >
                                  Remove image
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3">
                          <label
                            htmlFor="cat-image-url-input"
                            className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                          >
                            Or paste image URL
                          </label>
                          <input
                            id="cat-image-url-input"
                            type="text"
                            value={catImage.startsWith('data:') ? '' : catImage}
                            onChange={(e) => {
                              setCatPreviewFailed(false);
                              setCatImage(e.target.value);
                            }}
                            placeholder={
                              catImage.startsWith('data:')
                                ? 'Uploaded image active (or paste https:// URL to replace)'
                                : 'https://example.com/category-icon.png'
                            }
                            className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Visibility</div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <span>Active</span>
                            <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={catActive}
                            onClick={() => setCatActive((prev) => !prev)}
                            className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                              catActive ? 'bg-[#5B68EB]' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`block w-4.5 h-4.5 rounded-full bg-white dark:bg-slate-900 shadow-xs transition-transform ${
                                catActive ? 'translate-x-4.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <span>Featured</span>
                            <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={catFeatured}
                            onClick={() => setCatFeatured((prev) => !prev)}
                            className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                              catFeatured ? 'bg-[#5B68EB]' : 'bg-indigo-100 dark:bg-indigo-500/20'
                            }`}
                          >
                            <span
                              className={`block w-4.5 h-4.5 rounded-full bg-white dark:bg-slate-900 shadow-xs transition-transform ${
                                catFeatured ? 'translate-x-4.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                          <span>Shipping</span>
                          <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Shipping class
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              value={catShippingClass}
                              onChange={(e) => setCatShippingClass(e.target.value)}
                              className="flex-1 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
                            >
                              {availableShippingClasses.map((cls) => (
                                <option key={cls} value={cls}>
                                  {cls}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setAddingShippingClass((prev) => !prev)}
                              className="w-9.5 h-9.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                              title="Add shipping class"
                              aria-label="Add shipping class"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          {addingShippingClass && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <input
                                type="text"
                                value={newShippingClassInput}
                                onChange={(e) => setNewShippingClassInput(e.target.value)}
                                placeholder="New shipping class name"
                                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = newShippingClassInput.trim();
                                  if (!trimmed) return;
                                  setCustomShippingClasses((prev) =>
                                    prev.includes(trimmed) ? prev : [...prev, trimmed]
                                  );
                                  setCatShippingClass(trimmed);
                                  setNewShippingClassInput('');
                                  setAddingShippingClass(false);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-500 cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {catModalError && (
                    <div className="mt-5 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{catModalError}</span>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(false)}
                    className="px-3 py-2 text-xs font-semibold text-[#5B68EB] hover:text-[#424EC7] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!catName.trim() || catSaving}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#5B68EB] hover:bg-[#4C58D6] text-white disabled:bg-slate-200 disabled:text-slate-400 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {catSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Products to Category / Sub-category Modal */}
        {assignModalCategory && (() => {
          const parentCat = assignModalCategory.parentId
            ? categories.find((c) => c.id === assignModalCategory.parentId)
            : undefined;
          const parentKey = parentCat?.name.trim().toLowerCase() || '';
          const catKey = assignModalCategory.name.trim().toLowerCase();
          const searchTerm = assignSearch.trim().toLowerCase();

          const parentBrandCount = parentCat
            ? products.filter((p) => {
                const pCat = p.category.trim().toLowerCase();
                return (
                  pCat === parentKey ||
                  (p.alsoShowIn || []).some((c) => c.trim().toLowerCase() === parentKey)
                );
              }).length
            : 0;

          const matchingProducts = products
            .filter((p) => {
              if (assignFilterTab === 'assigned' && !assignSelectedIds.has(p.id)) {
                return false;
              }
              if (assignFilterTab === 'brand' && parentCat) {
                const pCat = p.category.trim().toLowerCase();
                const inParent =
                  pCat === parentKey ||
                  (p.alsoShowIn || []).some((c) => c.trim().toLowerCase() === parentKey);
                if (!inParent) return false;
              }
              if (!searchTerm) return true;
              return (
                p.title.toLowerCase().includes(searchTerm) ||
                p.sku.toLowerCase().includes(searchTerm) ||
                p.category.toLowerCase().includes(searchTerm) ||
                (p.brand || '').toLowerCase().includes(searchTerm)
              );
            })
            .sort((a, b) => {
              const aAssigned = assignSelectedIds.has(a.id) ? 0 : 1;
              const bAssigned = assignSelectedIds.has(b.id) ? 0 : 1;
              if (aAssigned !== bAssigned) return aAssigned - bAssigned;
              if (parentCat) {
                const aSameBrand = a.category.trim().toLowerCase() === parentKey ? 0 : 1;
                const bSameBrand = b.category.trim().toLowerCase() === parentKey ? 0 : 1;
                if (aSameBrand !== bSameBrand) return aSameBrand - bSameBrand;
              }
              return a.title.localeCompare(b.title);
            });

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="assign-products-modal-title"
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <h2
                      id="assign-products-modal-title"
                      className="text-base font-bold text-slate-900 dark:text-slate-100"
                    >
                      Products in {assignModalCategory.name}
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {parentCat
                        ? `Sub-category inside ${parentCat.name} · Checking products keeps their Main Category intact.`
                        : 'Select products to show under this category.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignModalCategory(null)}
                    className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={assignSearch}
                        onChange={(e) => setAssignSearch(e.target.value)}
                        placeholder="Search products by name, model, or SKU..."
                        className="w-full pl-8 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    {onNewProductInCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetCat = assignModalCategory;
                          setAssignModalCategory(null);
                          onNewProductInCategory(targetCat);
                        }}
                        className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Product Here</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAssignFilterTab('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                          assignFilterTab === 'all'
                            ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        All ({products.length})
                      </button>
                      {parentCat && (
                        <button
                          type="button"
                          onClick={() => setAssignFilterTab('brand')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                            assignFilterTab === 'brand'
                              ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {parentCat.name} ({parentBrandCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAssignFilterTab('assigned')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                          assignFilterTab === 'assigned'
                            ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        Selected ({assignSelectedIds.size})
                      </button>
                    </div>

                    {matchingProducts.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() =>
                            setAssignSelectedIds((prev) => {
                              const next = new Set(prev);
                              for (const p of matchingProducts) next.add(p.id);
                              return next;
                            })
                          }
                          className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Select visible
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAssignSelectedIds((prev) => {
                              const next = new Set(prev);
                              for (const p of matchingProducts) next.delete(p.id);
                              return next;
                            })
                          }
                          className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                        >
                          Clear visible
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {matchingProducts.map((product) => {
                    const checked = assignSelectedIds.has(product.id);
                    const otherSubs = (product.alsoShowIn || []).filter(
                      (c) => c.trim().toLowerCase() !== catKey
                    );
                    return (
                      <label
                        key={product.id}
                        className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${
                          checked
                            ? 'bg-indigo-50/50 dark:bg-indigo-500/10'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <span
                          className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            checked
                              ? 'bg-[#5B68EB] border-[#5B68EB] text-white'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setAssignSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(product.id)) {
                                next.delete(product.id);
                              } else {
                                next.add(product.id);
                              }
                              return next;
                            });
                          }}
                          className="sr-only"
                        />
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {product.title}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              Main: {product.category}
                            </span>
                            {product.sku && <span>· {product.sku}</span>}
                            {otherSubs.length > 0 && (
                              <span className="truncate max-w-[200px]">
                                · Also in {otherSubs.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums shrink-0">
                          {formatTaka(product.price)}
                        </span>
                      </label>
                    );
                  })}

                  {matchingProducts.length === 0 && (
                    <div className="py-12 px-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      No matching products found. Try clearing your search filter or click &ldquo;+ New Product Here&rdquo;.
                    </div>
                  )}
                </div>

                {assignError && (
                  <div className="mx-6 my-2 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{assignError}</span>
                  </div>
                )}

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {assignSelectedIds.size}
                    </span>{' '}
                    {assignSelectedIds.size === 1 ? 'product' : 'products'} assigned to{' '}
                    {assignModalCategory.name}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAssignModalCategory(null)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={assignSaving}
                      onClick={() => void handleSaveAssignedProducts()}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#5B68EB] hover:bg-[#4C58D6] text-white disabled:bg-slate-300 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {assignSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Products</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  if (section === 'Brands') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Brands</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active phone &amp; case accessory brands across your catalog
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brandSummaries.map((brand) => (
            <div
              key={brand.name}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{brand.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {brand.count} SKUs · {brand.totalStock} units in stock
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === 'Warranties') {
    return (
      <div className="max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Warranties</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Replacement and anti-yellowing protection policies attached to cases
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newWarrantyTitle.trim()) return;
            setWarranties((prev) => [
              {
                id: `war-${Date.now()}`,
                title: newWarrantyTitle.trim(),
                duration: newWarrantyDuration.trim() || '30 Days',
                coverage: newWarrantyCoverage.trim() || 'Standard case replacement coverage.',
                active: true,
              },
              ...prev,
            ]);
            setNewWarrantyTitle('');
            setNewWarrantyCoverage('');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={newWarrantyTitle}
              onChange={(e) => setNewWarrantyTitle(e.target.value)}
              placeholder="Warranty policy title..."
              className="sm:col-span-2 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
            <input
              type="text"
              value={newWarrantyDuration}
              onChange={(e) => setNewWarrantyDuration(e.target.value)}
              placeholder="Duration (e.g. 6 Months)"
              className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWarrantyCoverage}
              onChange={(e) => setNewWarrantyCoverage(e.target.value)}
              placeholder="Coverage terms..."
              className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              Add Warranty
            </button>
          </div>
        </form>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
          {warranties.map((w) => (
            <div key={w.id} className="p-4 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {w.title}{' '}
                    <span className="ml-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold">
                      {w.duration}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{w.coverage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWarranties((prev) => prev.filter((item) => item.id !== w.id))}
                className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                aria-label={`Delete ${w.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === 'Import Product') {
    return (
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Import Product</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upload a CSV spreadsheet (title, sku, category, price, stock) or quick-import an item
          </p>
        </div>

        <label className="block bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
          <CloudUpload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Upload CSV file to import products</div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Columns: title, sku, category, price, stock</p>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCsvFile(file);
              e.target.value = '';
            }}
          />
        </label>

        <form onSubmit={handleImportSingleOrCsv} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Quick Single Import</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              placeholder="Product Name *"
              className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
            <input
              type="text"
              value={importSku}
              onChange={(e) => setImportSku(e.target.value)}
              placeholder="SKU (optional)"
              className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
            />
            <select
              value={importCategory}
              onChange={(e) => setImportCategory(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                value={importPrice}
                onChange={(e) => setImportPrice(e.target.value)}
                placeholder="Price"
                className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums"
              />
              <input
                type="number"
                min={0}
                value={importStock}
                onChange={(e) => setImportStock(e.target.value)}
                placeholder="Stock"
                className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums"
              />
            </div>
          </div>
          {importMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{importMessage}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={importing}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {importing ? 'Importing...' : 'Import to Inventory'}
          </button>
        </form>
      </div>
    );
  }

  if (section === 'Stock Levels') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Stock Levels</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Live availability breakdown across all phone cases</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs">
            {(['all', 'healthy', 'low', 'out'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStockFilter(tab)}
                className={`px-3 py-1 rounded-md capitalize font-medium ${
                  stockFilter === tab ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab === 'out' ? 'Out of stock' : tab === 'low' ? 'Low stock' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold">Brand</th>
                  <th className="py-3 px-4 font-semibold text-right">Threshold</th>
                  <th className="py-3 px-4 font-semibold text-right">On Hand</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStockProducts.map((p) => {
                  const isTracked = p.trackStock !== false;
                  const isOut = isTracked && p.stock <= 0;
                  const isLow = isTracked && p.stock > 0 && p.stock < 5;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{p.sku}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onEditProduct(p)}
                          className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 text-left"
                        >
                          {p.title}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{p.category}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-500 dark:text-slate-400">&lt; 5</td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100">{p.stock}</td>
                      <td className="py-3 px-4 text-right">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[11px] font-semibold">
                            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                            In stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'Stock Tracker') {
    const totalUnits = products.reduce((s, p) => s + Math.max(0, p.stock), 0);
    const totalRetail = products.reduce((s, p) => s + p.price * Math.max(0, p.stock), 0);
    const lowCount = products.filter((p) => p.trackStock !== false && p.stock > 0 && p.stock < 5).length;

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Stock Tracker</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track SKU valuation, low-stock alerts, and variant inventory distribution
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Tracked Units</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{totalUnits}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Inventory Retail Value</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{formatTaka(totalRetail)}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>SKUs Needing Restock</span>
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{lowCount}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
          {products.map((p) => {
            const isTracked = p.trackStock !== false;
            const isOut = isTracked && p.stock <= 0;
            const isLow = isTracked && p.stock > 0 && p.stock < 5;
            return (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <Package className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{p.title}</span>
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-semibold shrink-0">
                          Out of Stock
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold shrink-0">
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          Low Stock
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {p.sku} · {p.variants?.length ? `${p.variants.length} variants` : `${p.brandModels.length} models`}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <div className={`font-bold ${isOut ? 'text-rose-600 dark:text-rose-400' : isLow ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100'}`}>
                    {p.stock} units
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatTaka(p.price * p.stock)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (section === 'Stock Adjustment') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Stock Adjustment</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Apply instant +/- stock adjustments or enter a custom quantity delta
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => {
                  const isTracked = p.trackStock !== false;
                  const isOut = isTracked && p.stock <= 0;
                  const isLow = isTracked && p.stock > 0 && p.stock < 5;
                  return (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{p.sku}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{p.title}</span>
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Low Stock
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-right tabular-nums font-bold ${isOut ? 'text-rose-600 dark:text-rose-400' : isLow ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100'}`}>
                      {p.stock}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onQuickStockChange(p, -1)}
                          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickStockChange(p, 5)}
                          className="px-2.5 py-1 rounded border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 font-semibold"
                        >
                          +5
                        </button>
                        <input
                          type="number"
                          value={customAdjustMap[p.id] ?? ''}
                          onChange={(e) =>
                            setCustomAdjustMap((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          placeholder="+/-"
                          className="w-16 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-center tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const delta = Math.trunc(Number(customAdjustMap[p.id]));
                            if (!Number.isFinite(delta) || delta === 0) return;
                            await onQuickStockChange(p, delta);
                            setCustomAdjustMap((prev) => ({ ...prev, [p.id]: '' }));
                          }}
                          className="px-2.5 py-1 rounded bg-slate-900 dark:bg-indigo-600 text-white font-semibold hover:bg-slate-800 dark:hover:bg-indigo-500"
                        >
                          Apply
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Barcodes
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Barcode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Barcodes</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Printable SKU barcode labels for inventory shelves and courier parcels
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 inline-flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Labels</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-center"
          >
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{p.title}</div>
            <div className="py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-0.5 h-12">
              {p.sku.split('').map((ch, idx) => (
                <span
                  key={idx}
                  className={`inline-block bg-slate-900 dark:bg-slate-100 h-8 ${
                    ch.charCodeAt(0) % 2 === 0 ? 'w-0.5' : 'w-1'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span>{p.sku}</span>
              <span className="font-sans font-bold text-slate-900 dark:text-slate-100">{formatTaka(p.price)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
