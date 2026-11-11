'use client';
import { useFormState } from 'react-dom';
import { Text, Area, Select, Checks, Check, Section } from './fields';

export default function AlchemistEditor({ action, initial, id, locked, modalityOptions }) {
  const [result, formAction] = useFormState(action, { errors: {}, values: null, attempt: 0 });
  // After a successful save the action redirects and the state is briefly empty, so never assume it is set.
  const state = result ?? { errors: {}, values: null, attempt: 0 };
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const failed = Object.keys(e).length > 0;

  return (
    <form action={formAction} key={state.attempt} className="stack" style={{ gap: '1.4rem' }} noValidate>
      <input type="hidden" name="id" value={id} />
      {failed ? <p className="error" role="alert">Some things need another look. Nothing was saved. The first one is marked below.</p> : null}

      <Section title="The basics">
        <div className="filters__row">
          <Text id="name" label="Name" value={v.name} error={e.name} maxLength={120} />
          <Text id="title" label="Title" value={v.title} error={e.title} hint='For example "Somatic Alchemist"' />
        </div>
        <Text id="offering_name" label="Name of their offering (optional)" value={v.offering_name} error={e.offering_name} maxLength={80} hint='For example "The Homecoming Sessions"' />
        <Text id="tagline" label="Tagline" value={v.tagline} error={e.tagline} maxLength={140} hint="One short line in their own voice." />
        <Area id="short_bio" label="Short bio" value={v.short_bio} error={e.short_bio} rows={3} maxLength={400} hint="Shown on cards and in search. 20 to 400 characters." />
      </Section>

      <Section title="Their story and philosophy" intro="The heart of a profile. Write in the Alchemist's own voice and keep it true.">
        <Area id="personal_story" label="Personal story" value={v.personal_story} error={e.personal_story} rows={9} hint="Separate paragraphs with a blank line." />
        <Area id="what_brought_me" label="What brought them to this work" value={v.what_brought_me} error={e.what_brought_me} rows={3} maxLength={600} />
        <Text id="pull_quote" label="A line to feature" value={v.pull_quote} error={e.pull_quote} maxLength={240} />
        <Area id="philosophy" label="Philosophy" value={v.philosophy} error={e.philosophy} rows={5} maxLength={1200} />
      </Section>

      <Section title="Practices, training and experience" intro="Each practice says what kind of experience stands behind it, so different kinds are never presented as the same.">
        <Area id="modalities" label="Practices" value={v.modalities} error={e.modalities} rows={6}
          hint={<>One per line as <code>slug: basis</code>. Basis is <strong>formal</strong> (a qualification or formal training), <strong>study</strong>, <strong>experience</strong>, <strong>interest</strong> (not an offering) or <strong>confirm</strong> (not yet confirmed, shown as &quot;a practice I draw on&quot;). Practices that need professional training only match people marked <strong>formal</strong>. Slugs: {modalityOptions.map((m) => m.slug).join(', ')}.</>} />
        <div className="filters__row">
          <Text id="approach_tags" label="Approach" value={v.approach_tags} error={e.approach_tags} hint="Comma separated, for example gentle, body-led, slow" maxLength={300} />
          <Text id="interests" label="Interests" value={v.interests} error={e.interests} hint="Comma separated" maxLength={300} />
        </div>
        <Area id="qualifications" label="Qualifications (formal)" value={v.qualifications} error={e.qualifications} rows={3} hint={<>One per line. Only list what has been checked. Add <code>(confirm)</code> to a line that still needs checking.</>} />
        <Area id="training" label="Training and personal study" value={v.training} error={e.training} rows={3} hint="One per line." />
        <Area id="experience" label="Experience" value={v.experience} error={e.experience} rows={3} hint="One per line. Lived experience belongs here." />
      </Section>

      <Section title="What a session is like">
        <Area id="suits" label="Who it may suit" value={v.suits} error={e.suits} rows={3} hint="One per line." />
        <Area id="outcomes" label="What people may take away (optional)" value={v.outcomes} error={e.outcomes} rows={3} hint="One per line. Describe, never promise." />
        <Area id="session_steps" label="A typical session, step by step" value={v.session_steps} error={e.session_steps} rows={5} hint={<>One step per line as <code>Title | description</code>.</>} />
      </Section>

      <Section title="Where, how and how much">
        <Checks name="delivery_formats" legend="How they work" error={e.delivery_formats} options={[['online', 'Online'], ['in-person', 'In person']]} values={v.delivery_formats} />
        <div className="filters__row">
          <Text id="location_label" label="Location" value={v.location_label} error={e.location_label} maxLength={120} hint='For example "Inner West, Sydney"' />
          <Text id="location_region" label="Region (for search)" value={v.location_region} error={e.location_region} maxLength={60} hint="A single word or two, such as sydney. Leave blank to use the location." />
        </div>
        <Text id="location_note" label="Location note (optional)" value={v.location_note} error={e.location_note} maxLength={240} />
        <Text id="pricing_from" label="Sessions from (AUD)" value={v.pricing_from} error={e.pricing_from} type="number" maxLength={6} />
        <Area id="pricing_sessions" label="Sessions and prices" value={v.pricing_sessions} error={e.pricing_sessions} rows={4} hint={<>One per line as <code>Title | duration | price | description</code>. Add <code>(confirm)</code> at the end if a price still needs checking.</>} />
        <Text id="pricing_note" label="Price note (optional)" value={v.pricing_note} error={e.pricing_note} maxLength={240} />
      </Section>

      <Section title="Safety and contact">
        <Area id="safety_information" label="Safety information" value={v.safety_information} error={e.safety_information} rows={4} maxLength={1500} hint="What a Seeker should know first: scope, limits, who should check with a doctor. Required to publish." />
        <div className="filters__row">
          <Text id="enquiry_email" label="Enquiry email (optional)" value={v.enquiry_email} error={e.enquiry_email} type="email" maxLength={200} />
          <Text id="website" label="Website (optional)" value={v.website} error={e.website} maxLength={300} hint="Starts with https://" />
        </div>
      </Section>

      <Section title="Visibility" intro="A profile appears to the public only when it is published and verified.">
        <div className="filters__row">
          <Select id="publication_status" label="Publication" value={v.publication_status} error={e.publication_status} options={[['draft', 'Draft (hidden)'], ['published', 'Published']]} />
          {locked ? (
            <div className="field"><span className="filter-label" style={{ marginBottom: 0 }}>Verification</span><strong>{locked}</strong><input type="hidden" name="verification_status" value={v.verification_status} /></div>
          ) : (
            <Select id="verification_status" label="Verification" value={v.verification_status} error={e.verification_status} hint="Choose verified only after checking training and registration." options={[['pending', 'Pending (never public)'], ['verified', 'Verified']]} />
          )}
        </div>
        <div className="filters__row">
          <Check id="featured_status" label="Feature on the homepage" checked={Boolean(v.featured_status)} />
          <Text id="featured_rank" label="Featured order (1 first)" value={v.featured_rank} error={e.featured_rank} type="number" maxLength={2} />
        </div>
      </Section>

      <div className="row" style={{ position: 'sticky', bottom: '1rem', zIndex: 5 }}>
        <button type="submit" className="btn btn--honey btn--lg">Save changes</button>
      </div>
    </form>
  );
}
