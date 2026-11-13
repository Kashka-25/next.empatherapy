'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import AlchemistAvatar from '@/components/alchemists/AlchemistAvatar';
import { matchSeeker } from '@/lib/matching/index.mjs';
import { INTENTS, STYLES } from '@/lib/matching/vocabulary.mjs';
import { alchemists, modalities, modalitiesOf, BASIS_LABEL, placeAndFormat, priceFrom } from '@/lib/content.mjs';

const STEPS = 4; // questions before results

const empty = { experience: '', intention: '', intents: [], styles: [], format: '', location: '', budget: '' };

export default function DiscoverFlow() {
  const [step, setStep] = useState(0); // 0 = welcome, 1..4 = questions, 5 = results
  const [s, setS] = useState(empty);
  const [result, setResult] = useState(null);
  const top = useRef(null);

  const go = (n) => { setStep(n); top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const toggle = (key, id) => setS((p) => ({ ...p, [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id] }));
  const find = () => {
    setResult(matchSeeker({
      experience: s.experience, intention: s.intention, intents: s.intents, styles: s.styles,
      practical: { format: s.format, location: s.location, budget: s.budget },
    }, { alchemists, modalities }));
    go(5);
  };
  const restart = () => { setS(empty); setResult(null); go(0); };

  return (
    <div ref={top} style={{ scrollMarginTop: '100px' }}>
      <div className="flow">
        {step > 0 && step <= STEPS ? (
          <div className="flow__progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step} aria-label={`Step ${step} of ${STEPS}`}>
            {Array.from({ length: STEPS }, (_, i) => <span key={i} className={i < step ? 'done' : ''} />)}
          </div>
        ) : null}

        {step === 0 && (
          <div className="stack">
            <span className="hand">take your time</span>
            <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3rem)' }}>You don&rsquo;t need to know exactly what you&rsquo;re looking for.</h1>
            <p className="lede">Start wherever you are. Tell us a little about what&rsquo;s on your mind, and we&rsquo;ll help you explore some possibilities.</p>
            <p className="privacy-note"><span aria-hidden="true">🔒</span><span>What you write stays on this page. It is not sent anywhere or saved, and it is gone when you leave. Share only what feels comfortable, and skip anything you like.</span></p>
            <div className="row"><button type="button" className="btn btn--honey btn--lg" onClick={() => go(1)}>Begin</button></div>
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <h2>What&rsquo;s bringing you here?</h2>
            <div className="field">
              <label htmlFor="exp">What have you been experiencing lately? Is there something you&rsquo;d like to understand, explore or work through?</label>
              <textarea id="exp" value={s.experience} onChange={(e) => setS({ ...s, experience: e.target.value })} maxLength={1500} placeholder="In your own words, as little or as much as you like" />
              <span className="hint">Optional. You can leave this blank and answer the next questions instead.</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <h2>What are you hoping to discover?</h2>
            <fieldset className="field">
              <legend>What would you like to get out of exploring something new?</legend>
              <div className="chips" style={{ marginTop: '0.6rem' }}>
                {INTENTS.map((i) => <button key={i.id} type="button" className="chip" aria-pressed={s.intents.includes(i.id)} onClick={() => toggle('intents', i.id)}>{i.label}</button>)}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="int">Anything else? <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <textarea id="int" value={s.intention} onChange={(e) => setS({ ...s, intention: e.target.value })} maxLength={1000} style={{ minHeight: '5.5rem' }} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <h2>What are you open to?</h2>
            <fieldset className="field">
              <legend>Choose as many as you like, or skip this.</legend>
              <div className="chips" style={{ marginTop: '0.6rem' }}>
                {STYLES.map((o) => <button key={o.id} type="button" className="chip" aria-pressed={s.styles.includes(o.id)} onClick={() => toggle('styles', o.id)}>{o.label}</button>)}
              </div>
            </fieldset>
          </div>
        )}

        {step === 4 && (
          <div className="stack">
            <h2>Anything practical?</h2>
            <p style={{ color: 'var(--muted)' }}>All optional. This only helps us suggest people who can really work with you.</p>
            <fieldset className="field">
              <legend>How would you like to meet?</legend>
              <div className="chips" style={{ marginTop: '0.6rem' }}>
                {[['online', 'Online'], ['in-person', 'In person'], ['either', 'Either']].map(([v, l]) => <button key={v} type="button" className="chip" aria-pressed={s.format === v} onClick={() => setS({ ...s, format: s.format === v ? '' : v })}>{l}</button>)}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="loc">Where are you? <span style={{ fontWeight: 400 }}>(a city or region is plenty)</span></label>
              <input id="loc" type="text" value={s.location} onChange={(e) => setS({ ...s, location: e.target.value })} maxLength={80} placeholder="For example: Sydney" />
            </div>
            <div className="field">
              <label htmlFor="bud">Budget per session in AUD <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input id="bud" type="number" min="0" step="10" inputMode="numeric" value={s.budget} onChange={(e) => setS({ ...s, budget: e.target.value })} placeholder="For example: 150" />
            </div>
          </div>
        )}

        {step >= 1 && step <= STEPS && (
          <div className="flow__actions">
            <button type="button" className="btn btn--soft" onClick={() => go(step - 1)}>Back</button>
            <div className="row">
              {step < STEPS ? <button type="button" className="btn btn--soft" onClick={() => go(step + 1)}>Skip</button> : null}
              {step < STEPS
                ? <button type="button" className="btn btn--honey" onClick={() => go(step + 1)}>Next</button>
                : <button type="button" className="btn btn--honey btn--lg" onClick={find}>Discover your connections</button>}
            </div>
          </div>
        )}

        {step === 5 && result && <Results r={result} restart={restart} back={() => go(4)} />}
      </div>
    </div>
  );
}

