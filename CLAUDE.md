# next.empatherapy

**Empatherapy** is becoming a discovery and connection ecosystem: **Seekers** meet **Alchemists** through a curated
directory, an educational modality library, a gentle discovery tool, and IntoTheLighthouse (peer support).
Tagline: *Discover new pathways to yourself.* Founder: Cassidy Dugan (GitHub Kashka-25), whose own practice
(**The Homecoming Sessions**) is one Alchemist profile among many.

- Repo: Kashka-25/next.empatherapy · Local: `C:\Users\cassi\Projects\Empatherapy\next.empatherapy`
- Preview: https://next-empatherapy.vercel.app (Vercel)
- Run: `npm install`, `npm run dev` (http://localhost:3000), `npm test`, `npm run build`
- Stack: Next.js 14.2.3 (App Router), React 18, plain JSX (`jsconfig.json`: `@/` alias). Data and the matching engine
  are `.mjs` so tests run with `node --test`. Styling: `styles/variables.css` tokens + `app/globals.css` classes.
- **Read first:** `docs/PROGRESS.md` (what exists, decisions, open questions) and `docs/ARCHITECTURE.md`.

## Decisions (Cassidy)
- 8 Nov 2026: this repo leads Empatherapy. The live static site (Kashka-25/empatherapy, empatherapy.co) stays as is until this is ready. Not for the public eye yet. Creative Universe shows a clearly labelled "vision in progress".
- 11 Nov 2026: new product vision (Seekers, Alchemists, discovery, lemon-and-honey identity). The personal brand must not dominate the platform.

## Rules that matter here
- **Never present fictional content as real.** The six example Alchemists are fictional and labelled "Example profile". Keep them labelled. Never invent credentials, prices or availability for real people. The real founding profile only uses what Cassidy has said or the files hold. Unconfirmed items carry `confirm: true`.
- **Keep kinds of experience separate:** `formal`, `study`, `experience`, `interest`, `confirm`. An `interest` is never an offering. Modalities with `requires_formal_training` only match formally trained Alchemists. Never imply personal psychedelic experience is clinical competence.
- **Seeker privacy:** discovery stays in the browser and stores nothing. Don't add logging, analytics or storage of what Seekers write without explicit consent design.
- **Never market IntoTheLighthouse or Empatherapy as crisis care.** Keep the signposting (000, Lifeline 13 11 14).
- **No unsupported medical claims.** Keep evidence parts labelled (`traditional`, `practitioner`, `research`, `established`).
- Matching stays rules-based and explainable. If AI is added, server-side only, never required for basic discovery, keys never in frontend code.
- Voice: warm, plain, unhurried. Honey and lemon used with restraint over parchment and botanical greens.
- Branch + PR for every change; never push to `main`; never merge PRs.

## Concepts and relations
- **IntoTheLighthouse (I.T.L)**, formerly HOPEIUM: its own project/repo (Kashka-25/IntoTheLighthouse), integrated here as a landing page and pathway only. Old branch `feature/hopeium-gentle-landing` predates the rename and is untouched.
- **YOU**: a separate platform. `OneDrive\Desktop\Empatherapy\Natural unfolding from Empatherapy to YOU.txt` and the layouts in that folder are earlier vision notes.
