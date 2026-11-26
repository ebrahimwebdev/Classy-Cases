import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  CreditCard,
  Edit3,
  Loader2,
  MapPin,
  Package,
  Phone,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Truck,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { formatTaka } from '../models/phoneCase';
import type {
  FulfillmentStatus,
  Order,
  OrderCourierInfo,
  PaymentStatus,
  Product,
  StoreSettings,
} from '../types';

interface AdminOrderDetailModalProps {
  order: Order;
  allOrders: Order[];
  products: Product[];
  settings: StoreSettings | null;
  adminToken: string;
  onClose: () => void;
  onOrderUpdated: (updated: Order) => void;
  onViewCustomer?: (customerId: string) => void;
}

const COURIER_PROVIDERS: OrderCourierInfo['provider'][] = [
  'Steadfast',
  'Pathao',
  'RedX',
  'Manual',
];

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-11);
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

export function AdminOrderDetailModal({
  order,
  allOrders,
  products,
  settings,
  adminToken,
  onClose,
  onOrderUpdated,
  onViewCustomer,
}: AdminOrderDetailModalProps) {
  const phoneDigits = order.customerPhone.replace(/\D/g, '') || order.customerPhone.trim();
  const resolvedCustomerId = order.firebaseUid || (phoneDigits ? `guest-${phoneDigits}` : `guest-${order.id}`);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSlipPreview, setShowSlipPreview] = useState(false);

  // Editable customer & delivery info
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState(order.customerName);
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone);
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress);
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>(
    order.deliveryArea
  );
  const [adminNote, setAdminNote] = useState(order.adminNote || '');

  // Cancel confirmation inline toggle
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [restoreStockOnCancel, setRestoreStockOnCancel] = useState(true);

  // Courier booking form
  const defaultWeight = useMemo(() => {
    let total = 0;
    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.productId);
      const w = prod?.weightKg && prod.weightKg > 0 ? prod.weightKg : 0.15;
      total += w * item.quantity;
    }
    return Math.max(0.1, Number(total.toFixed(2)));
  }, [order.items, products]);

  const configuredProvider: OrderCourierInfo['provider'] =
    settings?.deliverySettings?.courierProvider &&
    settings.deliverySettings.courierProvider !== 'None'
      ? settings.deliverySettings.courierProvider
      : 'Steadfast';

  const hasSteadfastApi = Boolean(
    settings?.deliverySettings?.courierApiKey?.trim() &&
      settings?.deliverySettings?.courierSecretKey?.trim()
  );

  const [editingCourier, setEditingCourier] = useState(!order.courier);
  const [provider, setProvider] = useState<OrderCourierInfo['provider']>(
    order.courier?.provider || configuredProvider
  );
  const [parcelWeightKg, setParcelWeightKg] = useState<string>(
    String(order.courier?.parcelWeightKg || defaultWeight)
  );
  const [codAmount, setCodAmount] = useState<string>(
    String(
      order.courier?.codAmount ??
        (order.paymentStatus === 'paid' ? 0 : order.total)
    )
  );
  const [courierNote, setCourierNote] = useState<string>(
    order.courier?.note || order.adminNote || ''
  );
  const [trackingCode, setTrackingCode] = useState<string>(
    order.courier?.trackingCode || ''
  );
  const [consignmentId, setConsignmentId] = useState<string>(
    order.courier?.consignmentId || ''
  );
  const [forceManualMode, setForceManualMode] = useState<boolean>(
    order.courier?.mode === 'manual' || !hasSteadfastApi
  );

  useEffect(() => {
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone);
    setDeliveryAddress(order.deliveryAddress);
    setDeliveryArea(order.deliveryArea);
    setAdminNote(order.adminNote || '');
    if (order.courier) {
      setProvider(order.courier.provider);
      setParcelWeightKg(String(order.courier.parcelWeightKg));
      setCodAmount(String(order.courier.codAmount));
      setCourierNote(order.courier.note || '');
      setTrackingCode(order.courier.trackingCode);
      setConsignmentId(order.courier.consignmentId);
    } else {
      setCodAmount(String(order.paymentStatus === 'paid' ? 0 : order.total));
    }
  }, [order]);

  // Customer order history / fraud risk summary
  const customerHistory = useMemo(() => {
    const target = normalizePhone(order.customerPhone);
    const matching = allOrders.filter(
      (o) => normalizePhone(o.customerPhone) === target
    );
    const totalCount = matching.length;
    const deliveredCount = matching.filter(
      (o) => o.fulfillmentStatus === 'delivered'
    ).length;
    const cancelledCount = matching.filter(
      (o) => o.fulfillmentStatus === 'cancelled'
    ).length;
    const cancelRate =
      totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0;
    const threshold = settings?.deliverySettings?.fraudThresholdPercent ?? 40;
    const isHighRisk =
      Boolean(settings?.deliverySettings?.fraudCheckEnabled) &&
      totalCount >= 2 &&
      cancelRate >= threshold;

    return {
      totalCount,
      deliveredCount,
      cancelledCount,
      cancelRate,
      isHighRisk,
    };
  }, [allOrders, order.customerPhone, settings]);

  function showFlash(msg: string) {
    setSuccessMsg(msg);
    setErrorMsg('');
    window.setTimeout(() => {
      setSuccessMsg((prev) => (prev === msg ? '' : prev));
    }, 3500);
  }

  function copyText(key: string, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  }

  function handleCopyCourierSummary() {
    const itemsText = order.items
      .map((i) => `${i.title} (${i.model}) x${i.quantity}`)
      .join(', ');
    const summary = [
      `Order: #${order.orderNumber}`,
      `Name: ${order.customerName}`,
      `Phone: ${order.customerPhone}`,
      `Address: ${order.deliveryAddress}`,
      `Zone: ${order.deliveryArea === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}`,
      `Items: ${itemsText}`,
      `COD: ${order.paymentStatus === 'paid' ? '0 BDT (PAID)' : `${order.total} BDT`}`,
      order.courier?.trackingCode
        ? `Courier: ${order.courier.provider} (${order.courier.trackingCode})`
        : null,
      order.adminNote ? `Note: ${order.adminNote}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    copyText('summary', summary);
  }

  async function patchOrder(
    payload: Record<string, unknown>,
    actionId: string,
    flashText: string
  ) {
    setBusyAction(actionId);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update order.');
        return null;
      }
      if (data.order) {
        onOrderUpdated(data.order);
      }
      showFlash(flashText);
      return data.order as Order;
    } catch {
      setErrorMsg('Network error updating order.');
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveCustomerDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setErrorMsg('Name, phone, and address cannot be empty.');
      return;
    }
    const updated = await patchOrder(
      {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryArea,
        adminNote: adminNote.trim(),
      },
      'save-customer',
      'Customer & delivery details saved.'
    );
    if (updated) {
      setEditingCustomer(false);
    }
  }

  async function handleBookCourier(markShipped: boolean) {
    setBusyAction(markShipped ? 'book-ship' : 'book');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/courier-book`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          provider,
          parcelWeightKg: Number(parcelWeightKg) || defaultWeight,
          codAmount: Math.max(0, Number(codAmount) || 0),
          note: courierNote.trim(),
          trackingCode: trackingCode.trim() || undefined,
          consignmentId: consignmentId.trim() || undefined,
          markShipped,
          mode: forceManualMode ? 'manual' : 'api',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Courier booking failed.');
        return;
      }
      if (data.order) {
        onOrderUpdated(data.order);
        setEditingCourier(false);
      }
      showFlash(
        markShipped
          ? `Courier booked & order marked Shipped (${data.order?.courier?.trackingCode || ''})`
          : `Courier booked (${data.order?.courier?.trackingCode || ''})`
      );
    } catch {
      setErrorMsg('Network error booking courier.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpdateCourierTracking(e: React.FormEvent) {
    e.preventDefault();
    const updated = await patchOrder(
      {
        courier: {
          provider,
          consignmentId: consignmentId.trim(),
          trackingCode: trackingCode.trim(),
          parcelWeightKg: Number(parcelWeightKg) || defaultWeight,
          codAmount: Math.max(0, Number(codAmount) || 0),
          note: courierNote.trim(),
          status: order.courier?.status || 'booked',
        },
      },
      'save-courier',
      'Courier tracking details updated.'
    );
    if (updated) {
      setEditingCourier(false);
    }
  }

  const quickNotes = settings?.orderSettings?.quickNotes || [
    'Call before delivery',
    'Handle with care — fragile case',
    'Leave at reception if unavailable',
  ];

  // 5-stage progress computation
  const stageIdx =
    order.fulfillmentStatus === 'cancelled'
      ? -1
      : order.fulfillmentStatus === 'delivered'
        ? 4
        : order.fulfillmentStatus === 'shipped'
          ? 3
          : order.courier
            ? 2
            : order.fulfillmentStatus === 'confirmed'
              ? 1
              : 0;

  const progressSteps = [
    { label: 'Order Placed', time: formatDateTime(order.createdAt) },
    { label: 'Confirmed', time: formatDateTime(order.confirmedAt) },
    {
      label: 'Courier Booked',
      time: order.courier ? `${order.courier.provider} · ${formatDateTime(order.courier.bookedAt)}` : 'Pending',
    },
    { label: 'Shipped', time: formatDateTime(order.shippedAt) },
    { label: 'Delivered', time: formatDateTime(order.deliveredAt) },
  ];

  const statusPillClass = (status: FulfillmentStatus) => {
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
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-2 sm:p-4 print:bg-white print:p-0 print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 print:max-h-none print:overflow-visible print:border-0 print:shadow-none print:rounded-none">
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
              Order #{order.orderNumber}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-md border text-[11px] font-semibold capitalize ${statusPillClass(
                order.fulfillmentStatus
              )}`}
            >
              {order.fulfillmentStatus}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md border text-[11px] font-semibold uppercase ${
                order.paymentStatus === 'paid'
                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                  : order.paymentStatus === 'failed'
                    ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                    : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
              }`}
            >
              {order.paymentMethod} · {order.paymentStatus}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
              {order.source} · {formatDateTime(order.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCourierSummary}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
            >
              {copiedKey === 'summary' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ClipboardCopy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'summary' ? 'Copied' : 'Copy Courier Info'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSlipPreview((v) => !v)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${
                showSlipPreview
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{showSlipPreview ? 'Back to Order View' : 'Packing Slip / Invoice'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close order details"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE PACKING SLIP / COURIER LABEL VIEW */}
        {showSlipPreview ? (
          <div className="p-6 space-y-5 bg-white text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <div className="text-xs text-slate-600">
                Print-ready Courier Label &amp; Packing Slip for Order #{order.orderNumber}
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
            </div>

            <div className="max-w-xl mx-auto border-2 border-slate-900 rounded-xl p-5 space-y-4 text-xs">
              <div className="flex items-start justify-between border-b border-slate-300 pb-3">
                <div>
                  <div className="text-base font-black tracking-tight">
                    {settings?.storeName || 'Classy Cases'}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {settings?.phone || ''} {settings?.address ? `· ${settings.address}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm">#{order.orderNumber}</div>
                  <div className="text-[11px] text-slate-600">
                    {new Date(order.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>

              {order.courier && (
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-300 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                      Courier Partner
                    </span>
                    <strong className="text-sm">{order.courier.provider}</strong>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                      Tracking / Consignment
                    </span>
                    <strong className="text-sm">{order.courier.trackingCode}</strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 border-b border-slate-300 pb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Deliver To
                  </div>
                  <div className="font-bold text-sm mt-0.5">{order.customerName}</div>
                  <div className="font-mono font-semibold mt-0.5">{order.customerPhone}</div>
                  <div className="text-slate-700 mt-1 leading-relaxed">{order.deliveryAddress}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    COD / Payment
                  </div>
                  <div className="text-lg font-black tabular-nums">
                    {order.paymentStatus === 'paid'
                      ? 'PAID (৳0 COD)'
                      : `COD: ${formatTaka(order.courier?.codAmount ?? order.total)}`}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Zone: {order.deliveryArea === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Weight: {order.courier?.parcelWeightKg || defaultWeight} kg
                  </div>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] uppercase text-slate-500">
                    <th className="py-1.5">Item &amp; Phone Model</th>
                    <th className="py-1.5 text-center">Qty</th>
                    <th className="py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.items.map((item, idx) => (
                    <tr key={`${item.productId}-${idx}`}>
                      <td className="py-1.5 pr-2">
                        <div className="font-semibold">{item.title}</div>
                        <div className="text-[11px] text-slate-600">Model: {item.model}</div>
                      </td>
                      <td className="py-1.5 text-center font-bold tabular-nums">{item.quantity}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">
                        {formatTaka(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-300 pt-2 flex justify-between text-[11px] text-slate-600">
                <span>
                  Subtotal: {formatTaka(order.subtotal)} · Delivery: {formatTaka(order.shippingFee)}
                  {order.discountAmount > 0 ? ` · Discount: -${formatTaka(order.discountAmount)}` : ''}
                </span>
                <strong className="text-slate-900">Total: {formatTaka(order.total)}</strong>
              </div>

              {(order.courier?.note || order.adminNote) && (
                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]">
                  <strong>Delivery Note:</strong> {order.courier?.note || order.adminNote}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5 print:hidden">
            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 5-Stage Fulfillment Progress Stepper */}
            {order.fulfillmentStatus === 'cancelled' ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-bold">Order Cancelled</div>
                    <div className="text-[11px] opacity-85">
                      Updated {formatDateTime(order.updatedAt)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() =>
                    patchOrder(
                      { fulfillmentStatus: 'pending' },
                      'reopen',
                      'Order reopened as Pending.'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reopen Order</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {progressSteps.map((step, idx) => {
                    const done = idx <= stageIdx;
                    const active = idx === stageIdx;
                    return (
                      <div key={step.label} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                              done
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-400'
                            }`}
                          >
                            {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              active
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : done
                                  ? 'text-slate-900 dark:text-slate-100'
                                  : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                        <div className="pl-8 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {step.time}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer Fraud / History Check Banner */}
            <div
              className={`rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
                customerHistory.isHighRisk
                  ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {customerHistory.isHighRisk ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span>
                  <strong>Customer History ({order.customerPhone}):</strong>{' '}
                  {customerHistory.totalCount} total order(s) ·{' '}
                  {customerHistory.deliveredCount} delivered ·{' '}
                  {customerHistory.cancelledCount} cancelled ({customerHistory.cancelRate}% cancel rate)
                </span>
              </div>
              {customerHistory.isHighRisk && (
                <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase">
                  Call to Verify Before Dispatch
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT COLUMN: Customer Info + Ordered Items */}
              <div className="lg:col-span-7 space-y-5">
                {/* Customer & Delivery Details */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Customer &amp; Delivery Address</span>
                      </h3>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          order.firebaseUid
                            ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {order.firebaseUid ? 'Registered Account' : 'Guest Checkout'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {onViewCustomer && (
                        <button
                          type="button"
                          onClick={() => onViewCustomer(resolvedCustomerId)}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          View Customer Profile →
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingCustomer((v) => !v)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{editingCustomer ? 'Cancel Edit' : 'Edit Details'}</span>
                      </button>
                    </div>
                  </div>

                  {editingCustomer ? (
                    <form onSubmit={handleSaveCustomerDetails} className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Delivery Address</label>
                        <textarea
                          rows={2}
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Delivery Zone</label>
                          <select
                            value={deliveryArea}
                            onChange={(e) =>
                              setDeliveryArea(
                                e.target.value === 'outside_dhaka'
                                  ? 'outside_dhaka'
                                  : 'inside_dhaka'
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            <option value="inside_dhaka">Inside Dhaka</option>
                            <option value="outside_dhaka">Outside Dhaka</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Admin / Verification Note</label>
                          <input
                            type="text"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="e.g. Confirmed via call, deliver after 3 PM"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={busyAction !== null}
                          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Customer Details</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {order.customerName}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono font-semibold inline-flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{order.customerPhone}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => copyText('phone', order.customerPhone)}
                            className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            title="Copy phone number"
                          >
                            {copiedKey === 'phone' ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <ClipboardCopy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {order.customerEmail && (
                        <div className="text-slate-500 dark:text-slate-400">
                          Email: <span className="text-slate-700 dark:text-slate-200">{order.customerEmail}</span>
                        </div>
                      )}

                      <div className="flex items-start gap-2 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-slate-800 dark:text-slate-200 leading-relaxed">
                            {order.deliveryAddress}
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {order.deliveryArea === 'outside_dhaka'
                              ? 'Outside Dhaka Courier Zone'
                              : 'Inside Dhaka Express Zone'}
                          </span>
                        </div>
                      </div>

                      {order.adminNote && (
                        <div className="mt-2 p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-200">
                          <strong>Admin Note:</strong> {order.adminNote}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ordered Items & Price Breakdown */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        Ordered Items ({order.items.reduce((s, i) => s + i.quantity, 0)} pcs)
                      </span>
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Est. Parcel Weight: {defaultWeight} kg
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {order.items.map((item, idx) => {
                      const prod = products.find((p) => p.id === item.productId);
                      return (
                        <div
                          key={`${item.productId}-${idx}`}
                          className="px-4 py-3 flex items-center gap-3 text-xs"
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>
                                Model: <strong className="text-slate-700 dark:text-slate-200">{item.model}</strong>
                              </span>
                              {prod?.sku && (
                                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  SKU: {prod.sku}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 tabular-nums">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {formatTaka(item.price * item.quantity)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.quantity} × {formatTaka(item.price)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 px-4 py-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {formatTaka(order.subtotal)}
                      </span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                        <span className="tabular-nums font-medium">
                          -{formatTaka(order.discountAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Delivery Charge</span>
                      <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {order.shippingFee === 0 ? 'Free' : formatTaka(order.shippingFee)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-slate-100">
                      <span>Total Order Amount</span>
                      <span className="tabular-nums">{formatTaka(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Fulfillment Workflow, Payment & Courier Dispatch */}
              <div className="lg:col-span-5 space-y-5">
                {/* Step-by-Step Fulfillment Actions */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Order Workflow Actions
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      disabled={
                        busyAction !== null ||
                        order.fulfillmentStatus === 'confirmed' ||
                        order.fulfillmentStatus === 'cancelled'
                      }
                      onClick={() =>
                        patchOrder(
                          { fulfillmentStatus: 'confirmed' },
                          'confirm',
                          'Order confirmed & ready for courier booking.'
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40"
                    >
                      1. Confirm Order
                    </button>

                    <button
                      type="button"
                      disabled={
                        busyAction !== null ||
                        order.fulfillmentStatus === 'shipped' ||
                        order.fulfillmentStatus === 'cancelled'
                      }
                      onClick={() =>
                        patchOrder(
                          { fulfillmentStatus: 'shipped' },
                          'ship',
                          'Order marked Shipped (In Transit).'
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-40"
                    >
                      3. Mark Shipped
                    </button>

                    <button
                      type="button"
                      disabled={
                        busyAction !== null ||
                        order.fulfillmentStatus === 'delivered' ||
                        order.fulfillmentStatus === 'cancelled'
                      }
                      onClick={() =>
                        patchOrder(
                          { fulfillmentStatus: 'delivered' },
                          'deliver',
                          order.paymentMethod === 'cod'
                            ? 'Order delivered & COD marked Paid.'
                            : 'Order marked Delivered.'
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-40"
                    >
                      4. Mark Delivered
                    </button>

                    <button
                      type="button"
                      disabled={
                        busyAction !== null || order.fulfillmentStatus === 'cancelled'
                      }
                      onClick={() => setConfirmCancelOpen((v) => !v)}
                      className="px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold hover:bg-rose-100 disabled:opacity-40"
                    >
                      Cancel Order
                    </button>
                  </div>

                  {confirmCancelOpen && order.fulfillmentStatus !== 'cancelled' && (
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 space-y-2 text-xs">
                      <label className="flex items-center gap-2 text-rose-800 dark:text-rose-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={restoreStockOnCancel}
                          onChange={(e) => setRestoreStockOnCancel(e.target.checked)}
                          className="rounded border-rose-300"
                        />
                        <span>Restore item quantities back to inventory stock</span>
                      </label>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmCancelOpen(false)}
                          className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={async () => {
                            const updated = await patchOrder(
                              {
                                fulfillmentStatus: 'cancelled',
                                restoreStock: restoreStockOnCancel,
                              },
                              'cancel',
                              'Order cancelled.'
                            );
                            if (updated) setConfirmCancelOpen(false);
                          }}
                          className="px-3 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700"
                        >
                          Confirm Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Verification Panel */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Payment &amp; TrxID</span>
                    </h3>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {order.transactionId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 dark:text-slate-400 uppercase font-semibold">
                      Method: {order.paymentMethod}
                    </span>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                      {(['pending', 'paid', 'failed'] as PaymentStatus[]).map((ps) => (
                        <button
                          key={ps}
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            patchOrder(
                              { paymentStatus: ps },
                              `pay-${ps}`,
                              `Payment marked ${ps.toUpperCase()}.`
                            )
                          }
                          className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-colors ${
                            order.paymentStatus === ps
                              ? ps === 'paid'
                                ? 'bg-emerald-600 text-white'
                                : ps === 'failed'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-500 text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                          }`}
                        >
                          {ps}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Courier Booking & Dispatch Panel */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-indigo-500" />
                      <span>2. Courier Dispatch</span>
                    </h3>
                    {order.courier && (
                      <button
                        type="button"
                        onClick={() => setEditingCourier((v) => !v)}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        {editingCourier ? 'View Summary' : 'Update / Rebook'}
                      </button>
                    )}
                  </div>

                  {order.courier && !editingCourier ? (
                    <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                            Courier Partner ({order.courier.mode === 'api' ? 'Live API' : 'Manual'})
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {order.courier.provider}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold uppercase">
                          {order.courier.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-200/70 dark:border-indigo-500/20">
                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Tracking Code
                          </div>
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-slate-100">
                            <span className="truncate">{order.courier.trackingCode}</span>
                            <button
                              type="button"
                              onClick={() => copyText('trk', order.courier!.trackingCode)}
                              className="p-0.5 text-indigo-600 dark:text-indigo-400"
                              title="Copy tracking code"
                            >
                              {copiedKey === 'trk' ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <ClipboardCopy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Consignment ID
                          </div>
                          <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {order.courier.consignmentId}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                        <span>COD: {formatTaka(order.courier.codAmount)}</span>
                        <span>Weight: {order.courier.parcelWeightKg} kg</span>
                        <span>Booked: {formatDateTime(order.courier.bookedAt)}</span>
                      </div>

                      {order.courier.note && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          Note: {order.courier.note}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Courier</label>
                          <select
                            value={provider}
                            onChange={(e) =>
                              setProvider(e.target.value as OrderCourierInfo['provider'])
                            }
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            {COURIER_PROVIDERS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">
                            COD Amount (৳)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={codAmount}
                            onChange={(e) => setCodAmount(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            min="0.05"
                            value={parcelWeightKg}
                            onChange={(e) => setParcelWeightKg(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">
                            Tracking Code (Optional)
                          </label>
                          <input
                            type="text"
                            value={trackingCode}
                            onChange={(e) => setTrackingCode(e.target.value)}
                            placeholder="Auto-generated if empty"
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {provider === 'Steadfast' && (
                        <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-300">
                            {hasSteadfastApi && !forceManualMode
                              ? 'Steadfast API credentials active — sends parcel directly'
                              : 'Manual / Local consignment mode (set API key in Settings → Delivery)'}
                          </span>
                          {hasSteadfastApi && (
                            <label className="inline-flex items-center gap-1 cursor-pointer font-semibold">
                              <input
                                type="checkbox"
                                checked={forceManualMode}
                                onChange={(e) => setForceManualMode(e.target.checked)}
                              />
                              <span>Manual</span>
                            </label>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Courier Delivery Note
                        </label>
                        <input
                          type="text"
                          value={courierNote}
                          onChange={(e) => setCourierNote(e.target.value)}
                          placeholder="Instructions for rider..."
                          className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {quickNotes.slice(0, 3).map((qn) => (
                            <button
                              key={qn}
                              type="button"
                              onClick={() => setCourierNote(qn)}
                              className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 hover:border-indigo-400"
                            >
                              + {qn}
                            </button>
                          ))}
                        </div>
                      </div>

                      {order.courier ? (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={handleUpdateCourierTracking}
                            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Save Tracking Info
                          </button>
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => handleBookCourier(true)}
                            className="flex-1 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-50"
                          >
                            Rebook &amp; Ship
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={
                              busyAction !== null ||
                              order.fulfillmentStatus === 'cancelled'
                            }
                            onClick={() => handleBookCourier(false)}
                            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                          >
                            {busyAction === 'book' && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                            <span>Book Courier</span>
                          </button>
                          <button
                            type="button"
                            disabled={
                              busyAction !== null ||
                              order.fulfillmentStatus === 'cancelled'
                            }
                            onClick={() => handleBookCourier(true)}
                            className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                          >
                            {busyAction === 'book-ship' && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                            <span>Book &amp; Mark Shipped</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
