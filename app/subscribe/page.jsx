import FadeIn from '@/components/ui/FadeIn';
import Label from '@/components/ui/Label';
import Button from '@/components/ui/Button';

export const metadata = {
  title: 'Subscribe | Empatherapy',
};

const plans = [
  {
    name: 'Supporter',
    price: 'Coming Soon',
    description: 'Monthly access with discounted sessions, priority booking, and a contribution toward the Community Healing Fund.',
    features: ['Discounted session rates', 'Priority booking', 'Access to all guides', '10% auto-contribution to fund'],
    highlight: false,
  },
  {
    name: 'Member',
    price: 'Coming Soon',
    description: 'Deeper access with additional tools, community, and reduced per-session cost.',
    features: ['Everything in Supporter', 'Community access', 'Extended follow-up window', 'Early access to new guides'],
    highlight: true,
  },
];

export default function SubscribePage() {
  return (
    <div style={{ paddingTop: '72px' }}>
      <div style={{ padding: '6rem 2rem 4.5rem', background: 'var(--green-deep)', textAlign: 'center' }}>
        <Label>Subscription</Label>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,5vw,3.8rem)', fontWeight: 300, color: 'var(--cream)', marginBottom: '1rem' }}>
          Support the community
        </h1>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.93rem', color: 'rgba(247,243,237,0.58)', fontWeight: 300, maxWidth: '420px', margin: '0 auto', lineHeight: 1.85 }}>
          Subscription plans are coming soon. For now, reach out directly to book sessions.
        </p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '6rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
          {plans.map((plan) => (
            <FadeIn key={plan.name} style={{ background: plan.highlight ? 'var(--green-deep)' : 'var(--card)', padding: '2.5rem', border: plan.highlight ? 'none' : '1px solid var(--border)', position: 'relative' }}>
              {plan.highlight && (
                <span style={{ position: 'absolute', top: '-1px', right: '1.5rem', background: 'var(--amber)', padding: '0.2rem 0.75rem', fontFamily: 'Lato, sans-serif', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>Popular</span>
              )}
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', color: plan.highlight ? 'var(--cream)' : 'var(--green-deep)', marginBottom: '0.5rem' }}>{plan.name}</h3>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: plan.highlight ? 'rgba(212,165,116,0.7)' : 'var(--amber)', marginBottom: '1.5rem' }}>{plan.price}</p>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.87rem', color: plan.highlight ? 'rgba(247,243,237,0.65)' : 'var(--muted)', fontWeight: 300, lineHeight: 1.8, marginBottom: '2rem' }}>{plan.description}</p>
              {plan.features.map((f) => (
                <div key={f} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: `1px solid ${plan.highlight ? 'rgba(247,243,237,0.08)' : 'var(--border)'}` }}>
                  <span style={{ color: 'var(--amber)', flexShrink: 0 }}>—</span>
                  <span style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.85rem', color: plan.highlight ? 'rgba(247,243,237,0.7)' : 'var(--muted)', fontWeight: 300 }}>{f}</span>
                </div>
              ))}
            </FadeIn>
          ))}
        </div>

        <FadeIn style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.88rem', color: 'var(--muted)', fontWeight: 300, marginBottom: '2rem' }}>
            In the meantime, book a single session to begin.
          </p>
          <Button href="/therapists" variant="amber" size="lg">Find a Guide</Button>
        </FadeIn>
      </div>
    </div>
  );
}
