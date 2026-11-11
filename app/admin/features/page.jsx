import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadFeatures } from '@/lib/features.mjs';
import { modalities } from '@/data/modalities.mjs';
import { addFeatureAction, setFeatureStatusAction, deleteFeatureAction, seedFeaturesAction } from '../actions';

export const metadata = { title: 'Weekly features' };

const name = (id) => modalities.find((m) => m.id === id)?.name ?? id;
const fmt = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const today = () => new Date().toISOString().slice(0, 10);

function Row({ f, editable }) {
  return (
    <tr>
      <th scope="row">{name(f.modality_id)}<br /><small style={{ fontWeight: 400, color: 'var(--muted)' }}>{f.editorial_introduction}</small></th>
      <td>{fmt(f.feature_start)} to {fmt(f.feature_end)}</td>
      <td>{f.featured_position}</td>
      <td><span className={`status status--${f.publication_status === 'published' ? 'approved' : f.publication_status === 'draft' ? 'in_review' : 'declined'}`}>{f.publication_status}</span></td>
      <td>
        {editable ? (
          <div className="row" style={{ gap: '0.4rem' }}>
            {['published', 'draft', 'archived'].filter((s) => s !== f.publication_status).map((s) => (
              <form key={s} action={setFeatureStatusAction}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value={s} /><button className="btn btn--soft btn--sm" type="submit">{s === 'published' ? 'Publish' : s === 'draft' ? 'Make draft' : 'Archive'}</button></form>
            ))}
            <form action={deleteFeatureAction}><input type="hidden" name="id" value={f.id} /><button className="btn btn--soft btn--sm" type="submit" style={{ color: '#9B3B22' }}>Delete</button></form>
          </div>
        ) : <small style={{ color: 'var(--muted)' }}>sample</small>}
      </td>
    </tr>
  );
}

export default async function FeaturesPage({ searchParams }) {
  await requireAdmin();
  const store = getStore();
  const stored = store ? await store.list('features') : [];
  const features = await loadFeatures(store);
  const usingSample = !stored.length;
  const t = today();
  const upcoming = features.filter((f) => f.publication_status === 'published' && f.feature_end >= t).sort((a, b) => a.feature_start.localeCompare(b.feature_start) || a.featured_position - b.featured_position);
  const drafts = features.filter((f) => f.publication_status === 'draft');
  const past = features.filter((f) => f.publication_status === 'archived' || (f.publication_status === 'published' && f.feature_end < t)).sort((a, b) => b.feature_start.localeCompare(a.feature_start));

  const Table = ({ rows, empty }) => rows.length ? (
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Modality</th><th scope="col">When</th><th scope="col">Position</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((f) => <Row key={f.id} f={f} editable={!usingSample} />)}</tbody></table></div>
  ) : <p style={{ color: 'var(--muted)' }}>{empty}</p>;

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>Weekly features</h1>
        <p className="lede">Choose one to three modalities to feature each week. Changes appear on the homepage and the modalities page within moments, with no code changes.</p>
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}

      {!store ? (
        <p className="demo-note"><strong>Storage is switched off,</strong> so this shows the sample schedule and cannot be edited yet.</p>
      ) : usingSample ? (
        <form action={seedFeaturesAction} className="admin-card stack">
          <p>The site is showing the built-in <strong>sample schedule</strong>. Copy it here to start editing, or just add your own below (adding your own replaces the sample).</p>
          <div className="row"><button type="submit" className="btn btn--honey btn--sm">Copy the sample schedule</button></div>
        </form>
      ) : null}

      <section className="stack"><h2 style={{ fontSize: '1.4rem' }}>Live and upcoming</h2><Table rows={upcoming} empty="Nothing scheduled. The homepage will show the most recent past week instead." /></section>
      {drafts.length ? <section className="stack"><h2 style={{ fontSize: '1.4rem' }}>Drafts</h2><Table rows={drafts} empty="" /></section> : null}

      {store ? (
        <form action={addFeatureAction} className="admin-card stack" style={{ gap: '1.2rem' }}>
          <h2 style={{ fontSize: '1.4rem' }}>Schedule a feature</h2>
          <div className="filters__row">
            <div className="field"><label htmlFor="modality_id">Modality</label>
              <select id="modality_id" name="modality_id" required defaultValue=""><option value="" disabled>Choose one</option>{modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div className="field"><label htmlFor="feature_start">From</label><input id="feature_start" name="feature_start" type="date" required /></div>
            <div className="field"><label htmlFor="feature_end">To</label><input id="feature_end" name="feature_end" type="date" required /></div>
            <div className="field"><label htmlFor="featured_position">Position (1 to 3)</label>
              <select id="featured_position" name="featured_position" defaultValue="1"><option>1</option><option>2</option><option>3</option></select></div>
          </div>
          <div className="field"><label htmlFor="editorial_introduction">Short introduction</label><textarea id="editorial_introduction" name="editorial_introduction" required minLength={10} maxLength={240} style={{ minHeight: '5rem' }} /><span className="hint">A sentence or two, in a warm voice. Up to 240 characters.</span></div>
          <div className="field"><label htmlFor="publication_status">Status</label>
            <select id="publication_status" name="publication_status" defaultValue="published"><option value="published">Published</option><option value="draft">Draft</option></select></div>
          <div className="row"><button type="submit" className="btn btn--honey">Add to schedule</button></div>
        </form>
      ) : null}

      <section className="stack"><h2 style={{ fontSize: '1.4rem' }}>Past and archived</h2><Table rows={past} empty="Nothing here yet." /></section>
    </div>
  );
}
