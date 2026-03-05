'use client';
import { useEffect, useRef } from 'react';

export default function FadeIn({ children, delay = 0, style = {}, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          obs.unobserve(el);
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`fade-in ${delay ? `delay-${delay}` : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
