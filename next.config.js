/** @type {import('next').NextConfig} */
const nextConfig = {
  // The old "guides/therapists" site became the Alchemists directory.
  // Old links keep working instead of landing on a 404.
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
