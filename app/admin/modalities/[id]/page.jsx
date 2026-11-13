import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { modalityToForm, modalityDeleteBlocker } from '@/lib/admin-content.mjs';
import ModalityEditor from '@/components/admin/ModalityEditor';
import { saveModalityAction, resetModalityAction } from '../../actions';

export const metadata = { title: 'Edit modality' };

const BLANK = {
  name: '', category: 'talking', icon: 'nature', short_description: '', full_description: '', origins: '', practice_description: '', typical_session: '',
  commonly_explored_for: '', evidence_information: '', limitations: '', contraindications: '', related_modalities: [], themes: [], styles: [],
  requires_formal_training: '', publication_status: 'draft',
};

export default async function EditModalityPage({ params, searchParams }) {
  await requireAdmin('content');
  const store = getStore();
  if (!store) notFound();
  const content = await loadContent(store);
  const isNew = params.id === 'new';
  const m = isNew ? null : content.modalities.find((x) => x.id === params.id);
  if (!isNew && !m) notFound();
  const seedBacked = m ? content.seedIds.modalities.has(m.id) : false;
  const blocker = m && !seedBacked ? modalityDeleteBlocker(m, content.alchemists, content.seedIds.modalities) : null;

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/modalities" className="link-arrow" style={{ justifySelf: 'start' }}>All modalities</Link>
      <div className="row" style={{ justifyContent: 'space-between', gap: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>{isNew ? 'New modality' : m.name}</h1>
        {m && m.publication_status === 'published' ? <Link href={`/modalities/${m.slug}`} target="_blank" className="btn btn--soft btn--sm">View public page</Link> : null}
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved. The public site updates within moments.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}
      <p className="demo-note">Modality pages are general education. Have a qualified person review anything about evidence or safety before it goes public.</p>

      <ModalityEditor
        action={saveModalityAction}
        id={m?.id ?? ''}
        initial={m ? modalityToForm(m) : BLANK}
        otherModalities={content.modalities.filter((x) => x.id !== m?.id)}
      />

      {m && content.edited.modalities.has(m.id) ? (
        <form action={resetModalityAction} className="admin-card stack">
          <input type="hidden" name="id" value={m.id} />
          <h2 style={{ fontSize: '1.15rem' }}>{seedBacked ? 'Reset to the original' : 'Delete this modality'}</h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>{seedBacked ? 'Throws away the changes made here and brings back the built-in version.' : blocker ? `Cannot be deleted yet. ${blocker}` : 'Removes this modality permanently. This cannot be undone.'}</p>
          {seedBacked || !blocker ? (
            <>
              <label className="check"><input type="checkbox" name="confirm" required /><span>Yes, {seedBacked ? 'reset it' : 'delete it'}.</span></label>
              <button type="submit" className="btn btn--soft btn--sm" style={{ borderColor: '#9B3B22', color: '#9B3B22', justifySelf: 'start' }}>{seedBacked ? 'Reset' : 'Delete'}</button>
            </>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
