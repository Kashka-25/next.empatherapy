# next.empatherapy

The Next.js rebuild of **Empatherapy** ("Where humanity is our medicine"): a holistic
healing platform connecting people with empathic guides for 1:1 sessions, psychedelic
integration support and emotional wellness. Founder: Cassidy Dugan (GitHub Kashka-25).

- Repo: Kashka-25/next.empatherapy · Local: `C:\Users\cassi\Projects\Empatherapy\next.empatherapy`
- Preview: https://next-empatherapy.vercel.app (Vercel)
- Run: `npm install`, then `npm run dev` → http://localhost:3000
- Stack: Next.js 14.2.3 (App Router), React 18, plain JSX (`jsconfig.json` sets the `@/` alias),
  inline styles + CSS variables (`styles/variables.css`), Cormorant Garamond + Lato.

## Decisions (Cassidy, 8 Nov 2026)
- **This repo now leads Empatherapy.** The live static site (Kashka-25/empatherapy,
  empatherapy.co) stays as it is until this rebuild is ready to replace it.
- **Not ready for the public eye.** Empatherapy needs major development first.
- In the Creative Universe hub (Kashka-25/creative-universe), Empatherapy's destination will
  show a clearly labelled **"vision in progress" mock-up**, not a finished product.

## What exists today (on `main`)
- Pages (`app/`): home, `/therapists` directory, `/therapists/[slug]` profile, `/about`
  (Philosophy), `/fund` (Community Healing Fund, 10% of each session), `/subscribe`
  (plans marked "Coming Soon", not in the nav), `/contact`.
- Data: `data/therapists.js` holds one guide (Cassidy Dugan); other cards say "Guide Coming Soon".
- Booking is a `mailto:` link (`BookingButton`) and the contact form opens a pre-filled email
  (`BookingForm` + `lib/utils.js buildMailto`). Nothing is stored or sent by the server.
- API: `GET /api/therapists` returns the data file; `POST /api/bookings` only logs the body
  and returns success (a TODO stub — do not treat it as a working booking system).
- `lib/stripe.js` and `lib/supabase.js` are placeholders exporting `null`.

## Concepts and relations
- **Seekers and Alchemists** (confirmed by Cassidy, 8 Nov 2026): people who come to browse
  the site are **Seekers**; practitioners shown on the site are **Alchemists**. The current
  code and copy still say "guides"/"therapists" (e.g. `/therapists`, `data/therapists.js`,
  "Find Your Guide"); move them to the new terms as sections are rebuilt.
- **IntoTheLighthouse (I.T.L)**, formerly HOPEIUM: a separate project with its own repo
  (Kashka-25/IntoTheLighthouse), meant to integrate into Empatherapy later.
  The remote branch `feature/hopeium-gentle-landing` (5 commits adding a HOPEIUM landing
  page and nav/footer links) predates the rename. Leave it untouched; it is unopened.
- **YOU**: `OneDrive\Desktop\Empatherapy\Natural unfolding from Empatherapy to YOU.txt`
  maps the Empatherapy website (Learn, Discover, AI Guide, Resources, Find Alchemists,
  Book Sessions, Healing Fund, Reviews, Shop) leading via "Continue Your Journey" into the
  YOU platform (Daily Missions, XP, Community, Journals, Growth, Identity, Atlas, Life Journey).
  This is a vision note; none of it beyond the pages above is built here.

## Working rules
- Branch + PR for every change; never push to `main`; never merge PRs.
- Never invent features, prices, credentials or availability that aren't in the files.
- Roadmap: `docs/ROADMAP.md`.
