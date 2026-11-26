import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Database,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import {
  fetchAdminCustomerOverviewFromFirestore,
  subscribeAdminCustomerOverviewFromFirestore,
  type AdminFirestoreCustomerOverviewStats,
} from '../services/userAccountService';

interface AdminCustomerOverviewSectionProps {
  onOpenCustomers: () => void;
  onConnectGoogleAdmin: () => Promise<void>;
}

function getFriendlyFirestoreError(err: Error): string {
  const raw = err.message || '';
  if (raw.includes('Missing or insufficient permissions') || raw.includes('permission-denied')) {
    return 'Firestore permissions are required to list registered customers. Ensure you are signed in with a verified admin Google account and that firestore.rules are published.';
  }
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // ignore parse fallback
    }
  }
  return raw || 'Unable to load customer overview from Firestore.';
}

export function AdminCustomerOverviewSection({
  onOpenCustomers,
  onConnectGoogleAdmin,
}: AdminCustomerOverviewSectionProps) {
  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const [stats, setStats] = useState<AdminFirestoreCustomerOverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const refreshManually = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const next = await fetchAdminCustomerOverviewFromFirestore();
      setStats(next);
    } catch (err) {
      setErrorMsg(getFriendlyFirestoreError(err instanceof Error ? err : new Error(String(err))));
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      setStats(null);
      setErrorMsg('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const unsubscribe = subscribeAdminCustomerOverviewFromFirestore(
      (nextStats) => {
        setStats(nextStats);
        setErrorMsg('');
        setLoading(false);
      },
      (err) => {
        setErrorMsg(getFriendlyFirestoreError(err));
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [firebaseUser, authLoading]);

  async function handleConnect() {
    setConnecting(true);
    setErrorMsg('');
    try {
      await onConnectGoogleAdmin();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Admin sign-in failed.');
    } finally {
      setConnecting(false);
    }
  }

  const totalRegistered = stats?.totalRegisteredUsers ?? 0;
  const activeCount = stats?.activeAccounts ?? 0;
  const deactivatedCount = stats?.deactivatedAccounts ?? 0;
  const newLast30Days = stats?.newRegistrationsLast30Days ?? 0;
  const activeRate = totalRegistered > 0 ? Math.round((activeCount / totalRegistered) * 100) : 0;

  return (
    <section
      aria-labelledby="admin-customer-overview-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="admin-customer-overview-heading"
              className="text-sm font-bold text-slate-900 dark:text-slate-100"
            >
              Customer Overview
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              <Database className="w-2.5 h-2.5" />
              <span>Firestore Live</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time customer metrics from Firestore <span className="font-mono">users</span> collection
            {stats?.lastSyncedAt
              ? ` · Updated ${new Date(stats.lastSyncedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {firebaseUser && (
            <button
              type="button"
              onClick={refreshManually}
              disabled={loading}
              title="Refresh Firestore customer metrics"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCustomers}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Manage Customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!authLoading && !firebaseUser ? (
        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-500/10 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Connect verified Admin Google account to view live Firestore customer metrics
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Firestore security rules restrict reading the <span className="font-mono">users</span> collection to verified admins.
            </p>
          </div>
          <button
            type="button"
            disabled={connecting}
            onClick={handleConnect}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
          >
            {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Connect Google Admin</span>
          </button>
        </div>
      ) : errorMsg ? (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5 text-rose-800 dark:text-rose-200 max-w-2xl">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={refreshManually}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold hover:bg-rose-100 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Registered Users */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Registered Users
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                {loading && !stats ? '—' : totalRegistered}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {deactivatedCount > 0
                  ? `${deactivatedCount} deactivated account${deactivatedCount === 1 ? '' : 's'}`
                  : 'All Firestore customer profiles'}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Active Accounts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Accounts
              </div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">
                {loading && !stats ? '—' : activeCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                {totalRegistered > 0
                  ? `${activeRate}% of registered accounts`
                  : 'Eligible to shop & place orders'}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: New Registrations (Last 30 Days) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                New Registrations (30 Days)
              </div>
              <div className="text-2xl font-bold text-sky-700 dark:text-sky-300 mt-1 tabular-nums">
                {loading && !stats ? '—' : newLast30Days}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Joined in the last 30 days
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
