import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { listAccounts } from '@/lib/accounts.mjs';
import { launchChecks, manualState, summarise, STATUS_LABEL } from '@/lib/launch.mjs';
import { tickLaunchItemAction } from '../actions';

export const metadata = { title: 'Launch checklist' };

const groupBy = (items) => items.reduce((m, i) => ((m[i.group] ??= []).push(i), m), {});

export default async function LaunchPage({ searchParams }) {
  await requireAdmin('accounts');
  const store = getStore();
  const { alchemists } = await loadContent(store);
  const accounts = store ? await listAccounts(store) : [];
  const auto = launchChecks({ accounts, alchemists });
  const manual = await manualState(store);
  const all = [...auto, ...manual];
  const sum = summarise(all);
  const groups = groupBy(all);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.2rem' }}>Launch checklist</h1>
        <p className="lede">What is still between here and the public. Most of it reads the real state of the site; the rest only a person can check, so you tick those yourself. Nothing here changes the site, and nothing goes public until you decide.</p>
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so items you tick cannot be remembered yet.</p> : null}
      <p className="admin-card"><strong>{sum.ready} of {sum.total}</strong> ready{sum.todo ? `, ${sum.todo} to do` : ''}.{sum.ok ? ' Everything on this list is ready.' : ''}</p>
      {Object.entries(groups).map(([group, items], gi) => (
        <section key={group} className="admin-card stack" aria-labelledby={`g${gi}`}>
          <h2 id={`g${gi}`} style={{ fontSize: '1.3rem' }}>{group}</h2>
          <ul className="stack" style={{ listStyle: 'none', padding: 0, gap: '0.9rem' }}>
            {items.map((c) => (
              <li key={c.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <span style={{ flex: 1 }}>
                  <strong>{c.title}</strong>
                  <br /><span style={{ color: 'var(--muted)' }}>{c.detail}{c.done_by ? ` Ticked by ${c.done_by} on ${new Date(c.done_at).toLocaleDateString('en-AU')}.` : ''}</span>
                </span>
                <span className="row" style={{ gap: '0.5rem' }}>
                  <span className={`tag${c.status === 'ready' ? ' tag--honey' : ''}`}>{c.status === 'ready' ? 'Ready' : STATUS_LABEL[c.status]}</span>
                  {c.group === 'Only a person can check' && store ? (
                    <form action={tickLaunchItemAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="done" value={c.status === 'ready' ? 'no' : 'yes'} />
                      <button type="submit" className="btn btn--soft btn--sm">{c.status === 'ready' ? 'Un-tick' : 'Tick'}</button>
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
