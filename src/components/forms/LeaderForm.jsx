import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal';
import Icon from '../Icon';
import {
  DistrictOptions,
  Field,
  FormStep,
  describe,
  FormActions,
  FormError,
  PreviewResult,
  SuccessResult,
  VibhagOptions,
  TalukaField,
  ClosedResult,
  focusFirstInvalid,
} from '../FormControls';
import { useLanguage } from '../../i18n/LanguageContext';
import { useFormConfig } from '../../data/useFormConfig';
import { useForm } from '../../hooks/useForm';
import { checkPhoto, isDate, isEmail, isMobile, isPhone, isWholeNumber, PHOTO_TYPES } from '../../services/validation';
import { submitLeader } from '../../services/submissions';

const MAX_PARTICIPANTS = 100000;
const MAX_VARGS = 10000;

const INITIAL = {
  leaderName: '',
  institutionName: '',
  institutionEmail: '',
  institutionPhone: '',
  district: '',
  division: '',
  taluka: '',
  village: '',
  coordinatorName: '',
  coordinatorPhone: '',
  coordinatorPhoneAlt: '',
  vargDate: '',
  participantCount: '',
  vargCount: '',
  specialNote: '',
  organizerEnrollment: '',
};

// Rules mirrored from the live portal's leader registration form.
const validate = (v, t) => {
  const e = {};
  ['leaderName', 'institutionName', 'district', 'division', 'taluka', 'village', 'coordinatorName'].forEach((k) => {
    if (!v[k].trim()) e[k] = t.errors.required;
  });
  if (v.institutionEmail.trim() && !isEmail(v.institutionEmail)) e.institutionEmail = t.errors.email;
  if (v.institutionPhone.trim() && !isPhone(v.institutionPhone)) e.institutionPhone = t.errors.phone;
  if (!v.coordinatorPhone.trim()) e.coordinatorPhone = t.errors.required;
  else if (!isMobile(v.coordinatorPhone)) e.coordinatorPhone = t.errors.mobile;
  if (v.coordinatorPhoneAlt.trim() && !isMobile(v.coordinatorPhoneAlt)) e.coordinatorPhoneAlt = t.errors.mobile;
  if (!v.vargDate) e.vargDate = t.errors.required;
  else if (!isDate(v.vargDate)) e.vargDate = t.errors.date;
  if (!v.participantCount.trim()) e.participantCount = t.errors.required;
  else if (!isWholeNumber(v.participantCount)) e.participantCount = t.errors.number;
  else if (Number(v.participantCount) > MAX_PARTICIPANTS) e.participantCount = t.errors.numberMax(MAX_PARTICIPANTS);
  if (v.vargCount.trim()) {
    if (!isWholeNumber(v.vargCount)) e.vargCount = t.errors.number;
    else if (Number(v.vargCount) > MAX_VARGS) e.vargCount = t.errors.numberMax(MAX_VARGS);
  }
  return e;
};

const toPayload = (v) => {
  const trimmed = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, String(val).trim()]));
  return {
    ...trimmed,
    participantCount: Number(trimmed.participantCount),
    vargCount: trimmed.vargCount ? Number(trimmed.vargCount) : null,
  };
};

