'use client';
import Eyebrow from '@/components/ui/Eyebrow';

/** Shown if something unexpected breaks while a page is drawn. Never shows technical details to visitors. */
export default function Error({ reset }) {
  return (
    <section className="page-head">
      <div className="container container--narrow">
        <Eyebrow>Something went wrong</Eyebrow>
        <h1>That did not go to plan</h1>
        <p className="lede">Something broke on our side. Please try again in a moment. If it keeps happening, email <a href="mailto:hello@empatherapy.co">hello@empatherapy.co</a>.</p>
        <div className="row" style={{ marginTop: '1.4rem' }}>
          <button type="button" className="btn btn--honey" onClick={() => reset()}>Try again</button>
          <a href="/" className="btn btn--soft">Back to the beginning</a>
        </div>
      </div>
    </section>
  );
}
