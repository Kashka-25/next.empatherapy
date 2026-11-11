# Admin, storage and security

The admin area is for the Empatherapy administrator only. It is **off by default** and nothing in it is public.

## What exists (Phase 6a and 6b)
- **Sign-in** at `/admin/login`. Password-based, with a signed, expiring session cookie (8 hours, `httpOnly`, `SameSite=Strict`, limited to `/admin`). Five wrong attempts in 15 minutes pauses sign-in for that address.
- **Route protection.** Middleware sends anyone without a valid session to the sign-in page, marks admin pages `noindex` and `no-store`. Every admin action checks the session again.
- **Applications** (`/admin/applications`): read, add private notes, move through New, In review, Approved, Declined, or delete permanently for data-deletion requests. Approving does **not** publish anything.
- **Weekly features** (`/admin/features`): schedule one to three modalities per week, publish, draft, archive, delete. The homepage and the modalities page update within moments. At most three can be live on any day and positions and modalities cannot clash.
- **Alchemists** (`/admin/alchemists`): edit any profile, add new ones, reset a built-in profile to its original, delete a new one. A profile is public only when it is **published and verified** (or the founder, or a labelled example). Publishing needs a complete profile: story, philosophy, safety information, at least one practice they actually offer, a typical session, prices and a location. Example profiles stay examples, and nobody can be made "founder" from the form. Each practice carries its basis (formal, study, experience, interest, confirm), and qualifications can be flagged "(confirm)".
- **Modalities** (`/admin/modalities`): edit any educational page, add new ones, reset or delete. Publishing needs the full structure, honest limits and safety text, labelled evidence, and the discovery tags (themes and styles). Unpublishing a modality hides it from the site and from profiles.
- **How edits are stored:** built-in content stays in `data/*.mjs`. Anything saved in the admin is layered on top, one record at a time, and "reset" brings the built-in version back. With storage off the site shows the built-in content. See `lib/content-store.mjs`.
- **Public application endpoint** `POST /api/applications`: same-origin only, size limit, rate limit (3 per hour per address), spam trap, full validation. Returns `503` until storage is on, so the public form stays a harmless preview.

## Not built yet
- Photo uploads for Alchemists (profiles use illustrated placeholders).
- Creating a profile directly from an approved application (today a person types it in).
- Homepage content and image management, reviews moderation, IntoTheLighthouse content.
- Multiple admin users and roles (there is one shared admin password).
- A production database driver (see below).

## Set it up locally
```bash
npm run admin:hash          # type a password of 12+ characters; it prints two lines
```
Put those two lines in `.env.local` (git-ignored, never commit it), and add:
```
EMPATHERAPY_STORE=file
```
Restart `npm run dev`, then visit http://localhost:3000/admin. Data is saved as JSON in `.data/` (git-ignored).
Without `ADMIN_PASSWORD_HASH` and a `ADMIN_SESSION_SECRET` of 32+ characters the admin stays off. There is no default login.

## Before this goes on a real host (important)
The file driver is for **local work only**. Hosts such as Vercel have read-only or temporary disks, so saved applications would vanish. Before any public launch:
1. **Add a database driver** with the same four methods as `lib/store/index.mjs` (`list`, `get`, `put`, `remove`). Supabase is the planned choice. Turn on row-level security so only the server can read applications.
2. **Move rate limits to a shared store.** `lib/ratelimit.mjs` is per server instance.
3. **Move to individual admin accounts** with roles, instead of one shared password.
4. **Set `EMPATHERAPY_STORE` and the admin variables only in the host's secret settings.** Use HTTPS (the session cookie is `Secure` in production).
5. **Write a short privacy notice** for the application form and decide how long applications are kept.
6. **Back up** the data and test a restore.

## Privacy rules this code follows
- Seeker discovery is never sent to the server or stored. Only Alchemist applications are stored, and only with consent.
- Applications keep just what the form asks for, plus when consent was given. An admin can delete one permanently. Applicants can email to ask.
- Nothing submitted is echoed back, and stored text is stripped of control characters and angle brackets.
- Admin screens never expose data to the public site.