export default function LeaderForm({ open, onClose }) {
  const { t } = useLanguage();
  const l = t.leader;
  const formRef = useRef(null);
  const fileRef = useRef(null);
  const form = useForm(INITIAL, validate, t);
  const cfg = useFormConfig('leader');
  const { values: v, setValue } = form;
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const close = () => {
    form.reset();
    setPhoto(null);
    setPhotoError('');
    onClose();
  };

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkPhoto(file, t.errors);
    setPhotoError(problem || '');
    setPhoto(problem ? null : file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await form.run(() => submitLeader(toPayload(v), photo));
    if (!ok) focusFirstInvalid(formRef.current);
  };

  const bind = (key, id) => {
    const error = form.errorFor(key);
    return {
      id,
      className: 'input',
      value: v[key],
      onChange: (e) => setValue(key, e.target.value),
      onBlur: form.blur(key),
      ...describe(id, error),
    };
  };
  // Changing a level clears the levels below it, so a district from the old
  // division or a taluka from the old district can never be submitted.
  const pickDivision = (name) => {
    setValue('division', name);
    setValue('district', '');
    setValue('taluka', '');
  };
  const pickDistrict = (name) => {
    setValue('district', name);
    setValue('taluka', '');
  };

  const field = (key, id, required, control, extra = {}) => (
    <Field id={id} label={l[key]} required={required} error={form.errorFor(key)} {...extra}>
      {control}
    </Field>
  );
  const phoneProps = { type: 'tel', inputMode: 'numeric', maxLength: 10, placeholder: t.organizer.mobilePlaceholder };

  const done = form.status === 'preview' || form.status === 'sent' || !cfg.isActive;

  return (
    <Modal open={open} onClose={close} icon="award" title={cfg.title || l.formTitle} subtitle={done ? null : t.common.requiredNote} size="lg">
      {form.status === 'preview' ? <PreviewResult onClose={close} /> : null}
      {!cfg.isActive && form.status !== 'sent' && form.status !== 'preview'
        ? <ClosedResult message={cfg.closedMessage} onClose={close} /> : null}
      {form.status === 'sent' ? <SuccessResult title={cfg.successTitle || l.successTitle} desc={cfg.successDesc || l.successDesc} onClose={close} /> : null}
      {!done ? (
        <form ref={formRef} onSubmit={onSubmit} noValidate className="form">
          <FormStep step={1} title={l.sectionLeader}>
            <Field id="ld-photo" label={l.photo} error={photoError || undefined} hint={l.photoHint} wide>
              <div className="photo-pick">
                <div className="photo-pick__frame">
                  {preview ? <img src={preview} alt={l.photoPreviewAlt} /> : <Icon name="camera" size={28} />}
                </div>
                <input
                  ref={fileRef}
                  id="ld-photo"
                  type="file"
                  accept={PHOTO_TYPES.join(',')}
                  onChange={onPhoto}
                  className="sr-only"
                  {...describe('ld-photo', photoError, l.photoHint)}
                />
                <div className="photo-pick__actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
                    <Icon name="camera" size={16} />
                    {photo ? l.photoChange : l.photoChoose}
                  </button>
                  {photo ? (
                    <button type="button" className="btn btn--text btn--sm" onClick={() => setPhoto(null)}>
                      <Icon name="close" size={16} />
                      {l.photoRemove}
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>
            <div className="form-grid">
              {field('leaderName', 'ld-name', true, <input {...bind('leaderName', 'ld-name')} autoComplete="name" maxLength={255} />)}
              {field('institutionName', 'ld-inst', true, <input {...bind('institutionName', 'ld-inst')} maxLength={500} />)}
              {field('institutionEmail', 'ld-inst-email', false, <input {...bind('institutionEmail', 'ld-inst-email')} type="email" maxLength={255} />)}
              {field('institutionPhone', 'ld-inst-phone', false, <input {...bind('institutionPhone', 'ld-inst-phone')} type="tel" maxLength={20} />)}
              {/* Division first: it narrows the districts, which in turn narrow
                  the talukas. Choosing a level clears the ones below it so no
                  stale combination can be submitted. */}
              {field('division', 'ld-division', true,
                <select {...bind('division', 'ld-division')} onChange={(e) => pickDivision(e.target.value)}>
                  <VibhagOptions />
                </select>)}
              {field(
                'district',
                'ld-district',
                true,
                <select
                  {...bind('district', 'ld-district')}
                  onChange={(e) => pickDistrict(e.target.value)}
                  disabled={!v.division}
                >
                  <DistrictOptions vibhagName={v.division} />
                </select>,
              )}
              {field('taluka', 'ld-taluka', true,
                <TalukaField
                  id="ld-taluka"
                  districtName={v.district}
                  className="input"
                  inputProps={{ ...bind('taluka', 'ld-taluka'), disabled: !v.district }}
                />)}
              {field('village', 'ld-village', true, <input {...bind('village', 'ld-village')} maxLength={255} />)}
            </div>
          </FormStep>

          <FormStep step={2} title={l.sectionCoordinator}>
            {field('coordinatorName', 'ld-coord', true, <input {...bind('coordinatorName', 'ld-coord')} maxLength={255} />, { wide: true })}
            <div className="form-grid">
              {field('coordinatorPhone', 'ld-coord-phone', true, <input {...bind('coordinatorPhone', 'ld-coord-phone')} {...phoneProps} />)}
              {field('coordinatorPhoneAlt', 'ld-coord-phone2', false, <input {...bind('coordinatorPhoneAlt', 'ld-coord-phone2')} {...phoneProps} />)}
            </div>
          </FormStep>

          <FormStep step={3} title={l.sectionActivity}>
            <div className="form-grid form-grid--3">
              {field('vargDate', 'ld-date', true, <input {...bind('vargDate', 'ld-date')} type="date" />)}
              {field(
                'participantCount',
                'ld-participants',
                true,
                <input {...bind('participantCount', 'ld-participants')} type="number" inputMode="numeric" min={0} step={1} />,
              )}
              {field('vargCount', 'ld-vargs', false, <input {...bind('vargCount', 'ld-vargs')} type="number" inputMode="numeric" min={0} step={1} />)}
            </div>
            {field('specialNote', 'ld-note', false, <textarea {...bind('specialNote', 'ld-note')} rows={3} maxLength={2000} />, { wide: true })}
          </FormStep>

          <FormStep step={4} title={l.sectionOrganizer}>
            {field(
              'organizerEnrollment',
              'ld-organizer',
              false,
              <textarea {...bind('organizerEnrollment', 'ld-organizer')} rows={4} maxLength={5000} placeholder={l.organizerEnrollmentPlaceholder} />,
              { wide: true },
            )}
          </FormStep>

          <FormError message={form.formError} />
          <FormActions onCancel={close} busy={form.status === 'busy'} submitLabel={cfg.submitLabel || t.common.submit} />
        </form>
      ) : null}
    </Modal>
  );
}
