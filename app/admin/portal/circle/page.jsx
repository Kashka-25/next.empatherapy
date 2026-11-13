import Link from 'next/link';
import { requirePortal } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { canReceiveEnquiries } from '@/lib/enquiries.mjs';
import { agreementsFor, AGREEMENT_LABEL, MIN_DISCOUNT, MAX_DISCOUNT } from '@/lib/referrals.mjs';
import { summarise } from '@/lib/summary.mjs';
import { ledgerFor, balanceOf, effectiveStatus, getCreditValue, COOLING_DAYS, MONTHLY_CAP } from '@/lib/credits.mjs';
import { getOffer, acceptingAlchemists, availableCredits, spendsFor, SPEND_LABEL, EXPIRY_DAYS, MAX_CREDITS_PER_SESSION } from '@/lib/credit-spend.mjs';
import { createReferralCodeAction, offerDiscountAction, respondToOfferAction, endAgreementPortalAction, saveCreditOfferAction, requestSpendAction, respondToSpendAction } from '../../actions';

export const metadata = { title: 'Referral circle' };

const PERCENTS = Array.from({ length: (MAX_DISCOUNT - MIN_DISCOUNT) / 5 + 1 }, (_, i) => MIN_DISCOUNT + i * 5);

export default async function CirclePage({ searchParams }) {
  const me = await requirePortal();
  const store = getStore();
  const { alchemists } = await loadContent(store);
  const profile = alchemists.find((a) => a.id === me.profile_id);
  const live = canReceiveEnquiries(profile);
  const name = (id) => alchemists.find((a) => a.id === id)?.name ?? 'an Alchemist';
  const code = store ? await store.get('referral_codes', me.profile_id) : null;
  const { asReferrer, asPartner } = store ? await agreementsFor(store, me.profile_id) : { asReferrer: [], asPartner: [] };
  const used = store ? summarise(await store.list('enquiries'), me.profile_id, { period: 'all' }).myCodeUsed : { enquiries: 0, booked: 0 };
  const ledger = store ? await ledgerFor(store, me.profile_id) : [];
  const balance = balanceOf(ledger, me.profile_id);
  const creditValue = await getCreditValue(store);
  const avail = store ? await availableCredits(store, me.profile_id) : { available: 0, held: 0, used: 0, expired: 0 };
  const myOffer = await getOffer(store, me.profile_id);
  const takers = store ? (await acceptingAlchemists(store, alchemists)).filter((x) => x.alchemist.id !== me.profile_id) : [];
  const { made, received } = store ? await spendsFor(store, me.profile_id) : { made: [], received: [] };
  const waiting = asReferrer.filter((a) => a.status === 'offered');
  const partners = asReferrer.filter((a) => a.status === 'active');
  const candidates = alchemists.filter((a) => a.id !== me.profile_id && canReceiveEnquiries(a) && !asPartner.some((x) => x.referrer_id === a.id && ['offered', 'active'].includes(x.status)));

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <Link href="/admin/portal" className="link-arrow" style={{ justifySelf: 'start' }}>Your space</Link>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>Your referral circle</h1>
        <p className="lede">Alchemists who look after each other&rsquo;s clients. You have a code you can share with the people you bring to Empatherapy, and Alchemists who like the idea can agree to give your clients a discount on their first session. It is a thank-you that costs you nothing, and it rewards the people you send.</p>
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so referral circles are not available yet.</p> : null}
      {store && !live ? <p className="demo-note">Referral circles open once your profile is live and approved.</p> : null}

      {store && live ? (
        <>
          <section className="admin-card stack" aria-labelledby="code-h">
            <h2 id="code-h" style={{ fontSize: '1.3rem' }}>Your code</h2>
            {code ? (
              <>
                <p className="secret-key"><code aria-label="Your referral code">{code.code}</code></p>
                <p>Your code has been used {used.enquiries} {used.enquiries === 1 ? 'time' : 'times'} by clients reaching out to Alchemists in your circle{used.enquiries ? `, and ${used.booked} of those booked a session` : ''}. We only count: we never tell you who they are.</p>
              </>
            ) : (
              <form action={createReferralCodeAction} className="stack"><p>Make a code you can share with clients you bring to Empatherapy.</p><div><button type="submit" className="btn btn--honey">Get my code</button></div></form>
            )}
          </section>

          <section className="admin-card stack" aria-labelledby="credits-h">
            <h2 id="credits-h" style={{ fontSize: '1.3rem' }}>Your credits</h2>
            <p>You earn <strong>1 credit</strong> when someone who used your code books their <strong>first session</strong> with an Alchemist in your circle, as that Alchemist reports it. Credits are for thanking you for bringing people to Empatherapy.</p>
            <div className="admin-grid">
              <div className="admin-card"><span className="eyebrow">Confirmed</span><strong className="admin-stat">{balance.confirmed}</strong><span>{creditValue ? `about $${(balance.confirmed * creditValue).toLocaleString('en-AU')} when spending opens` : 'credits earned'}</span></div>
              <div className="admin-card"><span className="eyebrow">Pending</span><strong className="admin-stat">{balance.pending}</strong><span>confirmed after {COOLING_DAYS} days</span></div>
            </div>
            <p className="demo-note" role="note"><strong>You can spend credits on cheaper sessions with Alchemists who take them</strong> (see below). The Alchemist gives the discount themselves. Credits expire {EXPIRY_DAYS} days after you earn them, and are confirmed after a {COOLING_DAYS}-day cooling-off period, you can earn up to {MONTHLY_CAP} a month, only a client&rsquo;s first booked session counts, and the team may void a credit that does not look right.</p>
            {ledger.length ? (
              <ul className="stack" style={{ listStyle: 'none', padding: 0, gap: '0.5rem' }}>
                {ledger.map((c) => (
                  <li key={c.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>{new Date(c.created_at).toLocaleDateString('en-AU')}: a client booked a first session with {c.partner_name}</span>
                    <span className="tag">{{ confirmed: 'Confirmed', pending: 'Pending', voided: 'Not counted' }[effectiveStatus(c)]}</span>
                  </li>
                ))}
              </ul>
            ) : <p style={{ color: 'var(--muted)' }}>No credits yet. They appear when someone who used your code books a first session.</p>}
          </section>

          <section className="admin-card stack" aria-labelledby="spend-h">
            <h2 id="spend-h" style={{ fontSize: '1.3rem' }}>Spend your credits</h2>
            <p>You have <strong>{avail.available}</strong> {avail.available === 1 ? 'credit' : 'credits'} to spend{avail.held ? `, with ${avail.held} held for open requests` : ''}{avail.expired ? ` (${avail.expired} expired)` : ''}. Pick an Alchemist who takes credits and ask. They give the discount themselves when you see them, then mark it used. Empatherapy never handles the money.</p>
            {takers.length ? (
              <form action={requestSpendAction} className="stack" style={{ gap: '1rem' }}>
                <div className="filters__row">
                  <div className="field"><label htmlFor="partner_id">With</label><select id="partner_id" name="partner_id" required defaultValue=""><option value="" disabled>Choose an Alchemist</option>{takers.map((x) => <option key={x.alchemist.id} value={x.alchemist.id}>{x.alchemist.name}: ${x.offer.value} a credit, up to {x.offer.max_credits}</option>)}</select></div>
                  <div className="field"><label htmlFor="credits">Credits to spend</label><input id="credits" name="credits" type="number" min="1" max={MAX_CREDITS_PER_SESSION} defaultValue="1" /></div>
                </div>
                <div><button type="submit" className="btn btn--honey" disabled={!avail.available}>Ask to spend</button></div>
              </form>
            ) : <p style={{ color: 'var(--muted)' }}>No one is taking credits yet. As more Alchemists switch it on, they will appear here.</p>}
            {made.length ? (
              <ul className="stack" style={{ listStyle: 'none', padding: 0, gap: '0.6rem' }}>
                {made.map((s) => (
                  <li key={s.id}>
                    <form action={respondToSpendAction} className="row" style={{ justifyContent: 'space-between' }}>
                      <input type="hidden" name="id" value={s.id} />
                      <span>{new Date(s.created_at).toLocaleDateString('en-AU')}: {s.credits} {s.credits === 1 ? 'credit' : 'credits'} (${s.discount} off) with <strong>{s.partner_name}</strong></span>
                      <span className="row"><span className="tag">{SPEND_LABEL[s.status]}</span>{s.status === 'requested' ? <button type="submit" name="intent" value="withdraw" className="btn btn--soft btn--sm">Withdraw</button> : null}</span>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="admin-card stack" aria-labelledby="take-h">
            <h2 id="take-h" style={{ fontSize: '1.3rem' }}>Take credits from other Alchemists</h2>
            <p style={{ color: 'var(--muted)' }}>If you switch this on, Alchemists who have earned credits can ask to spend them on a session with you. You choose what one credit takes off and the most you will take for a single session. You give the discount yourself and mark it used afterwards. You can pause this any time. It brings you people who found you through the network.</p>
            <form action={saveCreditOfferAction} className="stack" style={{ gap: '1rem' }}>
              <div className="filters__row">
                <div className="field"><label htmlFor="accepts">Take credits</label><select id="accepts" name="accepts" defaultValue={myOffer.accepts ? 'yes' : 'no'}><option value="no">Not at the moment</option><option value="yes">Yes, I take credits</option></select></div>
                <div className="field"><label htmlFor="value">One credit takes off (AUD)</label><input id="value" name="value" type="number" min="1" max="100" step="0.5" defaultValue={myOffer.value} /></div>
                <div className="field"><label htmlFor="max_credits">Most credits for one session</label><input id="max_credits" name="max_credits" type="number" min="1" max={MAX_CREDITS_PER_SESSION} defaultValue={myOffer.max_credits} /></div>
              </div>
              <div><button type="submit" className="btn btn--honey">Save</button></div>
            </form>
            {received.length ? (
              <>
                <h3 style={{ fontSize: '1.1rem' }}>Requests to spend credits with you</h3>
                <ul className="stack" style={{ listStyle: 'none', padding: 0, gap: '0.6rem' }}>
                  {received.map((s) => (
                    <li key={s.id}>
                      <form action={respondToSpendAction} className="row" style={{ justifyContent: 'space-between' }}>
                        <input type="hidden" name="id" value={s.id} />
                        <span>{new Date(s.created_at).toLocaleDateString('en-AU')}: <strong>{s.profile_name}</strong> would like ${s.discount} off ({s.credits} {s.credits === 1 ? 'credit' : 'credits'})</span>
                        {s.status === 'requested'
                          ? <span className="row"><button type="submit" name="intent" value="used" className="btn btn--honey btn--sm">I gave the discount</button><button type="submit" name="intent" value="decline" className="btn btn--soft btn--sm">Decline</button></span>
                          : <span className="tag">{SPEND_LABEL[s.status]}</span>}
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          {waiting.length ? (
            <section className="admin-card stack" aria-labelledby="offers-h">
              <h2 id="offers-h" style={{ fontSize: '1.3rem' }}>Offers waiting for you</h2>
              {waiting.map((a) => (
                <form key={a.id} action={respondToOfferAction} className="row" style={{ justifyContent: 'space-between', gap: '1rem' }}>
                  <input type="hidden" name="id" value={a.id} />
                  <span><strong>{name(a.partner_id)}</strong> would give your clients <strong>{a.percent}% off</strong> their first session.</span>
                  <span className="row"><button type="submit" name="intent" value="accept" className="btn btn--honey btn--sm">Accept</button><button type="submit" name="intent" value="decline" className="btn btn--soft btn--sm">Decline</button></span>
                </form>
              ))}
            </section>
          ) : null}

          <section className="admin-card stack" aria-labelledby="partners-h">
            <h2 id="partners-h" style={{ fontSize: '1.3rem' }}>Alchemists giving your clients a discount</h2>
            {partners.length ? (
              <ul className="stack" style={{ listStyle: 'none', padding: 0, gap: '0.8rem' }}>
                {partners.map((a) => (
                  <li key={a.id}>
                    <form action={endAgreementPortalAction} className="row" style={{ justifyContent: 'space-between' }}>
                      <input type="hidden" name="id" value={a.id} />
                      <span><strong>{name(a.partner_id)}</strong>: {a.percent}% off a first session</span>
                      <button type="submit" className="btn btn--soft btn--sm">End</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : <p style={{ color: 'var(--muted)' }}>No one yet. Alchemists you know can offer your clients a discount from their own space.</p>}
          </section>

          <section className="admin-card stack" aria-labelledby="give-h">
            <h2 id="give-h" style={{ fontSize: '1.3rem' }}>Offer a discount to another Alchemist&rsquo;s clients</h2>
            <p style={{ color: 'var(--muted)' }}>Clients who reach out to you with their code get this much off their first session. You give the discount yourself when you talk: Empatherapy never handles the money. They have to accept before it works, and either of you can end it at any time.</p>
            {candidates.length ? (
              <form action={offerDiscountAction} className="stack" style={{ gap: '1rem' }}>
                <div className="filters__row">
                  <div className="field"><label htmlFor="referrer_id">For clients of</label><select id="referrer_id" name="referrer_id" required defaultValue=""><option value="" disabled>Choose an Alchemist</option>{candidates.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                  <div className="field"><label htmlFor="percent">Discount on a first session</label><select id="percent" name="percent" defaultValue="10">{PERCENTS.map((p) => <option key={p} value={p}>{p}%</option>)}</select></div>
                </div>
                <div><button type="submit" className="btn btn--honey">Make the offer</button></div>
              </form>
            ) : <p style={{ color: 'var(--muted)' }}>There is no one else to offer to yet.</p>}
          </section>

          {asPartner.length ? (
            <section className="admin-card stack" aria-labelledby="mine-h">
              <h2 id="mine-h" style={{ fontSize: '1.3rem' }}>Your offers</h2>
              <ul className="stack" style={{ listStyle: 'none', padding: 0, gap: '0.8rem' }}>
                {asPartner.map((a) => (
                  <li key={a.id}>
                    <form action={endAgreementPortalAction} className="row" style={{ justifyContent: 'space-between' }}>
                      <input type="hidden" name="id" value={a.id} />
                      <span>{a.percent}% off for clients of <strong>{name(a.referrer_id)}</strong>: {AGREEMENT_LABEL[a.status]}</span>
                      {['offered', 'active'].includes(a.status) ? <button type="submit" className="btn btn--soft btn--sm">{a.status === 'offered' ? 'Withdraw' : 'End'}</button> : null}
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
