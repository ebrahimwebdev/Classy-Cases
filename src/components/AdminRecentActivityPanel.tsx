import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Database,
  Loader2,
  PanelRightOpen,
  ShieldAlert,
  ShoppingBag,
  UserPlus,
  X,
} from 'lucide-react';
import { formatFirebaseAuthError } from '../context/FirebaseAuthContext';
import type { AdminCustomerActivityEvent } from '../services/adminActivityService';

type ActivityFilter = 'all' | 'registration' | 'order';

function formatRelativeTime(timestampMs: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return 'Recently';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  try {
    return new Date(timestampMs).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export function getFriendlyActivityError(rawMessage: string): string {
  if (
    rawMessage.includes('Missing or insufficient permissions') ||
    rawMessage.includes('permission-denied')
  ) {
    return 'Firestore permissions are required to stream customer registrations and live orders. Sign in with a verified admin Google account and ensure firestore.rules are published.';
  }
  if (rawMessage.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawMessage) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // fallback to raw message
    }
  }
  return rawMessage || 'Unable to stream live customer activity from Firestore.';
}

interface ActivityFeedListProps {
  events: AdminCustomerActivityEvent[];
  unreadIds: Set<string>;
  filter: ActivityFilter;
  maxItems?: number;
  loading: boolean;
  onSelectEvent: (event: AdminCustomerActivityEvent) => void;
}

