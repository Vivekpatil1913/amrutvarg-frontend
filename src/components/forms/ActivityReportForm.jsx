import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { Field, describe, FormError, focusFirstInvalid } from '../FormControls';
import { useLanguage } from '../../i18n/LanguageContext';
import { useForm } from '../../hooks/useForm';
import { useMaster } from '../../data/useMasters';
import { useVargs, fromCms } from '../../data/VargsProvider';
import {
  submitActivity, checkActivityPhoto, FREQUENCIES,
  ACTIVITY_PHOTO_MIN, ACTIVITY_PHOTO_MAX, ACTIVITY_PHOTO_TYPES, ACTIVITY_PHOTO_EXTS,
} from '../../services/vargActivities';

// The 10-field Amrut Varg activity report ("अमृत वर्ग कार्य अहवाल"), shared by
// the 'Amrut Varg' page and the Join section's modal. A successful report also
// publishes the school in the "कार्यरत अमृत वर्ग" listing (the CMS does that
// in the same transaction), and the shared varg list is re-read at once so the
// new card, the counters and the division chart update without a reload.
//
// `onClose` marks the modal use: the form then carries no heading of its own
// (the dialog has one) and its confirmation offers to close or to see the
// listing instead of the page's repository.

const INITIAL = {
  division_id: '',
  district_id: '',
  taluka_id: '',
  taluka: '',
  institution_name: '',
  incharge_name: '',
  incharge_mobile: '',
  participant_count: '',
  frequency: '',
  description: '',
  // Mirrors the number of chosen photos so the shared validator can require
  // the minimum; it is not sent.
  photos: 0,
};

// The PRD's rule for the Pramukh's contact number: exactly ten digits.
const isTenDigits = (v) => /^[0-9]{10}$/.test(v.trim());

const REQUIRED = ['division_id', 'district_id', 'taluka', 'institution_name', 'incharge_name', 'participant_count', 'frequency'];

const validate = (v, t) => {
  const p = t.vargPortal.errors;
  const e = {};
  REQUIRED.forEach((k) => {
    if (!String(v[k]).trim()) e[k] = t.errors.required;
  });
  if (v.incharge_mobile.trim() && !isTenDigits(v.incharge_mobile)) e.incharge_mobile = p.mobile;
  const count = v.participant_count.trim();
  if (count && (!/^\d+$/.test(count) || Number(count) < 1 || Number(count) > 100000)) e.participant_count = p.participants;
  if (v.photos < ACTIVITY_PHOTO_MIN) e.photos = p.photoMin;
  return e;
};

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

// ── Recording form ──────────────────────────────────────────────────────────

