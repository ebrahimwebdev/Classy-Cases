import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { formatTaka } from '../models/phoneCase';
import {
  fetchAdminCustomerDetail,
  fetchAdminCustomers,
  updateAdminCustomerStatus,
  type AdminCustomerListResponse,
} from '../services/userAccountService';
import type {
  AdminCustomerRecord,
  CustomerAccountStatus,
  CustomerActivityItem,
  FulfillmentStatus,
  Order,
} from '../types';

interface AdminCustomersViewProps {
  adminToken: string;
  selectedCustomerId: string | null;
  onSelectCustomerId: (customerId: string | null) => void;
  onSelectOrder: (orderId: string) => void;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
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

function getFulfillmentBadgeClass(status: FulfillmentStatus): string {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
    case 'shipped':
      return 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30';
    case 'confirmed':
      return 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30';
    case 'cancelled':
      return 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30';
    default:
      return 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
  }
}

function getActivityIcon(type: CustomerActivityItem['type']) {
  switch (type) {
    case 'account_created':
      return <UserCheck className="w-3.5 h-3.5 text-indigo-500" />;
    case 'profile_updated':
      return <Clock className="w-3.5 h-3.5 text-sky-500" />;
    case 'order_placed':
      return <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />;
    case 'order_status':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case 'status_changed':
      return <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-slate-500" />;
  }
}

