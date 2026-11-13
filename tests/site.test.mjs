import test from 'node:test';
import assert from 'node:assert/strict';
import { indexingOn, siteUrl, contentSecurityPolicy, securityHeaders, robotsRules, sitemapEntries } from '../lib/site.mjs';

const find = (headers, key) => headers.find((h) => h.key === key)?.value;

test('indexing is off unless it is switched on deliberately', () => {
  assert.equal(indexingOn({}), false);
  assert.equal(indexingOn({ EMPATHERAPY_INDEXING: 'yes' }), false, 'only the exact word on counts');
  assert.equal(indexingOn({ EMPATHERAPY_INDEXING: 'on' }), true);
  assert.deepEqual(robotsRules({}), { rules: [{ userAgent: '*', disallow: '/' }] }, 'robots.txt keeps everyone out');
});

test('when indexing is on, robots.txt still keeps the admin and API out and points at the sitemap', () => {
  const r = robotsRules({ EMPATHERAPY_INDEXING: 'on', SITE_URL: 'https://empatherapy.co/some/path' });
  assert.equal(r.rules[0].allow, '/');
  assert.deepEqual(r.rules[0].disallow, ['/admin', '/api/']);
  assert.equal(r.sitemap, 'https://empatherapy.co/sitemap.xml');
});

test('site address: only the origin is used, with a safe default', () => {
  assert.equal(siteUrl({ SITE_URL: 'https://empatherapy.co/x?y=1' }), 'https://empatherapy.co');
  assert.equal(siteUrl({ SITE_URL: 'not a url' }), 'http://localhost:3000');
  assert.equal(siteUrl({}), 'http://localhost:3000');
});

test('the sitemap is empty while indexing is off, and lists only what is passed in when on', () => {
  const content = { alchemists: [{ slug: 'cassidy-dugan' }, { slug: 'mira-okafor', demo: true }], modalities: [{ slug: 'breathwork' }] };
  assert.deepEqual(sitemapEntries(content, {}), []);
  const on = sitemapEntries(content, { EMPATHERAPY_INDEXING: 'on', SITE_URL: 'https://empatherapy.co' }).map((e) => e.url);
  assert.ok(on.includes('https://empatherapy.co/'));
  assert.ok(on.includes('https://empatherapy.co/alchemists/cassidy-dugan'));
  assert.ok(on.includes('https://empatherapy.co/modalities/breathwork'));
  assert.ok(!on.some((u) => u.includes('/admin') || u.includes('/api')), 'never the admin or the API');
  assert.ok(!on.some((u) => u.includes('mira-okafor')), 'fictional example profiles are never listed');
  assert.ok(on.includes('https://empatherapy.co/knowledge'), 'the feed page is listed');
  const withPosts = sitemapEntries({ ...content, posts: [{ slug: 'a-gentle-way' }] }, { EMPATHERAPY_INDEXING: 'on', SITE_URL: 'https://empatherapy.co' }).map((e) => e.url);
  assert.ok(withPosts.includes('https://empatherapy.co/knowledge/a-gentle-way'), 'public posts are listed');
});

test('the content policy forbids framing, plugins, other forms and other scripts', () => {
  const prod = contentSecurityPolicy({ production: true });
  for (const part of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", 'upgrade-insecure-requests', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com']) assert.ok(prod.includes(part), part);
  assert.ok(!prod.includes('unsafe-eval'), 'no eval in production');
  assert.ok(!/script-src[^;]*https?:/.test(prod), 'no outside script hosts');
  assert.ok(!prod.includes('ws:'), 'no websockets in production');
  const dev = contentSecurityPolicy({ production: false });
  assert.ok(dev.includes("'unsafe-eval'") && dev.includes('ws:'), 'development needs these for hot reload');
  assert.ok(!dev.includes('upgrade-insecure-requests'), 'localhost is plain http');
});

test('security headers: always the basics, HSTS only in production, noindex until launch', () => {
  const dev = securityHeaders({ production: false, indexing: false });
  for (const k of ['Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy']) assert.ok(find(dev, k), k);
  assert.equal(find(dev, 'X-Content-Type-Options'), 'nosniff');
  assert.equal(find(dev, 'X-Frame-Options'), 'DENY');
  assert.equal(find(dev, 'Strict-Transport-Security'), undefined, 'HSTS would break plain-http localhost');
  assert.equal(find(dev, 'X-Robots-Tag'), 'noindex, nofollow');
  assert.ok(find(dev, 'Permissions-Policy').includes('camera=()') && find(dev, 'Permissions-Policy').includes('geolocation=()'));
  const live = securityHeaders({ production: true, indexing: true });
  assert.ok(find(live, 'Strict-Transport-Security').startsWith('max-age='));
  assert.equal(find(live, 'X-Robots-Tag'), undefined, 'no noindex once launched');
});
