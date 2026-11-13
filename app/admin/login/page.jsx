import { redirect, notFound } from 'next/navigation';
import { adminConfigured, isAdmin } from '@/lib/admin-auth.mjs';
import { login } from '../actions';

export const metadata = { title: 'Sign in' };

const MESSAGES = {
  bad: 'That password did not work.',
  wait: 'Too many attempts. Please wait a few minutes and try again.',
  config: 'Admin is not set up yet.',
};

export default async function LoginPage({ searchParams }) {
  const configured = adminConfigured();
  if (!configured && process.env.NODE_ENV === 'production') notFound();
  if (await isAdmin()) redirect('/admin');
  const error = MESSAGES[searchParams?.e];

  return (
    <div className="admin-card admin-card--narrow">
      <h1 style={{ fontSize: '2rem' }}>Sign in</h1>
      {!configured ? (
        <div className="stack">
          <p className="demo-note"><strong>Admin is switched off.</strong> It stays off until a password and secret are set, so there is no default login.</p>
          <p>To set it up locally, run <code>npm run admin:hash</code>, put the two lines it prints into <code>.env.local</code> (never commit that file), then restart the server. Details are in <code>docs/ADMIN.md</code>.</p>
        </div>
      ) : (
        <form action={login} className="stack" style={{ gap: '1.2rem' }}>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} autoFocus />
          </div>
          <button type="submit" className="btn btn--honey">Sign in</button>
        </form>
      )}
    </div>
  );
}
