'use client';
/** Small form pieces shared by the admin editors. Values are uncontrolled, errors sit next to their field. */

export function Field({ id, label, hint, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? <span className="hint" id={`${id}-hint`}>{hint}</span> : null}
      {children}
      {error ? <span className="error" id={`${id}-err`} role="alert">{error}</span> : null}
    </div>
  );
}

const aria = (id, error, hint) => ({ id, name: id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined });

export function Text({ id, label, hint, error, value, type = 'text', maxLength = 200, required }) {
  return <Field id={id} label={label} hint={hint} error={error}><input type={type} defaultValue={value ?? ''} maxLength={maxLength} required={required} {...aria(id, error, hint)} /></Field>;
}

export function Area({ id, label, hint, error, value, rows = 4, maxLength = 2000 }) {
  return <Field id={id} label={label} hint={hint} error={error}><textarea defaultValue={value ?? ''} maxLength={maxLength} style={{ minHeight: `${rows * 1.7 + 1.6}rem` }} {...aria(id, error, hint)} /></Field>;
}

export function Select({ id, label, hint, error, value, options }) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <select defaultValue={value ?? ''} {...aria(id, error, hint)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </Field>
  );
}

/** A group of checkboxes that all post under one name. */
export function Checks({ name, legend, hint, error, options, values = [] }) {
  return (
    <fieldset className="field" aria-describedby={error ? `${name}-err` : undefined}>
      <legend>{legend}</legend>
      {hint ? <span className="hint">{hint}</span> : null}
      <div className="chips" style={{ marginTop: '0.4rem' }}>
        {options.map(([v, l]) => (
          <label key={v} className="check" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.4rem 0.9rem', fontSize: '0.92rem' }}>
            <input type="checkbox" name={name} value={v} defaultChecked={values.includes(v)} style={{ marginTop: 0 }} /><span>{l}</span>
          </label>
        ))}
      </div>
      {error ? <span className="error" id={`${name}-err`} role="alert">{error}</span> : null}
    </fieldset>
  );
}

export function Check({ id, label, checked }) {
  return <label className="check" htmlFor={id}><input type="checkbox" id={id} name={id} defaultChecked={Boolean(checked)} /><span>{label}</span></label>;
}

export function Section({ title, intro, children }) {
  return (
    <section className="admin-card stack" style={{ gap: '1.2rem' }}>
      <div className="stack" style={{ gap: '0.3rem' }}><h2 style={{ fontSize: '1.35rem' }}>{title}</h2>{intro ? <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>{intro}</p> : null}</div>
      {children}
    </section>
  );
}
