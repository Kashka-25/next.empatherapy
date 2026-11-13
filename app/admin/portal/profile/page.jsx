import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortal } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { editorValues, FIELD_LABEL } from '@/lib/proposals.mjs';
import AlchemistEditor from '@/components/admin/AlchemistEditor';
import { proposeProfileChangesAction, withdrawProposalAction } from '../../actions';

export const metadata = { title: 'Your profile' };

export default async function PortalProfile({ searchParams }) {
  const me = await requirePortal();
  const store = getStore();
  if (!store) notFound();
  const content = await loadContent(store);
  const profile = content.alchemists.find((a) => a.id === me.profile_id);
  if (!profile) notFound();
  const locked = profile.verification_status === 'founder' ? 'Founder' : null;

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/portal" className="link-arrow" style={{ justifySelf: 'start' }}>Your space</Link>
      <h1 style={{ fontSize: '2.2rem' }}>Your profile</h1>
      <p className="lede">Write in your own voice and keep it true. When you send your changes, the Empatherapy team reads them before anything changes on your public profile. Whether you are verified or published is theirs to decide.</p>
      {searchParams?.sent ? <p className="admin-flash" role="status">Sent. The team will have a look, and your public profile stays as it is until they approve.</p> : null}
      {searchParams?.same ? <p className="admin-flash" role="status">Nothing was different, so there is nothing to send.</p> : null}
      {searchParams?.withdrawn ? <p className="admin-flash" role="status">Your waiting changes were withdrawn.</p> : null}
      {profile.last_review?.status === 'rejected' && !profile.pending ? <p className="demo-note" role="status"><strong>Some changes were not approved.</strong>{profile.last_review.note ? ` ${profile.last_review.note}` : ''} You can change them and send again.</p> : null}
      {profile.pending ? (
        <section className="admin-card stack" aria-label="Changes waiting for review">
          <h2 style={{ fontSize: '1.2rem' }}>Changes waiting for review</h2>
          <p>Sent {new Date(profile.pending.submitted_at).toLocaleDateString('en-AU')}: {profile.pending.changed.map((k) => FIELD_LABEL[k] ?? k).join(', ')}. Your editor below shows them, and you can keep editing and send again.</p>
          <form action={withdrawProposalAction}><button type="submit" className="btn btn--soft btn--sm">Withdraw these changes</button></form>
        </section>
      ) : null}

      <AlchemistEditor action={proposeProfileChangesAction} id={profile.id} initial={editorValues(profile)} locked={locked} modalityOptions={content.modalities} portal />
    </div>
  );
}
