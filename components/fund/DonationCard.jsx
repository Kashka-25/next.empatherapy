import Button from '@/components/ui/Button';

export default function DonationCard({ title, description, cta, href = '/contact' }) {
  return (
    <div style={{ padding: '2.5rem', border: '1px solid var(--border)', background: 'var(--card)' }}>
      <div style={{ width: '36px', height: '2px', background: 'var(--amber)', marginBottom: '1.5rem' }} />
      <h4 style={{ fontSize: '1.35rem', color: 'var(--green-deep)', marginBottom: '0.9rem' }}>{title}</h4>
      <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.87rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.8, marginBottom: '2rem' }}>{description}</p>
      <Button href={href} variant="outline" size="sm">{cta}</Button>
    </div>
  );
}
