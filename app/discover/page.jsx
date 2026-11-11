import DiscoverFlow from '@/components/discover/DiscoverFlow';
import { publicContent } from '@/lib/content-store.mjs';

export const revalidate = 60;

export const metadata = {
  title: 'Begin your discovery',
  description: 'Tell us a little about what is on your mind and explore modalities and Alchemists that might resonate. Nothing you write is saved.',
};

export default async function DiscoverPage() {
  const { alchemists, modalities } = await publicContent();
  return (
    <section className="discover-shell">
      <div className="container container--narrow">
        <DiscoverFlow alchemists={alchemists} modalities={modalities} />
      </div>
    </section>
  );
}
