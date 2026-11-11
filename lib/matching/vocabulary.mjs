/**
 * The vocabulary behind discovery matching. Plain data, easy to read and edit.
 *
 * A THEME is something a Seeker may describe or hope for. Each has a plain-language `label` used in
 * explanations ("You mentioned ...") and `keywords`: words or phrases that suggest it. A keyword matches
 * at the start of a word, so "overwhelm" also finds "overwhelmed". Synonyms simply sit in the list.
 * Modalities and Alchemists carry the same theme ids, so matching is just overlap on a shared vocabulary.
 */

export const THEMES = {
  overwhelm: { label: 'feeling overwhelmed or stressed', keywords: ['overwhelm', 'stress', 'too much', 'anxious', 'anxiety', 'panic', 'frazzled', 'wired', 'on edge', 'burnt', 'burnout', 'burn out', 'exhaust', 'tense', 'pressure', 'racing'] },
  rest: { label: 'wanting rest and calm', keywords: ['tired', 'rest', 'calm', 'relax', 'peace', 'sleep', 'slow down', 'drained', 'quiet', 'recharge'] },
  disconnection: { label: 'feeling disconnected', keywords: ['disconnect', 'numb', 'empty', 'feel lost', 'feeling lost', 'lost myself', 'lost touch', 'detached', 'cut off', 'distant', 'adrift', 'unreal'] },
  emotions: { label: 'wanting to understand your emotions', keywords: ['emotion', 'feelings', 'mood', 'cry', 'angry', 'anger', 'sadness', 'feel too much', 'big feelings'] },
  body: { label: 'reconnecting with your body', keywords: ['body', 'physical', 'tension', 'chest', 'stomach', 'sensation', 'somatic', 'nervous system', 'breath'] },
  grief: { label: 'grief or loss', keywords: ['grief', 'grieving', 'loss', 'lost someone', 'lost my', 'lost a ', 'passed away', 'passing of', 'funeral', 'died', 'death', 'bereave', 'mourning'] },
  creativity: { label: 'expressing yourself creatively', keywords: ['creative', 'creativity', 'art', 'draw', 'paint', 'writing', 'music', 'express', 'blocked'] },
  spirituality: { label: 'exploring your spirituality', keywords: ['spiritual', 'meaning', 'purpose', 'faith', 'soul', 'sacred', 'energy'] },
  difficult: { label: 'processing something difficult', keywords: ['trauma', 'traumatic', 'painful', 'hard time', 'difficult experience', 'something difficult', 'haunt', 'flashback', 'process what', 'hurt'] },
  grounding: { label: 'feeling more grounded', keywords: ['ground', 'centred', 'centered', 'steady', 'stable', 'present', 'anchor'] },
  curiosity: { label: 'being curious about something new', keywords: ['curious', 'curiosity', 'something new', 'try something', 'explore', 'interesting', 'discover', 'experiment', 'open to'] },
  self: { label: 'understanding yourself more deeply', keywords: ['myself', 'who i am', 'identity', 'inner world', 'self', 'know me'] },
  coping: { label: 'building tools to cope', keywords: ['coping', 'tools', 'techniques', 'manage', 'strategies', 'habit', 'routine'] },
  sensitivity: { label: 'being a highly sensitive person', keywords: ['empath', 'sensitive', 'absorb', 'pick up on', 'overstimulated', 'boundaries'] },
  transition: { label: 'going through a life change', keywords: ['change', 'transition', 'divorce', 'breakup', 'separat', 'moving', 'new job', 'career', 'retire', 'ending', 'midlife', 'stuck'] },
  nature: { label: 'time in nature', keywords: ['nature', 'outdoors', 'outside', 'forest', 'bush', 'garden', 'walk', 'trees', 'fresh air'] },
  parts: { label: 'inner conflict or a harsh inner critic', keywords: ['inner critic', 'critic', 'parts', 'conflict', 'torn', 'sabotage', 'part of me', 'two minds', 'shame', 'guilt', 'harsh on myself'] },
};

/** Step 2 of the flow: tappable hopes. Each maps to themes with full weight. */
export const INTENTS = [
  { id: 'emotions', label: 'Understanding my emotions', themes: ['emotions'] },
  { id: 'grounded', label: 'Feeling more grounded', themes: ['grounding', 'rest'] },
  { id: 'reconnect', label: 'Reconnecting with myself', themes: ['self', 'disconnection'] },
  { id: 'spiritual', label: 'Exploring my spirituality', themes: ['spirituality'] },
  { id: 'coping', label: 'Developing new coping tools', themes: ['coping'] },
  { id: 'creative', label: 'Expressing myself creatively', themes: ['creativity'] },
  { id: 'process', label: 'Processing difficult experiences', themes: ['difficult'] },
  { id: 'discover', label: 'Simply discovering something interesting', themes: ['curiosity'] },
];

/** Step 3 of the flow: what the Seeker is open to. `surprise` means "no preference". */
export const STYLES = [
  { id: 'talking', label: 'Talking and reflective practices' },
  { id: 'body', label: 'Body-based and somatic practices' },
  { id: 'energy', label: 'Energy and spiritual practices' },
  { id: 'creative', label: 'Creative and expressive practices' },
  { id: 'nature', label: 'Nature-based experiences' },
  { id: 'mindful', label: 'Meditation and mindfulness' },
  { id: 'experimental', label: 'Unconventional or experimental approaches' },
  { id: 'surprise', label: "I'm not sure yet. Surprise me." },
];

/** Phrases that mean the Seeker may be in danger. When found, we show support first and suggest nothing. */
export const CRISIS_PHRASES = [
  'suicid', 'kill myself', 'end my life', 'want to die', 'wanna die', 'self harm', 'hurt myself', 'harm myself',
  'dont want to be here', 'no reason to live', 'better off dead', 'end it all', 'take my own life',
];

export const SUPPORT_MESSAGE =
  'What you shared sounds heavy, and your safety matters most. Please reach out to someone right now. In Australia you can call Lifeline on 13 11 14 (24 hours), or 000 if you are in immediate danger. If you are elsewhere, your local emergency number or crisis line can help. Empatherapy is a place to explore and connect. It is not crisis care.';

export const DISCLAIMER =
  'These are exploratory suggestions, not a diagnosis, a treatment recommendation or a guarantee that something will suit you. Please speak with a doctor or qualified professional about health concerns.';
