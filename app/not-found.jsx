import Button from '@/components/ui/Button';
import Eyebrow from '@/components/ui/Eyebrow';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <section className="page-head">
      <div className="container container--narrow">
        <Eyebrow>Page not found</Eyebrow>
        <h1>We could not find that page</h1>
        <p className="lede">It may have moved, or the address may have a small typo. No harm done: there is plenty more to explore.</p>
        <div className="row" style={{ marginTop: '1.4rem' }}>
          <Button href="/">Back to the beginning</Button>
          <Button href="/alchemists" variant="outline">Discover Alchemists</Button>
          <Button href="/modalities" variant="outline">Explore Modalities</Button>
        </div>
      </div>
    </section>
  );
}
