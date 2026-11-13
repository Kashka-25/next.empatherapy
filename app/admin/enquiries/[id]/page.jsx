import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { ENQUIRY_STATUSES, ENQUIRY_LABEL } from '@/lib/enquiries.mjs';
import { SUPPORT_MESSAGE } from '@/lib/matching/vocabulary.mjs';
import { updateEnquiryAction, deleteEnquiryAction } from '../../actions';

export const metadata = { title: 'Enquiry' };

export default async function EnquiryPage({ params, searchParams }) {
  await requireAdmin('enquiries');
  const store = getStore();
  if (!store) notFound();
  const e = await store.get('enquiries', params.id);
  if (!e) notFound();
  const sent = [e.notified?.alchemist && 'the Alchemist', e.notified?.founder && 'you', e.notified?.seeker && 'the Seeker'].filter(Boolean);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/enquiries" className="link-arrow" style={{ justifySelf: 'start' }}>All enquiries</Link>
      <div className="row" style={{ gap: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>For {e.alchemist_name}</h1>
        <span className={`status status--${e.status === 'new' ? 'new' : e.status === 'booked' ? 'approved' : 'in_review'}`}>{ENQUIRY_LABEL[e.status]}</span>
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}
      {e.support_flag ? <p className="demo-note" role="status"><strong>This message may come from someone having a hard time.</strong> {SUPPORT_MESSAGE}</p> : null}

      <div className="admin-two">
        <section className="admin-card stack" aria-label="Enquiry">
          <dl className="admin-dl">
            <div><dt>From</dt><dd>{e.name}, {e.email}</dd></div>
            <div><dt>Message</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{e.message}</dd></div>
            <div><dt>Received</dt><dd>{new Date(e.created_at).toLocaleString('en-AU')}</dd></div>
            <div><dt>Consent given</dt><dd>{new Date(e.consent_at).toLocaleString('en-AU')}</dd></div>
            <div><dt>Emails sent to</dt><dd>{sent.length ? sent.join(', ') : 'nobody (mail is off, or it did not go through)'}</dd></div>
            {typeof e.first_session_fee === 'number' ? <div><dt>First session noted</dt><dd>${e.first_session_fee}</dd></div> : null}
          </dl>
        </section>

        <aside className="stack" style={{ gap: '1.2rem', alignContent: 'start' }}>
          <form action={updateEnquiryAction} className="admin-card stack">
            <input type="hidden" name="id" value={e.id} />
            <h2 style={{ fontSize: '1.15rem' }}>What happened</h2>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={e.status}>{ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{ENQUIRY_LABEL[s]}</option>)}</select>
            </div>
            <div className="field">
              <label htmlFor="fee">First session amount (AUD, optional)</label>
              <span className="hint">Only when booked. As reported by the Alchemist.</span>
              <input id="fee" name="fee" type="number" min="0" max="5000" step="0.01" defaultValue={e.first_session_fee ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="note">Private note</label>
              <textarea id="note" name="note" defaultValue={e.note} maxLength={1000} />
            </div>
            <button type="submit" className="btn btn--soft btn--sm">Save</button>
          </form>

          <form action={deleteEnquiryAction} className="admin-card stack">
            <input type="hidden" name="id" value={e.id} />
            <h2 style={{ fontSize: '1.15rem' }}>Delete permanently</h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>For deletion requests. Old enquiries are also removed by the clean-up. This cannot be undone.</p>
            <label className="check"><input type="checkbox" name="confirm" required /><span>Yes, delete this enquiry.</span></label>
            <button type="submit" className="btn btn--soft btn--sm" style={{ borderColor: '#9B3B22', color: '#9B3B22' }}>Delete</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
