import FadeIn from '@/components/ui/FadeIn';
import Eyebrow from '@/components/ui/Eyebrow';
import ModalityCard from '@/components/modalities/ModalityCard';
import { modalities } from '@/lib/content.mjs';
import { currentFeatures } from '@/lib/features.mjs';

export const revalidate = 3600; // refresh hourly so the weekly feature rolls over without a redeploy

export const metadata = {
  title: 'Explore Modalities',
  description: 'Plain-language guides to alternative and holistic practices: where they come from, what a session is like, what the evidence says and who offers them.',
};

export default async function ModalitiesPage() {
  const features = await currentFeatures(new Date());
  const byId = (id) => modalities.find((m) => m.id === id);
  const featuredIds = new Set(features.map((f) => f.modality_id));
  const rest = modalities.filter((m) => !featuredIds.has(m.id) && m.publication_status === 'published');

  return (
    <>
      <section className="page-head">
        <div className="container">
          <Eyebrow>Explore Modalities</Eyebrow>
          <h1>A curious reader&rsquo;s guide to ways of caring for yourself</h1>
          <p className="lede">Every practice here is explained honestly: what it is, where it comes from, what it can feel like and where its limits are. We keep traditional belief, practitioner experience and research clearly apart.</p>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: '2rem' }}>
        <div className="container">
          <div className="section-head">
            <Eyebrow>Featured this week</Eyebrow>
            <h2>Start with these</h2>
          </div>
          <div className="feature-grid">
            {features.map((f, i) => { const m = byId(f.modality_id); return m ? <FadeIn key={f.id} delay={i + 1}><ModalityCard modality={m} intro={f.editorial_introduction} /></FadeIn> : null; })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <Eyebrow>The library</Eyebrow>
            <h2>More to explore</h2>
          </div>
          <div className="feature-grid">
            {rest.map((m) => <ModalityCard key={m.id} modality={m} />)}
          </div>
        </div>
      </section>
    </>
  );
}