export default function ActivityReportForm({ onRecorded = () => {}, onClose, onSeeListing }) {
  const inModal = Boolean(onClose);
  const { t, lang, num } = useLanguage();
  const p = t.vargPortal;
  const formRef = useRef(null);
  const photoRef = useRef(null);
  const form = useForm(INITIAL, validate, t);
  const { values: v, setValue } = form;
  const [photos, setPhotos] = useState([]); // { file, url }
  const [photoError, setPhotoError] = useState('');
  const [listed, setListed] = useState(null);
  const { refresh } = useVargs();

  const divisions = useMaster('vibhags');
  const districts = useMaster('districts', 'vibhag_id', v.division_id ? Number(v.division_id) : null);
  const talukas = useMaster('talukas', 'district_id', v.district_id ? Number(v.district_id) : null);
  const label = (row) => (lang === 'en' && row.name_en ? row.name_en : row.name_mr);

  // Object URLs for the previews are released when a photo is removed, and
  // whatever is left when the form goes away.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((ph) => URL.revokeObjectURL(ph.url)), []);

  useEffect(() => setValue('photos', photos.length), [photos.length, setValue]);
  const shownPhotoError = photoError || form.errorFor('photos');

  const bind = (key, id) => ({
    id,
    className: 'input',
    value: v[key],
    onChange: (e) => setValue(key, e.target.value),
    onBlur: form.blur(key),
    ...describe(id, form.errorFor(key)),
  });

  const onPhotos = (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = '';
    if (!picked.length) return;
    if (photos.length + picked.length > ACTIVITY_PHOTO_MAX) {
      setPhotoError(p.errors.photoMax);
      return;
    }
    const problem = picked.map((file) => checkActivityPhoto(file, p.errors)).find(Boolean);
    setPhotoError(problem || '');
    if (!problem) setPhotos((list) => [...list, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const removePhoto = (i) => {
    setPhotos((list) => {
      URL.revokeObjectURL(list[i].url);
      return list.filter((_, j) => j !== i);
    });
    setPhotoError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await form.run(async () => {
      const { photos: _count, ...fields } = v;
      const result = await submitActivity(fields, photos.map((ph) => ph.file));
      if (result?.varg) {
        setListed(fromCms(result.varg));
        refresh();
      }
      return { sent: true };
    });
    if (ok) {
      onRecorded();
      formRef.current?.closest('.avp__panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      focusFirstInvalid(formRef.current);
    }
  };

  const startOver = () => {
    form.reset();
    photos.forEach((ph) => URL.revokeObjectURL(ph.url));
    setPhotos([]);
    setPhotoError('');
  };

  if (form.status === 'sent') {
    return (
      <div className="result result--success" role="status">
        <span className="result__icon"><Icon name="checkCircle" size={28} /></span>
        <h2 className="result__title">{p.successTitle}</h2>
        <p className="result__desc">{p.successDesc}</p>
        {listed ? <p className="result__desc">{p.listedNote(listed.schoolName, listed.district)}</p> : null}
        <div className="result__actions">
          {inModal ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={onClose} data-dismiss>{t.common.close}</button>
              {onSeeListing ? <button type="button" className="btn btn--primary" onClick={onSeeListing}>{p.seeListing}</button> : null}
            </>
          ) : (
            <>
              <button type="button" className="btn btn--primary" onClick={startOver}>{p.another}</button>
              <a href="#avp-repo" className="btn btn--ghost">{p.repoTitle}</a>
            </>
          )}
        </div>
      </div>
    );
  }

  const field = (key, id, control, extra = {}) => (
    <Field id={id} label={p[extra.labelKey || key]} required={!extra.optional} error={form.errorFor(key)} {...extra}>
      {control}
    </Field>
  );
  const useTalukaList = Boolean(v.district_id) && talukas.length > 0;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="form">
      {inModal ? null : (
        <>
          <h2 className="avp__form-title">{p.formTitle}</h2>
          <p className="field__hint">{t.common.requiredNote}</p>
        </>
      )}
      <div className="form-grid">
        {/* Choosing a division reloads the districts and clears the old
            choice (and its taluka), so a mismatched set can never be sent. */}
        {field('division_id', 'avp-division',
          <select
            {...bind('division_id', 'avp-division')}
            onChange={(e) => {
              setValue('division_id', e.target.value);
              setValue('district_id', '');
              setValue('taluka_id', '');
              setValue('taluka', '');
            }}
          >
            <option value="">{t.common.select}</option>
            {divisions.map((row) => <option key={row.id} value={row.id}>{label(row)}</option>)}
          </select>, { labelKey: 'division' })}
        {field('district_id', 'avp-district',
          <select
            {...bind('district_id', 'avp-district')}
            disabled={!v.division_id}
            onChange={(e) => {
              setValue('district_id', e.target.value);
              setValue('taluka_id', '');
              setValue('taluka', '');
            }}
          >
            <option value="">{v.division_id ? t.common.select : p.chooseDivisionFirst}</option>
            {districts.map((row) => <option key={row.id} value={row.id}>{label(row)}</option>)}
          </select>, { labelKey: 'district' })}
        {/* The taluka master covers only part of the state: where it lists
            the district's talukas they are offered, otherwise it is typed. */}
        {useTalukaList
          ? field('taluka', 'avp-taluka',
            <select
              {...bind('taluka', 'avp-taluka')}
              value={v.taluka_id}
              onChange={(e) => {
                const row = talukas.find((r) => String(r.id) === e.target.value);
                setValue('taluka_id', e.target.value);
                setValue('taluka', row ? row.name_mr : '');
              }}
            >
              <option value="">{t.common.select}</option>
              {talukas.map((row) => <option key={row.id} value={row.id}>{label(row)}</option>)}
            </select>)
          : field('taluka', 'avp-taluka',
            <input
              {...bind('taluka', 'avp-taluka')}
              maxLength={100}
              disabled={!v.district_id}
              placeholder={v.district_id ? p.talukaTyped : p.chooseDistrictFirst}
            />)}
        {field('institution_name', 'avp-institution', <input {...bind('institution_name', 'avp-institution')} maxLength={300} />, { labelKey: 'institution' })}
        {field('incharge_name', 'avp-incharge', <input {...bind('incharge_name', 'avp-incharge')} autoComplete="name" maxLength={200} />, { labelKey: 'incharge' })}
        {field('incharge_mobile', 'avp-mobile',
          <input
            {...bind('incharge_mobile', 'avp-mobile')}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel-national"
            placeholder={t.organizer.mobilePlaceholder}
            onChange={(e) => setValue('incharge_mobile', e.target.value.replace(/\D/g, ''))}
          />,
          { labelKey: 'inchargeMobile', optional: true, hint: p.optional })}
        {field('participant_count', 'avp-count',
          <input {...bind('participant_count', 'avp-count')} type="number" inputMode="numeric" min={1} max={100000} step={1} />,
          { labelKey: 'participants' })}
        <Field id="avp-frequency" label={p.frequency} required error={form.errorFor('frequency')}>
          <div
            className="avp__radios"
            role="radiogroup"
            aria-label={p.frequency}
            {...describe('avp-frequency', form.errorFor('frequency'))}
          >
            {FREQUENCIES.map((f, i) => (
              <label key={f} className={`avp__radio${v.frequency === f ? ' is-on' : ''}`}>
                <input
                  type="radio"
                  name="frequency"
                  id={i === 0 ? 'avp-frequency' : undefined}
                  value={f}
                  checked={v.frequency === f}
                  onChange={() => setValue('frequency', f)}
                  onBlur={form.blur('frequency')}
                  aria-invalid={form.errorFor('frequency') ? 'true' : undefined}
                />
                {p.frequencies[f]}
              </label>
            ))}
          </div>
        </Field>
      </div>

      <Field id="avp-photos" label={p.photos} required hint={p.photosHint} error={shownPhotoError} wide>
        <input
          ref={photoRef}
          id="avp-photos"
          type="file"
          multiple
          accept={[...ACTIVITY_PHOTO_TYPES, ...ACTIVITY_PHOTO_EXTS].join(',')}
          onChange={onPhotos}
          className="sr-only"
          {...describe('avp-photos', shownPhotoError, p.photosHint)}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => photoRef.current?.click()}
          disabled={photos.length >= ACTIVITY_PHOTO_MAX}
          aria-invalid={shownPhotoError ? 'true' : undefined}
        >
          <Icon name="camera" size={16} />
          {p.choosePhotos}
        </button>
        {photos.length ? (
          <>
            <p className="field__hint">{p.photoCount(num(photos.length))}</p>
            <ul className="avp__previews">
              {photos.map((ph, i) => (
                <li key={ph.url}>
                  <img src={ph.url} alt={ph.file.name} />
                  <span className="avp__preview-meta">{mb(ph.file.size)}</span>
                  <button type="button" className="avp__preview-remove" onClick={() => removePhoto(i)} aria-label={`${p.remove}: ${ph.file.name}`}>
                    <Icon name="close" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Field>

      {field('description', 'avp-desc', <textarea {...bind('description', 'avp-desc')} rows={5} maxLength={2000} />, {
        wide: true, optional: true, hint: `${p.descriptionHint} ${num(v.description.trim().length)} / ${num(2000)}`,
      })}

      <FormError message={form.formError} />
      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={form.status === 'busy'} aria-busy={form.status === 'busy' || undefined}>
          {form.status === 'busy' ? t.common.submitting : p.submit}
        </button>
      </div>
    </form>
  );
}
