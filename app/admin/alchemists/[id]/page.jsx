import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { alchemistToForm } from '@/lib/admin-content.mjs';
import AlchemistEditor from '@/components/admin/AlchemistEditor';
import PhotoManager from '@/components/admin/PhotoManager';
import { getBlobStore } from '@/lib/images/blobs.mjs';
import { saveAlchemistAction, resetAlchemistAction } from '../../actions';

export const metadata = { title: 'Edit Alchemist' };

const BLANK = {
  name: '', title: '', offering_name: '', tagline: '', short_bio: '', pull_quote: '', personal_story: '', what_brought_me: '', philosophy: '',
  modalities: '', approach_tags: '', interests: '', qualifications: '', training: '', experience: '', suits: '', outcomes: '', session_steps: '',
  delivery_formats: [], location_label: '', location_region: '', location_note: '', pricing_from: '', pricing_note: '', pricing_sessions: '',
  safety_information: '', enquiry_email: '', website: '', publication_status: 'draft', verification_status: 'pending', featured_status: '', featured_rank: '',
};

export default async function EditAlchemistPage({ params, searchParams }) {
  await requireAdmin('content');
  const store = getStore();
  if (!store) notFound();
  const content = await loadContent(store);
  const isNew = params.id === 'new';
  const a = isNew ? null : content.alchemists.find((x) => x.id === params.id);
  if (!isNew && !a) notFound();
  const seedBacked = a ? content.seedIds.alchemists.has(a.id) : false;
  const locked = a?.demo ? 'Fictional example (cannot be verified)' : a?.verification_status === 'founder' ? 'Founder' : null;

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/alchemists" className="link-arrow" style={{ justifySelf: 'start' }}>All Alchemists</Link>
      <div className="row" style={{ justifyContent: 'space-between', gap: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>{isNew ? 'New Alchemist' : a.name}</h1>
        {a && a.publication_status === 'published' ? <Link href={`/alchemists/${a.slug}`} target="_blank" className="btn btn--soft btn--sm">View public page</Link> : null}
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved. The public site updates within moments.</p> : null}
      {a?.demo ? <p className="demo-note">This is a <strong>fictional example profile</strong>. It stays labelled as an example. Remove these before launch.</p> : null}
      {searchParams?.created ? <p className="admin-flash" role="status">Draft created from the application. It is hidden. Finish it below, check what they told us, then verify and publish.</p> : null}
      {a?.source ? (
        <section className="admin-card stack" aria-labelledby="src-h">
          <h2 id="src-h" style={{ fontSize: '1.2rem' }}>Created from an application</h2>
          <p style={{ color: 'var(--muted)' }}>These are the applicant&rsquo;s own words, not checked. They are private and disappear when the profile is published. {a.source.application_id ? <Link href={`/admin/applications/${a.source.application_id}`} className="link-arrow">See the application</Link> : null}</p>
          <dl className="admin-dl">
            {a.source.practices_as_written ? <div><dt>Practices as written</dt><dd>{a.source.practices_as_written}</dd></div> : null}
            {a.source.unmatched_practices?.length ? <div><dt>Not matched to a modality page</dt><dd>{a.source.unmatched_practices.join(', ')}</dd></div> : null}
            {a.source.qualifications_as_written ? <div><dt>Qualifications as written</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{a.source.qualifications_as_written}</dd></div> : null}
            {a.source.pricing_as_written ? <div><dt>Their pricing answer</dt><dd>{a.source.pricing_as_written}</dd></div> : null}
            {a.source.links?.length ? <div><dt>Links they gave</dt><dd>{a.source.links.join(' ')}</dd></div> : null}
          </dl>
        </section>
      ) : null}
      {isNew ? <p className="demo-note">New profiles start as hidden drafts. They go public only when published <em>and</em> verified, after you have checked their training and registration.</p> : null}

      <AlchemistEditor
        action={saveAlchemistAction}
        id={a?.id ?? ''}
        initial={a ? alchemistToForm(a) : BLANK}
        locked={locked}
        modalityOptions={content.modalities}
      />

      {a ? <PhotoManager alchemist={a} enabled={Boolean(getBlobStore())} error={searchParams?.photo_error} saved={Boolean(searchParams?.photo_saved)} /> : null}

      {a && (content.edited.alchemists.has(a.id)) ? (
        <form action={resetAlchemistAction} className="admin-card stack">
          <input type="hidden" name="id" value={a.id} />
          <h2 style={{ fontSize: '1.15rem' }}>{seedBacked ? 'Reset to the original' : 'Delete this profile'}</h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>{seedBacked ? 'Throws away the changes made here, including any photos added here, and brings back the built-in version.' : 'Removes this profile and its photos permanently. This cannot be undone.'}</p>
          <label className="check"><input type="checkbox" name="confirm" required /><span>Yes, {seedBacked ? 'reset it' : 'delete it'}.</span></label>
          <button type="submit" className="btn btn--soft btn--sm" style={{ borderColor: '#9B3B22', color: '#9B3B22', justifySelf: 'start' }}>{seedBacked ? 'Reset' : 'Delete'}</button>
        </form>
      ) : null}
    </div>
  );
}
