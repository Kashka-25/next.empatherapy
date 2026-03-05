export default function Section({ children, bg = 'var(--cream)', style = {}, center = false }) {
  return (
    <section style={{
      padding: 'var(--section-pad)',
      background: bg,
      ...(center ? { textAlign: 'center' } : {}),
      ...style,
    }}>
      {children}
    </section>
  );
}
