import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { findExpired, RETENTION_DAYS } from '@/lib/retention.mjs';
import { STATUS_LABEL } from '@/lib/applications.mjs';
import { purgeExpiredAction } from '../actions';

export const metadata = { title: 'Clean-up' };

export default async function RetentionPage({ searchParams }) {
  await requireAdmin('retention');
  const store = getStore();
  const found = store ? await findExpired(store) : { applications: [], counters: [], audit: [], enquiries: [] };

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>Clean-up</h1>
        <p className="lede">Applications are not kept forever. Nothing is deleted automatically: you see what is due, then choose.</p>
      </div>
      {searchParams?.done !== undefined ? <p className="admin-flash" role="status">Done. {searchParams.done} {Number(searchParams.done) === 1 ? 'application was' : 'applications were'} permanently deleted.</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so there is nothing to clean up.</p> : null}

      <section className="admin-card stack">
        <h2 style={{ fontSize: '1.4rem' }}>The rule</h2>
        <ul className="tick-list">
          <li>Declined applications are deleted {RETENTION_DAYS.declined} days after they were declined.</li>
          <li>Every other application is deleted 12 months after it was last touched.</li>
          <li>Spam-protection counters (hashed, with no names or addresses) are deleted after {RETENTION_DAYS.ratelimits} days.</li>
          <li>Enquiries from Seekers are deleted {RETENTION_DAYS.enquiries / 30} months after they were last touched.</li>
          <li>Activity log entries (staff actions only) are deleted after 12 months.</li>
        </ul>
        <p style={{ color: 'var(--muted)' }}>The same rule is written on the public <a href="/privacy">privacy notice</a>. Change them together.</p>
      </section>

      {store ? (
        <section className="admin-card stack">
          <h2 style={{ fontSize: '1.4rem' }}>Due now</h2>
          {found.applications.length ? (
            <ul className="tick-list">
              {found.applications.map((a) => <li key={a.id}>{STATUS_LABEL[a.status] ?? a.status}, last touched {new Date(a.updated_at ?? a.created_at).toLocaleDateString('en-AU')}</li>)}
            </ul>
          ) : <p>No applications are due for deletion.</p>}
          <p style={{ color: 'var(--muted)' }}>{found.enquiries.length} old {found.enquiries.length === 1 ? 'enquiry' : 'enquiries'}, {found.counters.length} old spam-protection {found.counters.length === 1 ? 'counter' : 'counters'} and {found.audit.length} old activity {found.audit.length === 1 ? 'entry' : 'entries'} also due.</p>
          {found.applications.length || found.counters.length || found.audit.length || found.enquiries.length ? (
            <form action={purgeExpiredAction}>
              <button type="submit" className="btn btn--honey">Permanently delete these</button>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
