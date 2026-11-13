# Admin, storage and security

The admin area is for the Empatherapy team only. It is **off by default** and nothing in it is public.

## What exists (Phases 6a, 6b and 6c)
- **Sign-in** at `/admin/login`. Individual accounts (email and password) with a signed, expiring session cookie (8 hours, `httpOnly`, `SameSite=Strict`, limited to `/admin`). Five wrong attempts in 15 minutes pauses sign-in, counted both per network address and per email, and the counts are shared across server instances because they live in the store.
- **Accounts and roles** (`/admin/accounts`, owners only). Create a person, change their role, deactivate or reactivate them, reset their password. Anyone can change their own password under **My account**.
  - **Owner:** everything, including accounts and clean-up.
  - **Editor:** Alchemist profiles, modality pages and weekly features. Editors never see applicants' personal details.
  - **Reviewer:** Alchemist applications only.
  - Who is signed in is re-read from the store on every request, so deactivating or demoting someone takes effect at once, even mid-session. The last active owner can never be deactivated or demoted. Passwords are stored only as salted scrypt hashes.
- **Two-step sign-in** (each person turns it on under **My account**). After the password, a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password and others) is needed. Standard time-based codes (RFC 6238), no extra service or dependency.
  - Setup shows a key to type into the app (or a link that opens it on a phone) and only switches on once a correct code proves the app works. Eight one-time **recovery codes** are shown once, for a lost phone; only hashes are stored.
  - A code works once, and each use must be newer than the last. Wrong codes are limited (5 per account and 10 per address in 15 minutes).
  - Between password and code a person is only "half signed in", held in a separate short-lived cookie signed with a different key, so it can never open the admin on its own.
  - An owner can **Reset two-step** for a locked-out person (not for themselves); turning it off yourself needs your password. Accounts without it get a gentle reminder on the overview. Everything is recorded in the activity log, never the codes.
  - Known limits: no QR code (the key is typed in), the two-step key sits in the database record unencrypted (anyone who can read the database can already read everything else), and it is optional, not enforced.
- **The setup password.** `ADMIN_PASSWORD_HASH` is a one-time way in, used only to create the first owner. It stops working the moment an active owner account exists. After that, remove it from the host's settings.
- **Route protection.** Middleware sends anyone without a valid session to the sign-in page and marks admin pages `noindex` and `no-store`. Every page and action then checks the person's role again.
- **Applications** (`/admin/applications`): read, add private notes, move through New, In review, Approved, Declined, or delete permanently for data-deletion requests. Approving does **not** publish anything.
  - **Create draft profile** (owners, on an approved application): starts a hidden, unverified draft from their answers. Practices are matched to modality pages and marked "confirm" (their claim, never formal training), qualifications are flagged "(confirm)", their email is **not** copied to the public profile, and no price is invented (their pricing answer is kept as a note). Their original wording sits in a private "Created from an application" panel on the draft, which is deleted when the profile is published. A draft is only made once per application.
  - Deleting an application for a data-deletion request also deletes an **unpublished** draft made from it (and its photos). A published profile is kept, so remove it separately if asked.
  - A **verified** profile cannot go public while any qualification or price is still marked "(confirm)", or while every practice is still "confirm". The founder and the fictional examples are exempt.
- **Activity log** (`/admin/activity`, owners only): who changed what, and when. Sign-ins, account and password changes, application reviews and deletions, draft profiles, profile and modality saves (created, published, unpublished, edited, verification changes), photo changes, weekly features and clean-ups. It records staff actions only: no applicant details, no emails, no passwords. Failed sign-ins are not logged (the sign-in limits cover guessing, and logging them would let anyone fill the log). If the log cannot be written the action still succeeds. Entries are cleared after 12 months by the clean-up.
- **Enquiries** (`/admin/enquiries`, owners only): every time a Seeker reaches out to an Alchemist through the site, it is stored and shown here.
  - On a profile, "Reach out to {name}" opens a short form (name, email, message, and a consent box that says who reads it, that the Empatherapy team can see it, and that it is deleted after six months). Messages with words that may mean the person is struggling show support information straight away and after sending, and are marked for you, and are never blocked. Example profiles and profiles that are not public cannot be contacted.
  - **Who is emailed** (when mail is set up): the Alchemist gets the full message and can reply to the Seeker directly; **you** get a heads-up with a link, without the message or the Seeker's details; the Seeker gets a confirmation. Without mail, enquiries still land here. The email is best effort and never stops an enquiry from being saved.
  - **Outcomes:** mark each as replied, booked a session, not a fit or closed, add a private note, and note the first-session amount once booked. The **introductions report** counts these per Alchemist. An **illustration rate** (0 to 30%) shows what an introduction fee would come to. It never charges anyone: the model is still being decided (see `docs/BUSINESS-MODEL.md`).
  - Same protections as applications: same-origin only, size limit, spam trap, limits per address (3 an hour) and per email (5 a day), no addresses stored. Kept six months after last touched (a proposal to confirm), then cleared by the clean-up.
