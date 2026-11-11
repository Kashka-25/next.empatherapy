import Link from 'next/link';
import AlchemistAvatar from './AlchemistAvatar';
import { modalitiesOf, placeAndFormat, priceFrom } from '@/lib/content.mjs';

export default function AlchemistCard({ alchemist: a, modalities }) {
  const mods = modalitiesOf(a, modalities).slice(0, 3);
  return (
    <Link href={`/alchemists/${a.slug}`} className="card" aria-label={`${a.name}, ${a.title}`}>
      <div className="card__portrait"><AlchemistAvatar alchemist={a} label={false} /></div>
      <div className="card__body">
        <div className="row">
          {a.demo ? <span className="tag tag--demo">Example profile</span> : <span className="tag tag--honey">Founding Alchemist</span>}
        </div>
        <h3>{a.name}</h3>
        <p className="eyebrow">{a.offering_name || a.title}</p>
        <p>{a.short_bio}</p>
        <div className="row">
          {mods.map((m) => <span key={m.slug} className="tag tag--sage">{m.modality.name}</span>)}
        </div>
        <div className="card__meta">
          <span>{placeAndFormat(a)}</span>
          <span>{priceFrom(a)}</span>
        </div>
      </div>
    </Link>
  );
}
