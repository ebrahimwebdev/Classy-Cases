import React, { useEffect, useRef, useState } from 'react';
import { Search, Smartphone, Tag, X } from 'lucide-react';
import type { SearchSuggestion } from '../models/phoneCase';

interface StorefrontSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmitSearch: () => void;
  suggestions: SearchSuggestion[];
  placeholder?: string;
  compact?: boolean;
}

export function StorefrontSearchBar({
  value,
  onChange,
  onSubmitSearch,
  suggestions,
  placeholder = 'Search by case model or brand (e.g. Motorola, Redmi Note 13)...',
  compact = false,
}: StorefrontSearchBarProps) {
  const [focused, setFocused] = useState(false);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFocused(false);
    inputRef.current?.blur();
    onSubmitSearch();
  }

  function handleSelectSuggestion(label: string) {
    onChange(label);
    setFocused(false);
    inputRef.current?.blur();
    onSubmitSearch();
  }

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex items-center bg-[#f8f9fa] border border-neutral-200 rounded-lg p-1 focus-within:border-neutral-400 focus-within:bg-white transition-colors"
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
            }
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setFocused(true);
          }}
          placeholder={placeholder}
          aria-label="Search phone cases by model or brand"
          className="flex-1 min-w-0 bg-transparent px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />

        {value.trim() !== '' && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors shrink-0"
            aria-label="Clear search query"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          className={`${
            compact ? 'w-8 h-8' : 'w-9 h-9'
          } rounded-md bg-[#111111] text-white flex items-center justify-center hover:bg-neutral-800 transition-colors shrink-0`}
          aria-label="Search products"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {showSuggestions && (
        <div
          role="listbox"
          aria-label="Matching brands and phone models"
          className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-100 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            {value.trim() ? 'Matching Brands & Models' : 'Popular Brands & Models'}
          </div>
          <ul className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <li key={`${suggestion.kind}-${suggestion.label}`}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(suggestion.label);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-neutral-800 hover:bg-neutral-50 flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {suggestion.kind === 'Brand' ? (
                      <Tag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    )}
                    <span className="font-medium truncate">{suggestion.label}</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">
                    {suggestion.kind}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
