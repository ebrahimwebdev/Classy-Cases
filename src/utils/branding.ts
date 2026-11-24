export function applyDocumentFavicon(faviconUrl?: string, storeName = 'Classy Cases'): void {
  if (typeof document === 'undefined') return;
  const cleanUrl = typeof faviconUrl === 'string' ? faviconUrl.trim() : '';

  let href = cleanUrl;
  if (!href) {
    const initials = (storeName.trim() || 'CC')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'CC';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111111"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Georgia,serif" font-weight="700" font-size="26">${initials.replace(/[<>&"']/g, '')}</text></svg>`;
    href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    document.head.appendChild(iconLink);
  }
  iconLink.href = href;

  let shortcutLink = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
  if (!shortcutLink) {
    shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    document.head.appendChild(shortcutLink);
  }
  shortcutLink.href = href;
}
