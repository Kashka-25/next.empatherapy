import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

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
        <a href="#main" className="skip-link">Skip to content</a>
        <Navbar />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
