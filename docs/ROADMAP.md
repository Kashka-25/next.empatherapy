# next.empatherapy roadmap

Empatherapy needs major development before it goes in front of the public.
This repo leads that work; the legacy site (empatherapy.co) stays live until it's ready.

## Built (first pass, on `main`)
- [x] Home, Find a Guide, guide profile, Philosophy, Community Healing Fund, Subscribe (placeholder), Contact
- [x] Therapist data file with one guide (Cassidy Dugan)
- [x] Email-based booking and contact (mailto)

## Next
- [ ] Define the vision mock-up: the clearly labelled "vision in progress" view that the
      Creative Universe hub will show for Empatherapy
- [ ] Rebuild the sections against that vision, one at a time
- [x] Confirm naming: visitors are **Seekers**, practitioners are **Alchemists** (Cassidy, 8 Nov 2026)
- [ ] Move copy, routes and data from "guides"/"therapists" to Seekers/Alchemists as sections are rebuilt

## Later (named in README or code comments, not built)
- [ ] Scheduling: Cal.com or Calendly instead of the mailto booking link
- [ ] `POST /api/bookings`: validate, store in Supabase, send confirmation (currently a stub)
- [ ] Supabase: client database, bookings, therapist onboarding
- [ ] Stripe: subscription plans and session payments
- [ ] Therapist dashboard at `/dashboard/therapist`
- [ ] More guides in `data/therapists.js`

## Integrations to plan (separate projects)
- [ ] IntoTheLighthouse (I.T.L): integrate when both are ready
      (old `feature/hopeium-gentle-landing` branch predates the rename; untouched)
- [ ] YOU platform: "Continue Your Journey" handoff from Empatherapy, per the YOU vision note
