import Link from 'next/link';
import { notFound } from 'next/navigation';
import AlchemistPortrait from '@/components/alchemists/AlchemistPortrait';
import PhotoCarousel from '@/components/alchemists/PhotoCarousel';
import EnquiryForm from '@/components/alchemists/EnquiryForm';
import ShortlistButton from '@/components/alchemists/ShortlistButton';
import { publicPhotos } from '@/lib/photos.mjs';
import Eyebrow from '@/components/ui/Eyebrow';
import DevNote from '@/components/ui/DevNote';
import { bySlug, modalitiesOf, BASIS_LABEL, placeAndFormat } from '@/lib/content.mjs';
import { publicContent } from '@/lib/content-store.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { hasPortal } from '@/lib/accounts.mjs';
import { loadPublicPosts } from '@/lib/posts-store.mjs';
import { postsBy } from '@/lib/posts.mjs';
import PostCard from '@/components/knowledge/PostCard';

export const revalidate = 60;

export async function generateStaticParams() {
  return (await publicContent()).alchemists.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }) {
  const a = bySlug((await publicContent()).alchemists, params.slug);
  if (!a) return {};
  return { title: `${a.name}${a.demo ? ' (example profile)' : ''}`, description: a.short_bio };
}

const BASIS_ORDER = ['formal', 'experience', 'study'];

