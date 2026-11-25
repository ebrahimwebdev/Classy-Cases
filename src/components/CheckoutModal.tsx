import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  Smartphone,
  SquarePen,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import { useCart, type CartEntry, type CartOptionTag } from '../context/CartContext';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { formatTaka } from '../models/phoneCase';
import type { Order, PaymentMethod, Product } from '../types';

export type { CartEntry };

interface PublicSettings {
  storeName: string;
  phone: string;
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
  freeShippingThreshold: number;
  paymentGateways: {
    bkash: { enabled: boolean; mode: string };
    nagad: { enabled: boolean; mode: string };
    card: { enabled: boolean; provider: string; mode: string };
    cod: { enabled: boolean };
  };
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartEntry[];
  products?: Product[];
  settings: PublicSettings;
  initialCoupon?: { code: string; discountPercent: number } | null;
  deliveryArea?: 'inside_dhaka' | 'outside_dhaka';
  onDeliveryAreaChange?: (area: 'inside_dhaka' | 'outside_dhaka') => void;
  onOrderCompleted: (order: Order, customerOrderToken?: string) => void;
  onViewMyOrders?: () => void;
  onEditCart?: () => void;
  onEditItem?: (productId: string) => void;
}

const BANGLADESH_DISTRICTS = [
  'Dhaka',
  'Chattogram',
  'Gazipur',
  'Narayanganj',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Cumilla',
  'Rangpur',
  'Barishal',
  'Mymensingh',
  'Bogura',
  'Tangail',
  'Narsingdi',
  'Jashore',
  "Cox's Bazar",
  'Brahmanbaria',
  'Dinajpur',
  'Faridpur',
  'Feni',
  'Kushtia',
  'Noakhali',
  'Pabna',
  'Sirajganj',
];

function getItemOptionTags(item: CartEntry): CartOptionTag[] {
  if (item.selectedOptions && item.selectedOptions.length > 0) {
    return item.selectedOptions;
  }
  const parts = item.model
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 2) {
    return [
      { name: 'Color', value: parts[0] },
      { name: 'Model', value: parts[1] },
    ];
  }
  if (parts.length > 2) {
    return parts.map((val, idx) => ({
      name: idx === 0 ? 'Option 1' : idx === parts.length - 1 ? 'Model' : `Option ${idx + 1}`,
      value: val,
    }));
  }
  if (!item.model || item.model === 'Standard Fit') return [];
  return [{ name: 'Model', value: item.model }];
}

function CheckoutThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-14 h-14 rounded-xl bg-white border border-[#EDE2C9] flex items-center justify-center shrink-0">
        <Smartphone className="w-5 h-5 text-[#8E6F70]" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-14 h-14 rounded-xl object-cover border border-[#EDE2C9] shrink-0 bg-white"
    />
  );
}

