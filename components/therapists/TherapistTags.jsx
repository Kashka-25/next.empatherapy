export default function TherapistTags({ tags = [] }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      {tags.map((tag) => (
        <span key={tag} style={{
          display: 'inline-block',
          padding: '0.22rem 0.7rem',
          background: 'var(--linen)',
          border: '1px solid var(--border)',
          fontSize: '0.72rem',
          letterSpacing: '0.05em',
          color: 'var(--muted)',
          fontFamily: 'Lato, sans-serif',
          borderRadius: '2px',
        }}>
          {tag}
        </span>
      ))}
    </div>
  );
}
