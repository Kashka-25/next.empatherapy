import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortal } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { ENQUIRY_STATUSES, ENQUIRY_LABEL } from '@/lib/enquiries.mjs';
import { SUPPORT_MESSAGE } from '@/lib/matching/vocabulary.mjs';
import { portalUpdateEnquiryAction } from '../../../actions';

export const metadata = { title: 'Enquiry' };

export default async function PortalEnquiry({ params, searchParams }) {
  const me = await requirePortal();
  const store = getStore();
  if (!store) notFound();
  const e = await store.get('enquiries', params.id);
  if (!e || e.alchemist_id !== me.profile_id) notFound(); // never anyone else's

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/portal/enquiries" className="link-arrow" style={{ justifySelf: 'start' }}>All enquiries</Link>
      <h1 style={{ fontSize: '2.2rem' }}>{e.name}</h1>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}
      {e.referral ? <p className="demo-note" role="status"><strong>Came with {e.referral.referrer_name}&rsquo;s referral code.</strong> As you agreed, please take {e.referral.percent}% off their first session.</p> : null}
      {e.support_flag ? <p className="demo-note" role="status"><strong>Their message may come from someone having a hard time.</strong> Please be gentle. {SUPPORT_MESSAGE}</p> : null}

      <div className="admin-two">
        <section className="admin-card stack" aria-label="Enquiry">
          <dl className="admin-dl">
            <div><dt>Message</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{e.message}</dd></div>
            <div><dt>Their email</dt><dd><a href={`mailto:${e.email}`} className="link-arrow">{e.email}</a></dd></div>
            <div><dt>Received</dt><dd>{new Date(e.created_at).toLocaleString('en-AU')}</dd></div>
          </dl>
          <p style={{ color: 'var(--muted)' }}>They agreed to share this with you and with the Empatherapy team, who see it only to keep things safe. Please reply in your own words and in your own time.</p>
          <a href={`mailto:${e.email}?subject=${encodeURIComponent('Your message on Empatherapy')}`} className="btn btn--honey" style={{ justifySelf: 'start' }}>Reply by email</a>
        </section>

        <aside className="stack" style={{ gap: '1.2rem', alignContent: 'start' }}>
          <form action={portalUpdateEnquiryAction} className="admin-card stack">
            <input type="hidden" name="id" value={e.id} />
            <h2 style={{ fontSize: '1.15rem' }}>How did it go?</h2>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={e.status}>{ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{ENQUIRY_LABEL[s]}</option>)}</select>
            </div>
            <div className="field">
              <label htmlFor="fee">First session amount (AUD, optional)</label>
              <span className="hint">Only if they booked. This helps Empatherapy understand what introductions lead to.</span>
              <input id="fee" name="fee" type="number" min="0" max="5000" step="0.01" defaultValue={e.first_session_fee ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="alchemist_note">Your private note</label>
              <textarea id="alchemist_note" name="alchemist_note" defaultValue={e.alchemist_note ?? ''} maxLength={1000} />
            </div>
            <button type="submit" className="btn btn--soft btn--sm">Save</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
