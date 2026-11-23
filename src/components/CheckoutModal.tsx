import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone,
  Truck,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { Order, PaymentMethod } from '../types';
import type { CartEntry } from '../context/CartContext';
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
  settings: PublicSettings;
  initialCoupon?: { code: string; discountPercent: number } | null;
  deliveryArea?: 'inside_dhaka' | 'outside_dhaka';
  onDeliveryAreaChange?: (area: 'inside_dhaka' | 'outside_dhaka') => void;
  onOrderCompleted: (order: Order, customerOrderToken?: string) => void;
  onViewMyOrders?: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  settings,
  initialCoupon,
  deliveryArea: externalDeliveryArea,
  onDeliveryAreaChange,
  onOrderCompleted,
  onViewMyOrders,
}: CheckoutModalProps) {
  const [step, setStep] = useState<'details' | 'gateway' | 'receipt'>('details');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [internalDeliveryArea, setInternalDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>(
    externalDeliveryArea || 'inside_dhaka'
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');

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
  if (settings.paymentGateways.bkash.enabled) availableMethods.push('bkash');
  if (settings.paymentGateways.nagad.enabled) availableMethods.push('nagad');
  if (settings.paymentGateways.card.enabled) availableMethods.push('card');
  if (settings.paymentGateways.cod.enabled) availableMethods.push('cod');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(availableMethods[0] || 'bkash');
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

  if (!isOpen) return null;

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

  async function handleProceedCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          deliveryAddress,
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
      } else if (data.status === 'awaiting_payment') {
        setPaymentSessionId(data.paymentSessionId);
        setAuthoritativeTotal(data.amount);
        setWalletNumber(customerPhone);
        setStep('gateway');
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
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs overflow-y-auto p-3 sm:p-4">
      <div className="min-h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-neutral-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-200 bg-neutral-50">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Lock className="w-4 h-4 text-neutral-700 shrink-0" />
              <h2 className="text-sm sm:text-base font-semibold text-neutral-900">
                {step === 'details' && 'Checkout & Online Payment'}
                {step === 'gateway' && 'Complete Online Payment'}
                {step === 'receipt' && 'Order Confirmed'}
              </h2>
            </div>
            <button
              onClick={resetAndClose}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors"
              aria-label="Close checkout"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: Customer Details & Payment Method */}
          {step === 'details' && (
            <form onSubmit={handleProceedCheckout} className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-7 p-4 sm:p-6 space-y-5 border-b md:border-b-0 md:border-r border-neutral-200">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3">Delivery Information</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Md Ibrahim"
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="017XXXXXXXX"
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Email (for receipt)</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Delivery Zone *</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setDeliveryArea('inside_dhaka')}
                          className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                            deliveryArea === 'inside_dhaka'
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          <div className="font-semibold">Inside Dhaka</div>
                          <div className="opacity-80 tabular-nums">৳{settings.shippingInsideDhaka}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryArea('outside_dhaka')}
                          className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                            deliveryArea === 'outside_dhaka'
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          <div className="font-semibold">Outside Dhaka</div>
                          <div className="opacity-80 tabular-nums">৳{settings.shippingOutsideDhaka}</div>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Full Address *</label>
                      <textarea
                        required
                        rows={2}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="House, Road, Area, District..."
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-2.5">Select Payment Method</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {settings.paymentGateways.bkash.enabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bkash')}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        paymentMethod === 'bkash'
                          ? 'border-[#E2136E] bg-[#E2136E]/5 ring-1 ring-[#E2136E]'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#E2136E] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        bK
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-900">bKash</div>
                        <div className="text-[11px] text-neutral-500">Mobile Wallet</div>
                      </div>
                    </button>
                  )}

                  {settings.paymentGateways.nagad.enabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('nagad')}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        paymentMethod === 'nagad'
                          ? 'border-[#F7941D] bg-[#F7941D]/5 ring-1 ring-[#F7941D]'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#ED1C24] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        N
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-900">Nagad</div>
                        <div className="text-[11px] text-neutral-500">Mobile Wallet</div>
                      </div>
                    </button>
                  )}

                  {settings.paymentGateways.card.enabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        paymentMethod === 'card'
                          ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-900">Card / SSL</div>
                        <div className="text-[11px] text-neutral-500">Visa, Mastercard</div>
                      </div>
                    </button>
                  )}

                  {settings.paymentGateways.cod.enabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-neutral-900 bg-neutral-100 ring-1 ring-neutral-900'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 text-white flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-900">Cash on Delivery</div>
                        <div className="text-[11px] text-neutral-500">Pay at doorstep</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Summary Column */}
            <div className="md:col-span-5 p-6 bg-neutral-50 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-900">Order Summary</h3>
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.model}`} className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover border border-neutral-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-neutral-900 truncate">{item.title}</p>
                        <p className="text-[11px] text-neutral-500">
                          {item.model} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-xs font-semibold text-neutral-900 tabular-nums">
                        ৳{item.price * item.quantity}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promo code */}
                <div className="pt-2 border-t border-neutral-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Promo code (e.g. CLASSY10)"
                      className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-3 py-1.5 text-xs font-medium border border-neutral-900 rounded-lg hover:bg-neutral-900 hover:text-white transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {couponMessage && <p className="text-[11px] text-neutral-600 mt-1">{couponMessage}</p>}
                </div>

                <div className="space-y-2 pt-3 border-t border-neutral-200 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-medium text-neutral-900">৳{subtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span className="tabular-nums font-medium">-৳{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-600">
                    <span>Delivery Fee</span>
                    <span className="tabular-nums font-medium text-neutral-900">
                      {shippingFee === 0 ? 'Free' : `৳${shippingFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm font-bold text-neutral-900">
                    <span>Total</span>
                    <span className="tabular-nums">৳{estimatedTotal}</span>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {paymentMethod === 'cod'
                          ? `Place Order · ৳${estimatedTotal}`
                          : `Pay Online · ৳${estimatedTotal}`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-neutral-500 text-center mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Encrypted server-verified checkout
                </p>
              </div>
            </div>
          </form>
        )}

        {/* Step 2: Interactive Online Payment Gateway */}
        {step === 'gateway' && (
          <form onSubmit={handleVerifyPayment} className="p-6 max-w-md mx-auto space-y-5">
            {paymentMethod === 'bkash' && (
              <div className="rounded-2xl overflow-hidden border border-[#E2136E]/30 shadow-sm">
                <div className="bg-[#E2136E] text-white p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs opacity-85">bKash Merchant Payment</div>
                    <div className="text-lg font-bold">{settings.storeName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-85">Amount</div>
                    <div className="text-xl font-bold tabular-nums">৳{authoritativeTotal}</div>
                  </div>
                </div>
                <div className="p-5 bg-white space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Your bKash Account Number
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        value={walletNumber}
                        onChange={(e) => setWalletNumber(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#E2136E]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Verification Code (OTP) / PIN
                    </label>
                    <input
                      type="password"
                      required
                      value={pinOrOtp}
                      onChange={(e) => setPinOrOtp(e.target.value)}
                      placeholder="Enter 4–6 digit code (e.g. 12345)"
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#E2136E]"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'nagad' && (
              <div className="rounded-2xl overflow-hidden border border-[#ED1C24]/30 shadow-sm">
                <div className="bg-gradient-to-r from-[#ED1C24] to-[#F7941D] text-white p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs opacity-90">Nagad e-Commerce Gateway</div>
                    <div className="text-lg font-bold">{settings.storeName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-90">Payable</div>
                    <div className="text-xl font-bold tabular-nums">৳{authoritativeTotal}</div>
                  </div>
                </div>
                <div className="p-5 bg-white space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Your Nagad Account Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={walletNumber}
                      onChange={(e) => setWalletNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#ED1C24]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Nagad OTP / PIN
                    </label>
                    <input
                      type="password"
                      required
                      value={pinOrOtp}
                      onChange={(e) => setPinOrOtp(e.target.value)}
                      placeholder="Enter 4–6 digit OTP"
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#ED1C24]"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="rounded-2xl overflow-hidden border border-indigo-200 shadow-sm">
                <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-300">{settings.paymentGateways.card.provider} Secure Pay</div>
                    <div className="text-lg font-bold">{settings.storeName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-300">Total</div>
                    <div className="text-xl font-bold tabular-nums">৳{authoritativeTotal}</div>
                  </div>
                </div>
                <div className="p-5 bg-white space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="MD IBRAHIM"
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 •••• •••• 8910"
                      className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Expiry Date</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">CVC / CVV</label>
                      <input
                        type="password"
                        required
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="123"
                        className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-2.5 px-4 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirm Payment ৳${authoritativeTotal}`}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Order Confirmed Receipt */}
        {step === 'receipt' && completedOrder && (
          <div className="p-8 max-w-lg mx-auto text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">
                Order #{completedOrder.orderNumber} Confirmed
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                Thank you, {completedOrder.customerName}. Your order has been recorded and sent to fulfillment.
              </p>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Order Number</span>
                <span className="font-mono font-semibold text-neutral-900">#{completedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Transaction ID</span>
                <span className="font-mono text-neutral-900">{completedOrder.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Payment Method</span>
                <span className="uppercase font-medium text-neutral-900">{completedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Payment Status</span>
                <span
                  className={`font-semibold ${
                    completedOrder.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {completedOrder.paymentStatus === 'paid' ? 'Paid Online' : 'Cash on Delivery (Pending)'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm font-bold text-neutral-900">
                <span>Total Amount</span>
                <span className="tabular-nums">৳{completedOrder.total}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              {onViewMyOrders && (
                <button
                  type="button"
                  onClick={() => {
                    resetAndClose();
                    onViewMyOrders();
                  }}
                  className="flex-1 py-3 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-50 transition-colors"
                >
                  View in My Orders
                </button>
              )}
              <button
                type="button"
                onClick={resetAndClose}
                className="flex-1 py-3 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
