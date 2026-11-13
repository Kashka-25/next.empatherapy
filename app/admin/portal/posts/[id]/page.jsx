import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortal } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { postToForm, STATUS_LABEL } from '@/lib/posts.mjs';
import PostEditor from '@/components/admin/PostEditor';
import { portalSavePostAction, portalDeletePostAction } from '../../../actions';

export const metadata = { title: 'Write a post' };

const BLANK = { title: '', kind: '', summary: '', body: '', modality_slugs: [], sources: '', license_ok: false };

export default async function PortalPost({ params, searchParams }) {
  const me = await requirePortal();
  const store = getStore();
  if (!store) notFound();
  const isNew = params.id === 'new';
  const post = isNew ? null : await store.get('posts', params.id);
  if (!isNew && (!post || post.profile_id !== me.profile_id)) notFound(); // never anyone else's
  const { modalities } = await loadContent(store);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/portal/posts" className="link-arrow" style={{ justifySelf: 'start' }}>Your writing</Link>
      <div className="row" style={{ justifyContent: 'space-between', gap: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>{isNew ? 'Write a post' : post.title}</h1>
        {post ? <span className="tag">{STATUS_LABEL[post.status]}</span> : null}
      </div>
      {searchParams?.saved === 'submitted' ? <p className="admin-flash" role="status">Sent. The team will read it, and you will see it here when it is published or if they have a note for you.</p> : null}
      {searchParams?.saved === 'draft' ? <p className="admin-flash" role="status">Draft saved. It is private to you until you send it for review.</p> : null}
      {post?.status === 'rejected' ? <p className="demo-note" role="status"><strong>This was not approved.</strong>{post.review_note ? ` ${post.review_note}` : ''} You can change it and send it again.</p> : null}

      <PostEditor action={portalSavePostAction} id={post?.id ?? ''} initial={post ? postToForm(post) : BLANK} modalities={modalities.filter((m) => m.publication_status === 'published')} status={post?.status ?? 'draft'} />

      {post ? (
        <form action={portalDeletePostAction} className="admin-card stack">
          <input type="hidden" name="id" value={post.id} />
          <h2 style={{ fontSize: '1.15rem' }}>Delete this post</h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>Removes it from the feed for good. Anyone who has already copied it under its licence may keep their copy.</p>
          <label className="check"><input type="checkbox" name="confirm" required /><span>Yes, delete it.</span></label>
          <button type="submit" className="btn btn--soft btn--sm" style={{ borderColor: '#9B3B22', color: '#9B3B22', justifySelf: 'start' }}>Delete</button>
        </form>
      ) : null}
    </div>
  );
}
