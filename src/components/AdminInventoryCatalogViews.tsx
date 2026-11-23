import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  CloudUpload,
  Layers,
  Package,
  Plus,
  Printer,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { formatTaka } from '../models/phoneCase';
import type { Category, Product } from '../types';
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
  onQuickStockChange: (product: Product, delta: number) => Promise<void>;
  onCreateCategory: (name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
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

export function AdminInventoryCatalogViews({
  section,
  products,
  categories,
  onQuickStockChange,
  onCreateCategory,
  onDeleteCategory,
  onCreateProduct,
  onEditProduct,
}: AdminInventoryCatalogViewsProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
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
      const threshold = p.lowStockThreshold ?? 10;
      if (stockFilter === 'out') return p.stock <= 0;
      if (stockFilter === 'low') return p.stock > 0 && p.stock <= threshold;
      if (stockFilter === 'healthy') return p.stock > threshold;
      return true;
    });
  }, [products, stockFilter]);

  async function handleAddCat(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await onCreateCategory(newCategoryName.trim());
    setNewCategoryName('');
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
        lowStockThreshold: 10,
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
          lowStockThreshold: 10,
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
    return (
      <div className="max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Categories</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize phone case brands and storefront navigation categories
          </p>
        </div>

        <form onSubmit={handleAddCat} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name (e.g. Samsung, iPhone, OnePlus)"
            className="flex-1 min-w-[200px] px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {categories.map((cat) => {
            const count = products.filter((p) => p.category.toLowerCase() === cat.name.toLowerCase()).length;
            return (
              <div key={cat.id} className="px-4 py-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{cat.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    /{cat.slug} · {count} product{count === 1 ? '' : 's'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteCategory(cat.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  aria-label={`Remove ${cat.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (section === 'Brands') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Brands</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active phone &amp; case accessory brands across your catalog
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brandSummaries.map((brand) => (
            <div
              key={brand.name}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{brand.name}</div>
                  <div className="text-[11px] text-slate-500">
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
          <h1 className="text-xl font-bold text-slate-900">Warranties</h1>
          <p className="text-xs text-slate-500 mt-0.5">
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
          className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={newWarrantyTitle}
              onChange={(e) => setNewWarrantyTitle(e.target.value)}
              placeholder="Warranty policy title..."
              className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={newWarrantyDuration}
              onChange={(e) => setNewWarrantyDuration(e.target.value)}
              placeholder="Duration (e.g. 6 Months)"
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWarrantyCoverage}
              onChange={(e) => setNewWarrantyCoverage(e.target.value)}
              placeholder="Coverage terms..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              Add Warranty
            </button>
          </div>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {warranties.map((w) => (
            <div key={w.id} className="p-4 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    {w.title}{' '}
                    <span className="ml-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      {w.duration}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-0.5">{w.coverage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWarranties((prev) => prev.filter((item) => item.id !== w.id))}
                className="text-slate-400 hover:text-rose-600 p-1"
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
          <h1 className="text-xl font-bold text-slate-900">Import Product</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload a CSV spreadsheet (title, sku, category, price, stock) or quick-import an item
          </p>
        </div>

        <label className="block bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
          <CloudUpload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-800">Upload CSV file to import products</div>
          <p className="text-xs text-slate-400 mt-1">Columns: title, sku, category, price, stock</p>
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

        <form onSubmit={handleImportSingleOrCsv} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
          <h2 className="text-sm font-bold text-slate-900">Quick Single Import</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              placeholder="Product Name *"
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={importSku}
              onChange={(e) => setImportSku(e.target.value)}
              placeholder="SKU (optional)"
              className="px-3 py-2 border border-slate-200 rounded-lg font-mono"
            />
            <select
              value={importCategory}
              onChange={(e) => setImportCategory(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
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
                className="px-3 py-2 border border-slate-200 rounded-lg tabular-nums"
              />
              <input
                type="number"
                min={0}
                value={importStock}
                onChange={(e) => setImportStock(e.target.value)}
                placeholder="Stock"
                className="px-3 py-2 border border-slate-200 rounded-lg tabular-nums"
              />
            </div>
          </div>
          {importMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1.5">
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
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Stock Levels</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Live availability breakdown across all phone cases</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
            {(['all', 'healthy', 'low', 'out'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStockFilter(tab)}
                className={`px-3 py-1 rounded-md capitalize font-medium ${
                  stockFilter === tab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'
                }`}
              >
                {tab === 'out' ? 'Out of stock' : tab === 'low' ? 'Low stock' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold">Brand</th>
                  <th className="py-3 px-4 font-semibold text-right">Threshold</th>
                  <th className="py-3 px-4 font-semibold text-right">On Hand</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStockProducts.map((p) => {
                  const threshold = p.lowStockThreshold ?? 10;
                  const status = p.stock <= 0 ? 'Out of stock' : p.stock <= threshold ? 'Low stock' : 'In stock';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-slate-500">{p.sku}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onEditProduct(p)}
                          className="font-semibold text-slate-900 hover:text-indigo-600 text-left"
                        >
                          {p.title}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-500">{threshold}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">{p.stock}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            p.stock <= 0
                              ? 'bg-rose-50 text-rose-600'
                              : p.stock <= threshold
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {status}
                        </span>
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
    const lowCount = products.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 10)).length;

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Stock Tracker</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track SKU valuation, low-stock alerts, and variant inventory distribution
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500">Tracked Units</div>
            <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{totalUnits}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500">Inventory Retail Value</div>
            <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{formatTaka(totalRetail)}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>SKUs Needing Restock</span>
            </div>
            <div className="text-xl font-bold text-amber-600 mt-1 tabular-nums">{lowCount}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {products.map((p) => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <Package className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{p.title}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {p.sku} · {p.variants?.length ? `${p.variants.length} variants` : `${p.brandModels.length} models`}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 tabular-nums">
                <div className="font-bold text-slate-900">{p.stock} units</div>
                <div className="text-[11px] text-slate-500">{formatTaka(p.price * p.stock)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === 'Stock Adjustment') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <span>Stock Adjustment</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Apply instant +/- stock adjustments or enter a custom quantity delta
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono text-slate-500">{p.sku}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.title}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">{p.stock}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onQuickStockChange(p, -1)}
                          className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickStockChange(p, 5)}
                          className="px-2.5 py-1 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold"
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
                          className="w-16 px-2 py-1 rounded border border-slate-200 text-center tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const delta = Math.trunc(Number(customAdjustMap[p.id]));
                            if (!Number.isFinite(delta) || delta === 0) return;
                            await onQuickStockChange(p, delta);
                            setCustomAdjustMap((prev) => ({ ...prev, [p.id]: '' }));
                          }}
                          className="px-2.5 py-1 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800"
                        >
                          Apply
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Barcode className="w-5 h-5 text-indigo-600" />
            <span>Barcodes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Printable SKU barcode labels for inventory shelves and courier parcels
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Labels</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 text-center"
          >
            <div className="text-xs font-bold text-slate-900 truncate">{p.title}</div>
            <div className="py-2 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center gap-0.5 h-12">
              {p.sku.split('').map((ch, idx) => (
                <span
                  key={idx}
                  className={`inline-block bg-slate-900 h-8 ${
                    ch.charCodeAt(0) % 2 === 0 ? 'w-0.5' : 'w-1'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span>{p.sku}</span>
              <span className="font-sans font-bold text-slate-900">{formatTaka(p.price)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
