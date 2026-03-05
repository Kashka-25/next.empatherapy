export default function Label({ children }) {
  return (
    <p style={{
      fontFamily: 'Lato, sans-serif',
      fontSize: '0.68rem',
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: 'var(--amber)',
      marginBottom: '0.8rem',
      fontWeight: 400,
    }}>
      {children}
    </p>
  );
}
