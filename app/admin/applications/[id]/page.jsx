import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { STATUS_LABEL } from '@/lib/applications.mjs';
import { can } from '@/lib/accounts.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { reviewApplicationAction, deleteApplicationAction, createDraftProfileAction } from '../../actions';

export const metadata = { title: 'Application' };

const FIELDS = [
  ['introduction', 'Introduction'], ['personal_story', 'Story'], ['modalities', 'Practices'], ['qualifications', 'Qualifications and training'],
  ['experience', 'Experience'], ['location', 'Location'], ['delivery_format', 'How they work'], ['pricing', 'Pricing'], ['links', 'Links'],
];

export default async function ApplicationPage({ params, searchParams }) {
  const me = await requireAdmin('applications');
  const store = getStore();
  if (!store) notFound();
  const app = await store.get('applications', params.id);
  if (!app) notFound();
  const d = app.data;
  const canCreate = can(me.role, 'content');
  const existingProfile = app.profile_id ? (await loadContent(store)).alchemists.find((a) => a.id === app.profile_id) : null;

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/applications" className="link-arrow" style={{ justifySelf: 'start' }}>All applications</Link>
      <div className="row" style={{ gap: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>{d.name}</h1>
        <span className={`status status--${app.status}`}>{STATUS_LABEL[app.status]}</span>
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {searchParams?.draft_error ? <p className="error" role="alert">{searchParams.draft_error}</p> : null}

      <div className="admin-two">
        <section className="admin-card stack" aria-label="Application">
          <dl className="admin-dl">
            <div><dt>Email</dt><dd>{d.email}</dd></div>
            {FIELDS.map(([k, label]) => d[k] ? <div key={k}><dt>{label}</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{d[k]}</dd></div> : null)}
            <div><dt>Consent given</dt><dd>{new Date(app.consent_at).toLocaleString('en-AU')}</dd></div>
          </dl>
        </section>

        <aside className="stack" style={{ gap: '1.2rem', alignContent: 'start' }}>
          <form action={reviewApplicationAction} className="admin-card stack">
            <input type="hidden" name="id" value={app.id} />
            <div className="field">
              <label htmlFor="notes">Review notes (private)</label>
              <textarea id="notes" name="notes" defaultValue={app.review_notes} maxLength={2000} />
            </div>
            <button type="submit" className="btn btn--soft btn--sm">Save notes</button>
          </form>

          <div className="admin-card stack">
            <h2 style={{ fontSize: '1.15rem' }}>Move along</h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>Approving does not publish anything. It marks the application ready for a person to create the profile after checking training and registration.</p>
            <div className="row">
              {['in_review', 'approved', 'declined'].filter((s) => s !== app.status).map((s) => (
                <form key={s} action={reviewApplicationAction}>
                  <input type="hidden" name="id" value={app.id} />
                  <input type="hidden" name="status" value={s} />
                  <button type="submit" className={`btn btn--sm ${s === 'approved' ? 'btn--honey' : 'btn--soft'}`}>{s === 'in_review' ? 'Start review' : s === 'approved' ? 'Approve' : 'Decline'}</button>
                </form>
              ))}
            </div>
          </div>

          {app.status === 'approved' && canCreate ? (
            <div className="admin-card stack">
              <h2 style={{ fontSize: '1.15rem' }}>Create the profile</h2>
              {existingProfile ? (
                <>
                  <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>A draft profile was already made from this application.</p>
                  <Link href={`/admin/alchemists/${existingProfile.id}`} className="btn btn--honey btn--sm" style={{ justifySelf: 'start' }}>Open {existingProfile.name}</Link>
                </>
              ) : (
                <form action={createDraftProfileAction} className="stack">
                  <input type="hidden" name="id" value={app.id} />
                  <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>Starts a hidden draft from their answers. Everything they claimed is marked to confirm, their email is not copied, and nothing is published until you finish and verify it.</p>
                  <button type="submit" className="btn btn--honey btn--sm" style={{ justifySelf: 'start' }}>Create draft profile</button>
                </form>
              )}
            </div>
          ) : null}

          <form action={deleteApplicationAction} className="admin-card stack">
            <input type="hidden" name="id" value={app.id} />
            <h2 style={{ fontSize: '1.15rem' }}>Delete permanently</h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>For data-deletion requests. This cannot be undone. A draft profile made from this application is deleted too. A published profile is kept, so remove it separately if asked.</p>
            <label className="check"><input type="checkbox" name="confirm" required /><span>Yes, delete this application and all its details.</span></label>
            <button type="submit" className="btn btn--soft btn--sm" style={{ borderColor: '#9B3B22', color: '#9B3B22' }}>Delete</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
