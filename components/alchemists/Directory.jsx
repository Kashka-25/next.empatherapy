'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import AlchemistCard from './AlchemistCard';
import { filterAlchemists, curatedOrder } from '@/lib/directory.mjs';

const FORMATS = [{ v: '', l: 'Any format' }, { v: 'online', l: 'Online' }, { v: 'in-person', l: 'In person' }, { v: 'hybrid', l: 'Both online and in person' }];
const PRICES = [{ v: '', l: 'Any price' }, { v: '90', l: 'Up to $90' }, { v: '150', l: 'Up to $150' }, { v: '200', l: 'Up to $200' }];

export default function Directory({ alchemists, modalities, locations }) {
  const [f, setF] = useState({ query: '', modality: '', format: '', location: '', maxPrice: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const results = useMemo(() => curatedOrder(filterAlchemists(alchemists, f, modalities)), [alchemists, modalities, f]);
  const active = Object.values(f).some(Boolean);

  return (
    <div>
      <form className="filters" role="search" aria-label="Search Alchemists" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="q" className="filter-label">Search by name, practice or what you are curious about</label>
          <input id="q" type="search" value={f.query} onChange={set('query')} placeholder="For example: breath, grief, rest, nature" />
        </div>
        <div className="filters__row">
          <div><label htmlFor="mod" className="filter-label">Practice</label>
            <select id="mod" value={f.modality} onChange={set('modality')}>
              <option value="">All practices</option>
              {modalities.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select></div>
          <div><label htmlFor="fmt" className="filter-label">Format</label>
            <select id="fmt" value={f.format} onChange={set('format')}>{FORMATS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
          <div><label htmlFor="loc" className="filter-label">Location</label>
            <select id="loc" value={f.location} onChange={set('location')}>
              <option value="">Anywhere</option>
              {locations.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select></div>
          <div><label htmlFor="price" className="filter-label">Price from</label>
            <select id="price" value={f.maxPrice} onChange={set('maxPrice')}>{PRICES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
        </div>
      </form>

      <div className="results-bar" aria-live="polite">
        <span>{results.length === 1 ? '1 Alchemist' : `${results.length} Alchemists`}{active ? ' match' : ''}</span>
        {active ? <button type="button" className="btn btn--soft btn--sm" onClick={() => setF({ query: '', modality: '', format: '', location: '', maxPrice: '' })}>Clear filters</button> : null}
      </div>

      {results.length ? (
        <div className="grid-cards">{results.map((a) => <AlchemistCard key={a.id} alchemist={a} />)}</div>
      ) : (
        <div className="empty">
          <h3>No Alchemists match just yet</h3>
          <p>Try fewer filters, or tell us what you&rsquo;re hoping to find and we&rsquo;ll suggest some paths.</p>
          <div className="row">
            <button type="button" className="btn btn--soft" onClick={() => setF({ query: '', modality: '', format: '', location: '', maxPrice: '' })}>Clear filters</button>
            <Link className="btn btn--honey" href="/discover">Begin your discovery</Link>
          </div>
        </div>
      )}
    </div>
  );
}
