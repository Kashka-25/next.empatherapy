import FadeIn from '@/components/ui/FadeIn';
import Label from '@/components/ui/Label';
import BookingForm from '@/components/booking/BookingForm';
import { therapists } from '@/data/therapists';

export const metadata = {
  title: 'Contact | Empatherapy',
};

export default function ContactPage() {
  const guideNames = therapists.map((t) => t.name);

  return (
    <div style={{ paddingTop: '72px' }}>
      {/* Header */}
      <div style={{ padding: '6rem 2rem 4.5rem', background: 'var(--green-deep)', textAlign: 'center' }}>
        <Label>Get in Touch</Label>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,5vw,3.8rem)', fontWeight: 300, color: 'var(--cream)', marginBottom: '1rem' }}>
          We'd love to hear from you
        </h1>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.93rem', color: 'rgba(247,243,237,0.58)', fontWeight: 300, maxWidth: '420px', margin: '0 auto', lineHeight: 1.85 }}>
          Whether you have questions, want to book, or just want to say hello — this is a safe space to reach out.
        </p>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '5.5rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '5rem' }}>

          {/* Info */}
          <FadeIn>
            <Label>Direct Contact</Label>
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: 'var(--green-deep)', marginBottom: '0.3rem' }}>Email</h4>
              <a href="mailto:hello@empatherapy.co" style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.88rem', color: 'var(--amber)', fontWeight: 300 }}>hello@empatherapy.co</a>
            </div>
            <div style={{ marginBottom: '2.5rem' }}>
              <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: 'var(--green-deep)', marginBottom: '0.3rem' }}>Location</h4>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.88rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.75 }}>Sydney, Australia<br />Sessions available online worldwide</p>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--linen)', borderLeft: '2px solid var(--amber)' }}>
              <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', color: 'var(--green-deep)', marginBottom: '0.5rem' }}>Are you a practitioner?</h4>
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.83rem', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.8 }}>
                We're building a home for values-aligned practitioners. Mention it in your message and we'll be in touch.
              </p>
            </div>
          </FadeIn>

          {/* Form */}
          <FadeIn delay={1}>
            <BookingForm guides={guideNames} />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
