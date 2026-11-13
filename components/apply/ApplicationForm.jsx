'use client';
import { useState } from 'react';
import { validateApplication } from '@/lib/validation.mjs';

const blank = { website_url: '', name: '', email: '', introduction: '', personal_story: '', modalities: '', qualifications: '', experience: '', location: '', delivery_format: '', pricing: '', links: '', consent: false };

function Field({ id, label, hint, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? <span className="hint" id={`${id}-hint`}>{hint}</span> : null}
      {children}
      {error ? <span className="error" id={`${id}-err`} role="alert">{error}</span> : null}
    </div>
  );
}

export default function ApplicationForm() {
  const [v, setV] = useState(blank);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null); // null | 'sent' | 'preview'
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const props = (k) => ({ id: k, value: v[k], onChange: set(k), 'aria-invalid': errors[k] ? 'true' : undefined, 'aria-describedby': [errors[k] && `${k}-err`].filter(Boolean).join(' ') || undefined });

  const submit = async (e) => {
    e.preventDefault();
    setProblem('');
    const r = validateApplication(v);
    setErrors(r.errors);
    if (!r.valid) { document.getElementById(Object.keys(r.errors)[0])?.focus(); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...r.data, website_url: v.website_url }) });
      if (res.status === 201) setDone('sent');
      else if (res.status === 503) setDone('preview'); // storage is not switched on yet, so this stays a preview
      else if (res.status === 429) setProblem('You have sent a few applications already. Please try again in an hour, or email us.');
      else if (res.status === 400) { const body = await res.json().catch(() => ({})); setErrors(body.errors || {}); setProblem('Some answers need another look.'); }
      else setProblem('Something went wrong on our side. Please try again, or email hello@empatherapy.co.');
    } catch {
      setProblem('We could not reach the server. Please check your connection and try again.');
    } finally { setBusy(false); }
  };

  if (done === 'sent') {
    return (
      <div className="note-card" role="status">
        <h3>Thank you, we have your application</h3>
        <p>A person will read it and get back to you by email. Nothing is published without your approval. You can ask us to delete your details at any time by emailing <a className="link-arrow" href="mailto:hello@empatherapy.co?subject=Delete%20my%20application">hello@empatherapy.co</a>.</p>
      </div>
    );
  }

  if (done === 'preview') {
    return (
      <div className="note-card" role="status">
        <h3>Thank you, your application is ready</h3>
        <p><strong>This form is a preview, so nothing has been sent or saved.</strong> Applications will open once Empatherapy has a secure place to receive and review them. If you would like to be one of the first Alchemists, please email <a className="link-arrow" href="mailto:hello@empatherapy.co?subject=Becoming%20an%20Alchemist">hello@empatherapy.co</a>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="stack" style={{ gap: '1.4rem' }} aria-label="Alchemist application">
      <div className="filters__row">
        <Field id="name" label="Your name" error={errors.name}><input type="text" autoComplete="name" {...props('name')} maxLength={120} /></Field>
        <Field id="email" label="Email" error={errors.email}><input type="email" autoComplete="email" {...props('email')} maxLength={200} /></Field>
      </div>
      <Field id="introduction" label="A short introduction" hint="How would you introduce yourself to a Seeker?" error={errors.introduction}><textarea {...props('introduction')} maxLength={1200} /></Field>
      <Field id="personal_story" label="Your story" hint="What brought you to your practice? This is the heart of your profile." error={errors.personal_story}><textarea {...props('personal_story')} maxLength={4000} style={{ minHeight: '11rem' }} /></Field>
      <Field id="modalities" label="Practices you offer" hint="For example: breathwork, Reiki, expressive arts" error={errors.modalities}><input type="text" {...props('modalities')} maxLength={400} /></Field>
      <Field id="qualifications" label="Qualifications and training" hint="List formal qualifications and training separately from personal study. Write &quot;none yet&quot; if that is true." error={errors.qualifications}><textarea {...props('qualifications')} maxLength={1500} /></Field>
      <Field id="experience" label="Relevant experience" hint="Optional. Including lived experience, which is valued and shown separately from qualifications." error={errors.experience}><textarea {...props('experience')} maxLength={1500} style={{ minHeight: '5.5rem' }} /></Field>
      <div className="filters__row">
        <Field id="location" label="Where are you based?" error={errors.location}><input type="text" {...props('location')} maxLength={160} /></Field>
        <Field id="delivery_format" label="How do you work?" error={errors.delivery_format}>
          <select {...props('delivery_format')}><option value="">Choose one</option><option value="online">Online</option><option value="in-person">In person</option><option value="both">Both</option></select>
        </Field>
      </div>
      <Field id="pricing" label="Pricing" hint="Or write &quot;to be discussed&quot;" error={errors.pricing}><input type="text" {...props('pricing')} maxLength={400} /></Field>
      <Field id="links" label="Website and social links" hint="Optional. Separate with spaces. Each should start with https://" error={errors.links}><input type="text" {...props('links')} maxLength={600} /></Field>
      <div className="field">
        <label className="check" htmlFor="consent">
          <input id="consent" type="checkbox" checked={v.consent} onChange={(e) => setV((s) => ({ ...s, consent: e.target.checked }))} aria-invalid={errors.consent ? 'true' : undefined} />
          <span>I understand my application will be reviewed before any profile is listed, and I can ask for my details to be deleted at any time. I have read the <a href="/privacy" target="_blank" rel="noopener">privacy notice</a>.</span>
        </label>
        {errors.consent ? <span className="error" role="alert">{errors.consent}</span> : null}
      </div>
      {/* spam trap: people never see or fill this */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="website_url">Leave this empty</label>
        <input id="website_url" name="website_url" type="text" tabIndex={-1} autoComplete="off" value={v.website_url} onChange={set('website_url')} />
      </div>
      {problem ? <p className="error" role="alert">{problem}</p> : null}
      <div className="row"><button type="submit" className="btn btn--honey btn--lg" disabled={busy}>{busy ? 'Sending\u2026' : 'Submit application'}</button></div>
    </form>
  );
}
