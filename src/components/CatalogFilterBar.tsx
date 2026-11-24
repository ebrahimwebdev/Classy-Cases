import React from 'react';
import { ArrowUpDown, Check, ChevronDown, Search, Smartphone, X } from 'lucide-react';
import type { Category, Product } from '../types';

export type CatalogSortOption =
  | 'featured'
  | 'price_asc'
  | 'price_desc'
  | 'discount_desc'
  | 'name_asc';

interface CatalogFilterBarProps {
  categories: Category[];
  products: Product[];
  selectedCategory: string;
  selectedModel: string;
  availableModels: string[];
  sortBy: CatalogSortOption;
  inStockOnly: boolean;
  searchQuery: string;
  onSelectCategory: (category: string) => void;
  onSelectModel: (model: string) => void;
  onSortChange: (sort: CatalogSortOption) => void;
  onToggleInStockOnly: () => void;
  onSearchChange: (query: string) => void;
}

export function CatalogFilterBar({
  categories,
  products,
  selectedCategory,
  selectedModel,
  availableModels,
  sortBy,
  inStockOnly,
  searchQuery,
  onSelectCategory,
  onSelectModel,
  onSortChange,
  onToggleInStockOnly,
  onSearchChange,
}: CatalogFilterBarProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* Row 1: Brand / Category Segmented Tabs + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter products by brand category"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#E4D5B7] overflow-x-auto no-scrollbar max-w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'All'}
            onClick={() => onSelectCategory('All')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors tabular-nums cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                : 'text-[#5A2D30] hover:text-[#650108]'
            }`}
          >
            All ({products.length})
          </button>
          {categories.map((cat) => {
            const catActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            const catCount = products.filter(
              (p) =>
                p.category.toLowerCase() === cat.name.toLowerCase() ||
                (p.alsoShowIn || []).some((c) => c.toLowerCase() === cat.name.toLowerCase())
            ).length;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={catActive}
                onClick={() => onSelectCategory(catActive ? 'All' : cat.name)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors tabular-nums cursor-pointer ${
                  catActive
                    ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                    : 'text-[#5A2D30] hover:text-[#650108]'
                }`}
              >
                {cat.name} ({catCount})
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-80 shrink-0">
          <Search className="w-4 h-4 text-[#650108]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter by name, model, or brand..."
            aria-label="Filter catalog products in real time"
            className="w-full h-10 pl-9 pr-8 text-xs bg-[#FFFDF8] border border-[#DFCFB0] rounded-xl text-[#2B1416] placeholder:text-[#8E6F70] focus:outline-none focus:border-[#650108] transition-colors [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery.trim() !== '' && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search filter"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E6F70] hover:text-[#650108] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Phone Model Selector, Availability Toggle, and Sort Control */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#DFCFB0]/70">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Model Dropdown */}
          <div className="relative min-w-[200px] sm:min-w-[235px]">
            <Smartphone
              className="w-3.5 h-3.5 text-[#650108]/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              aria-label="Filter by phone model"
              className="w-full h-9 pl-8 pr-8 text-xs font-medium bg-[#FFFDF8] border border-[#DFCFB0] rounded-xl text-[#2B1416] appearance-none focus:outline-none focus:border-[#650108] transition-colors cursor-pointer"
            >
              <option value="All">
                All Phone Models ({availableModels.length})
              </option>
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 text-[#6B4C4E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          {/* In-Stock Toggle */}
          <button
            type="button"
            onClick={onToggleInStockOnly}
            aria-pressed={inStockOnly}
            className={`h-9 px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              inStockOnly
                ? 'bg-[#650108] border-[#650108] text-[#F2E8D2]'
                : 'bg-[#FFFDF8] border-[#DFCFB0] text-[#5A2D30] hover:border-[#650108]/50 hover:text-[#650108]'
            }`}
          >
            {inStockOnly && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            <span>In Stock Only</span>
          </button>
        </div>

        {/* Sort Control */}
        <div className="relative min-w-[185px] sm:min-w-[205px]">
          <ArrowUpDown
            className="w-3.5 h-3.5 text-[#650108]/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as CatalogSortOption)}
            aria-label="Sort products"
            className="w-full h-9 pl-8 pr-8 text-xs font-medium bg-[#FFFDF8] border border-[#DFCFB0] rounded-xl text-[#2B1416] appearance-none focus:outline-none focus:border-[#650108] transition-colors cursor-pointer"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="discount_desc">Biggest Discount</option>
            <option value="name_asc">Name: A to Z</option>
          </select>
          <ChevronDown
            className="w-3.5 h-3.5 text-[#6B4C4E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
