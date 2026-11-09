import { notFound } from 'next/navigation';
import Link from 'next/link';
import FadeIn from '@/components/ui/FadeIn';
import Label from '@/components/ui/Label';
import { DEMO } from '@/lib/demo';
import { therapists } from '@/lib/data';
import { demoResources } from '@/data/demo/resources';

export const metadata = {
  title: 'Resources | Empatherapy',
};

/** Vision-demo only: example Resources section. Not available on the regular site yet. */
export default function ResourcesPage() {
  if (!DEMO) notFound();
  const slugFor = (name) => therapists.find((t) => t.name === name)?.slug;

  return (
    <div style={{ paddingTop: '72px' }}>
      <div style={{ padding: '6rem 2rem 4.5rem', background: 'var(--green-deep)', textAlign: 'center' }}>
        <Label>For Seekers</Label>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,5vw,4rem)', fontWeight: 300, color: 'var(--cream)', marginBottom: '1.5rem' }}>
          Resources
        </h1>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '1rem', color: 'rgba(247,243,237,0.62)', fontWeight: 300, maxWidth: '520px', margin: '0 auto', lineHeight: 1.85 }}>
          Short practices and guides from our Alchemists, for the days between sessions. These are examples of what this section will hold.
        </p>
      </div>

      <div style={{ padding: '5rem 2rem', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.75rem' }}>
          {demoResources.map((r, i) => {
            const slug = slugFor(r.by);
            return (
              <FadeIn key={r.title} delay={(i % 3) + 1} style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--amber)' }}>
                  {r.kind} · {r.minutes} min
                </p>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--green-deep)' }}>{r.title}</h3>
                <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.88rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.8, flex: 1 }}>{r.summary}</p>
                <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.78rem', color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
                  From {slug ? <Link href={`/therapists/${slug}`} style={{ color: 'var(--green-deep)', textDecoration: 'underline' }}>{r.by}</Link> : r.by}
                </p>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </div>
  );
}
