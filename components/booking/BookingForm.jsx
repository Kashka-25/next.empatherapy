'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { buildMailto } from '@/lib/utils';
import { DEMO } from '@/lib/demo';

const inputStyle = {
  width: '100%',
  padding: '0.85rem 1rem',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.88rem',
  color: 'var(--charcoal)',
  fontWeight: 300,
  outline: 'none',
  borderRadius: '2px',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.68rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: '0.5rem',
};

export default function BookingForm({ guides = ['Cassidy Dugan'] }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', guide: '', message: '' });
  const [sent, setSent] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.message) return;
    // Demo mode: nothing is sent anywhere.
    if (!DEMO) window.location.href = buildMailto(form);
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.2rem', color: 'var(--green-deep)', marginBottom: '0.8rem' }}>{DEMO ? 'This is a preview' : 'Thank you'}</p>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.88rem', color: 'var(--muted)', fontWeight: 300 }}>
          {DEMO ? 'Nothing was sent. In the finished Empatherapy, your message would reach the Alchemist you chose.' : "We'll be in touch soon."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
      {[
        { key: 'name', label: 'Name', type: 'text', placeholder: 'Your name' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
        { key: 'subject', label: 'Subject', type: 'text', placeholder: 'What is this about?' },
      ].map(({ key, label, type, placeholder }) => (
        <div key={key}>
          <label style={labelStyle}>{label}</label>
          <input type={type} placeholder={placeholder} value={form[key]} onChange={set(key)}
            onFocus={(e) => (e.target.style.borderColor = 'var(--green-soft)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            style={inputStyle} />
        </div>
      ))}

      <div>
        <label style={labelStyle}>Interested in a session with</label>
        <select value={form.guide} onChange={set('guide')}
          style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
          <option value="">{DEMO ? 'Select an Alchemist (optional)' : 'Select a guide (optional)'}</option>
          {guides.map((g) => <option key={g} value={g}>{g}</option>)}
          <option value="Not sure yet">Not sure yet</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Message</label>
        <textarea rows={5} placeholder="Tell us what's on your mind..."
          value={form.message} onChange={set('message')}
          onFocus={(e) => (e.target.style.borderColor = 'var(--green-soft)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      <Button onClick={handleSubmit}>{DEMO ? 'Send (preview only)' : 'Send Message'}</Button>
    </div>
  );
}
