import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  BarChart2,
  BarChart3,
  Barcode,
  Bell,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  CloudUpload,
  CreditCard,
  DollarSign,
  Film,
  Filter,
  FolderOpen,
  HelpCircle,
  History,
  Layers,
  LayoutGrid,
  Loader2,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Package,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Store,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import type {
  Category,
  Coupon,
  DashboardAnalytics,
  Expense,
  FulfillmentStatus,
  Order,
  Product,
  ProductReview,
  StoreSettings,
  Subscriber,
} from '../types';
import {
  AdminAccountingReportsView,
  type AccountingReportSection,
} from './AdminAccountingReportsView';
import {
  AdminInventoryCatalogViews,
  type CategoryFormPayload,
  type InventoryCatalogSection,
} from './AdminInventoryCatalogViews';
import { AdminProductEditor, type ProductEditorPayload } from './AdminProductEditor';
import { AdminProductsView } from './AdminProductsView';
import { AdminSettings, type SettingsTab } from './AdminSettings';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { usePersistedProducts } from '../hooks/usePersistedProducts';
import { hasLocalCatalogChanges, loadStoredProducts } from '../services/productStorage';

type AdminSection =
  | 'Dashboard'
  | 'Inventory Dashboard'
  | 'Web Orders'
  | 'Orders'
  | 'Point of Sale'
  | 'Order Scan'
  | 'Purchases'
  | 'Customers'
  | 'Reviews'
  | 'Marketing'
  | 'Products'
  | 'Import Product'
  | 'Catalog Categories'
  | 'Brands'
  | 'Warranties'
  | 'Stock Levels'
  | 'Stock Tracker'
  | 'Stock Adjustment'
  | 'Barcodes'
  | 'Transactions'
  | 'Expenses'
  | 'Payroll'
  | 'Accounts'
  | 'Categories'
  | 'Courier payments'
  | 'Activity log'
  | 'Profit & Sales'
  | 'More Reports'
  | 'Settings';

interface AdminDashboardProps {
  adminToken: string | null;
  onAdminTokenChange: (token: string | null) => void;
  onBackToStore: () => void;
}

const PRESET_PRODUCT_IMAGES = [
  { label: 'Frosted MagSafe Rose Gold', url: '/src/assets/images/case_magsafe_frosted_gold_1795455910914.jpg' },
  { label: 'Frosted MagSafe Copper', url: '/src/assets/images/case_magsafe_frosted_copper_1795455911268.jpg' },
  { label: 'Pastel Silicone Electroplated', url: '/src/assets/images/case_pastel_electroplated_1795455911610.jpg' },
  { label: 'Carbon Lens Holder Kickstand', url: '/src/assets/images/case_carbon_lens_holder_1795455912129.jpg' },
  { label: 'Luxury Carbon PU Red Trim', url: '/src/assets/images/case_luxury_carbon_red_1795455912097.jpg' },
  { label: 'Crystal Clear MagSafe Armor', url: '/src/assets/images/case_crystal_clear_vivo_1795455912579.jpg' },
];

