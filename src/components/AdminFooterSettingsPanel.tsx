import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Contact,
  Copyright,
  CreditCard,
  GripVertical,
  Info,
  Link2,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Shield,
  Trash2,
} from 'lucide-react';
import type {
  Category,
  FooterBlockConfig,
  FooterConfigSettings,
  FooterDesignType,
  FooterLinkItem,
  HeaderConfigSettings,
  StoreSettings,
} from '../types';
import { createDefaultFooterConfig } from '../utils/headerFooterDefaults';
import { AdminLivePreviewPane } from './AdminLivePreviewPane';

interface AdminFooterSettingsPanelProps {
  form: StoreSettings;
  hc: HeaderConfigSettings;
  fc: FooterConfigSettings;
  categories: Category[];
  updateFooter: (patch: Partial<FooterConfigSettings>) => void;
  onOpenStorefront: () => void;
}

function SwitchToggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
        checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function FooterDesignThumb({ design }: { design: FooterDesignType }) {
  if (design === 'classic') {
    return (
      <div className="h-16 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-2.5 flex flex-col justify-between">
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <span className="block w-5 h-1.5 rounded bg-slate-300 dark:bg-slate-600" />
            <span className="block w-7 h-1 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-1">
            <span className="block w-5 h-1 rounded bg-slate-300 dark:bg-slate-600" />
            <span className="block w-6 h-1 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-1">
            <span className="block w-5 h-1 rounded bg-slate-300 dark:bg-slate-600" />
            <span className="block w-6 h-1 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="flex items-center gap-1 justify-end">
            <span className="w-6 h-2 rounded bg-slate-200 dark:bg-slate-700" />
            <span className="w-3 h-2 rounded bg-slate-400 dark:bg-slate-500" />
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-center">
          <span className="w-16 h-1 rounded bg-slate-300 dark:bg-slate-600" />
        </div>
      </div>
    );
  }
  if (design === 'columns') {
    return (
      <div className="h-16 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 flex flex-col justify-between">
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <span className="block w-5 h-1.5 rounded bg-slate-300 dark:bg-slate-600" />
              <span className="block w-7 h-1 rounded bg-slate-200 dark:bg-slate-700" />
              <span className="block w-4 h-1 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 flex justify-between">
          <span className="w-10 h-1 rounded bg-slate-200 dark:bg-slate-600" />
          <span className="w-4 h-1 rounded bg-slate-200 dark:bg-slate-600" />
        </div>
      </div>
    );
  }
  if (design === 'dark') {
    return (
      <div className="h-16 rounded-lg bg-zinc-700 border border-zinc-600 p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-600">
          <span className="w-12 h-1 rounded bg-zinc-400" />
          <div className="flex gap-1">
            <span className="w-6 h-2 rounded bg-zinc-600" />
            <span className="w-3 h-2 rounded bg-zinc-300" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <span className="block w-5 h-1 rounded bg-zinc-400" />
              <span className="block w-8 h-1 rounded bg-zinc-500" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (design === 'boxed') {
    return (
      <div className="h-16 rounded-lg bg-slate-600 border border-slate-500 p-2 grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded bg-slate-500/70 border border-slate-400/40 p-1.5 space-y-1">
            <span className="block w-4 h-1 rounded bg-slate-300" />
            <span className="block w-6 h-1 rounded bg-slate-400" />
          </div>
        ))}
      </div>
    );
  }
  if (design === 'contact-strip') {
    return (
      <div className="h-16 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-2 flex flex-col justify-between">
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
              <span className="flex-1 h-1 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 px-1">
          <span className="h-1 rounded bg-slate-300 dark:bg-slate-600" />
          <span className="h-1 rounded bg-slate-300 dark:bg-slate-600" />
          <span className="h-1 rounded bg-slate-300 dark:bg-slate-600" />
        </div>
      </div>
    );
  }
  return (
    <div className="h-16 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-2.5 flex flex-col items-center justify-center gap-1.5">
      <span className="w-8 h-1.5 rounded bg-slate-300 dark:bg-slate-600" />
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>
      <span className="w-16 h-1 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function getBlockIcon(type: FooterBlockConfig['type']) {
  const cls = 'w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0';
  switch (type) {
    case 'about':
      return <Info className={cls} />;
    case 'contact':
      return <Contact className={cls} />;
    case 'social':
      return <Share2 className={cls} />;
    case 'help':
    case 'company':
    case 'custom':
      return <Link2 className={cls} />;
    case 'newsletter':
      return <Mail className={cls} />;
    case 'payment-badges':
      return <CreditCard className={cls} />;
    case 'trust-badges':
      return <Shield className={cls} />;
    case 'copyright':
      return <Copyright className={cls} />;
  }
}

