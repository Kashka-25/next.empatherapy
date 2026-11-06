'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';

const links = [
  { href: '/',            label: 'Home' },
  { href: '/hopeium',      label: 'HOPEIUM' },
  { href: '/therapists',  label: 'Find a Guide' },
  { href: '/about',       label: 'Philosophy' },
  { href: '/fund',        label: 'Community Fund' },
  { href: '/contact',     label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const solid = scrolled || !isHome;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: '72px', padding: '0 2.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: solid ? 'rgba(247,243,237,0.96)' : 'transparent',
      backdropFilter: solid ? 'blur(14px)' : 'none',
      borderBottom: solid ? '1px solid rgba(212,193,184,0.4)' : '1px solid transparent',
      transition: 'all 0.4s ease',
    }}>
      {/* Wordmark */}
      <Link href="/" style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: '1.45rem',
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: solid ? 'var(--green-deep)' : 'var(--cream)',
        transition: 'color 0.4s',
      }}>
        Empatherapy
      </Link>

      {/* Links */}
      <div style={{ display: 'flex', gap: '2.2rem', alignItems: 'center' }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={{
            fontFamily: 'Lato, sans-serif',
            fontSize: '0.73rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: pathname === l.href ? 700 : 300,
            color: solid
              ? (pathname === l.href ? 'var(--amber)' : 'var(--charcoal)')
              : (pathname === l.href ? 'var(--amber-light)' : 'rgba(247,243,237,0.8)'),
            transition: 'color 0.3s',
          }}>
            {l.label}
          </Link>
        ))}
        <Button href="/therapists" size="sm">Book a Session</Button>
      </div>
    </nav>
  );
}
