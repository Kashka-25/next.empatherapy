/**
 * Validation and sanitising for the "Become an Alchemist" application.
 * Used by the form today, and meant to be reused by the server route when applications are stored.
 */

export const DELIVERY_OPTIONS = ['online', 'in-person', 'both'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Strip control characters and tags' angle brackets, trim, and cap length. */
export function clean(value, max = 2000) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

const isUrl = (s) => {
  try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
};

/** @returns {{ valid: boolean, errors: Record<string,string>, data: Record<string,any> }} */
export function validateApplication(raw = {}) {
  const data = {
    name: clean(raw.name, 120),
    email: clean(raw.email, 200),
    introduction: clean(raw.introduction, 1200),
    personal_story: clean(raw.personal_story, 4000),
    modalities: clean(raw.modalities, 400),
    qualifications: clean(raw.qualifications, 1500),
    experience: clean(raw.experience, 1500),
    location: clean(raw.location, 160),
    delivery_format: clean(raw.delivery_format, 20),
    pricing: clean(raw.pricing, 400),
    links: clean(raw.links, 600),
    consent: raw.consent === true,
  };
  const errors = {};
  if (!data.name) errors.name = 'Please tell us your name.';
  if (!data.email) errors.email = 'Please add an email so we can reply.';
  else if (!EMAIL.test(data.email)) errors.email = 'That email address does not look quite right.';
  if (data.introduction.length < 40) errors.introduction = 'A few more words please: at least 40 characters.';
  if (data.personal_story.length < 80) errors.personal_story = 'Your story is what makes your profile come alive. Please share a little more (at least 80 characters).';
  if (!data.modalities) errors.modalities = 'Which practices do you offer?';
  if (!data.qualifications) errors.qualifications = 'Tell us about your training, or write "none yet" and describe your experience instead.';
  if (!data.location) errors.location = 'Where are you based?';
  if (!DELIVERY_OPTIONS.includes(data.delivery_format)) errors.delivery_format = 'Please choose how you work.';
  if (!data.pricing) errors.pricing = 'Please share your pricing, or "to be discussed".';
  if (data.links) {
    const parts = data.links.split(/[\s,]+/).filter(Boolean);
    if (parts.some((p) => !isUrl(p))) errors.links = 'Links should start with https://';
  }
  if (!data.consent) errors.consent = 'Please agree so we can review your application.';
  return { valid: Object.keys(errors).length === 0, errors, data };
}