export function AdminFooterSettingsPanel({
  form,
  hc,
  fc,
  categories,
  updateFooter,
  onOpenStorefront,
}: AdminFooterSettingsPanelProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const getBlockSubtitle = (block: FooterBlockConfig): string => {
    switch (block.type) {
      case 'about': {
        const parts = [
          fc.showBrandLogo ? 'Logo' : 'No logo',
          fc.aboutText ? 'custom text' : 'no text',
          fc.showShopNowCta ? `"${fc.shopNowLabel}"` : 'no CTA',
        ];
        return parts.join(' · ');
      }
      case 'contact':
        return `Shows ${fc.showWhatsappRow ? 'WhatsApp, ' : ''}${fc.showOpeningHours ? 'hours' : 'contact info'}`;
      case 'social': {
        const active = Object.values(fc.socialLinks).filter((u) => u && u.trim()).length;
        return active === 0
          ? 'No networks yet, so it stays hidden'
          : `${active} social ${active === 1 ? 'link' : 'links'} active`;
      }
      case 'help': {
        const names = fc.helpLinks.slice(0, 2).map((l) => l.label).join(', ');
        return `${fc.helpLinks.length} links: ${names || 'none'}${fc.helpLinks.length > 2 ? '...' : ''}`;
      }
      case 'company': {
        const names = fc.companyLinks.slice(0, 2).map((l) => l.label).join(', ');
        return `${fc.companyLinks.length} links: ${names || 'none'}${fc.companyLinks.length > 2 ? '...' : ''}`;
      }
      case 'newsletter':
        return fc.newsletterTitle === 'Newsletter' ? 'Default wording' : fc.newsletterTitle;
      case 'payment-badges': {
        const active = [
          fc.paymentBadges.cod && 'Cash on Delivery',
          fc.paymentBadges.bkash && 'bKash',
          fc.paymentBadges.nagad && 'Nagad',
          fc.paymentBadges.card && 'Cards',
        ].filter(Boolean);
        return active.length > 0 ? active.join(', ') : 'No badges selected';
      }
      case 'trust-badges':
        return fc.trustBadges.slice(0, 2).join(' · ') || 'No trust badges';
      case 'copyright':
        return fc.copyrightText;
      case 'custom':
        return block.customBody || `${block.customLinks?.length || 0} custom links`;
    }
  };

  const toggleBlock = (id: string) => {
    updateFooter({
      blocks: fc.blocks.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)),
    });
  };

  const moveBlock = (index: number, delta: -1 | 1) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= fc.blocks.length) return;
    const copy = [...fc.blocks];
    const [moved] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, moved);
    updateFooter({ blocks: copy });
  };

  const removeCustomBlock = (id: string) => {
    updateFooter({ blocks: fc.blocks.filter((b) => b.id !== id) });
    if (editingBlockId === id) setEditingBlockId(null);
  };

  const addCustomBlock = () => {
    const id = `blk-custom-${Date.now()}`;
    const newBlock: FooterBlockConfig = {
      id,
      type: 'custom',
      title: 'Store Info',
      enabled: true,
      customBody: 'Add custom store details, branch hours, or helpful links.',
      customLinks: [],
    };
    updateFooter({ blocks: [...fc.blocks, newBlock] });
    setEditingBlockId(id);
  };

  const updateLinkList = (
    col: 'helpLinks' | 'companyLinks',
    linkId: string,
    patch: Partial<FooterLinkItem>
  ) => {
    updateFooter({
      [col]: fc[col].map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
    });
  };

  const renderBlockEditor = (block: FooterBlockConfig) => {
    switch (block.type) {
      case 'about':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Show Brand Logo</span>
              <SwitchToggle
                checked={fc.showBrandLogo}
                onChange={(v) => updateFooter({ showBrandLogo: v })}
                ariaLabel="Show brand logo"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">About Text (Optional)</label>
              <input
                type="text"
                value={fc.aboutText}
                onChange={(e) => updateFooter({ aboutText: e.target.value })}
                placeholder="Everyday protection & signature style for your smartphone."
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Show &quot;Shop now&quot; CTA</span>
              <SwitchToggle
                checked={fc.showShopNowCta}
                onChange={(v) => updateFooter({ showShopNowCta: v })}
                ariaLabel="Show Shop now CTA"
              />
            </div>
            {fc.showShopNowCta && (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">CTA Label</label>
                <input
                  type="text"
                  value={fc.shopNowLabel}
                  onChange={(e) => updateFooter({ shopNowLabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Show WhatsApp Row</span>
              <SwitchToggle
                checked={fc.showWhatsappRow}
                onChange={(v) => updateFooter({ showWhatsappRow: v })}
                ariaLabel="Show WhatsApp row"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Prefix Label</label>
                <input
                  type="text"
                  value={fc.whatsappLabel}
                  onChange={(e) => updateFooter({ whatsappLabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Link Text</label>
                <input
                  type="text"
                  value={fc.whatsappLinkText}
                  onChange={(e) => updateFooter({ whatsappLinkText: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">WhatsApp URL</label>
              <input
                type="url"
                value={fc.whatsappUrl}
                onChange={(e) => updateFooter({ whatsappUrl: e.target.value })}
                placeholder="https://wa.me/8801799576210"
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Show Opening Hours</span>
              <SwitchToggle
                checked={fc.showOpeningHours}
                onChange={(v) => updateFooter({ showOpeningHours: v })}
                ariaLabel="Show opening hours"
              />
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Heading</label>
              <input
                type="text"
                value={fc.socialHeading}
                onChange={(e) => updateFooter({ socialHeading: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  { key: 'facebook', label: 'Facebook URL' },
                  { key: 'instagram', label: 'Instagram URL' },
                  { key: 'tiktok', label: 'TikTok URL' },
                  { key: 'youtube', label: 'YouTube URL' },
                  { key: 'whatsapp', label: 'WhatsApp URL' },
                  { key: 'x', label: 'X / Twitter URL' },
                ] as const
              ).map((soc) => (
                <div key={soc.key}>
                  <label className="block text-[10.5px] text-slate-500 mb-0.5">{soc.label}</label>
                  <input
                    type="url"
                    value={fc.socialLinks[soc.key]}
                    onChange={(e) =>
                      updateFooter({
                        socialLinks: { ...fc.socialLinks, [soc.key]: e.target.value },
                      })
                    }
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'help':
      case 'company': {
        const col = block.type === 'help' ? 'helpLinks' : 'companyLinks';
        const titleKey = block.type === 'help' ? 'helpColumnTitle' : 'companyColumnTitle';
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Column Heading</label>
              <input
                type="text"
                value={fc[titleKey]}
                onChange={(e) => updateFooter({ [titleKey]: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              {fc[col].map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-1.5"
                >
                  <div className="grid grid-cols-12 gap-1.5 items-center">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateLinkList(col, item.id, { label: e.target.value })}
                      className="col-span-5 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded"
                    />
                    <select
                      value={item.action}
                      onChange={(e) =>
                        updateLinkList(col, item.id, {
                          action: e.target.value as FooterLinkItem['action'],
                        })
                      }
                      className="col-span-6 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded"
                    >
                      <option value="modal">Info Popup</option>
                      <option value="url">Custom URL</option>
                      <option value="orders">Track Order</option>
                      <option value="catalog">Shop Catalog</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        updateFooter({ [col]: fc[col].filter((l) => l.id !== item.id) })
                      }
                      className="col-span-1 p-1 text-rose-600 hover:bg-rose-50 rounded flex justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {(item.action === 'modal' || item.action === 'url') && (
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => updateLinkList(col, item.id, { value: e.target.value })}
                      placeholder={item.action === 'url' ? 'https://...' : 'Popup message...'}
                      className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                updateFooter({
                  [col]: [
                    ...fc[col],
                    {
                      id: `${col}-${Date.now()}`,
                      label: 'New Link',
                      action: 'modal',
                      value: 'Details shown in popup.',
                    },
                  ],
                })
              }
              className="px-2.5 py-1 rounded-md border border-indigo-200 text-indigo-600 font-semibold inline-flex items-center gap-1 hover:bg-indigo-50"
            >
              <Plus className="w-3 h-3" />
              <span>Add Link</span>
            </button>
          </div>
        );
      }

      case 'newsletter':
        return (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Heading</label>
                <input
                  type="text"
                  value={fc.newsletterTitle}
                  onChange={(e) => updateFooter({ newsletterTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Button Text</label>
                <input
                  type="text"
                  value={fc.newsletterButtonText}
                  onChange={(e) => updateFooter({ newsletterButtonText: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Description</label>
              <input
                type="text"
                value={fc.newsletterDescription}
                onChange={(e) => updateFooter({ newsletterDescription: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Placeholder</label>
              <input
                type="text"
                value={fc.newsletterPlaceholder}
                onChange={(e) => updateFooter({ newsletterPlaceholder: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        );

      case 'payment-badges':
        return (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'cod', label: 'Cash on Delivery' },
                { key: 'bkash', label: 'bKash' },
                { key: 'nagad', label: 'Nagad' },
                { key: 'card', label: 'Visa / Mastercard' },
              ] as const
            ).map((badge) => (
              <label key={badge.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fc.paymentBadges[badge.key]}
                  onChange={(e) =>
                    updateFooter({
                      paymentBadges: {
                        ...fc.paymentBadges,
                        [badge.key]: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span>{badge.label}</span>
              </label>
            ))}
          </div>
        );

      case 'trust-badges':
        return (
          <div className="space-y-2">
            <label className="block text-[11px] text-slate-500">
              Trust Badges (comma-separated)
            </label>
            <input
              type="text"
              value={fc.trustBadges.join(', ')}
              onChange={(e) =>
                updateFooter({
                  trustBadges: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
        );

      case 'copyright':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Copyright Text</label>
              <input
                type="text"
                value={fc.copyrightText}
                onChange={(e) => updateFooter({ copyrightText: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Show Scroll-to-Top button
              </span>
              <SwitchToggle
                checked={fc.showScrollToTop}
                onChange={(v) => updateFooter({ showScrollToTop: v })}
                ariaLabel="Show scroll to top"
              />
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Block Title</label>
              <input
                type="text"
                value={block.title}
                onChange={(e) =>
                  updateFooter({
                    blocks: fc.blocks.map((b) =>
                      b.id === block.id ? { ...b, title: e.target.value } : b
                    ),
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Content Text</label>
              <textarea
                rows={2}
                value={block.customBody || ''}
                onChange={(e) =>
                  updateFooter({
                    blocks: fc.blocks.map((b) =>
                      b.id === block.id ? { ...b, customBody: e.target.value } : b
                    ),
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
      {/* Left Column: Footer Settings Cards */}
      <div className="lg:col-span-6 space-y-4">
        {/* 1. Footer Design */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Footer design
              </h2>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <button
              type="button"
              onClick={() =>
                updateFooter(
                  createDefaultFooterConfig({
                    storeName: form.storeName,
                    tagline: form.tagline,
                    phone: form.phone,
                    email: form.email,
                    address: form.address,
                    openingHours: form.openingHours,
                    shippingInsideDhaka: form.shippingInsideDhaka,
                    shippingOutsideDhaka: form.shippingOutsideDhaka,
                    freeShippingThreshold: form.freeShippingThreshold,
                  })
                )
              }
              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                {
                  id: 'classic',
                  title: 'Classic',
                  desc: 'Simple, centred copyright',
                },
                {
                  id: 'columns',
                  title: 'Columns',
                  desc: 'White, four columns',
                },
                {
                  id: 'dark',
                  title: 'Dark',
                  desc: 'Black, newsletter on top',
                },
                {
                  id: 'boxed',
                  title: 'Boxed',
                  desc: 'Dark, each block in a box',
                },
                {
                  id: 'contact-strip',
                  title: 'Contact strip',
                  desc: 'Call, WhatsApp, email tiles on top',
                },
                {
                  id: 'compact',
                  title: 'Compact',
                  desc: 'Short, everything centred',
                },
              ] as const
            ).map((opt) => {
              const selected = fc.footerDesign === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateFooter({ footerDesign: opt.id })}
                  className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selected
                      ? 'border-indigo-500 ring-1 ring-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {selected && (
                    <span className="absolute bottom-3 right-3 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                  <FooterDesignThumb design={opt.id} />
                  <div className="mt-2.5 font-semibold text-slate-900 dark:text-slate-100">
                    {opt.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug pr-5">
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Blocks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3.5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Blocks</h2>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="space-y-2">
            {fc.blocks.map((block, idx) => {
              const isEditing = editingBlockId === block.id;
              return (
                <div
                  key={block.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                >
                  <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                      {getBlockIcon(block.type)}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {block.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {getBlockSubtitle(block)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <SwitchToggle
                        checked={block.enabled}
                        onChange={() => toggleBlock(block.id)}
                        ariaLabel={`Toggle ${block.title}`}
                      />
                      <button
                        type="button"
                        onClick={() => setEditingBlockId(isEditing ? null : block.id)}
                        title={`Edit ${block.title}`}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          isEditing
                            ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveBlock(idx, -1)}
                        title="Move up"
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === fc.blocks.length - 1}
                        onClick={() => moveBlock(idx, 1)}
                        title="Move down"
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      {block.type === 'custom' && (
                        <button
                          type="button"
                          onClick={() => removeCustomBlock(block.id)}
                          title="Delete custom block"
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="px-3.5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
                      {renderBlockEditor(block)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addCustomBlock}
            className="px-3.5 py-2 rounded-lg border border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold inline-flex items-center gap-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Block</span>
          </button>
        </div>
      </div>

      {/* Right Column: Live Preview */}
      <div className="lg:col-span-6">
        <AdminLivePreviewPane
          form={form}
          hc={hc}
          fc={fc}
          categories={categories}
          focusArea="footer"
          onOpenStorefront={onOpenStorefront}
        />
      </div>
    </div>
  );
}
