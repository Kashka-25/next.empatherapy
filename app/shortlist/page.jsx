import Eyebrow from '@/components/ui/Eyebrow';
import ShortlistView from '@/components/alchemists/ShortlistView';
import { publicContent } from '@/lib/content-store.mjs';

export const revalidate = 60;

export const metadata = {
  title: 'My shortlist',
  description: 'The Alchemists you have saved, kept only in your own browser.',
  robots: { index: false, follow: true }, // personal to the visitor, so not for search engines
};

export default async function ShortlistPage() {
  const { alchemists, modalities } = await publicContent();
  return (
    <>
      <section className="page-head">
        <div className="container">
          <Eyebrow>My shortlist</Eyebrow>
          <h1>People you want to remember</h1>
          <p className="lede">Take your time. Anyone you save is kept only in this browser, on this device. We never see it, there is no account, and clearing your browser&rsquo;s site data clears it.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
          <ShortlistView alchemists={alchemists} modalities={modalities} />
        </div>
      </section>
    </>
  );
}
