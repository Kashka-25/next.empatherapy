import Link from 'next/link';
import { requirePortal } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { loadPosts } from '@/lib/posts-store.mjs';
import { summarise, monthlySeries, PERIODS } from '@/lib/summary.mjs';

export const metadata = { title: 'What Empatherapy brought you' };

const money = (n) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const monthName = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-AU', { month: 'short', year: '2-digit', timeZone: 'UTC' });

export default async function SummaryPage({ searchParams }) {
  const me = await requirePortal();
  const store = getStore();
  const period = PERIODS[searchParams?.period] ? searchParams.period : '365';
  const enquiries = store ? await store.list('enquiries') : [];
  const s = summarise(enquiries, me.profile_id, { period });
  const series = monthlySeries(enquiries, me.profile_id);
  const profile = (await loadContent(store)).alchemists.find((a) => a.id === me.profile_id);
  const posts = (await loadPosts(store)).filter((p) => p.profile_id === me.profile_id && p.status === 'published').length;
  const biggest = Math.max(1, ...series.map((r) => r.enquiries));

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <Link href="/admin/portal" className="link-arrow" style={{ justifySelf: 'start' }}>Your space</Link>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>What Empatherapy brought you</h1>
        <p className="lede">A plain look at the people who reached out to you through the site. It counts only what is recorded here, and the outcomes are what you told us, so the more you keep them up to date, the truer it is.</p>
      </div>
      <nav className="row" aria-label="Period">
        {Object.entries(PERIODS).map(([k, p]) => <Link key={k} href={`/admin/portal/summary?period=${k}`} className={`chip${period === k ? ' is-active' : ''}`} aria-current={period === k ? 'true' : undefined}>{p.label}</Link>)}
      </nav>

      <section className="admin-grid" aria-label={s.label}>
        <div className="admin-card"><span className="eyebrow">People who reached out</span><strong className="admin-stat">{s.enquiries}</strong><span>{s.label.toLowerCase()}</span></div>
        <div className="admin-card"><span className="eyebrow">You replied to</span><strong className="admin-stat">{s.replied}</strong><span>{s.enquiries ? `${Math.round((s.replied / s.enquiries) * 100)}% of them` : 'no enquiries yet'}</span></div>
        <div className="admin-card"><span className="eyebrow">Booked a session</span><strong className="admin-stat">{s.booked}</strong><span>{s.firstSessions.count ? `${money(s.firstSessions.total)} in first sessions you noted` : s.booked ? 'add the first session amounts to see more' : 'as you report them'}</span></div>
      </section>

      {s.stillWaiting ? <p className="demo-note" role="status"><strong>{s.stillWaiting} {s.stillWaiting === 1 ? 'person is' : 'people are'} still waiting for a reply</strong> after more than three days. A kind, short answer goes a long way. <Link href="/admin/portal/enquiries" style={{ textDecoration: 'underline', textUnderlineOffset: '0.2em' }}>Open your enquiries</Link></p> : null}

      <section className="admin-card stack" aria-labelledby="more-h">
        <h2 id="more-h" style={{ fontSize: '1.3rem' }}>A little more</h2>
        <ul className="tick-list">
          <li>{s.medianReplyHours === null ? 'Once you mark enquiries as replied, you will see how quickly you usually answer.' : `You usually reply within about ${s.medianReplyHours < 1 ? 'an hour' : s.medianReplyHours < 48 ? `${Math.round(s.medianReplyHours)} hours` : `${Math.round(s.medianReplyHours / 24)} days`}.`}</li>
          <li>{s.cameWithACode} {s.cameWithACode === 1 ? 'enquiry' : 'enquiries'} came with another Alchemist&rsquo;s referral code.</li>
          <li><span>Your own code was used {s.myCodeUsed.enquiries} {s.myCodeUsed.enquiries === 1 ? 'time' : 'times'}{s.myCodeUsed.booked ? `, ${s.myCodeUsed.booked} of them booking` : ''}. <Link href="/admin/portal/circle" style={{ textDecoration: 'underline', textUnderlineOffset: '0.2em' }}>See your referral circle</Link></span></li>
          <li>You have {posts} {posts === 1 ? 'post' : 'posts'} in the knowledge feed, and {(profile.photos ?? []).filter((p) => p.approved !== false).length} {(profile.photos ?? []).filter((p) => p.approved !== false).length === 1 ? 'photo' : 'photos'} on your profile.</li>
        </ul>
      </section>

      <section className="admin-card stack" aria-labelledby="months-h">
        <h2 id="months-h" style={{ fontSize: '1.3rem' }}>Month by month</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">Month</th><th scope="col">Enquiries</th><th scope="col">Booked</th><th scope="col"><span className="sr-only">Bar</span></th></tr></thead>
            <tbody>
              {series.map((r) => (
                <tr key={r.month}>
                  <th scope="row">{monthName(r.month)}</th><td>{r.enquiries}</td><td>{r.booked}</td>
                  <td aria-hidden="true"><span style={{ display: 'inline-block', height: '0.7rem', width: `${(r.enquiries / biggest) * 100}%`, minWidth: r.enquiries ? '0.4rem' : 0, background: 'var(--honey)', borderRadius: '999px' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p style={{ color: 'var(--muted)' }}>What this does not show: Empatherapy does not track who visits your profile, so there are no view counts. It also cannot see bookings you have not told us about. Free to list for now: nothing here is a bill.</p>
    </div>
  );
}