function Results({ r, restart, back }) {
  if (r.safety.crisis) {
    return (
      <div className="stack">
        <div className="support-first" role="alert">
          <h2>Your safety comes first</h2>
          <p>{r.safety.message}</p>
        </div>
        <div className="row"><button type="button" className="btn btn--soft" onClick={restart}>Start over</button></div>
      </div>
    );
  }
  if (r.noSignal || (!r.alchemists.length && !r.modalities.length)) {
    return (
      <div className="stack">
        <h2>Let&rsquo;s find somewhere to start</h2>
        <p>We couldn&rsquo;t pick out much to go on, and that&rsquo;s completely fine. You could browse people and practices at your own pace, or go back and add a little more.</p>
        <div className="row">
          <Link href="/alchemists" className="btn btn--honey">Discover Alchemists</Link>
          <Link href="/modalities" className="btn btn--outline">Explore Modalities</Link>
          <button type="button" className="btn btn--soft" onClick={back}>Add more detail</button>
        </div>
        <p className="privacy-note">{r.disclaimer}</p>
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: '1.8rem' }}>
      <div className="stack">
        <span className="hand">some gentle introductions</span>
        <h2>Here are a few paths you might like to explore</h2>
        {r.themes.length ? <p style={{ color: 'var(--muted)' }}>From what you shared, we noticed: {r.themes.slice(0, 4).map((t) => t.label).join(', ')}.</p> : null}
      </div>

      {r.alchemists.length ? (
        <div className="stack" style={{ gap: '1.2rem' }}>
          {r.alchemists.map((x) => <AlchemistResult key={x.alchemist.id} x={x} />)}
        </div>
      ) : (
        <p>We couldn&rsquo;t find an Alchemist who matches your practical needs just yet. Here are some practices you might still enjoy learning about.</p>
      )}

      {r.modalities.length ? (
        <div className="stack">
          <h3>Practices that may resonate</h3>
          <div className="stack" style={{ gap: '0.8rem' }}>
            {r.modalities.map((m) => (
              <div key={m.modality.id} className="why">
                <strong><Link href={`/modalities/${m.modality.slug}`} className="link-arrow">{m.modality.name}</Link></strong>
                <p style={{ margin: '0.3rem 0 0' }}>{m.modality.short_description}</p>
                {m.reasons.length ? <ul>{m.reasons.map((x) => <li key={x}>{x}</li>)}</ul> : null}
                {m.flags.map((f) => <p key={f} style={{ fontSize: '0.88rem', marginTop: '0.4rem' }}>{f}</p>)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {r.explore.modalities.length || r.explore.alchemists.length ? (
        <div className="stack">
          <h3>You might also find these interesting</h3>
          <div className="chips">
            {r.explore.modalities.map((m) => <Link key={m.modality.id} href={`/modalities/${m.modality.slug}`} className="chip">{m.modality.name}</Link>)}
            {r.explore.alchemists.map((x) => <Link key={x.alchemist.id} href={`/alchemists/${x.alchemist.slug}`} className="chip">{x.alchemist.name}</Link>)}
          </div>
        </div>
      ) : null}

      <p className="privacy-note"><span aria-hidden="true">ℹ️</span><span>{r.disclaimer} Nothing you wrote was saved or shared with anyone.</span></p>
      <div className="row">
        <button type="button" className="btn btn--soft" onClick={back}>Change my answers</button>
        <button type="button" className="btn btn--soft" onClick={restart}>Start again</button>
      </div>
    </div>
  );
}

function AlchemistResult({ x }) {
  const a = x.alchemist;
  const training = modalitiesOf(a).find((m) => m.slug === x.primaryModality.slug);
  const firstSteps = a.session_steps.slice(0, 2).map((s) => s.title.toLowerCase()).join(', then ');
  return (
    <article className="result-card" aria-label={a.name}>
      <div className="result-card__portrait"><AlchemistAvatar alchemist={a} label={false} /></div>
      <div className="result-card__body">
        <div className="row">
          <span className="tag tag--sage">{x.primaryModality.name}</span>
          {a.demo ? <span className="tag tag--demo">Example profile</span> : <span className="tag tag--honey">Founding Alchemist</span>}
        </div>
        <h3>{a.name}</h3>
        <p>{a.short_bio}</p>
        <div className="why">
          <strong>{x.summary}</strong>
          <ul>{x.reasons.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <p style={{ fontSize: '0.95rem' }}><strong>What to expect:</strong> sessions begin with {firstSteps}. {placeAndFormat(a)}, {priceFrom(a)}.</p>
        {training ? <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}><strong>Basis for this practice:</strong> {BASIS_LABEL[training.basis]}.</p> : null}
        {x.flags.map((f) => <p key={f} style={{ fontSize: '0.88rem', color: 'var(--amber-text)' }}>{f}</p>)}
        <div className="row"><Link href={`/alchemists/${a.slug}`} className="btn btn--honey btn--sm">View profile</Link></div>
      </div>
    </article>
  );
}
