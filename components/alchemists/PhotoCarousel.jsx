'use client';
import { useRef, useState } from 'react';
import { photoUrl } from '@/lib/photos.mjs';

/**
 * "Meet them": up to five photos in a swipeable row. Works by scrolling and by the buttons, with no autoplay.
 * Each photo has its own description for screen readers, and the position is announced politely.
 */
export default function PhotoCarousel({ name, photos }) {
  const track = useRef(null);
  const [index, setIndex] = useState(0);
  const slides = () => Array.from(track.current?.children ?? []);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    let best = 0, gap = Infinity;
    slides().forEach((s, i) => { const d = Math.abs(s.offsetLeft - el.scrollLeft); if (d < gap) { gap = d; best = i; } });
    setIndex(best);
  };
  const go = (to) => {
    const target = slides()[Math.max(0, Math.min(photos.length - 1, to))];
    if (!target) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.current.scrollTo({ left: target.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div className="carousel" role="region" aria-roledescription="carousel" aria-label={`Photos of ${name}`}>
      <ul className="carousel__track" ref={track} onScroll={onScroll} tabIndex={0} aria-label={`Photos of ${name}. Scroll sideways to see more.`}>
        {photos.map((p, i) => (
          <li key={p.id} className="carousel__slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${photos.length}`}>
            <figure>
              <img src={photoUrl(p.id)} alt={p.alt} width={p.w} height={p.h} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
              {p.caption ? <figcaption>{p.caption}</figcaption> : null}
            </figure>
          </li>
        ))}
      </ul>
      <div className="carousel__bar">
        <button type="button" className="btn btn--soft btn--sm" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous photo">&larr;</button>
        <span className="carousel__count" aria-live="polite">Photo {index + 1} of {photos.length}</span>
        <button type="button" className="btn btn--soft btn--sm" onClick={() => go(index + 1)} disabled={index === photos.length - 1} aria-label="Next photo">&rarr;</button>
      </div>
    </div>
  );
}
