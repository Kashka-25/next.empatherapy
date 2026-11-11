import DiscoverFlow from '@/components/discover/DiscoverFlow';

export const metadata = {
  title: 'Begin your discovery',
  description: 'Tell us a little about what is on your mind and explore modalities and Alchemists that might resonate. Nothing you write is saved.',
};

export default function DiscoverPage() {
  return (
    <section className="discover-shell">
      <div className="container container--narrow">
        <DiscoverFlow />
      </div>
    </section>
  );
}
