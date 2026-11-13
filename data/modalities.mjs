/**
 * Modality library (sample editorial content for the demonstration).
 *
 * `themes` and `styles` are the matching tags (see lib/matching/vocabulary.mjs).
 * Evidence is written as labelled parts so traditional belief, practitioner perspective,
 * preliminary research and established evidence are never blended together.
 * This is general education. It is not medical advice, and an editor should review it before launch.
 *
 * @typedef {{ kind: 'traditional'|'practitioner'|'research'|'established', text: string }} EvidenceItem
 * @typedef {Object} Modality
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {'talking'|'body'|'energy'|'creative'|'nature'|'mindful'|'experimental'} category
 * @property {string} icon
 * @property {string[]} themes
 * @property {string[]} styles
 * @property {boolean} requires_formal_training  Alchemists only match on this when their training is formal.
 */

export const modalities = [
  {
    id: 'mod-breathwork',
    name: 'Breathwork',
    slug: 'breathwork',
    category: 'body',
    icon: 'breath',
    themes: ['overwhelm', 'rest', 'body', 'grounding', 'coping'],
    styles: ['body', 'mindful'],
    requires_formal_training: false,
    short_description: 'Using the pace and depth of your breath to change how you feel, from slow and calming to deep and energising.',
    full_description:
      'Breathwork is an umbrella for practices that guide how you breathe. Some are slow and gentle, like lengthening the exhale. Others are more intense and use sustained, rhythmic breathing to bring up strong sensations. A good facilitator matches the style to the person and keeps the pace in your hands.',
    origins:
      'Breath practices appear in many traditions, including yogic pranayama, Taoist qigong and Buddhist meditation. Modern breathwork styles grew from the 20th century onwards.',
    practice_description:
      'You usually lie down or sit comfortably while a facilitator guides patterns of breathing, often with music or silence. You can stop or return to normal breathing at any time.',
    typical_session:
      'A conversation about what you want and any health considerations, a guided breathing practice for 20 to 45 minutes, and quiet time afterwards to settle and talk about what you noticed.',
    commonly_explored_for: ['Feeling stressed or wound up', 'Learning a tool to calm the body', 'Reconnecting with physical sensation', 'Releasing built-up tension'],
    evidence_information: [
      { kind: 'practitioner', text: 'Facilitators often describe breath as a bridge between body and emotion, a way to notice and soften what is held.' },
      { kind: 'research', text: 'Slow, paced breathing has been studied for stress and relaxation, with encouraging but mixed results. Intense breathing styles have less research behind them.' },
    ],
    limitations:
      'Breathwork can bring up strong feelings and is not a treatment for any condition. Quality varies a lot between facilitators.',
    contraindications:
      'Intense breathing styles are generally not advised in pregnancy, or with epilepsy, serious heart or blood pressure conditions, severe asthma, or a history of panic or psychosis, unless a doctor agrees. Please check with your doctor first.',
    related_modalities: ['somatic-practices', 'meditation-mindfulness', 'sound-healing'],
    images: ['breath'],
    publication_status: 'published',
  },
  {
    id: 'mod-somatic',
    name: 'Somatic practices',
    slug: 'somatic-practices',
    category: 'body',
    icon: 'body',
    themes: ['body', 'overwhelm', 'difficult', 'grounding', 'disconnection', 'rest'],
    styles: ['body'],
    requires_formal_training: false,
    short_description: 'Gentle, body-first approaches that notice sensation, movement and breath as a way of understanding how you feel.',
    full_description:
      'Somatic means "of the body". These approaches treat the body as a source of information rather than something to push through. Instead of talking about a feeling, you notice where it lives, how it moves and what helps it ease.',
    origins:
      'Somatic work draws on several 20th-century traditions, including body-oriented psychotherapy, movement education and trauma-informed bodywork.',
    practice_description:
      'Slow attention to sensation, grounding, orienting to the room, small movements and sometimes touch (only with clear consent). Pace and choice stay with you throughout.',
    typical_session:
      'A check-in, a slow exploration of what you notice in your body, simple practices to settle or explore, and time to integrate what came up.',
    commonly_explored_for: ['Feeling disconnected from your body', 'Carrying tension or stress physically', 'Learning to settle your nervous system', 'Gently approaching difficult experiences at your own pace'],
    evidence_information: [
      { kind: 'practitioner', text: 'Practitioners describe the body as holding patterns that talking alone can miss.' },
      { kind: 'research', text: 'Research on body-oriented approaches is growing and some studies are encouraging for stress and trauma-related difficulties. Many studies are small, so conclusions are still developing.' },
    ],
    limitations: 'Not a substitute for medical or psychological care. "Somatic" is a broad term, so ask any practitioner what their training covers.',
    contraindications: 'Anyone with significant trauma, or a medical condition affecting movement or sensation, is encouraged to work with a suitably trained practitioner and to say what pace feels safe.',
    related_modalities: ['breathwork', 'meditation-mindfulness', 'expressive-arts'],
    images: ['body'],
    publication_status: 'published',
  },
  {
    id: 'mod-reiki',
    name: 'Reiki and energy work',
    slug: 'reiki-energy-work',
    category: 'energy',
    icon: 'energy',
    themes: ['rest', 'sensitivity', 'spirituality', 'overwhelm', 'curiosity'],
    styles: ['energy', 'experimental'],
    requires_formal_training: false,
    short_description: 'A hands-light or hands-off practice rooted in the idea of channelling life energy, often experienced as deep rest.',
    full_description:
      'Reiki is a Japanese-originated practice in which a practitioner places their hands lightly on or just above the body. Many people find it deeply relaxing, whatever they believe about energy.',
    origins: 'Developed by Mikao Usui in Japan in the early 20th century, and later spread through the West. Other energy practices exist across many cultures.',
    practice_description: 'You lie or sit fully clothed. The practitioner holds a series of hand positions, usually in near silence or with soft music.',
    typical_session: 'A short chat, around 45 minutes of hands-on or hands-off practice, then a quiet moment to return and share anything you noticed.',
    commonly_explored_for: ['Rest and relaxation', 'Feeling energetically drained or sensitive to others', 'A quiet space with no pressure to talk', 'Spiritual curiosity'],
    evidence_information: [
      { kind: 'traditional', text: 'In the tradition, Reiki channels universal life energy to support balance. This is a belief, not a measured finding.' },
      { kind: 'practitioner', text: 'Many practitioners and clients describe feeling calm, warm and cared for.' },
      { kind: 'research', text: 'Studies have not shown an effect beyond relaxation and the experience of being cared for, and the quality of research is mixed.' },
    ],
    limitations: 'Reiki does not treat or cure medical conditions and should never replace medical care.',
    contraindications: 'Generally gentle. If you are unwell or in treatment, please keep seeing your doctor and mention Reiki to them.',
    related_modalities: ['sound-healing', 'meditation-mindfulness', 'breathwork'],
    images: ['energy'],
    publication_status: 'published',
  },
  {
    id: 'mod-sound',
    name: 'Sound healing',
    slug: 'sound-healing',
    category: 'energy',
    icon: 'sound',
    themes: ['rest', 'overwhelm', 'curiosity', 'sensitivity', 'spirituality'],
    styles: ['energy', 'mindful', 'experimental'],
    requires_formal_training: false,
    short_description: 'Lying back while singing bowls, gongs, voice or other instruments wash over you, for deep listening and rest.',
    full_description:
      'In a sound session, resonant instruments such as singing bowls, gongs, chimes or voice create a soundscape for you to simply receive. There is nothing to do except listen and let your attention drift.',
    origins: 'Healing and ritual uses of sound exist in many cultures, from Himalayan singing bowls to Aboriginal and Indigenous instruments and chant traditions around the world.',
    practice_description: 'You lie down, often with a blanket and eye covering, while the practitioner plays. Sessions can be one-to-one or in groups.',
    typical_session: 'A short introduction, 30 to 60 minutes of sound, then a gentle return and time to talk or rest.',
    commonly_explored_for: ['Deep relaxation', 'A break from talking and thinking', 'Meditative states', 'Marking a moment of change or ritual'],
    evidence_information: [
      { kind: 'traditional', text: 'Many traditions use sound for ceremony, mourning, celebration and healing.' },
      { kind: 'research', text: 'Small studies suggest sound meditation can leave people feeling calmer. Study quality is limited, so it is best seen as a relaxation practice.' },
    ],
    limitations: 'Not a treatment for any condition. Loud or vibrating sound is not right for everyone.',
    contraindications: 'Let the practitioner know if you have epilepsy, sensitivity to loud sound or vibration, tinnitus, are pregnant, or have an implanted medical device.',
    related_modalities: ['reiki-energy-work', 'meditation-mindfulness', 'breathwork'],
    images: ['sound'],
    publication_status: 'published',
  },
  {
    id: 'mod-expressive',
    name: 'Expressive arts',
    slug: 'expressive-arts',
    category: 'creative',
    icon: 'creative',
    themes: ['creativity', 'emotions', 'grief', 'self', 'transition', 'difficult'],
    styles: ['creative'],
    requires_formal_training: false,
    short_description: 'Using drawing, writing, movement or sound to express what words cannot hold. No talent needed.',
    full_description:
      'Expressive arts invites you to make something as a way to feel something. The point is the making, not the result. A facilitator offers simple prompts and stays with you while you explore.',
    origins: 'Arts-based approaches grew through the 20th century in art therapy, dance and movement therapy, drama therapy and community arts.',
    practice_description: 'Simple materials like paint, clay, collage, paper and pens, with open prompts. You choose how much you share about what you made.',
    typical_session: 'A short check-in, a guided making time, and a conversation about what you noticed, if you want one.',
    commonly_explored_for: ['Feelings that are hard to put into words', 'Grief and life transitions', 'Creative blocks', 'Self-expression without pressure'],
    evidence_information: [
      { kind: 'practitioner', text: 'Facilitators often say making can bypass the inner critic and let feelings move.' },
      { kind: 'research', text: 'There is a research base for arts therapies and wellbeing, especially when delivered by qualified arts therapists. Facilitated creative practice is related but not the same as arts therapy.' },
    ],
    limitations: 'A creative facilitator is not automatically a registered arts therapist. Ask about training if you want therapeutic arts work.',
    contraindications: 'Generally gentle. Exploring strong feelings can be tiring, so plan some quiet time afterwards.',
    related_modalities: ['somatic-practices', 'nature-based-practice', 'holistic-counselling'],
    images: ['creative'],
    publication_status: 'published',
  },
  {
    id: 'mod-nature',
    name: 'Nature-based practice',
    slug: 'nature-based-practice',
    category: 'nature',
    icon: 'nature',
    themes: ['nature', 'rest', 'grounding', 'overwhelm', 'curiosity', 'spirituality'],
    styles: ['nature', 'mindful'],
    requires_formal_training: false,
    short_description: 'Slow, sensory time outdoors, from forest bathing to walking conversations, guided by someone who knows the place.',
    full_description:
      'Nature-based practice brings attention to the living world: the sound of leaves, the feel of soil, the shifting light. It can be a guided slow walk, a ritual at a river, or simply a conversation held while moving through a garden.',
    origins: 'Forest bathing (shinrin-yoku) was named in Japan in the 1980s. Nature-based healing and ritual traditions are far older and exist worldwide.',
    practice_description: 'Gentle invitations to slow down and use the senses, with pauses to sit, notice and share if you wish. Pace is easy and no fitness is needed.',
    typical_session: 'A walk of around two hours with several short invitations, a quiet sit, and a cup of tea at the end.',
    commonly_explored_for: ['Feeling frazzled or screen-tired', 'Rest and perspective', 'Spiritual or seasonal connection', 'A different setting to talk'],
    evidence_information: [
      { kind: 'traditional', text: 'Many cultures treat time with land, plants and seasons as part of wellbeing and ceremony.' },
      { kind: 'research', text: 'Studies of forest bathing, mostly from Japan and Korea, report lower stress measures and better mood. Study design varies, so findings are encouraging rather than conclusive.' },
    ],
    limitations: 'Weather, terrain and access matter. Time in nature supports wellbeing but is not a treatment for any condition.',
    contraindications: 'Mention allergies, mobility needs or health conditions when you book so the route can suit you.',
    related_modalities: ['meditation-mindfulness', 'expressive-arts', 'somatic-practices'],
    images: ['nature'],
    publication_status: 'published',
  },
  {
    id: 'mod-meditation',
    name: 'Meditation and mindfulness',
    slug: 'meditation-mindfulness',
    category: 'mindful',
    icon: 'mindful',
    themes: ['rest', 'overwhelm', 'coping', 'grounding', 'self', 'spirituality'],
    styles: ['mindful'],
    requires_formal_training: false,
    short_description: 'Training attention to notice thoughts, feelings and sensations with kindness rather than getting swept away.',
    full_description:
      'Meditation covers many practices, from focusing on breath to loving-kindness to open awareness. Mindfulness is the quality of paying attention on purpose and without judgement. Teachers help you find a practice that fits you.',
    origins: 'Rooted in Buddhist, Hindu and other contemplative traditions. Secular mindfulness programmes were developed in the late 20th century.',
    practice_description: 'Short guided sits, practice you can do at home, and reflection on what you notice. You can start with a few minutes.',
    typical_session: 'A short guided practice, conversation about how it went, and a simple practice to try before next time.',
    commonly_explored_for: ['Stress and busy minds', 'Building a daily calming habit', 'Relating differently to difficult thoughts', 'Spiritual practice'],
    evidence_information: [
      { kind: 'traditional', text: 'Contemplative traditions use meditation to cultivate wisdom and compassion.' },
      { kind: 'established', text: 'Structured mindfulness programmes have a substantial research base showing moderate benefits for stress, anxiety and preventing depression relapse.' },
    ],
    limitations: 'Effects are moderate and take practice. Quality and approach vary between teachers.',
    contraindications: 'Sitting quietly can bring up distressing material for some people, especially after trauma. Tell your teacher, and ask about gentler options such as eyes-open or movement-based practice.',
    related_modalities: ['breathwork', 'nature-based-practice', 'sound-healing'],
    images: ['mindful'],
    publication_status: 'published',
  },
  {
    id: 'mod-counselling',
    name: 'Holistic counselling',
    slug: 'holistic-counselling',
    category: 'talking',
    icon: 'talk',
    themes: ['emotions', 'self', 'coping', 'transition', 'grief', 'disconnection', 'difficult'],
    styles: ['talking'],
    requires_formal_training: true,
    short_description: 'Conversation-led support that treats you as a whole person, often drawing on body, values and meaning as well as thoughts.',
    full_description:
      'Holistic counselling begins with listening. From there, a counsellor may bring in reflection, values work, body awareness or creative tools, depending on their training and what suits you. Training and registration vary, so it is worth asking.',
    origins: 'Counselling grew out of 20th-century humanistic psychology. "Holistic" approaches add attention to body, spirit and context.',
    practice_description: 'Regular one-to-one conversations in a confidential, non-judgemental space, with optional reflective exercises between sessions.',
    typical_session: 'A conversation of around an hour: what has been happening, what you need, perhaps a reflective or body-based exercise, and a little to take away.',
    commonly_explored_for: ['Understanding your emotions', 'Life changes and transitions', 'Feeling stuck or disconnected', 'A steady place to be heard'],
    evidence_information: [
      { kind: 'established', text: 'There is a strong research base that counselling and talking therapies help with many common difficulties. "Holistic counselling" is a broad label, so evidence depends on the actual methods used.' },
      { kind: 'practitioner', text: 'Practitioners emphasise the relationship and feeling truly heard as central to change.' },
    ],
    limitations: 'Counsellors are not psychiatrists and cannot prescribe medication. Not suited to acute crisis or serious mental illness on its own.',
    contraindications: 'Anyone in crisis or at risk of harm should contact emergency or crisis services first. Ask about registration and the scope of the counsellor’s training.',
    related_modalities: ['internal-family-systems', 'somatic-practices', 'expressive-arts'],
    images: ['talk'],
    publication_status: 'published',
  },
  {
    id: 'mod-ifs',
    name: 'Parts work and shadow work',
    slug: 'internal-family-systems',
    category: 'talking',
    icon: 'parts',
    themes: ['parts', 'emotions', 'self', 'difficult', 'disconnection', 'curiosity'],
    styles: ['talking', 'mindful'],
    requires_formal_training: true,
    short_description: 'Getting curious about the different "parts" of you, including the ones you hide, and learning to listen to them with compassion.',
    full_description:
      'Parts work, including Internal Family Systems (IFS), starts from the idea that we all have many inner voices: a critic, a protector, a part that wants to hide. Rather than fight them, you get to know them. Shadow work is a related idea from Jungian thinking about the sides of ourselves we have disowned.',
    origins: 'IFS was developed by Richard Schwartz in the 1980s. Shadow work comes from Carl Jung’s writing in the early 20th century.',
    practice_description: 'Guided inner conversation, often with eyes closed, where you notice a part, ask what it wants you to know and build trust with it. A trained guide keeps the pace gentle.',
    typical_session: 'An opening conversation, a guided exploration of one part or pattern, and time to close and ground before leaving.',
    commonly_explored_for: ['Inner conflict or self-criticism', 'Patterns you want to understand', 'Meeting parts of yourself you have avoided', 'Self-compassion'],
    evidence_information: [
      { kind: 'practitioner', text: 'Many people find the language of parts a kind, workable way to understand themselves.' },
      { kind: 'research', text: 'Early research on formal IFS therapy is promising but limited. IFS-informed practice is not the same as therapy delivered by a trained IFS therapist, and shadow work has little formal research.' },
    ],
    limitations: 'Working with painful material needs skill. "IFS-informed" does not mean a practitioner is a trained IFS therapist.',
    contraindications: 'Exploring difficult material can be intense. People with significant trauma or dissociation are advised to work with a clinically trained practitioner.',
    related_modalities: ['holistic-counselling', 'somatic-practices', 'psychedelic-integration'],
    images: ['parts'],
    publication_status: 'published',
  },
  {
    id: 'mod-integration',
    name: 'Psychedelic integration',
    slug: 'psychedelic-integration',
    category: 'experimental',
    icon: 'lantern',
    themes: ['difficult', 'self', 'spirituality', 'transition', 'emotions', 'curiosity'],
    styles: ['talking', 'experimental'],
    requires_formal_training: true,
    short_description: 'Support for making sense of an expanded-state experience and bringing what mattered into everyday life.',
    full_description:
      'Integration is the conversation, reflection and practice that happens around an intense or expanded experience, so it can be understood rather than left unresolved. It is support for making meaning. It does not involve supplying, recommending or facilitating any substance.',
    origins: 'Integration practice has grown from psychotherapy, harm-reduction work and contemplative traditions, alongside renewed clinical research.',
    practice_description: 'Reflective conversation, journaling, grounding and values-based planning. Some practitioners also offer preparation conversations.',
    typical_session: 'A confidential conversation about the experience, what it brought up and what you want to carry forward, with simple practices to ground you.',
    commonly_explored_for: ['Making sense of a powerful experience', 'Feeling unsettled afterwards', 'Turning insight into changes in daily life'],
    evidence_information: [
      { kind: 'practitioner', text: 'Practitioners describe integration as where lasting value from an experience is often found.' },
      { kind: 'research', text: 'Research on psychedelic-assisted therapy is active but early. Evidence for integration-specific methods is limited, and integration support is not itself a treatment.' },
    ],
    limitations: 'Legal status of psychedelics varies by place and is changing. Integration support is not medical advice and is not an endorsement of use. It does not replace clinical care.',
    contraindications: 'If you are unwell, in distress or have a history of psychosis, speak with a doctor or mental health professional. Look for a practitioner with relevant professional training and clear scope, and note that lived experience alone is not clinical training.',
    related_modalities: ['internal-family-systems', 'holistic-counselling', 'meditation-mindfulness'],
    images: ['lantern'],
    publication_status: 'published',
  },
];

export const getModalityBySlug = (slug) => modalities.find((m) => m.slug === slug) ?? null;
export const getModalityById = (id) => modalities.find((m) => m.id === id) ?? null;