export default async function AlchemistPage({ params }) {
  const { alchemists, modalities } = await publicContent();
  const a = bySlug(alchemists, params.slug);
  if (!a) notFound();

  const mods = modalitiesOf(a, modalities);
  const offered = mods.filter((m) => m.basis !== 'confirm');
  const drawn = mods.filter((m) => m.basis === 'confirm');
  const needsConfirm = [...a.qualifications, ...a.experience, ...a.pricing.sessions].filter((x) => x.confirm).length;
  const founder = !a.demo;
  const photos = publicPhotos(a);
  const writing = postsBy(await loadPublicPosts(), a.id).slice(0, 3);
  const first = a.name.split(' ')[0];
  const store = getStore();
  const canEnquire = !a.demo && (Boolean(a.enquiry_email) || (store ? await hasPortal(store, a.id) : false));

  return (
    <>
      <section className="profile-hero">
        <div className="container profile-hero__grid">
          <div className="profile-hero__portrait"><AlchemistPortrait alchemist={a} /></div>
          <div className="profile-hero__copy">
            <div className="row">
              {a.demo ? <span className="tag tag--demo">Example profile</span> : <span className="tag tag--honey">Founding Alchemist</span>}
              <span className="tag">{placeAndFormat(a)}</span>
            </div>
            <Eyebrow>{a.offering_name ? `${a.offering_name} · ${a.title}` : a.title}</Eyebrow>
            <h1>{a.name}</h1>
            <p className="hand" style={{ fontSize: '1.9rem' }}>{a.tagline}</p>
            <p className="lede" style={{ maxWidth: '40rem' }}>{a.short_bio}</p>
            <ShortlistButton slug={a.slug} name={a.name} />
          </div>
        </div>
      </section>

      <div className="container profile-layout">
        <div className="profile-main">
          {a.demo ? (
            <p className="demo-note"><strong>Example profile.</strong> {a.name} is a fictional person created to show how an Empatherapy profile will look and feel. The qualifications, prices and story are invented, and nothing here can be booked.</p>
          ) : (
            <>
              <DevNote>Cassidy, please add your own words for &ldquo;what brought you to this work&rdquo;; the story below is built from your directive and the old profile.</DevNote>
              {needsConfirm ? <DevNote>{needsConfirm} items (credentials, experience, prices) still need your confirmation. Search for <code>confirm: true</code> in data/alchemists.mjs.</DevNote> : null}
            </>
          )}

          {photos.length > 1 ? (
            <section className="profile-section" aria-labelledby="meet-h">
              <Eyebrow>Meet {first}</Eyebrow>
              <h2 id="meet-h">A little of {first}&rsquo;s world</h2>
              <PhotoCarousel name={a.name} photos={photos} />
            </section>
          ) : null}

          <section className="profile-section story" aria-labelledby="story-h">
            <Eyebrow>{founder ? 'Where it began' : 'My story'}</Eyebrow>
            <h2 id="story-h">Why I do this</h2>
            <div className="story-body">{a.personal_story.map((p, i) => <p key={i}>{p}</p>)}</div>
          </section>

          <div className="note-card">
            <span className="hand">what brought me here</span>
            <p>{a.what_brought_me}</p>
          </div>

          <section className="profile-section" aria-labelledby="phil-h">
            <Eyebrow>Philosophy</Eyebrow>
            <h2 id="phil-h">How I think about healing and growth</h2>
            <blockquote className="pull" style={{ marginBottom: '1.2rem' }}>{a.pull_quote}</blockquote>
            <p>{a.philosophy}</p>
          </section>

          {writing.length ? (
            <section className="profile-section" aria-labelledby="writing-h">
              <Eyebrow>Writing by {first}</Eyebrow>
              <h2 id="writing-h">Learn a little before you reach out</h2>
              <div className="post-grid">{writing.map((p) => <PostCard key={p.id} post={p} />)}</div>
            </section>
          ) : null}

          <section className="profile-section" aria-labelledby="prac-h">
            <Eyebrow>Practices</Eyebrow>
            <h2 id="prac-h">What I offer</h2>
            <div className="row" style={{ marginBottom: '1rem' }}>
              {offered.map((m) => (
                <Link key={m.slug} href={`/modalities/${m.slug}`} className="chip" title={BASIS_LABEL[m.basis]}>{m.modality.name}<span style={{ opacity: 0.6, fontWeight: 400 }}>· {BASIS_LABEL[m.basis].toLowerCase()}</span></Link>
              ))}
            </div>
            {drawn.length || a.practices_drawn_on ? (
              <>
                <p style={{ fontSize: '0.95rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>Other practices I draw on:</p>
                <div className="row">
                  {drawn.map((m) => <Link key={m.slug} href={`/modalities/${m.slug}`} className="tag tag--sage">{m.modality.name}</Link>)}
                  {(a.practices_drawn_on || []).map((p) => <span key={p} className="tag tag--sage">{p}</span>)}
                </div>
              </>
            ) : null}
            <p style={{ marginTop: '1rem' }}><span className="eyebrow">Approach</span><br />{a.approach_tags.join(' · ')}</p>
          </section>

          <section className="profile-section" aria-labelledby="train-h">
            <Eyebrow>Training and experience</Eyebrow>
            <h2 id="train-h">What stands behind my work</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.2rem' }}>Qualifications, personal study and lived experience are different things, and we show them separately so you can decide what matters to you.</p>
            <div className="basis-groups">
              {BASIS_ORDER.map((basis) => {
                const items = [...a.qualifications, ...a.training, ...a.experience].filter((x) => x.basis === basis);
                if (!items.length) return null;
                return (
                  <div key={basis}>
                    <h3>{BASIS_LABEL[basis]}</h3>
                    <ul className="tick-list">{items.map((x) => <li key={x.title}>{x.title}</li>)}</ul>
                  </div>
                );
              })}
              {a.modalities.some((m) => m.basis === 'interest') ? (
                <div>
                  <h3>{BASIS_LABEL.interest}</h3>
                  <p className="small" style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>
                    {a.modalities.filter((m) => m.basis === 'interest').map((m) => bySlug(modalities, m.slug)?.name ?? m.slug).join(', ')}. This is something I am learning about. It is not something I offer, and personal experience is not clinical training.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="profile-section" aria-labelledby="suit-h">
            <Eyebrow>Is this for you?</Eyebrow>
            <h2 id="suit-h">Who my sessions may suit</h2>
            <ul className="tick-list">{a.suits.map((s) => <li key={s}>{s}</li>)}</ul>
            {a.outcomes?.length ? (
              <>
                <h3 style={{ marginTop: '1.6rem', marginBottom: '0.8rem' }}>What people may take away</h3>
                <ul className="tick-list">{a.outcomes.map((s) => <li key={s}>{s}</li>)}</ul>
              </>
            ) : null}
          </section>

          <section className="profile-section" aria-labelledby="sess-h">
            <Eyebrow>A typical session</Eyebrow>
            <h2 id="sess-h">What it&rsquo;s like to work together</h2>
            <ol className="session-steps">
              {a.session_steps.map((s) => <li key={s.title}><div><strong>{s.title}</strong><p>{s.text}</p></div></li>)}
            </ol>
          </section>

          <section className="profile-section" aria-labelledby="price-h">
            <Eyebrow>Sessions and pricing</Eyebrow>
            <h2 id="price-h">Ways to work together</h2>
            <div className="price-list">
              {a.pricing.sessions.map((s) => (
                <div className="price-row" key={s.title}>
                  <div><strong>{s.title}</strong><small>{s.duration} · {s.description}</small></div>
                  <span className="price">{s.price}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '0.8rem' }}>{a.demo ? 'Example prices in AUD.' : 'Prices in AUD.'}</p>
          </section>

          <section className="profile-section" aria-labelledby="safe-h">
            <div className="note-card note-card--safety">
              <h2 id="safe-h" style={{ fontSize: '1.35rem' }}>Good to know before you begin</h2>
              <p>{a.safety_information}</p>
              <p style={{ fontSize: '0.92rem' }}>If you are in danger or need urgent help in Australia, call 000, or Lifeline on 13 11 14.</p>
            </div>
          </section>

          <section className="profile-section" aria-labelledby="rev-h">
            <h2 id="rev-h">Reviews</h2>
            <div className="empty" style={{ justifyItems: 'start', textAlign: 'left' }}>
              <p>No reviews yet. Reviews from people who have worked with an Alchemist will appear here once Empatherapy opens, and they will be moderated.</p>
            </div>
          </section>
        </div>

        <aside className="profile-aside" aria-label="Details and enquiries">
          <div className="aside-card">
            <dl>
              <div><dt>Where</dt><dd>{a.location.label}</dd><p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 400 }}>{a.location.note}</p></div>
              <div><dt>Format</dt><dd>{a.delivery_formats.map((f) => (f === 'online' ? 'Online' : 'In person')).join(' and ')}</dd></div>
              <div><dt>Sessions</dt><dd>from ${a.pricing.from} {a.pricing.currency}</dd></div>
            </dl>
            {canEnquire ? (
              <EnquiryForm alchemistId={a.id} firstName={first} fallbackEmail={a.enquiry_email} />
            ) : (
              <>
                <button type="button" className="btn btn--soft btn--lg" disabled>{a.demo ? 'Enquiries open at launch' : 'Enquiries not open yet'}</button>
                <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>{a.demo ? 'This is an example profile, so there is nobody to contact.' : `${first} has not added a way to enquire yet.`}</p>
              </>
            )}
          </div>
          <Link href="/alchemists" className="link-arrow" style={{ justifySelf: 'start' }}>Back to all Alchemists</Link>
        </aside>
      </div>
    </>
  );
}

