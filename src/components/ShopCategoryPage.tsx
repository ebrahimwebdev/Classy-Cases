import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  PackageSearch,
  Search,
  SlidersHorizontal,
  Smartphone,
  X,
} from 'lucide-react';
import type { PhoneCaseProduct } from '../models/phoneCase';
import type { Category } from '../types';
import {
  getCategoryByName,
  getRootCategoryFor,
  getSubcategories,
  getTopLevelCategories,
} from '../utils/categoryTree';
import type { CatalogSortOption } from './CatalogFilterBar';
import { PhoneCaseCard } from './PhoneCaseGrid';

interface ShopCategoryPageProps {
  categories: Category[];
  products: PhoneCaseProduct[];
  loading: boolean;
  selectedCategory: string;
  selectedModel: string;
  availableModels: string[];
  sortBy: CatalogSortOption;
  inStockOnly: boolean;
  searchQuery: string;
  wishlist: string[];
  desktopColumns?: 2 | 3 | 4 | 5;
  onNavigateHome: () => void;
  onSelectCategory: (categoryName: string) => void;
  onSelectModel: (model: string) => void;
  onSortChange: (sort: CatalogSortOption) => void;
  onToggleInStockOnly: () => void;
  onSearchChange: (query: string) => void;
  onResetFilters: () => void;
  onSelectProduct: (product: PhoneCaseProduct) => void;
  onQuickView?: (product: PhoneCaseProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: PhoneCaseProduct) => void;
}

const GRID_COLUMN_CLASSES: Record<2 | 3 | 4 | 5, string> = {
  2: 'grid-cols-2 lg:grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
};

function getCategoryTrail(categories: Category[], categoryName: string): Category[] {
  const current = getCategoryByName(categories, categoryName);
  if (!current) return [];

  const byId = new Map(categories.map((c) => [c.id, c]));
  const trail: Category[] = [current];
  const visited = new Set<string>([current.id]);

  let cursor = current;
  while (cursor.parentId && byId.has(cursor.parentId) && !visited.has(cursor.parentId)) {
    const parent = byId.get(cursor.parentId)!;
    visited.add(parent.id);
    trail.unshift(parent);
    cursor = parent;
  }

  return trail;
}

