import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import DemoBanner from '@/components/layout/DemoBanner';
import { DEMO } from '@/lib/demo';

export const metadata = {
  title: 'Empatherapy | Where Humanity is Our Medicine',
  description: 'A holistic healing platform connecting you with empathic guides who meet you where you are — in your emotions, your body, your becoming.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={DEMO ? 'demo' : undefined}>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <DemoBanner />
      </body>
    </html>
  );
}