export function AdminCustomersView({
  adminToken,
  selectedCustomerId,
  onSelectCustomerId,
  onSelectOrder,
}: AdminCustomersViewProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'deactivated' | 'registered' | 'guest'
  >('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'orders' | 'spent' | 'name'>('recent');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [listData, setListData] = useState<AdminCustomerListResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  // Customer Detail State
  const [detailCustomer, setDetailCustomer] = useState<AdminCustomerRecord | null>(null);
  const [detailOrders, setDetailOrders] = useState<Order[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Status update state
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [adminNoteDraft, setAdminNoteDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadCustomers = useCallback(async () => {
    if (!adminToken) return;
    setLoadingList(true);
    setListError('');
    try {
      const data = await fetchAdminCustomers(adminToken, {
        search: debouncedSearch,
        status: statusFilter,
        dateFrom,
        dateTo,
        sortBy,
        page,
        limit,
      });
      setListData(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not load customers.');
    } finally {
      setLoadingList(false);
    }
  }, [adminToken, debouncedSearch, statusFilter, dateFrom, dateTo, sortBy, page, limit]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const loadCustomerDetail = useCallback(
    async (customerId: string) => {
      if (!adminToken) return;
      setLoadingDetail(true);
      setDetailError('');
      setStatusMessage('');
      try {
        const res = await fetchAdminCustomerDetail(adminToken, customerId);
        setDetailCustomer(res.customer);
        setDetailOrders(res.orders);
        setAdminNoteDraft(res.customer.adminNote || '');
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : 'Unable to load customer profile.');
      } finally {
        setLoadingDetail(false);
      }
    },
    [adminToken]
  );

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerDetail(selectedCustomerId);
    } else {
      setDetailCustomer(null);
      setDetailOrders([]);
      setDetailError('');
      setStatusMessage('');
    }
  }, [selectedCustomerId, loadCustomerDetail]);

  async function handleToggleAccountStatus(
    customer: AdminCustomerRecord,
    nextStatus: CustomerAccountStatus,
    note?: string
  ) {
    if (!adminToken || !customer.isRegistered) return;
    setTogglingId(customer.id);
    setStatusMessage('');
    setListError('');
    setDetailError('');
    try {
      const updated = await updateAdminCustomerStatus(adminToken, customer.id, nextStatus, note);
      if (detailCustomer && detailCustomer.id === customer.id) {
        setDetailCustomer(updated);
        setAdminNoteDraft(updated.adminNote || '');
        setStatusMessage(
          nextStatus === 'deactivated'
            ? 'Customer account deactivated.'
            : 'Customer account activated.'
        );
      }
      await loadCustomers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update customer status.';
      if (selectedCustomerId) setDetailError(msg);
      else setListError(msg);
    } finally {
      setTogglingId(null);
    }
  }

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('recent');
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    sortBy !== 'recent';

  // CUSTOMER DETAIL SUB-VIEW
  if (selectedCustomerId) {
    if (loadingDetail && !detailCustomer) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Loading customer details...
          </p>
        </div>
      );
    }

    if (detailError && !detailCustomer) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => onSelectCustomerId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customers</span>
          </button>
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 rounded-xl p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{detailError}</p>
            <button
              type="button"
              onClick={() => loadCustomerDetail(selectedCustomerId)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!detailCustomer) return null;

    const avgOrderValue =
      detailCustomer.orderCount > 0
        ? Math.round(detailCustomer.totalSpent / detailCustomer.orderCount)
        : 0;
    const isDeactivated = detailCustomer.status === 'deactivated';

    return (
      <div className="space-y-5">
        {/* Top Back + Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onSelectCustomerId(null)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              title="Back to Customers"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 min-w-0">
              {detailCustomer.photoUrl ? (
                <img
                  src={detailCustomer.photoUrl}
                  alt={detailCustomer.displayName}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-bold text-base flex items-center justify-center shrink-0">
                  {(detailCustomer.displayName || detailCustomer.email || 'C')
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                    {detailCustomer.displayName}
                  </h1>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      detailCustomer.isRegistered
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {detailCustomer.isRegistered ? 'Registered' : 'Guest Buyer'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      isDeactivated
                        ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                        : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                    }`}
                  >
                    {isDeactivated ? 'Deactivated' : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Joined {formatDate(detailCustomer.createdAt)} · Customer ID:{' '}
                  <span className="font-mono">{detailCustomer.id}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadCustomerDetail(detailCustomer.id)}
              disabled={loadingDetail}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDetail ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {detailCustomer.isRegistered && (
              <button
                type="button"
                disabled={togglingId === detailCustomer.id}
                onClick={() =>
                  handleToggleAccountStatus(
                    detailCustomer,
                    isDeactivated ? 'active' : 'deactivated',
                    adminNoteDraft
                  )
                }
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
                  isDeactivated
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {togglingId === detailCustomer.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isDeactivated ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5" />
                )}
                <span>{isDeactivated ? 'Activate Account' : 'Deactivate Account'}</span>
              </button>
            )}
          </div>
        </div>

        {detailError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300">
            {detailError}
          </div>
        )}
        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Customer KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Total Orders</span>
              <ShoppingBag className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">
              {detailCustomer.orderCount}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {detailCustomer.lastOrderAt
                ? `Last order ${formatDate(detailCustomer.lastOrderAt)}`
                : 'No orders placed yet'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Total Spent</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">
              {formatTaka(detailCustomer.totalSpent)}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Lifetime valid order spend
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Delivered Orders</span>
              <CheckCircle2 className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">
              {detailCustomer.completedOrdersCount}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {detailCustomer.cancelledOrdersCount} cancelled
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Avg Order Value</span>
              <Package className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">
              {formatTaka(avgOrderValue)}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Per completed/active order
            </div>
          </div>
        </div>

        {/* Main 2-Column Detail Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Customer Info, Admin Note, Delivery Addresses, Recent Activity */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Customer &amp; Contact Info
              </h2>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Email</div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 break-all">
                      {detailCustomer.email || 'Not provided'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Phone</div>
                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {detailCustomer.phone || 'Not provided'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Account Created
                    </div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {formatDateTime(detailCustomer.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Last Sign-In / Activity
                    </div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {formatDateTime(detailCustomer.lastActiveAt)}
                    </div>
                  </div>
                </div>
              </div>

              {detailCustomer.isRegistered && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Admin Note (Internal)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={adminNoteDraft}
                    onChange={(e) => setAdminNoteDraft(e.target.value)}
                    placeholder="Optional note about customer status or verification..."
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={togglingId === detailCustomer.id}
                    onClick={() =>
                      handleToggleAccountStatus(
                        detailCustomer,
                        detailCustomer.status,
                        adminNoteDraft
                      )
                    }
                    className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Save Admin Note
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Addresses Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Delivery Addresses
                </h2>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {detailCustomer.addresses.length} saved
                </span>
              </div>

              {detailCustomer.addresses.length === 0 && !detailCustomer.address ? (
                <p className="text-slate-500 dark:text-slate-400">
                  No delivery addresses recorded yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {detailCustomer.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{addr.label}</span>
                        </span>
                        {addr.isDefault && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        {addr.address}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {addr.district ? `${addr.district} · ` : ''}
                        {addr.deliveryArea === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}
                        {addr.phone ? ` · ${addr.phone}` : ''}
                      </div>
                    </div>
                  ))}

                  {detailCustomer.addresses.length === 0 && detailCustomer.address && (
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Primary Address
                      </div>
                      <div className="text-slate-700 dark:text-slate-200">
                        {detailCustomer.address}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {detailCustomer.district || 'Dhaka'} ·{' '}
                        {detailCustomer.deliveryArea === 'outside_dhaka'
                          ? 'Outside Dhaka'
                          : 'Inside Dhaka'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Recent Activity
              </h2>

              {!detailCustomer.recentActivity || detailCustomer.recentActivity.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No recent activity logged.</p>
              ) : (
                <div className="space-y-3">
                  {detailCustomer.recentActivity.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {act.title}
                        </div>
                        {act.detail && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words">
                            {act.detail}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatDateTime(act.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order History */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Order History ({detailOrders.length})
              </h2>
            </div>

            {detailOrders.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No orders yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Orders placed by this customer will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Order</th>
                      <th className="py-3 px-4 font-semibold">Items</th>
                      <th className="py-3 px-4 font-semibold">Payment</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Total</th>
                      <th className="py-3 px-4 font-semibold text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {detailOrders.map((ord) => (
                      <tr
                        key={ord.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => onSelectOrder(ord.id)}
                            className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            #{ord.orderNumber}
                          </button>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatDate(ord.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[240px]">
                          <div className="text-slate-800 dark:text-slate-200 line-clamp-2">
                            {ord.items
                              .map((i) => `${i.title.slice(0, 24)} (${i.model}) ×${i.quantity}`)
                              .join(', ')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="uppercase font-semibold text-slate-800 dark:text-slate-200">
                            {ord.paymentMethod}
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${
                              ord.paymentStatus === 'paid'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : ord.paymentStatus === 'failed'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {ord.paymentStatus}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${getFulfillmentBadgeClass(
                              ord.fulfillmentStatus
                            )}`}
                          >
                            {ord.fulfillmentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatTaka(ord.total)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectOrder(ord.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/25 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Order</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // CUSTOMER DIRECTORY LIST VIEW
  const stats = listData?.stats || {
    totalRegistered: 0,
    activeCount: 0,
    deactivatedCount: 0,
    guestCount: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    repeatBuyers: 0,
  };
  const customers = listData?.customers || [];
  const pagination = listData?.pagination || {
    page: 1,
    limit,
    totalItems: 0,
    totalPages: 1,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Customers Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View registered customers, search profiles, review order history, and manage account status
          </p>
        </div>
        <button
          type="button"
          onClick={loadCustomers}
          disabled={loadingList}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Registered Customers</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">
            {stats.totalRegistered}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            + {stats.guestCount} guest buyer{stats.guestCount === 1 ? '' : 's'} ({stats.totalCustomers} total)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Active Accounts</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1.5 tabular-nums">
            {stats.activeCount}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Eligible for checkout &amp; tracking
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Deactivated Accounts</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1.5 tabular-nums">
            {stats.deactivatedCount}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Restricted from placing new orders
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Customer Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">
            {formatTaka(stats.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {stats.repeatBuyers} repeat customer{stats.repeatBuyers === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Search Customer
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, or phone number..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Account Status
            </label>
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value as 'all' | 'active' | 'deactivated' | 'registered' | 'guest'
                  );
                  setPage(1);
                }}
                className="w-full pl-8 pr-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Customers</option>
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
                <option value="registered">Registered Only</option>
                <option value="guest">Guest Buyers</option>
              </select>
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Registered From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Registered To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as 'recent' | 'orders' | 'spent' | 'name');
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500"
            >
              <option value="recent">Newest Registered</option>
              <option value="orders">Most Orders</option>
              <option value="spent">Highest Spent</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              Showing {pagination.totalItems} matching customer{pagination.totalItems === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {listError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300">
          {listError}
        </div>
      )}

      {/* Customers Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loadingList && !listData ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {hasActiveFilters ? 'No customers match your filters' : 'No customers yet'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try clearing your search or status filter.'
                : 'Registered users and storefront shoppers appear here automatically.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">Delivery Address</th>
                  <th className="py-3 px-4 font-semibold">Joined</th>
                  <th className="py-3 px-4 font-semibold text-right">Orders</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Spent</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((customer) => {
                  const isDeactivated = customer.status === 'deactivated';
                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectCustomerId(customer.id)}
                          className="flex items-center gap-2.5 text-left group cursor-pointer"
                        >
                          {customer.photoUrl ? (
                            <img
                              src={customer.photoUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {(customer.displayName || customer.email || 'C')
                                .slice(0, 1)
                                .toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate max-w-[160px]">
                              {customer.displayName}
                            </div>
                            <span
                              className={`inline-block text-[10px] font-semibold ${
                                customer.isRegistered
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {customer.isRegistered ? 'Registered' : 'Guest'}
                            </span>
                          </div>
                        </button>
                      </td>

                      <td className="py-3 px-4 max-w-[190px]">
                        <div className="text-slate-700 dark:text-slate-200 truncate">
                          {customer.email || '—'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {customer.phone || 'No phone'}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-[200px]">
                        <div
                          className="text-slate-600 dark:text-slate-300 truncate"
                          title={customer.address}
                        >
                          {customer.address || '—'}
                        </div>
                        {customer.district && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {customer.district}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatDate(customer.createdAt)}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {customer.orderCount}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100">
                        {formatTaka(customer.totalSpent)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            isDeactivated
                              ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                              : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                          }`}
                        >
                          {isDeactivated ? 'Deactivated' : 'Active'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectCustomerId(customer.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/25 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {customer.isRegistered && (
                            <button
                              type="button"
                              disabled={togglingId === customer.id}
                              onClick={() =>
                                handleToggleAccountStatus(
                                  customer,
                                  isDeactivated ? 'active' : 'deactivated'
                                )
                              }
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                isDeactivated
                                  ? 'border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/15'
                                  : 'border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15'
                              }`}
                            >
                              {togglingId === customer.id
                                ? '...'
                                : isDeactivated
                                  ? 'Activate'
                                  : 'Deactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalItems > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of{' '}
                {pagination.totalItems}
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1 || loadingList}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-2 text-slate-600 dark:text-slate-300 tabular-nums">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loadingList}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
