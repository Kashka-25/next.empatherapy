# Empatherapy: progress and decisions

The source of truth for what has been built, what has been decided, and what is still open.
Update it at the end of every working session. Last updated: 11 Nov 2026.

## The product in one paragraph
Empatherapy is a discovery and connection ecosystem. **Seekers** (people looking for understanding, support,
growth or a new perspective) meet **Alchemists** (people who have turned their own experience into something to share)
through a curated directory, an educational modality library, a gentle discovery tool, and IntoTheLighthouse, a
separate peer-support concept. The founder's own practice, **The Homecoming Sessions**, is one Alchemist profile among many.
Tagline: **Discover new pathways to yourself.** Feeling: a cup of lemon and honey tea on a cold afternoon.

## Status by phase

| Phase | State |
|---|---|
| 1. Audit and architecture | Done. See `docs/ARCHITECTURE.md` |
| 2. Design system and foundation | Done: tokens, type, nav, footer, botanical artwork |
| 3. Home, directory, profiles, modalities | Done with fictional example data |
| 4. Discovery engine | Done: transparent rules, 26 passing tests |
| 5. IntoTheLighthouse, personal offering, apply | Done as landing page and preview form. No live peer support. |
| 6. Admin and polish | **Not started.** Needs authentication and a database first (see below). |

## What works today
- `/` warm homepage, then discovery invitation, this week's modalities, featured Alchemists, IntoTheLighthouse, philosophy, apply.
- `/alchemists` and `/alchemists/[slug]`: search, filters (practice, format, location, price), full profiles.
- `/modalities` and `/modalities/[slug]`: 10 educational pages with labelled evidence.
- `/discover`: four gentle steps, explained results, crisis signposting. Everything stays in the browser.
- `/lighthouse`: its own evening identity, honest "not open yet" status, safeguards, signposting.
- `/become-an-alchemist`: validated application form. **It sends and stores nothing yet.**
- `/about`: philosophy, how we work, safety and privacy.
- Old routes redirect: `/therapists*` to `/alchemists*`; `/fund`, `/contact` to `/about`; `/subscribe` to `/`.

## Demonstration content
Six **fictional** Alchemists (Mira Okafor, Tomas Reyes, Saoirse Lind, Arjun Mehra, Wren Castellano, Priya Nair), labelled "Example profile"
on every card and page. Their qualifications, stories and prices are invented. Ten modalities and three weekly features are sample editorial content.
All of it lives in `data/*.mjs`. Replace it with real, verified content before any public launch.

## Decisions made (and why)
- **Framework and stack unchanged.** Next.js 14 App Router, plain JSX, no new services. Data lives in `.mjs` files so the matching engine and its tests run with plain `node --test`.
- **Matching is rules, not AI.** Keyword and synonym themes, four weighted dimensions, depth over breadth, transparent reasons. An AI interpretation step can later feed theme weights without touching the directory (see `lib/matching/index.mjs` header).
- **Training basis is first-class.** Each practice on a profile is `formal`, `study`, `experience`, `interest` or `confirm`. Modalities that need professional training only match Alchemists with formal training. An `interest` is never an offering.
- **Seeker privacy by design.** Discovery runs in the browser and stores nothing (checked by an automated test). Sharing with an Alchemist will need explicit consent.
- **Crisis language shows support first** and suggests nothing (Lifeline 13 11 14, 000).
- **Retired for now:** the old Community Healing Fund (10% of each session, "no questions asked") and Subscribe pages made commitments tied to Cassidy's personal practice. They are not in the new site. Git history has them. See open questions.
- **Removed:** `/api/therapists` and `/api/bookings`. The bookings route only logged requests and replied "received", which was misleading. Bookings will be rebuilt properly with the data layer.
- **Visual signature:** honey drip dividers, a hand-drawn sprig, a lemon slice, handwritten margin notes, soft sunlit window light. IntoTheLighthouse gets a calm evening palette with a lantern glow.

## Open questions for Cassidy
1. **Founding profile accuracy.** Please check `data/alchemists.mjs` (search `confirm: true`): AHHCA and CPAT credentials and the prices were carried over from the old profile; which of your practices are formal training versus study or lived experience? Also write your own "what brought me here" story.
2. **Mind Medicine Australia** was in the old profile and is **left out** on purpose, because it could imply psychedelic competence. Add it back only with exact wording you are comfortable with.
3. **Healing Fund.** Keep the 10% commitment for all Alchemists, only for your own sessions, or retire it?
4. **Real photographs.** Profiles use illustrated placeholders. The data model has a `portrait` field for photos.
5. **Typefaces:** Fraunces (headings), Nunito Sans (body), Caveat (handwritten notes). Happy to change.
6. **IntoTheLighthouse repo.** Should the page here link to its own repo or site when ready?

## Not built yet (and why)
- **Admin and content management.** Needs authentication, roles and a database first. Plan in `docs/ARCHITECTURE.md`.
- **Real applications, enquiries, bookings, reviews, favourites, accounts.** Each needs the data layer.
- **Modality, Alchemist and application storage.** Data is in files for now. Supabase placeholders exist in `lib/`.
- **Images.** No photographs yet.
- **Rate limiting and server-side validation.** Not needed while nothing is submitted; required before applications go live (`lib/validation.mjs` is ready to reuse server-side).

## How to run and test
```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 26 tests: matching engine, content integrity, directory, application validation
npm run build   # also runs lint
```
