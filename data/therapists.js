export const therapists = [
  {
    name: 'Cassidy Dugan',
    slug: 'cass-dugan',
    title: 'Empathic Guide & Founder',
    initials: 'C',
    credentials: ['AHHCA Registered', 'CPAT-Therapist Certified', 'Mind Medicine Australia'],
    shortBio:
      'Holistic counsellor blending somatic awareness, emotional mapping, and integrative inquiry. Rooted in deep presence and compassion.',
    bio: [
      "Cassidy is a holistic counsellor, empathic guide, and the founder of Empatherapy. His work is rooted in the belief that emotions are not the enemy — they are messengers carrying the intelligence of your deeper self.",
      "Sessions are intuitive, responsive, and deeply human. Drawing from somatic awareness, Internal Family Systems principles, shadow work, energy healing, and psychedelic integration support, each session moves organically based on what arises.",
      "Cassidy works with people who feel deeply — empaths, overthinkers, seekers, and those ready to stop running from themselves and come home.",
    ],
    approach:
      "Sessions are not prescriptive. They begin with open dialogue and unfold based on your emotional landscape — what is alive, what wants attention, what is ready to move.",
    modalities: [
      'Somatic guidance',
      'Internal Family Systems (IFS)',
      'Reiki & energy healing',
      'Meditation & visualisation',
      'Shadow work',
      'Emotional mapping',
      'Psychedelic integration support',
    ],
    specialties: [
      'Holistic Counselling',
      'Psychedelic Integration',
      'Shadow Work',
      'Reiki',
      'EER',
      'FreeTheDream',
    ],
    areas: [
      'Emotional awareness & regulation',
      'Identity exploration & self-discovery',
      'Psychedelic preparation & integration',
      'Grief, loss & life transitions',
      'Nervous system regulation',
      'Shadow work & inner child',
      'Empaths & highly sensitive people',
      'Spiritual emergence support',
      'Burnout & emotional exhaustion',
      'Fear-based patterns & loops',
    ],
    sessions: [
      {
        title: 'Trial Session',
        duration: '30 min',
        price: '$110 AUD',
        description: 'A gentle introduction to working together. Try before committing.',
        highlight: true,
        tag: 'Start Here',
      },
      {
        title: '1:1 Empatherapy',
        duration: '60 min',
        price: '$220 AUD',
        description: 'Full session with open dialogue, somatic guidance, and intuitive care.',
      },
      {
        title: 'Psychedelic Integration',
        duration: '60–90 min',
        price: '$225–$325 AUD',
        description: 'Support for anchoring insights from your journey into daily life.',
      },
      {
        title: 'EER — Emotional Emergency',
        duration: '30–45 min',
        price: '$100–$125 AUD',
        description: 'Crisis-response support for moments of emotional overwhelm.',
      },
      {
        title: 'Reiki & Energy Healing',
        duration: '60 min',
        price: 'From $100 AUD',
        description: 'For empaths and sensitive beings feeling energetically burdened.',
      },
      {
        title: 'FreeTheDream Mentorship',
        duration: 'Flexible',
        price: 'Custom',
        description: 'Business mentorship for healers, coaches, and creatives.',
      },
    ],
    bookingEmail: 'hello@empatherapy.co',
    available: true,
  },
];

export function getTherapistBySlug(slug) {
  return therapists.find((t) => t.slug === slug) ?? null;
}
