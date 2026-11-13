'use client';
import { useFormState } from 'react-dom';
import { Text, Area, Select, Checks, Check, Section } from './fields';
import { THEMES, STYLES } from '@/lib/matching/vocabulary.mjs';
import { CATEGORIES, ICON_NAMES } from '@/lib/admin-content.mjs';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ModalityEditor({ action, initial, id, otherModalities }) {
  const [result, formAction] = useFormState(action, { errors: {}, values: null, attempt: 0 });
  // After a successful save the action redirects and the state is briefly empty, so never assume it is set.
  const state = result ?? { errors: {}, values: null, attempt: 0 };
  const v = state.values ?? initial;
  const e = state.errors ?? {};

  return (
    <form action={formAction} key={state.attempt} className="stack" style={{ gap: '1.4rem' }} noValidate>
      <input type="hidden" name="id" value={id} />
      {Object.keys(e).length ? <p className="error" role="alert">Some things need another look. Nothing was saved.</p> : null}

      <Section title="The basics">
        <div className="filters__row">
          <Text id="name" label="Name" value={v.name} error={e.name} maxLength={80} />
          <Select id="category" label="Category" value={v.category} error={e.category} options={CATEGORIES.map((c) => [c, cap(c)])} />
          <Select id="icon" label="Icon" value={v.icon} options={ICON_NAMES.map((c) => [c, cap(c)])} />
        </div>
        <Area id="short_description" label="Short description" value={v.short_description} error={e.short_description} rows={3} maxLength={300} hint="One or two sentences for cards. 20 to 300 characters." />
      </Section>

      <Section title="The educational page" intro="Plain language, honest, and free of unsupported medical claims.">
        <Area id="full_description" label="What is it?" value={v.full_description} error={e.full_description} rows={5} maxLength={1500} />
        <Area id="origins" label="Where does it come from?" value={v.origins} error={e.origins} rows={3} maxLength={800} />
        <Area id="practice_description" label="How is it practised?" value={v.practice_description} error={e.practice_description} rows={3} maxLength={1000} />
        <Area id="typical_session" label="What happens in a typical session?" value={v.typical_session} error={e.typical_session} rows={3} maxLength={800} />
        <Area id="commonly_explored_for" label="What people commonly explore it for" value={v.commonly_explored_for} error={e.commonly_explored_for} rows={4} hint="One per line." />
      </Section>

      <Section title="Evidence, limits and safety" intro="Keep traditional belief, practitioner perspective, research and established evidence apart.">
        <Area id="evidence_information" label="What does the evidence say?" value={v.evidence_information} error={e.evidence_information} rows={5} hint={<>One per line as <code>kind | text</code>. Kind is <strong>traditional</strong>, <strong>practitioner</strong>, <strong>research</strong> or <strong>established</strong>.</>} />
        <Area id="limitations" label="What are its limits?" value={v.limitations} error={e.limitations} rows={3} maxLength={800} />
        <Area id="contraindications" label="Safety and who should take extra care" value={v.contraindications} error={e.contraindications} rows={4} maxLength={1000} hint="Required to publish." />
      </Section>

      <Section title="How discovery uses it" intro="These tags are how the discovery tool connects what Seekers describe to this practice.">
        <Checks name="themes" legend="Themes (what it is commonly explored for)" error={e.themes} options={Object.entries(THEMES).map(([k, t]) => [k, t.label])} values={v.themes} />
        <Checks name="styles" legend="Styles (how it is practised)" error={e.styles} options={STYLES.filter((s) => s.id !== 'surprise').map((s) => [s.id, s.label])} values={v.styles} />
        <Check id="requires_formal_training" label="Needs professional training: only formally trained Alchemists are matched to it" checked={Boolean(v.requires_formal_training)} />
        <Checks name="related_modalities" legend="Related modalities worth a look" options={otherModalities.map((m) => [m.slug, m.name])} values={v.related_modalities} />
      </Section>

      <Section title="Visibility">
        <Select id="publication_status" label="Publication" value={v.publication_status} error={e.publication_status} options={[['draft', 'Draft (hidden)'], ['published', 'Published']]} />
      </Section>

      <div className="row" style={{ position: 'sticky', bottom: '1rem', zIndex: 5 }}>
        <button type="submit" className="btn btn--honey btn--lg">Save changes</button>
      </div>
    </form>
  );
}
