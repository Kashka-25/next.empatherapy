import Link from 'next/link';
import Button from '@/components/ui/Button';
import FadeIn from '@/components/ui/FadeIn';
import Eyebrow from '@/components/ui/Eyebrow';
import AlchemistCard from '@/components/alchemists/AlchemistCard';
import ModalityCard from '@/components/modalities/ModalityCard';
import { TeaScene, Lighthouse, HoneyDrip, Sprig } from '@/components/art/Botanicals';
import { curatedOrder } from '@/lib/content.mjs';
import { publicContent } from '@/lib/content-store.mjs';
import { currentFeatures } from '@/lib/features.mjs';

export const revalidate = 3600; // refresh hourly so the weekly feature rolls over without a redeploy

export const metadata = { title: { absolute: 'Empatherapy | Discover new pathways to yourself' } };

const beliefs = [
  { t: 'You are not broken', p: 'You do not need to be fixed to deserve support.' },
  { t: 'Emotions are messengers', p: 'Difficult experiences can open the door to awareness and growth.' },
  { t: 'You are your own greatest healer', p: 'Practitioners help you rediscover your own capabilities.' },
  { t: 'There are many pathways', p: 'No single practice or person is right for everyone.' },
];

export default async function HomePage() {
  const { alchemists, modalities } = await publicContent();
  const features = await currentFeatures(new Date());
  const featured = curatedOrder(alchemists.filter((a) => a.featured_status)).slice(0, 3);
  const modalityById = (id) => modalities.find((m) => m.id === id);

  return (
    <>
      {/* Warm welcome first. The directory comes after. */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__grid">
          <div className="hero__copy">
            <span className="hand">welcome, come on in</span>
            <h1 id="hero-title">Your journey starts <em>somewhere.</em></h1>
            <p className="lede">Discover new pathways, meet people who care, and explore what resonates with you.</p>
            <div className="row">
              <Button href="/discover" size="lg">Begin your discovery</Button>
              <Button href="/alchemists" variant="outline" size="lg">Explore Alchemists</Button>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>A few gentle questions. No sign-up needed.</p>
          </div>
          <div className="hero__art"><TeaScene /></div>
        </div>
      </section>

      {/* The signature invitation */}
      <section className="section section--lemon" style={{ paddingTop: 'calc(var(--section-pad) * 0.6)' }}>
        <div className="container">
          <FadeIn>
            <div className="invite">
              <div className="stack">
                <Eyebrow>Alchemist Discovery</Eyebrow>
                <h2>You don&rsquo;t need to know exactly what you&rsquo;re looking for.</h2>
                <p className="invite__prompt">Start wherever you are. Tell us a little about what&rsquo;s on your mind, and we&rsquo;ll help you explore some possibilities.</p>
                <div className="row"><Button href="/discover">Begin your discovery</Button></div>
              </div>
              <div className="stack" aria-hidden="true">
                <span className="hand">for example&hellip;</span>
                <div className="invite__mock">I&rsquo;ve been feeling a bit disconnected from myself lately, and I&rsquo;m curious about trying something new.</div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Weekly modalities */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <Eyebrow>This week in Explore Modalities</Eyebrow>
            <h2>Something you may never have come across</h2>
            <p>Each week we introduce a few approaches to wellbeing in plain language: where they come from, what a session is like, what research says, and who offers them.</p>
          </div>
          <div className="feature-grid">
            {features.map((f, i) => {
              const m = modalityById(f.modality_id);
              return m ? <FadeIn key={f.id} delay={i + 1}><ModalityCard modality={m} intro={f.editorial_introduction} /></FadeIn> : null;
            })}
          </div>
          <p style={{ marginTop: '2rem' }}><Link href="/modalities" className="link-arrow">See the whole library</Link></p>
        </div>
      </section>

      {/* Featured Alchemists */}
      <section className="section section--linen">
        <div className="container">
          <div className="section-head">
            <Eyebrow>Discover Alchemists</Eyebrow>
            <h2>People who turned their own journeys into something to share</h2>
            <p>Every Alchemist tells their story, their philosophy and the training and experience behind their work, so you can see not only what they offer but why.</p>
          </div>
          <div className="grid-cards">
            {featured.map((a, i) => <FadeIn key={a.id} delay={i + 1}><AlchemistCard alchemist={a} modalities={modalities} /></FadeIn>)}
          </div>
          <p style={{ marginTop: '2rem' }}><Link href="/alchemists" className="link-arrow">Meet all Alchemists</Link></p>
        </div>
      </section>

      {/* IntoTheLighthouse */}
      <HoneyDrip fill="var(--linen)" className="drip" />
      <section className="band-night section" style={{ marginTop: '-1px' }}>
        <div className="glow" style={{ width: 520, height: 520, right: -120, top: -80 }} />
        <div className="container lighthouse-split" style={{ position: 'relative' }}>
          <div className="stack">
            <Eyebrow>IntoTheLighthouse</Eyebrow>
            <h2>Sometimes you don&rsquo;t need a session. You just need someone to care.</h2>
            <p className="lede" style={{ color: 'rgba(238,243,238,.85)' }}>IntoTheLighthouse is a space for human connection and peer support. You don&rsquo;t have to navigate everything alone, and you can always find a little light.</p>
            <div className="row"><Button href="/lighthouse" variant="outline">Visit the lighthouse</Button></div>
          </div>
          <div className="lighthouse-split__art"><Lighthouse size={190} /></div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="section">
        <div className="container">
          <div className="section-head section-head--center">
            <Sprig size={34} color="var(--botanical)" />
            <h2>We don&rsquo;t believe people need to be fixed</h2>
            <p>We believe they deserve to be seen, understood and supported to find their own way forward.</p>
          </div>
          <div className="beliefs">
            {beliefs.map((b) => <div className="belief" key={b.t}><h3>{b.t}</h3><p>{b.p}</p></div>)}
          </div>
          <p style={{ marginTop: '2rem', textAlign: 'center', marginInline: 'auto' }}><Link href="/about" className="link-arrow">Read our philosophy</Link></p>
        </div>
      </section>

      {/* Become an Alchemist */}
      <section className="section section--sage">
        <div className="container container--narrow" style={{ textAlign: 'center' }}>
          <div className="stack" style={{ justifyItems: 'center' }}>
            <span className="hand">turning shadows into beacons</span>
            <h2>Have you turned your own experience into something others can learn from?</h2>
            <p className="lede">Whether you are a trained therapist, a holistic practitioner or someone who has built a practice from lived experience, we would love to hear your story.</p>
            <Button href="/become-an-alchemist">Become an Alchemist</Button>
          </div>
        </div>
      </section>
    </>
  );
}
