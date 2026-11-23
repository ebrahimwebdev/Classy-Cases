import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PhoneCaseProduct } from '../models/phoneCase';
import type { Product } from '../types';

export interface CartEntry {
  productId: string;
  title: string;
  model: string;
  image: string;
  price: number;
  quantity: number;
}

interface CartContextValue {
  items: CartEntry[];
  cartCount: number;
  cartSubtotal: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: PhoneCaseProduct | Product, model?: string, quantity?: number) => void;
  updateQuantity: (productId: string, model: string, delta: number) => void;
  removeItem: (productId: string, model: string) => void;
  clearCart: () => void;
}

const STORAGE_KEY = 'classy_cases_cart_v1';

const CartContext = createContext<CartContextValue | null>(null);

function readPersistedCart(): CartEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CartEntry =>
        entry &&
        typeof entry.productId === 'string' &&
        typeof entry.title === 'string' &&
        typeof entry.model === 'string' &&
        typeof entry.image === 'string' &&
        typeof entry.price === 'number' &&
        Number.isFinite(entry.price) &&
        typeof entry.quantity === 'number' &&
        Number.isInteger(entry.quantity) &&
        entry.quantity > 0
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>(() => readPersistedCart());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors in restricted browsing modes
    }
  }, [items]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setItems(readPersistedCart());
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addItem = useCallback(
    (product: PhoneCaseProduct | Product, model?: string, quantity = 1) => {
      const safeQty = Math.max(1, Math.floor(quantity));
      const chosenModel = model || product.brandModels?.[0] || 'Standard Fit';

      setItems((prev) => {
        const idx = prev.findIndex(
          (entry) => entry.productId === product.id && entry.model === chosenModel
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + safeQty };
          return next;
        }
        return [
          ...prev,
          {
            productId: product.id,
            title: product.title,
            model: chosenModel,
            image: product.image,
            price: product.price,
            quantity: safeQty,
          },
        ];
      });
    },
    []
  );

  const updateQuantity = useCallback((productId: string, model: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.model === model
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((productId: string, model: string) => {
    setItems((prev) =>
      prev.filter((item) => !(item.productId === productId && item.model === model))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const cartCount = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const cartSubtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      cartCount,
      cartSubtotal,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      cartCount,
      cartSubtotal,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
