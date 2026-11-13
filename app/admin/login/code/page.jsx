import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { PENDING_COOKIE, pendingSecret, readSession } from '@/lib/session.mjs';
import { isAdmin } from '@/lib/admin-auth.mjs';
import { secondStepAction } from '../../actions';

export const metadata = { title: 'Enter your code' };

export default async function CodePage({ searchParams }) {
  if (await isAdmin()) redirect('/admin');
  const secret = process.env.ADMIN_SESSION_SECRET;
  const who = secret ? await readSession(cookies().get(PENDING_COOKIE)?.value, pendingSecret(secret)) : null;
  if (!who) redirect('/admin/login?e=expired');

  return (
    <div className="admin-card admin-card--narrow">
      <h1 style={{ fontSize: '2rem' }}>One more step</h1>
      <form action={secondStepAction} className="stack" style={{ gap: '1.2rem' }}>
        {searchParams?.e === 'bad' ? <p className="error" role="alert">That code did not work. Check the time on your phone and try the newest code.</p> : null}
        <div className="field">
          <label htmlFor="code">Code from your authenticator app</label>
          <span className="hint" id="code-hint">Or one of your recovery codes, if you have lost your phone.</span>
          <input id="code" name="code" autoComplete="one-time-code" required maxLength={20} autoFocus aria-describedby="code-hint" />
        </div>
        <button type="submit" className="btn btn--honey">Sign in</button>
      </form>
      <p><Link href="/admin/login" className="link-arrow">Start again</Link></p>
    </div>
  );
}
