import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { listAudit, ACTION_LABEL } from '@/lib/audit.mjs';
import { ROLE_LABEL } from '@/lib/accounts.mjs';

export const metadata = { title: 'Activity' };

const LIMIT = 200;

export default async function ActivityPage() {
  await requireAdmin('activity');
  const store = getStore();
  const entries = store ? await listAudit(store, LIMIT) : [];

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>Activity</h1>
        <p className="lede">Who changed what, and when. It lists staff actions only, never applicants&rsquo; details or passwords, and entries are removed after 12 months.</p>
      </div>
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so nothing is being recorded.</p> : null}

      {store && !entries.length ? <p style={{ color: 'var(--muted)' }}>Nothing recorded yet.</p> : null}
      {entries.length ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">What</th><th scope="col">Details</th></tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}><time dateTime={e.at}>{new Date(e.at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</time></td>
                    <td>{e.actor_name}<br /><span style={{ color: 'var(--muted)' }}>{ROLE_LABEL[e.actor_role] ?? e.actor_role}</span></td>
                    <td>{ACTION_LABEL[e.action] ?? e.action}</td>
                    <td>{e.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length >= LIMIT ? <p style={{ color: 'var(--muted)' }}>Showing the latest {LIMIT}.</p> : null}
        </>
      ) : null}
    </div>
  );
}
