import Link from 'next/link';
import { notFound } from 'next/navigation';
import Eyebrow from '@/components/ui/Eyebrow';
import Button from '@/components/ui/Button';
import AlchemistCard from '@/components/alchemists/AlchemistCard';
import ModalityCard from '@/components/modalities/ModalityCard';
import { Icon } from '@/components/art/Botanicals';
import { bySlug, alchemistsFor } from '@/lib/content.mjs';
import { publicContent } from '@/lib/content-store.mjs';
import { loadPublicPosts } from '@/lib/posts-store.mjs';
import { postsAbout } from '@/lib/posts.mjs';
import PostCard from '@/components/knowledge/PostCard';

export const revalidate = 60;

export async function generateStaticParams() {
  return (await publicContent()).modalities.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }) {
  const m = bySlug((await publicContent()).modalities, params.slug);
  return m ? { title: m.name, description: m.short_description } : {};
}

const KIND = {
  traditional: 'Traditional belief',
  practitioner: 'Practitioner perspective',
  research: 'Preliminary research',
  established: 'Established evidence',
};

export default async function ModalityPage({ params }) {
  const { alchemists, modalities } = await publicContent();
  const m = bySlug(modalities, params.slug);
  if (!m) notFound();
  const who = alchemistsFor(m, alchemists);
  const writing = postsAbout(await loadPublicPosts(), m.slug).slice(0, 3);
  const related = m.related_modalities.map((s) => bySlug(modalities, s)).filter(Boolean);

  return (
    <>
      <section className="page-head">
        <div className="container">
          <Link href="/modalities" className="link-arrow" style={{ justifySelf: 'start' }}>All modalities</Link>
          <div className="row" style={{ gap: '1rem' }}>
            <span className="modality-card__icon" style={{ width: 64, height: 64 }}><Icon name={m.icon} /></span>
            <Eyebrow>Explore Modalities</Eyebrow>
          </div>
          <h1>{m.name}</h1>
          <p className="lede">{m.short_description}</p>
        </div>
      </section>

      <div className="container container--narrow" style={{ paddingBlock: 'var(--section-pad)' }}>
        <div className="qa">
          <section><h2>What is it?</h2><p>{m.full_description}</p></section>
          <section><h2>Where does it come from?</h2><p>{m.origins}</p></section>
          <section><h2>How is it practised?</h2><p>{m.practice_description}</p></section>
          <section><h2>What happens in a typical session?</h2><p>{m.typical_session}</p></section>
          <section>
            <h2>What do people commonly explore it for?</h2>
            <ul className="tick-list">{m.commonly_explored_for.map((c) => <li key={c}>{c}</li>)}</ul>
          </section>
          <section>
            <h2>What does the evidence say?</h2>
            <p style={{ color: 'var(--muted)' }}>We separate different kinds of knowing so you can weigh them for yourself.</p>
            <div className="evidence">
              {m.evidence_information.map((e) => (
                <div className="evidence__item" key={e.kind + e.text.slice(0, 12)}>
                  <span className="evidence__kind">{KIND[e.kind]}</span>
                  <p>{e.text}</p>
                </div>
              ))}
            </div>
          </section>
          <section><h2>What are its limits?</h2><p>{m.limitations}</p></section>
          <section>
            <div className="note-card note-card--safety">
              <h2 style={{ fontSize: '1.35rem' }}>Safety and who should take extra care</h2>
              <p>{m.contraindications}</p>
              <p style={{ fontSize: '0.92rem' }}>This page is general education, not medical advice. Please talk with a doctor or qualified professional about your own situation.</p>
            </div>
          </section>
        </div>
      </div>

      {writing.length ? (
        <section className="section">
          <div className="container stack" style={{ gap: '1.4rem' }}>
            <Eyebrow>From Alchemists</Eyebrow>
            <h2>Writing about {m.name}</h2>
            <div className="post-grid">{writing.map((p) => <PostCard key={p.id} post={p} />)}</div>
          </div>
        </section>
      ) : null}

      <section className="section section--linen">
        <div className="container">
          <div className="section-head">
            <Eyebrow>Meet the Alchemists</Eyebrow>
            <h2>People who offer {m.name.toLowerCase()}</h2>
          </div>
          {who.length ? (
            <div className="grid-cards">{who.map((a) => <AlchemistCard key={a.id} alchemist={a} modalities={modalities} />)}</div>
          ) : (
            <div className="empty"><p>No Alchemists offer this yet.</p><Button href="/become-an-alchemist" variant="soft">Become an Alchemist</Button></div>
          )}
        </div>
      </section>

      {related.length ? (
        <section className="section">
          <div className="container">
            <div className="section-head"><Eyebrow>Keep exploring</Eyebrow><h2>Related modalities worth a look</h2></div>
            <div className="feature-grid">{related.map((r) => <ModalityCard key={r.id} modality={r} />)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
