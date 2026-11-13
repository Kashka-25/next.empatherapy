import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { AGREEMENT_LABEL } from '@/lib/referrals.mjs';
import { endAgreementTeamAction } from '../actions';

export const metadata = { title: 'Referral circles' };

export default async function ReferralsAdmin({ searchParams }) {
  await requireAdmin('enquiries');
  const store = getStore();
  const { alchemists } = await loadContent(store);
  const name = (id) => alchemists.find((a) => a.id === id)?.name ?? id;
  const agreements = store ? (await store.list('referral_agreements')).sort((a, b) => b.created_at.localeCompare(a.created_at)) : [];
  const codes = store ? await store.list('referral_codes') : [];
  const enquiries = store ? await store.list('enquiries') : [];
  const viaCode = enquiries.filter((e) => e.referral);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <h1 style={{ fontSize: '2.2rem' }}>Referral circles</h1>
      <p className="lede">Alchemists agree discounts for each other&rsquo;s clients. Each gives the discount themselves, and Empatherapy never handles the money. You can end any agreement.</p>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off.</strong></p> : null}
      {store ? (
        <section className="admin-grid" aria-label="Totals">
          <div className="admin-card"><span className="eyebrow">Codes</span><strong className="admin-stat">{codes.length}</strong><span>Alchemists with a referral code</span></div>
          <div className="admin-card"><span className="eyebrow">Active agreements</span><strong className="admin-stat">{agreements.filter((a) => a.status === 'active').length}</strong><span>{agreements.filter((a) => a.status === 'offered').length} offers waiting</span></div>
          <div className="admin-card"><span className="eyebrow">Enquiries with a code</span><strong className="admin-stat">{viaCode.length}</strong><span>{viaCode.filter((e) => e.status === 'booked').length} booked</span></div>
        </section>
      ) : null}
      {agreements.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">Clients of</th><th scope="col">Discounted by</th><th scope="col">Discount</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {agreements.map((a) => (
                <tr key={a.id}>
                  <th scope="row">{name(a.referrer_id)}</th><td>{name(a.partner_id)}</td><td>{a.percent}% off a first session</td><td>{AGREEMENT_LABEL[a.status]}</td>
                  <td>{['offered', 'active'].includes(a.status) ? <form action={endAgreementTeamAction}><input type="hidden" name="id" value={a.id} /><button type="submit" className="btn btn--soft btn--sm">End</button></form> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : store ? <p style={{ color: 'var(--muted)' }}>No agreements yet.</p> : null}
    </div>
  );
}
