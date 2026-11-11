'use client';
import { useEffect, useRef } from 'react';

/**
 * A gentle entrance for content below the fold.
 * Content is visible by default (server render, no script, reduced motion, print). Only after the page loads,
 * things that start below the fold are hidden and then eased in as they near the screen. A timer reveals anything
 * the observer misses, so nothing can stay hidden.
 */
export default function FadeIn({ children, delay = 0, style = {}, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) return; // already on screen

    el.classList.add('pre');
    const reveal = () => el.classList.add('visible');
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { reveal(); obs.disconnect(); } }, { threshold: 0, rootMargin: '0px 0px -4% 0px' });
    obs.observe(el);
    const safety = setTimeout(reveal, 4000);
    return () => { obs.disconnect(); clearTimeout(safety); };
  }, []);

  return (
    <div ref={ref} className={`fade-in ${delay ? `delay-${delay}` : ''} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
