'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

/** The public header and footer. The admin area has its own, so they are hidden there. */
export default function SiteChrome({ children }) {
  const admin = usePathname().startsWith('/admin');
  if (admin) return <main id="main">{children}</main>;
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
