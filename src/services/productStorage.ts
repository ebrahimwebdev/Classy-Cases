import type { Product } from '../types';

export const PRODUCTS_STORAGE_KEY = 'classy_cases_products_v1';
export const IMAGES_STORAGE_KEY = 'classy_cases_images_v1';
export const CATALOG_META_STORAGE_KEY = 'classy_cases_catalog_meta_v1';
export const CATALOG_UPDATED_EVENT = 'classy-cases:catalog-updated';

const IMAGE_REF_PREFIX = 'ls-img://';

export interface CatalogStorageMeta {
  hasLocalChanges: boolean;
  updatedAt: string;
  incompleteImages?: boolean;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function hashDataUrl(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}_${value.length}`;
}

export function loadStoredImages(): Record<string, string> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(IMAGES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === 'string' && val.length > 0) {
        result[key] = val;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function resolveImageFromStorage(
  refOrUrl: string,
  imageMap?: Record<string, string>
): string {
  if (!refOrUrl || typeof refOrUrl !== 'string') return '';
  if (!refOrUrl.startsWith(IMAGE_REF_PREFIX)) {
    return refOrUrl;
  }
  const key = refOrUrl.slice(IMAGE_REF_PREFIX.length);
  const map = imageMap || loadStoredImages();
  return map[key] || '';
}

export function saveImageToStorage(urlOrDataUrl: string): string {
  if (!urlOrDataUrl || typeof urlOrDataUrl !== 'string') return '';
  const trimmed = urlOrDataUrl.trim();
  if (!trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  if (!isBrowser()) return trimmed;

  const key = hashDataUrl(trimmed);
  const existing = loadStoredImages();
  if (existing[key] !== trimmed) {
    existing[key] = trimmed;
    try {
      window.localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      return trimmed;
    }
  }
  return `${IMAGE_REF_PREFIX}${key}`;
}

export function loadCatalogMeta(): CatalogStorageMeta {
  if (!isBrowser()) return { hasLocalChanges: false, updatedAt: '', incompleteImages: false };
  try {
    const raw = window.localStorage.getItem(CATALOG_META_STORAGE_KEY);
    if (!raw) return { hasLocalChanges: false, updatedAt: '', incompleteImages: false };
    const parsed = JSON.parse(raw) as Partial<CatalogStorageMeta>;
    return {
      hasLocalChanges: Boolean(parsed?.hasLocalChanges),
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : '',
      incompleteImages: Boolean(parsed?.incompleteImages),
    };
  } catch {
    return { hasLocalChanges: false, updatedAt: '', incompleteImages: false };
  }
}

export function hasLocalCatalogChanges(): boolean {
  return loadCatalogMeta().hasLocalChanges;
}

function resolveProductImages(product: Product, imageMap: Record<string, string>): Product {
  const resolvedMain = resolveImageFromStorage(product.image || '', imageMap);
  const resolvedGallery = Array.isArray(product.galleryImages)
    ? product.galleryImages
        .map((img) => resolveImageFromStorage(img, imageMap))
        .filter((img) => img.length > 0)
    : undefined;

  return {
    ...product,
    image: resolvedMain,
    ...(resolvedGallery !== undefined ? { galleryImages: resolvedGallery } : {}),
  };
}

export function loadStoredProducts(): Product[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const imageMap = loadStoredImages();
    return parsed
      .filter((item): item is Product => Boolean(item && typeof item === 'object' && typeof item.id === 'string'))
      .map((item) => resolveProductImages(item, imageMap));
  } catch {
    return null;
  }
}

function emitCatalogUpdated(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(CATALOG_UPDATED_EVENT));
  } catch {
    // ignore dispatch error
  }
}

export function saveStoredCatalog(
  products: Product[],
  options: { markLocalChanges?: boolean } = {}
): boolean {
  if (!isBrowser()) return false;

  const existingMeta = loadCatalogMeta();
  const nextHasLocalChanges =
    options.markLocalChanges !== undefined
      ? options.markLocalChanges
      : existingMeta.hasLocalChanges;

  const nextImageMap: Record<string, string> = {};
  const existingImageMap = loadStoredImages();

  const dehydrateUrl = (rawUrl: string): string => {
    const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!trimmed) return '';
    if (trimmed.startsWith(IMAGE_REF_PREFIX)) {
      const refKey = trimmed.slice(IMAGE_REF_PREFIX.length);
      if (existingImageMap[refKey]) {
        nextImageMap[refKey] = existingImageMap[refKey];
        return trimmed;
      }
      return '';
    }
    if (trimmed.startsWith('data:image/')) {
      const key = hashDataUrl(trimmed);
      nextImageMap[key] = trimmed;
      return `${IMAGE_REF_PREFIX}${key}`;
    }
    return trimmed;
  };

  const dehydratedProducts: Product[] = products.map((product) => ({
    ...product,
    image: dehydrateUrl(product.image),
    ...(Array.isArray(product.galleryImages)
      ? {
          galleryImages: product.galleryImages
            .map(dehydrateUrl)
            .filter((img) => img.length > 0),
        }
      : {}),
  }));

  const meta: CatalogStorageMeta = {
    hasLocalChanges: nextHasLocalChanges,
    updatedAt: new Date().toISOString(),
    incompleteImages: false,
  };

  try {
    window.localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify(nextImageMap));
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(dehydratedProducts));
    window.localStorage.setItem(CATALOG_META_STORAGE_KEY, JSON.stringify(meta));
    emitCatalogUpdated();
    return true;
  } catch {
    // Fallback 1: keep main images and drop heavy gallery data URLs
    const compactImageMap: Record<string, string> = {};
    const compactProducts: Product[] = products.map((product) => {
      const mainRef = dehydrateUrl(product.image);
      if (mainRef.startsWith(IMAGE_REF_PREFIX)) {
        const k = mainRef.slice(IMAGE_REF_PREFIX.length);
        if (nextImageMap[k]) compactImageMap[k] = nextImageMap[k];
      }
      return {
        ...product,
        image: mainRef,
        galleryImages: Array.isArray(product.galleryImages)
          ? product.galleryImages.filter((g) => !g.startsWith('data:image/'))
          : undefined,
      };
    });

    try {
      window.localStorage.removeItem(IMAGES_STORAGE_KEY);
      window.localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify(compactImageMap));
      window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(compactProducts));
      window.localStorage.setItem(CATALOG_META_STORAGE_KEY, JSON.stringify(meta));
      emitCatalogUpdated();
      return true;
    } catch {
      // Fallback 2: strip data:image/ blobs so PRODUCTS_STORAGE_KEY never stays frozen on stale/deleted products
      try {
        window.localStorage.removeItem(IMAGES_STORAGE_KEY);
        const lightweightProducts: Product[] = compactProducts.map((product) => ({
          ...product,
          image: product.image.startsWith(IMAGE_REF_PREFIX) || product.image.startsWith('data:image/')
            ? ''
            : product.image,
        }));
        const hadDataImages = Object.keys(compactImageMap).length > 0;
        const lightweightMeta: CatalogStorageMeta = {
          ...meta,
          incompleteImages: hadDataImages,
        };
        window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(lightweightProducts));
        window.localStorage.setItem(CATALOG_META_STORAGE_KEY, JSON.stringify(lightweightMeta));
        emitCatalogUpdated();
        return true;
      } catch {
        // Last resort: clear stale product cache so deleted products never flash back on reload
        try {
          window.localStorage.removeItem(IMAGES_STORAGE_KEY);
          window.localStorage.removeItem(PRODUCTS_STORAGE_KEY);
          window.localStorage.setItem(
            CATALOG_META_STORAGE_KEY,
            JSON.stringify({ ...meta, incompleteImages: true })
          );
        } catch {
          // ignore storage quota errors
        }
        return false;
      }
    }
  }
}

export function upsertStoredProduct(product: Product): Product[] {
  const current = loadStoredProducts() || [];
  const idx = current.findIndex((p) => p.id === product.id);
  const next =
    idx >= 0
      ? current.map((p, i) => (i === idx ? product : p))
      : [product, ...current];
  saveStoredCatalog(next, { markLocalChanges: true });
  return next;
}

export function removeStoredProduct(productId: string): Product[] {
  const current = loadStoredProducts() || [];
  const next = current.filter((p) => p.id !== productId);
  saveStoredCatalog(next, { markLocalChanges: true });
  return next;
}

export function subscribeToCatalogStorage(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === PRODUCTS_STORAGE_KEY ||
      event.key === IMAGES_STORAGE_KEY ||
      event.key === CATALOG_META_STORAGE_KEY
    ) {
      onChange();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(CATALOG_UPDATED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(CATALOG_UPDATED_EVENT, onChange);
  };
}
