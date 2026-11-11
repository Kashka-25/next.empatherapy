import Button from '@/components/ui/Button';
import Eyebrow from '@/components/ui/Eyebrow';
import { Lighthouse } from '@/components/art/Botanicals';

export const metadata = {
  title: 'IntoTheLighthouse',
  description: 'A human connection and peer-support space within Empatherapy. Sometimes you do not need a session. You just need someone to care.',
};

const who = ['Empathetic listeners', 'Peer supporters', 'Community volunteers', 'People with lived experience', 'Trained support companions', 'Qualified professionals who also wish to contribute'];
const is = ['A place to be heard by someone who cares', 'Kindness, presence and a moment of company', 'Run by people who are not necessarily therapists'];
const isNot = ['Crisis intervention or an emergency service', 'A replacement for professional mental health care', 'Therapy, diagnosis or treatment'];
const safeguards = [
  'Clear boundaries between peer support and professional care',
  'Verification and onboarding of every volunteer',
  'Moderation and a simple way to report a concern',
  'Consent and privacy controls you can see and change',
  'Honest expectations about availability and response times',
  'Emergency signposting and escalation paths',
  'Protection against dependency, exploitation and people claiming to be professionals when they are not',
];

export default function LighthousePage() {
  return (
    <div className="theme-lighthouse">
      <section className="lh-hero">
        <div className="glow" style={{ width: 560, height: 560, right: -80, top: -60 }} />
        <div className="container hero__grid" style={{ position: 'relative' }}>
          <div className="hero__copy">
            <span className="hand">a little light</span>
            <Eyebrow>IntoTheLighthouse</Eyebrow>
            <h1>You don&rsquo;t have to navigate everything alone.</h1>
            <p className="lede" style={{ color: 'rgba(233,239,234,.85)' }}>Sometimes people don&rsquo;t need a modality. They don&rsquo;t need a session or someone to teach them something. Sometimes they just need someone to care.</p>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: 'var(--lantern)' }}>You can always find a little light.</p>
            <div className="row">
              <a href="#status" className="btn btn--lantern btn--lg">Where we are</a>
              <a href="#safety" className="btn btn--outline btn--lg" style={{ borderColor: 'var(--lantern)', color: 'var(--lantern)' }}>How we keep people safe</a>
            </div>
          </div>
          <div className="hero__art" style={{ display: 'grid', placeItems: 'center' }}><Lighthouse size={230} /></div>
        </div>
      </section>

      <section className="lh-section">
        <div className="container">
          <div className="section-head"><Eyebrow>What it is</Eyebrow><h2>A space for human connection</h2></div>
          <div className="grid-cards">
            <div className="lh-card"><h3>What it is</h3><ul className="lh-list">{is.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div className="lh-card"><h3>What it is not</h3><ul className="lh-list lh-list--no">{isNot.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div className="lh-card"><h3>Who might show up for you</h3><ul className="lh-list">{who.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
        </div>
      </section>

      <section id="status" className="lh-section lh-section--alt">
        <div className="container container--narrow">
          <div className="stack">
            <Eyebrow>Where we are</Eyebrow>
            <h2>We are building this carefully</h2>
            <p>IntoTheLighthouse is not open yet. We are not going to pretend there is a support network waiting before there is one. Peer support involves real people at vulnerable moments, so we will switch it on only when the safeguards below are in place.</p>
            <p>IntoTheLighthouse is its own project, and it is designed so that it can grow into a product of its own without Empatherapy having to change.</p>
            <div className="row"><Button href="mailto:hello@empatherapy.co?subject=IntoTheLighthouse" variant="lantern">Tell us you are interested</Button></div>
          </div>
        </div>
      </section>

      <section id="safety" className="lh-section">
        <div className="container container--narrow">
          <div className="stack" style={{ gap: '1.6rem' }}>
            <Eyebrow>Safeguarding</Eyebrow>
            <h2>What has to be true before anyone is connected</h2>
            <ul className="lh-list">{safeguards.map((x) => <li key={x}>{x}</li>)}</ul>
            <div className="lh-signpost" role="note">
              <h3>If you need help right now</h3>
              <p>IntoTheLighthouse is not an emergency service. If you are in danger, call <strong>000</strong>. For crisis support in Australia, call <strong>Lifeline on 13 11 14</strong>, any time. If you are elsewhere, please contact your local emergency number or crisis line.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lh-section lh-section--alt" style={{ textAlign: 'center' }}>
        <div className="container container--narrow">
          <div className="stack" style={{ justifyItems: 'center' }}>
            <h2>Looking for a practice or a practitioner instead?</h2>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Button href="/discover" variant="lantern">Begin your discovery</Button>
              <Button href="/alchemists" variant="outline" style={{ borderColor: 'var(--lantern)', color: 'var(--lantern)' }}>Discover Alchemists</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
