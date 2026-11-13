import Link from 'next/link';
import { requirePortal } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { listEnquiries } from '@/lib/enquiries.mjs';
import { waitingPhotos } from '@/lib/photos.mjs';
import { loadPosts } from '@/lib/posts-store.mjs';
import { ELIGIBLE_STATUSES } from '@/lib/matching/index.mjs';

export const metadata = { title: 'Your space' };

export default async function PortalHome({ searchParams }) {
  const me = await requirePortal();
  const store = getStore();
  const profile = (await loadContent(store)).alchemists.find((a) => a.id === me.profile_id);
  const enquiries = store ? await listEnquiries(store, { alchemistId: me.profile_id }) : [];
  const fresh = enquiries.filter((e) => e.status === 'new').length;
  const isPublic = profile.publication_status === 'published' && ELIGIBLE_STATUSES.includes(profile.verification_status);
  const waiting = waitingPhotos(profile).length;
  const myPosts = (await loadPosts(store)).filter((p) => p.profile_id === me.profile_id);
  const live = myPosts.filter((p) => p.status === 'published').length;
  const inReview = myPosts.filter((p) => p.status === 'submitted').length;

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.4rem' }}>Welcome, {me.name.split(' ')[0]}</h1>
        <p className="lede">This is your space on Empatherapy. You can look after your own profile, photos, writing and enquiries here, and nothing you change goes public until the team has had a look.</p>
      </div>
      {searchParams?.e === 'forbidden' ? <p className="error" role="alert">That part is not part of your space.</p> : null}
      {!me.two_step ? <p className="demo-note" role="status"><strong>Protect your account.</strong> Two-step sign-in adds a code from your phone to your password. <Link href="/admin/account" className="link-arrow">Turn it on</Link></p> : null}

      <section className="admin-card stack" aria-label="Your profile">
        <h2 style={{ fontSize: '1.3rem' }}>Your profile</h2>
        <p>{isPublic ? <>It is <strong>live</strong> on the site. <Link href={`/alchemists/${profile.slug}`} target="_blank" className="link-arrow">See how visitors see it</Link>.</> : <>It is <strong>not public yet</strong>. It goes live when the team has checked your details and published it.</>}</p>
        {profile.pending ? <p className="demo-note">You have changes waiting for review, sent {new Date(profile.pending.submitted_at).toLocaleDateString('en-AU')}.</p> : null}
        {profile.last_review?.status === 'rejected' ? <p className="demo-note"><strong>Some changes were not approved.</strong>{profile.last_review.note ? ` ${profile.last_review.note}` : ''}</p> : null}
        {profile.last_review?.status === 'approved' && !profile.pending ? <p style={{ color: 'var(--muted)' }}>Your last changes were approved on {new Date(profile.last_review.at).toLocaleDateString('en-AU')}.</p> : null}
      </section>

      <div className="admin-grid">
        <Link href="/admin/portal/profile" className="admin-card admin-card--link"><span className="eyebrow">Your profile</span><strong className="admin-stat">{profile.pending ? 'Waiting' : 'Edit'}</strong><span>{profile.pending ? 'changes are with the team' : 'story, practices, sessions, prices'}</span></Link>
        <Link href="/admin/portal/photos" className="admin-card admin-card--link"><span className="eyebrow">Photos</span><strong className="admin-stat">{profile.photos?.length ?? 0} of 5</strong><span>{waiting ? `${waiting} waiting for review` : 'your profile picture and Meet-you carousel'}</span></Link>
        <Link href="/admin/portal/posts" className="admin-card admin-card--link"><span className="eyebrow">Your writing</span><strong className="admin-stat">{store ? live : '–'}</strong><span>{store ? `published${inReview ? `, ${inReview} waiting for review` : ''}` : 'storage is off'}</span></Link>
        <Link href="/admin/portal/summary" className="admin-card admin-card--link"><span className="eyebrow">What Empatherapy brought you</span><strong className="admin-stat">{store ? enquiries.length : '–'}</strong><span>{store ? 'people reached out, and how it went' : 'storage is off'}</span></Link>
        <Link href="/admin/portal/circle" className="admin-card admin-card--link"><span className="eyebrow">Referral circle</span><strong className="admin-stat">Share</strong><span>your code, and discounts between Alchemists</span></Link>
        <Link href="/admin/portal/enquiries" className="admin-card admin-card--link"><span className="eyebrow">Enquiries</span><strong className="admin-stat">{store ? fresh : '–'}</strong><span>{store ? `new, ${enquiries.length} in total` : 'storage is off'}</span></Link>
      </div>
    </div>
  );
}
