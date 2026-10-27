import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import Modal from '../Modal';
import { DistrictOptions, Field, describe, FormActions, FormError, PreviewResult, SuccessResult, ClosedResult, focusFirstInvalid } from '../FormControls';
import { useLanguage } from '../../i18n/LanguageContext';
import { useFormConfig } from '../../data/useFormConfig';
import { useForm } from '../../hooks/useForm';
import { isMobile } from '../../services/validation';
import { submitOrganizer } from '../../services/submissions';
import { fromCms, useVargs } from '../../data/VargsProvider';
import { vargPath } from '../../data/vargLinks';

// The order a person fills this in: the body organising, then who to speak to,
// then where. `place` is gone — what the form asks for now is the
// organisation, which is a different fact rather than a reworded one.
const KEYS = ['organisation', 'branch', 'name', 'contactPerson', 'designation', 'mobile', 'district'];

// Everything except the branch: a single school or housing society has none to
// give, and demanding one would only mean inventing it.
const OPTIONAL = new Set(['branch']);

const INITIAL = Object.fromEntries(KEYS.map((k) => [k, '']));

const validate = (v, t) => {
  const e = {};
  KEYS.forEach((k) => {
    if (!OPTIONAL.has(k) && !v[k].trim()) e[k] = t.errors.required;
  });
  if (v.mobile.trim() && !isMobile(v.mobile)) e.mobile = t.errors.mobile;
  return e;
};

// The confirmation for a listing that is already live: where it was filed and
// a direct link to it on the public directory.
function LiveResult({ varg, onClose }) {
  const { t, lang, district, division } = useLanguage();
  const o = t.organizer;
  const place = [
    lang === 'en' && varg.vibhagEn ? varg.vibhagEn : division(varg.vibhag),
    lang === 'en' && varg.districtEn ? varg.districtEn : district(varg.district),
  ].filter(Boolean).join(' › ');
  return (
    <div className="result result--success" role="status">
      <span className="result__icon">
        <Icon name="checkCircle" size={28} />
      </span>
      <h3 className="result__title">{o.liveTitle}</h3>
      <p className="result__desc">{o.liveDesc(place)}</p>
      <p className="result__live">
        <span className="result__live-dot" aria-hidden="true" />
        {varg.schoolName}
      </p>
      <div className="result__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          {t.common.close}
        </button>
        <Link to={vargPath(varg)} className="btn btn--primary" onClick={onClose}>
          {o.viewListing}
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    </div>
  );
}

export default function OrganizerForm({ open, onClose }) {
  const { t } = useLanguage();
  const o = t.organizer;
  const formRef = useRef(null);
  const form = useForm(INITIAL, validate, t);
  const cfg = useFormConfig('organizer');
  const { refresh } = useVargs();
  const [live, setLive] = useState(null);

  const close = () => {
    form.reset();
    setLive(null);
    onClose();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await form.run(async () => {
      const result = await submitOrganizer(Object.fromEntries(KEYS.map((k) => [k, form.values[k].trim()])));
      if (result.varg) {
        setLive(fromCms(result.varg));
        refresh();
      }
      return result;
    });
    if (!ok) focusFirstInvalid(formRef.current);
  };

  const done = form.status === 'preview' || form.status === 'sent' || !cfg.isActive;

  return (
    <Modal open={open} onClose={close} icon="flag" title={cfg.title || o.title} subtitle={done ? null : t.common.requiredNote} size="sm">
      {form.status === 'preview' ? <PreviewResult onClose={close} /> : null}
      {!cfg.isActive && form.status !== 'sent' && form.status !== 'preview'
        ? <ClosedResult message={cfg.closedMessage} onClose={close} /> : null}
      {form.status === 'sent' && live ? <LiveResult varg={live} onClose={close} /> : null}
      {form.status === 'sent' && !live ? <SuccessResult title={cfg.successTitle || o.successTitle} desc={cfg.successDesc || o.successDesc} onClose={close} /> : null}
      {!done ? (
        <form ref={formRef} onSubmit={onSubmit} noValidate className="form">
          <div className="form-grid">
            {KEYS.map((key) => {
              const id = `org-${key}`;
              const error = form.errorFor(key);
              const mobile = key === 'mobile';
              const control = {
                id,
                className: 'input',
                value: form.values[key],
                onChange: (e) => form.setValue(key, e.target.value),
                onBlur: form.blur(key),
                ...describe(id, error),
              };
              return (
                <Field key={key} id={id} label={o[key]} required={!OPTIONAL.has(key)} error={error}>
                  {key === 'district' ? (
                    <select {...control}>
                      <DistrictOptions />
                    </select>
                  ) : (
                  <input
                    {...control}
                    {...(mobile
                      ? { type: 'tel', inputMode: 'numeric', maxLength: 10, placeholder: o.mobilePlaceholder, autoComplete: 'tel-national' }
                      : { maxLength: 255 })}
                  />
                  )}
                </Field>
              );
            })}
          </div>
          <FormError message={form.formError} />
          <FormActions onCancel={close} busy={form.status === 'busy'} submitLabel={cfg.submitLabel || t.common.enrollNow} />
        </form>
      ) : null}
    </Modal>
  );
}
