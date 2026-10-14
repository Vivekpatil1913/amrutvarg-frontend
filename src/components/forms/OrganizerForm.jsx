import { useRef } from 'react';
import Modal from '../Modal';
import { DistrictOptions, Field, describe, FormActions, FormError, PreviewResult, SuccessResult, ClosedResult, focusFirstInvalid } from '../FormControls';
import { useLanguage } from '../../i18n/LanguageContext';
import { useFormConfig } from '../../data/useFormConfig';
import { useForm } from '../../hooks/useForm';
import { isMobile } from '../../services/validation';
import { submitOrganizer } from '../../services/submissions';

const INITIAL = { name: '', place: '', mobile: '', designation: '', district: '' };
const KEYS = ['name', 'place', 'mobile', 'designation', 'district'];

const validate = (v, t) => {
  const e = {};
  KEYS.forEach((k) => {
    if (!v[k].trim()) e[k] = t.errors.required;
  });
  if (v.mobile.trim() && !isMobile(v.mobile)) e.mobile = t.errors.mobile;
  return e;
};

export default function OrganizerForm({ open, onClose }) {
  const { t } = useLanguage();
  const o = t.organizer;
  const formRef = useRef(null);
  const form = useForm(INITIAL, validate, t);
  const cfg = useFormConfig('organizer');

  const close = () => {
    form.reset();
    onClose();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await form.run(() =>
      submitOrganizer(Object.fromEntries(KEYS.map((k) => [k, form.values[k].trim()]))),
    );
    if (!ok) focusFirstInvalid(formRef.current);
  };

  const done = form.status === 'preview' || form.status === 'sent' || !cfg.isActive;

  return (
    <Modal open={open} onClose={close} icon="flag" title={cfg.title || o.title} subtitle={done ? null : t.common.requiredNote} size="sm">
      {form.status === 'preview' ? <PreviewResult onClose={close} /> : null}
      {!cfg.isActive && form.status !== 'sent' && form.status !== 'preview'
        ? <ClosedResult message={cfg.closedMessage} onClose={close} /> : null}
      {form.status === 'sent' ? <SuccessResult title={cfg.successTitle || o.successTitle} desc={cfg.successDesc || o.successDesc} onClose={close} /> : null}
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
                <Field key={key} id={id} label={o[key]} required error={error}>
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
