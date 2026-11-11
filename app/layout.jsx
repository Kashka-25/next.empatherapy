import './globals.css';
import SiteChrome from '@/components/layout/SiteChrome';

export const metadata = {
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
