import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  formatFirebaseAuthError,
  useFirebaseAuth,
} from '../context/FirebaseAuthContext';
import { saveCustomerProfile } from '../services/userAccountService';
import type { CustomerProfile, OrderItem } from '../types';
import { CustomerAuthPanel } from './CustomerAuthPanel';

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

interface CustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CustomerProfile | null;
  onProfileUpdated: (next: CustomerProfile) => void;
  onOpenMyOrders: () => void;
  onOpenDashboard?: () => void;
  onBuyAgain?: (items: OrderItem[]) => void;
}

export function CustomerAccountModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  onOpenMyOrders,
  onOpenDashboard,
  onBuyAgain,
}: CustomerAccountModalProps) {
  const {
    user,
    idToken,
    loading: authLoading,
    updateAuthDisplayName,
    sendVerificationEmail,
    signOutUser,
  } = useFirebaseAuth();

  const [signedInTab, setSignedInTab] = useState<'orders' | 'profile'>('orders');

  // Signed-in profile draft
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [verifySent, setVerifySent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setProfileMsg('');
    setProfileErr('');
  }, [isOpen]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || user?.displayName || '');
      setPhone(profile.phone || '');
      setDistrict(profile.district || '');
      setAddress(profile.address || '');
      setDeliveryArea(profile.deliveryArea === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka');
    } else if (user) {
      setDisplayName(user.displayName || '');
      setPhone('');
      setDistrict('');
      setAddress('');
      setDeliveryArea('inside_dhaka');
    }
  }, [profile, user]);

  if (!isOpen) return null;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user || profile?.status === 'deactivated') return;
    setProfileErr('');
    setProfileMsg('');
    setSavingProfile(true);
    try {
      const saved = await saveCustomerProfile(user, idToken, {
        displayName,
        phone,
        district,
        address,
        deliveryArea,
      });
      if (displayName.trim() && displayName.trim() !== (user.displayName || '')) {
        await updateAuthDisplayName(displayName.trim());
      }
      onProfileUpdated(saved);
      setProfileMsg('Profile saved for faster checkout.');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSendVerification() {
    setProfileErr('');
    try {
      await sendVerificationEmail();
      setVerifySent(true);
    } catch (err) {
      setProfileErr(formatFirebaseAuthError(err));
    }
  }

  async function handleSignOut() {
    setProfileErr('');
    setProfileMsg('');
    try {
      await signOutUser();
      onClose();
    } catch (err) {
      setProfileErr(formatFirebaseAuthError(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={user ? 'Customer Account & Order History' : 'Customer Sign In'}
        className="relative z-10 w-full max-w-xl max-h-[92vh] overflow-y-auto bg-[#FAF4E6] border border-[#DFCFB0] rounded-2xl shadow-2xl text-[#2B1416]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DFCFB0] flex items-center justify-between sticky top-0 bg-[#FAF4E6] z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#650108] text-[#F2E8D2] flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-brand text-xl font-semibold text-[#650108] leading-tight">
                {user ? 'My Account & Orders' : 'Customer Sign In'}
              </h2>
              <p className="text-[11px] text-[#6B4C4E]">
                {user
                  ? 'View your order history, live tracking, and saved delivery profile'
                  : 'Sign in to view your synced order history and delivery profile'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="p-2 rounded-lg text-[#6B4C4E] hover:text-[#650108] hover:bg-[#650108]/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {authLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#650108]" />
              <p className="text-xs text-[#6B4C4E]">Checking account session...</p>
            </div>
          ) : !user ? (
            <CustomerAuthPanel />
          ) : (
            <div className="space-y-4">
              {/* Account Header Card */}
              <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#DFCFB0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-[#DFCFB0] shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#650108] text-[#F2E8D2] text-base font-bold flex items-center justify-center shrink-0">
                      {(displayName || user.email || 'U').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#2B1416] truncate">
                      {displayName || user.displayName || 'Customer'}
                    </div>
                    <div className="text-xs text-[#6B4C4E] truncate flex items-center gap-1.5">
                      <span>{user.email}</span>
                      {user.emailVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onOpenDashboard && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDashboard();
                      }}
                      className="px-3 py-2 rounded-lg bg-[#650108] hover:bg-[#4D0106] text-xs font-semibold text-[#F2E8D2] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Dashboard</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3 py-2 rounded-lg border border-[#DFCFB0] bg-white hover:bg-[#FAF4E6] text-xs font-semibold text-[#6B4C4E] hover:text-[#650108] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>

              {profile?.status === 'deactivated' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Account Deactivated</div>
                    <p className="mt-0.5 text-rose-700 leading-relaxed">
                      Your customer account is currently deactivated by an administrator. Profile updates and new orders are disabled until reactivated.
                    </p>
                  </div>
                </div>
              )}

              {!user.emailVerified && user.email && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>
                      {verifySent
                        ? 'Verification email sent. Please check your inbox.'
                        : 'Verify your email to match past guest orders.'}
                    </span>
                  </div>
                  {!verifySent && (
                    <button
                      type="button"
                      onClick={handleSendVerification}
                      className="font-semibold underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Verify Email
                    </button>
                  )}
                </div>
              )}

              {/* Switcher between Order History & Profile */}
              <div className="grid grid-cols-2 gap-1 bg-[#E4D5B7] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSignedInTab('orders')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                    signedInTab === 'orders'
                      ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                      : 'text-[#6B4C4E] hover:text-[#650108]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Order History</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignedInTab('profile')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                    signedInTab === 'profile'
                      ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                      : 'text-[#6B4C4E] hover:text-[#650108]'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Saved Profile</span>
                </button>
              </div>

              {signedInTab === 'orders' ? (
                <CustomerAuthPanel
                  showAccountHeader={false}
                  onOpenFullOrders={() => {
                    onClose();
                    onOpenMyOrders();
                  }}
                  onBuyAgain={
                    onBuyAgain
                      ? (items) => {
                          onBuyAgain(items);
                          onClose();
                        }
                      : undefined
                  }
                />
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4E]">
                    Saved Checkout &amp; Delivery Profile
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2B1416] mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-3 py-2 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2B1416] mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-[#8E6F70] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          maxLength={32}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2B1416] mb-1">
                        District
                      </label>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-[#8E6F70] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          value={district}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDistrict(val);
                            if (val === 'Dhaka') setDeliveryArea('inside_dhaka');
                            else if (val) setDeliveryArea('outside_dhaka');
                          }}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
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

                    <div>
                      <label className="block text-xs font-semibold text-[#2B1416] mb-1">
                        Delivery Zone
                      </label>
                      <select
                        value={deliveryArea}
                        onChange={(e) =>
                          setDeliveryArea(
                            e.target.value === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka'
                          )
                        }
                        className="w-full px-3 py-2 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                      >
                        <option value="inside_dhaka">Inside Dhaka</option>
                        <option value="outside_dhaka">Outside Dhaka</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B1416] mb-1">
                      Default Delivery Address
                    </label>
                    <textarea
                      rows={2}
                      maxLength={300}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House, road, area, thana"
                      className="w-full px-3 py-2 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                    />
                  </div>

                  {profileErr && (
                    <p className="text-xs text-red-600 font-medium">{profileErr}</p>
                  )}
                  {profileMsg && (
                    <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{profileMsg}</span>
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingProfile || profile?.status === 'deactivated'}
                      className="px-5 py-2.5 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106] transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Save Profile</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
