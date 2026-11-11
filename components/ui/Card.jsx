export default function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return <Tag className={`card ${className}`} {...rest}>{children}</Tag>;
}
