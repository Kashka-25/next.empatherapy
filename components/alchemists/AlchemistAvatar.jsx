/**
 * An illustrated portrait. Real photographs will replace these when Alchemists upload their own
 * (the data model has a `portrait` field for that). Until then each Alchemist gets their own colours,
 * a small botanical motif and their initials, so the directory still feels personal.
 */
const MOTIFS = {
  sun: (
    <g stroke="#fff" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" fill="none">
      <circle cx="150" cy="150" r="13" fill="#fff" fillOpacity=".4" stroke="none" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="150" y1="126" x2="150" y2="118" transform={`rotate(${a} 150 150)`} />)}
    </g>
  ),
  leaf: <path d="M120 190c0-40 20-66 66-72-2 44-26 70-66 72Zm0 0c10-26 24-42 42-52" fill="#fff" fillOpacity=".4" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />,
  wave: <g fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="3.5" strokeLinecap="round"><path d="M110 150c12-12 24 12 36 0s24 12 36 0" /><path d="M110 168c12-12 24 12 36 0s24 12 36 0" /><path d="M110 186c12-12 24 12 36 0s24 12 36 0" /></g>,
  flower: <g fill="#fff" fillOpacity=".4" stroke="#fff" strokeOpacity=".55" strokeWidth="2">{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="150" cy="136" rx="8" ry="16" transform={`rotate(${a} 150 150)`} />)}<circle cx="150" cy="150" r="7" fill="#fff" fillOpacity=".7" /></g>,
  mountain: <g fill="#fff" fillOpacity=".38" stroke="#fff" strokeOpacity=".55" strokeWidth="2"><path d="M100 196l36-60 22 32 14-18 28 46Z" /></g>,
  lantern: <g fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round"><path d="M150 118v8M138 130h24v36h-24ZM134 172h32" /><rect x="142" y="138" width="16" height="22" fill="#fff" fillOpacity=".35" stroke="none" /></g>,
};

export default function AlchemistAvatar({ alchemist, label = true }) {
  const [a, b] = alchemist.palette;
  const id = `av-${alchemist.slug}`;
  return (
    <svg viewBox="0 0 200 200" role={label ? 'img' : undefined} aria-label={label ? `Illustrated portrait placeholder for ${alchemist.name}` : undefined} aria-hidden={label ? undefined : true} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${id})`} />
      <circle cx="40" cy="48" r="70" fill="#fff" opacity=".12" />
      {MOTIFS[alchemist.motif] ?? MOTIFS.leaf}
      <text x="100" y="112" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="62" fontWeight="400" fill="#fff" fillOpacity=".95">{alchemist.initials}</text>
    </svg>
  );
}
