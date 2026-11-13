/** @type {import('next').NextConfig} */
const nextConfig = {
  // Photo uploads from the admin are up to 5 MB. Admin pages need a sign-in, so this is not open to the public.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  // The old "guides/therapists" site became the Alchemists directory.
  // Old links keep working instead of landing on a 404.
  // Security headers on every response, and a noindex until launch. See lib/site.mjs.
  async headers() {
    const { securityHeaders, indexingOn } = await import('./lib/site.mjs');
    return [{ source: '/:path*', headers: securityHeaders({ production: process.env.NODE_ENV === 'production', indexing: indexingOn() }) }];
  },
  async redirects() {
    return [
      { source: '/therapists', destination: '/alchemists', permanent: true },
      { source: '/therapists/cass-dugan', destination: '/alchemists/cassidy-dugan', permanent: true },
      { source: '/therapists/:slug', destination: '/alchemists/:slug', permanent: true },
      { source: '/fund', destination: '/about', permanent: false },
      { source: '/subscribe', destination: '/', permanent: false },
      { source: '/contact', destination: '/about', permanent: false },
    ];
  },
};
module.exports = nextConfig;
