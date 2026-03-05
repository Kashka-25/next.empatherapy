import Link from 'next/link';

const cols = [
  {
    heading: 'Navigate',
    links: [
      { href: '/',            label: 'Home' },
      { href: '/therapists',  label: 'Find a Guide' },
      { href: '/about',       label: 'Philosophy' },
      { href: '/fund',        label: 'Community Fund' },
      { href: '/contact',     label: 'Contact' },
    ],
  },
  {
    heading: 'Guides',
    links: [
      { href: '/therapists/cass-dugan', label: 'Cassidy Dugan' },
    ],
  },
];

export default function Footer() {
  return (
    <footer style={{ background: '#111B16', padding: '4.5rem 2.5rem 2.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3.5rem' }}>
        {/* Brand */}
        <div>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', color: 'rgba(247,243,237,0.9)', marginBottom: '0.8rem' }}>
            Empatherapy
          </p>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.82rem', fontWeight: 300, color: 'rgba(247,243,237,0.4)', lineHeight: 1.85, maxWidth: '240px' }}>
            A soul-rooted healing platform. Where humanity is our medicine.
          </p>
        </div>

        {/* Nav cols */}
        {cols.map((col) => (
          <div key={col.heading}>
            <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(247,243,237,0.28)', marginBottom: '1.2rem' }}>
              {col.heading}
            </p>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} style={{ display: 'block', padding: '0.3rem 0', fontFamily: 'Lato, sans-serif', fontSize: '0.83rem', fontWeight: 300, color: 'rgba(247,243,237,0.5)', transition: 'color 0.2s' }}>
                {l.label}
              </Link>
            ))}
          </div>
        ))}

        {/* Contact */}
        <div>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(247,243,237,0.28)', marginBottom: '1.2rem' }}>
            Contact
          </p>
          <a href="mailto:hello@empatherapy.co" style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.83rem', fontWeight: 300, color: 'var(--amber-light)' }}>
            hello@empatherapy.co
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid rgba(247,243,237,0.07)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.73rem', fontWeight: 300, color: 'rgba(247,243,237,0.3)' }}>
          © 2026 Empatherapy. All rights reserved.
        </p>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.73rem', fontWeight: 300, color: 'rgba(247,243,237,0.3)' }}>
          AHHCA Registered · CPAT-Therapist Certified
        </p>
      </div>
    </footer>
  );
}