export function AdminDashboard({
  adminToken,
  onAdminTokenChange,
  onBackToStore,
}: AdminDashboardProps) {
  const setAdminToken = onAdminTokenChange;
  const { signInWithGoogle, signOutUser } = useFirebaseAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(() => !adminToken);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Dashboard data
  const [activeSection, setActiveSection] = useState<AdminSection>('Dashboard');
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('General');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('classycases_admin_dark') !== 'false';
    } catch {
      return true;
    }
  });

  function toggleDarkMode() {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('classycases_admin_dark', next ? 'true' : 'false');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const {
    products,
    persistProducts,
    syncWithServerCatalog,
  } = usePersistedProducts({ activeOnly: false });
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Interactive Dashboard filters
  const [hourlyMode, setHourlyMode] = useState<'Combined' | 'Today' | 'Yesterday'>('Combined');
  const [globalSearch, setGlobalSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Product editor page state
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [catalogMenuOpen, setCatalogMenuOpen] = useState(true);
  const [stockToolsMenuOpen, setStockToolsMenuOpen] = useState(true);

  // Order scan
  const [scanQuery, setScanQuery] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);

  // POS state
  const [posItems, setPosItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [posCustomer, setPosCustomer] = useState('');
  const [posPhone, setPosPhone] = useState('');
  const [posMethod, setPosMethod] = useState<'cod' | 'bkash' | 'nagad' | 'card'>('cod');
  const [posMsg, setPosMsg] = useState('');

  // Coupon creation
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPct, setNewCouponPct] = useState('10');

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/status', {
          credentials: 'same-origin',
          headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
        });
        const data = await res.json();
        setNeedsSetup(Boolean(data.needsSetup));
        if (data.authenticated && typeof data.token === 'string') {
          setAdminToken(data.token);
        } else if (!data.authenticated && adminToken) {
          setAdminToken(null);
        }
      } catch {
        // ignore transient network check error
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  async function fetchOverview(token: string, options?: { markLocalChanges?: boolean }) {
    setDataLoading(true);
    try {
      const res = await fetch('/api/admin/overview', {
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setAdminToken(null);
        return;
      }
      const data = await res.json();
      setAnalytics(data.analytics);
      setOrders(data.orders || []);
      const serverProducts: Product[] = data.products || [];
      if (!data.catalogModified && hasLocalCatalogChanges()) {
        const storedProducts = loadStoredProducts();
        if (storedProducts) {
          const syncRes = await fetch('/api/admin/products/sync', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ products: storedProducts }),
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json().catch(() => ({}));
            persistProducts(syncData.products || storedProducts, true);
          } else {
            syncWithServerCatalog(serverProducts, false);
          }
        } else {
          syncWithServerCatalog(serverProducts, false);
        }
      } else if (options?.markLocalChanges) {
        persistProducts(serverProducts, true);
      } else {
        syncWithServerCatalog(serverProducts, Boolean(data.catalogModified));
      }
      setCategories(data.categories || []);
      setSettings(data.settings || null);
      setSubscribers(data.subscribers || []);
      setCoupons(data.coupons || []);
      setExpenses(data.expenses || []);
      setReviews(data.reviews || []);
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (adminToken) {
      fetchOverview(adminToken);
    }
  }, [adminToken]);

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    if (passwordInput.length < 6) {
      setAuthError('Please choose a password of at least 6 characters.');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth/setup', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Setup failed');
        return;
      }
      setNeedsSetup(false);
      setAdminToken(data.token);
      setPasswordInput('');
      setConfirmPasswordInput('');
    } catch {
      setAuthError('Network error during setup');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Invalid password');
        return;
      }
      setAdminToken(data.token);
      setPasswordInput('');
    } catch {
      setAuthError('Network error during sign in');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleGoogleAdminSignIn() {
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const { idToken } = await signInWithGoogle();
      const res = await fetch('/api/admin/auth/firebase', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.error || 'Google sign-in failed.');
        return;
      }
      setNeedsSetup(false);
      setAdminToken(data.token);
      setPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: unknown) {
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code) : '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Google sign-in popup was closed before finishing.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          `Add "${window.location.hostname}" to Firebase Authentication Authorized Domains, or sign in with your admin password below.`
        );
      } else {
        setAuthError('Could not complete Google sign-in. Please try again.');
      }
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleAdminLogout() {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
    } catch {
      // ignore network errors on logout
    }
    try {
      await signOutUser();
    } catch {
      // ignore firebase sign-out errors
    }
    setAdminToken(null);
  }

  function openAddProduct() {
    setEditingProduct(null);
    setActiveSection('Products');
    setProductEditorOpen(true);
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    setActiveSection('Products');
    setProductEditorOpen(true);
  }

  async function handleSaveProduct(payload: ProductEditorPayload) {
    if (!adminToken) {
      throw new Error('Admin session expired. Please sign in again.');
    }
    setProductSaving(true);
    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setAdminToken(null);
        throw new Error('Your admin session expired. Please sign in again.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product. Please try again.');
      }
      if (data.product) {
        const saved: Product = data.product;
        const nextProducts = editingProduct
          ? products.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...products];
        persistProducts(nextProducts, true);
      }
      setProductEditorOpen(false);
      setEditingProduct(null);
      await fetchOverview(adminToken, { markLocalChanges: true });
    } finally {
      setProductSaving(false);
    }
  }

  async function handleCreateImportedProduct(payload: ProductEditorPayload) {
    if (!adminToken) return;
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.product) {
        persistProducts([data.product, ...products], true);
      }
      await fetchOverview(adminToken, { markLocalChanges: true });
    }
  }

  async function handleToggleProductActive(p: Product) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ active: p.active === false }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.product) {
        persistProducts(
          products.map((item) => (item.id === p.id ? data.product : item)),
          true
        );
      }
      fetchOverview(adminToken, { markLocalChanges: true });
    }
  }

  async function handleDuplicateProduct(p: Product) {
    if (!adminToken) return;
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        ...p,
        title: `${p.title} (Copy)`,
        sku: `${p.sku}-${Math.floor(10 + Math.random() * 90)}`,
        slug: `${p.slug}-copy-${Math.floor(10 + Math.random() * 90)}`,
      }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.product) {
        persistProducts([data.product, ...products], true);
      }
      fetchOverview(adminToken, { markLocalChanges: true });
    }
  }

  async function handleCreateCategoryByName(input: string | CategoryFormPayload) {
    if (!adminToken) {
      throw new Error('Admin session expired. Please sign in again.');
    }
    const payload: CategoryFormPayload =
      typeof input === 'string' ? { name: input.trim() } : { ...input, name: input.name.trim() };
    if (!payload.name) {
      throw new Error('Category name is required.');
    }
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create category.');
    }
    await fetchOverview(adminToken);
  }

  async function handleUpdateCategory(id: string, patch: Partial<CategoryFormPayload>) {
    if (!adminToken) {
      throw new Error('Admin session expired. Please sign in again.');
    }
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update category.');
    }
    await fetchOverview(adminToken);
  }

  async function handleDeleteProduct(id: string) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    if (res.ok) {
      persistProducts(
        products.filter((p) => p.id !== id),
        true
      );
      fetchOverview(adminToken, { markLocalChanges: true });
    }
  }

  async function handleUpdateOrderStatus(orderId: string, fulfillmentStatus: FulfillmentStatus) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ fulfillmentStatus }),
    });
    if (res.ok) fetchOverview(adminToken);
  }

  async function handleQuickStockChange(p: Product, delta: number) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ stock: Math.max(0, p.stock + delta) }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.product) {
        persistProducts(
          products.map((item) => (item.id === p.id ? data.product : item)),
          true
        );
      }
      fetchOverview(adminToken, { markLocalChanges: true });
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!adminToken) {
      throw new Error('Admin session expired. Please sign in again.');
    }
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete category.');
    }
    await fetchOverview(adminToken);
  }

  async function handlePosSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adminToken || posItems.length === 0) return;
    setPosMsg('');
    const res = await fetch('/api/admin/pos-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerName: posCustomer || 'Walk-in Customer',
        customerPhone: posPhone || '01700000000',
        items: posItems,
        paymentMethod: posMethod,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setPosItems([]);
      setPosCustomer('');
      setPosPhone('');
      setPosMsg(`POS Order #${data.order.orderNumber} recorded (৳${data.order.total})`);
      fetchOverview(adminToken);
    }
  }

  async function handleAddCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!adminToken || !newCouponCode.trim()) return;
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ code: newCouponCode.trim(), discountPercent: Number(newCouponPct) }),
    });
    if (res.ok) {
      setNewCouponCode('');
      fetchOverview(adminToken);
    }
  }

  async function handleAddExpense(payload: {
    title: string;
    category: string;
    amount: number;
    date: string;
    note?: string;
  }) {
    if (!adminToken) return;
    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) await fetchOverview(adminToken);
  }

  async function handleDeleteExpense(id: string) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/expenses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) await fetchOverview(adminToken);
  }

  async function handleToggleReviewVerified(review: ProductReview) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/reviews/${review.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ verifiedPurchase: !review.verifiedPurchase }),
    });
    if (res.ok) await fetchOverview(adminToken);
  }

  async function handleDeleteReview(id: string) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) await fetchOverview(adminToken);
  }

  // Auth Gate Screen
  if (authLoading) {
    return (
      <div className={`${darkMode ? 'dark admin-dark' : ''} min-h-screen bg-[#f8f9fb] dark:bg-slate-950 flex items-center justify-center`}>
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!adminToken) {
    return (
      <div className={`${darkMode ? 'dark admin-dark' : ''} min-h-screen bg-[#f8f9fb] dark:bg-slate-950 flex flex-col items-center justify-center p-4`}>
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-brand text-2xl font-black text-slate-900 dark:text-slate-100">Classy Cases</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {needsSetup
                  ? 'First-time setup: claim your Store Owner admin password'
                  : 'Sign in to access your Store Dashboard & Payment Settings'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleAdminSignIn}
              disabled={authSubmitting}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors disabled:opacity-60 flex items-center justify-center gap-2.5 shadow-xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="shrink mx-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                or use password
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>
          </div>

          {needsSetup ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Create Admin Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter a strong password"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
              {authError && <p className="text-xs text-red-600 dark:text-red-400">{authError}</p>}
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {authSubmitting ? 'Saving...' : 'Claim Admin Access'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Admin Password</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your admin password"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
              {authError && <p className="text-xs text-red-600 dark:text-red-400">{authError}</p>}
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {authSubmitting ? 'Signing in...' : 'Sign in to Dashboard'}
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={onBackToStore}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              ← Back to Classy Cases Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Settings View
  if (activeSection === 'Settings' && settings) {
    return (
      <div className={darkMode ? 'dark admin-dark' : ''}>
        <AdminSettings
          settings={settings}
          adminToken={adminToken}
          initialTab={settingsInitialTab}
          categories={categories}
          products={products}
          onSettingsUpdated={(updated) => setSettings(updated)}
          onCloseToDashboard={() => setActiveSection('Dashboard')}
          onOpenStorefront={onBackToStore}
        />
      </div>
    );
  }

  const operationsNav: { label: AdminSection; icon: React.ReactNode; badge?: number }[] = [
    { label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
    { label: 'Inventory Dashboard', icon: <Clock className="w-4 h-4" /> },
    {
      label: 'Web Orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: orders.filter((o) => o.source === 'Web' && o.fulfillmentStatus === 'pending').length || undefined,
    },
    { label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { label: 'Point of Sale', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Order Scan', icon: <ScanLine className="w-4 h-4" /> },
    { label: 'Purchases', icon: <Package className="w-4 h-4" /> },
    { label: 'Customers', icon: <Users className="w-4 h-4" /> },
    {
      label: 'Reviews',
      icon: <Star className="w-4 h-4" />,
      badge: reviews.length || undefined,
    },
    { label: 'Marketing', icon: <Megaphone className="w-4 h-4" /> },
  ];

  const catalogSubNav: { section: AdminSection; label: string; icon: React.ReactNode }[] = [
    { section: 'Catalog Categories', label: 'Categories', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { section: 'Brands', label: 'Brands', icon: <Tag className="w-3.5 h-3.5" /> },
    { section: 'Warranties', label: 'Warranties', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  const stockToolsSubNav: { section: AdminSection; label: string; icon: React.ReactNode }[] = [
    { section: 'Stock Levels', label: 'Stock Levels', icon: <Layers className="w-3.5 h-3.5" /> },
    { section: 'Stock Tracker', label: 'Stock Tracker', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { section: 'Stock Adjustment', label: 'Stock Adjustment', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { section: 'Barcodes', label: 'Barcodes', icon: <Barcode className="w-3.5 h-3.5" /> },
  ];

  const accountingNav: {
    label: AdminSection;
    icon: React.ReactNode;
    hasSubmenu?: boolean;
  }[] = [
    { label: 'Transactions', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Payroll', icon: <Users className="w-4 h-4" />, hasSubmenu: true },
    { label: 'Accounts', icon: <Wallet className="w-4 h-4" /> },
    { label: 'Categories', icon: <LayoutGrid className="w-4 h-4" /> },
    { label: 'Courier payments', icon: <Truck className="w-4 h-4" /> },
    { label: 'Activity log', icon: <History className="w-4 h-4" /> },
  ];

  const reportsNav: {
    label: AdminSection;
    icon: React.ReactNode;
    hasSubmenu?: boolean;
  }[] = [
    { label: 'Profit & Sales', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'More Reports', icon: <BarChart2 className="w-4 h-4" />, hasSubmenu: true },
  ];

  const inventoryCatalogSections: AdminSection[] = [
    'Import Product',
    'Catalog Categories',
    'Brands',
    'Warranties',
    'Stock Levels',
    'Stock Tracker',
    'Stock Adjustment',
    'Barcodes',
  ];

  const accountingReportSections: AccountingReportSection[] = [
    'Transactions',
    'Expenses',
    'Payroll',
    'Accounts',
    'Categories',
    'Courier payments',
    'Activity log',
    'Profit & Sales',
    'More Reports',
  ];

  // Filtered orders for search & filter
  const filteredOrders = orders.filter((o) => {
    const q = globalSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.transactionId.toLowerCase().includes(q);
    const matchesStatus = orderStatusFilter === 'all' || o.fulfillmentStatus === orderStatusFilter;
    const matchesWeb = activeSection === 'Web Orders' ? o.source === 'Web' : true;
    return matchesSearch && matchesStatus && matchesWeb;
  });

  // Derive customer directory from orders
  const customerMap = new Map<
    string,
    { name: string; phone: string; email: string; address: string; orderCount: number; totalSpent: number }
  >();
  for (const o of orders) {
    const key = o.customerPhone;
    const existing = customerMap.get(key) || {
      name: o.customerName,
      phone: o.customerPhone,
      email: o.customerEmail,
      address: o.deliveryAddress,
      orderCount: 0,
      totalSpent: 0,
    };
    existing.orderCount += 1;
    existing.totalSpent += o.total;
    customerMap.set(key, existing);
  }
  const customerList = Array.from(customerMap.values());

  const lowStockAlertProducts = products.filter(
    (p) => p.trackStock !== false && p.stock < 5
  );
  const lowStockOnlyCount = lowStockAlertProducts.filter((p) => p.stock > 0).length;

  // Hourly SVG path calculation
  const hourlySeries = analytics?.hourlySeries || [];
  const maxHourly = Math.max(4, ...hourlySeries.map((h) => Math.max(h.today, h.yesterday)));
  const buildPolyline = (values: number[], width: number, height: number) => {
    if (values.length === 0) return '';
    return values
      .map((val, idx) => {
        const x = (idx / Math.max(1, values.length - 1)) * width;
        const y = height - (val / maxHourly) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className={`${darkMode ? 'dark admin-dark' : ''} min-h-screen flex bg-[#f8f9fb] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden`}>
      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-[#fcfcfd] dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {settings?.storeName || 'Classy Cases'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-5">
                <div>
                  <div className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">Operations</div>
                  <nav className="space-y-0.5">
                    {operationsNav.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setActiveSection(item.label);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                          activeSection === item.label
                            ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge !== undefined && (
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>
                <div>
                  <div className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">Inventory</div>
                  <nav className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('Products');
                        setProductEditorOpen(false);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        activeSection === 'Products'
                          ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Box className="w-4 h-4 shrink-0" />
                        <span className="truncate">Products</span>
                      </span>
                      {lowStockAlertProducts.length > 0 && (
                        <span
                          title={`${lowStockAlertProducts.length} product(s) below 5 units`}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-bold tabular-nums shrink-0"
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          {lowStockAlertProducts.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('Import Product');
                        setProductEditorOpen(false);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        activeSection === 'Import Product'
                          ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span className="truncate">Import Product</span>
                    </button>

                    <div>
                      <button
                        type="button"
                        onClick={() => setCatalogMenuOpen((v) => !v)}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <FolderOpen className="w-4 h-4" />
                          <span>Catalog</span>
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${
                            catalogMenuOpen ? '' : '-rotate-90'
                          }`}
                        />
                      </button>
                      {catalogMenuOpen && (
                        <div className="ml-3.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 mt-0.5 space-y-0.5">
                          {catalogSubNav.map((sub) => (
                            <button
                              key={sub.section}
                              type="button"
                              onClick={() => {
                                setActiveSection(sub.section);
                                setProductEditorOpen(false);
                                setMobileSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                activeSection === sub.section
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                              }`}
                            >
                              {sub.icon}
                              <span className="truncate">{sub.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setStockToolsMenuOpen((v) => !v)}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Wrench className="w-4 h-4" />
                          <span>Stock Tools</span>
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${
                            stockToolsMenuOpen ? '' : '-rotate-90'
                          }`}
                        />
                      </button>
                      {stockToolsMenuOpen && (
                        <div className="ml-3.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 mt-0.5 space-y-0.5">
                          {stockToolsSubNav.map((sub) => (
                            <button
                              key={sub.section}
                              type="button"
                              onClick={() => {
                                setActiveSection(sub.section);
                                setProductEditorOpen(false);
                                setMobileSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                activeSection === sub.section
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                              }`}
                            >
                              {sub.icon}
                              <span className="truncate">{sub.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </nav>
                </div>
                <div>
                  <div className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">Accounting</div>
                  <nav className="space-y-0.5">
                    {accountingNav.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setActiveSection(item.label);
                          setProductEditorOpen(false);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                          activeSection === item.label
                            ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.hasSubmenu && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                      </button>
                    ))}
                  </nav>
                </div>
                <div>
                  <div className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">Reports</div>
                  <nav className="space-y-0.5">
                    {reportsNav.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setActiveSection(item.label);
                          setProductEditorOpen(false);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                          activeSection === item.label
                            ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.hasSubmenu && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setSettingsInitialTab('Hero Video');
                  setActiveSection('Settings');
                  setMobileSidebarOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <Film className="w-4 h-4" />
                <span>Hero Video</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSettingsInitialTab('General');
                  setActiveSection('Settings');
                  setMobileSidebarOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={onBackToStore}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20"
              >
                <Store className="w-4 h-4" />
                <span>View Live Storefront</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Left Sidebar matching Screenshot 2 */}
      <aside className="w-60 bg-[#fcfcfd] dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex flex-col justify-between shrink-0">
        <div>
          {/* Store Switcher */}
          <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {settings?.storeName || 'Classy Cases'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            </div>
            <button
              type="button"
              onClick={onBackToStore}
              title="Back to Storefront"
              className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Store className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-5">
            {/* Operations */}
            <div>
              <div className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">Operations</div>
              <nav className="space-y-0.5">
                {operationsNav.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.label);
                      setProductEditorOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      activeSection === item.label
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Inventory */}
            <div>
              <div className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">Inventory</div>
              <nav className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('Products');
                    setProductEditorOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    activeSection === 'Products'
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Box className="w-4 h-4 shrink-0" />
                    <span className="truncate">Products</span>
                  </span>
                  {lowStockAlertProducts.length > 0 && (
                    <span
                      title={`${lowStockAlertProducts.length} product(s) below 5 units`}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-bold tabular-nums shrink-0"
                    >
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                      {lowStockAlertProducts.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('Import Product');
                    setProductEditorOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    activeSection === 'Import Product'
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <CloudUpload className="w-4 h-4" />
                  <span className="truncate">Import Product</span>
                </button>

                <div>
                  <button
                    type="button"
                    onClick={() => setCatalogMenuOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <FolderOpen className="w-4 h-4" />
                      <span>Catalog</span>
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${
                        catalogMenuOpen ? '' : '-rotate-90'
                      }`}
                    />
                  </button>
                  {catalogMenuOpen && (
                    <div className="ml-3.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 mt-0.5 space-y-0.5">
                      {catalogSubNav.map((sub) => (
                        <button
                          key={sub.section}
                          type="button"
                          onClick={() => {
                            setActiveSection(sub.section);
                            setProductEditorOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            activeSection === sub.section
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          {sub.icon}
                          <span className="truncate">{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setStockToolsMenuOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Wrench className="w-4 h-4" />
                      <span>Stock Tools</span>
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${
                        stockToolsMenuOpen ? '' : '-rotate-90'
                      }`}
                    />
                  </button>
                  {stockToolsMenuOpen && (
                    <div className="ml-3.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 mt-0.5 space-y-0.5">
                      {stockToolsSubNav.map((sub) => (
                        <button
                          key={sub.section}
                          type="button"
                          onClick={() => {
                            setActiveSection(sub.section);
                            setProductEditorOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            activeSection === sub.section
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          {sub.icon}
                          <span className="truncate">{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* Accounting */}
            <div>
              <div className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">Accounting</div>
              <nav className="space-y-0.5">
                {accountingNav.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.label);
                      setProductEditorOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      activeSection === item.label
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.hasSubmenu && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                  </button>
                ))}
              </nav>
            </div>

            {/* Reports */}
            <div>
              <div className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">Reports</div>
              <nav className="space-y-0.5">
                {reportsNav.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.label);
                      setProductEditorOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      activeSection === item.label
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.hasSubmenu && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            type="button"
            onClick={() => {
              setSettingsInitialTab('Hero Video');
              setActiveSection('Settings');
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Film className="w-4 h-4" />
            <span>Hero Video</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSettingsInitialTab('General');
              setActiveSection('Settings');
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={onBackToStore}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20"
          >
            <Store className="w-4 h-4" />
            <span>View Live Storefront</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar matching Screenshot 2 */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">Home</span>
            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">›</span>
            {activeSection === 'Products' && productEditorOpen ? (
              <button
                type="button"
                onClick={() => {
                  setProductEditorOpen(false);
                  setEditingProduct(null);
                }}
                className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 truncate"
              >
                Products
              </button>
            ) : (
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {activeSection === 'Catalog Categories' ? 'Categories' : activeSection}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="hidden md:flex items-center bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search orders, customers..."
                className="bg-transparent text-xs w-full focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">⌘K</span>
            </div>

            <button
              type="button"
              onClick={onBackToStore}
              title="View Storefront"
              className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-500/25"
            >
              <Store className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/70"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('Settings')}
              title="Store Settings"
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/70"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={openAddProduct}
              title="Add New Product"
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/70"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('Orders')}
              title="Pending Orders"
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/70 relative"
            >
              <Bell className="w-4 h-4" />
              {(analytics?.needsAttentionOrders.length || 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {analytics?.needsAttentionOrders.length}
                </span>
              )}
            </button>

            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center">
              ME
            </div>

            <button
              type="button"
              onClick={handleAdminLogout}
              title="Sign out of Admin"
              aria-label="Sign out of Admin"
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/40 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Quick Nav */}
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['Dashboard', 'Orders', 'Products', 'Point of Sale', 'Settings'] as AdminSection[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveSection(tab);
                setProductEditorOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                activeSection === tab ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* DASHBOARD VIEW (Screenshot 2) */}
            {activeSection === 'Dashboard' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All orders · Today</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSection('Orders')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 inline-flex items-center gap-1.5"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filters</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => adminToken && fetchOverview(adminToken)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      title="Refresh dashboard"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* 4 KPI Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>Orders</span>
                        <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                        {analytics?.totalOrders ?? 0}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Box className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>Booked sales</span>
                        <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                        ৳{analytics?.bookedSales ?? 0}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>Delivered sales</span>
                        <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                        ৳{analytics?.deliveredSales ?? 0}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>Estimate from orders</span>
                        <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                        ৳{analytics?.estimateFromOrders ?? 0}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Middle Row: Needs attention + Order Volume */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Needs attention</h2>
                      {lowStockAlertProducts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveSection('Products')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold hover:bg-amber-100 transition-colors"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>
                            {lowStockOnlyCount > 0 ? `${lowStockOnlyCount} Low Stock` : `${lowStockAlertProducts.length} Stock Alert`}
                          </span>
                        </button>
                      )}
                    </div>
                    {(analytics?.needsAttentionOrders.length || 0) === 0 && lowStockAlertProducts.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-14 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">All caught up</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Nothing is waiting for you right now.</p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto">
                        {lowStockAlertProducts.map((prod) => (
                          <div
                            key={`low-${prod.id}`}
                            className="p-3 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex items-center gap-2.5">
                              <img
                                src={prod.image}
                                alt={prod.title}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-md object-cover border border-amber-200 dark:border-amber-500/30 shrink-0 bg-white dark:bg-slate-900"
                              />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openEditProduct(prod)}
                                  className="text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 truncate block text-left w-full"
                                >
                                  {prod.title}
                                </button>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {prod.stock <= 0 ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                                      Out of Stock
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                      Low Stock
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                                    {prod.stock} left
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleQuickStockChange(prod, 5)}
                              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 text-[11px] font-semibold hover:bg-amber-100 shrink-0"
                            >
                              +5 Restock
                            </button>
                          </div>
                        ))}
                        {analytics?.needsAttentionOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                #{ord.orderNumber} · {ord.customerName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                ৳{ord.total} · {ord.paymentMethod.toUpperCase()} ({ord.paymentStatus})
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(ord.id, 'shipped')}
                              className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 shrink-0"
                            >
                              Mark Shipped
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Order Volume</h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Placed vs now shipped or delivered · all statuses · Today
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center px-3 py-1">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Placed</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            {analytics?.placedCount ?? 0}
                          </div>
                        </div>
                        <div className="text-center px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Shipped / delivered</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            {analytics?.shippedOrDeliveredCount ?? 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex gap-4">
                        <div className="flex flex-col justify-between text-[10px] text-slate-400 dark:text-slate-500 tabular-nums h-44 py-1">
                          <span>{Math.max(4, analytics?.placedCount ?? 0)}</span>
                          <span>{Math.max(3, Math.ceil((analytics?.placedCount ?? 0) * 0.75))}</span>
                          <span>{Math.max(2, Math.ceil((analytics?.placedCount ?? 0) * 0.5))}</span>
                          <span>{Math.max(1, Math.ceil((analytics?.placedCount ?? 0) * 0.25))}</span>
                          <span>0</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-end">
                          <div className="h-44 border-b border-slate-200 dark:border-slate-800 flex items-end justify-center gap-10 pb-0">
                            <div className="flex flex-col items-center gap-1">
                              <div
                                style={{
                                  height: `${Math.min(
                                    160,
                                    Math.max(4, ((analytics?.placedCount ?? 0) / Math.max(4, analytics?.placedCount ?? 1)) * 150)
                                  )}px`,
                                }}
                                className="w-10 rounded-t-md bg-indigo-500 transition-all"
                              />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div
                                style={{
                                  height: `${Math.min(
                                    160,
                                    Math.max(
                                      4,
                                      ((analytics?.shippedOrDeliveredCount ?? 0) /
                                        Math.max(4, analytics?.placedCount ?? 1)) *
                                        150
                                    )
                                  )}px`,
                                }}
                                className="w-10 rounded-t-md bg-orange-500 transition-all"
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2">
                            {analytics?.orderVolumeSeries[0]?.label || 'Today'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-5 mt-3 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          Placed
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          Now shipped / delivered
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 3: Hourly Web Orders + Web Order Report */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>Hourly Web Orders</span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date().toISOString().slice(0, 10)} vs yesterday
                        </p>
                      </div>
                      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-0.5 text-xs">
                        {(['Combined', 'Today', 'Yesterday'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setHourlyMode(mode)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                              hourlyMode === mode ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex gap-3">
                        <div className="flex flex-col justify-between text-[10px] text-slate-400 dark:text-slate-500 tabular-nums h-40">
                          <span>{maxHourly}</span>
                          <span>{Math.round(maxHourly * 0.75)}</span>
                          <span>{Math.round(maxHourly * 0.5)}</span>
                          <span>{Math.round(maxHourly * 0.25)}</span>
                          <span>0</span>
                        </div>
                        <div className="flex-1">
                          <svg viewBox="0 0 600 160" className="w-full h-40 overflow-visible">
                            <line x1="0" y1="160" x2="600" y2="160" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
                            {(hourlyMode === 'Combined' || hourlyMode === 'Yesterday') && (
                              <polyline
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                points={buildPolyline(
                                  hourlySeries.map((h) => h.yesterday),
                                  600,
                                  160
                                )}
                              />
                            )}
                            {(hourlyMode === 'Combined' || hourlyMode === 'Today') && (
                              <polyline
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="2.5"
                                points={buildPolyline(
                                  hourlySeries.map((h) => h.today),
                                  600,
                                  160
                                )}
                              />
                            )}
                          </svg>
                          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                            {hourlySeries.map((h) => (
                              <span key={h.label}>{h.label}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-5 mt-3 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-0.5 bg-indigo-500" />
                          Today
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400" />
                          Yesterday
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Web Order Report</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All statuses · Today</p>
                    {orders.filter((o) => o.source === 'Web').length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-2">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No data available</p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2.5">
                        {(['bkash', 'nagad', 'card', 'cod'] as const).map((method) => {
                          const subset = orders.filter((o) => o.source === 'Web' && o.paymentMethod === method);
                          if (subset.length === 0) return null;
                          const sum = subset.reduce((a, b) => a + b.total, 0);
                          return (
                            <div
                              key={method}
                              className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                            >
                              <span className="uppercase font-semibold text-slate-700 dark:text-slate-300">{method}</span>
                              <span className="tabular-nums text-slate-900 dark:text-slate-100 font-medium">
                                {subset.length} orders · ৳{sum}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: Top Products + Orders by Source */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top Products</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All · Today</p>
                    {(analytics?.topProducts.length || 0) === 0 ? (
                      <div className="py-12 text-center">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-2">
                          <Box className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No data available</p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {analytics?.topProducts.map((tp) => (
                          <div key={tp.productId} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={tp.image}
                                alt={tp.title}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                              />
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{tp.title}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">৳{tp.revenue}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{tp.unitsSold} sold</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>Orders by Source</span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All · Today</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('Orders')}
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600"
                      >
                        View Report
                      </button>
                    </div>
                    {(analytics?.ordersBySource.length || 0) === 0 ? (
                      <div className="py-12 text-center">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-2">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No data available</p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2.5">
                        {analytics?.ordersBySource.map((src) => (
                          <div key={src.source} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{src.source}</span>
                            <span className="tabular-nums text-slate-600 dark:text-slate-400">
                              {src.count} orders · <strong className="text-slate-900 dark:text-slate-100">৳{src.total}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 5: Sales by marketing channel + Store Plan & Gateways */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Sales by marketing channel</span>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All · Today</p>
                    {(analytics?.salesByChannel.length || 0) === 0 ? (
                      <div className="py-12 text-center">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-2">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No data available</p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2.5">
                        {analytics?.salesByChannel.map((ch) => (
                          <div key={ch.channel} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{ch.channel}</span>
                            <span className="tabular-nums text-slate-600 dark:text-slate-400">
                              {ch.count} orders · <strong className="text-slate-900 dark:text-slate-100">৳{ch.total}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Storefront &amp; Gateways</div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">Active Storefront</h2>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mt-1">
                        Online payments enabled: bKash, Nagad, SSLCommerz &amp; COD
                      </p>

                      <div className="mt-5 space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 dark:text-slate-400">Products listed</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                              {products.length} / 30
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, (products.length / 30) * 100)}%` }}
                              className="h-full bg-indigo-600 rounded-full"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 dark:text-slate-400">Newsletter subscribers</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                              {subscribers.length}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, Math.max(8, subscribers.length * 10))}%` }}
                              className="h-full bg-amber-500 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSection('Settings')}
                      className="mt-5 w-full py-2 rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      Configure Payment Gateways →
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* PRODUCTS VIEW & ADD/EDIT PRODUCT EDITOR */}
            {activeSection === 'Products' &&
              (productEditorOpen ? (
                <AdminProductEditor
                  editingProduct={editingProduct}
                  categories={categories}
                  presetImages={PRESET_PRODUCT_IMAGES}
                  saving={productSaving}
                  onCancel={() => {
                    setProductEditorOpen(false);
                    setEditingProduct(null);
                  }}
                  onSave={handleSaveProduct}
                  onCreateCategory={handleCreateCategoryByName}
                  onViewStorefront={onBackToStore}
                />
              ) : (
                <AdminProductsView
                  products={products}
                  categories={categories}
                  orders={orders}
                  onAddProduct={openAddProduct}
                  onEditProduct={openEditProduct}
                  onToggleActive={handleToggleProductActive}
                  onQuickRestock={handleQuickStockChange}
                  onDuplicateProduct={handleDuplicateProduct}
                  onDeleteProduct={handleDeleteProduct}
                />
              ))}

            {/* CATALOG & STOCK TOOLS SUB-VIEWS */}
            {inventoryCatalogSections.includes(activeSection) && (
              <AdminInventoryCatalogViews
                section={
                  (activeSection === 'Catalog Categories'
                    ? 'Categories'
                    : activeSection) as InventoryCatalogSection
                }
                products={products}
                categories={categories}
                shippingClasses={settings?.deliverySettings?.shippingClasses?.map((c) => c.name)}
                onQuickStockChange={handleQuickStockChange}
                onCreateCategory={handleCreateCategoryByName}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onCreateProduct={handleCreateImportedProduct}
                onEditProduct={openEditProduct}
              />
            )}

            {/* ORDERS / WEB ORDERS VIEW */}
            {(activeSection === 'Orders' || activeSection === 'Web Orders') && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeSection}</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Manage online payments, transaction IDs, and shipment status
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-xs overflow-x-auto no-scrollbar max-w-full">
                    {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-md capitalize font-medium whitespace-nowrap shrink-0 ${
                          orderStatusFilter === st ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {filteredOrders.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                      <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No orders yet</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Orders placed on the Storefront or Point of Sale appear here immediately.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Order</th>
                            <th className="py-3 px-4 font-semibold">Customer</th>
                            <th className="py-3 px-4 font-semibold">Items</th>
                            <th className="py-3 px-4 font-semibold">Payment</th>
                            <th className="py-3 px-4 font-semibold text-right">Total</th>
                            <th className="py-3 px-4 font-semibold">Fulfillment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-4">
                                <div className="font-mono font-bold text-slate-900 dark:text-slate-100">#{ord.orderNumber}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {new Date(ord.createdAt).toLocaleString()}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{ord.customerName}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">{ord.customerPhone}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-slate-800 dark:text-slate-200">
                                  {ord.items.map((i) => `${i.title.slice(0, 24)} ×${i.quantity}`).join(', ')}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold uppercase text-slate-800 dark:text-slate-200">{ord.paymentMethod}</div>
                                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{ord.transactionId}</div>
                                <span
                                  className={`text-[11px] font-semibold ${
                                    ord.paymentStatus === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {ord.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                ৳{ord.total}
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={ord.fulfillmentStatus}
                                  onChange={(e) =>
                                    handleUpdateOrderStatus(ord.id, e.target.value as FulfillmentStatus)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium capitalize"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* INVENTORY / PURCHASES */}
            {(activeSection === 'Inventory Dashboard' || activeSection === 'Purchases') && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeSection}</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Live inventory count and one-click stock adjustments</p>
                  </div>
                  {lowStockAlertProducts.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        {lowStockAlertProducts.length} product{lowStockAlertProducts.length === 1 ? '' : 's'} below 5 units
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="py-3 px-4 font-semibold">SKU</th>
                          <th className="py-3 px-4 font-semibold">Product</th>
                          <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                          <th className="py-3 px-4 font-semibold text-right">Adjust</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {products.map((p) => {
                          const isTracked = p.trackStock !== false;
                          const isOutOfStock = isTracked && p.stock <= 0;
                          const isLowStock = isTracked && p.stock > 0 && p.stock < 5;
                          return (
                            <tr key={p.id}>
                              <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{p.sku}</td>
                              <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{p.title}</span>
                                  {isOutOfStock ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                                      Out of Stock
                                    </span>
                                  ) : isLowStock ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      Low Stock
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td
                                className={`py-3 px-4 text-right tabular-nums font-bold ${
                                  isOutOfStock
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : isLowStock
                                      ? 'text-amber-700 dark:text-amber-300'
                                      : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {p.stock}
                              </td>
                              <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleQuickStockChange(p, -1)}
                                  className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                                >
                                  -1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickStockChange(p, 5)}
                                  className="px-2.5 py-1 rounded border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 font-semibold"
                                >
                                  +5 Restock
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* POINT OF SALE */}
            {activeSection === 'Point of Sale' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 space-y-3">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Point of Sale Counter</h1>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.map((p) => {
                      const isTracked = p.trackStock !== false;
                      const isOutOfStock = isTracked && p.stock <= 0;
                      const isLowStock = isTracked && p.stock > 0 && p.stock < 5;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPosItems((prev) => {
                              const ex = prev.find((i) => i.productId === p.id);
                              if (ex) {
                                return prev.map((i) =>
                                  i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i
                                );
                              }
                              return [...prev, { productId: p.id, quantity: 1 }];
                            });
                          }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 text-left hover:border-indigo-400 transition-colors"
                        >
                          <img
                            src={p.image}
                            alt={p.title}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{p.title}</div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">৳{p.price}</span>
                              {isOutOfStock ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                                  Out of Stock
                                </span>
                              ) : isLowStock ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                  Low Stock ({p.stock})
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">{p.stock} in stock</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form
                  onSubmit={handlePosSubmit}
                  className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 h-fit"
                >
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">POS Receipt</h2>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {posItems.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Tap products on the left to add to POS ticket.</p>
                    ) : (
                      posItems.map((item) => {
                        const prod = products.find((p) => p.id === item.productId);
                        if (!prod) return null;
                        return (
                          <div key={item.productId} className="flex justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="truncate pr-2">
                              {prod.title.slice(0, 26)} × {item.quantity}
                            </span>
                            <span className="font-semibold tabular-nums">৳{prod.price * item.quantity}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      value={posCustomer}
                      onChange={(e) => setPosCustomer(e.target.value)}
                      placeholder="Customer Name (optional)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                    <input
                      type="tel"
                      value={posPhone}
                      onChange={(e) => setPosPhone(e.target.value)}
                      placeholder="Phone Number (optional)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                    <select
                      value={posMethod}
                      onChange={(e) => setPosMethod(e.target.value as 'cod' | 'bkash' | 'nagad' | 'card')}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900"
                    >
                      <option value="cod">Cash Counter</option>
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  {posMsg && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{posMsg}</p>}

                  <button
                    type="submit"
                    disabled={posItems.length === 0}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Complete POS Sale
                  </button>
                </form>
              </div>
            )}

            {/* ORDER SCAN */}
            {activeSection === 'Order Scan' && (
              <div className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Order Scan &amp; Dispatch</h1>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    placeholder="Enter Order Number (e.g. 1001)"
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const found = orders.find(
                        (o) => o.orderNumber.toLowerCase() === scanQuery.trim().replace(/^#/, '').toLowerCase()
                      );
                      setScannedOrder(found || null);
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Lookup
                  </button>
                </div>
                {scannedOrder && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Order #{scannedOrder.orderNumber} — {scannedOrder.customerName}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Status: <strong className="uppercase">{scannedOrder.fulfillmentStatus}</strong> · Total: ৳
                      {scannedOrder.total}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(scannedOrder.id, 'shipped')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold"
                      >
                        Mark Shipped
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(scannedOrder.id, 'delivered')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                      >
                        Mark Delivered
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* CUSTOMERS */}
            {activeSection === 'Customers' && (
              <div className="space-y-4">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customers</h1>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {customerList.length === 0 ? (
                    <div className="py-14 text-center text-xs text-slate-500 dark:text-slate-400">
                      Customer profiles appear automatically once orders are placed.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[540px] text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Name</th>
                            <th className="py-3 px-4 font-semibold">Phone</th>
                            <th className="py-3 px-4 font-semibold">Address</th>
                            <th className="py-3 px-4 font-semibold text-right">Orders</th>
                            <th className="py-3 px-4 font-semibold text-right">Total Spent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {customerList.map((c) => (
                            <tr key={c.phone}>
                              <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{c.name}</td>
                              <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{c.phone}</td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400 truncate max-w-xs">{c.address}</td>
                              <td className="py-3 px-4 text-right tabular-nums">{c.orderCount}</td>
                              <td className="py-3 px-4 text-right tabular-nums font-bold">৳{c.totalSpent}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REVIEWS */}
            {activeSection === 'Reviews' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customer Reviews</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Customer feedback submitted on product pages ({reviews.length} total)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('Settings')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  >
                    Review Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Submitted Reviews</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                      {reviews.length}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Average Rating</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                      {reviews.length > 0
                        ? (
                            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                          ).toFixed(1)
                        : '—'}{' '}
                      <span className="text-sm font-medium text-amber-500">/ 5</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Verified Buyers</div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">
                      {reviews.filter((r) => r.verifiedPurchase).length}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {reviews.length === 0 ? (
                    <div className="py-14 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <p className="font-medium text-slate-700 dark:text-slate-300">No customer reviews submitted yet.</p>
                      <p>
                        When shoppers submit a review from any product page, it will appear right here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reviews.map((rev) => {
                        const product = products.find((p) => p.id === rev.productId);
                        return (
                          <div
                            key={rev.id}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {product?.image ? (
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 space-y-1 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {rev.authorName}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs font-semibold">
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                      <Star
                                        key={idx}
                                        className={`w-3.5 h-3.5 ${
                                          idx < rev.rating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-slate-200'
                                        }`}
                                      />
                                    ))}
                                  </span>
                                  {rev.verifiedPurchase && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                                      Verified Buyer
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                    {new Date(rev.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Product:{' '}
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {product?.title || rev.productId}
                                  </span>{' '}
                                  · Model: <span className="font-medium">{rev.deviceModel}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                                  &ldquo;{rev.comment}&rdquo;
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleReviewVerified(rev)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                                  rev.verifiedPurchase
                                    ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                                }`}
                              >
                                {rev.verifiedPurchase ? 'Verified' : 'Mark Verified'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(rev.id)}
                                title="Delete review"
                                className="p-2 rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MARKETING */}
            {activeSection === 'Marketing' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Promo Coupons</h2>
                  </div>
                  <form onSubmit={handleAddCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      placeholder="Code (e.g. EID20)"
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg uppercase"
                    />
                    <input
                      type="number"
                      value={newCouponPct}
                      onChange={(e) => setNewCouponPct(e.target.value)}
                      className="w-20 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                  </form>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {coupons.map((cp) => (
                      <div key={cp.id} className="py-2.5 flex justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{cp.code}</span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">{cp.discountPercent}% OFF</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Newsletter Subscribers ({subscribers.length})
                    </h2>
                  </div>
                  {subscribers.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No newsletter signups yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {subscribers.map((s) => (
                        <div key={s.id} className="py-2 flex justify-between text-xs">
                          <span className="text-slate-800 dark:text-slate-200">{s.email}</span>
                          <span className="text-slate-400 dark:text-slate-500">{new Date(s.subscribedAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACCOUNTING & REPORTS */}
            {accountingReportSections.includes(activeSection as AccountingReportSection) && (
              <AdminAccountingReportsView
                section={activeSection as AccountingReportSection}
                orders={orders}
                products={products}
                categories={categories}
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
