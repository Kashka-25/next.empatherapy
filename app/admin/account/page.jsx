import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { ROLE_LABEL, ROLE_HELP, pendingTotp } from '@/lib/accounts.mjs';
import { otpauthUri, groupSecret } from '@/lib/totp.mjs';
import TwoStepConfirm from '@/components/admin/TwoStepSetup';
import { changeOwnPasswordAction, startTwoStepAction, cancelTwoStepAction, confirmTwoStepAction, disableTwoStepAction } from '../actions';

export const metadata = { title: 'My account' };

export default async function MyAccountPage({ searchParams }) {
  const me = await requireAdmin();
  if (me.id === 'bootstrap') redirect('/admin/accounts');
  const store = getStore();
  const pending = !me.two_step && store ? await pendingTotp(store, me.id) : null;

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>My account</h1>
        <p className="lede">{me.name}, {me.email}. Role: <strong>{ROLE_LABEL[me.role]}</strong>. {ROLE_HELP[me.role]}</p>
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Your password has been changed.</p> : null}
      {searchParams?.off ? <p className="admin-flash" role="status">Two-step sign-in is off.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}

      <section className="admin-card stack" style={{ maxWidth: '36rem' }} aria-labelledby="twostep-h">
        <h2 id="twostep-h" style={{ fontSize: '1.4rem' }}>Two-step sign-in</h2>
        {me.two_step ? (
          <>
            <p>It is <strong>on</strong>. Signing in needs your password and a code from your authenticator app.</p>
            <form action={disableTwoStepAction} className="stack" style={{ gap: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem' }}>Turn it off</h3>
              <div className="field"><label htmlFor="off-password">Your password</label><input id="off-password" name="password" type="password" required autoComplete="current-password" maxLength={200} /></div>
              <div><button type="submit" className="btn btn--soft btn--sm" style={{ borderColor: '#9B3B22', color: '#9B3B22' }}>Turn off two-step sign-in</button></div>
            </form>
          </>
        ) : pending ? (
          <div className="stack" style={{ gap: '1.2rem' }}>
            <ol className="steps">
              <li>Open an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy, 1Password and others all work).</li>
              <li>Choose to add an account by <strong>entering a key</strong>, and type this in. Name it Empatherapy.
                <p className="secret-key" aria-label="Setup key"><code>{groupSecret(pending)}</code></p>
                <p className="small" style={{ color: 'var(--muted)' }}>On a phone, <a href={otpauthUri({ secret: pending, account: me.email })}>this link</a> may open your app and add it for you. Keep this key private.</p>
              </li>
              <li>Type the 6-digit code the app now shows.</li>
            </ol>
            <TwoStepConfirm action={confirmTwoStepAction} />
            <form action={cancelTwoStepAction}><button type="submit" className="btn btn--soft btn--sm">Cancel setup</button></form>
          </div>
        ) : (
          <>
            <p>Two-step sign-in adds a code from your phone to your password, so a stolen or guessed password is not enough to get in. It is <strong>off</strong> for your account.</p>
            <form action={startTwoStepAction}><button type="submit" className="btn btn--honey">Set up two-step sign-in</button></form>
          </>
        )}
      </section>

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
