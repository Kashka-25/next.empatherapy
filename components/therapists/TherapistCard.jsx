import Link from 'next/link';
import TherapistTags from './TherapistTags';
import Card from '@/components/ui/Card';

export default function TherapistCard({ therapist }) {
  const { name, slug, title, initials, shortBio, specialties, sessions, avatar } = therapist;
  const trialSession = sessions?.find((s) => s.highlight);

  return (
    <Link href={`/therapists/${slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <Card style={{ border: 'none', cursor: 'pointer' }}>
        {/* Avatar */}
        <div style={{
          height: '280px',
          background: avatar ? `linear-gradient(160deg, ${avatar[1]}, ${avatar[0]})` : 'linear-gradient(160deg, #2D5241, #1E3A2F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{ width: '140px', height: '140px', borderRadius: '50%', border: '1px solid rgba(212,165,116,0.15)', position: 'absolute' }} />
          <div style={{
            width: '115px', height: '115px', borderRadius: '50%',
            background: 'rgba(212,165,116,0.1)',
            border: '1px solid rgba(212,165,116,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cormorant Garamond, serif', fontSize: '3rem', fontWeight: 300,
            color: 'rgba(212,165,116,0.85)',
          }}>
            {initials}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '2.2rem' }}>
          <h3 style={{ fontSize: '1.55rem', color: 'var(--green-deep)', marginBottom: '0.25rem' }}>{name}</h3>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.7rem', color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.1rem' }}>{title}</p>
          <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.87rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.8, marginBottom: '1.5rem' }}>{shortBio}</p>
          <TherapistTags tags={specialties?.slice(0, 4)} />

          <div style={{ paddingTop: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.82rem', color: 'var(--muted)' }}>
              {trialSession ? `Trial from ${trialSession.price}` : 'Sessions available'}
            </span>
            <span style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green-deep)' }}>View Profile →</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
