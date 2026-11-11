import ApplicationForm from '@/components/apply/ApplicationForm';
import Eyebrow from '@/components/ui/Eyebrow';

export const metadata = {
  title: 'Become an Alchemist',
  description: 'Share your practice and your story with Seekers. Trained therapists, holistic practitioners and people with lived experience are all welcome to apply.',
};

export default function BecomeAnAlchemistPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <Eyebrow>Become an Alchemist</Eyebrow>
          <h1>Turn what you have lived through into something to share</h1>
          <p className="lede">Alchemists are people who have transformed their own experiences into understanding, knowledge, creativity or service. You do not have to be a licensed therapist, but we show clearly what training, study and lived experience each profile rests on.</p>
        </div>
      </section>
      <section className="section">
        <div className="container profile-layout" style={{ paddingBlock: 0 }}>
          <div className="profile-main">
            <ApplicationForm />
          </div>
          <aside className="profile-aside">
            <div className="aside-card">
              <h2 style={{ fontSize: '1.4rem' }}>What happens next</h2>
              <ul className="tick-list">
                <li>Your application is reviewed by a person before anything is public.</li>
                <li>We may ask about your training, insurance or registration where it matters for what you offer.</li>
                <li>You approve your profile before it goes live.</li>
              </ul>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Applications are not open yet. The form shows how it will work, and nothing you enter is sent or saved.</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
