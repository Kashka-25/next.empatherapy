import Button from '@/components/ui/Button';
import FadeIn from '@/components/ui/FadeIn';
import Label from '@/components/ui/Label';

export const metadata = {
  title: 'Philosophy | Empatherapy',
};

const sections = [
  {
    label: 'The Foundation',
    title: 'Emotions are not the enemy',
    body: [
      "Empatherapy was built on a single, radical premise: your emotions — all of them — are intelligent. They are not obstacles to overcome or symptoms to suppress. They are messengers carrying the truth of your inner world.",
      "When we learn to listen to our emotions rather than flee from them, something shifts. Grief becomes a testament to love. Anger reveals what we value. Fear points toward what matters. Shame shows us where we learned to abandon ourselves.",
      "In this space, every feeling is welcomed — not to be wallowed in, but to be witnessed. Fully, safely, and without shame.",
    ],
  },
  {
    label: 'The Approach',
    title: 'Intuitive, not prescriptive',
    body: [
      "Sessions at Empatherapy do not follow a rigid protocol. They begin with open dialogue and unfold based on your emotional landscape — what is alive, what wants attention, what is ready to move.",
      "We draw from a wide range of modalities: somatic awareness, Internal Family Systems principles, shadow work, Reiki, meditation, visualisation, and psychedelic integration. Not because we believe in any one framework above others — but because healing is an art, not a formula.",
      "You are not a diagnosis. You are a human being in process.",
    ],
  },
  {
    label: 'The Relationship',
    title: 'You are your own primary healer',
    body: [
      "Our guides do not heal you. They create the conditions in which your own healing intelligence can arise.",
      "This distinction matters. It means you retain full authority over your own experience. Your guide is a mirror, a witness, a supportive presence — never an authority over what is true for you.",
      "Empathy, safety, compassion, and empowerment are not just values we aspire to — they are the method itself.",
    ],
  },
  {
    label: 'The Platform',
    title: 'Why we exist',
    body: [
      "Finding the right therapist is hard. Many people give up after a few mismatched sessions. Others never start because the financial commitment feels too high before finding the right fit.",
      "Empatherapy was built to solve this. We make it possible to explore different guides, try a session, and find someone whose presence genuinely resonates — before any long-term commitment.",
      "Healing should not be a luxury. That is why every session contributes to our Community Healing Fund, ensuring support remains accessible for those who cannot afford it.",
    ],
  },
];

const values = [
  { t: 'Empathy',        d: 'The first principle. Without it, nothing else works.' },
  { t: 'Safety',         d: 'Healing requires trust. We create conditions where you can let your guard down.' },
  { t: 'Autonomy',       d: 'You remain the authority over your own experience. Always.' },
  { t: 'Accessibility',  d: 'Support should not be available only to those who can afford it.' },
  { t: 'Non-judgement',  d: 'No emotion is too much. No part of you is unwelcome here.' },
  { t: 'Integrity',      d: 'Soul-led, values-aligned, honest. In practice and in business.' },
];

export default function AboutPage() {
  return (
    <div style={{ paddingTop: '72px' }}>
      {/* Header */}
      <div style={{ padding: '6.5rem 2rem', background: 'var(--green-deep)', textAlign: 'center' }}>
        <Label>Philosophy</Label>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,5vw,4.2rem)', fontWeight: 300, color: 'var(--cream)', maxWidth: '680px', margin: '0 auto 1.5rem', lineHeight: 1.1 }}>
          Healing as <em style={{ fontStyle: 'italic', color: 'var(--amber-light)' }}>remembering</em>
        </h1>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '1rem', color: 'rgba(247,243,237,0.62)', fontWeight: 300, maxWidth: '460px', margin: '0 auto', lineHeight: 1.85 }}>
          Not fixing. Not becoming someone new. Returning to the wholeness you never actually lost.
        </p>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 'var(--max-w-narrow)', margin: '0 auto', padding: '6rem 2rem' }}>
        {sections.map((sec, i) => (
          <FadeIn key={sec.label} style={{ marginBottom: '5rem', paddingBottom: '5rem', borderBottom: i < sections.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <Label>{sec.label}</Label>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.7rem,3vw,2.4rem)', color: 'var(--green-deep)', marginBottom: '2rem' }}>{sec.title}</h2>
            {sec.body.map((p, j) => (
              <p key={j} style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.95rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.95, marginBottom: '1.2rem' }}>{p}</p>
            ))}
          </FadeIn>
        ))}

        {/* Values */}
        <FadeIn>
          <Label>Our Values</Label>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', color: 'var(--green-deep)', marginBottom: '2.5rem' }}>What we stand for</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            {values.map((v) => (
              <div key={v.t} style={{ paddingTop: '1.5rem', borderTop: '2px solid var(--amber)' }}>
                <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', color: 'var(--green-deep)', marginBottom: '0.5rem' }}>{v.t}</h4>
                <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.75 }}>{v.d}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn style={{ marginTop: '5rem', textAlign: 'center' }}>
          <Button href="/therapists" variant="amber" size="lg">Meet Our Guides</Button>
        </FadeIn>
      </div>
    </div>
  );
}
