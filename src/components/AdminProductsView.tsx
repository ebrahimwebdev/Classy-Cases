import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Box,
  Boxes,
  ClipboardCheck,
  Copy,
  Edit3,
  Filter,
  HelpCircle,
  History,
  MoreVertical,
  PackageX,
  Plus,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import { formatTaka } from '../models/phoneCase';
import type { Category, Order, Product } from '../types';

interface AdminProductsViewProps {
  products: Product[];
  categories: Category[];
  orders: Order[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onToggleActive: (product: Product) => void;
  onQuickRestock: (product: Product, delta: number) => void;
  onDuplicateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

interface FloatingMenuState {
  productId: string;
  top: number;
  left: number;
  openUpward: boolean;
}

export function AdminProductsView({
  products,
  categories,
  orders,
  onAddProduct,
  onEditProduct,
  onToggleActive,
  onQuickRestock,
  onDuplicateProduct,
  onDeleteProduct,
}: AdminProductsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<FloatingMenuState | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuPanelRef.current?.contains(target)) return;
      if (activeTriggerRef.current?.contains(target)) return;
      setOpenMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        activeTriggerRef.current?.focus();
      }
    }

    function handleViewportChange() {
      setOpenMenu(null);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [openMenu]);

  function handleToggleActionMenu(productId: string, buttonEl: HTMLButtonElement) {
    if (openMenu?.productId === productId) {
      setOpenMenu(null);
      return;
    }

    activeTriggerRef.current = buttonEl;
    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 184;
    const estimatedMenuHeight = 176;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedMenuHeight + 12 && rect.top > estimatedMenuHeight + 12;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const top = openUpward ? Math.max(12, rect.top - 6) : Math.min(window.innerHeight - 12, rect.bottom + 6);

    setOpenMenu({
      productId,
      top,
      left,
      openUpward,
    });
  }

  // KPI summary computations
  const kpis = useMemo(() => {
    const totalProducts = products.length;
    const availableUnits = products.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
    const stockValuePrice = products.reduce((sum, p) => sum + p.price * Math.max(0, p.stock), 0);
    const stockValueCost = products.reduce(
      (sum, p) => sum + (p.costPrice ?? 0) * Math.max(0, p.stock),
      0
    );
    const outOfStockCount = products.filter((p) => p.trackStock !== false && p.stock <= 0).length;
    const lowStockCount = products.filter(
      (p) => p.trackStock !== false && p.stock > 0 && p.stock < 5
    ).length;
    const waitingOrdersCount = orders.filter(
      (o) => o.fulfillmentStatus === 'pending' || o.fulfillmentStatus === 'confirmed'
    ).length;
    const countNeeded = products.filter((p) => p.trackStock !== false && p.stock < 0).length;

    return {
      totalProducts,
      availableUnits,
      stockValuePrice,
      stockValueCost,
      outOfStockCount,
      lowStockCount,
      waitingOrdersCount,
      countNeeded,
    };
  }, [products, orders]);

  // Filtered list
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brandModels.some((m) => m.toLowerCase().includes(q));

      const matchesCategory =
        categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();

      const isTracked = p.trackStock !== false;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'out_of_stock' && isTracked && p.stock <= 0) ||
        (stockFilter === 'low_stock' && isTracked && p.stock > 0 && p.stock < 5) ||
        (stockFilter === 'in_stock' && (!isTracked || p.stock >= 5));

      const isActive = p.active !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesCategory && matchesStock && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, stockFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIdx, startIdx + pageSize);

  const activeMenuProduct = useMemo(
    () => (openMenu ? paginatedProducts.find((item) => item.id === openMenu.productId) ?? null : null),
    [openMenu, paginatedProducts]
  );

  const allOnPageSelected =
    paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.includes(p.id));

  function toggleSelectAll() {
    if (allOnPageSelected) {
      const pageIds = new Set(paginatedProducts.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...paginatedProducts.map((p) => p.id)]);
      setSelectedIds(Array.from(merged));
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  const kpiCards = [
    {
      label: 'Products',
      hint: 'Total active and inactive products in your catalog',
      value: kpis.totalProducts.toLocaleString('en-US'),
      icon: <Box className="w-4 h-4" />,
      badgeClass: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Available',
      hint: 'Total units currently in stock across all SKUs',
      value: kpis.availableUnits.toLocaleString('en-US'),
      icon: <Boxes className="w-4 h-4" />,
      badgeClass: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    },
    {
      label: 'Stock value (price)',
      hint: 'Retail value of all available units on hand',
      value: formatTaka(kpis.stockValuePrice),
      icon: <Banknote className="w-4 h-4" />,
      badgeClass: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Stock value (cost)',
      hint: 'Total purchase cost of available stock',
      value: formatTaka(kpis.stockValueCost),
      icon: <Wallet className="w-4 h-4" />,
      badgeClass: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Out of Stock',
      hint: 'Tracked products with zero stock remaining',
      value: kpis.outOfStockCount.toLocaleString('en-US'),
      icon: <PackageX className="w-4 h-4" />,
      badgeClass: 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Low Stock',
      hint: 'Tracked products with fewer than 5 units left',
      value: kpis.lowStockCount.toLocaleString('en-US'),
      icon: <AlertTriangle className="w-4 h-4" />,
      badgeClass: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Waiting orders',
      hint: 'Pending or confirmed orders waiting for dispatch',
      value: kpis.waitingOrdersCount.toLocaleString('en-US'),
      icon: <History className="w-4 h-4" />,
      badgeClass: 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Count needed',
      hint: 'Items with negative inventory count needing audit',
      value: kpis.countNeeded.toLocaleString('en-US'),
      icon: <ClipboardCheck className="w-4 h-4" />,
      badgeClass: 'bg-rose-50 dark:bg-rose-500/15 text-rose-500',
    },
  ];

  const activeFiltersCount =
    (categoryFilter !== 'all' ? 1 : 0) +
    (stockFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Products</h1>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 flex-1 sm:w-64 sm:flex-initial focus-within:border-indigo-500 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by SKU or name..."
              className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 w-full focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 [@media(hover:hover)]:hover:bg-slate-50 dark:[@media(hover:hover)]:hover:bg-slate-800/70'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={onAddProduct}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold [@media(hover:hover)]:hover:bg-indigo-700 inline-flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Expandable Filter Strip */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400 font-medium">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400 font-medium">Stock:</label>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as typeof stockFilter);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All levels</option>
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400 font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                setStockFilter('all');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="ml-auto text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* 8 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>{card.label}</span>
                <span title={card.hint} className="inline-flex items-center text-slate-400 dark:text-slate-500">
                  <HelpCircle className="w-3 h-3" />
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{card.value}</div>
            </div>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.badgeClass}`}
            >
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-indigo-900 dark:text-indigo-100">
            {selectedIds.length} {selectedIds.length === 1 ? 'product' : 'products'} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-indigo-700 dark:text-indigo-300 hover:underline font-medium"
            >
              Deselect all
            </button>
          </div>
        </div>
      )}

      {/* Products Data Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {/* Mobile & Tablet Card List */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedProducts.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <label className="inline-flex items-center gap-2 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all products on page"
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
                />
                <span>Select all on page</span>
              </label>
              <span className="tabular-nums">{filteredProducts.length} items</span>
            </div>
          )}

          {paginatedProducts.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
              No products found matching your search or filter.
            </div>
          ) : (
            paginatedProducts.map((p) => {
              const isActive = p.active !== false;
              const isTracked = p.trackStock !== false;
              const isOutOfStock = isTracked && p.stock <= 0;
              const isLowStock = isTracked && p.stock > 0 && p.stock < 5;
              const hasOffer = p.originalPrice > p.price;
              const explicitVariantCount = p.variants?.length ?? 0;
              const hasModelVariants =
                p.brandModels.length > 1 ||
                (p.brandModels.length === 1 &&
                  p.brandModels[0].toLowerCase() !== 'standard fit' &&
                  p.brandModels[0].toLowerCase() !== 'universal fit');
              const isMenuOpen = openMenu?.productId === p.id;
              const isSelected = selectedIds.includes(p.id);

              return (
                <div
                  key={p.id}
                  className={`p-4 space-y-3 transition-colors duration-150 ${
                    isMenuOpen || isSelected
                      ? 'bg-indigo-50/40 dark:bg-indigo-500/10'
                      : 'active:bg-slate-50 dark:active:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(p.id)}
                      aria-label={`Select ${p.title}`}
                      className="mt-1 rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
                    />
                    <img
                      src={p.image}
                      alt={p.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100 dark:bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onEditProduct(p)}
                        className="text-xs font-semibold text-slate-900 dark:text-slate-100 active:text-indigo-600 dark:active:text-indigo-400 text-left line-clamp-2 leading-snug"
                      >
                        {p.title}
                      </button>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{p.sku}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                          {p.category}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {explicitVariantCount > 0
                            ? `${explicitVariantCount} variant${explicitVariantCount === 1 ? '' : 's'}`
                            : hasModelVariants
                              ? `${p.brandModels.length} models`
                              : 'No variants'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleToggleActionMenu(p.id, e.currentTarget)}
                      aria-label={`Actions for ${p.title}`}
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      className={`p-2 rounded-lg transition-colors shrink-0 ${
                        isMenuOpen
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800'
                      }`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pl-7 text-xs">
                    <div className="flex items-center gap-3 tabular-nums">
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 block">
                          Price
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatTaka(p.price)}</span>
                        {hasOffer && (
                          <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500 line-through">
                            {formatTaka(p.originalPrice)}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 block">
                          Cost
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatTaka(p.costPrice ?? 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 block">
                          Stock
                        </span>
                        <span
                          className={`font-bold ${
                            isOutOfStock
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLowStock
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {p.stock}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                          <PackageX className="w-3 h-3 shrink-0" />
                          Out
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          Low
                        </span>
                      ) : null}

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        aria-label={`Toggle active state for ${p.title}`}
                        onClick={() => onToggleActive(p)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-slate-900 transition-transform shadow-xs ${
                            isActive ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 pl-4 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all products on page"
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
                  />
                </th>
                <th className="py-3 px-3 font-medium">Product</th>
                <th className="py-3 px-3 font-medium">Category</th>
                <th className="py-3 px-3 font-medium">Variants</th>
                <th className="py-3 px-3 font-medium text-right">
                  <span
                    className="inline-flex items-center gap-1"
                    title="Unit purchase cost used for profit and stock valuation"
                  >
                    Cost price <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </span>
                </th>
                <th className="py-3 px-3 font-medium text-right">
                  <span
                    className="inline-flex items-center gap-1"
                    title="Current selling price on the storefront"
                  >
                    Price <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </span>
                </th>
                <th className="py-3 px-3 font-medium text-right">
                  <span
                    className="inline-flex items-center gap-1"
                    title="Units currently available in inventory"
                  >
                    Available <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </span>
                </th>
                <th className="py-3 px-3 font-medium text-center">Active</th>
                <th className="py-3 pl-3 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No products found matching your search or filter.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const isActive = p.active !== false;
                  const isTracked = p.trackStock !== false;
                  const isOutOfStock = isTracked && p.stock <= 0;
                  const isLowStock = isTracked && p.stock > 0 && p.stock < 5;
                  const hasOffer = p.originalPrice > p.price;
                  const explicitVariantCount = p.variants?.length ?? 0;
                  const hasModelVariants =
                    p.brandModels.length > 1 ||
                    (p.brandModels.length === 1 &&
                      p.brandModels[0].toLowerCase() !== 'standard fit' &&
                      p.brandModels[0].toLowerCase() !== 'universal fit');
                  const isMenuOpen = openMenu?.productId === p.id;
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors duration-150 ${
                        isMenuOpen || isSelected
                          ? 'bg-indigo-50/45 dark:bg-indigo-500/10'
                          : '[@media(hover:hover)]:hover:bg-slate-50/80 dark:[@media(hover:hover)]:hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="py-3.5 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(p.id)}
                          aria-label={`Select ${p.title}`}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100 dark:bg-slate-800"
                          />
                          <div className="min-w-0 max-w-[210px]">
                            <button
                              type="button"
                              onClick={() => onEditProduct(p)}
                              className="font-semibold text-slate-900 dark:text-slate-100 [@media(hover:hover)]:hover:text-indigo-600 dark:[@media(hover:hover)]:hover:text-indigo-400 text-left line-clamp-2 leading-snug transition-colors"
                            >
                              {p.title}
                            </button>
                            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                              {p.sku}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {explicitVariantCount > 0
                          ? `${explicitVariantCount} variant${explicitVariantCount === 1 ? '' : 's'}`
                          : hasModelVariants
                            ? `${p.brandModels.length} models`
                            : 'No variants'}
                      </td>

                      <td className="py-3.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                        {formatTaka(p.costPrice ?? 0)}
                      </td>

                      <td className="py-3.5 px-3 text-right tabular-nums">
                        <div className="inline-flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            {hasOffer && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                                Offer
                              </span>
                            )}
                            <span className="font-bold text-slate-900 dark:text-slate-100">{formatTaka(p.price)}</span>
                          </div>
                          {hasOffer && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through">
                              {formatTaka(p.originalPrice)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right tabular-nums">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span
                            className={`font-bold ${
                              isOutOfStock
                                ? 'text-rose-600 dark:text-rose-400'
                                : isLowStock
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {p.stock}
                          </span>
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-semibold whitespace-nowrap">
                              <PackageX className="w-3 h-3 shrink-0" />
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              Low Stock
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          aria-label={`Toggle active state for ${p.title}`}
                          onClick={() => onToggleActive(p)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 [@media(hover:hover)]:hover:opacity-90 ${
                            isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-slate-900 transition-transform shadow-xs ${
                              isActive ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>

                      <td className="py-3.5 pl-3 pr-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => handleToggleActionMenu(p.id, e.currentTarget)}
                          aria-label={`Actions for ${p.title}`}
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isMenuOpen
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                              : 'text-slate-500 dark:text-slate-400 [@media(hover:hover)]:hover:text-slate-900 dark:[@media(hover:hover)]:hover:text-slate-100 [@media(hover:hover)]:hover:bg-slate-100 dark:[@media(hover:hover)]:hover:bg-slate-800'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-center sm:justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="tabular-nums">
              {filteredProducts.length === 0
                ? '0 of 0'
                : `${startIdx + 1}–${Math.min(startIdx + pageSize, filteredProducts.length)} of ${filteredProducts.length}`}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Products per page"
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 [@media(hover:hover)]:hover:bg-slate-100 dark:[@media(hover:hover)]:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                    pageNum === safePage
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 [@media(hover:hover)]:hover:bg-slate-100 dark:[@media(hover:hover)]:hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 [@media(hover:hover)]:hover:bg-slate-100 dark:[@media(hover:hover)]:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Unclipped Floating Action Menu */}
      {openMenu && activeMenuProduct && (
        <div
          ref={menuPanelRef}
          role="menu"
          aria-label={`Product actions for ${activeMenuProduct.title}`}
          style={{
            top: `${openMenu.top}px`,
            left: `${openMenu.left}px`,
            transform: openMenu.openUpward ? 'translateY(-100%)' : undefined,
          }}
          className="fixed z-50 w-46 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 text-left"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null);
              onEditProduct(activeMenuProduct);
            }}
            className="w-full px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 [@media(hover:hover)]:hover:bg-slate-100 dark:[@media(hover:hover)]:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-800 flex items-center gap-2 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Edit product</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null);
              onQuickRestock(activeMenuProduct, 5);
            }}
            className="w-full px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 [@media(hover:hover)]:hover:bg-slate-100 dark:[@media(hover:hover)]:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-800 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Quick restock (+5)</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null);
              onDuplicateProduct(activeMenuProduct);
            }}
            className="w-full px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 [@media(hover:hover)]:hover:bg-slate-100 dark:[@media(hover:hover)]:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-800 flex items-center gap-2 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Duplicate</span>
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null);
              onDeleteProduct(activeMenuProduct.id);
            }}
            className="w-full px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 [@media(hover:hover)]:hover:bg-rose-50 dark:[@media(hover:hover)]:hover:bg-rose-500/20 active:bg-rose-50 dark:active:bg-rose-500/20 flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete product</span>
          </button>
        </div>
      )}
    </div>
  );
}
