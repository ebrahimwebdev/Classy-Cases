import { useCallback, useEffect, useState } from 'react';
import type { Product } from '../types';
import {
  hasLocalCatalogChanges,
  loadStoredProducts,
  saveStoredCatalog,
  subscribeToCatalogStorage,
} from '../services/productStorage';

interface UsePersistedProductsOptions {
  /** When true, only active products are returned (used on the public storefront). */
  activeOnly?: boolean;
}

function filterActive(list: Product[], activeOnly: boolean): Product[] {
  return activeOnly ? list.filter((p) => p.active !== false) : list;
}

export function usePersistedProducts(options: UsePersistedProductsOptions = {}) {
  const { activeOnly = false } = options;

  const [products, setProductsState] = useState<Product[]>(() => {
    const stored = loadStoredProducts();
    return stored ? filterActive(stored, activeOnly) : [];
  });

  const [hasCachedCatalog, setHasCachedCatalog] = useState<boolean>(() => {
    return loadStoredProducts() !== null;
  });

  useEffect(() => {
    return subscribeToCatalogStorage(() => {
      const stored = loadStoredProducts();
      if (stored) {
        setProductsState(filterActive(stored, activeOnly));
        setHasCachedCatalog(true);
      }
    });
  }, [activeOnly]);

  const persistProducts = useCallback(
    (nextProducts: Product[], markLocalChanges = true) => {
      saveStoredCatalog(nextProducts, { markLocalChanges });
      setProductsState(filterActive(nextProducts, activeOnly));
      setHasCachedCatalog(true);
    },
    [activeOnly]
  );

  /**
   * Reconciles products fetched from the server with localStorage.
   * If the server has fresh default seed data (`serverCatalogModified === false`)
   * while the browser holds user-saved products/images in localStorage,
   * the localStorage catalog is preserved and returned.
   */
  const syncWithServerCatalog = useCallback(
    (serverProducts: Product[], serverCatalogModified: boolean): Product[] => {
      const stored = loadStoredProducts();
      if (!serverCatalogModified && stored && hasLocalCatalogChanges()) {
        const visible = filterActive(stored, activeOnly);
        setProductsState(visible);
        setHasCachedCatalog(true);
        return stored;
      }

      saveStoredCatalog(serverProducts, {
        markLocalChanges: serverCatalogModified || hasLocalCatalogChanges(),
      });
      setProductsState(filterActive(serverProducts, activeOnly));
      setHasCachedCatalog(true);
      return serverProducts;
    },
    [activeOnly]
  );

  return {
    products,
    hasCachedCatalog,
    persistProducts,
    syncWithServerCatalog,
  };
}
