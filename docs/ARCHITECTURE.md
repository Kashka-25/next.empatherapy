# Architecture and audit

## Phase 1 audit (11 Nov 2026, before the redo)

**What existed:** a first-pass Next.js 14 site for one practitioner: home, `/therapists` directory, one profile,
Philosophy, Community Healing Fund, Subscribe (placeholder), Contact (mailto), two API routes (one data, one stub).
Styling was inline objects with CSS variables. Stripe and Supabase were `null` placeholders.

| Item | Decision |
|---|---|
| Next.js 14 App Router, React 18, plain JSX, `@/` alias | **Kept** |
| `Button`, `Card`, `FadeIn` | **Kept in spirit, rewritten** for the new tokens (FadeIn unchanged) |
| Navbar, Footer | **Replaced** (new IA) |
| `/therapists` directory and profile | **Repurposed** as `/alchemists` with a richer data model; old URLs redirect |
| Philosophy page | **Repurposed** into `/about` using the seven beliefs |
| Healing Fund, Subscribe | **Retired** (commitments tied to the personal brand); see PROGRESS open questions |
| `BookingButton`, `BookingForm`, `buildMailto` | **Replaced.** Enquiry is a `mailto:` on the founding profile only |
| `/api/bookings` stub, `/api/therapists` | **Removed** (stub replied "received" without doing anything) |
| `lib/stripe.js`, `lib/supabase.js` | **Kept** as placeholders |
| Tooling | Added `node --test` tests and `.gitignore` (none before) |

No external integrations existed, so nothing was disturbed.

## Information architecture
Home · Discover Alchemists · Explore Modalities · IntoTheLighthouse · About · (Become an Alchemist in the header, Begin your discovery as the primary action)

```
app/
  page.jsx                    home
  alchemists/ [slug]/         directory, profiles
  modalities/ [slug]/         library, educational pages
  discover/                   discovery flow
  lighthouse/                 IntoTheLighthouse
  about/                      philosophy, how we work, safety
  become-an-alchemist/        application
components/  art/ ui/ layout/ alchemists/ modalities/ discover/ apply/
data/        alchemists.mjs  modalities.mjs  features.mjs   (replace with a database later)
lib/         content.mjs  directory.mjs  validation.mjs  matching/{index,vocabulary}.mjs
             store/{index,supabase}.mjs  accounts.mjs  admin-auth.mjs  session.mjs  ratelimit.mjs  retention.mjs
tests/       matching.test.mjs  content.test.mjs
```

## Data model
Implemented as JS objects with JSDoc, shaped so each maps to a table later.
- **Alchemist**: all fields from the brief, plus `basis` per practice, `offering_name`, `featured_rank`, `demo`, `palette`/`motif` (placeholder portrait).
- **Modality**: all fields from the brief, plus `themes`, `styles` (matching tags) and `requires_formal_training`. Evidence is an array of labelled parts (`traditional`, `practitioner`, `research`, `established`).
- **Featured modality**: start/end dates, position 1 to 3, publication status. `activeFeatures()` rolls over weekly and falls back to the latest week so the page is never empty.
- **Seeker discovery / matching result**: **deliberately not persisted.** They exist only in memory while the page is open.
- **Alchemist application**: `lib/validation.mjs` defines fields, limits and sanitising, ready to reuse server-side.

## Matching (lib/matching)
Pure functions, independently tested. Shared vocabulary of themes and styles across Seekers, modalities and Alchemists.
Dimensions: experience .35, intention .20, openness .20, practical .25. Blank dimensions are skipped.
Alchemist score is half breadth, half best single practice weighted by basis (formal 1, experience .9, study .8, unconfirmed .7).
Exclusions: unpublished, unverified, wrong format, wrong place for in-person, no formal training where required.
Budget is soft (flagged, not hidden). Crisis phrases short-circuit to support-first.
Known limits: keyword rules do not understand negation ("not anxious") or nuance. That is what an AI interpretation layer would improve later, server-side, with keys never in the browser.

## Plan for what is next
1. ~~Storage layer, auth, admin MVP, applications, weekly features~~ **Done (Phase 6a)**, see `docs/ADMIN.md`.
2. ~~Production database driver~~ **Built (Phase 6c):** `lib/store/supabase.mjs` and `supabase/schema.sql` (row-level security on, no public policies). Still to do: create the Supabase project and set the secrets.
3. ~~Admin content editing for Alchemist profiles and modality pages~~ **Done (Phase 6b).** Still to do: homepage content, photo uploads.
4. ~~Individual admin accounts and roles, shared rate limiting~~ **Built (Phase 6c).** Still to do: enquiries.
5. **Real content and photography.** Verification workflow before any profile is listed.
6. **IntoTheLighthouse** as a separate product behind its safeguards, linked from here.
7. **Optional AI interpretation** feeding theme weights, behind a server route.

## Risks
- Fictional profiles could be mistaken for real: mitigated by labels on cards, profiles, directory and footer. Remove before launch.
- Evidence statements are sample editorial copy and need review by a qualified editor.
- The founding profile must reflect Cassidy's real, confirmed qualifications (open question 1).
