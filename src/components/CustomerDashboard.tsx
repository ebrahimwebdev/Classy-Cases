import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Heart,
  History,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import { formatFirebaseAuthError, useFirebaseAuth } from '../context/FirebaseAuthContext';
import { formatTaka, type PhoneCaseProduct } from '../models/phoneCase';
import { subscribeCustomerOrdersFromFirestore } from '../services/orderFirestore';
import {
  deleteCustomerAddressApi,
  fetchAccountOrders,
  saveCustomerAddressApi,
  saveCustomerProfile,
} from '../services/userAccountService';
import type {
  CustomerProfile,
  CustomerSavedAddress,
  FulfillmentStatus,
  Order,
  OrderItem,
} from '../types';
import { MyOrdersSection } from './MyOrdersSection';

export type CustomerDashboardTab =
  | 'profile'
  | 'orders'
  | 'history'
  | 'tracking'
  | 'wishlist'
  | 'addresses'
  | 'settings';

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

interface CustomerDashboardProps {
  products: PhoneCaseProduct[];
  wishlistProducts: PhoneCaseProduct[];
  profile: CustomerProfile | null;
  initialTab?: CustomerDashboardTab;
  onTabChange?: (tab: CustomerDashboardTab) => void;
  onBackToShop: () => void;
  onProfileUpdated: (next: CustomerProfile) => void;
  onOpenAuthModal: () => void;
  onAddToCart: (product: PhoneCaseProduct) => void;
  onSelectProduct: (product: PhoneCaseProduct) => void;
  onToggleWishlist: (productId: string) => void;
  onClearWishlist: () => void;
  onBuyAgain: (items: OrderItem[]) => void;
}

