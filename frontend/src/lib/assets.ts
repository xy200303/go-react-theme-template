const DEFAULT_AVATAR_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="avatarBg" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E8F2FF"/>
      <stop offset="1" stop-color="#CFE4FF"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="80" fill="url(#avatarBg)"/>
  <circle cx="80" cy="60" r="26" fill="#8CB7FF"/>
  <path d="M40 128c6-24 24-36 40-36s34 12 40 36" fill="#6E9BFF"/>
</svg>
`);

export const DEFAULT_AVATAR_URL = `data:image/svg+xml;charset=UTF-8,${DEFAULT_AVATAR_SVG}`;

function resolveApiOrigin(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

  if (/^https?:\/\//i.test(apiBase)) {
    const url = new URL(apiBase);
    return url.origin;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const devOrigin = import.meta.env.DEV ? 'http://127.0.0.1:8080' : window.location.origin;
  return new URL(apiBase, devOrigin).origin;
}

export function resolveAssetUrl(input?: string): string {
  if (!input) {
    return DEFAULT_AVATAR_URL;
  }

  if (/^(https?:)?\/\//i.test(input) || input.startsWith('data:') || input.startsWith('blob:')) {
    return input;
  }

  const baseOrigin = resolveApiOrigin();
  if (!baseOrigin) {
    return input;
  }

  return new URL(input, `${baseOrigin}/`).toString();
}
