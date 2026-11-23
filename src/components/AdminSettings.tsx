import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Bell,
  Box,
  Check,
  CreditCard,
  Database,
  FileText,
  Globe,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Layout,
  Loader2,
  Mail,
  Monitor,
  Palette,
  Percent,
  Plug,
  Printer,
  Receipt,
  Route,
  Ruler,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Trash2,
  Truck,
  Upload,
  User,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import type { StoreSettings } from '../types';
import {
  AdminSettingsPanels,
  type ExtendedSettingsTab,
} from './AdminSettingsPanels';

type SettingsTab =
  | 'General'
  | 'SEO'
  | 'Profile'
  | 'Users'
  | 'Theme'
  | 'Header'
  | 'Home Customization'
  | 'Store Pages'
  | 'Footer'
  | 'Shop Page'
  | 'Product Page'
  | 'Checkout'
  | 'Thank-you Page'
  | 'Product Reviews'
  | 'Size Guide'
  | 'Offer Page'
  | 'Popup Offer'
  | 'Order Sources'
  | 'Quick Notes'
  | 'Delivery Charges'
  | 'Shipping Classes & Weight'
  | 'Courier Integration'
  | 'Fraud Checking Accounts'
  | 'Storefront Payment'
  | 'Marketing Connections'
  | 'Email'
  | 'Security'
  | 'Notifications'
  | 'Print Templates'
  | 'Export / Import'
  | 'Store data'
  | 'Support access';

interface AdminSettingsProps {
  settings: StoreSettings;
  adminToken: string;
  onSettingsUpdated: (settings: StoreSettings) => void;
  onCloseToDashboard: () => void;
  onOpenStorefront: () => void;
}

