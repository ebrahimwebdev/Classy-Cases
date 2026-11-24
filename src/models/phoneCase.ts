import type { Product } from '../types';

export interface PhoneCaseProduct extends Product {
  /** Supported phone models for this case (e.g., Motorola Edge 50 Pro) */
  brandModels: string[];
  /** Current sale price in BDT (৳) */
  price: number;
  /** Original retail price before discount in BDT (৳) */
  originalPrice: number;
  /** Percentage discount badge value */
  discountPercent: number;
  /** Primary studio product image path */
  image: string;
}

export function formatTaka(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `৳${safe.toLocaleString('en-US')}`;
}

export function calculateDiscountPercent(price: number, originalPrice: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(originalPrice) || originalPrice <= price || originalPrice <= 0) {
    return 0;
  }
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function normalizePhoneCaseProduct(raw: Product): PhoneCaseProduct {
  const discountPercent =
    raw.discountPercent > 0 ? raw.discountPercent : calculateDiscountPercent(raw.price, raw.originalPrice);

  return {
    ...raw,
    brandModels: Array.isArray(raw.brandModels) && raw.brandModels.length > 0 ? raw.brandModels : ['Standard Fit'],
    discountPercent,
  };
}

function stripHtmlTags(input?: string): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchesPhoneCaseSearch(product: PhoneCaseProduct, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const haystack = [
    product.title,
    stripHtmlTags(product.shortDescription),
    stripHtmlTags(product.description),
    product.category,
    product.brand || '',
    ...(product.alsoShowIn || []),
    product.sku,
    ...product.brandModels,
  ]
    .join(' ')
    .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
}

export interface SearchSuggestion {
  label: string;
  kind: 'Product' | 'Brand' | 'Model';
  productId?: string;
  image?: string;
  price?: number;
  category?: string;
  descriptionSnippet?: string;
}

export function extractSearchSuggestions(
  products: PhoneCaseProduct[],
  query: string,
  limit = 8
): SearchSuggestion[] {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const suggestions: SearchSuggestion[] = [];

  if (q) {
    for (const product of products) {
      if (matchesPhoneCaseSearch(product, q) && !seen.has(`product:${product.id}`)) {
        seen.add(`product:${product.id}`);
        const cleanDesc = stripHtmlTags(product.shortDescription || product.description);
        suggestions.push({
          label: product.title,
          kind: 'Product',
          productId: product.id,
          image: product.image,
          price: product.price,
          category: product.category,
          descriptionSnippet: cleanDesc ? cleanDesc.slice(0, 80) : undefined,
        });
      }
    }
  }

  for (const product of products) {
    const brand = product.category.trim();
    if (brand && !seen.has(`brand:${brand.toLowerCase()}`)) {
      if (!q || brand.toLowerCase().includes(q)) {
        seen.add(`brand:${brand.toLowerCase()}`);
        suggestions.push({ label: brand, kind: 'Brand' });
      }
    }
  }

  for (const product of products) {
    for (const model of product.brandModels) {
      const cleanModel = model.trim();
      if (!cleanModel || cleanModel.toLowerCase() === 'standard fit') continue;
      if (!seen.has(`model:${cleanModel.toLowerCase()}`)) {
        const brandAndModel = `${product.category} ${cleanModel}`.toLowerCase();
        if (!q || cleanModel.toLowerCase().includes(q) || brandAndModel.includes(q)) {
          seen.add(`model:${cleanModel.toLowerCase()}`);
          suggestions.push({ label: cleanModel, kind: 'Model' });
        }
      }
    }
  }

  return suggestions.slice(0, limit);
}

