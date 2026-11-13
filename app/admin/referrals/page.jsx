import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { AGREEMENT_LABEL } from '@/lib/referrals.mjs';
import { effectiveStatus, economics, getCreditValue, COOLING_DAYS, MONTHLY_CAP, MAX_CREDIT_VALUE } from '@/lib/credits.mjs';
import { getRate } from '@/lib/enquiries.mjs';
import { SPEND_LABEL } from '@/lib/credit-spend.mjs';
import { endAgreementTeamAction, voidCreditAction, setCreditValueAction, voidSpendAction } from '../actions';

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
  const entries = store ? (await store.list('credit_entries')).sort((a, b) => b.created_at.localeCompare(a.created_at)) : [];
  const spends = store ? (await store.list('credit_spends')).sort((a, b) => b.created_at.localeCompare(a.created_at)) : [];
  const rate = store ? await getRate(store) : 0;
  const creditValue = store ? await getCreditValue(store) : 0;
  const eco = economics(enquiries, entries, { rate, creditValue });
  const money = (n) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <h1 style={{ fontSize: '2.2rem' }}>Referral circles</h1>
      <p className="lede">Alchemists agree discounts for each other&rsquo;s clients. Each gives the discount themselves, and Empatherapy never handles the money. You can end any agreement.</p>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}
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

      {store ? (
        <section className="admin-card stack" aria-labelledby="credits-h">
          <h2 id="credits-h" style={{ fontSize: '1.4rem' }}>Referral credits</h2>
          <p style={{ color: 'var(--muted)' }}>A referrer earns 1 credit when a client who used their code books a first session, as the partner reports it. One per client per referrer, up to {MONTHLY_CAP} a month, pending for {COOLING_DAYS} days before it counts. Referrers can spend confirmed credits with Alchemists who take them (credits expire after a year). Void any earned credit that looks wrong.</p>
          {entries.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th scope="col">Earned</th><th scope="col">By</th><th scope="col">From a booking with</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {entries.map((c) => (
                    <tr key={c.id}>
                      <td>{new Date(c.created_at).toLocaleDateString('en-AU')}</td><th scope="row">{name(c.profile_id)}</th><td>{c.partner_name}</td>
                      <td>{{ confirmed: 'Confirmed', pending: 'Pending', voided: `Voided (${c.void_reason ?? 'team'})` }[effectiveStatus(c)]}</td>
                      <td>{c.status !== 'voided' ? <form action={voidCreditAction}><input type="hidden" name="id" value={c.id} /><button type="submit" className="btn btn--soft btn--sm">Void</button></form> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ color: 'var(--muted)' }}>No credits earned yet.</p>}
        </section>
      ) : null}

      {spends.length ? (
        <section className="admin-card stack" aria-labelledby="spend-h">
          <h2 id="spend-h" style={{ fontSize: '1.4rem' }}>Credits spent</h2>
          <p style={{ color: 'var(--muted)' }}>The accepting Alchemist gives each discount themselves. Voiding a spend puts the credits back with the referrer.</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">Asked</th><th scope="col">Referrer</th><th scope="col">With</th><th scope="col">Credits</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {spends.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.created_at).toLocaleDateString('en-AU')}</td><th scope="row">{s.profile_name}</th><td>{s.partner_name}</td><td>{s.credits} (${s.discount})</td><td>{SPEND_LABEL[s.status]}</td>
                    <td>{['requested', 'used'].includes(s.status) ? <form action={voidSpendAction}><input type="hidden" name="id" value={s.id} /><button type="submit" className="btn btn--soft btn--sm">Void</button></form> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {store ? (
        <section className="admin-card stack" aria-labelledby="eco-h">
          <h2 id="eco-h" style={{ fontSize: '1.4rem' }}>What it could mean for Empatherapy (illustration)</h2>
          <p style={{ color: 'var(--muted)' }}>From referred first sessions that have been noted, an introduction fee at the illustration rate, less the value of the credits earned. Nothing here charges anyone, and credits cannot be spent yet. Set the rate on the Enquiries page and the value of a credit below.</p>
          <form action={setCreditValueAction} className="row">
            <label htmlFor="value">A credit would be worth (AUD)</label>
            <input id="value" name="value" type="number" min="0" max={MAX_CREDIT_VALUE} step="0.5" defaultValue={creditValue} style={{ maxWidth: '8rem' }} />
            <button type="submit" className="btn btn--soft btn--sm">Save</button>
          </form>
          {rate && creditValue ? (
            <dl className="admin-dl">
              <div><dt>Referred first sessions noted</dt><dd>{eco.referredBookings} totalling {money(eco.sessions)}</dd></div>
              <div><dt>Introduction fee at {Math.round(rate * 1000) / 10}%</dt><dd>{money(eco.fee)}</dd></div>
              <div><dt>Credits earned, at {money(creditValue)} each</dt><dd>{eco.credits} credits, {money(eco.creditCost)}</dd></div>
              <div><dt>Left for Empatherapy</dt><dd><strong>{money(eco.net)}</strong></dd></div>
            </dl>
          ) : <p>Set both an illustration rate (Enquiries page) and a credit value to see the picture.</p>}
          <p style={{ color: 'var(--muted)' }}>For scale: a 12% fee on a $100 first session is $12. A $5 credit to the referrer would leave $7.</p>
        </section>
      ) : null}
    </div>
  );
}
