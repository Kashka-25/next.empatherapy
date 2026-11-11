import Link from 'next/link';
import { Icon } from '@/components/art/Botanicals';

export default function ModalityCard({ modality: m, intro }) {
  return (
    <Link href={`/modalities/${m.slug}`} className="modality-card" aria-label={`Learn about ${m.name}`}>
      <span className="modality-card__icon"><Icon name={m.icon} /></span>
      <h3>{m.name}</h3>
      {intro ? <p className="hand" style={{ fontSize: '1.25rem' }}>{intro}</p> : null}
      <p>{m.short_description}</p>
      <span className="link-arrow" style={{ justifySelf: 'start' }}>Learn more</span>
    </Link>
  );
}
