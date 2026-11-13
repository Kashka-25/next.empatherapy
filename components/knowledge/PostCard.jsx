import Link from 'next/link';
import { KIND_LABEL, readingMinutes } from '@/lib/posts.mjs';

/** One post in the feed: what kind of writing it is, the title, the summary and who wrote it. */
export default function PostCard({ post }) {
  return (
    <article className="post-card">
      <div className="row">
        <span className="tag tag--sage">{KIND_LABEL[post.kind] ?? post.kind}</span>
        <span className="small" style={{ color: 'var(--muted)' }}>{readingMinutes(post.body)} min read</span>
      </div>
      <h3><Link href={`/knowledge/${post.slug}`}>{post.title}</Link></h3>
      <p>{post.summary}</p>
      <p className="small" style={{ color: 'var(--muted)' }}>
        By <Link href={`/alchemists/${post.author.slug}`} className="link-arrow">{post.author.name}</Link>
        {post.published_at ? <> · <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString('en-AU', { dateStyle: 'medium' })}</time></> : null}
      </p>
    </article>
  );
}
