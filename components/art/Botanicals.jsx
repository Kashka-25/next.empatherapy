/**
 * Empatherapy's visual signature: honey warmth, botanical curiosity, the comfort of coming home.
 * All illustration is inline SVG so it stays crisp, light and themeable.
 */

/** A small hand-drawn sprig. Used as a mark and as a quiet decoration. */
export function Sprig({ size = 26, color = 'currentColor', className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 29V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 20c-5 0-8-3-8.5-7 5 0 8 2.6 8.5 7Z" fill={color} opacity=".85" />
      <path d="M16 15c4.6 0 7.4-2.7 8-6.5-4.6 0-7.4 2.4-8 6.5Z" fill={color} opacity=".65" />
      <path d="M16 9c.2-2.4 1.2-4.4 3-6-.2 2.8-1.2 4.8-3 6Z" fill={color} />
    </svg>
  );
}

/** A lemon slice: used for discovery and as a bright accent. */
export function LemonSlice({ size = 64, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#F3E6A6" stroke="#D9A441" strokeWidth="3" />
      <circle cx="32" cy="32" r="22" fill="#FAF3CE" stroke="#E8BE67" strokeWidth="1.5" />
      {[0, 45, 90, 135].map((a) => (
        <line key={a} x1="32" y1="12" x2="32" y2="52" stroke="#E8BE67" strokeWidth="1.6" transform={`rotate(${a} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="3" fill="#E8BE67" />
    </svg>
  );
}

/** A honey drip that sits along the top edge of a section. `fill` is the colour of the section above. */
export function HoneyDrip({ fill = 'var(--lemon-soft)', className = 'drip' }) {
  return (
    <svg className={className} viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 0H1200V12C1170 12 1160 12 1146 12 1128 12 1124 30 1110 30S1092 12 1074 12C1010 12 990 12 960 12 940 12 934 36 918 36S898 12 878 12C780 12 740 12 700 12 678 12 672 26 658 26S640 12 620 12C520 12 480 12 430 12 412 12 408 32 392 32S372 12 352 12C260 12 200 12 150 12 132 12 128 28 114 28S96 12 76 12C50 12 30 12 0 12Z" fill={fill} />
    </svg>
  );
}

/** The hero: a sunlit window sill with a cup of lemon and honey tea. */
export function TeaScene() {
  return (
    <svg viewBox="0 0 480 440" role="img" aria-label="An illustration of a sunlit window with a cup of lemon and honey tea, a lemon slice, a honey jar and a potted plant">
      <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF6C9" />
          <stop offset="1" stopColor="#F7E39A" />
        </linearGradient>
      </defs>
      {/* window light on the wall */}
      <g className="beam">
        <polygon points="130,330 230,330 300,430 90,430" fill="#E8BE67" opacity=".16" />
        <polygon points="250,330 330,330 410,430 230,430" fill="#E8BE67" opacity=".12" />
      </g>
      {/* arched window */}
      <path d="M110 330V130a130 130 0 0 1 260 0v200Z" fill="url(#glass)" stroke="#B58A5A" strokeWidth="7" />
      <path d="M240 0V330M110 190H370" stroke="#B58A5A" strokeWidth="4" transform="translate(0 0)" />
      <path d="M240 20V330" stroke="#B58A5A" strokeWidth="4" />
      <circle cx="300" cy="150" r="34" fill="#F3C85E" opacity=".9" />
      <path d="M110 330c40-40 90-52 130-30 50 26 90 8 130-14v44Z" fill="#A6B59A" opacity=".7" />
      {/* sill */}
      <rect x="84" y="330" width="312" height="16" rx="6" fill="#B58A5A" />
      <rect x="96" y="346" width="288" height="8" rx="4" fill="#9B7347" opacity=".6" />
      {/* plant */}
      <path d="M128 330c-2-20 2-34 10-44l18 0c8 10 12 24 10 44Z" fill="#C9886B" />
      <rect x="124" y="282" width="46" height="10" rx="4" fill="#B97455" />
      <path d="M147 282c-4-34-18-52-34-58 2 28 14 46 34 58Z" fill="#667D62" />
      <path d="M147 282c0-40 6-64 20-82 6 32-2 58-20 82Z" fill="#7C9578" />
      <path d="M147 282c10-26 30-40 52-42-6 24-24 38-52 42Z" fill="#44583F" />
      {/* honey jar */}
      <rect x="200" y="288" width="40" height="42" rx="9" fill="#E8BE67" stroke="#B9823E" strokeWidth="3" />
      <rect x="198" y="278" width="44" height="14" rx="5" fill="#B9823E" />
      <rect x="208" y="302" width="24" height="16" rx="3" fill="#FBF7EE" opacity=".8" />
      {/* tea cup and saucer */}
      <ellipse cx="318" cy="330" rx="62" ry="9" fill="#FFFDF7" stroke="#E7DCC4" strokeWidth="2" />
      <path d="M268 280h100v14c0 26-22 44-50 44s-50-18-50-44Z" fill="#FFFDF7" stroke="#D9C9A0" strokeWidth="3" />
      <path d="M368 292c26-2 28 26 0 30" fill="none" stroke="#D9C9A0" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="318" cy="281" rx="50" ry="9" fill="#F0C65C" />
      <ellipse cx="318" cy="281" rx="44" ry="6" fill="#E8B84A" opacity=".7" />
      <circle cx="334" cy="281" r="12" fill="#FAF3CE" stroke="#E8BE67" strokeWidth="2" />
      <path d="M334 270v22M323 281h22" stroke="#E8BE67" strokeWidth="1.3" />
      {/* steam */}
      <g fill="none" stroke="#B9823E" strokeWidth="3" strokeLinecap="round">
        <path className="steam" d="M298 262c-8-10 8-16 0-28" />
        <path className="steam" d="M320 258c-8-10 8-18 0-32" />
        <path className="steam" d="M342 262c-8-10 8-16 0-28" />
      </g>
      {/* lemon on the sill */}
      <ellipse cx="258" cy="321" rx="16" ry="10" fill="#F3D45E" stroke="#D9A441" strokeWidth="2.5" />
      <path d="M272 318c4-1 6-3 7-6" stroke="#667D62" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* hand-written note */}
      <text x="238" y="400" textAnchor="middle" fontFamily="Caveat, cursive" fontSize="26" fill="#8A5C1E" transform="rotate(-3 238 400)">come in, take a breath</text>
    </svg>
  );
}

/** The IntoTheLighthouse mark: a small lantern-lit lighthouse. */
export function Lighthouse({ size = 220 }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 200 250" role="img" aria-label="A small lighthouse with its lantern lit">
      <defs>
        <linearGradient id="lh-beam-l" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#F6D98B" stopOpacity=".5" /><stop offset="1" stopColor="#F6D98B" stopOpacity="0" /></linearGradient>
        <linearGradient id="lh-beam-r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F6D98B" stopOpacity=".5" /><stop offset="1" stopColor="#F6D98B" stopOpacity="0" /></linearGradient>
        <radialGradient id="lh-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#F6D98B" stopOpacity=".9" />
          <stop offset="1" stopColor="#F6D98B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="64" r="64" fill="url(#lh-glow)" className="beam" />
      <polygon points="100,64 -10,30 -10,98" fill="url(#lh-beam-l)" className="beam" />
      <polygon points="100,64 210,30 210,98" fill="url(#lh-beam-r)" className="beam" />
      <path d="M78 232l12-130h20l12 130Z" fill="#F4EEDF" />
      <path d="M82 190h36l-2 14H80ZM86 146h28l-2 14H84Z" fill="#C9886B" opacity=".9" />
      <rect x="84" y="86" width="32" height="18" fill="#2A4550" />
      <rect x="86" y="56" width="28" height="30" rx="3" fill="#F6D98B" stroke="#FBF7EE" strokeWidth="3" />
      <polygon points="82,56 118,56 100,34" fill="#C9886B" />
      <rect x="64" y="232" width="72" height="8" rx="4" fill="#2A4550" />
      <path d="M0 242c30-8 50-4 70 0M130 242c20-4 40-8 70 0" stroke="#5FA8A3" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

const ICONS = {
  breath: 'M4 14c4-8 12-8 16 0M8 18c2-4 6-4 8 0',
  body: 'M12 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM12 9v6M7 11l5 2 5-2M9 21l3-6 3 6',
  energy: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3',
  sound: 'M5 9v6M9 6v12M13 4v16M17 8v8M21 10v4',
  creative: 'M4 20l4-1 11-11-3-3L5 16l-1 4ZM14 6l3 3',
  nature: 'M12 21V9M12 13c-5 0-7-3-7-7 4 0 7 2 7 7ZM12 11c4 0 6-2.4 6-6-4 0-6 2-6 6Z',
  mindful: 'M12 5c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5ZM6 20c1-3 3-4 6-4s5 1 6 4',
  talk: 'M4 5h16v10H9l-5 4V5Z',
  parts: 'M8 8a3 3 0 1 0 0 .1ZM16 8a3 3 0 1 0 0 .1ZM12 16a3 3 0 1 0 0 .1Z',
  lantern: 'M12 3v3M8 8h8v9H8ZM6 20h12M12 11v3',
};

/** A simple line icon for a modality category. */
export function Icon({ name = 'nature' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ICONS.nature} />
    </svg>
  );
}
