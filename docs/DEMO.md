# Vision demo mode

A front-end-only preview of where Empatherapy is heading, for the Creative Universe hub.
Labelled **"Vision in progress · example data"** on every page.

## Run it

```bash
npm install
npm run dev:demo          # http://localhost:3000
npm run build:demo && npm run start:demo
```

Without the flag (`npm run dev`, `npm run build`), the site behaves exactly as before.
The flag is `NEXT_PUBLIC_DEMO_MODE=1`, read in `lib/demo.js`. On a host such as Vercel,
set that environment variable on a separate project or deployment only. Never set it on
the real site.

## What changes in demo mode

- Practitioners come from `data/demo/alchemists.js`: four **fictional** Alchemists with
  example sessions and prices. The real `data/therapists.js` is not shown.
- Uses the vision's words: Seekers browse, Alchemists are the practitioners.
- `/resources` shows example resources from `data/demo/resources.js`. Outside demo mode it is a 404.
- Nothing can be booked or sent. The contact form shows "This is a preview" and does not
  open email. Profile pages say booking is not live. No request writes data anywhere.
- A fixed label at the bottom of every page says it's a vision preview with example data.

## Data rules

Demo data must stay fictional: no real clients, patients or practitioners.
