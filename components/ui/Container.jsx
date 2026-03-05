export default function Container({ children, narrow = false, style = {} }) {
  return (
    <div style={{
      maxWidth: narrow ? 'var(--max-w-narrow)' : 'var(--max-w)',
      margin: '0 auto',
      padding: '0 2rem',
      ...style,
    }}>
      {children}
    </div>
  );
}
