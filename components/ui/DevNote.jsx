/** A reminder that only shows while developing. Never rendered in production builds. */
export default function DevNote({ children }) {
  if (process.env.NODE_ENV === 'production') return null;
  return <p className="dev-note">Dev note: {children}</p>;
}
