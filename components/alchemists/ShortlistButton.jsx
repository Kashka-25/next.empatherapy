'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SHORTLIST_KEY, MAX_SHORTLIST, parseShortlist, serialiseShortlist, toggleSlug } from '@/lib/shortlist.mjs';

const read = () => { try { return parseShortlist(window.localStorage.getItem(SHORTLIST_KEY)); } catch { return null; } };
const write = (list) => { try { window.localStorage.setItem(SHORTLIST_KEY, serialiseShortlist(list)); return true; } catch { return false; } };

/**
 * "Save to my shortlist". Kept only in this browser: nothing is sent to Empatherapy and there is no account.
 * If the browser will not store it (private window, blocked site data), the button says so rather than pretending.
 */
export default function ShortlistButton({ slug, name }) {
  const [state, setState] = useState({ ready: false, saved: false, count: 0, usable: true, full: false });

  useEffect(() => {
    const list = read();
    setState(list === null ? { ready: true, saved: false, count: 0, usable: false, full: false } : { ready: true, saved: list.includes(slug), count: list.length, usable: true, full: false });
  }, [slug]);

  const click = () => {
    const list = read() ?? [];
    const r = toggleSlug(list, slug);
    if (r.reason === 'full') { setState((s) => ({ ...s, full: true })); return; }
    const ok = write(r.list);
    setState({ ready: true, saved: ok && r.saved, count: ok ? r.list.length : list.length, usable: ok, full: false });
  };

  if (!state.ready) return <div className="shortlist" style={{ minHeight: '3.2rem' }} aria-hidden="true" />;
  return (
    <div className="shortlist stack" style={{ gap: '0.4rem' }}>
      <div className="row" style={{ gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className={`btn ${state.saved ? 'btn--honey' : 'btn--soft'} btn--sm`} aria-pressed={state.saved} onClick={click} disabled={!state.usable}>
          {state.saved ? `Saved to your shortlist` : `Save ${name.split(' ')[0]} to my shortlist`}
        </button>
        {state.count ? <Link href="/shortlist" className="link-arrow">See my shortlist ({state.count})</Link> : null}
      </div>
      <p className="small" role="status" aria-live="polite" style={{ color: 'var(--muted)' }}>
        {!state.usable ? 'Your browser is not letting this site keep a shortlist (a private window can do this).'
          : state.full ? `Your shortlist is full (${MAX_SHORTLIST}). Remove one to add another.`
          : 'Kept only in this browser. We never see it.'}
      </p>
    </div>
  );
}
