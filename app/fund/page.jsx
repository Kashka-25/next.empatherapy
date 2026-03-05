import Button from '@/components/ui/Button';
import FadeIn from '@/components/ui/FadeIn';
import Label from '@/components/ui/Label';
import DonationCard from '@/components/fund/DonationCard';

export const metadata = {
  title: 'Community Healing Fund | Empatherapy',
};

const stats = [
  { n: '10%', l: 'of every session\ncontributed automatically' },
  { n: '∞',   l: 'No session cap\nfor fund recipients' },
  { n: '0',   l: 'Questions asked\nabout financial need' },
];

const contributions = [
  { title: 'Book a Session',   description: 'Every session automatically contributes 10% to the fund. No extra step required.',        cta: 'Find a Guide', href: '/therapists' },
  { title: 'Direct Donation',  description: 'Contribute directly to the fund to expand access for more people.',                        cta: 'Get in Touch',  href: '/contact' },
  { title: 'Sponsor a Session',description: 'Gift a session to someone who cannot afford it. Completely anonymous if preferred.',        cta: 'Learn More',    href: '/contact' },
];

export default function FundPage() {
  return (
    <div style={{ paddingTop: '72px' }}>
      {/* Header */}
      <div style={{ padding: '7rem 2rem', background: 'linear-gradient(160deg, #152B22, #1E3A2F, #2D5241)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,124,76,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <Label>Community</Label>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontWeight: 300, color: 'var(--cream)', marginBottom: '1.5rem', lineHeight: 1.1 }}>
            The Community<br /><em style={{ fontStyle: 'italic', color: 'var(--amber-light)' }}>Healing Fund</em>
          </h1>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '1.05rem', color: 'rgba(247,243,237,0.62)', fontWeight: 300, maxWidth: '460px', margin: '0 auto', lineHeight: 1.85 }}>
            Healing should not be a privilege. This fund exists to change that.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '6rem 2rem' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '5.5rem' }}>
          {stats.map((s) => (
            <FadeIn key={s.n} style={{ background: 'var(--green-deep)', padding: '2.5rem 2rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '3.8rem', fontWeight: 300, color: 'var(--amber)', lineHeight: 1, marginBottom: '1rem' }}>{s.n}</p>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.75rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(247,243,237,0.5)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{s.l}</p>
            </FadeIn>
          ))}
        </div>

        {/* How it works */}
        <FadeIn style={{ marginBottom: '5rem' }}>
          <Label>How It Works</Label>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.2rem', color: 'var(--green-deep)', marginBottom: '2rem' }}>Built into every session</h2>
          {[
            "The Community Healing Fund is not an afterthought — it is structural. 10% of every session booked through Empatherapy is automatically allocated to the fund.",
            "The fund supports individuals experiencing financial hardship who would otherwise not have access to meaningful therapeutic support. No proof of income, no shame, no lengthy process. Just reach out.",
            "When you book a session at Empatherapy, you are not just investing in yourself. You are contributing — quietly, automatically — to someone else's ability to access support too.",
          ].map((p, i) => (
            <p key={i} style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.93rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.95, marginBottom: '1.2rem' }}>{p}</p>
          ))}
        </FadeIn>

        {/* Contribution options */}
        <FadeIn style={{ marginBottom: '5rem' }}>
          <Label>Ways to Contribute</Label>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.2rem', color: 'var(--green-deep)', marginBottom: '2.5rem' }}>Extend your impact</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {contributions.map((c) => <DonationCard key={c.title} {...c} />)}
          </div>
        </FadeIn>

        {/* Access the fund */}
        <FadeIn style={{ background: 'var(--linen)', padding: '3.5rem', borderLeft: '3px solid var(--amber)' }}>
          <Label>Need Support?</Label>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', color: 'var(--green-deep)', marginBottom: '1.2rem' }}>Accessing the fund</h3>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.92rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.95, marginBottom: '2rem' }}>
            If financial hardship is a barrier to accessing therapeutic support, please reach out. There is no means testing, no lengthy process, and no judgment. Simply contact us and let us know what you need.
          </p>
          <Button href="/contact" variant="solid">Reach Out</Button>
        </FadeIn>
      </div>
    </div>
  );
}
