import Icon from './Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { OFFICIAL_LINKS } from '../i18n/translations';
import { DISTRICTS } from '../data/districts';
import { useMaster, findByName } from '../data/useMasters';

// District list for every form's district <select>. Options come from the CMS
// district master, falling back to the bundled list when it is unreachable, so
// the dropdown is never empty. The option VALUE stays the Marathi name, which
// is what these forms have always submitted.
// Pass `vibhagName` to narrow the list to that division's districts; without it
// every district is offered, which is what the forms carrying no vibhag field
// need.
export function DistrictOptions({ vibhagName = null }) {
  const { t, district } = useLanguage();
  const vibhags = useMaster('vibhags');
  const vibhag = vibhagName ? findByName(vibhags, vibhagName) : null;

  // Scoped when a division is chosen, otherwise the full list.
  const scoped = useMaster('districts', 'vibhag_id', vibhag?.id ?? null);
  const all = useMaster('districts');
  const rows = vibhagName ? scoped : all;

  // Only the unscoped list falls back to the bundled names: a scoped list that
  // is empty means "this division has none", not "the API is down".
  const names = rows.length ? rows.map((d) => d.name_mr) : vibhagName ? [] : DISTRICTS;

  return (
    <>
      <option value="">
        {vibhagName && !names.length ? t.common.select : t.common.select}
      </option>
      {names.map((n) => (
        <option key={n} value={n}>
          {district(n)}
        </option>
      ))}
    </>
  );
}

// Vibhag (revenue division) options, same fallback behaviour.
export function VibhagOptions() {
  const { t, lang } = useLanguage();
  const rows = useMaster('vibhags');
  return (
    <>
      <option value="">{t.common.select}</option>
      {rows.map((v) => (
        <option key={v.id} value={v.name_mr}>
          {lang === 'en' && v.name_en ? v.name_en : v.name_mr}
        </option>
      ))}
    </>
  );
}

// Taluka suggestions for one district, as a <datalist> rather than a <select>.
//
// The taluka master only covers districts that already run an Amrut Varg, so a
// hard dropdown would leave most districts with nothing selectable and block
// the form. A datalist offers what the master knows while the field stays a
// free-text input — same type, same validation, same submitted value.
//
// `districtName` is the Marathi name the form holds; it resolves through former
// names too, so an older district spelling still finds its talukas.
export function TalukaSuggestions({ id, districtName }) {
  const districts = useMaster('districts');
  const match = findByName(districts, districtName);
  const rows = useMaster('talukas', 'district_id', match?.id ?? null);

  if (!rows.length) return null;
  return (
    <datalist id={id}>
      {rows.map((tk) => <option key={tk.id} value={tk.name_mr} />)}
    </datalist>
  );
}

// Taluka control that cascades from the chosen district.
//
// Where the master knows that district's talukas it renders a real dependent
// <select>; where it knows none it renders the original free-text input, so a
// district whose talukas have not been entered yet can still be filled in. The
// field name, label, required status and submitted value are the same either
// way — only the control adapts to what the master holds.
export function TalukaField({ id, districtName, inputProps, className = 'input' }) {
  const { t } = useLanguage();
  const districts = useMaster('districts');
  const match = findByName(districts, districtName);
  const rows = useMaster('talukas', 'district_id', match?.id ?? null);

  if (rows.length) {
    return (
      <select className={className} {...inputProps}>
        <option value="">{t.common.select}</option>
        {rows.map((tk) => (
          <option key={tk.id} value={tk.name_mr}>{tk.name_mr}</option>
        ))}
      </select>
    );
  }

  return (
    <>
      <input className={className} {...inputProps} maxLength={255} list={`${id}-list`} />
      <TalukaSuggestions id={`${id}-list`} districtName={districtName} />
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

// Shown in place of the fields when an administrator has closed the form. The
// server refuses these submissions too, so this is a courtesy to the visitor
// rather than the control that enforces it.
export function ClosedResult({ message, onClose }) {
  const { t } = useLanguage();
  return (
    <div className="result" role="status">
      <span className="result__icon">
        <Icon name="info" size={28} />
      </span>
      <p className="result__desc">{message}</p>
      <div className="result__actions">
        <button type="button" className="btn btn--primary" onClick={onClose}>
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
