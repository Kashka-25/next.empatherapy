'use client';
import { useState } from 'react';
import { validateEnquiry } from '@/lib/enquiries.mjs';
import { detectCrisis } from '@/lib/matching/index.mjs';
import { SUPPORT_MESSAGE } from '@/lib/matching/vocabulary.mjs';

const blank = { website_url: '', name: '', email: '', message: '', consent: false };

/**
 * "Reach out": a Seeker asks to be put in touch with an Alchemist. Says plainly who reads the message and how long it
 * is kept, and only sends after the consent box is ticked. If the words suggest someone is struggling, support
 * information appears straight away (and again after sending), and the message is never held back.
 */
export default function EnquiryForm({ alchemistId, firstName, fallbackEmail }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(blank);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null); // null | { kind: 'sent' | 'preview', support }
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const hardTime = detectCrisis(v.message);
  const err = (k) => (errors[k] ? <span className="error" id={`enq-${k}-err`} role="alert">{errors[k]}</span> : null);
  const aria = (k) => ({ 'aria-invalid': errors[k] ? 'true' : undefined, 'aria-describedby': errors[k] ? `enq-${k}-err` : undefined });

  const submit = async (e) => {
    e.preventDefault();
    setProblem('');
    const r = validateEnquiry(v);
    setErrors(r.errors);
    if (!r.valid) { document.getElementById(`enq-${Object.keys(r.errors)[0]}`)?.focus(); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...r.data, consent: true, alchemist_id: alchemistId, website_url: v.website_url }) });
      if (res.status === 201) { const body = await res.json().catch(() => ({})); setDone({ kind: 'sent', support: Boolean(body.support) || hardTime }); }
      else if (res.status === 503) setDone({ kind: 'preview', support: hardTime });
      else if (res.status === 429) setProblem('You have sent a few messages already. Please try again later.');
      else if (res.status === 404) setProblem(`${firstName} is not taking enquiries through the site right now.`);
      else if (res.status === 400) { const body = await res.json().catch(() => ({})); setErrors(body.errors || {}); setProblem('Some answers need another look.'); }
      else setProblem('Something went wrong on our side. Please try again in a moment.');
    } catch {
      setProblem('We could not reach the server. Please check your connection and try again.');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="stack" role="status" style={{ gap: '0.8rem' }}>
        {done.kind === 'sent' ? (
          <>
            <h3>Your message is on its way</h3>
            <p>{firstName} will reply to you by email. It can take a few days. A confirmation is on its way to your inbox too.</p>
          </>
        ) : (
          <>
            <h3>Thank you, your message is ready</h3>
            <p><strong>This form is a preview, so nothing has been sent or saved.</strong> Enquiries open when Empatherapy launches.{fallbackEmail ? <> Until then you can email {firstName} directly at <a className="link-arrow" href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a>.</> : null}</p>
          </>
        )}
        {done.support ? <p className="demo-note">{SUPPORT_MESSAGE}</p> : null}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="stack" style={{ gap: '0.6rem' }}>
        <button type="button" className="btn btn--honey btn--lg" onClick={() => setOpen(true)} aria-expanded="false">Reach out to {firstName}</button>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>Send a short message and {firstName} will reply by email. Online booking is not available yet.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="stack" style={{ gap: '1rem' }} aria-label={`Message ${firstName}`}>
      <h3 style={{ fontSize: '1.2rem' }}>Reach out to {firstName}</h3>
      {problem ? <p className="error" role="alert">{problem}</p> : null}
      <div className="field">
        <label htmlFor="enq-name">Your name</label>
        <input id="enq-name" type="text" autoComplete="name" value={v.name} onChange={set('name')} maxLength={80} {...aria('name')} />
        {err('name')}
      </div>
      <div className="field">
        <label htmlFor="enq-email">Your email</label>
        <span className="hint">Only {firstName} and the Empatherapy team will see it.</span>
        <input id="enq-email" type="email" autoComplete="email" value={v.email} onChange={set('email')} maxLength={200} {...aria('email')} />
        {err('email')}
      </div>
      <div className="field">
        <label htmlFor="enq-message">Your message</label>
        <span className="hint">What is on your mind, and what you are hoping for. A few sentences is plenty.</span>
        <textarea id="enq-message" value={v.message} onChange={set('message')} maxLength={1500} style={{ minHeight: '8rem' }} {...aria('message')} />
        {err('message')}
      </div>
      {hardTime ? <p className="demo-note" role="status">{SUPPORT_MESSAGE}</p> : null}
      {/* spam trap: people never see or fill this */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="enq-website">Leave this empty</label>
        <input id="enq-website" type="text" tabIndex={-1} autoComplete="off" value={v.website_url} onChange={set('website_url')} />
      </div>
      <div className="field">
        <label className="check" htmlFor="enq-consent">
          <input id="enq-consent" type="checkbox" checked={v.consent} onChange={(e) => setV((s) => ({ ...s, consent: e.target.checked }))} {...aria('consent')} />
          <span>I am happy for Empatherapy to pass this message to {firstName}. Empatherapy&rsquo;s small team can also read it, only to keep things safe, and it is deleted after six months. <a href="/privacy" target="_blank" rel="noopener">Privacy notice</a>.</span>
        </label>
        {err('consent')}
      </div>
      <div className="row">
        <button type="submit" className="btn btn--honey" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
        <button type="button" className="btn btn--soft" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>Empatherapy is not crisis care. In an emergency call 000, or Lifeline on 13 11 14.</p>
    </form>
  );
}
