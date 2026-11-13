'use client';
import { useFormState } from 'react-dom';
import { Text, Area, Select, Checks, Check, Section } from './fields';
import { POST_KINDS, KIND_LABEL, KIND_HELP, STATUS_LABEL, LICENSE } from '@/lib/posts.mjs';

/**
 * Writing a post. In the Alchemist's own space ("portal") they save a draft or send it for review. The team ("team")
 * choose the author and where the post stands. Errors sit next to their field and what was typed is kept.
 */
export default function PostEditor({ action, initial, id, modalities, mode = 'portal', profiles = [], status = 'draft', authorName }) {
  const [result, formAction] = useFormState(action, { errors: {}, values: null, attempt: 0 });
  const state = result ?? { errors: {}, values: null, attempt: 0 };
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const team = mode === 'team';

  return (
    <form action={formAction} key={state.attempt} className="stack" style={{ gap: '1.4rem' }} noValidate>
      <input type="hidden" name="id" value={id} />
      {Object.keys(e).length ? <p className="error" role="alert">Some things need another look. Nothing was saved. The first one is marked below.</p> : null}

      {team && !id ? (
        <Section title="Author">
          <Select id="profile_id" label="Written by" value={v.profile_id ?? ''} error={e.profile_id} hint="A real profile. Fictional examples cannot write." options={[['', 'Choose'], ...profiles.map((p) => [p.id, p.name])]} />
        </Section>
      ) : team ? <p style={{ color: 'var(--muted)' }}>Written by <strong>{authorName}</strong>.</p> : null}

      <Section title="The writing" intro="Write in your own voice, for someone curious who is new to this. Keep it honest: describe what people experience, never promise results.">
        <Text id="title" label="Title" value={v.title} error={e.title} maxLength={120} />
        <Select id="kind" label="What kind of writing is this?" value={v.kind} error={e.kind} hint="Readers see this label, so they know how to read it." options={[['', 'Choose one'], ...POST_KINDS.map((k) => [k, `${KIND_LABEL[k]}: ${KIND_HELP[k]}`])]} />
        <Area id="summary" label="Summary" value={v.summary} error={e.summary} rows={3} maxLength={300} hint="Two sentences for the feed. 40 to 300 characters." />
        <Area id="body" label="The piece" value={v.body} error={e.body} rows={16} maxLength={8000} hint={<>At least 300 characters. Separate paragraphs with a blank line. Start a line with <code>## </code> for a heading, or with <code>- </code> for a list. Nothing else is formatted.</>} />
        <Checks name="modality_slugs" legend="Which practices is it about? (up to three)" options={modalities.map((m) => [m.slug, m.name])} values={v.modality_slugs} error={e.modality_slugs} />
        <Area id="sources" label="Sources (optional, needed for research summaries)" value={v.sources} error={e.sources} rows={3} maxLength={1500} hint={<>One per line as <code>Title | https://link</code>. Only https links.</>} />
      </Section>

      <Section title="Sharing" intro={`Posts are free to read and shared under ${LICENSE.name}, so anyone may copy and adapt them with credit and a link back.`}>
        <div className="field">
          <Check id="license_ok" checked={Boolean(v.license_ok)} label={team ? `I have the author's agreement to share this under ${LICENSE.name}.` : `This is my own writing (or mine to share), and I am happy for it to be shared under ${LICENSE.name}.`} />
          {e.license_ok ? <span className="error" role="alert">{e.license_ok}</span> : null}
        </div>
        {team ? <Select id="status" label="Where it stands" value={v.status ?? status} error={e.status} options={Object.entries(STATUS_LABEL)} /> : null}
      </Section>

      {!team && status === 'published' ? <p className="demo-note" role="status"><strong>This post is live.</strong> Saving changes takes it offline until the team approves it again.</p> : null}

      <div className="row" style={{ position: 'sticky', bottom: '1rem', zIndex: 5 }}>
        {team ? (
          <button type="submit" className="btn btn--honey btn--lg">Save</button>
        ) : (
          <>
            <button type="submit" name="intent" value="draft" className="btn btn--soft btn--lg">Save draft</button>
            <button type="submit" name="intent" value="submit" className="btn btn--honey btn--lg">Send for review</button>
          </>
        )}
      </div>
    </form>
  );
}
