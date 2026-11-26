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
import type { CustomerProfile } from '../types';

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
}

export function CustomerAccountModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  onOpenMyOrders,
  onOpenDashboard,
}: CustomerAccountModalProps) {
  const {
    user,
    idToken,
    loading: authLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    updateAuthDisplayName,
    sendVerificationEmail,
    signOutUser,
  } = useFirebaseAuth();

  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

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
    setAuthError('');
    setAuthNotice('');
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

  async function handleGoogleAuth() {
    setAuthError('');
    setAuthNotice('');
    setAuthSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleEmailAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    setAuthSubmitting(true);
    try {
      if (authTab === 'signin') {
        await signInWithEmail(authEmail, authPassword);
      } else if (authTab === 'signup') {
        if (authName.trim().length < 2) {
          setAuthError('Please enter your full name.');
          setAuthSubmitting(false);
          return;
        }
        await signUpWithEmail(authName, authEmail, authPassword);
      } else {
        await sendPasswordReset(authEmail);
        setAuthNotice('Password reset link sent to your email.');
      }
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthSubmitting(false);
    }
  }

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
        aria-label={user ? 'Customer Account Profile' : 'Customer Sign In'}
        className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#FAF4E6] border border-[#DFCFB0] rounded-2xl shadow-2xl text-[#2B1416]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DFCFB0] flex items-center justify-between sticky top-0 bg-[#FAF4E6] z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#650108] text-[#F2E8D2] flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-brand text-xl font-semibold text-[#650108] leading-tight">
                {user ? 'My Account' : authTab === 'signup' ? 'Create Account' : authTab === 'reset' ? 'Reset Password' : 'Sign In'}
              </h2>
              <p className="text-[11px] text-[#6B4C4E]">
                {user
                  ? 'Manage saved delivery details and synced orders'
                  : 'Sync your delivery profile and order history across devices'}
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
            <div className="space-y-4">
              {/* Tabs */}
              <div className="grid grid-cols-2 gap-1 bg-[#E4D5B7] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signin');
                    setAuthError('');
                    setAuthNotice('');
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authTab === 'signin'
                      ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                      : 'text-[#6B4C4E] hover:text-[#650108]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signup');
                    setAuthError('');
                    setAuthNotice('');
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authTab === 'signup'
                      ? 'bg-[#650108] text-[#F2E8D2] shadow-xs'
                      : 'text-[#6B4C4E] hover:text-[#650108]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Google Button */}
              {authTab !== 'reset' && (
                <>
                  <button
                    type="button"
                    disabled={authSubmitting}
                    onClick={handleGoogleAuth}
                    className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#DFCFB0] hover:border-[#650108] text-sm font-semibold text-[#2B1416] inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.5 1.17-4.22 1.17-3.24 0-5.99-2.19-6.97-5.14H1.03v3.14C3.07 21.2 7.24 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.03 14.02c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.16H1.03A11.96 11.96 0 0 0 0 11.66c0 1.93.46 3.75 1.03 5.5l4-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.07 2.8 1.03 6.16l4 3.14C6.01 6.94 8.76 4.75 12 4.75Z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex items-center py-1">
                    <div className="flex-1 border-t border-[#DFCFB0]" />
                    <span className="px-3 text-[11px] font-medium uppercase tracking-wider text-[#8E6F70]">
                      or with email
                    </span>
                    <div className="flex-1 border-t border-[#DFCFB0]" />
                  </div>
                </>
              )}

              {authError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {authError}
                </div>
              )}
              {authNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{authNotice}</span>
                </div>
              )}

              <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
                {authTab === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#2B1416] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#2B1416] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                  />
                </div>

                {authTab !== 'reset' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#2B1416]">
                        Password
                      </label>
                      {authTab === 'signin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthTab('reset');
                            setAuthError('');
                            setAuthNotice('');
                          }}
                          className="text-[11px] font-medium text-[#650108] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder={authTab === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#DFCFB0] rounded-xl bg-white focus:outline-none focus:border-[#650108]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 rounded-xl bg-[#650108] text-[#F2E8D2] text-sm font-semibold hover:bg-[#4D0106] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {authSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {authTab === 'signin'
                      ? 'Sign In'
                      : authTab === 'signup'
                        ? 'Create Account'
                        : 'Send Reset Link'}
                  </span>
                </button>

                {authTab === 'reset' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('signin');
                      setAuthError('');
                      setAuthNotice('');
                    }}
                    className="w-full text-center text-xs font-medium text-[#6B4C4E] hover:text-[#650108] cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                )}
              </form>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Account Header Card */}
              <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#DFCFB0] flex items-center justify-between gap-3">
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
                    onClick={() => {
                      onClose();
                      onOpenMyOrders();
                    }}
                    className="px-3 py-2 rounded-lg bg-[#EADEC2] hover:bg-[#DFCFB0] text-xs font-semibold text-[#650108] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>My Orders</span>
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

              {/* Saved Profile Form */}
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

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3.5 py-2.5 rounded-xl border border-[#DFCFB0] bg-white hover:bg-[#FAF4E6] text-xs font-semibold text-[#6B4C4E] hover:text-[#650108] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
