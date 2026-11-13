# Empatherapy: progress and decisions

The source of truth for what has been built, what has been decided, and what is still open.
Update it at the end of every working session. Last updated: 13 Nov 2026 (second pass).

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
| 6a. Admin foundation | Done: storage layer, sign-in, route protection, applications review, weekly features. See `docs/ADMIN.md` |
| 6b. Admin content editing | Done: edit and create Alchemist profiles and modality pages, with publish rules and reset to original |
| 6c. Production readiness | Built, **not yet connected to a real database:** Supabase driver and schema, individual admin accounts with roles, shared rate limiting, privacy notice and retention rule. **Photo uploads built (6d).** |
| 6e. Applications to profiles | Done: "Create draft profile" from an approved application, with verified-means-checked publish rules |
| 7e. Referral credits | Done: referrers earn 1 credit per booked first session via their code, with anti-gaming rules, a ledger for them and the team, and an illustration of Empatherapy's share. **Spending is built (7f).** |
| 7f. Spending credits | Done: decided that the accepting Alchemist covers the discount. Alchemists opt in (value per credit, most per session), referrers ask to spend, credits are held until the Alchemist marks the session used, 12-month expiry, team can void. **Seekers earning or giving credits, and any payment, are not built.** |
| 7g. Launch checklist | Done: owners see `/admin/launch`, with automatic checks of the real setup and a list of items only a person can check, ticked off by an owner. Read-only for the site itself. |
| 7d. Summary and referral circles | Done: "What Empatherapy brought you" for each Alchemist, and unique referral codes with discount agreements between Alchemists. Referrer incentive (beyond their clients getting a perk) is for Cassidy to decide. |
| 7c. Knowledge feed | Done: Alchemists (or the team) write openly licensed articles, reviewed before they appear, with an open Atom feed. **Licence (CC BY 4.0) to confirm.** |
| 7b. Alchemist portal | Done: logins for Alchemists, their own profile edits as proposals the team approves, photos that wait for review, their own enquiries and outcomes. The knowledge feed is the next row. |
| 7a. Enquiries and business model | Done: Seeker enquiries with founder and Alchemist notified, outcome tracking, illustration rate, research and a staged recommendation in `docs/BUSINESS-MODEL.md`. **Business model undecided.** |
| 6h. Launch hygiene | Done: security headers, noindex until launch, robots and sitemap, share image, friendly error pages |
| 6g. Two-step sign-in | Done: optional authenticator-app codes and recovery codes, owner reset |
| 6f. Activity log | Done: owners can see who changed what and when, with 12-month retention |
| 6d. Alchemist photos | Done: up to 5 photos per profile with a "Meet them" carousel, profile picture, alt text and consent tick, metadata stripped, private storage |

## What works today
- `/` warm homepage, then discovery invitation, this week's modalities, featured Alchemists, IntoTheLighthouse, philosophy, apply.
- `/alchemists` and `/alchemists/[slug]`: search, filters (practice, format, location, price), full profiles.
- `/modalities` and `/modalities/[slug]`: 10 educational pages with labelled evidence.
- `/discover`: four gentle steps, explained results, crisis signposting. Everything stays in the browser.
- `/lighthouse`: its own evening identity, honest "not open yet" status, safeguards, signposting.
- `/become-an-alchemist`: validated application form. With storage switched on it saves applications for review; with it off (the default) it stays a harmless preview.
- `/admin` (off by default): sign-in, applications review (notes, status, permanent delete), weekly feature scheduling, and editing of Alchemist profiles and modality pages. Not linked from the public site and kept out of search engines.
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
- **Admin is off unless configured.** No default password. Needs `ADMIN_PASSWORD_HASH` and a 32+ character `ADMIN_SESSION_SECRET`. Sessions are signed, expire after 8 hours and are re-checked by every action. Storage is off unless `EMPATHERAPY_STORE=file`, and the file driver is for local work only.
- **Storage is an interface** (`lib/store`), so a Supabase driver can replace the file driver without touching pages.
- **Edits layer over the built-in content** one record at a time (`lib/content-store.mjs`); reset brings the original back. A profile is public only when published *and* verified, and publishing needs a complete profile.
- **Approving an application never publishes anything.** A person creates the profile after checking training and registration.
- **Removed:** `/api/therapists` and `/api/bookings`. The bookings route only logged requests and replied "received", which was misleading. Bookings will be rebuilt properly with the data layer.
- **Visual signature:** honey drip dividers, a hand-drawn sprig, a lemon slice, handwritten margin notes, soft sunlit window light. IntoTheLighthouse gets a calm evening palette with a lantern glow.

## Open questions for Cassidy
00. **Decided 13 Nov 2026:** enquiries are kept six months after last touched. **Direction:** commission long term, or a monthly, quarterly and yearly subscription framed as a break-even (see `docs/BUSINESS-MODEL.md`). **Start free while setting up.** Still open: the actual prices, when to start charging, and the legal and tax advice listed there.
0. **Privacy and retention.** Retention rule **confirmed by Cassidy, 14 Nov 2026**. Still open: the database provider and region on `/privacy`, and a privacy professional reading it. The rule: declined applications deleted after 90 days; all others 12 months after last touched; spam-protection counters after 2 days. It is written on `/privacy` and enforced from `/admin/retention` (an owner clicks; nothing is automatic). Still to do: name the database provider and region, and have a privacy professional read `/privacy`. The site's fonts load from Google Fonts, so visitors' browsers contact Google; the notice says so and we can self-host the fonts if you prefer.
1. **Founding profile accuracy.** Please check `data/alchemists.mjs` (search `confirm: true`): AHHCA and CPAT credentials and the prices were carried over from the old profile; which of your practices are formal training versus study or lived experience? Also write your own "what brought me here" story.
2. **Mind Medicine Australia** was in the old profile and is **left out** on purpose, because it could imply psychedelic competence. Add it back only with exact wording you are comfortable with.
3. **Healing Fund.** Keep the 10% commitment for all Alchemists, only for your own sessions, or retire it?
4. **Real photographs.** Uploads now work (up to 5 per profile), but no real photos have been added. Which Alchemists do you want to start with, and who will take or collect them?
5. **Typefaces:** Fraunces (headings), Nunito Sans (body), Caveat (handwritten notes). Happy to change.
6. **IntoTheLighthouse repo.** Should the page here link to its own repo or site when ready?

## Not built yet (and why)
- **A live database.** The Supabase driver and schema exist and are tested against a fake of the Supabase API, but no Supabase project has been created or connected yet (that needs Cassidy). See `docs/ADMIN.md`, "Going live".
- **Photo focal point on photos already uploaded** (framing a new photo before upload is built: `components/admin/CropPicker.jsx`).
- **Enquiries, bookings, reviews, favourites, Seeker accounts.**
- **Images.** No photographs yet.

## How to run and test
```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 229 tests: launch checklist, spending credits, referral credits, referral circles and the summary, knowledge feed, Alchemist portal, enquiries and mail, launch settings, two-step sign-in (RFC 6238 vectors), activity log, application to draft profile, photos (checks, metadata stripping, storage, list rules), matching, content, directory, validation, storage (file, memory, Supabase), sessions, passwords, rate limits, accounts and roles, retention, applications, features
npm run build   # also runs lint
```
