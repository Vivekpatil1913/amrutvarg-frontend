import Icon from './Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { OFFICIAL_LINKS } from '../i18n/translations';
import { DISTRICTS } from '../data/districts';

// Options for a district <select>: all 36 districts, valued by Marathi name
// (as the AMRUT VARG service stores them) and labelled in the current language.
export function DistrictOptions() {
  const { t, district } = useLanguage();
  return (
    <>
      <option value="">{t.common.select}</option>
      {DISTRICTS.map((n) => (
        <option key={n} value={n}>
          {district(n)}
        </option>
      ))}
    </>
  );
}

// Field wrapper: label, optional hint, inline error wired via aria-describedby.
export function Field({ id, label, required, error, hint, children, wide }) {
  return (
    <div className={`field${wide ? ' field--wide' : ''}${error ? ' field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required ? (
          <span className="field__req" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field__error" role="alert">
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Props for an input tied to a Field's error/hint text.
export const describe = (id, error, hint) => ({
  'aria-invalid': error ? 'true' : undefined,
  'aria-describedby': [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined,
});

export function FormStep({ step, title, children }) {
  const { num } = useLanguage();
  return (
    <fieldset className="form-step">
      <legend className="form-step__legend">
        <span className="form-step__num" aria-hidden="true">
          {num(step)}
        </span>
        {title}
      </legend>
      <div className="form-step__body">{children}</div>
    </fieldset>
  );
}

// Shown when a form validated but was not sent (preview mode).
export function PreviewResult({ onClose }) {
  const { t } = useLanguage();
  return (
    <div className="result result--preview" role="status">
      <span className="result__icon">
        <Icon name="info" size={28} />
      </span>
      <h3 className="result__title">{t.preview.title}</h3>
      <p className="result__desc">{t.preview.desc}</p>
      <div className="result__actions">
        <a className="btn btn--primary" href={OFFICIAL_LINKS.portal} target="_blank" rel="noopener noreferrer">
          {t.preview.openPortal}
          <Icon name="external" size={16} />
          <span className="sr-only">{t.common.opensNewTab}</span>
        </a>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}

// Shown only after the live service confirmed a submission.
export function SuccessResult({ title, desc, onClose }) {
  const { t } = useLanguage();
  return (
    <div className="result result--success" role="status">
      <span className="result__icon">
        <Icon name="checkCircle" size={28} />
      </span>
      <h3 className="result__title">{title}</h3>
      <p className="result__desc">{desc}</p>
      <div className="result__actions">
        <button type="button" className="btn btn--primary" onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}

export function FormActions({ onCancel, busy, submitLabel }) {
  const { t } = useLanguage();
  return (
    <div className="form-actions">
      {/* data-dismiss + no focus steal on press: cancelling never triggers blur validation */}
      <button type="button" className="btn btn--ghost" data-dismiss onMouseDown={(e) => e.preventDefault()} onClick={onCancel} disabled={busy}>
        {t.common.cancel}
      </button>
      <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy || undefined}>
        {busy ? t.common.submitting : submitLabel}
      </button>
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <p className="form-error" role="alert">
      <Icon name="alert" size={16} />
      {message}
    </p>
  );
}

export const focusFirstInvalid = (form) =>
  requestAnimationFrame(() => form?.querySelector('[aria-invalid="true"]')?.focus());
