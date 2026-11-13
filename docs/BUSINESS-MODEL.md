# Business model: options and a recommendation

**Status: undecided. This is for Cassidy to decide.** It reports what comparable businesses do and offers a view. It is not financial, tax or legal advice. The evidence and its gaps are in [`research/business-model-research.md`](research/business-model-research.md), prepared 13 Nov 2026 largely from third-party summaries of rate cards, so check any figure before relying on it.

## The situation today
- Seekers can send an **enquiry** to an Alchemist through the site. Everything after that (talking, booking, paying) happens off the platform.
- There is **no on-platform booking or payment**, and no traffic yet. One founder, pre-launch.
- The brand is trust-first and not crisis care. Alchemists are a mix of registered health practitioners and unregistered practitioners, at roughly AUD 60 to 200 a session.

## What comparable businesses charge

| Family | Examples (reported) | Who pays | Needs payments on the platform? |
|---|---|---|---|
| Flat listing fee | GoodTherapy Australia AUD 154 a year ex GST; Talking Works AUD 198 a year; Psychology Today about USD 30 a month | Practitioner | No |
| First-booking commission | Mindbody 20% of a new client's first purchase, capped at USD 30; Fresha about 20% on new marketplace clients | Business | Yes, or trusted self-reporting |
| Fee per new booking | Zocdoc, about USD 30 to 140 by specialty | Practitioner | Booking, yes |
| Pay per lead | Thumbtack, Bark (credits) | Professional | No |
| Commission on all bookings | Airbnb-style | Host and or guest | Yes |

## What I take from it
1. **A commission needs two things Empatherapy does not have yet: knowing a booking happened, and a way to collect.** Without payments on the platform, a commission relies on Alchemists reporting honestly. That can work in a small, high-trust group. It will not hold up as it grows.
2. **For ongoing relationships like therapy, the platform's value is mostly at the start.** The closest commission models (Mindbody, Fresha) charge **once, on the first session**, and not at all when the client came through the practitioner's own link. Charging on every session is the model most likely to push people off the platform, and one study found commissions roughly doubled measured leakage. The evidence is thin, and none of it isolates first-session-only fees.
3. **Referral fees for registered practitioners are an open legal question.** I could not read the referral-payment wording in the psychologists' or other national boards' codes. A flat advertising fee and a payment per referral may be treated differently. Get legal advice before taking anything tied to referrals of registered practitioners.
4. **Charging before there is value tends to sour practitioners.** Some therapists report drops in referrals from long-standing directories (anecdotal). A new directory with no traffic yet has little to charge for.
5. **I would not choose pay per lead.** Selling a Seeker's enquiry sits badly with a trust-first brand in a health-adjacent space.

## A staged path I would consider
1. **Founding Alchemists, free (the first 6 to 12 months).** Build supply and trust, and use the enquiry tracker to learn real numbers: how fast Alchemists reply, and how many enquiries become sessions.
2. **A flat annual listing fee once there is traffic and evidence of enquiries.** About AUD 150 to 200 a year matches Australian counsellor directories, can be collected without payments, avoids the leakage problem, and is closer to advertising than to a referral fee. Offer a concession rate.
3. **A first-session introduction fee only if you build on-platform booking and payments.** Something like 10 to 15% of the first session, capped (for example AUD 20 to 30), waived when the Seeker arrives through the Alchemist's own link, and nothing on later sessions. Revisit once real conversion data exists.
4. **If you want commission sooner:** a first-session introduction fee on self-reported bookings, under a written agreement with a small founding group, checked against the tracker. Expect some under-reporting, and take the legal advice first.
5. **Avoid** per-lead charges, and paid placement unless it is clearly labelled as paid.

An optional values-led layer: concession places, or the retired 10% Healing Fund idea reborn as a pay-it-forward contribution.

## Questions for professionals before any fee
- **Lawyer:** referral or fee-splitting rules for registered practitioners; the Alchemist agreement (unfair contract terms); the review feature (see below).
- **Accountant:** GST registration (threshold AUD 75,000 turnover), GST on a platform fee, and whether you would act as an agent or principal if payments ever flow through you.
- **Privacy professional:** whether Empatherapy counts as a health service provider under the Privacy Act, since enquiries can contain health details.

## A flag on reviews
The profile page says moderated reviews will appear after launch. Under AHPRA's advertising rules, testimonials about clinical matters are not allowed in advertising a regulated health service, and a platform that runs reviews is responsible for them. **Do not build reviews until this has been checked for registered practitioners.**

## What is built to support the decision
- Enquiries from Seekers, with the founder notified and the Alchemist emailed (see `docs/ADMIN.md`).
- Outcome tracking per enquiry (replied, booked, not a fit), an optional first-session amount, and an introductions report.
- An **illustration rate** (0 to 30%) that only shows what a fee would come to. It never charges or invoices anyone.

**Not built:** payments, on-platform booking, "own link" codes, invoicing, reviews.
