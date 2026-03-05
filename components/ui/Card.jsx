export default function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}
    onMouseEnter={onClick ? (e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.08)';
    } : undefined}
    onMouseLeave={onClick ? (e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    } : undefined}>
      {children}
    </div>
  );
}
