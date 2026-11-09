import Link from 'next/link';
import Button from '@/components/ui/Button';
import FadeIn from '@/components/ui/FadeIn';
import Label from '@/components/ui/Label';
import TherapistCard from '@/components/therapists/TherapistCard';
import { therapists } from '@/lib/data';
import { DEMO, T } from '@/lib/demo';

export const metadata = {
  title: 'Empatherapy | Where Humanity is Our Medicine',
};

export default function HomePage() {
  return (
    <div>
      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: 'linear-gradient(155deg, #152B22 0%, #1E3A2F 40%, #2D5241 75%, #3D6654 100%)',
        position: 'relative', overflow: 'hidden', padding: '120px 2rem 80px',
      }}>
        <div style={{ position: 'absolute', top: '20%', right: '-5%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,124,76,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(700px,90vw)', height: 'min(700px,90vw)', borderRadius: '50%', border: '1px solid rgba(212,165,116,0.07)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: '760px' }}>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.68rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(212,165,116,0.7)', marginBottom: '2.2rem' }}>
            Holistic Healing · Sydney & Online
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(3.2rem,7.5vw,6rem)', lineHeight: 1.05, color: '#F7F3ED', marginBottom: '2rem' }}>
            Where humanity<br />
            <em style={{ fontStyle: 'italic', color: 'var(--amber-light)' }}>is our medicine</em>
          </h1>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '1.05rem', lineHeight: 1.85, color: 'rgba(247,243,237,0.68)', maxWidth: '520px', margin: '0 auto 3.5rem', fontWeight: 300 }}>
            Empatherapy connects you with guides who meet you where you are — in your emotions, in your body, in your becoming.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button href="/therapists" variant="amber" size="lg">{T.findCta}</Button>
            <Button href="/about" variant="ghost" size="lg">Our Philosophy</Button>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(247,243,237,0.3)' }}>Scroll</p>
          <div style={{ width: '1px', height: '44px', background: 'linear-gradient(to bottom, rgba(247,243,237,0.3), transparent)' }} />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: 'var(--section-pad)', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <Label>How It Works</Label>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--green-deep)' }}>Your path to finding the right guide</h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
            {[
              { n: '01', t: 'Explore', b: 'Browse our guides and read about their approach, style, and areas of focus. There is no right or wrong — only resonance.' },
              { n: '02', t: 'Try a Session', b: 'Book a trial session before committing. Experience the presence of your guide and see what unfolds naturally.' },
              { n: '03', t: 'Come Home', b: 'Find someone whose presence supports your unfolding. Return as often as you need — on your terms.' },
            ].map((step, i) => (
              <FadeIn key={step.n} delay={i + 1} style={{ padding: '2.5rem', background: 'var(--card)', borderTop: '2px solid var(--amber)', position: 'relative' }}>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '3.8rem', fontWeight: 300, color: 'var(--linen)', lineHeight: 1, position: 'absolute', top: '1.2rem', right: '1.5rem' }}>{step.n}</p>
                <h3 style={{ fontSize: '1.65rem', color: 'var(--green-deep)', marginBottom: '1rem' }}>{step.t}</h3>
                <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.92rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.85 }}>{step.b}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUIDES PREVIEW ── */}
      <section style={{ padding: 'var(--section-pad)', background: 'var(--linen)' }}>
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto' }}>
          <FadeIn style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <Label>{DEMO ? 'Our Alchemists' : 'Our Guides'}</Label>
              <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--green-deep)' }}>Find someone who resonates</h2>
            </div>
            <Button href="/therapists" variant="outline">{`View All ${T.many}`}</Button>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {(DEMO ? therapists.slice(0, 3) : therapists).map((t) => <TherapistCard key={t.slug} therapist={t} />)}
            {(DEMO ? [] : [1, 2]).map((i) => (
              <FadeIn key={i} delay={i} style={{ background: 'var(--card)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '420px', opacity: 0.45 }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.2rem', fontSize: '1.5rem', color: 'var(--border)' }}>+</div>
                <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>{T.comingSoon}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE ── */}
      <section style={{ padding: '9rem 2rem', background: 'var(--green-deep)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,124,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <FadeIn style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontStyle: 'italic', fontWeight: 300, color: 'rgba(247,243,237,0.9)', lineHeight: 1.65, marginBottom: '2rem' }}>
            "You don't need to be fixed. You just need a space where you can feel held — and be met in it."
          </p>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(212,165,116,0.65)' }}>— Cassidy Dugan, Founder</p>
        </FadeIn>
      </section>

      {/* ── FUND TEASER ── */}
      <section style={{ padding: 'var(--section-pad)', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '5rem', alignItems: 'center' }}>
          <FadeIn>
            <Label>Community Healing Fund</Label>
            <h2 style={{ fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', color: 'var(--green-deep)', marginBottom: '1.5rem' }}>Healing shouldn't depend on wealth</h2>
            <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.93rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.9, marginBottom: '2rem' }}>
              Every session at Empatherapy includes a 10% contribution to our Community Healing Fund — supporting those who cannot afford therapeutic support.
            </p>
            <Button href="/fund" variant="amber_outline">Learn More</Button>
          </FadeIn>
          <FadeIn delay={1}>
            <div style={{ background: 'var(--green-deep)', padding: '3.5rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '5rem', fontWeight: 300, color: 'var(--amber)', lineHeight: 1, marginBottom: '0.75rem' }}>10%</p>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(247,243,237,0.5)', lineHeight: 1.8 }}>of every session<br />funds community healing</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: 'var(--section-pad)', background: 'var(--linen)', textAlign: 'center' }}>
        <FadeIn style={{ maxWidth: '580px', margin: '0 auto' }}>
          <Label>Begin Here</Label>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--green-deep)', marginBottom: '1.5rem', lineHeight: 1.2 }}>
            You are more powerful than<br /><em style={{ fontStyle: 'italic' }}>you've been taught to believe</em>
          </h2>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.93rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.9, marginBottom: '2.5rem' }}>
            Explore our guides and try a session. No pressure. No long-term commitment. Just a space to be met.
          </p>
          <Button href="/therapists" variant="amber" size="lg">{T.findCta}</Button>
        </FadeIn>
      </section>
    </div>
  );
}
