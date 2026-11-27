import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowUpRight,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import type {
  FooterBlockConfig,
  FooterConfigSettings,
  FooterLinkItem,
} from '../types';

interface StorefrontFooterProps {
  footerConfig: FooterConfigSettings;
  storeName: string;
  logoUrl?: string;
  logoImgFailed: boolean;
  onLogoError: () => void;
  phone: string;
  email: string;
  openingHours: string;
  newsletterEmail: string;
  newsletterMsg: string;
  onNewsletterEmailChange: (val: string) => void;
  onNewsletterSubmit: (e: React.FormEvent) => void;
  onFooterLinkAction: (item: FooterLinkItem) => void;
  onShopNow: () => void;
  onOpenWhatsApp: () => void;
  whatsappHref?: string;
  hasMobileBottomBar?: boolean;
}

export function StorefrontFooter({
  footerConfig,
  storeName,
  logoUrl,
  logoImgFailed,
  onLogoError,
  phone,
  email,
  openingHours,
  newsletterEmail,
  newsletterMsg,
  onNewsletterEmailChange,
  onNewsletterSubmit,
  onFooterLinkAction,
  onShopNow,
  onOpenWhatsApp,
  whatsappHref,
  hasMobileBottomBar = false,
}: StorefrontFooterProps) {
  const design = footerConfig.footerDesign || 'classic';
  const enabledBlocks = (footerConfig.blocks || []).filter((b) => b.enabled);

  const isDarkTheme = design === 'dark' || design === 'boxed';
  const isColumnsWhite = design === 'columns';
  const isCompact = design === 'compact';

  const customFooterLogo = footerConfig.footerLogoUrl?.trim() || '';
  const resolvedLogoUrl = customFooterLogo || logoUrl?.trim() || '';
  const [failedLogoSrc, setFailedLogoSrc] = useState<string | null>(null);
  const effectiveLogoFailed =
    !resolvedLogoUrl ||
    failedLogoSrc === resolvedLogoUrl ||
    (!customFooterLogo && logoImgFailed);
  const useLightBackdrop =
    footerConfig.footerLogoBackdrop !== undefined
      ? footerConfig.footerLogoBackdrop
      : !customFooterLogo && !isColumnsWhite;

  const containerStyle: React.CSSProperties = isDarkTheme
    ? { backgroundColor: '#111115', color: '#F3F4F6' }
    : isColumnsWhite
      ? { backgroundColor: '#FFFFFF', color: '#1E1B18' }
      : {
          backgroundColor: footerConfig.footerBgColor,
          color: footerConfig.footerTextColor,
        };

  const activeSocialItems = [
    {
      key: 'facebook',
      label: 'Facebook',
      url: footerConfig.socialLinks.facebook,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H8v3h2.2V21h3.3Z" />
        </svg>
      ),
    },
    {
      key: 'instagram',
      label: 'Instagram',
      url: footerConfig.socialLinks.instagram,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]" aria-hidden="true">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      url: footerConfig.socialLinks.tiktok,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.3Z" />
        </svg>
      ),
    },
    {
      key: 'youtube',
      label: 'YouTube',
      url: footerConfig.socialLinks.youtube,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true">
          <path d="M21.58 7.19a2.75 2.75 0 0 0-1.94-1.95C17.93 4.75 12 4.75 12 4.75s-5.93 0-7.64.49A2.75 2.75 0 0 0 2.42 7.2 28.8 28.8 0 0 0 2 12a28.8 28.8 0 0 0 .42 4.81 2.75 2.75 0 0 0 1.94 1.95c1.71.49 7.64.49 7.64.49s5.93 0 7.64-.49a2.75 2.75 0 0 0 1.94-1.95A28.8 28.8 0 0 0 22 12a28.8 28.8 0 0 0-.42-4.81ZM10 15.1V8.9L15.4 12 10 15.1Z" />
        </svg>
      ),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      url: footerConfig.socialLinks.whatsapp,
      icon: <MessageCircle className="w-[18px] h-[18px]" aria-hidden="true" />,
    },
    {
      key: 'x',
      label: 'X',
      url: footerConfig.socialLinks.x,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
        </svg>
      ),
    },
  ].filter((item) => Boolean(item.url && item.url.trim()));

  const renderLinksList = (links: FooterLinkItem[]) => (
    <ul className="space-y-2 text-[13px] sm:text-sm opacity-85">
      {links.map((item) => (
        <li key={item.id}>
          {item.action === 'url' && item.value ? (
            <a
              href={item.value}
              target={item.value.startsWith('http') ? '_blank' : undefined}
              rel={item.value.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="hover:opacity-100 font-medium hover:underline"
            >
              {item.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onFooterLinkAction(item)}
              className="hover:opacity-100 font-medium cursor-pointer text-left"
            >
              {item.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );

  const renderBlockContent = (block: FooterBlockConfig) => {
    switch (block.type) {
      case 'about':
        return (
          <div className="space-y-2.5">
            {footerConfig.showBrandLogo && (
              <div className="font-brand text-2xl font-semibold">
                {!effectiveLogoFailed ? (
                  <img
                    src={resolvedLogoUrl}
                    alt={storeName || 'Classy Cases'}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setFailedLogoSrc(resolvedLogoUrl);
                      if (!customFooterLogo) onLogoError();
                    }}
                    className={
                      useLightBackdrop
                        ? 'h-9 sm:h-10 w-auto max-w-[200px] object-contain bg-[#F2E8D2] px-2 py-1 rounded-lg'
                        : 'h-10 sm:h-11 w-auto max-w-[220px] object-contain rounded-lg'
                    }
                  />
                ) : (
                  storeName || 'Classy Cases'
                )}
              </div>
            )}
            {footerConfig.aboutText && (
              <p className="text-[13px] opacity-80 leading-relaxed">{footerConfig.aboutText}</p>
            )}
            {footerConfig.showShopNowCta && (
              <div>
                <button
                  type="button"
                  onClick={onShopNow}
                  className="inline-flex items-center gap-1 text-[13px] sm:text-sm font-semibold hover:opacity-80 cursor-pointer"
                >
                  <span>{footerConfig.shopNowLabel}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-2 text-[13px] sm:text-sm opacity-85">
            {footerConfig.showWhatsappRow && (
              <p className="leading-relaxed">
                {footerConfig.whatsappLabel ? `${footerConfig.whatsappLabel} ` : ''}
                {(footerConfig.whatsappUrl || whatsappHref) ? (
                  <a
                    href={footerConfig.whatsappUrl || whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {footerConfig.whatsappLinkText}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenWhatsApp}
                    className="font-medium hover:underline cursor-pointer"
                  >
                    {footerConfig.whatsappLinkText}
                  </button>
                )}
              </p>
            )}
            {footerConfig.showOpeningHours && openingHours && (
              <p className="inline-flex items-center gap-1.5 text-[12.5px] opacity-80">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{openingHours}</span>
              </p>
            )}
          </div>
        );

      case 'social':
        if (activeSocialItems.length === 0) return null;
        return (
          <div className="space-y-2.5">
            {footerConfig.socialHeading && (
              <h3 className="font-brand text-lg font-semibold">{footerConfig.socialHeading}</h3>
            )}
            <div className={`flex flex-wrap items-center gap-2.5 ${isCompact ? 'justify-center' : ''}`}>
              {activeSocialItems.map((soc) => (
                <a
                  key={soc.key}
                  href={soc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={soc.label}
                  title={soc.label}
                  className="w-9 h-9 rounded-full border border-current/25 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  {soc.icon}
                </a>
              ))}
            </div>
          </div>
        );

      case 'help':
        return (
          <div>
            <h3 className="font-brand text-lg font-semibold mb-3">{footerConfig.helpColumnTitle}</h3>
            {renderLinksList(footerConfig.helpLinks)}
          </div>
        );

      case 'company':
        return (
          <div>
            <h3 className="font-brand text-lg font-semibold mb-3">{footerConfig.companyColumnTitle}</h3>
            {renderLinksList(footerConfig.companyLinks)}
          </div>
        );

      case 'newsletter':
        return (
          <div>
            <h3 className="font-brand text-lg font-semibold mb-2">{footerConfig.newsletterTitle}</h3>
            <p className="text-[13px] opacity-80 leading-relaxed mb-3">
              {footerConfig.newsletterDescription}
            </p>
            <form
              onSubmit={onNewsletterSubmit}
              className="flex items-center border border-[#DFCFB0] rounded-lg p-1 bg-[#FFFDF8] focus-within:border-[#650108]"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => onNewsletterEmailChange(e.target.value)}
                placeholder={footerConfig.newsletterPlaceholder}
                className="flex-1 min-w-0 px-2.5 py-2 text-[13px] text-[#2B1416] placeholder:text-[#8E6F70] bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-md bg-[#650108] text-[#F2E8D2] text-[13px] font-semibold inline-flex items-center gap-1 hover:bg-[#4A0106] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{footerConfig.newsletterButtonText}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </form>
            {newsletterMsg && <p className="text-xs mt-1.5">{newsletterMsg}</p>}
          </div>
        );

      case 'payment-badges': {
        const badges = [
          footerConfig.paymentBadges.cod && 'Cash on Delivery',
          footerConfig.paymentBadges.bkash && 'bKash',
          footerConfig.paymentBadges.nagad && 'Nagad',
          footerConfig.paymentBadges.card && 'Visa / Mastercard',
        ].filter(Boolean) as string[];
        if (badges.length === 0) return null;
        return (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-75">
              Accepted Payments
            </h3>
            <div className={`flex flex-wrap gap-1.5 ${isCompact ? 'justify-center' : ''}`}>
              {badges.map((b) => (
                <span
                  key={b}
                  className="px-2.5 py-1 rounded-md border border-current/25 bg-white/10 text-[11px] font-medium"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        );
      }

      case 'trust-badges':
        if (!footerConfig.trustBadges || footerConfig.trustBadges.length === 0) return null;
        return (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-75">
              Store Promise
            </h3>
            <div className={`flex flex-wrap gap-2 ${isCompact ? 'justify-center' : ''}`}>
              {footerConfig.trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-current/20 bg-white/5 text-[11.5px] font-medium"
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 opacity-85" />
                  <span>{badge}</span>
                </span>
              ))}
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-2">
            <h3 className="font-brand text-lg font-semibold">{block.title}</h3>
            {block.customBody && (
              <p className="text-[13px] opacity-80 leading-relaxed">{block.customBody}</p>
            )}
            {block.customLinks && block.customLinks.length > 0 && renderLinksList(block.customLinks)}
          </div>
        );

      case 'copyright':
        return null;
    }
  };

  const hasBlock = (type: FooterBlockConfig['type']) =>
    enabledBlocks.some((b) => b.type === type);
  const getBlock = (type: FooterBlockConfig['type']) =>
    enabledBlocks.find((b) => b.type === type);

  const brandGroupTypes = new Set(['about', 'contact', 'social']);
  const brandBlocks = enabledBlocks.filter((b) => brandGroupTypes.has(b.type));
  const copyrightBlock = getBlock('copyright');
  const newsletterBlock = getBlock('newsletter');
  const badgeBlocks = enabledBlocks.filter(
    (b) => b.type === 'payment-badges' || b.type === 'trust-badges'
  );
  const columnBlocks = enabledBlocks.filter(
    (b) =>
      !brandGroupTypes.has(b.type) &&
      b.type !== 'copyright' &&
      b.type !== 'payment-badges' &&
      b.type !== 'trust-badges' &&
      !(design === 'dark' && b.type === 'newsletter')
  );

  return (
    <footer
      className={`border-t border-black/15 relative ${hasMobileBottomBar ? 'pb-16 md:pb-0' : ''}`}
      style={containerStyle}
    >
      {/* Design: Contact Strip */}
      {design === 'contact-strip' && (
        <div className="border-b border-current/15 bg-black/10">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-current/15 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Phone className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider opacity-70">Call Us</div>
                <div className="text-sm font-semibold truncate">{phone}</div>
              </div>
            </a>
            {(whatsappHref || footerConfig.whatsappUrl) ? (
              <a
                href={whatsappHref || footerConfig.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-current/15 bg-white/5 hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider opacity-70">WhatsApp</div>
                  <div className="text-sm font-semibold truncate">{footerConfig.whatsappLinkText}</div>
                </div>
              </a>
            ) : (
              <button
                type="button"
                onClick={onOpenWhatsApp}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-current/15 bg-white/5 hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider opacity-70">WhatsApp</div>
                  <div className="text-sm font-semibold truncate">{footerConfig.whatsappLinkText}</div>
                </div>
              </button>
            )}
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-current/15 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Mail className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider opacity-70">Email</div>
                <div className="text-sm font-semibold truncate">{email}</div>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* Design: Dark -> Newsletter banner on top */}
      {design === 'dark' && newsletterBlock && (
        <div className="border-b border-white/10 bg-white/[0.03]">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-md">
              <h3 className="font-brand text-xl font-semibold">{footerConfig.newsletterTitle}</h3>
              <p className="text-[13px] opacity-75 mt-1">{footerConfig.newsletterDescription}</p>
            </div>
            <div className="w-full md:max-w-md">
              <form
                onSubmit={onNewsletterSubmit}
                className="flex items-center border border-white/20 rounded-lg p-1 bg-white/5"
              >
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => onNewsletterEmailChange(e.target.value)}
                  placeholder={footerConfig.newsletterPlaceholder}
                  className="flex-1 min-w-0 px-3 py-2 text-[13px] text-white placeholder:text-white/50 bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-white text-neutral-900 text-[13px] font-semibold inline-flex items-center gap-1 hover:bg-neutral-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{footerConfig.newsletterButtonText}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </form>
              {newsletterMsg && <p className="text-xs mt-1.5 text-emerald-300">{newsletterMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Design: Compact */}
      {isCompact ? (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-10 text-center space-y-5">
          {hasBlock('about') && (
            <div className="flex flex-col items-center">{renderBlockContent(getBlock('about')!)}</div>
          )}
          {(hasBlock('help') || hasBlock('company')) && (
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] opacity-85">
              {[...(hasBlock('help') ? footerConfig.helpLinks : []), ...(hasBlock('company') ? footerConfig.companyLinks : [])].map(
                (item) =>
                  item.action === 'url' && item.value ? (
                    <a
                      key={item.id}
                      href={item.value}
                      target={item.value.startsWith('http') ? '_blank' : undefined}
                      rel={item.value.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="hover:underline font-medium"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onFooterLinkAction(item)}
                      className="hover:underline font-medium cursor-pointer"
                    >
                      {item.label}
                    </button>
                  )
              )}
            </div>
          )}
          {hasBlock('social') && renderBlockContent(getBlock('social')!)}
          {badgeBlocks.length > 0 && (
            <div className="flex flex-col items-center gap-3">
              {badgeBlocks.map((b) => (
                <div key={b.id}>{renderBlockContent(b)}</div>
              ))}
            </div>
          )}
        </div>
      ) : design === 'boxed' ? (
        /* Design: Boxed (each block in a box) */
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enabledBlocks
            .filter((b) => b.type !== 'copyright')
            .map((block) => {
              const content = renderBlockContent(block);
              if (!content) return null;
              return (
                <div
                  key={block.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-5"
                >
                  {content}
                </div>
              );
            })}
        </div>
      ) : (
        /* Designs: Classic, Columns, Dark, Contact-Strip */
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-12 space-y-8">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              (brandBlocks.length > 0 ? 1 : 0) + columnBlocks.length >= 4
                ? 'lg:grid-cols-4'
                : 'lg:grid-cols-3'
            } gap-8 lg:gap-10`}
          >
            {brandBlocks.length > 0 && (
              <div className="space-y-3.5">
                {brandBlocks.map((blk) => (
                  <React.Fragment key={blk.id}>{renderBlockContent(blk)}</React.Fragment>
                ))}
              </div>
            )}

            {columnBlocks.map((blk) => (
              <div key={blk.id}>{renderBlockContent(blk)}</div>
            ))}
          </div>

          {badgeBlocks.length > 0 && (
            <div className="pt-4 border-t border-current/15 flex flex-wrap items-center justify-between gap-4">
              {badgeBlocks.map((blk) => (
                <div key={blk.id}>{renderBlockContent(blk)}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scroll to top */}
      {footerConfig.showScrollToTop && copyrightBlock && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className="hidden sm:flex absolute right-6 bottom-12 w-9 h-9 rounded-full border border-current/25 bg-white/90 shadow-xs items-center justify-center text-[#650108] hover:bg-white cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Copyright Line */}
      {copyrightBlock && (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 pb-8">
          <div className="border-t border-current/20 pt-6 text-center text-[13px] opacity-80">
            {footerConfig.copyrightText}
          </div>
        </div>
      )}
    </footer>
  );
}
