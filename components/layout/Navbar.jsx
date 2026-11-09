'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import { DEMO, T } from '@/lib/demo';

const links = [
  { href: '/',            label: 'Home' },
  { href: '/therapists',  label: DEMO ? T.many : 'Find a Guide' },
  ...(DEMO ? [{ href: '/resources', label: 'Resources' }] : []),
  { href: '/about',       label: 'Philosophy' },
  { href: '/fund',        label: 'Community Fund' },
  { href: '/contact',     label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  const solid = scrolled || !isHome || open;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: '72px', padding: '0 2.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: solid ? 'rgba(247,243,237,0.96)' : 'transparent',
      backdropFilter: solid ? 'blur(14px)' : 'none',
      borderBottom: solid ? '1px solid rgba(212,193,184,0.4)' : '1px solid transparent',
      transition: 'all 0.4s ease',
    }} className="site-nav">
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

      {/* Mobile menu toggle */}
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="site-nav-links"
        onClick={() => setOpen((o) => !o)}
        style={{ color: solid ? 'var(--green-deep)' : 'var(--cream)' }}
      >
        {open ? 'Close' : 'Menu'}
      </button>

      {/* Links */}
      <div id="site-nav-links" className={`nav-links${open ? ' open' : ''}`}>
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
        {DEMO
          ? <Button href="/therapists" size="sm">{T.findCta}</Button>
          : <Button href="/therapists" size="sm">Book a Session</Button>}
      </div>
    </nav>
  );
}
