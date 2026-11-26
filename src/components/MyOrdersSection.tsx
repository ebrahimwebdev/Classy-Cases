import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { formatTaka } from '../models/phoneCase';
import {
  saveCustomerOrderToFirestore,
  subscribeCustomerOrdersFromFirestore,
} from '../services/orderFirestore';
import { fetchAccountOrders } from '../services/userAccountService';
import type { FulfillmentStatus, Order, OrderItem, Product } from '../types';

export const CUSTOMER_ORDER_TOKENS_KEY = 'classycases_customer_order_tokens';

export function getSavedCustomerOrderTokens(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOMER_ORDER_TOKENS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === 'string' && t.length > 0)
      : [];
  } catch {
    return [];
  }
}

export function saveCustomerOrderToken(token?: string): string[] {
  if (!token) return getSavedCustomerOrderTokens();
  const current = getSavedCustomerOrderTokens();
  const next = Array.from(new Set([token, ...current])).slice(0, 12);
  try {
    localStorage.setItem(CUSTOMER_ORDER_TOKENS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next;
}

export function clearSavedCustomerOrderTokens(): void {
  try {
    localStorage.removeItem(CUSTOMER_ORDER_TOKENS_KEY);
  } catch {
    // ignore
  }
}

interface MyOrdersSectionProps {
  products: Product[];
  onBackToShop: () => void;
  onBuyAgain: (items: OrderItem[]) => void;
  onOpenAccount?: () => void;
  initialTab?: 'history' | 'tracking';
}

const PROGRESS_STEPS: { key: Exclude<FulfillmentStatus, 'cancelled'>; label: string }[] = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

function getStepIndex(status: FulfillmentStatus): number {
  if (status === 'pending') return 0;
  if (status === 'confirmed') return 1;
  if (status === 'shipped') return 2;
  if (status === 'delivered') return 3;
  return -1;
}

function getStatusBadge(status: FulfillmentStatus): { label: string; className: string } {
  switch (status) {
    case 'delivered':
      return { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'shipped':
      return { label: 'Shipped', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'confirmed':
      return { label: 'Confirmed', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
}

function formatOrderDate(iso: string): string {
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

function OrderTrackingTimeline({ order }: { order: Order }) {
  const stepIdx = getStepIndex(order.fulfillmentStatus);
  const deliveryWindow =
    order.deliveryArea === 'outside_dhaka'
      ? 'Estimated 2–4 business days via nationwide courier'
      : 'Estimated 24–48 hours express Dhaka delivery';

  const trackingLabel = order.courier?.trackingCode || `CC-TRK-${order.orderNumber}`;
  const courierProviderLabel = order.courier?.provider
    ? `${order.courier.provider} Courier`
    : order.deliveryArea === 'outside_dhaka'
      ? 'Outside Dhaka Courier'
      : 'Inside Dhaka Express';

  const milestones = [
    {
      title: 'Order Placed',
      detail: `Order #${order.orderNumber} received (${order.items.reduce((a, i) => a + i.quantity, 0)} items) · TrxID: ${order.transactionId}`,
      time: formatOrderDate(order.createdAt),
      done: stepIdx >= 0,
      current: stepIdx === 0,
    },
    {
      title: order.courier ? `Confirmed & Booked (${order.courier.provider})` : 'Confirmed & Packed',
      detail: order.courier
        ? `Booked with ${order.courier.provider} · Tracking #${order.courier.trackingCode}${order.courier.note ? ` · ${order.courier.note}` : ''}`
        : order.paymentStatus === 'paid'
          ? `Payment verified (${order.paymentMethod.toUpperCase()}) & phone case models quality-checked.`
          : 'Cash on Delivery confirmed & parcel prepared for courier pickup.',
      time:
        stepIdx >= 1 || order.courier
          ? formatOrderDate(order.courier?.bookedAt || order.confirmedAt || order.updatedAt)
          : 'Awaiting confirmation',
      done: stepIdx >= 1 || Boolean(order.courier),
      current: stepIdx === 1,
    },
    {
      title: 'In Transit (Courier Dispatched)',
      detail: `Tracking #${trackingLabel} · ${courierProviderLabel}`,
      time: stepIdx >= 2 ? formatOrderDate(order.shippedAt || order.updatedAt) : deliveryWindow,
      done: stepIdx >= 2,
      current: stepIdx === 2,
    },
    {
      title: 'Delivered',
      detail: `Delivered to ${order.deliveryAddress}`,
      time: stepIdx >= 3 ? formatOrderDate(order.deliveredAt || order.updatedAt) : 'Pending delivery',
      done: stepIdx >= 3,
      current: stepIdx === 3,
    },
  ];

  return (
    <div className="border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EDE2C9]">
        <div>
          <div className="text-[11px] font-medium text-[#6B4C4E]">Live Parcel Tracking</div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <h3 className="text-base sm:text-lg font-bold text-[#650108] font-mono">
              Order #{order.orderNumber}
            </h3>
            <span className="text-xs text-[#C9B38D]">·</span>
            <span className="text-xs font-mono text-[#6B4C4E]">
              {trackingLabel}
            </span>
            {order.courier?.provider && (
              <span className="px-2 py-0.5 rounded bg-[#FAF4E6] border border-[#DFCFB0] text-[11px] font-semibold text-[#650108]">
                {order.courier.provider}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B4C4E]">
            {order.deliveryArea === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}
          </span>
          <span
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${getStatusBadge(order.fulfillmentStatus).className}`}
          >
            {getStatusBadge(order.fulfillmentStatus).label}
          </span>
        </div>
      </div>

      {order.fulfillmentStatus === 'cancelled' ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5">
          <XCircle className="w-4 h-4 shrink-0" />
          <div>
            <p className="font-semibold">Order #{order.orderNumber} was cancelled</p>
            <p className="mt-0.5 text-red-600">
              Updated {formatOrderDate(order.updatedAt)}. Contact support if you would like to reorder.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((m, idx) => (
            <div key={m.title} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border text-[11px] font-bold shrink-0 ${
                    m.done
                      ? 'bg-[#650108] border-[#650108] text-[#F2E8D2]'
                      : 'bg-[#FFFDF8] border-[#C9B38D] text-[#8E6F70]'
                  }`}
                >
                  {m.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                {idx < milestones.length - 1 && (
                  <div
                    className={`w-px flex-1 my-1 min-h-[20px] ${
                      stepIdx > idx ? 'bg-[#650108]' : 'bg-[#DFCFB0]'
                    }`}
                  />
                )}
              </div>

              <div className="pb-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      m.current
                        ? 'text-[#650108]'
                        : m.done
                          ? 'text-[#2B1416]'
                          : 'text-[#8E6F70]'
                    }`}
                  >
                    {m.title}
                  </span>
                  <span className="text-xs text-[#6B4C4E] tabular-nums">{m.time}</span>
                </div>
                <p className="text-[13px] text-[#6B4C4E] mt-0.5 leading-relaxed">{m.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MyOrdersSection({
  products,
  onBackToShop,
  onBuyAgain,
  onOpenAccount,
  initialTab = 'history',
}: MyOrdersSectionProps) {
  const { user, idToken, signInWithGoogle } = useFirebaseAuth();
  const [apiOrders, setApiOrders] = useState<Order[]>([]);
  const [firestoreOrders, setFirestoreOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [authBannerError, setAuthBannerError] = useState('');

  const [sectionTab, setSectionTab] = useState<'history' | 'tracking'>(initialTab);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);

  // Order lookup / live tracking form inside My Orders
  const [lookupOrderNumber, setLookupOrderNumber] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupSuccess, setLookupSuccess] = useState('');

  useEffect(() => {
    setSectionTab(initialTab);
  }, [initialTab]);

  const mergeAndSortOrders = useCallback((...lists: Order[][]): Order[] => {
    const map = new Map<string, Order>();
    for (const list of lists) {
      for (const ord of list) {
        if (!ord?.id) continue;
        const prev = map.get(ord.id);
        if (!prev) {
          map.set(ord.id, ord);
        } else {
          map.set(ord.id, {
            ...prev,
            ...ord,
            courier: ord.courier
              ? { ...(prev.courier || {}), ...ord.courier }
              : prev.courier,
          });
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);

  const orders = useMemo(
    () => mergeAndSortOrders(apiOrders, firestoreOrders),
    [apiOrders, firestoreOrders, mergeAndSortOrders]
  );

  const trackedOrder = useMemo(() => {
    if (orders.length === 0) return null;
    if (trackedOrderId) {
      return orders.find((o) => o.id === trackedOrderId) || orders[0];
    }
    return orders[0];
  }, [orders, trackedOrderId]);

  // Real-time Firestore listener for authenticated customer's purchases
  useEffect(() => {
    if (!user?.uid) {
      setFirestoreOrders([]);
      return;
    }

    const unsubscribe = subscribeCustomerOrdersFromFirestore(
      user.uid,
      (liveOrders) => {
        setFirestoreOrders(liveOrders);
        setLoading(false);
        if (liveOrders.length > 0) {
          setExpandedOrderId((prev) => prev || liveOrders[0].id);
          setTrackedOrderId((prev) => prev || liveOrders[0].id);
        }
      },
      () => {
        // Gracefully keep server-backed account orders if Firestore rules are not yet deployed
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  const fetchOrders = useCallback(
    async (showSpinner = true) => {
      const tokens = getSavedCustomerOrderTokens();
      if (tokens.length === 0 && !idToken) {
        setApiOrders([]);
        if (!user?.uid) {
          setLoading(false);
        }
        setRefreshing(false);
        return;
      }

      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      try {
        const [guestOrders, accountOrders] = await Promise.all([
          tokens.length > 0
            ? fetch('/api/orders/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens }),
              })
                .then(async (res) => {
                  if (!res.ok) return [] as Order[];
                  const data = await res.json();
                  return Array.isArray(data.orders) ? (data.orders as Order[]) : [];
                })
                .catch(() => [] as Order[])
            : Promise.resolve([] as Order[]),
          idToken
            ? fetchAccountOrders(idToken).catch(() => [] as Order[])
            : Promise.resolve([] as Order[]),
        ]);

        const combinedApi = mergeAndSortOrders(guestOrders, accountOrders);
        setApiOrders(combinedApi);

        if (user?.uid && accountOrders.length > 0) {
          for (const ord of accountOrders) {
            if (
              (ord.fulfillmentStatus === 'pending' || ord.fulfillmentStatus === 'confirmed') &&
              (ord.paymentMethod !== 'cod' || ord.paymentStatus === 'pending')
            ) {
              void saveCustomerOrderToFirestore(ord).catch(() => {});
            }
          }
        }

        if (combinedApi.length > 0) {
          setExpandedOrderId((prev) => prev || combinedApi[0].id);
          setTrackedOrderId((prev) => prev || combinedApi[0].id);
        }
      } catch {
        // ignore transient network error
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [idToken, mergeAndSortOrders, user?.uid]
  );

  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  async function handleQuickGoogleSignIn() {
    setAuthBannerError('');
    setGoogleSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthBannerError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
    } finally {
      setGoogleSigningIn(false);
    }
  }

  async function handleTrackAndSyncOrder(e: React.FormEvent) {
    e.preventDefault();
    setLookupError('');
    setLookupSuccess('');
    setLookupLoading(true);

    const cleanOrderNum = lookupOrderNumber.trim().replace(/^#/, '');
    const cleanPhone = lookupPhone.trim();

    try {
      const trackParams = new URLSearchParams({
        orderNumber: cleanOrderNum,
        phone: cleanPhone,
      });
      const trackRes = await fetch(`/api/orders/track?${trackParams.toString()}`);
      const trackData = await trackRes.json();
      if (!trackRes.ok) {
        setLookupError(trackData.error || 'No matching order found.');
        return;
      }

      if (trackData.customerOrderToken) {
        saveCustomerOrderToken(trackData.customerOrderToken);
      }

      if (trackData.order) {
        const tracked = trackData.order as Order;
        setApiOrders((prev) => mergeAndSortOrders(prev, [tracked]));
        setTrackedOrderId(tracked.id);
        setSectionTab('tracking');
      }

      // Also refresh full synced history for this verified phone
      const tokens = getSavedCustomerOrderTokens();
      const historyRes = await fetch('/api/orders/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const nextOrders = Array.isArray(historyData.orders) ? (historyData.orders as Order[]) : [];
        setApiOrders((prev) => mergeAndSortOrders(prev, nextOrders));
      }

      setLookupSuccess(`Live status loaded for Order #${trackData.order.orderNumber}.`);
    } catch {
      setLookupError('Network error while tracking your order.');
    } finally {
      setLookupLoading(false);
    }
  }

  function handleClearHistory() {
    clearSavedCustomerOrderTokens();
    setApiOrders((prev) => prev.filter((ord) => Boolean(user?.uid && ord.firebaseUid === user.uid)));
    setTrackedOrderId(null);
    setExpandedOrderId(null);
    setLookupSuccess('');
  }

  const stats = useMemo(() => {
    const active = orders.filter(
      (o) =>
        o.fulfillmentStatus === 'pending' ||
        o.fulfillmentStatus === 'confirmed' ||
        o.fulfillmentStatus === 'shipped'
    ).length;
    const delivered = orders.filter((o) => o.fulfillmentStatus === 'delivered').length;
    const spent = orders
      .filter((o) => o.fulfillmentStatus !== 'cancelled')
      .reduce((acc, o) => acc + o.total, 0);
    return {
      total: orders.length,
      active,
      delivered,
      spent,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((ord) => {
      const matchesTab =
        statusFilter === 'all'
          ? true
          : statusFilter === 'delivered'
            ? ord.fulfillmentStatus === 'delivered'
            : statusFilter === 'cancelled'
              ? ord.fulfillmentStatus === 'cancelled'
              : ord.fulfillmentStatus === 'pending' ||
                ord.fulfillmentStatus === 'confirmed' ||
                ord.fulfillmentStatus === 'shipped';

      if (!matchesTab) return false;
      if (!q) return true;

      return (
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.transactionId.toLowerCase().includes(q) ||
        ord.items.some(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.model.toLowerCase().includes(q)
        )
      );
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <section className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-6 pb-16 space-y-6">
      {/* Top Breadcrumb + Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToShop}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B4C4E] hover:text-[#650108] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shop</span>
          </button>
          <h1 className="font-brand text-2xl sm:text-3xl font-semibold text-[#650108] tracking-tight">
            My Orders &amp; Tracking
          </h1>
          <p className="text-xs sm:text-sm text-[#6B4C4E] mt-1">
            View purchase history, track real-time courier progress, or verify any order by ID and phone.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Section Tabs inside My Orders */}
          <div className="inline-flex items-center gap-1 bg-[#E4D5B7] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSectionTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                sectionTab === 'history'
                  ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                  : 'text-[#6B4C4E] hover:text-[#650108]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Order History ({orders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSectionTab('tracking')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                sectionTab === 'tracking'
                  ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                  : 'text-[#6B4C4E] hover:text-[#650108]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Order Tracking</span>
            </button>
          </div>

          {orders.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => fetchOrders(false)}
                disabled={refreshing}
                className="px-3.5 py-2 rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] text-xs font-semibold text-[#650108] hover:bg-[#FAF4E6] transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                title="Remove saved order session from this device"
                className="p-2 rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] text-[#6B4C4E] hover:text-[#650108] hover:border-[#650108]/40 transition-colors"
                aria-label="Clear saved order history on this device"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Account Sync Banner */}
      <div className="bg-[#FFFDF8] border border-[#DFCFB0] rounded-2xl px-4 py-3.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#EADEC2] text-[#650108] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="text-xs min-w-0">
              {user ? (
                <>
                  <div className="font-semibold text-[#2B1416] truncate">
                    Signed in as {user.displayName || user.email}
                  </div>
                  <div className="text-[#6B4C4E]">
                    Your previous purchases and live courier status sync automatically across devices.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-[#2B1416]">
                    Sign in to view &amp; track your previous purchases
                  </div>
                  <div className="text-[#6B4C4E]">
                    Access real-time order updates across all your devices, or use guest lookup below.
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!user && (
              <button
                type="button"
                onClick={handleQuickGoogleSignIn}
                disabled={googleSigningIn}
                className="px-3.5 py-2 rounded-xl border border-[#DFCFB0] bg-[#FAF4E6] text-[#2B1416] text-xs font-semibold hover:border-[#650108] transition-colors inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {googleSigningIn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#650108]" />
                ) : null}
                <span>Continue with Google</span>
              </button>
            )}
            {onOpenAccount && (
              <button
                type="button"
                onClick={onOpenAccount}
                className="px-3.5 py-2 rounded-xl bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] transition-colors whitespace-nowrap cursor-pointer"
              >
                {user ? 'Manage Profile' : 'Sign In / Sign Up'}
              </button>
            )}
          </div>
        </div>
        {authBannerError && (
          <p className="text-xs text-red-600 font-medium">{authBannerError}</p>
        )}
      </div>

      {/* Track Any Order Form Bar */}
      {(sectionTab === 'tracking' || (!loading && orders.length === 0)) && (
        <div className="bg-[#FAF4E6] border border-[#DFCFB0] rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="max-w-md">
              <h2 className="font-brand text-lg font-semibold text-[#650108] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#650108]" />
                <span>Track Your Order</span>
              </h2>
              <p className="text-[13px] text-[#6B4C4E] mt-1 leading-relaxed">
                Enter your Order Number and checkout Phone Number to inspect live courier status and sync past orders to this browser.
              </p>
            </div>

            <form
              onSubmit={handleTrackAndSyncOrder}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl"
            >
              <input
                type="text"
                required
                value={lookupOrderNumber}
                onChange={(e) => setLookupOrderNumber(e.target.value)}
                placeholder="Order # (e.g. 1001)"
                className="flex-1 px-3.5 py-2.5 text-[13px] bg-white border border-[#DFCFB0] rounded-xl focus:outline-none focus:border-[#650108]"
              />
              <input
                type="tel"
                required
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="Phone (e.g. 017XXXXXXXX)"
                className="flex-1 px-3.5 py-2.5 text-[13px] bg-white border border-[#DFCFB0] rounded-xl focus:outline-none focus:border-[#650108]"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="px-5 py-2.5 rounded-xl bg-[#650108] text-[#F2E8D2] text-[13px] font-semibold hover:bg-[#4D0106] transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-60"
              >
                {lookupLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PackageCheck className="w-4 h-4" />
                )}
                <span>Track Order</span>
              </button>
            </form>
          </div>

          {lookupError && (
            <p className="text-xs text-red-600 font-medium mt-3">{lookupError}</p>
          )}
          {lookupSuccess && (
            <p className="text-xs text-emerald-700 font-medium mt-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{lookupSuccess}</span>
            </p>
          )}
        </div>
      )}

      {/* Order Tracking Tab Content */}
      {sectionTab === 'tracking' && (
        <div className="space-y-5">
          {orders.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#6B4C4E] mr-1">
                Quick select from your orders:
              </span>
              {orders.map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => setTrackedOrderId(ord.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                    trackedOrder?.id === ord.id
                      ? 'bg-[#650108] text-[#F2E8D2] border-[#650108]'
                      : 'bg-[#FFFDF8] text-[#2B1416] border-[#DFCFB0] hover:border-[#650108]'
                  }`}
                >
                  #{ord.orderNumber}
                </button>
              ))}
            </div>
          )}

          {trackedOrder ? (
            <OrderTrackingTimeline order={trackedOrder} />
          ) : (
            <div className="border border-[#DFCFB0] rounded-2xl py-12 px-4 text-center bg-[#FFFDF8] text-xs text-[#6B4C4E]">
              Enter your Order Number and Phone Number above to track your shipment in real time.
            </div>
          )}
        </div>
      )}

      {/* Order History Tab Content */}
      {sectionTab === 'history' && (
        <>
          {/* Summary Stats */}
          {orders.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="border border-[#DFCFB0] rounded-2xl p-4 bg-[#FFFDF8]">
                <div className="text-[11px] font-medium text-[#6B4C4E]">Total Purchases</div>
                <div className="text-xl font-bold text-[#650108] mt-1 tabular-nums">{stats.total}</div>
              </div>
              <div className="border border-[#DFCFB0] rounded-2xl p-4 bg-[#FFFDF8]">
                <div className="text-[11px] font-medium text-[#6B4C4E]">Active Orders</div>
                <div className="text-xl font-bold text-[#650108] mt-1 tabular-nums">{stats.active}</div>
              </div>
              <div className="border border-[#DFCFB0] rounded-2xl p-4 bg-[#FFFDF8]">
                <div className="text-[11px] font-medium text-[#6B4C4E]">Delivered</div>
                <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{stats.delivered}</div>
              </div>
              <div className="border border-[#DFCFB0] rounded-2xl p-4 bg-[#FFFDF8]">
                <div className="text-[11px] font-medium text-[#6B4C4E]">Total Spent</div>
                <div className="text-xl font-bold text-[#650108] mt-1 tabular-nums">
                  {formatTaka(stats.spent)}
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs + Order Search */}
          {orders.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 bg-[#E4D5B7] p-1 rounded-xl self-start overflow-x-auto max-w-full">
                {(
                  [
                    { id: 'all', label: `All (${orders.length})` },
                    { id: 'active', label: `Active (${stats.active})` },
                    { id: 'delivered', label: `Delivered (${stats.delivered})` },
                    {
                      id: 'cancelled',
                      label: `Cancelled (${orders.filter((o) => o.fulfillmentStatus === 'cancelled').length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilter === tab.id
                        ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                        : 'text-[#6B4C4E] hover:text-[#650108]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-[#8E6F70] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order # or case model..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#DFCFB0] rounded-xl bg-[#FFFDF8] focus:outline-none focus:border-[#650108]"
                />
              </div>
            </div>
          )}

          {/* Orders List */}
          {loading ? (
            <div className="border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] p-12 text-center text-xs text-[#6B4C4E]">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#650108]" />
              Loading your order history...
            </div>
          ) : orders.length === 0 ? (
            <div className="border border-[#DFCFB0] rounded-2xl py-16 px-4 text-center bg-[#FFFDF8]">
              <div className="w-12 h-12 rounded-2xl bg-[#F2E8D2] text-[#650108] flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-brand text-lg font-semibold text-[#650108]">No purchases found on this browser yet</h3>
              <p className="text-xs text-[#6B4C4E] max-w-md mx-auto mt-1.5 leading-relaxed">
                Orders you place automatically appear here with live tracking. You can also track any past order above using your Order Number and Phone Number.
              </p>
              <button
                type="button"
                onClick={onBackToShop}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] transition-colors inline-flex items-center gap-2"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Browse Phone Cases</span>
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="border border-[#DFCFB0] rounded-2xl py-12 px-4 text-center bg-[#FFFDF8] text-xs text-[#6B4C4E]">
              No orders match your current filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const badge = getStatusBadge(order.fulfillmentStatus);
                const stepIdx = getStepIndex(order.fulfillmentStatus);
                const isExpanded = expandedOrderId === order.id;

                const canReorder = order.items.some((item) =>
                  products.some((p) => p.id === item.productId && p.active !== false)
                );

                return (
                  <article
                    key={order.id}
                    className="border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] overflow-hidden shadow-xs"
                  >
                    {/* Card Header */}
                    <div className="px-4 sm:px-6 py-4 bg-[#FAF4E6] border-b border-[#DFCFB0] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <div>
                          <div className="text-[11px] text-[#6B4C4E]">Order Number</div>
                          <div className="text-sm font-bold font-mono text-[#650108]">
                            #{order.orderNumber}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-[#6B4C4E]">Placed On</div>
                          <div className="text-xs font-medium text-[#2B1416] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#8E6F70]" />
                            <span>{formatOrderDate(order.createdAt)}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-[#6B4C4E]">Total</div>
                          <div className="text-sm font-bold text-[#650108] tabular-nums">
                            {formatTaka(order.total)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 ${
                            order.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-[#FFFDF8] text-[#2B1416] border-[#DFCFB0]'
                          }`}
                        >
                          <CreditCard className="w-3 h-3" />
                          <span className="uppercase tracking-[1.5px]">{order.paymentMethod}</span>
                          <span>·</span>
                          <span>{order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}</span>
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-6 space-y-5">
                      {/* Live Status Progress Bar */}
                      {order.fulfillmentStatus === 'cancelled' ? (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>This order was cancelled. Contact support if you need help placing a replacement.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 sm:gap-4">
                          {PROGRESS_STEPS.map((st, idx) => {
                            const completed = idx <= stepIdx;
                            const active = idx === stepIdx;
                            return (
                              <div key={st.key} className="space-y-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-colors ${
                                    completed ? 'bg-[#650108]' : 'bg-[#E4D5B7]'
                                  }`}
                                />
                                <div
                                  className={`text-[10px] sm:text-[11px] font-medium ${
                                    active
                                      ? 'text-[#650108] font-bold'
                                      : completed
                                        ? 'text-[#2B1416]'
                                        : 'text-[#8E6F70]'
                                  }`}
                                >
                                  {st.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Ordered Items */}
                      <div className="divide-y divide-[#EDE2C9] border border-[#EDE2C9] rounded-xl overflow-hidden">
                        {order.items.map((item, idx) => (
                          <div
                            key={`${order.id}-${item.productId}-${idx}`}
                            className="p-3 sm:px-4 flex items-center gap-3.5 bg-[#FFFDF8]"
                          >
                            <img
                              src={item.image}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 rounded-xl object-cover border border-[#EDE2C9] shrink-0 bg-white"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-[#2B1416] line-clamp-1">
                                {item.title}
                              </div>
                              <div className="text-xs text-[#6B4C4E] mt-0.5">
                                Model: <span className="font-medium text-[#2B1416]">{item.model}</span> · Qty:{' '}
                                <span className="font-medium text-[#2B1416] tabular-nums">{item.quantity}</span>
                              </div>
                            </div>
                            <div className="text-sm font-bold text-[#650108] tabular-nums shrink-0">
                              {formatTaka(item.price * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Expanded Delivery & Breakdown */}
                      {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#EDE2C9] text-[13px]">
                          <div className="p-3.5 rounded-xl bg-[#FAF4E6] border border-[#DFCFB0] space-y-1.5">
                            <div className="font-semibold text-[#650108] flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#650108]" />
                              <span>Delivery Details</span>
                            </div>
                            <p className="text-[#2B1416] font-medium">
                              {order.customerName} · {order.customerPhone}
                            </p>
                            <p className="text-[#6B4C4E]">{order.deliveryAddress}</p>
                            <p className="text-[11px] text-[#6B4C4E] flex items-center gap-1 pt-0.5">
                              <Truck className="w-3 h-3" />
                              <span>
                                {order.courier
                                  ? `${order.courier.provider} (${order.courier.trackingCode})`
                                  : order.deliveryArea === 'outside_dhaka'
                                    ? 'Outside Dhaka Courier'
                                    : 'Inside Dhaka Express'}{' '}
                                · TrxID: <span className="font-mono text-[#2B1416]">{order.transactionId}</span>
                              </span>
                            </p>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#FAF4E6] border border-[#DFCFB0] space-y-1.5">
                            <div className="font-semibold text-[#650108]">Payment Summary</div>
                            <div className="flex justify-between text-[#6B4C4E]">
                              <span>Subtotal</span>
                              <span className="font-bold tabular-nums text-[#2B1416]">{formatTaka(order.subtotal)}</span>
                            </div>
                            {order.discountAmount > 0 && (
                              <div className="flex justify-between text-emerald-700">
                                <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                                <span className="font-bold tabular-nums">-{formatTaka(order.discountAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-[#6B4C4E]">
                              <span>Delivery Fee</span>
                              <span className="font-bold tabular-nums text-[#2B1416]">
                                {order.shippingFee === 0 ? 'Free' : formatTaka(order.shippingFee)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1.5 border-t border-[#DFCFB0] font-bold text-[#650108]">
                              <span>Total Paid / Payable</span>
                              <span className="tabular-nums">{formatTaka(order.total)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="text-xs font-semibold text-[#6B4C4E] hover:text-[#650108]"
                        >
                          {isExpanded ? 'Hide Receipt Details' : 'View Delivery & Receipt Details'}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTrackedOrderId(order.id);
                              setSectionTab('tracking');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-3.5 py-2 rounded-xl border border-[#DFCFB0] bg-[#FAF4E6] text-xs font-semibold text-[#650108] hover:bg-[#F2E8D2] transition-colors inline-flex items-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Track Package</span>
                          </button>

                          {canReorder && (
                            <button
                              type="button"
                              onClick={() => onBuyAgain(order.items)}
                              className="px-3.5 py-2 rounded-xl border border-[#650108] bg-[#FFFDF8] text-xs font-semibold text-[#650108] hover:bg-[#650108] hover:text-[#F2E8D2] transition-colors inline-flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Buy Again</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
