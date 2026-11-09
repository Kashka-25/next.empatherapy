import TherapistTags from './TherapistTags';
import Button from '@/components/ui/Button';
import FadeIn from '@/components/ui/FadeIn';
import Label from '@/components/ui/Label';
import { DEMO } from '@/lib/demo';

export default function TherapistProfile({ therapist }) {
  const { name, title, initials, credentials, bio, approach, modalities, areas, sessions, headline, avatar } = therapist;

  return (
    <div>
      {/* Header */}
      <div style={{
        background: avatar ? `linear-gradient(160deg, #152B22, ${avatar[0]}, ${avatar[1]})` : 'linear-gradient(160deg, #152B22, #1E3A2F, #2D5241)',
        padding: '5rem 2rem', display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
      }}>
        <div style={{
          width: '140px', height: '140px', borderRadius: '50%',
          background: 'rgba(212,165,116,0.1)', border: '2px solid rgba(212,165,116,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Cormorant Garamond, serif', fontSize: '3.5rem', fontWeight: 300,
          color: 'rgba(212,165,116,0.85)', marginBottom: '1.8rem',
        }}>
          {initials}
        </div>
        <Label>{title}</Label>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 300, color: 'var(--cream)', marginBottom: '1.5rem' }}>
          {name}
        </h1>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {credentials?.map((c) => (
            <span key={c} style={{
              padding: '0.3rem 0.9rem',
              background: 'rgba(212,165,116,0.12)', border: '1px solid rgba(212,165,116,0.28)',
              fontFamily: 'Lato, sans-serif', fontSize: '0.7rem', letterSpacing: '0.07em',
              color: 'rgba(212,165,116,0.85)',
            }}>{c}</span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '920px', margin: '0 auto', padding: '5.5rem 2rem' }}>

        {/* Bio + Areas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '5rem', marginBottom: '5rem' }}>
          <FadeIn>
            <Label>About</Label>
            <h2 style={{ fontSize: '2rem', color: 'var(--green-deep)', marginBottom: '1.5rem' }}>{headline ?? 'A guide for those who feel deeply'}</h2>
            {bio?.map((p, i) => (
              <p key={i} style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.92rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.95, marginBottom: '1.1rem' }}>{p}</p>
            ))}
          </FadeIn>
          <FadeIn delay={1}>
            <Label>Areas of Support</Label>
            {areas?.map((item) => (
              <div key={item} style={{ display: 'flex', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--amber)', flexShrink: 0 }}>—</span>
                <span style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.87rem', color: 'var(--charcoal)', fontWeight: 300 }}>{item}</span>
              </div>
            ))}
          </FadeIn>
        </div>

        {/* Approach */}
        <FadeIn style={{ background: 'var(--linen)', padding: '3rem 3rem 3rem 2.5rem', borderLeft: '3px solid var(--amber)', marginBottom: '5rem' }}>
          <Label>Therapeutic Style</Label>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.35rem', fontStyle: 'italic', color: 'var(--green-deep)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            "{approach}"
          </p>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.87rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.85 }}>
            Modalities include: {modalities?.join(', ')}.
          </p>
        </FadeIn>

        {/* Sessions */}
        <FadeIn style={{ marginBottom: '2.5rem' }}>
          <Label>{DEMO ? 'Example Sessions' : 'Book a Session'}</Label>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--green-deep)' }}>Session Options</h2>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {sessions?.map((s) => (
            <FadeIn key={s.title} style={{
              background: s.highlight ? 'var(--green-deep)' : 'var(--card)',
              padding: '2rem',
              border: s.highlight ? 'none' : '1px solid var(--border)',
              position: 'relative',
            }}>
              {s.tag && (
                <span style={{
                  position: 'absolute', top: '-1px', right: '1.2rem',
                  background: 'var(--amber)', padding: '0.18rem 0.7rem',
                  fontFamily: 'Lato, sans-serif', fontSize: '0.62rem',
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff',
                }}>{s.tag}</span>
              )}
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: s.highlight ? 'rgba(212,165,116,0.6)' : 'var(--amber)', marginBottom: '0.5rem' }}>{s.duration}</p>
              <h4 style={{ fontSize: '1.2rem', color: s.highlight ? 'var(--cream)' : 'var(--green-deep)', marginBottom: '0.75rem' }}>{s.title}</h4>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.83rem', color: s.highlight ? 'rgba(247,243,237,0.6)' : 'var(--muted)', fontWeight: 300, lineHeight: 1.75, marginBottom: '1.2rem' }}>{s.description}</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: s.highlight ? 'var(--amber-light)' : 'var(--green-deep)' }}>{s.price}</p>
            </FadeIn>
          ))}
        </div>

        <FadeIn style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 300, marginBottom: '2rem' }}>
            {DEMO
              ? 'Example sessions and prices for the vision preview. Booking is not live yet.'
              : 'All sessions include a 15-minute follow-up available within 72 hours.'}
          </p>
          {DEMO
            ? <Button href="/resources" variant="amber_outline" size="lg">Explore Resources</Button>
            : <Button href="/contact" variant="amber" size="lg">Book a Session</Button>}
        </FadeIn>
      </div>
    </div>
  );
}
