# Admin, storage and security

The admin area is for the Empatherapy team only. It is **off by default** and nothing in it is public.

## What exists (Phases 6a, 6b and 6c)
- **Sign-in** at `/admin/login`. Individual accounts (email and password) with a signed, expiring session cookie (8 hours, `httpOnly`, `SameSite=Strict`, limited to `/admin`). Five wrong attempts in 15 minutes pauses sign-in, counted both per network address and per email, and the counts are shared across server instances because they live in the store.
- **Accounts and roles** (`/admin/accounts`, owners only). Create a person, change their role, deactivate or reactivate them, reset their password. Anyone can change their own password under **My account**.
  - **Owner:** everything, including accounts and clean-up.
  - **Editor:** Alchemist profiles, modality pages and weekly features. Editors never see applicants' personal details.
  - **Reviewer:** Alchemist applications only.
  - Who is signed in is re-read from the store on every request, so deactivating or demoting someone takes effect at once, even mid-session. The last active owner can never be deactivated or demoted. Passwords are stored only as salted scrypt hashes.
- **The setup password.** `ADMIN_PASSWORD_HASH` is a one-time way in, used only to create the first owner. It stops working the moment an active owner account exists. After that, remove it from the host's settings.
- **Route protection.** Middleware sends anyone without a valid session to the sign-in page and marks admin pages `noindex` and `no-store`. Every page and action then checks the person's role again.
- **Applications** (`/admin/applications`): read, add private notes, move through New, In review, Approved, Declined, or delete permanently for data-deletion requests. Approving does **not** publish anything.
- **Clean-up** (`/admin/retention`, owners only): shows which applications are past the retention rule and deletes them when an owner clicks. Nothing is deleted automatically.
- **Weekly features** (`/admin/features`): schedule one to three modalities per week, publish, draft, archive, delete. At most three can be live on any day and positions and modalities cannot clash.
- **Alchemists** (`/admin/alchemists`): edit any profile, add new ones, reset a built-in profile to its original, delete a new one. A profile is public only when it is **published and verified** (or the founder, or a labelled example). Publishing needs a complete profile: story, philosophy, safety information, at least one practice they actually offer, a typical session, prices and a location. Example profiles stay examples, and nobody can be made "founder" from the form. Each practice carries its basis (formal, study, experience, interest, confirm), and qualifications can be flagged "(confirm)".
- **Modalities** (`/admin/modalities`): edit any educational page, add new ones, reset or delete. Publishing needs the full structure, honest limits and safety text, labelled evidence, and the discovery tags (themes and styles). Unpublishing a modality hides it from the site and from profiles.
- **How edits are stored:** built-in content stays in `data/*.mjs`. Anything saved in the admin is layered on top, one record at a time, and "reset" brings the built-in version back. With storage off the site shows the built-in content. See `lib/content-store.mjs`.
- **Public application endpoint** `POST /api/applications`: same-origin only, size limit, rate limit (3 per hour per address, shared), spam trap, full validation. Returns `503` until storage is on, so the public form stays a harmless preview.
- **Privacy notice** at `/privacy`, linked from the footer and the application form. It must match the retention rule in `lib/retention.mjs`.

## Not built yet
- Photo uploads for Alchemists (profiles use illustrated placeholders).
- Creating a profile directly from an approved application (today a person types it in).
- Homepage content and image management, reviews moderation, IntoTheLighthouse content.
- Email invitations and password-reset emails (an owner sets and shares a starting password privately instead).
- Two-step sign-in (a second factor). Worth adding before more than a handful of people have accounts.
- An audit log of who changed what.

## Storage drivers
`lib/store/index.mjs` defines four methods (`list`, `get`, `put`, `remove`). Pages never talk to a database directly.

| `EMPATHERAPY_STORE` | Driver | Use |
|---|---|---|
| (unset) | none | Storage off. The site shows built-in content; the admin and application form are inert. |
| `file` | JSON files in `.data/` | Local work only. **Refused in a production build** unless `EMPATHERAPY_ALLOW_FILE_STORE=yes`, because hosted disks are read-only or temporary and data would silently vanish. |
| `supabase` | Supabase over its REST API | Hosted use. Needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. |

## Set it up locally
```bash
npm run admin:hash          # type a password of 12+ characters; it prints two lines
```
Put those two lines in `.env.local` (git-ignored, never commit it), and add:
```
EMPATHERAPY_STORE=file
```
Restart `npm run dev`, then visit http://localhost:3000/admin. Sign in with the setup password (leave the email empty), create your owner account under **Accounts**, then sign in with it. Data is saved as JSON in `.data/` (git-ignored). `.env.example` lists every variable.
Without a session secret of 32+ characters the admin stays off. There is no default login.

## Going live (needs Cassidy)
The code is ready. These steps need a person with the accounts, and none has been done:
1. **Create a Supabase project.** Choose a region (Sydney is closest) and write it into `/privacy`.
2. **Run `supabase/schema.sql`** in the Supabase SQL editor. It creates one table with row-level security **on** and **no policies**, so the public and signed-in roles can read and write nothing. Only the server's service-role key can.
3. **Set secrets in the host's settings only** (never in the repo, never in a `NEXT_PUBLIC_` variable): `EMPATHERAPY_STORE=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET` (32+ random characters) and, for first sign-in only, `ADMIN_PASSWORD_HASH`.
4. **Create the first owner account**, then delete `ADMIN_PASSWORD_HASH` from the host.
5. **Confirm the privacy notice and the retention rule**, and have a privacy professional read `/privacy`.
6. **Back up** the database and test a restore (Supabase has scheduled backups on paid plans; otherwise export regularly).
7. Use HTTPS only (the session cookie is `Secure` in production).
8. Remove the six fictional example profiles before any public launch.

## Privacy rules this code follows
- Seeker discovery is never sent to the server or stored. Only Alchemist applications are stored, and only with consent.
- Applications keep just what the form asks for, plus when consent was given. An admin can delete one permanently, and `/admin/retention` removes old ones. Applicants can email to ask.
- Rate-limit counters store only a hash of the address or email, never the value, and are cleared after two days.
- Nothing submitted is echoed back, and stored text is stripped of control characters and angle brackets. Storage errors never include the response body.
- Admin screens never expose data to the public site.
