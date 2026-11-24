import React, { useEffect, useRef, useState } from 'react';
import { Package, Search, Smartphone, Tag, X } from 'lucide-react';
import { formatTaka, type SearchSuggestion } from '../models/phoneCase';

interface StorefrontSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmitSearch: () => void;
  onSelectProduct?: (productId: string) => void;
  onSelectCategory?: (category: string) => void;
  suggestions: SearchSuggestion[];
  placeholder?: string;
  compact?: boolean;
}

export function StorefrontSearchBar({
  value,
  onChange,
  onSubmitSearch,
  onSelectProduct,
  onSelectCategory,
  suggestions,
  placeholder = 'Search cases by name, description, or model...',
  compact = false,
}: StorefrontSearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    setHighlightedIdx(-1);
  }, [value, suggestions.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
      handleSelectSuggestion(suggestions[highlightedIdx]);
      return;
    }
    setFocused(false);
    inputRef.current?.blur();
    onSubmitSearch();
  }

  function handleSelectSuggestion(suggestion: SearchSuggestion) {
    setFocused(false);
    inputRef.current?.blur();

    if (suggestion.kind === 'Product' && suggestion.productId && onSelectProduct) {
      onSelectProduct(suggestion.productId);
      return;
    }
    if (suggestion.kind === 'Brand' && onSelectCategory) {
      onChange('');
      onSelectCategory(suggestion.label);
      return;
    }
    onChange(suggestion.label);
    onSubmitSearch();
  }

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex items-center bg-[#FFFDF8] border border-[#DFCFB0] rounded-lg p-1 focus-within:border-[#650108] focus-within:bg-white transition-colors"
      >
        <input
          ref={inputRef}
          type="search"
          value={value}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setFocused(false);
              inputRef.current?.blur();
            } else if (e.key === 'ArrowDown' && showSuggestions) {
              e.preventDefault();
              setHighlightedIdx((prev) => (prev + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp' && showSuggestions) {
              e.preventDefault();
              setHighlightedIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
            }
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setFocused(true);
          }}
          placeholder={placeholder}
          aria-label="Search products by name, description, category, or model"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          className="flex-1 min-w-0 bg-transparent px-3 py-1.5 text-sm text-[#2B1416] placeholder:text-[#8E6F70] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />

        {value.trim() !== '' && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="p-1.5 text-[#8E6F70] hover:text-[#650108] transition-colors shrink-0 cursor-pointer"
            aria-label="Clear search query"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          className={`${
            compact ? 'w-8 h-8' : 'w-9 h-9'
          } rounded-md bg-[#650108] text-[#F2E8D2] flex items-center justify-center hover:bg-[#4D0106] transition-colors shrink-0 cursor-pointer`}
          aria-label="Search products"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {showSuggestions && (
        <div
          role="listbox"
          aria-label="Live matching products, categories, and models"
          className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#FFFDF8] border border-[#DFCFB0] rounded-xl shadow-lg overflow-hidden"
        >
          <div className="px-3 py-1.5 bg-[#F2E8D2]/70 border-b border-[#E5D6B8] text-[11px] font-semibold tracking-wide text-[#650108] flex items-center justify-between">
            <span>{value.trim() ? 'Instant matches' : 'Popular categories & models'}</span>
            {value.trim() && (
              <span className="tabular-nums text-[#6B4C4E]">{suggestions.length} shown</span>
            )}
          </div>
          <ul className="divide-y divide-[#EDE2C9] max-h-72 overflow-y-auto">
            {suggestions.map((suggestion, idx) => {
              const isHighlighted = idx === highlightedIdx;
              return (
                <li key={`${suggestion.kind}-${suggestion.productId || suggestion.label}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isHighlighted}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(suggestion);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-xs text-[#2B1416] flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                      isHighlighted ? 'bg-[#F2E8D2]/80' : 'hover:bg-[#F2E8D2]/45'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {suggestion.kind === 'Product' ? (
                        suggestion.image ? (
                          <img
                            src={suggestion.image}
                            alt={suggestion.label}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-md object-cover border border-[#DFCFB0] shrink-0"
                          />
                        ) : (
                          <span className="w-8 h-8 rounded-md bg-[#F2E8D2]/60 border border-[#DFCFB0] flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-[#650108]/60" />
                          </span>
                        )
                      ) : suggestion.kind === 'Brand' ? (
                        <Tag className="w-3.5 h-3.5 text-[#650108] shrink-0" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5 text-[#650108] shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="font-medium text-[#2B1416] block truncate">
                          {suggestion.label}
                        </span>
                        {suggestion.kind === 'Product' && suggestion.category && (
                          <span className="text-[11px] font-normal text-[#6B4C4E] block truncate tabular-nums">
                            {suggestion.category} ·{' '}
                            <span className="font-bold text-[#650108]">
                              {formatTaka(suggestion.price ?? 0)}
                            </span>
                            {suggestion.descriptionSnippet ? ` — ${suggestion.descriptionSnippet}` : ''}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-[11px] font-medium text-[#650108]/70 shrink-0">
                      {suggestion.kind === 'Brand' ? 'Category' : suggestion.kind}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
