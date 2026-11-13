import Link from 'next/link';
import { notFound } from 'next/navigation';
import Eyebrow from '@/components/ui/Eyebrow';
import AlchemistPortrait from '@/components/alchemists/AlchemistPortrait';
import PostBody from '@/components/knowledge/PostBody';
import PostCard from '@/components/knowledge/PostCard';
import { loadPublicPosts } from '@/lib/posts-store.mjs';
import { publicContent } from '@/lib/content-store.mjs';
import { KIND_LABEL, KIND_HELP, LICENSE, readingMinutes } from '@/lib/posts.mjs';

export const revalidate = 60;

export async function generateStaticParams() {
  return (await loadPublicPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const post = (await loadPublicPosts()).find((p) => p.slug === params.slug);
  if (!post) return {};
  return { title: post.title, description: post.summary, openGraph: { type: 'article', title: post.title, description: post.summary, publishedTime: post.published_at, authors: [post.author.name] } };
}

export default async function PostPage({ params }) {
  const [posts, { modalities }] = await Promise.all([loadPublicPosts(), publicContent()]);
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) notFound();
  const a = post.author;
  const tagged = modalities.filter((m) => post.modality_slugs?.includes(m.slug));
  const more = posts.filter((p) => p.id !== post.id && (p.profile_id === post.profile_id || p.modality_slugs?.some((s) => post.modality_slugs?.includes(s)))).slice(0, 2);

  return (
    <>
      <section className="page-head">
        <div className="container container--narrow">
          <div className="row">
            <Link href="/knowledge" className="link-arrow">Knowledge feed</Link>
          </div>
          <Eyebrow>{KIND_LABEL[post.kind]}</Eyebrow>
          <h1>{post.title}</h1>
          <p className="lede">{post.summary}</p>
          <p className="small" style={{ color: 'var(--muted)' }}>{KIND_HELP[post.kind]} · {readingMinutes(post.body)} min read{post.published_at ? <> · <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString('en-AU', { dateStyle: 'long' })}</time></> : null}</p>
        </div>
      </section>

      <article className="section">
        <div className="container container--narrow stack" style={{ gap: '2rem' }}>
          <PostBody body={post.body} />

          {post.sources?.length ? (
            <section aria-labelledby="sources-h">
              <h2 id="sources-h" style={{ fontSize: '1.3rem' }}>Sources</h2>
              <ul className="tick-list">{post.sources.map((s) => <li key={s.url}><a href={s.url} rel="nofollow noopener" target="_blank" className="link-arrow">{s.title}</a></li>)}</ul>
            </section>
          ) : null}

          {tagged.length ? (
            <p className="row"><span className="eyebrow">Related</span>{tagged.map((m) => <Link key={m.slug} href={`/modalities/${m.slug}`} className="chip">{m.name}</Link>)}</p>
          ) : null}

          <aside className="post-author" aria-label="About the author">
            <div className="post-author__avatar"><AlchemistPortrait alchemist={a} label={false} /></div>
            <div className="stack" style={{ gap: '0.3rem' }}>
              <span className="eyebrow">Written by</span>
              <strong><Link href={`/alchemists/${a.slug}`} className="link-arrow">{a.name}</Link></strong>
              <span style={{ color: 'var(--muted)' }}>{a.title}. {a.short_bio}</span>
            </div>
          </aside>

          <p className="demo-note" role="note">This is educational writing, not medical advice, and it is one person&rsquo;s view or summary. Please speak with a doctor or qualified professional about health concerns. Empatherapy is not crisis care: in an emergency call 000, or Lifeline on 13 11 14.</p>
          <p style={{ color: 'var(--muted)' }}>Shared under <a href={LICENSE.url} rel="license noopener" className="link-arrow">{LICENSE.name}</a>. You may copy and adapt it, with credit to {a.name} and a link back to this page.</p>
        </div>
      </article>

      {more.length ? (
        <section className="section section--linen">
          <div className="container stack" style={{ gap: '1.4rem' }}>
            <h2>More to read</h2>
            <div className="post-grid">{more.map((p) => <PostCard key={p.id} post={p} />)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
