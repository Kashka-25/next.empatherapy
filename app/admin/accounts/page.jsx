import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { listAccounts, activeOwnerCount, ROLES, ROLE_LABEL, ROLE_HELP } from '@/lib/accounts.mjs';
import { createAccountAction, updateAccountAction } from '../actions';

export const metadata = { title: 'Accounts' };

export default async function AccountsPage({ searchParams }) {
  const me = await requireAdmin('accounts');
  const store = getStore();
  const accounts = store ? await listAccounts(store) : [];
  const owners = store ? await activeOwnerCount(store) : 0;
  const setup = me.id === 'bootstrap';

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>Accounts</h1>
        <p className="lede">Everyone who helps run Empatherapy has their own sign-in and a role that limits what they can reach.</p>
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so accounts cannot be created yet.</p> : null}

      {setup && store ? (
        <p className="demo-note" role="status">
          <strong>You are signed in with the one-time setup password.</strong> Create the first owner account below. The setup password stops working as soon as it exists, and you will be asked to sign in again with the new account.
        </p>
      ) : null}

      {accounts.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">Person</th><th scope="col">Role</th><th scope="col">Last signed in</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <th scope="row">{a.name}<br /><span style={{ fontWeight: 400, color: 'var(--muted)' }}>{a.email}</span></th>
                  <td>
                    <form action={updateAccountAction} className="row">
                      <input type="hidden" name="id" value={a.id} />
                      <label className="sr-only" htmlFor={`role-${a.id}`}>Role for {a.name}</label>
                      <select id={`role-${a.id}`} name="role" defaultValue={a.role}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                      <button type="submit" className="btn btn--soft btn--sm">Change</button>
                    </form>
                  </td>
                  <td>{a.last_login_at ? new Date(a.last_login_at).toLocaleDateString('en-AU') : 'Never'}</td>
                  <td>{a.active ? 'Active' : 'Deactivated'}</td>
                  <td>
                    <div className="stack" style={{ gap: '0.5rem' }}>
                      <form action={updateAccountAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="active" value={a.active ? 'no' : 'yes'} />
                        <button type="submit" className="btn btn--soft btn--sm" disabled={a.id === me.id}>{a.active ? 'Deactivate' : 'Reactivate'}</button>
                      </form>
                      <form action={updateAccountAction} className="row">
                        <input type="hidden" name="id" value={a.id} />
                        <label className="sr-only" htmlFor={`pw-${a.id}`}>New password for {a.name}</label>
                        <input id={`pw-${a.id}`} name="password" type="password" autoComplete="new-password" minLength={12} maxLength={200} placeholder="New password" required />
                        <button type="submit" className="btn btn--soft btn--sm">Reset</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : store ? <p style={{ color: 'var(--muted)' }}>No accounts yet.</p> : null}
      {accounts.length ? <p style={{ color: 'var(--muted)' }}>{owners} active {owners === 1 ? 'owner' : 'owners'}. There must always be at least one.</p> : null}

      {store ? (
        <section className="admin-card stack">
          <h2 style={{ fontSize: '1.4rem' }}>Add a person</h2>
          <form action={createAccountAction} className="stack" style={{ gap: '1rem' }}>
            <div className="filters__row">
              <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" required maxLength={80} /></div>
              <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={200} autoComplete="off" /></div>
            </div>
            <div className="filters__row">
              <div className="field">
                <label htmlFor="role">Role</label>
                <select id="role" name="role" defaultValue={setup ? 'owner' : 'editor'}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]} - {ROLE_HELP[r]}</option>)}</select>
              </div>
              <div className="field">
                <label htmlFor="password">Starting password</label>
                <span className="hint">At least 12 characters. Share it privately and ask them to change it under My account.</span>
                <input id="password" name="password" type="password" required minLength={12} maxLength={200} autoComplete="new-password" />
              </div>
            </div>
            <div><button type="submit" className="btn btn--honey">Create account</button></div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
