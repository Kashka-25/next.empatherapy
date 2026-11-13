'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AlchemistCard from './AlchemistCard';
import { SHORTLIST_KEY, parseShortlist, serialiseShortlist, keepKnown } from '@/lib/shortlist.mjs';

const read = () => { try { return parseShortlist(window.localStorage.getItem(SHORTLIST_KEY)); } catch { return null; } };
const write = (list) => { try { window.localStorage.setItem(SHORTLIST_KEY, serialiseShortlist(list)); } catch { /* nothing to do: the list just will not persist */ } };

/** The Seeker's saved Alchemists, read from this browser only. */
export default function ShortlistView({ alchemists, modalities }) {
  const [slugs, setSlugs] = useState(null); // null until read
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const list = read();
    if (list === null) { setBlocked(true); setSlugs([]); return; }
    const known = keepKnown(list, alchemists.map((a) => a.slug));
    if (known.length !== list.length) write(known); // tidy away profiles that are gone
    setSlugs(known);
  }, [alchemists]);

  const remove = (slug) => { const next = slugs.filter((s) => s !== slug); write(next); setSlugs(next); };
  const clear = () => { write([]); setSlugs([]); };

  if (slugs === null) return <p style={{ color: 'var(--muted)' }}>Looking for your shortlist&hellip;</p>;
  if (blocked) return <p className="demo-note">Your browser is not letting this site keep a shortlist (a private window can do this), so there is nothing to show. You can still browse everyone in <Link href="/alchemists">Discover Alchemists</Link>.</p>;
  if (!slugs.length) return (
    <div className="stack">
      <p>You have not saved anyone yet. On any Alchemist&rsquo;s page, choose &ldquo;Save to my shortlist&rdquo; and they will appear here.</p>
      <p><Link href="/alchemists" className="btn btn--honey">Discover Alchemists</Link></p>
    </div>
  );
  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <ul className="grid-cards" style={{ listStyle: "none", padding: 0 }}>
        {slugs.map((slug) => {
          const a = alchemists.find((x) => x.slug === slug);
          return (
            <li key={slug} className="stack" style={{ gap: '0.6rem' }}>
              <AlchemistCard alchemist={a} modalities={modalities} />
              <button type="button" className="btn btn--soft btn--sm" onClick={() => remove(slug)} aria-label={`Remove ${a.name} from my shortlist`}>Remove</button>
            </li>
          );
        })}
      </ul>
      <p><button type="button" className="btn btn--soft btn--sm" onClick={clear}>Clear my shortlist</button></p>
    </div>
  );
}
