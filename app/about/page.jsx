import Button from '@/components/ui/Button';
import Eyebrow from '@/components/ui/Eyebrow';
import FadeIn from '@/components/ui/FadeIn';
import { Sprig, HoneyDrip } from '@/components/art/Botanicals';

export const metadata = {
  title: 'About Empatherapy',
  description: 'Why Empatherapy exists, what we believe, and how we keep Seekers and Alchemists safe, respected and honest with each other.',
};

const beliefs = [
  ['You are not broken', 'You don’t need to be fixed to deserve support.'],
  ['Emotions are messengers', 'Difficult experiences can offer awareness, understanding and growth.'],
  ['You are your own greatest healer', 'Practitioners support you in rediscovering your own agency and capabilities.'],
  ['There are many pathways', 'No single modality, practitioner or philosophy is right for everyone.'],
  ['Every experience deserves space', 'You should feel safe expressing yourself without judgement.'],
  ['Pain can become meaningful', 'Challenges can become the raw material for understanding and transformation.'],
  ['Human connection matters', 'Sometimes what someone needs most is simply another person who cares.'],
];

export default function AboutPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <Eyebrow>About Empatherapy</Eyebrow>
          <h1>Discover new pathways to yourself</h1>
          <p className="lede">Empatherapy is a discovery and connection place for people curious about alternative therapies, holistic practices and personal growth, and for the people who share them.</p>
        </div>
      </section>

      <section className="section">
        <div className="container container--narrow">
          <div className="stack" style={{ gap: '1.4rem' }}>
            <p className="lede" style={{ color: 'var(--ink)' }}>We believe there is no single pathway to understanding ourselves. Each of us carries a unique experience, and sometimes discovering the right practice, perspective or person opens a door to something entirely new.</p>
            <p>Through a curated directory of Alchemists, plain-language guides to unfamiliar practices and a gentle discovery experience, we help people see what is possible. Beyond professional offerings, we make room for simple human connection through IntoTheLighthouse.</p>
            <p><strong>Seekers</strong> are people looking for understanding, support, growth or a new perspective. They may know exactly what they want, or have no idea where to begin. <strong>Alchemists</strong> are people who have turned their own experiences into knowledge, creativity or service. We celebrate that, and we are careful to show honestly what kind of experience each Alchemist brings.</p>
          </div>
        </div>
      </section>

      <HoneyDrip fill="var(--lemon-soft)" />
      <section className="section section--lemon" style={{ marginTop: '-1px' }}>
        <div className="container">
          <div className="section-head section-head--center">
            <Sprig size={34} color="var(--botanical)" />
            <h2>What we believe</h2>
          </div>
          <div className="beliefs">
            {beliefs.map(([t, p]) => <FadeIn key={t} className="belief"><h3>{t}</h3><p>{p}</p></FadeIn>)}
          </div>
          <blockquote className="pull" style={{ margin: '3rem auto 0' }}>Every aspect of you is committed to showing up for you with all the power they have.</blockquote>
        </div>
      </section>

      <section id="how-we-work" className="section">
        <div className="container container--narrow">
          <div className="stack" style={{ gap: '1.2rem' }}>
            <Eyebrow>How we work</Eyebrow>
            <h2>Honest about what we know</h2>
            <ul className="tick-list">
              <li>We show training, personal study, lived experience and developing interests separately. They are different things and never interchangeable.</li>
              <li>We keep traditional belief, practitioner perspective, preliminary research and established evidence apart, and we avoid unsupported medical claims.</li>
              <li>Suggestions from our discovery tool are explained in plain words. They are exploration, not diagnosis, and never a guarantee.</li>
              <li>Practitioners apply to be listed and are reviewed before they appear.</li>
            </ul>
            <p style={{ color: 'var(--muted)' }}>Empatherapy was started by Cassidy Dugan, who is also its founding Alchemist through The Homecoming Sessions. It is one profile among many, and the platform is bigger than any one person.</p>
          </div>
        </div>
      </section>

      <section id="safety" className="section section--sage">
        <div className="container container--narrow">
          <div className="stack" style={{ gap: '1.2rem' }}>
            <Eyebrow>Safety and privacy</Eyebrow>
            <h2>Your words are yours</h2>
            <ul className="tick-list">
              <li>What you write in Begin your discovery stays in your browser. It is not sent anywhere or saved, and it is gone when you leave.</li>
              <li>If you ever want us to share something with an Alchemist, we will ask you first.</li>
              <li>Empatherapy is not crisis or emergency care. If you are in danger in Australia, call 000, or Lifeline on 13 11 14.</li>
              <li>Some practices, such as psychedelic integration, carry legal and safety considerations. We describe them plainly and list only Alchemists with suitable training.</li>
            </ul>
            <div className="row"><Button href="/discover">Begin your discovery</Button><Button href="/alchemists" variant="outline">Discover Alchemists</Button></div>
          </div>
        </div>
      </section>
    </>
  );
}
