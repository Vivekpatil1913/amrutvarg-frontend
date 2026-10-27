import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import { Field, describe, FormError, focusFirstInvalid } from '../components/FormControls';
import { useLanguage } from '../i18n/LanguageContext';
import { useForm } from '../hooks/useForm';
import { useMaster } from '../data/useMasters';
import {
  isMobile, isPersonName, isRfcEmail, checkGrievancePhoto, checkGrievanceVideo,
  GRIEVANCE_MAX_PHOTOS, GRIEVANCE_PHOTO_EXTS, GRIEVANCE_VIDEO_EXTS, PHOTO_TYPES, GRIEVANCE_VIDEO_TYPES,
} from '../services/validation';
import { submitGrievance } from '../services/grievance';

// Public suggestion / complaint intake (GRIEVANCE_PATH in Header.jsx). A page
// rather than a dialog, so the header and footer can link to it and a citizen
// can bookmark it.

const INITIAL = {
  submission_type: '',
  division_id: '',
  district_id: '',
  full_name: '',
  email: '',
  mobile_number: '',
  subject: '',
  description: '',
};

const between = (v, min, max) => {
  const n = v.trim().length;
  return n >= min && n <= max;
};

const validate = (v, t) => {
  const g = t.grievance.errors;
  const e = {};
  ['submission_type', 'division_id', 'district_id', 'full_name', 'email', 'mobile_number', 'subject', 'description'].forEach((k) => {
    if (!String(v[k]).trim()) e[k] = t.errors.required;
  });
  if (v.full_name.trim() && v.full_name.trim().length < 3) e.full_name = g.nameMin;
  else if (v.full_name.trim() && !isPersonName(v.full_name)) e.full_name = g.nameLetters;
  if (v.email.trim() && !isRfcEmail(v.email)) e.email = g.email;
  if (v.mobile_number.trim() && !isMobile(v.mobile_number)) e.mobile_number = g.mobile;
  if (v.subject.trim() && !between(v.subject, 5, 120)) e.subject = g.subject;
  if (v.description.trim() && !between(v.description, 20, 2000)) e.description = g.description;
  return e;
};

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function GrievancePage() {
  const { t, lang, num } = useLanguage();
  const g = t.grievance;
  const formRef = useRef(null);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const form = useForm(INITIAL, validate, t);
  const { values: v, setValue } = form;
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [fileError, setFileError] = useState({ photos: '', video: '' });
  const [ticket, setTicket] = useState(null);

  const divisions = useMaster('vibhags');
  const districts = useMaster('districts', 'vibhag_id', v.division_id ? Number(v.division_id) : null);
  const label = (row) => (lang === 'en' && row.name_en ? row.name_en : row.name_mr);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const onPhotos = (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = '';
    if (!picked.length) return;
    const next = [...photos, ...picked];
    if (next.length > GRIEVANCE_MAX_PHOTOS) {
      setFileError((f) => ({ ...f, photos: g.errors.photoCount }));
      return;
    }
    const problem = picked.map((file) => checkGrievancePhoto(file, g.errors)).find(Boolean);
    setFileError((f) => ({ ...f, photos: problem || '' }));
    if (!problem) setPhotos(next);
  };

  const onVideo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkGrievanceVideo(file, g.errors);
    setFileError((f) => ({ ...f, video: problem || '' }));
    setVideo(problem ? null : file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await form.run(async () => {
      const result = await submitGrievance(v, photos, video);
      setTicket(result.ticket_no);
      return { sent: true };
    });
    if (ok) window.scrollTo({ top: 0, behavior: 'smooth' });
    else focusFirstInvalid(formRef.current);
  };

  const startOver = () => {
    form.reset();
    setPhotos([]);
    setVideo(null);
    setFileError({ photos: '', video: '' });
    setTicket(null);
    window.scrollTo(0, 0);
  };

  const field = (key, id, control, extra = {}) => (
    <Field id={id} label={g[extra.labelKey || key]} required error={form.errorFor(key)} {...extra}>
      {control}
    </Field>
  );

  return (
    <section className="spage" aria-labelledby="gpage-title">
      <Mandala className="spage__mandala" points={20} />
      <div className="container grievance">
        <nav className="crumbs" aria-label={t.announcements.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{g.nav}</span>
        </nav>

        <header className="spage__head">
          <h1 id="gpage-title" className="section__title">{g.title}</h1>
          <p className="section__lead">{g.desc}</p>
        </header>

        <div className="grievance__panel">
          {form.status === 'sent' ? (
            <div className="result result--success" role="status">
              <span className="result__icon"><Icon name="checkCircle" size={28} /></span>
              <h2 className="result__title">{g.successTitle}</h2>
              <p className="result__desc">{g.successDesc(ticket)}</p>
              <div className="result__actions">
                <button type="button" className="btn btn--ghost" onClick={startOver}>{g.another}</button>
                <Link to="/" className="btn btn--primary">{t.nav.home}</Link>
              </div>
            </div>
          ) : (
            <form ref={formRef} onSubmit={onSubmit} noValidate className="form">
              <p className="field__hint">{t.common.requiredNote}</p>
              <div className="form-grid">
                {field('submission_type', 'gr-type',
                  <select {...bind('submission_type', 'gr-type')}>
                    <option value="">{t.common.select}</option>
                    <option value="SUGGESTION">{g.types.SUGGESTION}</option>
                    <option value="COMPLAINT">{g.types.COMPLAINT}</option>
                  </select>, { labelKey: 'type' })}
                <span className="grievance__spacer" aria-hidden="true" />
                {/* Choosing a division reloads the district list and clears the
                    old choice, so a mismatched pair can never be submitted. */}
                {field('division_id', 'gr-division',
                  <select
                    {...bind('division_id', 'gr-division')}
                    onChange={(e) => { setValue('division_id', e.target.value); setValue('district_id', ''); }}
                  >
                    <option value="">{t.common.select}</option>
                    {divisions.map((row) => <option key={row.id} value={row.id}>{label(row)}</option>)}
                  </select>, { labelKey: 'division' })}
                {field('district_id', 'gr-district',
                  <select {...bind('district_id', 'gr-district')} disabled={!v.division_id}>
                    <option value="">{v.division_id ? t.common.select : g.chooseDivisionFirst}</option>
                    {districts.map((row) => <option key={row.id} value={row.id}>{label(row)}</option>)}
                  </select>, { labelKey: 'district' })}
                {field('full_name', 'gr-name', <input {...bind('full_name', 'gr-name')} autoComplete="name" maxLength={100} />, { labelKey: 'fullName' })}
                {field('email', 'gr-email', <input {...bind('email', 'gr-email')} type="email" autoComplete="email" maxLength={254} />)}
                {field('mobile_number', 'gr-mobile',
                  <input {...bind('mobile_number', 'gr-mobile')} type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder={t.organizer.mobilePlaceholder} />,
                  { labelKey: 'mobile' })}
              </div>
              {field('subject', 'gr-subject', <input {...bind('subject', 'gr-subject')} maxLength={120} />, {
                wide: true, hint: `${num(v.subject.trim().length)} / ${num(120)}`,
              })}
              {field('description', 'gr-desc', <textarea {...bind('description', 'gr-desc')} rows={6} maxLength={2000} />, {
                wide: true, labelKey: 'description', hint: `${num(v.description.trim().length)} / ${num(2000)}`,
              })}

              <div className="form-grid">
                <Field id="gr-photos" label={g.photos} hint={g.photosHint} error={fileError.photos || form.errorFor('photos')}>
                  <input
                    ref={photoRef}
                    id="gr-photos"
                    type="file"
                    multiple
                    accept={[...PHOTO_TYPES, ...GRIEVANCE_PHOTO_EXTS].join(',')}
                    onChange={onPhotos}
                    className="sr-only"
                    {...describe('gr-photos', fileError.photos, g.photosHint)}
                  />
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => photoRef.current?.click()} disabled={photos.length >= GRIEVANCE_MAX_PHOTOS}>
                    <Icon name="camera" size={16} />
                    {g.choosePhotos}
                  </button>
                  {photos.length ? (
                    <ul className="grievance__files">
                      {photos.map((file, i) => (
                        <li key={`${file.name}-${i}`}>
                          <span>{file.name} · {mb(file.size)}</span>
                          <button type="button" className="btn btn--text btn--sm" onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}>
                            <Icon name="close" size={14} />{g.remove}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Field>
                <Field id="gr-video" label={g.video} hint={g.videoHint} error={fileError.video || form.errorFor('video')}>
                  <input
                    ref={videoRef}
                    id="gr-video"
                    type="file"
                    accept={[...GRIEVANCE_VIDEO_TYPES, ...GRIEVANCE_VIDEO_EXTS].join(',')}
                    onChange={onVideo}
                    className="sr-only"
                    {...describe('gr-video', fileError.video, g.videoHint)}
                  />
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => videoRef.current?.click()}>
                    <Icon name="film" size={16} />
                    {g.chooseVideo}
                  </button>
                  {video ? (
                    <ul className="grievance__files">
                      <li>
                        <span>{video.name} · {mb(video.size)}</span>
                        <button type="button" className="btn btn--text btn--sm" onClick={() => setVideo(null)}>
                          <Icon name="close" size={14} />{g.remove}
                        </button>
                      </li>
                    </ul>
                  ) : null}
                </Field>
              </div>

              <FormError message={form.formError} />
              <div className="form-actions">
                <button type="submit" className="btn btn--primary" disabled={form.status === 'busy'} aria-busy={form.status === 'busy' || undefined}>
                  {form.status === 'busy' ? t.common.submitting : g.submit}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
