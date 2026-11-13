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