function ActivityFeedList({
  events,
  unreadIds,
  filter,
  maxItems,
  loading,
  onSelectEvent,
}: ActivityFeedListProps) {
  const filtered = events.filter((ev) => (filter === 'all' ? true : ev.type === filter));
  const visible = typeof maxItems === 'number' ? filtered.slice(0, maxItems) : filtered;

  if (loading && visible.length === 0) {
    return (
      <div className="py-10 flex flex-col items-center justify-center text-center gap-2 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
        <p className="text-xs font-medium">Connecting to live customer activity…</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="py-10 text-center space-y-1.5">
        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
          <Clock className="w-4 h-4" />
        </div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {filter === 'registration'
            ? 'No recent customer registrations'
            : filter === 'order'
              ? 'No recent orders yet'
              : 'No customer activity yet'}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          New registrations and placed orders will appear here live.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
      {visible.map((ev) => {
        const isUnread = unreadIds.has(ev.id);
        const isRegistration = ev.type === 'registration';
        const clickable = Boolean(
          (isRegistration && ev.customerId) || (!isRegistration && ev.orderId)
        );

        return (
          <button
            key={ev.id}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onSelectEvent(ev)}
            className={`w-full text-left px-3 py-2.5 transition-colors flex items-start justify-between gap-3 rounded-lg ${
              isUnread
                ? 'bg-indigo-50/70 dark:bg-indigo-500/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/15'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
            } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isRegistration
                    ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300'
                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                }`}
              >
                {isRegistration ? (
                  <UserPlus className="w-4 h-4" />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isUnread && (
                    <span
                      aria-label="Unread notification"
                      className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0"
                    />
                  )}
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {ev.title}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      isRegistration
                        ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300'
                        : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {isRegistration ? 'Registered' : 'Order'}
                  </span>
                  {isUnread && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wide">
                      Live
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                  {ev.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
                {formatRelativeTime(ev.timestampMs)}
              </span>
              {clickable && (
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface AdminRecentActivityPanelProps {
  events: AdminCustomerActivityEvent[];
  unreadIds: Set<string>;
  firebaseConnected: boolean;
  authLoading: boolean;
  loading: boolean;
  errorMessage: string;
  lastSyncedAt: string | null;
  onSelectEvent: (event: AdminCustomerActivityEvent) => void;
  onMarkAllRead: () => void;
  onOpenSidebar: () => void;
  onConnectGoogleAdmin: () => Promise<void>;
}

export function AdminRecentActivityPanel({
  events,
  unreadIds,
  firebaseConnected,
  authLoading,
  loading,
  errorMessage,
  lastSyncedAt,
  onSelectEvent,
  onMarkAllRead,
  onOpenSidebar,
  onConnectGoogleAdmin,
}: AdminRecentActivityPanelProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);

  const registrationCount = events.filter((e) => e.type === 'registration').length;
  const orderCount = events.filter((e) => e.type === 'order').length;
  const unreadCount = unreadIds.size;

  async function handleConnect() {
    setConnecting(true);
    setConnectError('');
    try {
      await onConnectGoogleAdmin();
    } catch (err) {
      setConnectError(formatFirebaseAuthError(err));
    } finally {
      setConnecting(false);
    }
  }

  function handleCopyDomain() {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(window.location.hostname).then(() => {
      setCopiedDomain(true);
      window.setTimeout(() => setCopiedDomain(false), 2000);
    });
  }

  return (
    <section
      aria-labelledby="admin-recent-activity-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              id="admin-recent-activity-heading"
              className="text-sm font-bold text-slate-900 dark:text-slate-100"
            >
              Recent Customer Activity
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                firebaseConnected && !errorMessage
                  ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  firebaseConnected && !errorMessage
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              <Database className="w-2.5 h-2.5" />
              <span>{firebaseConnected && !errorMessage ? 'Live Stream' : 'Storefront Feed'}</span>
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold tabular-nums">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Live feed of customer sign-ups and new orders
            {lastSyncedAt
              ? ` · Synced ${new Date(lastSyncedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-0.5 text-[11px]">
            {(
              [
                { id: 'all', label: `All (${events.length})` },
                { id: 'registration', label: `Registrations (${registrationCount})` },
                { id: 'order', label: `Orders (${orderCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Mark read</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSidebar}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PanelRightOpen className="w-3.5 h-3.5" />
            <span>Activity Sidebar</span>
          </button>
        </div>
      </div>

      {!authLoading && !firebaseConnected && (
        <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-500/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5 max-w-2xl">
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Connect Google Admin
              </span>{' '}
              to stream real-time Firestore user registrations and live customer orders.
            </div>
            {connectError && (
              <div className="space-y-1.5">
                <p className="text-rose-600 dark:text-rose-400 font-medium">{connectError}</p>
                {connectError.includes('Authorized domains') && typeof window !== 'undefined' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300">
                      {window.location.hostname}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-slate-50 cursor-pointer"
                    >
                      {copiedDomain ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy domain</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={connecting}
            onClick={handleConnect}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
          >
            {connecting && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>Connect Google Admin</span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-rose-800 dark:text-rose-200 max-w-2xl">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span className="text-[11px]">{getFriendlyActivityError(errorMessage)}</span>
          </div>
          <button
            type="button"
            disabled={connecting}
            onClick={handleConnect}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-semibold hover:bg-rose-100 cursor-pointer shrink-0"
          >
            {connecting ? 'Connecting…' : 'Switch Google Admin'}
          </button>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto pr-1">
        <ActivityFeedList
          events={events}
          unreadIds={unreadIds}
          filter={filter}
          maxItems={8}
          loading={loading}
          onSelectEvent={onSelectEvent}
        />
      </div>
    </section>
  );
}

interface AdminRecentActivityDrawerProps {
  open: boolean;
  events: AdminCustomerActivityEvent[];
  unreadIds: Set<string>;
  firebaseConnected: boolean;
  authLoading: boolean;
  loading: boolean;
  errorMessage: string;
  lastSyncedAt: string | null;
  onClose: () => void;
  onSelectEvent: (event: AdminCustomerActivityEvent) => void;
  onMarkAllRead: () => void;
  onConnectGoogleAdmin: () => Promise<void>;
}

export function AdminRecentActivityDrawer({
  open,
  events,
  unreadIds,
  firebaseConnected,
  authLoading,
  loading,
  errorMessage,
  lastSyncedAt,
  onClose,
  onSelectEvent,
  onMarkAllRead,
  onConnectGoogleAdmin,
}: AdminRecentActivityDrawerProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const registrationCount = events.filter((e) => e.type === 'registration').length;
  const orderCount = events.filter((e) => e.type === 'order').length;
  const unreadCount = unreadIds.size;

  async function handleConnect() {
    setConnecting(true);
    setConnectError('');
    try {
      await onConnectGoogleAdmin();
    } catch (err) {
      setConnectError(formatFirebaseAuthError(err));
    } finally {
      setConnecting(false);
    }
  }

  function handleCopyDomain() {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(window.location.hostname).then(() => {
      setCopiedDomain(true);
      window.setTimeout(() => setCopiedDomain(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Recent Customer Activity Sidebar">
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="relative w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Customer Activity
              </h2>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold tabular-nums">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  firebaseConnected && !errorMessage
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              <span>
                {firebaseConnected && !errorMessage
                  ? 'Live Firestore notifications active'
                  : 'Storefront order activity'}
              </span>
              {lastSyncedAt && (
                <span>
                  ·{' '}
                  {new Date(lastSyncedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity sidebar"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 text-[11px]">
            {(
              [
                { id: 'all', label: `All (${events.length})` },
                { id: 'registration', label: `Sign-ups (${registrationCount})` },
                { id: 'order', label: `Orders (${orderCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {!authLoading && !firebaseConnected && (
            <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-500/10 space-y-2">
              <p className="text-[11px] text-slate-700 dark:text-slate-300">
                Sign in with your verified Google Admin account to receive real-time Firestore notifications for customer registrations and orders.
              </p>
              {connectError && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    {connectError}
                  </p>
                  {connectError.includes('Authorized domains') && typeof window !== 'undefined' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 break-all">
                        {window.location.hostname}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyDomain}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-slate-50 cursor-pointer shrink-0"
                      >
                        {copiedDomain ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy domain</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                disabled={connecting}
                onClick={handleConnect}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {connecting && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Connect Google Admin</span>
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 space-y-2 text-[11px] text-rose-800 dark:text-rose-200">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{getFriendlyActivityError(errorMessage)}</span>
              </div>
              <button
                type="button"
                disabled={connecting}
                onClick={handleConnect}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30 font-semibold text-rose-700 dark:text-rose-300 cursor-pointer"
              >
                {connecting ? 'Connecting…' : 'Switch Google Admin'}
              </button>
            </div>
          )}

          <ActivityFeedList
            events={events}
            unreadIds={unreadIds}
            filter={filter}
            loading={loading}
            onSelectEvent={(ev) => {
              onSelectEvent(ev);
              onClose();
            }}
          />
        </div>
      </aside>
    </div>
  );
}

interface AdminLiveActivityToastStackProps {
  toasts: AdminCustomerActivityEvent[];
  onDismiss: (id: string) => void;
  onInspect: (event: AdminCustomerActivityEvent) => void;
}

export function AdminLiveActivityToastStack({
  toasts,
  onDismiss,
  onInspect,
}: AdminLiveActivityToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isRegistration = toast.type === 'registration';
        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/40 shadow-xl rounded-xl p-3.5 flex items-start gap-3"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isRegistration
                  ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300'
                  : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
              }`}
            >
              {isRegistration ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {isRegistration ? 'New Customer Registered' : 'New Order Placed'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {toast.title}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {toast.subtitle}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onInspect(toast);
                    onDismiss(toast.id);
                  }}
                  className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold cursor-pointer"
                >
                  {isRegistration ? 'View Customer' : 'View Order'}
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(toast.id)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss live notification"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
