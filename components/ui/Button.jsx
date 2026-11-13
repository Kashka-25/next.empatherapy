import Link from 'next/link';

/**
 * variant: 'honey' | 'outline' | 'soft' | 'lantern'
 * size:    'sm' | 'md' | 'lg'
 * Renders a link when `href` is given, otherwise a button.
 */
export default function Button({ children, href, variant = 'honey', size = 'md', className = '', ...rest }) {
  const cls = `btn btn--${variant}${size !== 'md' ? ` btn--${size}` : ''}${className ? ` ${className}` : ''}`;
  if (href) {
    const external = /^(https?:|mailto:)/.test(href);
    return external
      ? <a className={cls} href={href} {...rest}>{children}</a>
      : <Link className={cls} href={href} {...rest}>{children}</Link>;
  }
  return <button type="button" className={cls} {...rest}>{children}</button>;
}
