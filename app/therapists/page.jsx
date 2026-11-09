import Button from '@/components/ui/Button';
import FadeIn from '@/components/ui/FadeIn';
import Label from '@/components/ui/Label';
import TherapistCard from '@/components/therapists/TherapistCard';
import { therapists } from '@/lib/data';
import { DEMO, T } from '@/lib/demo';

export const metadata = {
  title: `${DEMO ? 'Find an Alchemist' : 'Find a Guide'} | Empatherapy`,
};

export default function TherapistsPage() {
  return (
    <div style={{ paddingTop: '72px' }}>
      {/* Header */}
      <div style={{ padding: '6rem 2rem 4.5rem', background: 'var(--green-deep)', textAlign: 'center' }}>
        <Label>{DEMO ? 'Our Alchemists' : 'Our Guides'}</Label>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,5vw,4rem)', fontWeight: 300, color: 'var(--cream)', marginBottom: '1.5rem' }}>
          {T.findTitle}
        </h1>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '1rem', color: 'rgba(247,243,237,0.62)', fontWeight: 300, maxWidth: '480px', margin: '0 auto', lineHeight: 1.85 }}>
          {DEMO ? 'Each Alchemist brings their own unique presence.' : 'Each guide brings their own unique presence.'} Trust your instinct — and if it feels right, try a session before committing.
        </p>
      </div>

      {/* Grid */}
      <div style={{ padding: '5rem 2rem', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem' }}>
          {therapists.map((t) => (
            <FadeIn key={t.slug}><TherapistCard therapist={t} /></FadeIn>
          ))}
          {(DEMO ? [1, 2] : [1, 2, 3]).map((i) => (
            <FadeIn key={i} delay={i} style={{ background: 'var(--card)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '460px', opacity: 0.42 }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.3rem', fontSize: '1.6rem', color: 'var(--border)' }}>+</div>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>{T.comingSoon}</p>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* Practitioner CTA */}
      <div style={{ padding: '5.5rem 2rem', background: 'var(--linen)', textAlign: 'center' }}>
        <FadeIn style={{ maxWidth: '480px', margin: '0 auto' }}>
          <Label>Are you a practitioner?</Label>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', color: 'var(--green-deep)', marginBottom: '1rem' }}>Join the Empatherapy platform</h3>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.88rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.85, marginBottom: '2rem' }}>
            We're building a home for values-aligned practitioners. Reach out to learn about joining.
          </p>
          <Button href="/contact" variant="outline">Get in Touch</Button>
        </FadeIn>
      </div>
    </div>
  );
}
