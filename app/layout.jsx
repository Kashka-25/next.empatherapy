import './globals.css';
import SiteChrome from '@/components/layout/SiteChrome';
import { indexingOn, siteUrl } from '@/lib/site.mjs';

export const metadata = {
  metadataBase: new URL(siteUrl()),
  // Until launch, search engines are asked to stay away (see lib/site.mjs). EMPATHERAPY_INDEXING=on lifts it.
  robots: indexingOn() ? undefined : { index: false, follow: false },
  openGraph: { siteName: 'Empatherapy', type: 'website', locale: 'en_AU', title: 'Empatherapy | Discover new pathways to yourself', description: 'Meet Alchemists, explore modalities in plain language, and find the pathway that feels right for you.' },
  twitter: { card: 'summary_large_image' },
  title: { default: 'Empatherapy | Discover new pathways to yourself', template: '%s | Empatherapy' },
  description:
    'Empatherapy brings Seekers and Alchemists together: a curated directory of alternative and holistic practitioners, gentle guides to unfamiliar modalities, and a little light when you simply need someone to care.',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#FBF7EE' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
