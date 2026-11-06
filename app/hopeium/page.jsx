import Link from 'next/link';
import './hopeium.css';

export const metadata = {
  title: 'HOPEIUM | A softer place to land — Empatherapy',
  description:
    'Gentle, timely emotional support through Empatherapy. Find a compassionate person to talk with and take your next step at your own pace.',
};

const steps = [
  {
    number: '01',
    title: 'Reach out',
    copy: 'You do not need to have the perfect words. Simply tell us a little about what is happening and what kind of support might help.',
  },
  {
    number: '02',
    title: 'Connect',
    copy: 'During the beta, you can enquire about a one-to-one conversation with Cassidy and arrange a time that works for you.',
  },
  {
    number: '03',
    title: 'Find your next step',
    copy: 'Take away a little more clarity, a practical tool or a gentle direction for what comes next. Further support is always your choice.',
  },
];

export default function HopeiumPage() {
  return (
    <div className="hopeium-page">
      <section className="hopeium-hero">
        <div className="hopeium-hero__image" role="img" aria-label="Soft morning light falling through a peaceful green landscape" />
        <div className="hopeium-hero__wash" />
        <div className="hopeium-hero__content">
          <p className="hopeium-eyebrow">A gentle support pathway by Empatherapy</p>
          <h1>You don’t have to<br />go through it <em>alone.</em></h1>
          <p className="hopeium-hero__intro">
            Sometimes having someone listen makes all the difference. HOPEIUM
            helps you find a compassionate human connection when life feels
            difficult — without needing to know exactly what you need yet.
          </p>
          <div className="hopeium-actions">
            <a className="hopeium-button hopeium-button--light" href="mailto:hello@empatherapy.co?subject=HOPEIUM%20support%20enquiry">
              Find someone to talk to <span aria-hidden="true">↗</span>
            </a>
            <a className="hopeium-text-link" href="#how-it-works">How HOPEIUM works <span aria-hidden="true">↓</span></a>
          </div>
          <p className="hopeium-hero__quiet">A little support can make room for a different next step.</p>
        </div>
        <div className="hopeium-hero__caption">
          <span className="hopeium-caption-dot" />
          A softer place to land
        </div>
      </section>

      <section className="hopeium-intro hopeium-section">
        <div className="hopeium-section__label">A place to begin</div>
        <div className="hopeium-intro__grid">
          <h2>Support for the<br /><em>moment you’re in.</em></h2>
          <div className="hopeium-copy">
            <p className="hopeium-lead">
              Reaching out can feel like a big step, especially when you are
              already carrying a lot.
            </p>
            <p>
              HOPEIUM makes that first step a little easier. It is a simple way
              to enquire about timely emotional support, feel heard without
              judgement, and explore what might help you move forward.
            </p>
            <p>
              There is no pressure to explain everything at once. We can start
              with where you are.
            </p>
          </div>
        </div>
      </section>

      <section className="hopeium-steps hopeium-section" id="how-it-works">
        <div className="hopeium-section__heading">
          <div className="hopeium-section__label">A simple way forward</div>
          <h2>One step at a time.</h2>
          <p>Human connection first. The next step can come after.</p>
        </div>
        <div className="hopeium-step-grid">
          {steps.map((step) => (
            <article className="hopeium-step" key={step.number}>
              <span className="hopeium-step__number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hopeium-founder hopeium-section">
        <div className="hopeium-founder__photo" role="img" aria-label="A quiet woodland clearing in soft natural light">
        </div>
        <div className="hopeium-founder__content">
          <div className="hopeium-section__label">The founding beta</div>
          <h2>Begin with a<br /><em>human conversation.</em></h2>
          <p className="hopeium-lead">
            HOPEIUM is beginning small, with Cassidy Dugan, founder of
            Empatherapy.
          </p>
          <p>
            The first version is intentionally personal. You can enquire about
            a one-to-one supportive conversation, learn what to expect, and
            arrange a suitable time. As the approach develops, HOPEIUM can
            welcome other practitioners from the wider Empatherapy directory.
          </p>
          <Link className="hopeium-button hopeium-button--forest" href="/therapists/cass-dugan">
            Meet Cassidy <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className="hopeium-access hopeium-section">
        <div className="hopeium-access__inner">
          <div>
            <div className="hopeium-section__label">Care with room for everyone</div>
            <h2>Support should feel<br /><em>within reach.</em></h2>
          </div>
          <div className="hopeium-copy">
            <p className="hopeium-lead">
              HOPEIUM is being shaped around a sliding contribution approach.
            </p>
            <p>
              The intention is to make it easier to ask for support without
              finances becoming the first barrier. During this early beta,
              contribution arrangements can be discussed openly before a
              session is confirmed.
            </p>
            <a className="hopeium-text-link hopeium-text-link--dark" href="mailto:hello@empatherapy.co?subject=HOPEIUM%20contribution%20question">
              Ask about contributions <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="hopeium-closing">
        <div className="hopeium-closing__mark" aria-hidden="true">✳</div>
        <p className="hopeium-eyebrow">You are welcome as you are</p>
        <h2>There is no perfect way<br />to ask for <em>support.</em></h2>
        <p>Start with a message. We can take it from there, gently.</p>
        <a className="hopeium-button hopeium-button--light" href="mailto:hello@empatherapy.co?subject=HOPEIUM%20support%20enquiry">
          Get in touch <span aria-hidden="true">↗</span>
        </a>
        <p className="hopeium-safety">
          HOPEIUM is a timely emotional-support pathway, not an emergency or
          crisis-response service. If you or someone else is in immediate
          danger, contact local emergency services.
        </p>
        <div className="hopeium-parent">Part of the Empatherapy ecosystem</div>
      </section>
    </div>
  );
}