- **Alchemist logins and their own space** (`/admin/portal`): an owner creates a login for an Alchemist under **Accounts**, tied to exactly one real profile (fictional examples never get one; one login per profile). Signing in lands them in their own space, with a menu of only their own things. They cannot open anything else in the admin.
  - **Their profile:** they edit it in the same editor as the team, minus visibility and verification. **Nothing they write goes public by itself.** Sending changes stores a *proposal* (only the fields that differ). The team sees each changed field, old and new, with credentials, practices, prices and safety text marked "Check this", then approves or declines with a kind note. Approving merges only those fields onto the profile as it is *now* and re-runs every publishing rule. Whether someone is verified or published is not theirs to change, even if a form is tampered with.
  - **Their photos:** up to five, same checks as the team's. Photos they upload **wait for review** and are shown to nobody else (not in the carousel, directory, discovery or the public media address) until the team approves. Editing the description or caption of a photo is immediate.
  - **Their enquiries:** only their own. They read the message, reply by email, set the outcome (replied, booked, not a fit, closed), note the first-session amount and keep a private note. The team's own note is separate.
  - The overview shows the team what is waiting (profile changes, photos). Public pages and the discovery tool never receive waiting changes, review notes, application notes or unapproved photos.
- **Clean-up** (`/admin/retention`, owners only): shows which applications are past the retention rule and deletes them when an owner clicks. Nothing is deleted automatically.
- **Weekly features** (`/admin/features`): schedule one to three modalities per week, publish, draft, archive, delete. At most three can be live on any day and positions and modalities cannot clash.
- **Alchemists** (`/admin/alchemists`): edit any profile, add new ones, reset a built-in profile to its original, delete a new one. A profile is public only when it is **published and verified** (or the founder, or a labelled example). Publishing needs a complete profile: story, philosophy, safety information, at least one practice they actually offer, a typical session, prices and a location. Example profiles stay examples, and nobody can be made "founder" from the form. Each practice carries its basis (formal, study, experience, interest, confirm), and qualifications can be flagged "(confirm)".
- **Modalities** (`/admin/modalities`): edit any educational page, add new ones, reset or delete. Publishing needs the full structure, honest limits and safety text, labelled evidence, and the discovery tags (themes and styles). Unpublishing a modality hides it from the site and from profiles.
- **How edits are stored:** built-in content stays in `data/*.mjs`. Anything saved in the admin is layered on top, one record at a time, and "reset" brings the built-in version back. With storage off the site shows the built-in content. See `lib/content-store.mjs`.
- **Public application endpoint** `POST /api/applications`: same-origin only, size limit, rate limit (3 per hour per address, shared), spam trap, full validation. Returns `503` until storage is on, so the public form stays a harmless preview.
- **Photos** (on each Alchemist's edit page, under "Photos"): up to **5 per profile**. The first is the profile picture (shown on the profile, the directory card and discovery results); together they make the "Meet them" carousel on the public profile. JPEG, PNG or WebP up to 5 MB, at least 400 pixels on the shortest side. Every photo needs a description (alt text) and a tick that the person has agreed to it being published; a caption is optional. Photos can be reordered, set as the profile picture, re-described and removed. **Fictional example profiles cannot have photos.**
  - Files are judged by their bytes (an SVG or HTML file renamed `.jpg` is refused), and rewritten without hidden metadata: GPS location, camera details, names and captions are stripped. Only the rotation flag is kept so phone photos stay upright. Animated images are refused.
  - Photos live in a private store (`.data/images` locally, a private Supabase Storage bucket when hosted) and are served only through `/media/<id>`, and only for profiles that are public. Hidden or unverified profiles' photos give a plain 404 to visitors; signed-in editors preview them at `/admin/media/<id>`. Removing a photo, or deleting or resetting a profile, deletes the files.
- **Privacy notice** at `/privacy`, linked from the footer and the application form. It must match the retention rule in `lib/retention.mjs`.

## Not built yet
- Photo cropping or focal-point choice (photos are centred, slightly above the middle, so faces are kept). Alchemists uploading their own photos (today an admin uploads on their behalf).
- Homepage content and image management, reviews moderation, IntoTheLighthouse content.
- Email invitations and password-reset emails (an owner sets and shares a starting password privately instead).
- A QR code for setting up two-step sign-in, and a way to require it for owners.

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
2. **Run `supabase/schema.sql`** in the Supabase SQL editor. It creates one table with row-level security **on** and **no policies**, so the public and signed-in roles can read and write nothing, and a **private** `alchemist-photos` storage bucket. Only the server's service-role key can reach either.
3. **Set secrets in the host's settings only** (never in the repo, never in a `NEXT_PUBLIC_` variable): `EMPATHERAPY_STORE=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET` (32+ random characters) and, for first sign-in only, `ADMIN_PASSWORD_HASH`.
4. **Create the first owner account**, then delete `ADMIN_PASSWORD_HASH` from the host.
5. **Confirm the privacy notice and the retention rule**, and have a privacy professional read `/privacy`.
6. **Back up** the database and test a restore (Supabase has scheduled backups on paid plans; otherwise export regularly).
7. Use HTTPS only (the session cookie is `Secure` in production).
8. Remove the six fictional example profiles before any public launch.

## Email (for enquiries)
When an Alchemist has a login, their enquiry email also links them to the enquiry in their space.
Mail is off unless `EMPATHERAPY_MAIL` is set. Options: `resend` (Resend's API; needs `RESEND_API_KEY` and `MAIL_FROM`, an address on a domain verified with Resend) or `log` (writes messages to `.data/outbox.jsonl` for local work). Set `ADMIN_NOTIFY_EMAIL` to the address that should hear about every enquiry, and `SITE_URL` so the link in that email is right. Setting up Resend (or another provider) needs an account, which is Cassidy's to create. Another provider only needs a new branch in `lib/mailer.mjs`.

## Launch settings (search engines, security headers)
- **Search engines are kept out until you say so.** Unless `EMPATHERAPY_INDEXING=on` is set on the host, every page sends `noindex`, `robots.txt` disallows everything and the sitemap is empty. These are decided **when the site is built**, so changing the setting needs a redeploy.
- **Before turning indexing on:** remove the six fictional example profiles (the sitemap already leaves them out, but their pages still exist), set `SITE_URL` to the real address (for example `https://empatherapy.co`), and have the privacy notice reviewed.
- **Security headers** go on every response (`lib/site.mjs`): a content policy (own scripts and styles, Google Fonts, own images, nothing else; no framing, no plugins, forms post back to us only), `nosniff`, clickjacking protection, a strict referrer policy, camera/microphone/location switched off, and HTTPS-only (`Strict-Transport-Security`) in production. Inline scripts and styles stay allowed because Next.js and React need them; a stricter nonce-based policy would be a larger change.
- Friendly "not found" and "something went wrong" pages show no technical details. The share picture for links is `app/opengraph-image.png`.

## Privacy rules this code follows
- Seeker discovery is never sent to the server or stored. Only Alchemist applications are stored, and only with consent.
- Applications keep just what the form asks for, plus when consent was given. An admin can delete one permanently, and `/admin/retention` removes old ones. Applicants can email to ask.
- Rate-limit counters store only a hash of the address or email, never the value, and are cleared after two days.
- Nothing submitted is echoed back, and stored text is stripped of control characters and angle brackets. Storage errors never include the response body.
- Admin screens never expose data to the public site.