export function AdminSettings({
  settings,
  adminToken,
  onSettingsUpdated,
  onCloseToDashboard,
  onOpenStorefront,
}: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('General');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  async function handleSave() {
    setSaving(true);
    setSavedBanner('');
    setErrorBanner('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Failed to save settings');
        return;
      }
      onSettingsUpdated(data.settings);
      setForm(data.settings);
      setSavedBanner('Settings saved and synced to live storefront.');
      setTimeout(() => setSavedBanner(''), 3000);
    } catch {
      setErrorBanner('Network error while saving settings');
    } finally {
      setSaving(false);
    }
  }

  const navGroups: {
    group: string;
    items: { label: SettingsTab; icon: React.ReactNode }[];
  }[] = [
    {
      group: 'General',
      items: [
        { label: 'General', icon: <Settings className="w-4 h-4" /> },
        { label: 'SEO', icon: <Globe className="w-4 h-4" /> },
        { label: 'Profile', icon: <User className="w-4 h-4" /> },
        { label: 'Users', icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Storefront',
      items: [
        { label: 'Theme', icon: <Palette className="w-4 h-4" /> },
        { label: 'Header', icon: <Layout className="w-4 h-4" /> },
        { label: 'Home Customization', icon: <Home className="w-4 h-4" /> },
        { label: 'Store Pages', icon: <FileText className="w-4 h-4" /> },
        { label: 'Footer', icon: <Monitor className="w-4 h-4" /> },
        { label: 'Shop Page', icon: <ShoppingBag className="w-4 h-4" /> },
        { label: 'Product Page', icon: <Box className="w-4 h-4" /> },
        { label: 'Checkout', icon: <ShoppingCart className="w-4 h-4" /> },
        { label: 'Thank-you Page', icon: <Receipt className="w-4 h-4" /> },
        { label: 'Product Reviews', icon: <Star className="w-4 h-4" /> },
        { label: 'Size Guide', icon: <Ruler className="w-4 h-4" /> },
        { label: 'Offer Page', icon: <Percent className="w-4 h-4" /> },
        { label: 'Popup Offer', icon: <ImageIcon className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Orders',
      items: [
        { label: 'Order Sources', icon: <Route className="w-4 h-4" /> },
        { label: 'Quick Notes', icon: <FileText className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Shipping & Delivery',
      items: [
        { label: 'Delivery Charges', icon: <Banknote className="w-4 h-4" /> },
        { label: 'Shipping Classes & Weight', icon: <Tag className="w-4 h-4" /> },
        { label: 'Courier Integration', icon: <Truck className="w-4 h-4" /> },
        { label: 'Fraud Checking Accounts', icon: <ShieldCheck className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Payments',
      items: [{ label: 'Storefront Payment', icon: <CreditCard className="w-4 h-4" /> }],
    },
    {
      group: 'Marketing',
      items: [{ label: 'Marketing Connections', icon: <Plug className="w-4 h-4" /> }],
    },
    {
      group: 'System',
      items: [
        { label: 'Email', icon: <Mail className="w-4 h-4" /> },
        { label: 'Security', icon: <Shield className="w-4 h-4" /> },
        { label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
        { label: 'Print Templates', icon: <Printer className="w-4 h-4" /> },
        { label: 'Export / Import', icon: <ArrowLeftRight className="w-4 h-4" /> },
        { label: 'Store data', icon: <Database className="w-4 h-4" /> },
        { label: 'Support access', icon: <UserCog className="w-4 h-4" /> },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);
  const query = searchTerm.trim().toLowerCase();
  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => item.label.toLowerCase().includes(query)),
    }))
    .filter((g) => g.items.length > 0);

  const extendedTabs: ExtendedSettingsTab[] = [
    'Shop Page',
    'Product Page',
    'Checkout',
    'Thank-you Page',
    'Product Reviews',
    'Size Guide',
    'Offer Page',
    'Popup Offer',
    'Order Sources',
    'Quick Notes',
    'Delivery Charges',
    'Shipping Classes & Weight',
    'Courier Integration',
    'Fraud Checking Accounts',
    'Marketing Connections',
    'Email',
    'Security',
    'Notifications',
    'Print Templates',
    'Export / Import',
    'Store data',
    'Support access',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fb] text-slate-900 overflow-x-hidden">
      {/* Top Bar matching Screenshot 3 */}
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
          <button
            type="button"
            onClick={onCloseToDashboard}
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            title="Back to Dashboard"
          >
            <Layout className="w-4 h-4" />
          </button>
          <span className="text-slate-500">Settings</span>
          <span className="text-slate-400">›</span>
          <span className="font-semibold text-slate-900 truncate">{activeTab}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenStorefront}
            title="Open Live Storefront"
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50"
          >
            <Store className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onCloseToDashboard}
            title="Back to Operations Dashboard"
            className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search settings..."
              className="bg-transparent text-xs w-full focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onCloseToDashboard}
            aria-label="Close settings"
            className="p-1.5 text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Settings Tab Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {allNavItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setActiveTab(item.label)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors ${
              activeTab === item.label
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Settings Sidebar */}
        <aside className="w-60 bg-[#fcfcfd] border-r border-slate-200 p-3 hidden md:flex flex-col gap-5 overflow-y-auto shrink-0">
          {filteredGroups.map((group) => (
            <div key={group.group}>
              <div className="px-2.5 text-[11px] font-medium text-slate-400 mb-1.5">{group.group}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActiveTab(item.label)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      activeTab === item.label
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Settings Content */}
        <main className="flex-1 p-5 sm:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-slate-900">{activeTab}</h1>
              <div className="flex items-center gap-3">
                {savedBanner && (
                  <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {savedBanner}
                  </span>
                )}
                {errorBanner && <span className="text-xs text-red-600">{errorBanner}</span>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>

            {activeTab === 'General' && (
              <div className="space-y-4">
                {/* Row 1: Site Info & Order Numbers */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-slate-900">Site Info</h2>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Store name</label>
                      <input
                        type="text"
                        value={form.storeName}
                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Tagline</label>
                      <textarea
                        rows={2}
                        value={form.tagline}
                        onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-slate-900">Order Numbers</h2>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Order number prefix</label>
                      <input
                        type="text"
                        value={form.orderPrefix}
                        onChange={(e) => setForm({ ...form, orderPrefix: e.target.value })}
                        placeholder="Order number prefix (e.g. CC-)"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">
                        Preview: {form.orderPrefix}
                        {form.nextOrderNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 2: Inventory & Site Logo & Favicon */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-slate-900">Inventory</h2>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                        Take pre-orders
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, takePreOrders: !form.takePreOrders })}
                        className={`w-10 h-5 rounded-full transition-colors p-0.5 ${
                          form.takePreOrders ? 'bg-indigo-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            form.takePreOrders ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                        Auto-move to Pending when stock arrives
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, autoMovePending: !form.autoMovePending })}
                        className={`w-10 h-5 rounded-full transition-colors p-0.5 ${
                          form.autoMovePending ? 'bg-indigo-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            form.autoMovePending ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                        <span>Costing method</span>
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            costingMethod: form.costingMethod === 'FIFO' ? 'Weighted Average' : 'FIFO',
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-indigo-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                      >
                        {form.costingMethod === 'FIFO' ? 'FIFO Costing Active' : 'Enable FIFO Costing'}
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-slate-900">Site Logo &amp; Favicon</h2>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[11px] text-slate-500 mb-1.5">Logo</span>
                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center justify-center h-16">
                          <span className="font-brand text-xl font-black text-black truncate">
                            {form.storeName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setSavedBanner('Logo wordmark syncs automatically with Store name.')}
                            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Replace</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, storeName: 'Classy Cases' })}
                            className="px-2.5 py-1 rounded-md text-xs text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[11px] text-slate-500 mb-1.5">Favicon</span>
                        <div className="border border-slate-200 rounded-lg p-3 bg-white flex items-center gap-2 h-16">
                          <div className="w-7 h-7 rounded bg-neutral-900 text-white font-brand font-bold text-xs flex items-center justify-center">
                            {form.storeName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="h-2 w-16 rounded bg-slate-200" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setSavedBanner('Favicon badge generated from Store initials.')}
                          className="mt-2 px-2.5 py-1 rounded-md border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 3: Contact Details */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-semibold text-slate-900">Contact Details</h2>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Phone</label>
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Address</label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Opening hours</label>
                      <input
                        type="text"
                        value={form.openingHours}
                        onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
                        placeholder="Opening hours"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Storefront Payment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* bKash */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#E2136E] text-white font-bold text-xs flex items-center justify-center">
                          bK
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">bKash Online Checkout</h3>
                          <p className="text-[11px] text-slate-500">Mobile wallet instant verification</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            paymentGateways: {
                              ...form.paymentGateways,
                              bkash: { ...form.paymentGateways.bkash, enabled: !form.paymentGateways.bkash.enabled },
                            },
                          })
                        }
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                          form.paymentGateways.bkash.enabled ? 'bg-indigo-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            form.paymentGateways.bkash.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Merchant Number</label>
                        <input
                          type="text"
                          value={form.paymentGateways.bkash.merchantNumber}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              paymentGateways: {
                                ...form.paymentGateways,
                                bkash: { ...form.paymentGateways.bkash, merchantNumber: e.target.value },
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Mode</label>
                        <select
                          value={form.paymentGateways.bkash.mode}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              paymentGateways: {
                                ...form.paymentGateways,
                                bkash: {
                                  ...form.paymentGateways.bkash,
                                  mode: e.target.value === 'live' ? 'live' : 'sandbox',
                                },
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="sandbox">Sandbox</option>
                          <option value="live">Live</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Nagad */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#ED1C24] text-white font-bold text-xs flex items-center justify-center">
                          N
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Nagad Merchant Gateway</h3>
                          <p className="text-[11px] text-slate-500">Digital financial service checkout</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            paymentGateways: {
                              ...form.paymentGateways,
                              nagad: { ...form.paymentGateways.nagad, enabled: !form.paymentGateways.nagad.enabled },
                            },
                          })
                        }
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                          form.paymentGateways.nagad.enabled ? 'bg-indigo-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            form.paymentGateways.nagad.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Merchant Number</label>
                        <input
                          type="text"
                          value={form.paymentGateways.nagad.merchantNumber}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              paymentGateways: {
                                ...form.paymentGateways,
                                nagad: { ...form.paymentGateways.nagad, merchantNumber: e.target.value },
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Mode</label>
                        <select
                          value={form.paymentGateways.nagad.mode}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              paymentGateways: {
                                ...form.paymentGateways,
                                nagad: {
                                  ...form.paymentGateways.nagad,
                                  mode: e.target.value === 'live' ? 'live' : 'sandbox',
                                },
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="sandbox">Sandbox</option>
                          <option value="live">Live</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SSLCommerz / Card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">SSLCommerz (Visa / Mastercard)</h3>
                          <p className="text-[11px] text-slate-500">Debit &amp; credit card processing</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            paymentGateways: {
                              ...form.paymentGateways,
                              card: { ...form.paymentGateways.card, enabled: !form.paymentGateways.card.enabled },
                            },
                          })
                        }
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                          form.paymentGateways.card.enabled ? 'bg-indigo-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            form.paymentGateways.card.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Store ID</label>
                        <input
                          type="text"
                          value={form.paymentGateways.card.storeId}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              paymentGateways: {
                                ...form.paymentGateways,
                                card: { ...form.paymentGateways.card, storeId: e.target.value },
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Mode</label>
                        <select
                          value={form.paymentGateways.card.mode}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              paymentGateways: {
                                ...form.paymentGateways,
                                card: {
                                  ...form.paymentGateways.card,
                                  mode: e.target.value === 'live' ? 'live' : 'sandbox',
                                },
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="sandbox">Sandbox</option>
                          <option value="live">Live</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Shipping & COD */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Delivery Fees &amp; COD</h3>
                        <p className="text-[11px] text-slate-500">Nationwide shipping configuration</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.paymentGateways.cod.enabled}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              paymentGateways: {
                                ...form.paymentGateways,
                                cod: { enabled: e.target.checked },
                              },
                            })
                          }
                          className="rounded border-slate-300"
                        />
                        Allow COD
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Inside Dhaka (৳)</label>
                        <input
                          type="number"
                          value={form.shippingInsideDhaka}
                          onChange={(e) => setForm({ ...form, shippingInsideDhaka: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Outside Dhaka (৳)</label>
                        <input
                          type="number"
                          value={form.shippingOutsideDhaka}
                          onChange={(e) => setForm({ ...form, shippingOutsideDhaka: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Free Over (৳)</label>
                        <input
                          type="number"
                          value={form.freeShippingThreshold}
                          onChange={(e) => setForm({ ...form, freeShippingThreshold: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'SEO' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-900">Search Engine Optimization</h2>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Meta Description</label>
                  <textarea
                    rows={3}
                    value={form.seoDescription}
                    onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {extendedTabs.includes(activeTab as ExtendedSettingsTab) && (
              <AdminSettingsPanels
                activeTab={activeTab as ExtendedSettingsTab}
                form={form}
                setForm={setForm}
                onOpenStorefront={onOpenStorefront}
                onStatusMessage={(msg) => {
                  setSavedBanner(msg);
                  setTimeout(() => setSavedBanner(''), 3500);
                }}
              />
            )}

            {activeTab !== 'General' &&
              activeTab !== 'Storefront Payment' &&
              activeTab !== 'SEO' &&
              !extendedTabs.includes(activeTab as ExtendedSettingsTab) && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                  <h2 className="text-sm font-semibold text-slate-900">{activeTab} Configuration</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Customize your {activeTab.toLowerCase()} appearance and storefront metadata. Changes saved here
                    sync directly to your live {form.storeName} storefront.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenStorefront}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Preview Live Storefront</span>
                    </button>
                  </div>
                </div>
              )}
          </div>
        </main>
      </div>
    </div>
  );
}
