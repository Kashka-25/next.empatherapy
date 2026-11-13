import AlchemistAvatar from './AlchemistAvatar';
import { photoUrl, publicPhotos } from '@/lib/photos.mjs';

/**
 * The Alchemist's profile picture when they have one, otherwise the illustrated placeholder.
 * `label` false is for places where the surrounding link already names the person.
 */
export default function AlchemistPortrait({ alchemist, label = true }) {
  const p = publicPhotos(alchemist)[0];
  if (!p) return <AlchemistAvatar alchemist={alchemist} label={label} />;
  return <img className="portrait-img" src={photoUrl(p.id)} alt={label ? p.alt : ''} width={p.w} height={p.h} loading={label ? 'eager' : 'lazy'} decoding="async" />;
}
