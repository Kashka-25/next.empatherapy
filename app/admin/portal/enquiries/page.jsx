import Link from 'next/link';
import { requirePortal } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { listEnquiries, ENQUIRY_LABEL } from '@/lib/enquiries.mjs';

export const metadata = { title: 'Your enquiries' };

export default async function PortalEnquiries() {
  const me = await requirePortal();
  const store = getStore();
  const enquiries = store ? await listEnquiries(store, { alchemistId: me.profile_id }) : [];

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/portal" className="link-arrow" style={{ justifySelf: 'start' }}>Your space</Link>
      <h1 style={{ fontSize: '2.2rem' }}>Your enquiries</h1>
      <p className="lede">People who reached out to you through Empatherapy. Reply to them directly by email, then let us know how it went, so we can see what is working.</p>
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so there is nothing to show yet.</p> : null}
      {enquiries.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">Received</th><th scope="col">From</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {enquiries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><time dateTime={e.created_at}>{new Date(e.created_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</time></td>
                  <th scope="row"><Link href={`/admin/portal/enquiries/${e.id}`} className="link-arrow">{e.name}</Link></th>
                  <td>{ENQUIRY_LABEL[e.status] ?? e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : store ? <p style={{ color: 'var(--muted)' }}>No enquiries yet. When someone reaches out, you will get an email and it will appear here.</p> : null}
    </div>
  );
}
