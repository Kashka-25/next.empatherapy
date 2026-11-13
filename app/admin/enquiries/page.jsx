import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { listEnquiries, introductionStats, getRate, ENQUIRY_LABEL, MAX_RATE_PERCENT } from '@/lib/enquiries.mjs';
import { setRateAction } from '../actions';

export const metadata = { title: 'Enquiries' };

const money = (n) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default async function EnquiriesPage({ searchParams }) {
  await requireAdmin('enquiries');
  const store = getStore();
  const enquiries = store ? await listEnquiries(store) : [];
  const rate = store ? await getRate(store) : 0;
  const stats = introductionStats(enquiries, rate);
  const waiting = enquiries.filter((e) => e.status === 'new').length;

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>Enquiries</h1>
        <p className="lede">Every time a Seeker reaches out to an Alchemist through the site, it lands here, and you get an email if mail is set up. The Alchemist replies to the Seeker directly.</p>
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so enquiries cannot be received yet.</p> : null}

      {store ? (
        <section className="admin-grid" aria-label="Introductions so far">
          <div className="admin-card"><span className="eyebrow">Enquiries</span><strong className="admin-stat">{stats.total}</strong><span>{waiting} waiting for a first reply</span></div>
          <div className="admin-card"><span className="eyebrow">Replied</span><strong className="admin-stat">{stats.replied}</strong><span>by the Alchemist, as reported</span></div>
          <div className="admin-card"><span className="eyebrow">Booked a session</span><strong className="admin-stat">{stats.booked}</strong><span>{stats.fees ? `${money(stats.fees)} in first sessions noted` : 'no amounts noted yet'}</span></div>
        </section>
      ) : null}

      {store && enquiries.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">Received</th><th scope="col">For</th><th scope="col">From</th><th scope="col">Status</th><th scope="col">Emailed</th></tr></thead>
            <tbody>
              {enquiries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><time dateTime={e.created_at}>{new Date(e.created_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</time></td>
                  <th scope="row"><Link href={`/admin/enquiries/${e.id}`} className="link-arrow">{e.alchemist_name}</Link>{e.support_flag ? <><br /><span className="tag tag--honey">May be struggling</span></> : null}{e.referral ? <><br /><span className="tag tag--sage">Referral: {e.referral.referrer_name}</span></> : null}</th>
                  <td>{e.name}</td>
                  <td>{ENQUIRY_LABEL[e.status] ?? e.status}</td>
                  <td style={{ color: 'var(--muted)' }}>{[e.notified?.alchemist && 'Alchemist', e.notified?.founder && 'You', e.notified?.seeker && 'Seeker'].filter(Boolean).join(', ') || 'No email sent'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : store ? <p style={{ color: 'var(--muted)' }}>No enquiries yet.</p> : null}

      {store && stats.rows.length ? (
        <section className="admin-card stack" aria-labelledby="intro-h">
          <h2 id="intro-h" style={{ fontSize: '1.4rem' }}>Introductions by Alchemist</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">Alchemist</th><th scope="col">Enquiries</th><th scope="col">Replied</th><th scope="col">Booked</th><th scope="col">First sessions noted</th>{rate ? <th scope="col">At {Math.round(rate * 1000) / 10}% (illustration)</th> : null}</tr></thead>
              <tbody>
                {stats.rows.map((r) => (
                  <tr key={r.alchemist_id}><th scope="row">{r.name}</th><td>{r.total}</td><td>{r.replied}</td><td>{r.booked}</td><td>{r.feesKnown ? money(r.fees) : '–'}</td>{rate ? <td>{money(r.illustrative)}</td> : null}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: 'var(--muted)' }}>Outcomes are reported by Alchemists and by you, so treat them as a guide. Nothing here charges anyone.</p>
        </section>
      ) : null}

      {store ? (
        <section className="admin-card stack" aria-labelledby="rate-h">
          <h2 id="rate-h" style={{ fontSize: '1.4rem' }}>Illustration only</h2>
          <p style={{ color: 'var(--muted)' }}>The business model is still being decided. If you would like to see what an introduction fee <em>would</em> come to, enter a percentage. Leave it at 0 to hide the figures. This never charges or invoices anyone.</p>
          <form action={setRateAction} className="row">
            <label className="sr-only" htmlFor="rate">Percentage of first sessions, 0 to {MAX_RATE_PERCENT}</label>
            <input id="rate" name="rate" type="number" min="0" max={MAX_RATE_PERCENT} step="0.5" defaultValue={Math.round(rate * 1000) / 10} style={{ maxWidth: '8rem' }} />
            <span>% of first sessions</span>
            <button type="submit" className="btn btn--soft btn--sm">Save</button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
