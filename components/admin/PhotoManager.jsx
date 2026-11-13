import { adminPhotoUrl, MAX_PHOTOS, photosOf, isApproved } from '@/lib/photos.mjs';
import { MAX_BYTES, MIN_SIDE } from '@/lib/images/inspect.mjs';
import CropPicker from './CropPicker.jsx';

/**
 * Photos for one Alchemist: upload, describe, choose the profile picture, reorder, remove.
 * Used by the team (mode "team": uploads go live, and photos an Alchemist added can be approved) and by an Alchemist
 * for their own profile (mode "portal": uploads wait for review before anyone else sees them).
 * Server-rendered forms, so it works without any browser script. Framing a new photo before upload is an enhancement
 * (CropPicker); without script the file is sent as it is.
 */
export default function PhotoManager({ alchemist, enabled, error, saved, mode = 'team', uploadAction, changeAction }) {
  const photos = photosOf(alchemist);
  const full = photos.length >= MAX_PHOTOS;
  const portal = mode === 'portal';
  const first = alchemist.name.split(' ')[0];

  return (
    <section id="photos" className="admin-card stack" style={{ gap: '1.2rem' }} aria-labelledby="photos-h">
      <div>
        <h2 id="photos-h" style={{ fontSize: '1.4rem' }}>Photos</h2>
        <p style={{ color: 'var(--muted)' }}>Up to {MAX_PHOTOS}. The first is the profile picture; together they make the &ldquo;Meet {first}&rdquo; carousel, so a mix of portrait and everyday moments helps people sense who {portal ? 'you are' : 'they are'}.{portal ? ' New photos are checked by the Empatherapy team before they appear on your public profile.' : ''}</p>
      </div>
      {saved ? <p className="admin-flash" role="status">{portal ? 'Saved. A new photo appears publicly once the team has looked at it.' : 'Photos saved. The public site updates within moments.'}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}

      {!enabled ? (
        <p className="demo-note"><strong>Photo storage is switched off,</strong> so photos cannot be added yet.</p>
      ) : alchemist.demo ? (
        <p className="demo-note">This is a <strong>fictional example</strong>, so it cannot have photos. A real person&rsquo;s face must never stand in for a made-up one.</p>
      ) : (
        <>
          {photos.length ? (
            <ol className="photo-grid">
              {photos.map((p, i) => (
                <li key={p.id} className="photo-card">
                  <img src={adminPhotoUrl(p.id)} alt={p.alt} width={p.w} height={p.h} loading="lazy" />
                  <div className="stack" style={{ gap: '0.6rem' }}>
                    <p className="small">
                      {i === 0 ? <strong>Profile picture</strong> : `Photo ${i + 1}`}
                      {!isApproved(p) ? <> <span className="tag tag--honey">Waiting for review</span></> : null}
                    </p>
                    <form action={changeAction} className="stack" style={{ gap: '0.5rem' }}>
                      <input type="hidden" name="id" value={alchemist.id} />
                      <input type="hidden" name="photo_id" value={p.id} />
                      <div className="field">
                        <label htmlFor={`alt-${p.id}`}>Description (alt text)</label>
                        <input id={`alt-${p.id}`} name="alt" defaultValue={p.alt} maxLength={200} required />
                      </div>
                      <div className="field">
                        <label htmlFor={`cap-${p.id}`}>Caption (optional)</label>
                        <input id={`cap-${p.id}`} name="caption" defaultValue={p.caption ?? ''} maxLength={140} />
                      </div>
                      <div className="row">
                        <button type="submit" name="intent" value="save" className="btn btn--soft btn--sm">Save text</button>
                        {!portal && !isApproved(p) ? <button type="submit" name="intent" value="approve" className="btn btn--honey btn--sm">Approve</button> : null}
                        {i > 0 ? <button type="submit" name="intent" value="primary" className="btn btn--soft btn--sm">Make profile picture</button> : null}
                        {i > 0 ? <button type="submit" name="intent" value="left" className="btn btn--soft btn--sm" aria-label={`Move photo ${i + 1} earlier`}>&larr;</button> : null}
                        {i < photos.length - 1 ? <button type="submit" name="intent" value="right" className="btn btn--soft btn--sm" aria-label={`Move photo ${i + 1} later`}>&rarr;</button> : null}
                        <button type="submit" name="intent" value="remove" className="btn btn--soft btn--sm" style={{ borderColor: '#9B3B22', color: '#9B3B22' }}>Remove</button>
                      </div>
                    </form>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p style={{ color: 'var(--muted)' }}>No photos yet. The illustrated placeholder shows until one is added.</p>}

          {full ? (
            <p className="demo-note">This profile has {MAX_PHOTOS} photos, the most it can hold. Remove one to add another.</p>
          ) : (
            <form action={uploadAction} className="stack" style={{ gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Add a photo</h3>
              <input type="hidden" name="id" value={alchemist.id} />
              <div className="field">
                <label htmlFor="photo">Photo</label>
                <span className="hint">JPEG, PNG or WebP, up to {MAX_BYTES / 1024 / 1024} MB, at least {MIN_SIDE} pixels on the shortest side. Location and camera details are removed automatically.</span>
                <CropPicker minSide={MIN_SIDE} />
              </div>
              <div className="field">
                <label htmlFor="new-alt">Describe the photo</label>
                <span className="hint">For people who cannot see it, for example &ldquo;{portal ? 'Me' : 'Sam'} laughing in a sunlit garden, holding a cup of tea&rdquo;.</span>
                <input id="new-alt" name="alt" maxLength={200} required />
              </div>
              <div className="field">
                <label htmlFor="new-caption">Caption (optional)</label>
                <input id="new-caption" name="caption" maxLength={140} />
              </div>
              <label className="check">
                <input type="checkbox" name="permission" required />
                <span>{portal ? 'This is a photo of me, or everyone in it has agreed to it being published on Empatherapy, and it is mine to share.' : 'The person in the photo has agreed to it being published on Empatherapy, and the photo is theirs to share.'}</span>
              </label>
              <div><button type="submit" className="btn btn--honey">Upload photo</button></div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
