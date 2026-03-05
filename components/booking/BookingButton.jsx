import Button from '@/components/ui/Button';

/**
 * BookingButton — for MVP, opens email.
 * Replace href with Calendly URL or /book route when scheduling system is live.
 */
export default function BookingButton({
  label = 'Book a Session',
  email = 'hello@empatherapy.co',
  subject = 'Session Booking',
  variant = 'amber',
  size = 'md',
}) {
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  return <Button href={href} variant={variant} size={size}>{label}</Button>;
}
