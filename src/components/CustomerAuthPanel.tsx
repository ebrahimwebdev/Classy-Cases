import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { formatFirebaseAuthError, useFirebaseAuth } from '../context/FirebaseAuthContext';
import { formatTaka } from '../models/phoneCase';
import { subscribeCustomerOrdersFromFirestore } from '../services/orderFirestore';
import { fetchAccountOrders } from '../services/userAccountService';
import type { FulfillmentStatus, Order, OrderItem } from '../types';

export interface CustomerAuthPanelProps {
  showAccountHeader?: boolean;
  onOpenFullOrders?: () => void;
  onOpenDashboard?: () => void;
  onBuyAgain?: (items: OrderItem[]) => void;
  onAuthenticated?: () => void;
  className?: string;
}

function getOrderStatusBadge(status: FulfillmentStatus): { label: string; className: string } {
  switch (status) {
    case 'delivered':
      return {
        label: 'Delivered',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'shipped':
      return {
        label: 'Shipped',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'confirmed':
      return {
        label: 'Confirmed',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-red-50 text-red-700 border-red-200',
      };
    default:
      return {
        label: 'Pending',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
  }
}

function formatOrderTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function CustomerAuthPanel({
  showAccountHeader = true,
  onOpenFullOrders,
  onOpenDashboard,
  onBuyAgain,
  onAuthenticated,
  className = '',
}: CustomerAuthPanelProps) {
  const {
    user,
    idToken,
    loading: authLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signOutUser,
  } = useFirebaseAuth();

  // Authentication form state
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  // Order history state (Firestore real-time + backend sync)
  const [firestoreOrders, setFirestoreOrders] = useState<Order[]>([]);
  const [backendOrders, setBackendOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadBackendOrders = useCallback(
    async (showSpinner = true) => {
      if (!user || !idToken) {
        setBackendOrders([]);
        setOrdersLoading(false);
        setRefreshingOrders(false);
        return;
      }
      if (showSpinner) setOrdersLoading(true);
      else setRefreshingOrders(true);
      setOrdersError('');
      try {
        const list = await fetchAccountOrders(idToken);
        setBackendOrders(list);
      } catch (err) {
        setOrdersError(err instanceof Error ? err.message : 'Unable to load order history.');
      } finally {
        setOrdersLoading(false);
        setRefreshingOrders(false);
      }
    },
    [idToken, user]
  );

  useEffect(() => {
    void loadBackendOrders(true);
  }, [loadBackendOrders]);

  useEffect(() => {
    if (!user?.uid) {
      setFirestoreOrders([]);
      return;
    }

    const unsubscribe = subscribeCustomerOrdersFromFirestore(
      user.uid,
      (liveOrders) => {
        setFirestoreOrders(liveOrders);
        setOrdersLoading(false);
      },
      () => {
        // Backend account orders remain available if Firebase session is not active on this host
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const orders = useMemo(() => {
    const merged = new Map<string, Order>();
    for (const ord of firestoreOrders) {
      if (ord?.id) merged.set(ord.id, ord);
    }
    for (const ord of backendOrders) {
      if (!ord?.id) continue;
      const existing = merged.get(ord.id);
      merged.set(
        ord.id,
        existing
          ? {
              ...existing,
              ...ord,
              courier: ord.courier
                ? { ...(existing.courier || {}), ...ord.courier }
                : existing.courier,
            }
          : ord
      );
    }
    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [backendOrders, firestoreOrders]);

  useEffect(() => {
    if (orders.length > 0 && !expandedOrderId) {
      setExpandedOrderId(orders[0].id);
    }
  }, [expandedOrderId, orders]);

  const stats = useMemo(() => {
    const active = orders.filter(
      (o) =>
        o.fulfillmentStatus === 'pending' ||
        o.fulfillmentStatus === 'confirmed' ||
        o.fulfillmentStatus === 'shipped'
    ).length;
    const delivered = orders.filter((o) => o.fulfillmentStatus === 'delivered').length;
    const cancelled = orders.filter((o) => o.fulfillmentStatus === 'cancelled').length;
    const spent = orders
      .filter((o) => o.fulfillmentStatus !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    return {
      total: orders.length,
      active,
      delivered,
      cancelled,
      spent,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((ord) => {
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'delivered'
            ? ord.fulfillmentStatus === 'delivered'
            : statusFilter === 'cancelled'
              ? ord.fulfillmentStatus === 'cancelled'
              : ord.fulfillmentStatus === 'pending' ||
                ord.fulfillmentStatus === 'confirmed' ||
                ord.fulfillmentStatus === 'shipped';

      if (!matchesStatus) return false;
      if (!q) return true;

      return (
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.transactionId.toLowerCase().includes(q) ||
        ord.items.some(
          (item) =>
            item.title.toLowerCase().includes(q) || item.model.toLowerCase().includes(q)
        )
      );
    });
  }, [orders, searchQuery, statusFilter]);

  async function handleGoogleAuth() {
    setAuthError('');
    setAuthNotice('');
    setAuthSubmitting(true);
    try {
      await signInWithGoogle();
      onAuthenticated?.();
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleEmailAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    setAuthSubmitting(true);
    try {
      if (authTab === 'signin') {
        await signInWithEmail(authEmail, authPassword);
        onAuthenticated?.();
      } else if (authTab === 'signup') {
        if (authName.trim().length < 2) {
          setAuthError('Please enter your full name.');
          setAuthSubmitting(false);
          return;
        }
        await signUpWithEmail(authName, authEmail, authPassword);
        onAuthenticated?.();
      } else {
        await sendPasswordReset(authEmail);
        setAuthNotice('Password reset link sent to your email.');
      }
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    setAuthError('');
    try {
      await signOutUser();
      setFirestoreOrders([]);
      setBackendOrders([]);
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    }
  }

  if (authLoading) {
    return (
      <div className={`py-12 flex flex-col items-center justify-center gap-3 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-[#650108]" />
        <p className="text-xs text-[#6B4C4E]">Checking account session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-[#E4D5B7] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setAuthTab('signin');
              setAuthError('');
              setAuthNotice('');
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              authTab === 'signin'
                ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                : 'text-[#6B4C4E] hover:text-[#650108]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('signup');
              setAuthError('');
              setAuthNotice('');
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              authTab === 'signup'
                ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                : 'text-[#6B4C4E] hover:text-[#650108]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Google Sign-In Button */}
        {authTab !== 'reset' && (
          <>
            <button
              type="button"
              disabled={authSubmitting}
              onClick={handleGoogleAuth}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#DFCFB0] hover:border-[#650108] text-sm font-semibold text-[#2B1416] inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.5 1.17-4.22 1.17-3.24 0-5.99-2.19-6.97-5.14H1.03v3.14C3.07 21.2 7.24 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.03 14.02c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.16H1.03A11.96 11.96 0 0 0 0 11.66c0 1.93.46 3.75 1.03 5.5l4-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.07 2.8 1.03 6.16l4 3.14C6.01 6.94 8.76 4.75 12 4.75Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-[#DFCFB0]" />
              <span className="px-3 text-[11px] font-medium uppercase tracking-wider text-[#8E6F70]">
                or with email
              </span>
              <div className="flex-1 border-t border-[#DFCFB0]" />
            </div>
          </>
        )}

        {authError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {authError}
          </div>
        )}
        {authNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{authNotice}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
          {authTab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#2B1416] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#2B1416] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
            />
          </div>

          {authTab !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#2B1416]">Password</label>
                {authTab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('reset');
                      setAuthError('');
                      setAuthNotice('');
                    }}
                    className="text-[11px] font-medium text-[#650108] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder={
                  authTab === 'signup' ? 'Minimum 6 characters' : 'Enter your password'
                }
                className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={authSubmitting}
            className="w-full py-3 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {authSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {authTab === 'signin'
                ? 'Sign In'
                : authTab === 'signup'
                  ? 'Create Account'
                  : 'Send Reset Link'}
            </span>
          </button>

          {authTab === 'reset' && (
            <button
              type="button"
              onClick={() => {
                setAuthTab('signin');
                setAuthError('');
                setAuthNotice('');
              }}
              className="w-full text-center text-xs font-medium text-[#6B4C4E] hover:text-[#650108] cursor-pointer"
            >
              Back to Sign In
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showAccountHeader && (
        <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#DFCFB0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-[#DFCFB0] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#650108] text-[#F2E8D2] text-sm font-bold flex items-center justify-center shrink-0">
                {(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm text-[#2B1416] truncate">
                {user.displayName || 'Customer'}
              </div>
              <div className="text-xs text-[#6B4C4E] truncate flex items-center gap-1.5">
                <span>{user.email}</span>
                {user.emailVerified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenDashboard && (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="px-3 py-1.5 rounded-lg bg-[#650108] hover:bg-[#4D0106] text-xs font-semibold text-[#F2E8D2] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            )}
            {onOpenFullOrders && (
              <button
                type="button"
                onClick={onOpenFullOrders}
                className="px-3 py-1.5 rounded-lg bg-[#EADEC2] hover:bg-[#DFCFB0] text-xs font-semibold text-[#650108] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Track Orders</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg border border-[#DFCFB0] bg-white hover:bg-[#FAF4E6] text-xs font-semibold text-[#6B4C4E] hover:text-[#650108] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Order Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] p-3">
          <div className="text-[11px] font-medium text-[#6B4C4E]">Total Orders</div>
          <div className="text-lg font-bold text-[#650108] tabular-nums">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] p-3">
          <div className="text-[11px] font-medium text-[#6B4C4E]">Active</div>
          <div className="text-lg font-bold text-indigo-700 tabular-nums">{stats.active}</div>
        </div>
        <div className="rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] p-3">
          <div className="text-[11px] font-medium text-[#6B4C4E]">Delivered</div>
          <div className="text-lg font-bold text-emerald-700 tabular-nums">{stats.delivered}</div>
        </div>
        <div className="rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] p-3">
          <div className="text-[11px] font-medium text-[#6B4C4E]">Total Spent</div>
          <div className="text-lg font-bold text-[#650108] tabular-nums">
            {formatTaka(stats.spent)}
          </div>
        </div>
      </div>

      {/* Controls: Filters, Search & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="inline-flex items-center gap-1 bg-[#E4D5B7] p-1 rounded-xl self-start overflow-x-auto max-w-full">
          {(
            [
              { id: 'all', label: `All (${stats.total})` },
              { id: 'active', label: `Active (${stats.active})` },
              { id: 'delivered', label: `Delivered (${stats.delivered})` },
              { id: 'cancelled', label: `Cancelled (${stats.cancelled})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                  : 'text-[#6B4C4E] hover:text-[#650108]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-[#8E6F70] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Order # or case model..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
            />
          </div>
          <button
            type="button"
            onClick={() => loadBackendOrders(false)}
            disabled={refreshingOrders}
            title="Refresh order history"
            className="p-2 rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] text-[#650108] hover:bg-[#FAF4E6] transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingOrders ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {ordersError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {ordersError}
        </div>
      )}

      {/* Order List */}
      {ordersLoading && orders.length === 0 ? (
        <div className="rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] py-10 text-center text-xs text-[#6B4C4E]">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#650108]" />
          Loading your order history...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] py-10 px-4 text-center space-y-2.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F2E8D2] text-[#650108] flex items-center justify-center mx-auto">
            <Package className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold text-[#650108]">No orders found yet</div>
          <p className="text-xs text-[#6B4C4E] max-w-sm mx-auto leading-relaxed">
            Orders placed with your signed-in account or matching verified email automatically sync here with live courier tracking.
          </p>
          {onOpenFullOrders && (
            <button
              type="button"
              onClick={onOpenFullOrders}
              className="mt-1 px-4 py-2 rounded-xl bg-[#EADEC2] hover:bg-[#DFCFB0] text-xs font-semibold text-[#650108] cursor-pointer"
            >
              Track a Guest Order by Number
            </button>
          )}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] py-8 px-4 text-center text-xs text-[#6B4C4E]">
          No orders match your current filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const badge = getOrderStatusBadge(order.fulfillmentStatus);
            const isExpanded = expandedOrderId === order.id;

            return (
              <article
                key={order.id}
                className="rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] overflow-hidden"
              >
                <div className="px-4 py-3 bg-[#FAF4E6] border-b border-[#EDE2C9] flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div>
                      <div className="text-[10px] text-[#6B4C4E]">Order</div>
                      <div className="text-xs font-bold font-mono text-[#650108]">
                        #{order.orderNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6B4C4E]">Placed</div>
                      <div className="text-[11px] font-medium text-[#2B1416] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#8E6F70]" />
                        <span>{formatOrderTimestamp(order.createdAt)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6B4C4E]">Total</div>
                      <div className="text-xs font-bold text-[#650108] tabular-nums">
                        {formatTaka(order.total)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold inline-flex items-center gap-1 ${
                        order.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-[#2B1416] border-[#DFCFB0]'
                      }`}
                    >
                      <CreditCard className="w-3 h-3" />
                      <span className="uppercase">{order.paymentMethod}</span>
                      <span>·</span>
                      <span>{order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 space-y-2.5">
                  <div className="divide-y divide-[#EDE2C9] border border-[#EDE2C9] rounded-lg overflow-hidden">
                    {order.items.map((item, idx) => (
                      <div
                        key={`${order.id}-${item.productId}-${idx}`}
                        className="p-2.5 flex items-center gap-3 bg-white"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-lg object-cover border border-[#EDE2C9] shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-[#FAF4E6] border border-[#EDE2C9] flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-[#8E6F70]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[#2B1416] line-clamp-1">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-[#6B4C4E]">
                            {item.model} · Qty {item.quantity}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-[#650108] tabular-nums shrink-0">
                          {formatTaka(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isExpanded && (
                    <div className="p-3 rounded-lg bg-[#FAF4E6] border border-[#EDE2C9] text-xs space-y-1">
                      <div className="font-semibold text-[#650108] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {order.customerName} · {order.customerPhone}
                        </span>
                      </div>
                      <p className="text-[#6B4C4E]">{order.deliveryAddress}</p>
                      <p className="text-[11px] text-[#6B4C4E]">
                        {order.courier
                          ? `${order.courier.provider} · Tracking #${order.courier.trackingCode}`
                          : order.deliveryArea === 'outside_dhaka'
                            ? 'Outside Dhaka Courier'
                            : 'Inside Dhaka Express'}{' '}
                        · TrxID: <span className="font-mono text-[#2B1416]">{order.transactionId}</span>
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrderId((prev) => (prev === order.id ? null : order.id))
                      }
                      className="text-[11px] font-semibold text-[#650108] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Hide details</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Delivery &amp; tracking details</span>
                        </>
                      )}
                    </button>

                    {onBuyAgain && (
                      <button
                        type="button"
                        onClick={() => onBuyAgain(order.items)}
                        className="px-3 py-1.5 rounded-lg border border-[#DFCFB0] bg-white hover:border-[#650108] text-[11px] font-semibold text-[#650108] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Buy Again</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
