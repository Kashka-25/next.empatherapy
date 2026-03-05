'use client';
import { useState } from 'react';

/**
 * variant: 'solid' | 'amber' | 'outline' | 'ghost' | 'amber_outline'
 * size:    'sm' | 'md' | 'lg'
 */
export default function Button({ children, onClick, variant = 'solid', size = 'md', href, style = {} }) {
  const [hov, setHov] = useState(false);

  const pad = { lg: '1rem 2.8rem', md: '0.8rem 2rem', sm: '0.55rem 1.3rem' }[size];
  const fs = { lg: '0.88rem', md: '0.78rem', sm: '0.72rem' }[size];

  const variants = {
    solid:        { background: hov ? '#2D5241' : '#1E3A2F', color: '#F7F3ED', border: 'none' },
    amber:        { background: hov ? '#C98C5A' : '#B87C4C', color: '#fff',    border: 'none' },
    outline:      { background: hov ? '#1E3A2F' : 'transparent', color: hov ? '#F7F3ED' : '#1E3A2F', border: '1px solid #1E3A2F' },
    ghost:        { background: hov ? 'rgba(247,243,237,0.15)' : 'transparent', color: 'rgba(247,243,237,0.85)', border: '1px solid rgba(247,243,237,0.35)' },
    amber_outline:{ background: hov ? '#B87C4C' : 'transparent', color: hov ? '#fff' : '#B87C4C', border: '1px solid #B87C4C' },
  };

  const base = {
    padding: pad,
    fontFamily: 'Lato, sans-serif',
    fontSize: fs,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 400,
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-block',
    ...variants[variant],
    ...style,
  };

  if (href) {
    return (
      <a href={href} style={base}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} style={base}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      {children}
    </button>
  );
}
