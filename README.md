# Empatherapy

> *Where humanity is our medicine.*

A holistic healing platform connecting clients with empathic guides for 1:1 sessions, psychedelic integration support, and emotional wellness.

---

## Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Framework  | Next.js 14 (App Router)            |
| Styling    | Inline CSS + CSS variables         |
| Fonts      | Cormorant Garamond + Lato (Google) |
| Hosting    | Vercel (recommended)               |
| DB (future)| Supabase                           |
| Payments   | Stripe (future)                    |
| Booking    | Cal.com / Calendly (future)        |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
empatherapy/
├── app/                    # Pages (Next.js App Router)
│   ├── page.jsx            # Homepage
│   ├── therapists/         # Therapist directory
│   │   └── [slug]/         # Individual profiles
│   ├── about/              # Philosophy page
│   ├── fund/               # Community Healing Fund
│   ├── subscribe/          # Subscription (placeholder)
│   ├── contact/            # Contact form
│   └── api/                # API routes
│       ├── therapists/
│       └── bookings/
│
├── components/
│   ├── ui/                 # Button, Card, FadeIn, Label, etc.
│   ├── layout/             # Navbar, Footer
│   ├── therapists/         # TherapistCard, TherapistProfile, Tags
│   ├── booking/            # BookingButton, BookingForm
│   └── fund/               # DonationCard
│
├── data/
│   └── therapists.js       # Therapist directory data
│
├── lib/
│   ├── utils.js            # Helper functions
│   ├── stripe.js           # Stripe placeholder
│   └── supabase.js         # Supabase placeholder
│
└── styles/
    └── variables.css       # CSS custom properties
```

---

## Adding a New Therapist

Edit `data/therapists.js` and add a new object to the `therapists` array:

```js
{
  name: 'Jane Smith',
  slug: 'jane-smith',
  title: 'Somatic Guide',
  initials: 'J',
  credentials: ['Qualification 1'],
  shortBio: 'Short intro for directory card.',
  bio: ['Paragraph 1', 'Paragraph 2'],
  approach: 'Approach quote.',
  modalities: ['Somatic work', 'Breathwork'],
  specialties: ['Trauma', 'Somatic'],
  areas: ['Area 1', 'Area 2'],
  sessions: [...],
  bookingEmail: 'hello@empatherapy.co',
  available: true,
}
```

The profile page at `/therapists/jane-smith` is generated automatically.

---

## Future Integrations

- **Stripe** — subscription plans + session payments (`lib/stripe.js`)
- **Supabase** — client database, bookings, therapist onboarding (`lib/supabase.js`)
- **Cal.com / Calendly** — replace BookingButton email link with scheduling embed
- **Therapist Dashboard** — `/dashboard/therapist` for session management

---

## Deploy to Vercel

```bash
vercel deploy
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`

---

© 2026 Empatherapy
