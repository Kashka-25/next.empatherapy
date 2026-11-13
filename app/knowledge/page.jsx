import Link from 'next/link';
import Eyebrow from '@/components/ui/Eyebrow';
import PostCard from '@/components/knowledge/PostCard';
import { loadPublicPosts } from '@/lib/posts-store.mjs';
import { publicContent } from '@/lib/content-store.mjs';
import { POST_KINDS, KIND_LABEL, LICENSE } from '@/lib/posts.mjs';

export const revalidate = 60;
export const metadata = {
  title: 'Knowledge feed',
  description: 'Free, openly licensed writing from Alchemists: practice guides, traditions, research summaries and lived experience, each clearly labelled.',
};

export default async function KnowledgePage({ searchParams }) {
  const [posts, { modalities }] = await Promise.all([loadPublicPosts(), publicContent()]);
  const kind = POST_KINDS.includes(searchParams?.kind) ? searchParams.kind : null;
  const modality = modalities.find((m) => m.slug === searchParams?.about) ?? null;
  const shown = posts.filter((p) => (!kind || p.kind === kind) && (!modality || p.modality_slugs?.includes(modality.slug)));
  const usedModalities = modalities.filter((m) => posts.some((p) => p.modality_slugs?.includes(m.slug)));
  const href = (k, a) => { const q = new URLSearchParams(); if (k) q.set('kind', k); if (a) q.set('about', a); const s = q.toString(); return s ? `/knowledge?${s}` : '/knowledge'; };

  return (
    <>
      <section className="page-head">
        <div className="container">
          <Eyebrow>Knowledge feed</Eyebrow>
          <h1>Learn from the people who practise</h1>
          <p className="lede">Alchemists choose to share what they know, so you can learn at your own pace before you ever reach out. It is free to read and openly licensed, and you can follow it with any feed reader at <a href="/knowledge/feed.xml" className="link-arrow">/knowledge/feed.xml</a>.</p>
        </div>
      </section>

      <section className="section">
        <div className="container stack" style={{ gap: '2rem' }}>
          <p className="demo-note" role="note">Everything here is educational, not medical advice. Each piece says what kind of writing it is, so you can tell a personal story from a research summary. Please speak with a doctor about health concerns. Empatherapy is not crisis care: in an emergency call 000, or Lifeline on 13 11 14.</p>

          {posts.length ? (
            <>
              <nav className="filters" aria-label="Filter the feed">
                <div className="row">
                  <span className="filter-label">Kind</span>
                  <Link href={href(null, modality?.slug)} className={`chip${!kind ? ' is-active' : ''}`} aria-current={!kind ? 'true' : undefined}>All</Link>
                  {POST_KINDS.filter((k) => posts.some((p) => p.kind === k)).map((k) => <Link key={k} href={href(k, modality?.slug)} className={`chip${kind === k ? ' is-active' : ''}`} aria-current={kind === k ? 'true' : undefined}>{KIND_LABEL[k]}</Link>)}
                </div>
                {usedModalities.length ? (
                  <div className="row">
                    <span className="filter-label">About</span>
                    <Link href={href(kind, null)} className={`chip${!modality ? ' is-active' : ''}`}>Anything</Link>
                    {usedModalities.map((m) => <Link key={m.slug} href={href(kind, m.slug)} className={`chip${modality?.slug === m.slug ? ' is-active' : ''}`} aria-current={modality?.slug === m.slug ? 'true' : undefined}>{m.name}</Link>)}
                  </div>
                ) : null}
              </nav>
              {shown.length ? <div className="post-grid">{shown.map((p) => <PostCard key={p.id} post={p} />)}</div> : <p style={{ color: 'var(--muted)' }}>Nothing matches that yet. <Link href="/knowledge" className="link-arrow">See everything</Link>.</p>}
            </>
          ) : (
            <div className="note-card">
              <h2>The first pieces are on their way</h2>
              <p>Alchemists are writing for the feed. Check back soon, or follow it at <a href="/knowledge/feed.xml" className="link-arrow">/knowledge/feed.xml</a>. In the meantime, <Link href="/modalities" className="link-arrow">explore modalities</Link> in plain language.</p>
            </div>
          )}

          <p style={{ color: 'var(--muted)' }}>Posts are shared under <a href={LICENSE.url} className="link-arrow" rel="license noopener">{LICENSE.name}</a>: you may copy and adapt them, with credit to the author and a link back.</p>
        </div>
      </section>
    </>
  );
}
