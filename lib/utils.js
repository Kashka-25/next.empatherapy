/**
 * Format a currency value for display
 */
export function formatCurrency(amount, currency = 'AUD') {
  return `$${amount} ${currency}`;
}

/**
 * Build mailto href from contact form data
 */
export function buildMailto({ name, email, subject, guide, message }) {
  const body = `Name: ${name}\nEmail: ${email}\nGuide interest: ${guide || 'Not specified'}\n\n${message}`;
  return `mailto:hello@empatherapy.co?subject=${encodeURIComponent(subject || 'Empatherapy Enquiry')}&body=${encodeURIComponent(body)}`;
}

/**
 * Generate a slug from a string
 */
export function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Community fund contribution (10%)
 */
export function fundContribution(sessionPrice) {
  return Math.round(sessionPrice * 0.1);
}