export function ShopCategoryPage({
  categories,
  products,
  loading,
  selectedCategory,
  selectedModel,
  availableModels,
  sortBy,
  inStockOnly,
  searchQuery,
  wishlist,
  desktopColumns = 4,
  onNavigateHome,
  onSelectCategory,
  onSelectModel,
  onSortChange,
  onToggleInStockOnly,
  onSearchChange,
  onResetFilters,
  onSelectProduct,
  onQuickView,
  onToggleWishlist,
  onAddToCart,
}: ShopCategoryPageProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isAllSelected = selectedCategory.trim().toLowerCase() === 'all';
  const topLevelCategories = useMemo(() => getTopLevelCategories(categories), [categories]);
  const activeCategoryObj = useMemo(
    () => (isAllSelected ? undefined : getCategoryByName(categories, selectedCategory)),
    [categories, selectedCategory, isAllSelected]
  );
  const activeRoot = useMemo(
    () => (isAllSelected ? undefined : getRootCategoryFor(categories, selectedCategory)),
    [categories, selectedCategory, isAllSelected]
  );
  const rootSubcategories = useMemo(
    () => (activeRoot ? getSubcategories(categories, activeRoot.id) : []),
    [categories, activeRoot]
  );
  const ancestorTrail = useMemo(
    () => (isAllSelected ? [] : getCategoryTrail(categories, selectedCategory)),
    [categories, selectedCategory, isAllSelected]
  );

  const showBranchSubcategories = Boolean(activeRoot && rootSubcategories.length > 0);
  const extraFilterCount =
    (selectedModel !== 'All' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  const hasAnyActiveFilter = !isAllSelected || extraFilterCount > 0;

  const pageTitle = isAllSelected
    ? sortBy === 'discount_desc'
      ? 'Offers & Deals'
      : 'All Phone Cases'
    : activeCategoryObj?.name || selectedCategory;

  const pageSubtitle = isAllSelected
    ? 'Discover our collection of crafted, everyday-protective phone cases.'
    : activeCategoryObj?.description?.trim() ||
      `Discover our collection of premium ${activeCategoryObj?.name || selectedCategory} cases.`;

  const gridColsClass = GRID_COLUMN_CLASSES[desktopColumns] || GRID_COLUMN_CLASSES[4];

  function handleClearCategoryChip(index: number) {
    if (index === 0) {
      onSelectCategory('All');
      return;
    }
    const parentCat = ancestorTrail[index - 1];
    onSelectCategory(parentCat ? parentCat.name : 'All');
  }

  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-5 sm:pt-7 pb-16">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs sm:text-[13px] text-[#6B4C4E] mb-3"
      >
        <button
          type="button"
          onClick={onNavigateHome}
          className="hover:text-[#650108] transition-colors cursor-pointer"
        >
          Home
        </button>

        {isAllSelected ? (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-[#8E6F70] shrink-0" aria-hidden="true" />
            <span className="font-medium text-[#2B1416]">Shop</span>
          </>
        ) : ancestorTrail.length > 0 ? (
          ancestorTrail.map((cat, idx) => {
            const isLast = idx === ancestorTrail.length - 1;
            return (
              <React.Fragment key={cat.id}>
                <ChevronRight
                  className="w-3.5 h-3.5 text-[#8E6F70] shrink-0"
                  aria-hidden="true"
                />
                {isLast ? (
                  <span className="font-medium text-[#2B1416]">{cat.name}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectCategory(cat.name)}
                    className="hover:text-[#650108] transition-colors cursor-pointer"
                  >
                    {cat.name}
                  </button>
                )}
              </React.Fragment>
            );
          })
        ) : (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-[#8E6F70] shrink-0" aria-hidden="true" />
            <span className="font-medium text-[#2B1416]">{selectedCategory}</span>
          </>
        )}
      </nav>

      {/* Category Heading & Description */}
      <header className="mb-5">
        <h1 className="font-brand text-2xl sm:text-3xl font-semibold text-[#650108] tracking-tight">
          {pageTitle}
        </h1>
        <p className="text-xs sm:text-sm text-[#6B4C4E] mt-1 leading-relaxed">{pageSubtitle}</p>
      </header>

      {/* Sub-category / Brand Switcher Pills */}
      <div
        role="tablist"
        aria-label={
          showBranchSubcategories && activeRoot
            ? `${activeRoot.name} collections`
            : 'Browse categories'
        }
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-4 sm:flex-wrap"
      >
        {showBranchSubcategories && activeRoot ? (
          <>
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory.toLowerCase() === activeRoot.name.toLowerCase()}
              onClick={() => onSelectCategory(activeRoot.name)}
              className={`px-4 py-2 rounded-full text-xs sm:text-[13px] font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                selectedCategory.toLowerCase() === activeRoot.name.toLowerCase()
                  ? 'bg-[#650108] border-[#650108] text-[#F2E8D2] font-semibold shadow-xs'
                  : 'bg-[#FFFDF8] border-[#DFCFB0] text-[#5A2D30] hover:border-[#650108]/50 hover:text-[#650108]'
              }`}
            >
              All {activeRoot.name}
            </button>
            {rootSubcategories.map((sub) => {
              const subActive = selectedCategory.toLowerCase() === sub.name.toLowerCase();
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={subActive}
                  onClick={() => onSelectCategory(sub.name)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-[13px] font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                    subActive
                      ? 'bg-[#650108] border-[#650108] text-[#F2E8D2] font-semibold shadow-xs'
                      : 'bg-[#FFFDF8] border-[#DFCFB0] text-[#5A2D30] hover:border-[#650108]/50 hover:text-[#650108]'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </>
        ) : (
          <>
            <button
              type="button"
              role="tab"
              aria-selected={isAllSelected}
              onClick={() => onSelectCategory('All')}
              className={`px-4 py-2 rounded-full text-xs sm:text-[13px] font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                isAllSelected
                  ? 'bg-[#650108] border-[#650108] text-[#F2E8D2] font-semibold shadow-xs'
                  : 'bg-[#FFFDF8] border-[#DFCFB0] text-[#5A2D30] hover:border-[#650108]/50 hover:text-[#650108]'
              }`}
            >
              All Cases
            </button>
            {topLevelCategories.map((cat) => {
              const active = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectCategory(cat.name)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-[13px] font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#650108] border-[#650108] text-[#F2E8D2] font-semibold shadow-xs'
                      : 'bg-[#FFFDF8] border-[#DFCFB0] text-[#5A2D30] hover:border-[#650108]/50 hover:text-[#650108]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Filters Button, Product Count & Sort Control */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              className={`h-10 px-4 rounded-full border text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                filtersOpen || extraFilterCount > 0
                  ? 'bg-[#650108] border-[#650108] text-[#F2E8D2]'
                  : 'bg-[#FFFDF8] border-[#DFCFB0] text-[#2B1416] hover:border-[#650108]/50 hover:text-[#650108]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Filters</span>
              {extraFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-[#F2E8D2] text-[#650108] text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                  {extraFilterCount}
                </span>
              )}
            </button>

            <span className="text-xs sm:text-[13px] text-[#6B4C4E] tabular-nums">
              <strong className="font-semibold text-[#2B1416]">{products.length}</strong>{' '}
              {products.length === 1 ? 'product' : 'products'}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as CatalogSortOption)}
              aria-label="Sort products"
              className="w-full h-11 pl-4 pr-10 rounded-full bg-[#FFFDF8] border border-[#DFCFB0] text-xs sm:text-[13px] font-medium text-[#2B1416] appearance-none focus:outline-none focus:border-[#650108] transition-colors cursor-pointer"
            >
              <option value="featured">Latest / Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="discount_desc">Biggest Discount</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
            <ChevronDown
              className="w-4 h-4 text-[#6B4C4E] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Collapsible Filters Panel */}
        {filtersOpen && (
          <div className="bg-[#FAF4E6] border border-[#DFCFB0] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search within shop */}
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-[#650108]/65 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Filter by name, model, or brand..."
                aria-label="Filter by name, model, or brand"
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#FFFDF8] border border-[#DFCFB0] text-xs text-[#2B1416] placeholder:text-[#8E6F70] focus:outline-none focus:border-[#650108] [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E6F70] hover:text-[#650108] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Brand / Category Selector */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => onSelectCategory(e.target.value)}
                aria-label="Filter by brand category"
                className="w-full h-10 pl-3.5 pr-8 rounded-xl bg-[#FFFDF8] border border-[#DFCFB0] text-xs font-medium text-[#2B1416] appearance-none focus:outline-none focus:border-[#650108] cursor-pointer"
              >
                <option value="All">All Categories</option>
                {topLevelCategories.map((cat) => {
                  const subs = getSubcategories(categories, cat.id);
                  return (
                    <React.Fragment key={cat.id}>
                      <option value={cat.name}>{cat.name}</option>
                      {subs.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          &nbsp;&nbsp;↳ {sub.name}
                        </option>
                      ))}
                    </React.Fragment>
                  );
                })}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 text-[#6B4C4E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>

            {/* Phone Model Selector */}
            <div className="relative">
              <Smartphone
                className="w-3.5 h-3.5 text-[#650108]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                aria-label="Filter by phone model"
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#FFFDF8] border border-[#DFCFB0] text-xs font-medium text-[#2B1416] appearance-none focus:outline-none focus:border-[#650108] cursor-pointer"
              >
                <option value="All">All Phone Models ({availableModels.length})</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 text-[#6B4C4E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>

            {/* In Stock Only Toggle */}
            <button
              type="button"
              onClick={onToggleInStockOnly}
              aria-pressed={inStockOnly}
              className={`h-10 px-4 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                inStockOnly
                  ? 'bg-[#650108] border-[#650108] text-[#F2E8D2]'
                  : 'bg-[#FFFDF8] border-[#DFCFB0] text-[#5A2D30] hover:border-[#650108]/50 hover:text-[#650108]'
              }`}
            >
              {inStockOnly && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
              <span>In Stock Only</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Chips */}
      {hasAnyActiveFilter && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-xs sm:text-[13px] text-[#6B4C4E] mr-0.5">Active Filters:</span>

          {!isAllSelected &&
            (ancestorTrail.length > 0 ? (
              ancestorTrail.map((cat, idx) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleClearCategoryChip(idx)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF8] border border-[#DFCFB0] text-xs font-medium text-[#2B1416] hover:border-[#650108] hover:text-[#650108] transition-colors cursor-pointer"
                >
                  <span>{cat.name}</span>
                  <X className="w-3.5 h-3.5 text-[#6B4C4E]" aria-hidden="true" />
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => onSelectCategory('All')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF8] border border-[#DFCFB0] text-xs font-medium text-[#2B1416] hover:border-[#650108] hover:text-[#650108] transition-colors cursor-pointer"
              >
                <span>{selectedCategory}</span>
                <X className="w-3.5 h-3.5 text-[#6B4C4E]" aria-hidden="true" />
              </button>
            ))}

          {selectedModel !== 'All' && (
            <button
              type="button"
              onClick={() => onSelectModel('All')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF8] border border-[#DFCFB0] text-xs font-medium text-[#2B1416] hover:border-[#650108] hover:text-[#650108] transition-colors cursor-pointer"
            >
              <span>{selectedModel}</span>
              <X className="w-3.5 h-3.5 text-[#6B4C4E]" aria-hidden="true" />
            </button>
          )}

          {inStockOnly && (
            <button
              type="button"
              onClick={onToggleInStockOnly}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF8] border border-[#DFCFB0] text-xs font-medium text-[#2B1416] hover:border-[#650108] hover:text-[#650108] transition-colors cursor-pointer"
            >
              <span>In Stock Only</span>
              <X className="w-3.5 h-3.5 text-[#6B4C4E]" aria-hidden="true" />
            </button>
          )}

          {searchQuery.trim() !== '' && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF8] border border-[#DFCFB0] text-xs font-medium text-[#2B1416] hover:border-[#650108] hover:text-[#650108] transition-colors cursor-pointer"
            >
              <span>&ldquo;{searchQuery.trim()}&rdquo;</span>
              <X className="w-3.5 h-3.5 text-[#6B4C4E]" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Product Grid or Empty State */}
      {loading ? (
        <div className={`grid ${gridColsClass} gap-2.5 sm:gap-4`}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="border border-[#DFCFB0] bg-[#FFFDF8] rounded-xl p-2.5 sm:p-3 animate-pulse"
            >
              <div className="aspect-square rounded-lg bg-[#EADEC2]/70 mb-3" />
              <div className="h-4 bg-[#EADEC2]/70 rounded w-4/5 mb-2" />
              <div className="h-4 bg-[#EADEC2]/70 rounded w-2/5 mb-4" />
              <div className="h-9 bg-[#EADEC2]/70 rounded-lg" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-[#FFFDF8] border border-[#DFCFB0] rounded-2xl py-16 sm:py-20 px-6 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF4E6] border border-[#EDE2C9] text-[#8E6F70] flex items-center justify-center mx-auto">
            <PackageSearch className="w-7 h-7 stroke-[1.6]" aria-hidden="true" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-[#2B1416] mt-4">
            No products found
          </h2>
          <p className="text-xs sm:text-sm text-[#6B4C4E] mt-1.5 max-w-sm mx-auto leading-relaxed">
            Try adjusting your filters or search query.
          </p>
          {hasAnyActiveFilter && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-5 px-5 py-2.5 rounded-xl bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-2.5 sm:gap-4`}>
          {products.map((product) => (
            <PhoneCaseCard
              key={product.id}
              product={product}
              isWishlisted={wishlist.includes(product.id)}
              onSelectProduct={onSelectProduct}
              onQuickView={onQuickView}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
