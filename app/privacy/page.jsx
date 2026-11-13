import Eyebrow from '@/components/ui/Eyebrow';
import DevNote from '@/components/ui/DevNote';
import { RETENTION_DAYS } from '@/lib/retention.mjs';

export const metadata = {
  title: 'Privacy',
  description: 'What Empatherapy collects, why, who can see it, how long we keep it, and how to ask us to delete it.',
};

export default function PrivacyPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <Eyebrow>Privacy</Eyebrow>
          <h1>Your privacy, in plain words</h1>
          <p className="lede">We collect as little as we can. For Seekers, that is nothing at all.</p>
        </div>
      </section>

      <section className="section">
        <div className="container container--narrow">
          <div className="stack" style={{ gap: '1.8rem' }}>
            <DevNote>Retention periods confirmed by Cassidy (14 Nov 2026). Before launch: check the database provider and region named in &ldquo;Where it is kept&rdquo;, and have a privacy professional review this notice against the Australian Privacy Act.</DevNote>

            <div className="stack">
              <h2>If you are a Seeker</h2>
              <p>When you explore, browse Alchemists or use the discovery tool, what you type stays in your own browser. It is not sent to us, not saved, and not used to build a profile of you. We do not use advertising or analytics trackers, and the site sets no cookies for visitors.</p>
              <p>The Golden Pause at the top of the homepage is just a moment to breathe: one breath with a golden light, then a short film. You can skip it at any time. It plays silently unless you turn the sound on, comes from our own site, and records and remembers nothing about you or your breathing, which is why it begins again on your next visit. If your device asks for reduced motion or to save data, you see a still picture instead, and you can still open the breathing space yourself.</p>
              <p>One thing to know: the site&rsquo;s fonts are loaded from Google Fonts, so your browser contacts Google to fetch them, as it does on many websites. We plan to host the fonts ourselves.</p>
            </div>

            <div className="stack">
              <h2>If you apply to become an Alchemist</h2>
              <p><strong>What we collect.</strong> Only what the application form asks for: your name, email, introduction, story, practices, qualifications, experience, location, how you work, pricing and links. We also record the time you agreed to this notice.</p>
              <p><strong>Why.</strong> To review your application, to contact you about it, and, only if you are approved and agree, to build your public profile with you. Nothing is published without a person checking it with you first.</p>
              <p><strong>Who can see it.</strong> Only the small Empatherapy team who review applications, each with their own sign-in. We do not sell or share your details, and we do not use them for marketing.</p>
              <p><strong>Where it is kept.</strong> In a private database that the public cannot read, accessed only by our server. It is protected by individual accounts and sign-in limits.</p>
              <p><strong>How long we keep it.</strong> Declined applications are deleted {RETENTION_DAYS.declined} days after they are declined. All other applications are deleted 12 months after we last touched them, unless you have asked us to keep them for longer.</p>
              <p><strong>Spam protection.</strong> To stop automated abuse we briefly keep a scrambled (hashed) version of the network address a form was sent from, so it cannot be read back. It is deleted within {RETENTION_DAYS.ratelimits} days.</p>
            </div>

            <div className="stack">
              <h2>If you send an enquiry to an Alchemist</h2>
              <p><strong>What we collect.</strong> Your name, your email and your message, and the time you agreed to this notice. Nothing else about your device or where you are.</p>
              <p><strong>Who sees it.</strong> The Alchemist you wrote to, who replies to you directly by email, and Empatherapy&rsquo;s small team, only to keep things safe and to understand how introductions go. We do not sell it or use it for marketing.</p>
              <p><strong>Emails.</strong> We send the Alchemist your message, send you a confirmation, and let the Empatherapy team know that an Alchemist was reached (without your message).</p>
              <p><strong>How long we keep it.</strong> Six months after we last touched it, then it is deleted. You can ask us to delete it sooner. Once the Alchemist has your message by email, what they do with it is between you and them.</p>
              <p><strong>Referral codes.</strong> If you type a referral code, we note which Alchemist's code it was and the agreed discount, so your Alchemist can apply it. The Alchemist who gave you the code is told only how many people have used it, never who.</p>
              <p><strong>If you are struggling.</strong> Empatherapy is not crisis care. In an emergency call 000, or Lifeline on 13 11 14.</p>
            </div>

            <div className="stack">
              <h2>If you write for the knowledge feed</h2>
              <p>Writing for the feed is entirely your choice. A post is published with your name and profile, and the team reads it first. Posts are shared under a Creative Commons Attribution licence, so anyone may copy and adapt them with credit to you. You can ask us to take a post down at any time. Copies others have already made under the licence are theirs to keep.</p>
            </div>

            <div className="stack">
              <h2>Photos</h2>
              <p>If you become an Alchemist, we publish photos of you only with your agreement, and you can ask us to remove or replace any of them at any time. A profile can show up to five. We remove hidden details such as location and camera information from every photo before it is stored, so only the picture itself is kept.</p>
            </div>

            <div className="stack">
              <h2>Your choices</h2>
              <p>You can ask to see, correct or delete your application at any time. Email <a href="mailto:hello@empatherapy.co">hello@empatherapy.co</a> and we will do it, usually within a few days. Deleting is permanent.</p>
            </div>

            <div className="stack">
              <h2>If something changes</h2>
              <p>If we ever add something that collects more, such as accounts for Seekers, we will update this page first and ask you before collecting anything new.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