function formatDate(iso: string): string {
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

export function CustomerDashboard({
  products,
  wishlistProducts,
  profile,
  initialTab = 'profile',
  onTabChange,
  onBackToShop,
  onProfileUpdated,
  onOpenAuthModal,
  onAddToCart,
  onSelectProduct,
  onToggleWishlist,
  onClearWishlist,
  onBuyAgain,
}: CustomerDashboardProps) {
  const {
    user,
    idToken,
    loading: authLoading,
    updateAuthDisplayName,
    sendVerificationEmail,
    sendPasswordReset,
    signOutUser,
  } = useFirebaseAuth();

  const [activeTab, setActiveTab] = useState<CustomerDashboardTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = (tab: CustomerDashboardTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Real customer orders synced from Express + Firestore
  const [backendOrders, setBackendOrders] = useState<Order[]>([]);
  const [firestoreOrders, setFirestoreOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!idToken) {
      setBackendOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const list = await fetchAccountOrders(idToken);
      setBackendOrders(list);
    } catch {
      // Keep current list on transient error
    } finally {
      setOrdersLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!user) {
      setFirestoreOrders([]);
      return;
    }
    const unsub = subscribeCustomerOrdersFromFirestore(
      user.uid,
      (list) => setFirestoreOrders(list),
      () => {}
    );
    return () => unsub();
  }, [user]);

  const orders = useMemo(() => {
    const map = new Map<string, Order>();
    for (const o of firestoreOrders) map.set(o.id, o);
    for (const o of backendOrders) map.set(o.id, o);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [backendOrders, firestoreOrders]);

  const isDeactivated = profile?.status === 'deactivated';

  // Profile editing state
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || user?.displayName || '');
      setPhone(profile.phone || '');
      setDistrict(profile.district || '');
      setAddress(profile.address || '');
      setDeliveryArea(profile.deliveryArea === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka');
    } else if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [profile, user]);

  // Saved addresses state
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('Dhaka');
  const [addrLine, setAddrLine] = useState('');
  const [addrArea, setAddrArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [addrDefault, setAddrDefault] = useState(false);
  const [addrBusy, setAddrBusy] = useState(false);
  const [addrMsg, setAddrMsg] = useState('');
  const [addrErr, setAddrErr] = useState('');

  // Account settings state
  const [verifySent, setVerifySent] = useState(false);
  const [resetSentMsg, setResetSentMsg] = useState('');
  const [settingsErr, setSettingsErr] = useState('');

  // Order history filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState<'all' | FulfillmentStatus>('all');

  const filteredHistoryOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (historyStatus !== 'all' && ord.fulfillmentStatus !== historyStatus) return false;
      if (historySearch.trim()) {
        const q = historySearch.trim().toLowerCase();
        const hay = [
          ord.orderNumber,
          ord.customerName,
          ord.customerPhone,
          ord.deliveryAddress,
          ...ord.items.map((i) => `${i.title} ${i.model}`),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, historySearch, historyStatus]);

  const savedAddresses: CustomerSavedAddress[] = useMemo(() => {
    if (profile?.addresses && profile.addresses.length > 0) return profile.addresses;
    if (profile?.address?.trim()) {
      return [
        {
          id: 'default-profile-addr',
          label: 'Default',
          recipientName: profile.displayName || '',
          phone: profile.phone || '',
          district: profile.district || '',
          address: profile.address,
          deliveryArea: profile.deliveryArea || 'inside_dhaka',
          isDefault: true,
        },
      ];
    }
    return [];
  }, [profile]);

  const totalSpent = useMemo(
    () =>
      orders
        .filter((o) => o.fulfillmentStatus !== 'cancelled')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [orders]
  );

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user || isDeactivated) return;
    setProfileErr('');
    setProfileMsg('');
    setSavingProfile(true);
    try {
      const updated = await saveCustomerProfile(user, idToken, {
        displayName,
        phone,
        district,
        address,
        deliveryArea,
      });
      if (displayName.trim() && displayName.trim() !== (user.displayName || '')) {
        await updateAuthDisplayName(displayName.trim());
      }
      onProfileUpdated(updated);
      setProfileMsg('Profile information saved successfully.');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  function openNewAddressForm() {
    setEditingAddrId(null);
    setAddrLabel('Home');
    setAddrRecipient(profile?.displayName || user?.displayName || '');
    setAddrPhone(profile?.phone || '');
    setAddrDistrict(profile?.district || 'Dhaka');
    setAddrLine('');
    setAddrArea('inside_dhaka');
    setAddrDefault(savedAddresses.length === 0);
    setAddrErr('');
    setAddrMsg('');
    setAddressFormOpen(true);
  }

  function openEditAddressForm(entry: CustomerSavedAddress) {
    setEditingAddrId(entry.id === 'default-profile-addr' ? null : entry.id);
    setAddrLabel(entry.label || 'Home');
    setAddrRecipient(entry.recipientName || profile?.displayName || '');
    setAddrPhone(entry.phone || profile?.phone || '');
    setAddrDistrict(entry.district || '');
    setAddrLine(entry.address);
    setAddrArea(entry.deliveryArea === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka');
    setAddrDefault(Boolean(entry.isDefault));
    setAddrErr('');
    setAddrMsg('');
    setAddressFormOpen(true);
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !idToken || isDeactivated) return;
    setAddrErr('');
    setAddrMsg('');
    if (addrLine.trim().length < 4) {
      setAddrErr('Please enter a complete street/house address.');
      return;
    }
    setAddrBusy(true);
    try {
      const updatedProfile = await saveCustomerAddressApi(user, idToken, {
        ...(editingAddrId ? { id: editingAddrId } : {}),
        label: addrLabel.trim() || 'Home',
        recipientName: addrRecipient.trim(),
        phone: addrPhone.trim(),
        district: addrDistrict.trim(),
        address: addrLine.trim(),
        deliveryArea: addrArea,
        isDefault: addrDefault,
      });
      onProfileUpdated(updatedProfile);
      setAddressFormOpen(false);
      setAddrMsg('Delivery address saved.');
    } catch (err) {
      setAddrErr(err instanceof Error ? err.message : 'Failed to save address.');
    } finally {
      setAddrBusy(false);
    }
  }

  async function handleSetDefaultAddress(entry: CustomerSavedAddress) {
    if (!user || !idToken || isDeactivated || entry.isDefault) return;
    setAddrBusy(true);
    setAddrErr('');
    setAddrMsg('');
    try {
      const updatedProfile = await saveCustomerAddressApi(user, idToken, {
        ...entry,
        isDefault: true,
      });
      onProfileUpdated(updatedProfile);
      setAddrMsg(`"${entry.label}" set as your default delivery address.`);
    } catch (err) {
      setAddrErr(err instanceof Error ? err.message : 'Could not update default address.');
    } finally {
      setAddrBusy(false);
    }
  }

  async function handleDeleteAddress(addressId: string) {
    if (!user || !idToken || isDeactivated) return;
    setAddrBusy(true);
    setAddrErr('');
    setAddrMsg('');
    try {
      const updatedProfile = await deleteCustomerAddressApi(user, idToken, addressId);
      onProfileUpdated(updatedProfile);
      setAddrMsg('Saved address removed.');
    } catch (err) {
      setAddrErr(err instanceof Error ? err.message : 'Could not remove address.');
    } finally {
      setAddrBusy(false);
    }
  }

  async function handleSendPasswordReset() {
    if (!user?.email) return;
    setSettingsErr('');
    setResetSentMsg('');
    try {
      await sendPasswordReset(user.email);
      setResetSentMsg(`Password reset email sent to ${user.email}. Check your inbox.`);
    } catch (err) {
      setSettingsErr(formatFirebaseAuthError(err));
    }
  }

  async function handleSendVerification() {
    setSettingsErr('');
    try {
      await sendVerificationEmail();
      setVerifySent(true);
    } catch (err) {
      setSettingsErr(formatFirebaseAuthError(err));
    }
  }

  const navItems: { id: CustomerDashboardTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'profile', label: 'My Profile', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'orders', label: 'My Orders', icon: <Package className="w-4 h-4" />, badge: orders.length || undefined },
    { id: 'history', label: 'Order History', icon: <History className="w-4 h-4" /> },
    { id: 'tracking', label: 'Track My Orders', icon: <Truck className="w-4 h-4" /> },
    { id: 'wishlist', label: 'My Wishlist', icon: <Heart className="w-4 h-4" />, badge: wishlistProducts.length || undefined },
    { id: 'addresses', label: 'Saved Addresses', icon: <MapPin className="w-4 h-4" />, badge: savedAddresses.length || undefined },
    { id: 'settings', label: 'Account Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  if (authLoading) {
    return (
      <section className="max-w-[1180px] mx-auto px-4 sm:px-8 py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#650108]" />
        <p className="text-sm text-[#6B4C4E]">Loading your customer dashboard...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="max-w-[1180px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <button
          type="button"
          onClick={onBackToShop}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#650108] hover:underline mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Storefront</span>
        </button>

        <div className="max-w-lg mx-auto rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#650108] text-[#F2E8D2] flex items-center justify-center mx-auto">
            <UserIcon className="w-7 h-7" />
          </div>
          <h1 className="font-brand text-2xl font-semibold text-[#650108]">
            Sign in to Your Account
          </h1>
          <p className="text-sm text-[#6B4C4E] leading-relaxed">
            Access your saved delivery addresses, wishlist, synced order history, and real-time order tracking.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-6 py-3 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106] transition-colors cursor-pointer"
            >
              Sign In / Create Account
            </button>
            <button
              type="button"
              onClick={onBackToShop}
              className="px-5 py-3 rounded-xl border border-[#DFCFB0] bg-[#FAF4E6] text-[#650108] text-sm font-semibold hover:bg-[#EADEC2] transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Customer Dashboard"
      className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-16 space-y-6"
    >
      {/* Top Breadcrumb & Back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToShop}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#650108] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shop</span>
          </button>
          <span className="text-[#DFCFB0]">|</span>
          <h1 className="font-brand text-2xl sm:text-3xl font-semibold text-[#650108]">
            Customer Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={async () => {
            await signOutUser();
            onBackToShop();
          }}
          className="px-3.5 py-2 rounded-xl border border-[#DFCFB0] bg-[#FFFDF8] hover:bg-[#FAF4E6] text-xs font-semibold text-[#6B4C4E] hover:text-[#650108] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Deactivated Account Notice */}
      {isDeactivated && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <div className="font-bold">Account Deactivated</div>
            <p>
              Your customer account has been deactivated by an administrator. Profile updates, address changes, and new checkouts using this account are currently disabled. You can still view your existing order history.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-4 space-y-4">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-[#DFCFB0] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#650108] text-[#F2E8D2] text-lg font-bold flex items-center justify-center shrink-0">
                  {(displayName || user.email || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[#2B1416] truncate">
                  {profile?.displayName || user.displayName || 'Customer'}
                </div>
                <div className="text-xs text-[#6B4C4E] truncate">{user.email}</div>
                <span
                  className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                    isDeactivated
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {isDeactivated ? 'Deactivated' : 'Active Account'}
                </span>
              </div>
            </div>

            {/* Quick Account Stats */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EDE2C9] text-center">
              <div className="p-2 rounded-xl bg-[#FAF4E6]">
                <div className="text-base font-bold text-[#650108] tabular-nums">{orders.length}</div>
                <div className="text-[11px] text-[#6B4C4E]">Orders</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF4E6]">
                <div className="text-base font-bold text-[#650108] tabular-nums">{formatTaka(totalSpent)}</div>
                <div className="text-[11px] text-[#6B4C4E]">Total Spent</div>
              </div>
            </div>

            {/* Menu Items */}
            <nav aria-label="Customer dashboard sections" className="space-y-1">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchTab(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#650108] text-[#F2E8D2]'
                        : 'text-[#2B1416] hover:bg-[#FAF4E6] hover:text-[#650108]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                          active ? 'bg-[#F2E8D2] text-[#650108]' : 'bg-[#EADEC2] text-[#650108]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Panel */}
        <div className="lg:col-span-9 space-y-5">
          {/* 1. MY PROFILE */}
          {activeTab === 'profile' && (
            <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#EDE2C9]">
                <div>
                  <h2 className="font-brand text-xl font-semibold text-[#650108]">My Profile</h2>
                  <p className="text-xs text-[#6B4C4E]">
                    Update your contact information and primary delivery preferences.
                  </p>
                </div>
                {profile?.createdAt && (
                  <span className="text-xs text-[#6B4C4E]">
                    Member since {formatDate(profile.createdAt)}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B1416] mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      disabled={isDeactivated}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] disabled:bg-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B1416] mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8E6F70] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        disabled
                        value={user.email || ''}
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-[#FAF4E6] text-[#6B4C4E]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B1416] mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8E6F70] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        maxLength={32}
                        disabled={isDeactivated}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] disabled:bg-stone-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B1416] mb-1.5">
                      District
                    </label>
                    <select
                      disabled={isDeactivated}
                      value={district}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDistrict(val);
                        if (val === 'Dhaka') setDeliveryArea('inside_dhaka');
                        else if (val) setDeliveryArea('outside_dhaka');
                      }}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] disabled:bg-stone-100"
                    >
                      <option value="">Select district</option>
                      {BANGLADESH_DISTRICTS.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#2B1416] mb-1.5">
                      Default Street / Area Address
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      disabled={isDeactivated}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House, road, area, thana"
                      className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] disabled:bg-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2B1416] mb-1.5">
                      Delivery Zone
                    </label>
                    <select
                      disabled={isDeactivated}
                      value={deliveryArea}
                      onChange={(e) =>
                        setDeliveryArea(
                          e.target.value === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka'
                        )
                      }
                      className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108] disabled:bg-stone-100"
                    >
                      <option value="inside_dhaka">Inside Dhaka</option>
                      <option value="outside_dhaka">Outside Dhaka</option>
                    </select>
                  </div>
                </div>

                {profileErr && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    {profileErr}
                  </div>
                )}
                {profileMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{profileMsg}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile || isDeactivated}
                    className="px-6 py-2.5 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106] transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. MY ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-[#6B4C4E] font-semibold">
                    Total Orders
                  </div>
                  <div className="text-2xl font-bold text-[#650108] mt-1 tabular-nums">{orders.length}</div>
                </div>
                <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-[#6B4C4E] font-semibold">
                    In Progress
                  </div>
                  <div className="text-2xl font-bold text-indigo-700 mt-1 tabular-nums">
                    {orders.filter((o) => ['pending', 'confirmed', 'shipped'].includes(o.fulfillmentStatus)).length}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-[#6B4C4E] font-semibold">
                    Delivered
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                    {orders.filter((o) => o.fulfillmentStatus === 'delivered').length}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-[#6B4C4E] font-semibold">
                    Total Spent
                  </div>
                  <div className="text-2xl font-bold text-[#650108] mt-1 tabular-nums">
                    {formatTaka(totalSpent)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-brand text-xl font-semibold text-[#650108]">My Recent Orders</h2>
                    <p className="text-xs text-[#6B4C4E]">
                      Orders linked to your Classy Cases account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchTab('tracking')}
                    className="px-3.5 py-2 rounded-xl bg-[#EADEC2] hover:bg-[#DFCFB0] text-xs font-semibold text-[#650108] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Track Orders Live</span>
                  </button>
                </div>

                {ordersLoading && orders.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#6B4C4E]">
                    <Loader2 className="w-5 h-5 animate-spin text-[#650108]" />
                    <span>Loading your orders...</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF4E6] text-[#650108] flex items-center justify-center mx-auto">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-[#650108]">No orders placed yet</div>
                    <p className="text-xs text-[#6B4C4E] max-w-sm mx-auto">
                      Once you place an order while signed in, it will appear here with instant status updates.
                    </p>
                    <button
                      type="button"
                      onClick={onBackToShop}
                      className="px-5 py-2.5 rounded-xl bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] cursor-pointer"
                    >
                      Explore Phone Cases
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 6).map((ord) => {
                      const badge = getStatusBadge(ord.fulfillmentStatus);
                      return (
                        <div
                          key={ord.id}
                          className="rounded-xl border border-[#EDE2C9] bg-[#FAF4E6]/50 p-4 flex flex-wrap items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-bold text-[#650108]">
                                #{ord.orderNumber}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badge.className}`}>
                                {badge.label}
                              </span>
                              <span className="text-xs text-[#6B4C4E]">{formatDate(ord.createdAt)}</span>
                            </div>
                            <div className="text-xs text-[#2B1416] truncate">
                              {ord.items.map((i) => `${i.title} (${i.model}) ×${i.quantity}`).join(', ')}
                            </div>
                            <div className="text-[11px] text-[#6B4C4E] truncate">
                              {ord.deliveryAddress}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="font-bold text-sm text-[#650108] tabular-nums">
                                {formatTaka(ord.total)}
                              </div>
                              <div className="text-[11px] uppercase text-[#6B4C4E]">
                                {ord.paymentMethod} · {ord.paymentStatus}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onBuyAgain(ord.items)}
                              className="px-3 py-2 rounded-lg border border-[#DFCFB0] bg-white hover:border-[#650108] text-xs font-semibold text-[#650108] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Buy Again</span>
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

          {/* 3. ORDER HISTORY */}
          {activeTab === 'history' && (
            <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-brand text-xl font-semibold text-[#650108]">Order History</h2>
                  <p className="text-xs text-[#6B4C4E]">
                    Search and filter all past and current orders on your account.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Order # or product..."
                    className="px-3 py-1.5 text-xs border border-[#DFCFB0] rounded-lg bg-white focus:outline-none focus:border-[#650108]"
                  />
                  <select
                    value={historyStatus}
                    onChange={(e) => setHistoryStatus(e.target.value as 'all' | FulfillmentStatus)}
                    className="px-3 py-1.5 text-xs border border-[#DFCFB0] rounded-lg bg-white focus:outline-none focus:border-[#650108]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {filteredHistoryOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#6B4C4E]">
                  No matching orders found in your history.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistoryOrders.map((ord) => {
                    const badge = getStatusBadge(ord.fulfillmentStatus);
                    return (
                      <div key={ord.id} className="rounded-xl border border-[#DFCFB0] bg-white p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#EDE2C9]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#650108]">
                              Order #{ord.orderNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badge.className}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs text-[#6B4C4E]">{formatDate(ord.createdAt)}</span>
                          </div>
                          <div className="font-bold text-sm text-[#650108] tabular-nums">
                            {formatTaka(ord.total)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {ord.items.map((item, idx) => (
                            <div key={`${item.productId}-${idx}`} className="flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-10 h-10 rounded-lg object-cover border border-[#EDE2C9] shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-[#2B1416] truncate">{item.title}</div>
                                  <div className="text-[11px] text-[#6B4C4E]">
                                    Model: {item.model} · Qty: {item.quantity}
                                  </div>
                                </div>
                              </div>
                              <span className="font-semibold tabular-nums text-[#2B1416]">
                                {formatTaka(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-[#EDE2C9] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-[#6B4C4E] truncate max-w-md">
                            Deliver to: {ord.deliveryAddress}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => switchTab('tracking')}
                              className="px-3 py-1.5 rounded-lg bg-[#FAF4E6] hover:bg-[#EADEC2] font-semibold text-[#650108] cursor-pointer"
                            >
                              Track Shipment
                            </button>
                            <button
                              type="button"
                              onClick={() => onBuyAgain(ord.items)}
                              className="px-3 py-1.5 rounded-lg bg-[#650108] text-[#F2E8D2] hover:bg-[#4D0106] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Order Again</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. TRACK MY ORDERS */}
          {activeTab === 'tracking' && (
            <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] overflow-hidden">
              <MyOrdersSection
                products={products}
                initialTab="tracking"
                onBackToShop={() => switchTab('orders')}
                onBuyAgain={onBuyAgain}
              />
            </div>
          )}

          {/* 5. MY WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EDE2C9]">
                <div>
                  <h2 className="font-brand text-xl font-semibold text-[#650108]">
                    My Wishlist ({wishlistProducts.length})
                  </h2>
                  <p className="text-xs text-[#6B4C4E]">
                    Phone cases you have saved to your favorites list.
                  </p>
                </div>
                {wishlistProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearWishlist}
                    className="text-xs font-semibold text-[#6B4C4E] hover:text-[#650108] cursor-pointer"
                  >
                    Clear Wishlist
                  </button>
                )}
              </div>

              {wishlistProducts.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF4E6] text-[#650108] flex items-center justify-center mx-auto">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-[#650108]">Your wishlist is empty</div>
                  <p className="text-xs text-[#6B4C4E] max-w-sm mx-auto">
                    Save cases with the heart icon while browsing to compare and purchase them later.
                  </p>
                  <button
                    type="button"
                    onClick={onBackToShop}
                    className="px-5 py-2.5 rounded-xl bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] cursor-pointer"
                  >
                    Browse Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wishlistProducts.map((p) => (
                    <div key={p.id} className="rounded-xl border border-[#DFCFB0] bg-white overflow-hidden flex flex-col">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(p)}
                        className="aspect-square bg-[#FAF4E6] overflow-hidden cursor-pointer"
                      >
                        <img
                          src={p.image}
                          alt={p.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </button>
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B4C4E]">
                            {p.category}
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectProduct(p)}
                            className="text-left text-sm font-semibold text-[#2B1416] hover:text-[#650108] line-clamp-2 mt-0.5 cursor-pointer"
                          >
                            {p.title}
                          </button>
                          <div className="mt-1 font-bold text-sm text-[#650108] tabular-nums">
                            {formatTaka(p.price)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAddToCart(p)}
                            className="flex-1 py-2 rounded-lg bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Bag</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleWishlist(p.id)}
                            aria-label="Remove from wishlist"
                            className="p-2 rounded-lg border border-[#DFCFB0] text-[#6B4C4E] hover:text-red-600 hover:border-red-200 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. SAVED ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EDE2C9]">
                <div>
                  <h2 className="font-brand text-xl font-semibold text-[#650108]">Saved Delivery Addresses</h2>
                  <p className="text-xs text-[#6B4C4E]">
                    Save up to 10 delivery addresses for one-click checkout.
                  </p>
                </div>
                {!isDeactivated && savedAddresses.length < 10 && (
                  <button
                    type="button"
                    onClick={openNewAddressForm}
                    className="px-4 py-2 rounded-xl bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {addrErr && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {addrErr}
                </div>
              )}
              {addrMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{addrMsg}</span>
                </div>
              )}

              {addressFormOpen && (
                <form onSubmit={handleSaveAddress} className="rounded-xl border border-[#DFCFB0] bg-[#FAF4E6] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#650108]">
                      {editingAddrId ? 'Edit Saved Address' : 'Add Delivery Address'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setAddressFormOpen(false)}
                      className="text-xs font-semibold text-[#6B4C4E] hover:text-[#650108] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2B1416] mb-1">Label</label>
                      <input
                        type="text"
                        required
                        maxLength={40}
                        value={addrLabel}
                        onChange={(e) => setAddrLabel(e.target.value)}
                        placeholder="Home, Office, Hostel..."
                        className="w-full px-3 py-2 text-xs border border-[#DFCFB0] rounded-lg bg-white focus:outline-none focus:border-[#650108]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2B1416] mb-1">Recipient Name</label>
                      <input
                        type="text"
                        maxLength={80}
                        value={addrRecipient}
                        onChange={(e) => setAddrRecipient(e.target.value)}
                        placeholder="Full name"
                        className="w-full px-3 py-2 text-xs border border-[#DFCFB0] rounded-lg bg-white focus:outline-none focus:border-[#650108]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2B1416] mb-1">Phone Number</label>
                      <input
                        type="tel"
                        maxLength={32}
                        value={addrPhone}
                        onChange={(e) => setAddrPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3 py-2 text-xs border border-[#DFCFB0] rounded-lg bg-white focus:outline-none focus:border-[#650108]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2B1416] mb-1">District</label>
                      <select
                        value={addrDistrict}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAddrDistrict(v);
                          if (v === 'Dhaka') setAddrArea('inside_dhaka');
                          else if (v) setAddrArea('outside_dhaka');
                        }}
                        className="w-full px-3 py-2 text-xs border border-[#DFCFB0] rounded-lg bg-white focus:outline-none focus:border-[#650108]"
                      >
                        <option value="">Select district</option>
                        {BANGLADESH_DISTRICTS.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2B1416] mb-1">Delivery Zone</label>
                      <select
                        value={addrArea}
                        onChange={(e) =>
                          setAddrArea(e.target.value === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka')
                        }
                        className="w-full px-3 py-2 text-xs border border-[#DFCFB0] rounded-lg bg-white focus:outline-none focus:border-[#650108]"
                      >
                        <option value="inside_dhaka">Inside Dhaka</option>
                        <option value="outside_dhaka">Outside Dhaka</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B1416] mb-1">Street / Area Address</label>
                    <textarea
                      rows={2}
                      required
                      maxLength={300}
                      value={addrLine}
                      onChange={(e) => setAddrLine(e.target.value)}
                      placeholder="House, road, block/sector, thana..."
                      className="w-full px-3 py-2 text-xs border border-[#DFCFB0] rounded-lg bg-white focus:outline-none focus:border-[#650108]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-[#2B1416] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addrDefault}
                        onChange={(e) => setAddrDefault(e.target.checked)}
                        className="rounded border-[#DFCFB0] text-[#650108]"
                      />
                      <span>Set as default delivery address</span>
                    </label>
                    <button
                      type="submit"
                      disabled={addrBusy}
                      className="px-5 py-2 rounded-lg bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {addrBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Address</span>
                    </button>
                  </div>
                </form>
              )}

              {savedAddresses.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF4E6] text-[#650108] flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-[#650108]">No saved addresses yet</div>
                  <p className="text-xs text-[#6B4C4E]">
                    Add your home or office address to speed up checkout.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedAddresses.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-xl border p-4 space-y-2.5 ${
                        entry.isDefault
                          ? 'border-[#650108] bg-[#FAF4E6]/70'
                          : 'border-[#DFCFB0] bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#EADEC2] text-[#650108] text-xs font-bold">
                            {entry.label}
                          </span>
                          {entry.isDefault && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-[#6B4C4E]">
                          {entry.deliveryArea === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-[#2B1416]">
                        {entry.recipientName && <div className="font-semibold">{entry.recipientName}</div>}
                        {entry.phone && <div className="font-mono text-[#6B4C4E]">{entry.phone}</div>}
                        <div className="leading-relaxed">
                          {entry.address}
                          {entry.district ? `, ${entry.district}` : ''}
                        </div>
                      </div>

                      {!isDeactivated && (
                        <div className="pt-2 border-t border-[#EDE2C9] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openEditAddressForm(entry)}
                              className="font-semibold text-[#650108] hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                            {entry.id !== 'default-profile-addr' && (
                              <button
                                type="button"
                                disabled={addrBusy}
                                onClick={() => handleDeleteAddress(entry.id)}
                                className="font-semibold text-red-600 hover:underline cursor-pointer disabled:opacity-50"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {!entry.isDefault && entry.id !== 'default-profile-addr' && (
                            <button
                              type="button"
                              disabled={addrBusy}
                              onClick={() => handleSetDefaultAddress(entry)}
                              className="font-semibold text-[#6B4C4E] hover:text-[#650108] cursor-pointer disabled:opacity-50"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. ACCOUNT SETTINGS */}
          {activeTab === 'settings' && (
            <div className="rounded-2xl border border-[#DFCFB0] bg-[#FFFDF8] p-5 sm:p-6 space-y-5">
              <div className="pb-3 border-b border-[#EDE2C9]">
                <h2 className="font-brand text-xl font-semibold text-[#650108]">Account Settings &amp; Security</h2>
                <p className="text-xs text-[#6B4C4E]">
                  Manage email verification, password reset, and account session.
                </p>
              </div>

              {settingsErr && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {settingsErr}
                </div>
              )}
              {resetSentMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resetSentMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[#EDE2C9] bg-[#FAF4E6]/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-[#2B1416] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#650108]" />
                      <span>Email Verification</span>
                    </div>
                    <p className="text-xs text-[#6B4C4E]">
                      {user.emailVerified
                        ? `${user.email} is verified. Guest orders placed with this email automatically sync.`
                        : verifySent
                          ? 'Verification link sent. Please check your inbox and refresh.'
                          : 'Verify your email address to link historical guest orders.'}
                    </p>
                  </div>
                  {user.emailVerified ? (
                    <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                      Verified
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={verifySent}
                      onClick={handleSendVerification}
                      className="px-4 py-2 rounded-lg bg-[#650108] text-[#F2E8D2] text-xs font-semibold hover:bg-[#4D0106] disabled:opacity-50 cursor-pointer"
                    >
                      {verifySent ? 'Email Sent' : 'Send Verification Email'}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-[#EDE2C9] bg-[#FAF4E6]/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-[#2B1416] flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#650108]" />
                      <span>Password Reset</span>
                    </div>
                    <p className="text-xs text-[#6B4C4E]">
                      Send a secure Firebase password reset link to {user.email || 'your email'}.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!user.email}
                    onClick={handleSendPasswordReset}
                    className="px-4 py-2 rounded-lg border border-[#DFCFB0] bg-white hover:border-[#650108] text-xs font-semibold text-[#650108] cursor-pointer disabled:opacity-50"
                  >
                    Send Password Reset Email
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-[#EDE2C9] bg-[#FAF4E6]/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-[#2B1416]">Account Status</div>
                    <p className="text-xs text-[#6B4C4E]">
                      {isDeactivated
                        ? 'Your account is currently deactivated. Contact store support for assistance.'
                        : 'Your account is active and eligible for checkout and live order tracking.'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg border text-xs font-bold uppercase ${
                      isDeactivated
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isDeactivated ? 'Deactivated' : 'Active'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
