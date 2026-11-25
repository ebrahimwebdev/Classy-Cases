import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  History,
  LayoutGrid,
  Plus,
  Receipt,
  Trash2,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { formatTaka } from '../models/phoneCase';
import type { Category, Expense, Order, Product } from '../types';

export type AccountingReportSection =
  | 'Transactions'
  | 'Expenses'
  | 'Payroll'
  | 'Accounts'
  | 'Categories'
  | 'Courier payments'
  | 'Activity log'
  | 'Profit & Sales'
  | 'More Reports';

interface AdminAccountingReportsViewProps {
  section: AccountingReportSection;
  orders: Order[];
  products: Product[];
  categories: Category[];
  expenses: Expense[];
  onAddExpense: (payload: {
    title: string;
    category: string;
    amount: number;
    date: string;
    note?: string;
  }) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onOpenOrder?: (order: Order) => void;
}

const EXPENSE_CATEGORIES = [
  'Packaging & Boxes',
  'Courier & Delivery',
  'Marketing & Ads',
  'Inventory Restock',
  'Staff & Payroll',
  'Rent & Utilities',
  'Operations',
];

export function AdminAccountingReportsView({
  section,
  orders,
  products,
  categories,
  expenses,
  onAddExpense,
  onDeleteExpense,
  onOpenOrder,
}: AdminAccountingReportsViewProps) {
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expNote, setExpNote] = useState('');
  const [submittingExp, setSubmittingExp] = useState(false);

  const validOrders = useMemo(
    () => orders.filter((o) => o.fulfillmentStatus !== 'cancelled'),
    [orders]
  );

  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.id, p.costPrice ?? 0));
    return map;
  }, [products]);

  const financialStats = useMemo(() => {
    const grossSales = validOrders.reduce((s, o) => s + o.total, 0);
    const shippingCollected = validOrders.reduce((s, o) => s + o.shippingFee, 0);
    const discountsGiven = validOrders.reduce((s, o) => s + o.discountAmount, 0);
    const cogs = validOrders.reduce(
      (s, o) =>
        s +
        o.items.reduce(
          (itemSum, item) =>
            itemSum + (productCostMap.get(item.productId) ?? 0) * item.quantity,
          0
        ),
      0
    );
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = grossSales - shippingCollected - cogs - totalExpenses;
    const netMarginPct = grossSales > 0 ? Math.round((netProfit / grossSales) * 100) : 0;

    return {
      grossSales,
      shippingCollected,
      discountsGiven,
      cogs,
      totalExpenses,
      netProfit,
      netMarginPct,
    };
  }, [validOrders, productCostMap, expenses]);

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(expAmount);
    if (expTitle.trim().length < 2 || !Number.isFinite(amt) || amt <= 0) return;
    setSubmittingExp(true);
    try {
      await onAddExpense({
        title: expTitle.trim(),
        category: expCategory,
        amount: amt,
        date: expDate,
        note: expNote.trim(),
      });
      setExpTitle('');
      setExpAmount('');
      setExpNote('');
    } finally {
      setSubmittingExp(false);
    }
  }

  function exportSalesCsv() {
    const header = 'OrderNumber,Date,Customer,Method,PaymentStatus,Fulfillment,Subtotal,Shipping,Discount,Total\n';
    const rows = orders
      .map((o) =>
        [
          o.orderNumber,
          o.createdAt,
          `"${o.customerName.replace(/"/g, '""')}"`,
          o.paymentMethod.toUpperCase(),
          o.paymentStatus,
          o.fulfillmentStatus,
          o.subtotal,
          o.shippingFee,
          o.discountAmount,
          o.total,
        ].join(',')
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classy-cases-sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 1. TRANSACTIONS
  if (section === 'Transactions') {
    const paidTotal = validOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.total, 0);
    const pendingTotal = validOrders
      .filter((o) => o.paymentStatus === 'pending')
      .reduce((s, o) => s + o.total, 0);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Transactions</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Payment ledger across bKash, Nagad, SSLCommerz Card, and Cash on Delivery
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">
              Settled: {formatTaka(paidTotal)}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold tabular-nums">
              Pending: {formatTaka(pendingTotal)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {orders.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <ArrowLeftRight className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No payment transactions yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Online wallet, card, and COD transactions appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Transaction ID</th>
                    <th className="py-3 px-4 font-semibold">Order</th>
                    <th className="py-3 px-4 font-semibold">Gateway</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {ord.transactionId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          #{ord.orderNumber} · {ord.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(ord.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-slate-700 dark:text-slate-300">
                        {ord.paymentMethod}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            ord.paymentStatus === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatTaka(ord.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. EXPENSES
  if (section === 'Expenses') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Expenses</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track packaging, marketing, courier fees, and store overhead
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
            Total Recorded: <span className="text-rose-600 dark:text-rose-400">{formatTaka(financialStats.totalExpenses)}</span>
          </div>
        </div>

        <form
          onSubmit={handleExpenseSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end text-xs"
        >
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              required
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              placeholder="e.g. Facebook Boost Campaign"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800"
            />
          </div>
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Amount (৳) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              placeholder="500"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 tabular-nums"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800"
            />
          </div>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={submittingExp}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{submittingExp ? 'Adding...' : 'Add Expense'}</span>
            </button>
          </div>
        </form>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {expenses.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <Receipt className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No expenses logged yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add operating expenses above to include them in your Profit &amp; Sales report.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Title</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 tabular-nums">{exp.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{exp.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {formatTaka(exp.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20"
                          aria-label={`Delete ${exp.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    );
  }

  // 3. ACCOUNTS
  if (section === 'Accounts') {
    const methods = [
      { id: 'bkash', label: 'bKash Merchant Account', sub: 'Mobile Wallet Gateway' },
      { id: 'nagad', label: 'Nagad Merchant Account', sub: 'Mobile Wallet Gateway' },
      { id: 'card', label: 'SSLCommerz Bank Settlement', sub: 'Visa / Mastercard / NetBanking' },
      { id: 'cod', label: 'Cash on Delivery & POS Drawer', sub: 'Courier COD + Counter Cash' },
    ] as const;

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Accounts</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Balances and collections grouped by payment settlement account
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {methods.map((m) => {
            const matching = validOrders.filter((o) => o.paymentMethod === m.id);
            const total = matching.reduce((s, o) => s + o.total, 0);
            const paid = matching
              .filter((o) => o.paymentStatus === 'paid')
              .reduce((s, o) => s + o.total, 0);
            return (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{m.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{m.sub}</div>
                  <div className="text-xl font-bold text-slate-950 dark:text-slate-50 mt-3 tabular-nums">
                    {formatTaka(paid)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                    {matching.length} orders · Total booked {formatTaka(total)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. COURIER PAYMENTS
  if (section === 'Courier payments') {
    const codOrders = validOrders.filter((o) => o.paymentMethod === 'cod');
    const courierOrders = validOrders.filter((o) => o.paymentMethod === 'cod' || Boolean(o.courier));
    const codPending = codOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((s, o) => s + o.total, 0);
    const codCollected = codOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.total, 0);

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Courier payments</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track Cash on Delivery receivables, courier consignment tracking codes, and delivery charges
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Pending COD with Courier</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
              {formatTaka(codPending)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Settled COD Collections</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {formatTaka(codCollected)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Shipping Fees Billed</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {formatTaka(financialStats.shippingCollected)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {courierOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              <Truck className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              No Cash on Delivery or courier-booked orders tracked yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Order</th>
                    <th className="py-3 px-4 font-semibold">Customer &amp; Zone</th>
                    <th className="py-3 px-4 font-semibold">Courier &amp; Tracking</th>
                    <th className="py-3 px-4 font-semibold text-right">Shipping</th>
                    <th className="py-3 px-4 font-semibold text-right">COD Due</th>
                    <th className="py-3 px-4 font-semibold">Settlement</th>
                    {onOpenOrder && <th className="py-3 px-4 font-semibold text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {courierOrders.map((ord) => {
                    const codDue =
                      ord.courier?.codAmount ??
                      (ord.paymentStatus === 'paid' ? 0 : ord.total);
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            #{ord.orderNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                            {ord.fulfillmentStatus}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {ord.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ord.customerPhone} ·{' '}
                            {ord.deliveryArea === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {ord.courier ? (
                            <div>
                              <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {ord.courier.provider}
                              </div>
                              <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                {ord.courier.trackingCode}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Not booked yet</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatTaka(ord.shippingFee)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatTaka(codDue)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              ord.paymentStatus === 'paid'
                                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {ord.paymentStatus === 'paid' ? 'Settled' : 'Pending COD'}
                          </span>
                        </td>
                        {onOpenOrder && (
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => onOpenOrder(ord)}
                              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/15"
                            >
                              View
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 5. PAYROLL / CATEGORIES / ACTIVITY LOG
  if (section === 'Payroll') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Payroll</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Staff compensation &amp; salary payouts recorded in store expenses
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Store Owner &amp; Operations Team</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Log monthly staff salaries under Expenses → &quot;Staff &amp; Payroll&quot; to include in Profit &amp; Sales.
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            Payroll Expenses Logged:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {formatTaka(
                expenses
                  .filter((e) => e.category === 'Staff & Payroll')
                  .reduce((s, e) => s + e.amount, 0)
              )}
            </strong>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'Categories') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Accounting Categories</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Income &amp; expense classification buckets
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
              <LayoutGrid className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Income Categories (Product Lines)</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {categories.map((cat) => (
                <div key={cat.id} className="py-2 flex justify-between">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{cat.name} Cases</span>
                  <span className="text-slate-500 dark:text-slate-400">Sales Revenue</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
              <Receipt className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Expense Categories</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {EXPENSE_CATEGORIES.map((cat) => {
                const sum = expenses
                  .filter((e) => e.category === cat)
                  .reduce((s, e) => s + e.amount, 0);
                return (
                  <div key={cat} className="py-2 flex justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{cat}</span>
                    <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      {formatTaka(sum)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'Activity log') {
    const events = [
      ...orders.slice(0, 10).map((o) => ({
        id: `ord-${o.id}`,
        time: o.createdAt,
        title: `Order #${o.orderNumber} placed by ${o.customerName}`,
        detail: `${o.paymentMethod.toUpperCase()} · ${formatTaka(o.total)}`,
      })),
      ...expenses.slice(0, 10).map((e) => ({
        id: `exp-${e.id}`,
        time: e.createdAt,
        title: `Expense recorded: ${e.title}`,
        detail: `${e.category} · ${formatTaka(e.amount)}`,
      })),
    ].sort((a, b) => b.time.localeCompare(a.time));

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Activity log</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Chronological audit stream of store orders and financial entries
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {events.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <History className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No activity recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((ev) => (
                <div key={ev.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{ev.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{ev.detail}</div>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {new Date(ev.time).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 6. PROFIT & SALES REPORT
  if (section === 'Profit & Sales') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Profit &amp; Sales</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gross sales, cost of goods sold (COGS), operating expenses, and net profit
            </p>
          </div>
          <button
            type="button"
            onClick={exportSalesCsv}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Gross Sales</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {formatTaka(financialStats.grossSales)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Cost of Goods (COGS)</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {formatTaka(financialStats.cogs)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Operating Expenses</div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
              {formatTaka(financialStats.totalExpenses)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Net Profit ({financialStats.netMarginPct}%)
            </div>
            <div
              className={`text-xl font-bold mt-1 tabular-nums ${
                financialStats.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatTaka(financialStats.netProfit)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Financial Breakdown</span>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Product Sales (incl. shipping)</dt>
              <dd className="font-semibold tabular-nums">{formatTaka(financialStats.grossSales)}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Discounts / Coupons Redeemed</dt>
              <dd className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                -{formatTaka(financialStats.discountsGiven)}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Courier Shipping Pass-Through</dt>
              <dd className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                -{formatTaka(financialStats.shippingCollected)}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Product Cost of Goods</dt>
              <dd className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                -{formatTaka(financialStats.cogs)}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Recorded Expenses</dt>
              <dd className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                -{formatTaka(financialStats.totalExpenses)}
              </dd>
            </div>
            <div className="pt-3 flex justify-between text-sm font-bold text-slate-950 dark:text-slate-50">
              <dt>Estimated Net Profit</dt>
              <dd className="tabular-nums">{formatTaka(financialStats.netProfit)}</dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  // 7. MORE REPORTS
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">More Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Channel performance, payment method analytics, and CSV exports
          </p>
        </div>
        <button
          type="button"
          onClick={exportSalesCsv}
          className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Download Orders CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Sales by Payment Method</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {(['bkash', 'nagad', 'card', 'cod'] as const).map((method) => {
              const list = validOrders.filter((o) => o.paymentMethod === method);
              const total = list.reduce((s, o) => s + o.total, 0);
              return (
                <div key={method} className="py-2.5 flex justify-between">
                  <span className="uppercase font-semibold text-slate-800 dark:text-slate-200">{method}</span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-400">
                    {list.length} orders · <strong className="text-slate-900 dark:text-slate-100">{formatTaka(total)}</strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <LayoutGrid className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Catalog Inventory by Brand</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {categories.map((cat) => {
              const catProducts = products.filter(
                (p) => p.category.toLowerCase() === cat.name.toLowerCase()
              );
              const units = catProducts.reduce((s, p) => s + Math.max(0, p.stock), 0);
              return (
                <div key={cat.id} className="py-2.5 flex justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-400">
                    {catProducts.length} products · <strong className="text-slate-900 dark:text-slate-100">{units} units</strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
