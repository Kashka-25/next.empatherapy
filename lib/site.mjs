/**
 * Site-wide launch settings: security headers, and whether search engines may index the site.
 *
 * Indexing is OFF unless EMPATHERAPY_INDEXING=on is set on the host. Until Cassidy says the site is ready for the
 * public, every page asks search engines to stay away (robots.txt, a robots meta tag and an X-Robots-Tag header),
 * and the sitemap is empty. Turning it on is a deliberate launch step.
 */
export const indexingOn = (env = process.env) => env.EMPATHERAPY_INDEXING === 'on';

export function siteUrl(env = process.env) {
  const raw = env.SITE_URL || 'http://localhost:3000';
  try { return new URL(raw).origin; } catch { return 'http://localhost:3000'; }
}

/**
 * The content policy. The site's own scripts and styles, Google Fonts, and its own images; nothing else.
 * Inline scripts and styles stay allowed because Next.js and React need them (a stricter nonce-based policy would
 * be a larger change). Everything that matters for stopping injection and embedding is strict:
 * no plugins, no other sites framing us, forms only post back to us.
 */
export function contentSecurityPolicy({ production }) {
  const dev = !production;
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function securityHeaders({ production = false, indexing = false } = {}) {
  const headers = [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy({ production }) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
  if (production) headers.push({ key: 'Strict-Transport-Security', value: 'max-age=15552000' });
  if (!indexing) headers.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
  return headers;
}

/** The rules for robots.txt. */
export function robotsRules(env = process.env) {
  if (!indexingOn(env)) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }], sitemap: `${siteUrl(env)}/sitemap.xml` };
}

const PAGES = ['', '/discover', '/alchemists', '/modalities', '/lighthouse', '/about', '/become-an-alchemist', '/privacy'];

/** Every public page, or nothing while indexing is off. Fictional example profiles are never listed. */
export function sitemapEntries({ alchemists, modalities }, env = process.env, now = new Date()) {
  if (!indexingOn(env)) return [];
  const base = siteUrl(env);
  return [
    ...PAGES.map((p) => ({ url: `${base}${p || '/'}`, lastModified: now })),
    ...alchemists.filter((a) => !a.demo).map((a) => ({ url: `${base}/alchemists/${a.slug}`, lastModified: a.updated_at ? new Date(a.updated_at) : now })),
    ...modalities.map((m) => ({ url: `${base}/modalities/${m.slug}`, lastModified: m.updated_at ? new Date(m.updated_at) : now })),
  ];
}
