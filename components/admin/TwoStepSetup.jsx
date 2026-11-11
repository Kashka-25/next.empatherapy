'use client';
import { useFormState } from 'react-dom';

/**
 * The last step of turning on two-step sign-in: type the code your app shows. On success the recovery codes are
 * shown once, here, and never again.
 */
export default function TwoStepConfirm({ action }) {
  const [state, formAction] = useFormState(action, { error: null, codes: null });
  const s = state ?? { error: null, codes: null };

  if (s.codes) {
    return (
      <div className="stack" style={{ gap: '1rem' }}>
        <p className="admin-flash" role="status">Two-step sign-in is on.</p>
        <h3 style={{ fontSize: '1.15rem' }}>Save your recovery codes now</h3>
        <p>If you lose your phone, each of these signs you in once. They are shown only this one time, so keep them somewhere safe, such as a password manager.</p>
        <ul className="recovery-codes" aria-label="Recovery codes">
          {s.codes.map((c) => <li key={c}><code>{c}</code></li>)}
        </ul>
        <p style={{ color: 'var(--muted)' }}>When you have saved them, you can leave this page.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="stack" style={{ gap: '1rem' }}>
      {s.error ? <p className="error" role="alert">{s.error}</p> : null}
      <div className="field">
        <label htmlFor="code">Code from your app</label>
        <span className="hint">The 6 digits it shows now.</span>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required style={{ maxWidth: '12rem', letterSpacing: '0.2em' }} />
      </div>
      <div><button type="submit" className="btn btn--honey">Turn on two-step sign-in</button></div>
    </form>
  );
}
