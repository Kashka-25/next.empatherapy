'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import Logo from '@/components/layout/Logo';

const links = [
  { href: '/', label: 'Home' },
  { href: '/alchemists', label: 'Discover Alchemists' },
  { href: '/modalities', label: 'Explore Modalities' },
  { href: '/lighthouse', label: 'IntoTheLighthouse' },
  { href: '/about', label: 'About' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  const isCurrent = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="site-nav">
      <nav className="site-nav__inner" aria-label="Main">
        <Link href="/" className="wordmark">
          <Logo />
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav-links"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <div id="site-nav-links" className={`nav-links${open ? ' open' : ''}`}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link" aria-current={isCurrent(l.href) ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
          <Button href="/become-an-alchemist" variant="outline" size="sm">Become an Alchemist</Button>
        </div>
      </nav>
    </header>
  );
}
