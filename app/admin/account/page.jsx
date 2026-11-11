import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { ROLE_LABEL, ROLE_HELP } from '@/lib/accounts.mjs';
import { changeOwnPasswordAction } from '../actions';

export const metadata = { title: 'My account' };

export default async function MyAccountPage({ searchParams }) {
  const me = await requireAdmin();
  if (me.id === 'bootstrap') redirect('/admin/accounts');

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>My account</h1>
        <p className="lede">{me.name}, {me.email}. Role: <strong>{ROLE_LABEL[me.role]}</strong>. {ROLE_HELP[me.role]}</p>
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Your password has been changed.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}

      <section className="admin-card stack" style={{ maxWidth: '32rem' }}>
        <h2 style={{ fontSize: '1.4rem' }}>Change my password</h2>
        <form action={changeOwnPasswordAction} className="stack" style={{ gap: '1rem' }}>
          <div className="field"><label htmlFor="current_password">Current password</label><input id="current_password" name="current_password" type="password" required autoComplete="current-password" maxLength={200} /></div>
          <div className="field"><label htmlFor="new_password">New password</label><span className="hint">At least 12 characters.</span><input id="new_password" name="new_password" type="password" required minLength={12} autoComplete="new-password" maxLength={200} /></div>
          <div className="field"><label htmlFor="confirm_password">New password again</label><input id="confirm_password" name="confirm_password" type="password" required minLength={12} autoComplete="new-password" maxLength={200} /></div>
          <div><button type="submit" className="btn btn--honey">Change password</button></div>
        </form>
      </section>
    </div>
  );
}