export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  products,
  settings,
  initialCoupon,
  deliveryArea: externalDeliveryArea,
  onDeliveryAreaChange,
  onOrderCompleted,
  onViewMyOrders,
  onEditCart,
  onEditItem,
}: CheckoutModalProps) {
  const { updateQuantity, removeItem } = useCart();
  const { idToken } = useFirebaseAuth();

  const [step, setStep] = useState<'details' | 'gateway' | 'receipt'>('details');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  const [internalDeliveryArea, setInternalDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>(
    externalDeliveryArea || 'inside_dhaka'
  );

  useEffect(() => {
    if (externalDeliveryArea) {
      setInternalDeliveryArea(externalDeliveryArea);
    }
  }, [externalDeliveryArea]);

  const deliveryArea = externalDeliveryArea ?? internalDeliveryArea;
  const setDeliveryArea = (next: 'inside_dhaka' | 'outside_dhaka') => {
    setInternalDeliveryArea(next);
    onDeliveryAreaChange?.(next);
  };

  const availableMethods: PaymentMethod[] = [];
  if (settings.paymentGateways.cod.enabled) availableMethods.push('cod');
  if (settings.paymentGateways.bkash.enabled) availableMethods.push('bkash');
  if (settings.paymentGateways.nagad.enabled) availableMethods.push('nagad');
  if (settings.paymentGateways.card.enabled) availableMethods.push('card');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(availableMethods[0] || 'cod');
  const [couponOpen, setCouponOpen] = useState(Boolean(initialCoupon));
  const [couponInput, setCouponInput] = useState(initialCoupon?.code || '');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(
    initialCoupon || null
  );
  const [couponMessage, setCouponMessage] = useState('');

  // Gateway session state
  const [paymentSessionId, setPaymentSessionId] = useState('');
  const [authoritativeTotal, setAuthoritativeTotal] = useState(0);
  const [walletNumber, setWalletNumber] = useState('');
  const [pinOrOtp, setPinOrOtp] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (isOpen && cart.length > 0 && step === 'receipt') {
      setStep('details');
      setCompletedOrder(null);
      setError('');
    }
  }, [isOpen, cart.length, step]);

  if (!isOpen) return null;

  const unavailableIds = new Set<string>();
  if (products && products.length > 0) {
    for (const entry of cart) {
      const match = products.find((p) => p.id === entry.productId && p.active !== false);
      if (!match || match.stock < entry.quantity) {
        unavailableIds.add(`${entry.productId}-${entry.model}`);
      }
    }
  }
  const hasUnavailableItems = unavailableIds.size > 0;

  const totalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discountPercent) / 100) : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const baseShipping =
    deliveryArea === 'outside_dhaka' ? settings.shippingOutsideDhaka : settings.shippingInsideDhaka;
  const shippingFee =
    settings.freeShippingThreshold > 0 && afterDiscount >= settings.freeShippingThreshold ? 0 : baseShipping;
  const estimatedTotal = afterDiscount + shippingFee;

  async function handleApplyCoupon() {
    setCouponMessage('');
    if (!couponInput.trim()) return;
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppliedCoupon(null);
        setCouponMessage(data.error || 'Invalid code');
        return;
      }
      setAppliedCoupon(data);
      setCouponMessage(`${data.code} applied (${data.discountPercent}% off)`);
    } catch {
      setCouponMessage('Could not verify promo code');
    }
  }

  function buildCombinedDeliveryAddress(): string {
    const parts = [deliveryAddress.trim()];
    if (district.trim()) {
      parts.push(district.trim());
    }
    if (orderNote.trim()) {
      parts.push(`Note: ${orderNote.trim()}`);
    }
    return parts.filter(Boolean).join(', ');
  }

  async function handleProceedCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0 || hasUnavailableItems) return;
    setError('');
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      const res = await fetch('/api/checkout/initiate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          deliveryAddress: buildCombinedDeliveryAddress(),
          deliveryArea,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, model: c.model })),
          couponCode: appliedCoupon?.code,
          paymentMethod,
          source: 'Web',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to proceed with checkout');
        return;
      }

      if (data.status === 'completed' && data.order) {
        setCompletedOrder(data.order);
        onOrderCompleted(data.order, data.customerOrderToken);
        setStep('receipt');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (data.status === 'awaiting_payment') {
        setPaymentSessionId(data.paymentSessionId);
        setAuthoritativeTotal(data.amount);
        setWalletNumber(customerPhone);
        setStep('gateway');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPayment(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paymentSessionId,
          accountNumber: walletNumber,
          pinOrOtp,
          cardNumber,
          cardExpiry,
          cardCvc,
          cardHolder,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Payment verification failed');
        return;
      }
      setCompletedOrder(data.order);
      onOrderCompleted(data.order, data.customerOrderToken);
      setStep('receipt');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Network error during payment verification');
    } finally {
      setLoading(false);
    }
  }

  function resetAndClose() {
    setStep('details');
    setError('');
    setCompletedOrder(null);
    setPinOrOtp('');
    onClose();
  }

  return (
    <section
      aria-label="Checkout"
      className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-16 space-y-6"
    >
      {/* Top Header + Step Indicator matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {step !== 'receipt' && (
            <button
              type="button"
              onClick={resetAndClose}
              aria-label="Back to shop"
              className="w-9 h-9 rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] flex items-center justify-center text-[#650108] hover:bg-[#FAF4E6] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="font-brand text-2xl sm:text-3xl font-semibold text-[#650108] tracking-tight">
            Checkout
          </h1>
        </div>

        {/* 1 Cart -> 2 Checkout -> 3 Done Stepper */}
        <div className="flex items-center gap-2 sm:gap-3 text-[13px]">
          <button
            type="button"
            onClick={() => {
              if (onEditCart) onEditCart();
              else resetAndClose();
            }}
            className="inline-flex items-center gap-1.5 text-[#6B4C4E] hover:text-[#650108] font-medium"
          >
            <span className="w-5 h-5 rounded-full border border-[#C9B38D] bg-[#FFFDF8] flex items-center justify-center text-[#650108]">
              <Check className="w-3 h-3 stroke-[2.2]" />
            </span>
            <span>Cart</span>
          </button>

          <span className="w-6 h-px bg-[#C9B38D]" aria-hidden="true" />

          <div className="inline-flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                step === 'receipt'
                  ? 'border border-[#C9B38D] bg-[#FFFDF8] text-[#650108]'
                  : 'bg-[#650108] text-[#F2E8D2]'
              }`}
            >
              {step === 'receipt' ? <Check className="w-3 h-3 stroke-[2.2]" /> : '2'}
            </span>
            <span
              className={
                step === 'receipt' ? 'font-medium text-[#6B4C4E]' : 'font-semibold text-[#650108]'
              }
            >
              Checkout
            </span>
          </div>

          <span className="w-6 h-px bg-[#C9B38D]" aria-hidden="true" />

          <div className="inline-flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                step === 'receipt'
                  ? 'bg-[#650108] text-[#F2E8D2]'
                  : 'border border-[#DFCFB0] bg-[#FFFDF8] text-[#8E6F70]'
              }`}
            >
              3
            </span>
            <span
              className={
                step === 'receipt' ? 'font-semibold text-[#650108]' : 'font-medium text-[#8E6F70]'
              }
            >
              Done
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Two-Column Checkout Form & Order Summary */}
      {step === 'details' && (
        <form
          onSubmit={handleProceedCheckout}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left Column: 3 Step Cards */}
          <div className="lg:col-span-7 space-y-5">
            {/* Step 1: Contact & address */}
            <div className="border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#650108] text-[#F2E8D2] text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h2 className="font-brand text-lg font-semibold text-[#650108]">
                  Contact &amp; address
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[#2B1416] mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8E6F70] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] placeholder:text-[#8E6F70]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#2B1416] mb-1.5">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#8E6F70] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House, road, area, thana"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] placeholder:text-[#8E6F70]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#2B1416] mb-1.5">
                    District
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#8E6F70] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      required
                      value={district}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDistrict(val);
                        if (val === 'Dhaka') {
                          setDeliveryArea('inside_dhaka');
                        } else if (val) {
                          setDeliveryArea('outside_dhaka');
                        }
                      }}
                      className={`w-full pl-10 pr-8 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] ${
                        district ? 'text-[#2B1416]' : 'text-[#8E6F70]'
                      }`}
                    >
                      <option value="">Select your district</option>
                      {BANGLADESH_DISTRICTS.map((dist) => (
                        <option key={dist} value={dist} className="text-[#2B1416]">
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#2B1416] mb-1.5">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8E6F70] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] placeholder:text-[#8E6F70]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#2B1416] mb-1.5">
                    Email <span className="font-normal text-[#6B4C4E]">(optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8E6F70] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] placeholder:text-[#8E6F70]"
                    />
                  </div>
                </div>

                <div>
                  {!showNoteInput ? (
                    <button
                      type="button"
                      onClick={() => setShowNoteInput(true)}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#650108] hover:opacity-75"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add a note</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] font-semibold text-[#2B1416]">
                          Order note <span className="font-normal text-[#6B4C4E]">(optional)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNoteInput(false);
                            setOrderNote('');
                          }}
                          className="text-xs text-[#6B4C4E] hover:text-[#650108]"
                        >
                          Remove note
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        placeholder="Delivery instructions or landmark near your address..."
                        className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Delivery Zone */}
            <div className="border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#650108] text-[#F2E8D2] text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h2 className="font-brand text-lg font-semibold text-[#650108]">
                  Delivery Zone
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryArea('inside_dhaka')}
                  className={`px-4 py-3.5 rounded-xl border text-left transition-all ${
                    deliveryArea === 'inside_dhaka'
                      ? 'border-[#650108] bg-[#650108] text-[#F2E8D2] shadow-xs'
                      : 'border-[#DFCFB0] bg-[#FAF4E6] text-[#2B1416] hover:border-[#650108]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Inside Dhaka</span>
                    <span className="text-sm font-bold tabular-nums">
                      {settings.freeShippingThreshold > 0 && afterDiscount >= settings.freeShippingThreshold
                        ? 'Free'
                        : formatTaka(settings.shippingInsideDhaka)}
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      deliveryArea === 'inside_dhaka' ? 'text-[#F2E8D2]/80' : 'text-[#6B4C4E]'
                    }`}
                  >
                    Express 24–48 hours doorstep delivery
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryArea('outside_dhaka')}
                  className={`px-4 py-3.5 rounded-xl border text-left transition-all ${
                    deliveryArea === 'outside_dhaka'
                      ? 'border-[#650108] bg-[#650108] text-[#F2E8D2] shadow-xs'
                      : 'border-[#DFCFB0] bg-[#FAF4E6] text-[#2B1416] hover:border-[#650108]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Outside Dhaka</span>
                    <span className="text-sm font-bold tabular-nums">
                      {settings.freeShippingThreshold > 0 && afterDiscount >= settings.freeShippingThreshold
                        ? 'Free'
                        : formatTaka(settings.shippingOutsideDhaka)}
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      deliveryArea === 'outside_dhaka' ? 'text-[#F2E8D2]/80' : 'text-[#6B4C4E]'
                    }`}
                  >
                    Nationwide courier (2–4 business days)
                  </div>
                </button>
              </div>
            </div>

            {/* Step 3: Payment method */}
            <div className="border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#650108] text-[#F2E8D2] text-xs font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <h2 className="font-brand text-lg font-semibold text-[#650108]">
                  Payment method
                </h2>
              </div>

              <div className="space-y-2.5">
                {settings.paymentGateways.cod.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-[#650108] ring-1 ring-[#650108] bg-[#FFFDF8]'
                        : 'border-[#DFCFB0] hover:border-[#650108]/50 bg-[#FAF4E6]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          paymentMethod === 'cod' ? 'border-[#650108]' : 'border-[#C9B38D]'
                        }`}
                      >
                        {paymentMethod === 'cod' && (
                          <span className="w-2 h-2 rounded-full bg-[#650108]" />
                        )}
                      </span>
                      <Banknote className="w-5 h-5 text-[#650108] shrink-0" />
                      <span className="text-sm font-semibold text-[#2B1416]">
                        Cash on delivery
                      </span>
                    </div>
                    <span className="text-xs text-[#6B4C4E] shrink-0">Pay at doorstep</span>
                  </button>
                )}

                {settings.paymentGateways.bkash.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bkash')}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      paymentMethod === 'bkash'
                        ? 'border-[#650108] ring-1 ring-[#650108] bg-[#FFFDF8]'
                        : 'border-[#DFCFB0] hover:border-[#650108]/50 bg-[#FAF4E6]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          paymentMethod === 'bkash' ? 'border-[#650108]' : 'border-[#C9B38D]'
                        }`}
                      >
                        {paymentMethod === 'bkash' && (
                          <span className="w-2 h-2 rounded-full bg-[#650108]" />
                        )}
                      </span>
                      <span className="w-7 h-7 rounded-lg bg-[#E2136E] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        bK
                      </span>
                      <span className="text-sm font-semibold text-[#2B1416]">bKash</span>
                    </div>
                    <span className="text-xs text-[#6B4C4E] shrink-0">Mobile Wallet</span>
                  </button>
                )}

                {settings.paymentGateways.nagad.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('nagad')}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      paymentMethod === 'nagad'
                        ? 'border-[#650108] ring-1 ring-[#650108] bg-[#FFFDF8]'
                        : 'border-[#DFCFB0] hover:border-[#650108]/50 bg-[#FAF4E6]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          paymentMethod === 'nagad' ? 'border-[#650108]' : 'border-[#C9B38D]'
                        }`}
                      >
                        {paymentMethod === 'nagad' && (
                          <span className="w-2 h-2 rounded-full bg-[#650108]" />
                        )}
                      </span>
                      <span className="w-7 h-7 rounded-lg bg-[#ED1C24] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        N
                      </span>
                      <span className="text-sm font-semibold text-[#2B1416]">Nagad</span>
                    </div>
                    <span className="text-xs text-[#6B4C4E] shrink-0">Mobile Wallet</span>
                  </button>
                )}

                {settings.paymentGateways.card.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      paymentMethod === 'card'
                        ? 'border-[#650108] ring-1 ring-[#650108] bg-[#FFFDF8]'
                        : 'border-[#DFCFB0] hover:border-[#650108]/50 bg-[#FAF4E6]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          paymentMethod === 'card' ? 'border-[#650108]' : 'border-[#C9B38D]'
                        }`}
                      >
                        {paymentMethod === 'card' && (
                          <span className="w-2 h-2 rounded-full bg-[#650108]" />
                        )}
                      </span>
                      <CreditCard className="w-5 h-5 text-[#650108] shrink-0" />
                      <span className="text-sm font-semibold text-[#2B1416]">Card / SSL</span>
                    </div>
                    <span className="text-xs text-[#6B4C4E] shrink-0">Visa, Mastercard</span>
                  </button>
                )}
              </div>

              <div className="flex items-start gap-2 text-xs text-[#6B4C4E] pt-1">
                <Info className="w-4 h-4 text-[#8E6F70] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your personal data will be used to process your order and support your experience on this site.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Your order + Order summary */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
            {/* Your order card */}
            <div className="border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-brand text-lg font-semibold text-[#650108]">Your order</h2>
                  <span className="w-6 h-6 rounded-full bg-[#F2E8D2] text-[#650108] text-xs font-semibold flex items-center justify-center tabular-nums">
                    {totalUnits}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onEditCart) onEditCart();
                    else resetAndClose();
                  }}
                  className="text-[13px] font-semibold text-[#650108] hover:opacity-75"
                >
                  Edit cart
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm text-[#6B4C4E]">Your cart is currently empty.</p>
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-4 py-2 rounded-xl bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] transition-colors"
                  >
                    Browse Phone Cases
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {cart.map((item) => {
                    const key = `${item.productId}-${item.model}`;
                    const isUnavailable = unavailableIds.has(key);
                    const optionTags = getItemOptionTags(item);
                    return (
                      <div
                        key={key}
                        className="border border-[#DFCFB0] rounded-2xl bg-[#FAF4E6]/60 p-3.5 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <CheckoutThumb src={item.image} alt={item.title} />
                          <p className="text-sm font-medium text-[#2B1416] line-clamp-2 leading-snug flex-1">
                            {item.title}
                          </p>
                        </div>

                        <div className="bg-[#FFFDF8] border border-[#EDE2C9] rounded-xl p-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1.5">
                              <div className="text-xs text-[#6B4C4E] truncate">
                                SKU: <span className="font-mono text-[#2B1416]">{item.sku || 'Standard'}</span>
                              </div>
                              {optionTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {optionTags.map((tag) => (
                                    <span
                                      key={`${tag.name}-${tag.value}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#DFCFB0] bg-[#FAF4E6] text-xs text-[#6B4C4E]"
                                    >
                                      <span>{tag.name}:</span>
                                      <strong className="font-semibold text-[#650108]">
                                        {tag.value}
                                      </strong>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {onEditItem && (
                                <button
                                  type="button"
                                  onClick={() => onEditItem(item.productId)}
                                  aria-label={`Edit ${item.title}`}
                                  className="w-8 h-8 rounded-lg border border-[#DFCFB0] bg-[#FAF4E6] hover:bg-[#F2E8D2] text-[#650108] flex items-center justify-center transition-colors"
                                >
                                  <SquarePen className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeItem(item.productId, item.model)}
                                aria-label={`Remove ${item.title}`}
                                className="w-8 h-8 rounded-lg border border-[#650108]/20 bg-[#650108]/5 hover:bg-[#650108]/12 text-[#650108] flex items-center justify-center transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-bold text-[#6B4C4E] tabular-nums">
                                {formatTaka(item.price)}
                              </span>
                              <div className="inline-flex items-center border border-[#DFCFB0] bg-[#FAF4E6] rounded-xl h-8">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.productId, item.model, -1)}
                                  aria-label="Decrease quantity"
                                  className="px-2.5 h-full flex items-center justify-center text-[#650108] hover:bg-[#F2E8D2] rounded-l-xl"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-2 text-xs font-semibold text-[#2B1416] tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.productId, item.model, 1)}
                                  aria-label="Increase quantity"
                                  className="px-2.5 h-full flex items-center justify-center text-[#650108] hover:bg-[#F2E8D2] rounded-r-xl"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <span className="text-sm font-bold text-[#650108] tabular-nums">
                              {formatTaka(item.price * item.quantity)}
                            </span>
                          </div>

                          {isUnavailable && (
                            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-600 space-y-2">
                              <p className="font-semibold">
                                This option is no longer available. Remove it to place your order.
                              </p>
                              <button
                                type="button"
                                onClick={() => removeItem(item.productId, item.model)}
                                className="px-3 py-1.5 rounded-lg border border-red-300 bg-white text-red-600 font-semibold hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order summary card */}
            <div className="border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
              <h2 className="font-brand text-lg font-semibold text-[#650108]">Order summary</h2>

              {/* Coupon Toggle */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setCouponOpen((v) => !v)}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#650108] hover:opacity-75"
                >
                  <Tag className="w-4 h-4 text-[#650108]" />
                  <span>Have a coupon code?</span>
                </button>

                {couponOpen && (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Promo code (e.g. CLASSY10)"
                        className="flex-1 px-3 py-2 text-[13px] border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 text-[13px] font-semibold border border-[#650108] text-[#650108] rounded-xl hover:bg-[#650108] hover:text-[#F2E8D2] transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMessage && (
                      <p className="text-xs text-[#6B4C4E]">{couponMessage}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-[#EDE2C9] pt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[#2B1416] font-medium">Subtotal</div>
                    <div className="text-xs text-[#6B4C4E] mt-0.5">
                      {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                  <span className="font-bold text-[#650108] tabular-nums">
                    {formatTaka(subtotal)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span className="font-semibold tabular-nums">-{formatTaka(discountAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[#2B1416]">
                  <span>Delivery</span>
                  <span className="text-[13px] font-medium text-[#6B4C4E] tabular-nums">
                    {deliveryArea === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'} ·{' '}
                    <strong className="text-[#650108]">
                      {shippingFee === 0 ? 'Free' : formatTaka(shippingFee)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="border-t border-[#EDE2C9] pt-4 flex items-center justify-between">
                <span className="text-base font-bold text-[#2B1416]">Total</span>
                <span className="text-xl font-bold text-[#650108] tabular-nums">
                  {formatTaka(estimatedTotal)}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || cart.length === 0 || hasUnavailableItems}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106] transition-colors flex items-center justify-center gap-2 disabled:bg-[#C9B38D] disabled:text-white disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {paymentMethod === 'cod'
                          ? 'Place Order'
                          : `Continue to ${paymentMethod.toUpperCase()} · ${formatTaka(estimatedTotal)}`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {hasUnavailableItems ? (
                  <p className="text-xs text-[#6B4C4E] text-center">
                    Remove the unavailable items to continue.
                  </p>
                ) : (
                  <p className="text-xs text-[#6B4C4E] text-center flex items-center justify-center gap-1.5 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#650108]" />
                    <span>Encrypted server-verified checkout</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Step 2: Interactive Online Payment Gateway */}
      {step === 'gateway' && (
        <form onSubmit={handleVerifyPayment} className="max-w-lg mx-auto py-4 space-y-5">
          {paymentMethod === 'bkash' && (
            <div className="rounded-2xl overflow-hidden border border-[#E2136E]/30 shadow-xs bg-white">
              <div className="bg-[#E2136E] text-white p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-90">bKash Merchant Payment</div>
                  <div className="text-lg font-bold">{settings.storeName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-90">Amount</div>
                  <div className="text-xl font-bold tabular-nums">{formatTaka(authoritativeTotal)}</div>
                </div>
              </div>
              <div className="p-5 sm:p-6 bg-white space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">
                    Your bKash Account Number
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={walletNumber}
                      onChange={(e) => setWalletNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-[#E2136E]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">
                    Verification Code (OTP) / PIN
                  </label>
                  <input
                    type="password"
                    required
                    value={pinOrOtp}
                    onChange={(e) => setPinOrOtp(e.target.value)}
                    placeholder="Enter 4–6 digit code (e.g. 12345)"
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-[#E2136E]"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'nagad' && (
            <div className="rounded-2xl overflow-hidden border border-[#ED1C24]/30 shadow-xs bg-white">
              <div className="bg-gradient-to-r from-[#ED1C24] to-[#F7941D] text-white p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-90">Nagad e-Commerce Gateway</div>
                  <div className="text-lg font-bold">{settings.storeName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-90">Payable</div>
                  <div className="text-xl font-bold tabular-nums">{formatTaka(authoritativeTotal)}</div>
                </div>
              </div>
              <div className="p-5 sm:p-6 bg-white space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">
                    Your Nagad Account Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-[#ED1C24]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">
                    Nagad OTP / PIN
                  </label>
                  <input
                    type="password"
                    required
                    value={pinOrOtp}
                    onChange={(e) => setPinOrOtp(e.target.value)}
                    placeholder="Enter 4–6 digit OTP"
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-[#ED1C24]"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="rounded-2xl overflow-hidden border border-[#DFCFB0] shadow-xs bg-[#FFFDF8]">
              <div className="bg-[#650108] text-[#F2E8D2] p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#F2E8D2]/80">
                    {settings.paymentGateways.card.provider} Secure Pay
                  </div>
                  <div className="text-lg font-bold">{settings.storeName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#F2E8D2]/80">Total</div>
                  <div className="text-xl font-bold tabular-nums">{formatTaka(authoritativeTotal)}</div>
                </div>
              </div>
              <div className="p-5 sm:p-6 bg-[#FFFDF8] space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[#2B1416] mb-1.5">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="MD IBRAHIM"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#2B1416] mb-1.5">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4532 •••• •••• 8910"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#2B1416] mb-1.5">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="12/28"
                      className="w-full px-3.5 py-2.5 text-sm font-mono border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#2B1416] mb-1.5">
                      CVC / CVV
                    </label>
                    <input
                      type="password"
                      required
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      className="w-full px-3.5 py-2.5 text-sm font-mono border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('details')}
              className="flex-1 py-3 px-4 rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] text-sm font-semibold text-[#650108] hover:bg-[#FAF4E6]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-3 px-4 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `Confirm Payment ${formatTaka(authoritativeTotal)}`
              )}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Order Confirmed Receipt */}
      {step === 'receipt' && completedOrder && (
        <div className="max-w-lg mx-auto py-8 border border-[#DFCFB0] rounded-2xl bg-[#FFFDF8] p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-brand text-xl sm:text-2xl font-semibold text-[#650108]">
              Order #{completedOrder.orderNumber} Confirmed
            </h2>
            <p className="text-sm text-[#6B4C4E] mt-1.5">
              Thank you, {completedOrder.customerName}. Your order has been recorded and sent to fulfillment.
            </p>
          </div>

          <div className="bg-[#FAF4E6] border border-[#DFCFB0] rounded-xl p-4 sm:p-5 text-left space-y-2.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[#6B4C4E]">Order Number</span>
              <span className="font-mono font-semibold text-[#650108]">
                #{completedOrder.orderNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B4C4E]">Transaction ID</span>
              <span className="font-mono text-[#2B1416]">{completedOrder.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B4C4E]">Payment Method</span>
              <span className="uppercase tracking-[1.5px] font-medium text-[#2B1416]">
                {completedOrder.paymentMethod}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B4C4E]">Payment Status</span>
              <span
                className={`font-semibold ${
                  completedOrder.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {completedOrder.paymentStatus === 'paid' ? 'Paid Online' : 'Cash on Delivery (Pending)'}
              </span>
            </div>
            <div className="flex justify-between pt-2.5 border-t border-[#DFCFB0] text-base font-bold text-[#650108]">
              <span>Total Amount</span>
              <span className="tabular-nums">{formatTaka(completedOrder.total)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {onViewMyOrders && (
              <button
                type="button"
                onClick={() => {
                  resetAndClose();
                  onViewMyOrders();
                }}
                className="flex-1 py-3 rounded-xl border border-[#650108]/40 bg-[#FFFDF8] text-[#650108] text-sm font-semibold hover:bg-[#FAF4E6] transition-colors"
              >
                View in My Orders
              </button>
            )}
            <button
              type="button"
              onClick={resetAndClose}
              className="flex-1 py-3 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
