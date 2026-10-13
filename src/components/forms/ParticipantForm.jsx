import { useRef } from 'react';
import Modal from '../Modal';
import {
  DistrictOptions,
  Field,
  FormStep,
  describe,
  FormActions,
  FormError,
  PreviewResult,
  SuccessResult,
  focusFirstInvalid,
} from '../FormControls';
import { useLanguage } from '../../i18n/LanguageContext';
import { vargPlaceName } from '../../data/vargNamesEn';
import { useForm } from '../../hooks/useForm';
import { isDate, isEmail, isMobile, isPastDate, isPin } from '../../services/validation';
import { submitParticipant } from '../../services/submissions';

// Options and rules carried over from the live portal's participant form.
// School students get a short form (no mobile number); college students get
// the full form. A school registration is still sent as course SCHOOL_STUDENT.
const CATEGORIES = ['SCHOOL', 'COLLEGE'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const COLLEGE_COURSES = ['BBA', 'BCA', 'BTECH_COSMETICS', 'BSC_IT'];
const LANGS = ['MARATHI', 'HINDI', 'ENGLISH', 'OTHER'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SEMESTERS = ['I', 'II', 'III', 'IV'];
const STANDARDS = Array.from({ length: 12 }, (_, i) => i + 1);
const yearsFor = (course) => (course === 'BTECH_COSMETICS' ? [1, 2, 3, 4] : [1, 2, 3]);

const INITIAL = {
  category: '',
  name: '',
  mobile: '',
  education: '',
  gender: '',
  dateOfBirth: '',
  bloodGroup: '',
  whatsappNumber: '',
  sameAsMobile: false,
  email: '',
  course: '',
  standard: '',
  academicYear: '',
  semester: '',
  rollNumber: '',
  address: '',
  parentGuardianName: '',
  cityTaluka: '',
  district: '',
  pinCode: '',
  languagesKnown: [],
  otherLanguage: '',
  skills: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  declarationAccepted: false,
};

const validate = (v, t) => {
  const e = {};
  const req = (k) => {
    if (!String(v[k]).trim()) e[k] = t.errors.required;
  };
  if (!v.category) {
    e.category = t.errors.selectOption;
    return e;
  }
  req('name');
  if (!v.gender) e.gender = t.errors.selectOption;
  if (!v.dateOfBirth) e.dateOfBirth = t.errors.required;
  else if (!isDate(v.dateOfBirth)) e.dateOfBirth = t.errors.date;
  else if (!isPastDate(v.dateOfBirth)) e.dateOfBirth = t.errors.dobPast;
  if (!v.declarationAccepted) e.declarationAccepted = t.errors.declaration;

  if (v.category === 'SCHOOL') {
    if (!v.standard) e.standard = t.errors.selectOption;
    req('parentGuardianName');
    return e;
  }

  req('education');
  if (!v.mobile.trim()) e.mobile = t.errors.required;
  else if (!isMobile(v.mobile)) e.mobile = t.errors.mobile;
  if (v.whatsappNumber.trim() && !isMobile(v.whatsappNumber)) e.whatsappNumber = t.errors.mobile;
  if (v.email.trim() && !isEmail(v.email)) e.email = t.errors.email;
  if (!v.course) e.course = t.errors.selectOption;
  else {
    if (!v.academicYear) e.academicYear = t.errors.selectOption;
    if (!v.semester) e.semester = t.errors.selectOption;
  }
  req('address');
  req('parentGuardianName');
  req('cityTaluka');
  req('district');
  if (!v.pinCode.trim()) e.pinCode = t.errors.required;
  else if (!isPin(v.pinCode)) e.pinCode = t.errors.pin;
  if (v.languagesKnown.includes('OTHER') && !v.otherLanguage.trim()) e.otherLanguage = t.errors.required;
  req('emergencyContactName');
  req('emergencyContactRelationship');
  if (!v.emergencyContactPhone.trim()) e.emergencyContactPhone = t.errors.required;
  else if (!isMobile(v.emergencyContactPhone)) e.emergencyContactPhone = t.errors.mobile;
  return e;
};

const toPayload = (v, vargId) => {
  // School: only the short form's fields; nothing hidden is sent.
  if (v.category === 'SCHOOL') {
    return {
      amrutVargId: vargId,
      name: v.name.trim(),
      gender: v.gender,
      dateOfBirth: v.dateOfBirth,
      course: 'SCHOOL_STUDENT',
      standard: v.standard,
      parentGuardianName: v.parentGuardianName.trim(),
      declarationAccepted: true,
    };
  }
  const opt = (s) => s.trim() || undefined;
  return {
    amrutVargId: vargId,
    name: v.name.trim(),
    mobile: v.mobile.trim(),
    education: v.education.trim(),
    gender: v.gender,
    dateOfBirth: v.dateOfBirth,
    bloodGroup: v.bloodGroup || undefined,
    whatsappNumber: opt(v.whatsappNumber),
    email: opt(v.email),
    course: v.course,
    academicYear: Number(v.academicYear),
    semester: Number(v.semester),
    rollNumber: opt(v.rollNumber),
    address: v.address.trim(),
    parentGuardianName: v.parentGuardianName.trim(),
    cityTaluka: v.cityTaluka.trim(),
    district: v.district.trim(),
    pinCode: v.pinCode.trim(),
    languagesKnown: v.languagesKnown,
    otherLanguage: v.languagesKnown.includes('OTHER') ? v.otherLanguage.trim() : undefined,
    skills: opt(v.skills),
    emergencyContactName: v.emergencyContactName.trim(),
    emergencyContactRelationship: v.emergencyContactRelationship.trim(),
    emergencyContactPhone: v.emergencyContactPhone.trim(),
    declarationAccepted: true,
  };
};

export default function ParticipantForm({ varg, onClose }) {
  const { t, lang } = useLanguage();
  const s = t.student;
  const formRef = useRef(null);
  const form = useForm(INITIAL, validate, t);
  const { values: v, setValue, setValues } = form;
  const placeName = vargPlaceName(varg, lang);
  const school = v.category === 'SCHOOL';
  const college = v.category === 'COLLEGE';

  const close = () => {
    form.reset();
    onClose();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await form.run(() => submitParticipant(toPayload(v, varg.id)));
    if (!ok) focusFirstInvalid(formRef.current);
  };

  // Text/select binding with error wiring.
  const bind = (key, id, hint) => {
    const error = form.errorFor(key);
    return {
      id,
      value: v[key],
      onChange: (e) => setValue(key, e.target.value),
      onBlur: form.blur(key),
      ...describe(id, error, hint),
    };
  };
  const field = (key, id, label, required, control, extra = {}) => (
    <Field id={id} label={label} required={required} error={form.errorFor(key)} {...extra}>
      {control}
    </Field>
  );

  // Switching category swaps the visible fields; the course follows it.
  const onCategory = (category) =>
    setValues((prev) => ({
      ...prev,
      category,
      course: category === 'SCHOOL' ? 'SCHOOL_STUDENT' : prev.course === 'SCHOOL_STUDENT' ? '' : prev.course,
    }));

  const onCourse = (course) =>
    setValues((prev) => ({
      ...prev,
      course,
      academicYear: yearsFor(course).includes(Number(prev.academicYear)) ? prev.academicYear : '',
    }));

  const toggleLanguage = (code, checked) =>
    setValues((prev) => ({
      ...prev,
      languagesKnown: checked ? [...prev.languagesKnown, code] : prev.languagesKnown.filter((l) => l !== code),
      otherLanguage: code === 'OTHER' && !checked ? '' : prev.otherLanguage,
    }));

  const done = form.status === 'preview' || form.status === 'sent';
  const declError = form.errorFor('declarationAccepted');
  const catError = form.errorFor('category');

  return (
    <Modal open={!!varg} onClose={close} icon="graduation" title={s.title} subtitle={done ? placeName : t.common.requiredNote} size="lg">
      {form.status === 'preview' ? <PreviewResult onClose={close} /> : null}
      {form.status === 'sent' ? (
        <SuccessResult title={s.successTitle} desc={s.successDesc(placeName)} onClose={close} />
      ) : null}
      {!done && varg ? (
        <form ref={formRef} onSubmit={onSubmit} noValidate className="form">
          <FormStep step={1} title={s.sectionBasic}>
            <p className="form__lead">{s.behalfNote}</p>
            <Field id="st-place" label={s.place} wide>
              <input id="st-place" className="input" value={placeName} readOnly />
            </Field>
            <div className={`field field--wide${catError ? ' field--error' : ''}`} role="radiogroup" aria-labelledby="st-category-label">
              <p id="st-category-label" className="field__label">
                {s.category}
                <span className="field__req" aria-hidden="true">
                  {' '}
                  *
                </span>
              </p>
              <div className="check-row">
                {CATEGORIES.map((c, i) => (
                  <label key={c} className="check check--pill">
                    <input
                      type="radio"
                      name="st-category"
                      value={c}
                      checked={v.category === c}
                      onChange={() => onCategory(c)}
                      onBlur={form.blur('category')}
                      {...(i === 0 ? describe('st-category', catError) : {})}
                    />
                    <span>{s.categories[c]}</span>
                  </label>
                ))}
              </div>
              {catError ? (
                <p id="st-category-error" className="field__error" role="alert">
                  {catError}
                </p>
              ) : null}
            </div>
            {v.category ? (
              <div className="form-grid">
                {field('name', 'st-name', s.fullName, true, <input className="input" {...bind('name', 'st-name')} autoComplete="name" maxLength={255} />)}
                {college ? (
                  <>
                    {field(
                      'mobile',
                      'st-mobile',
                      s.mobile,
                      true,
                      <input
                        className="input"
                        {...bind('mobile', 'st-mobile')}
                        onChange={(e) =>
                          setValues((p) => ({ ...p, mobile: e.target.value, whatsappNumber: p.sameAsMobile ? e.target.value : p.whatsappNumber }))
                        }
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        autoComplete="tel-national"
                        placeholder={t.organizer.mobilePlaceholder}
                      />,
                    )}
                    {field('education', 'st-education', s.education, true, <input className="input" {...bind('education', 'st-education')} maxLength={255} />)}
                  </>
                ) : null}
              </div>
            ) : null}
          </FormStep>

          {v.category ? (
            <FormStep step={2} title={s.sectionPersonal}>
              <div className="form-grid">
                {field(
                  'gender',
                  'st-gender',
                  s.gender,
                  true,
                  <select className="input" {...bind('gender', 'st-gender')}>
                    <option value="">{t.common.select}</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {s.genders[g]}
                      </option>
                    ))}
                  </select>,
                )}
                {field(
                  'dateOfBirth',
                  'st-dob',
                  s.dob,
                  true,
                  <input className="input" {...bind('dateOfBirth', 'st-dob')} type="date" max={new Date().toISOString().slice(0, 10)} autoComplete="bday" />,
                )}
                {school
                  ? field('parentGuardianName', 'st-parent', s.parentName, true, <input className="input" {...bind('parentGuardianName', 'st-parent')} maxLength={255} />)
                  : null}
                {college ? (
                  <>
                    {field(
                      'bloodGroup',
                      'st-blood',
                      s.bloodGroup,
                      false,
                      <select className="input" {...bind('bloodGroup', 'st-blood')}>
                        <option value="">{t.common.select}</option>
                        {BLOOD_GROUPS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>,
                    )}
                    {field('email', 'st-email', s.email, false, <input className="input" {...bind('email', 'st-email')} type="email" autoComplete="email" maxLength={255} />)}
                    <Field id="st-whatsapp" label={s.whatsapp} error={form.errorFor('whatsappNumber')}>
                      <input
                        className="input"
                        {...bind('whatsappNumber', 'st-whatsapp')}
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        disabled={v.sameAsMobile}
                        placeholder={t.organizer.mobilePlaceholder}
                      />
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={v.sameAsMobile}
                          onChange={(e) =>
                            setValues((p) => ({ ...p, sameAsMobile: e.target.checked, whatsappNumber: e.target.checked ? p.mobile : p.whatsappNumber }))
                          }
                        />
                        <span>{s.sameAsMobile}</span>
                      </label>
                    </Field>
                  </>
                ) : null}
              </div>
            </FormStep>
          ) : null}

          {v.category ? (
            <FormStep step={3} title={s.sectionAcademic}>
              <div className="form-grid">
                {school
                  ? field(
                      'standard',
                      'st-standard',
                      s.standard,
                      true,
                      <select className="input" {...bind('standard', 'st-standard')}>
                        <option value="">{t.common.select}</option>
                        {STANDARDS.map((n) => (
                          <option key={n} value={String(n)}>
                            {s.standardOption(n)}
                          </option>
                        ))}
                      </select>,
                    )
                  : null}
                {college ? (
                  <>
                    {field(
                      'course',
                      'st-course',
                      s.course,
                      true,
                      <select className="input" {...bind('course', 'st-course')} onChange={(e) => onCourse(e.target.value)}>
                        <option value="">{t.common.select}</option>
                        {COLLEGE_COURSES.map((c) => (
                          <option key={c} value={c}>
                            {s.courses[c]}
                          </option>
                        ))}
                      </select>,
                    )}
                    {v.course ? (
                      <>
                        {field(
                          'academicYear',
                          'st-year',
                          s.year,
                          true,
                          <select className="input" {...bind('academicYear', 'st-year')}>
                            <option value="">{t.common.select}</option>
                            {yearsFor(v.course).map((y) => (
                              <option key={y} value={String(y)}>
                                {s.years[y]}
                              </option>
                            ))}
                          </select>,
                        )}
                        {field(
                          'semester',
                          'st-semester',
                          s.semester,
                          true,
                          <select className="input" {...bind('semester', 'st-semester')}>
                            <option value="">{t.common.select}</option>
                            {SEMESTERS.map((label, i) => (
                              <option key={label} value={String(i + 1)}>
                                {label}
                              </option>
                            ))}
                          </select>,
                        )}
                      </>
                    ) : null}
                    {field('rollNumber', 'st-roll', s.rollNumber, false, <input className="input" {...bind('rollNumber', 'st-roll')} maxLength={50} />)}
                  </>
                ) : null}
              </div>
            </FormStep>
          ) : null}

          {college ? (
            <>
              <FormStep step={4} title={s.sectionAddress}>
                {field(
                  'address',
                  'st-address',
                  s.address,
                  true,
                  <textarea className="input" {...bind('address', 'st-address')} rows={2} maxLength={500} autoComplete="street-address" />,
                  { wide: true },
                )}
                <div className="form-grid">
                  {field('parentGuardianName', 'st-parent', s.parentName, true, <input className="input" {...bind('parentGuardianName', 'st-parent')} maxLength={255} />)}
                  {field('cityTaluka', 'st-city', s.cityTaluka, true, <input className="input" {...bind('cityTaluka', 'st-city')} maxLength={255} />)}
                  {field(
                    'district',
                    'st-district',
                    s.district,
                    true,
                    <select className="input" {...bind('district', 'st-district')}>
                      <DistrictOptions />
                    </select>,
                  )}
                  {field(
                    'pinCode',
                    'st-pin',
                    s.pinCode,
                    true,
                    <input className="input" {...bind('pinCode', 'st-pin')} inputMode="numeric" maxLength={6} autoComplete="postal-code" />,
                  )}
                </div>
              </FormStep>

              <FormStep step={5} title={s.sectionLanguages}>
                <div className="field field--wide" role="group" aria-labelledby="st-languages-label">
                  <p id="st-languages-label" className="field__label">
                    {s.languagesKnown}
                  </p>
                  <div className="check-row">
                    {LANGS.map((code) => (
                      <label key={code} className="check check--pill">
                        <input
                          type="checkbox"
                          checked={v.languagesKnown.includes(code)}
                          onChange={(e) => toggleLanguage(code, e.target.checked)}
                        />
                        <span>{s.languages[code]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {v.languagesKnown.includes('OTHER')
                  ? field(
                      'otherLanguage',
                      'st-other-language',
                      s.otherLanguage,
                      true,
                      <input className="input" {...bind('otherLanguage', 'st-other-language')} maxLength={100} />,
                      { wide: true },
                    )
                  : null}
                {field(
                  'skills',
                  'st-skills',
                  s.skills,
                  false,
                  <textarea className="input" {...bind('skills', 'st-skills')} rows={3} maxLength={2000} placeholder={s.skillsPlaceholder} />,
                  { wide: true },
                )}
              </FormStep>

              <FormStep step={6} title={s.sectionEmergency}>
                <div className="form-grid">
                  {field('emergencyContactName', 'st-em-name', s.emergencyName, true, <input className="input" {...bind('emergencyContactName', 'st-em-name')} maxLength={255} />)}
                  {field(
                    'emergencyContactRelationship',
                    'st-em-rel',
                    s.emergencyRelationship,
                    true,
                    <input className="input" {...bind('emergencyContactRelationship', 'st-em-rel')} maxLength={100} />,
                  )}
                  {field(
                    'emergencyContactPhone',
                    'st-em-phone',
                    s.emergencyPhone,
                    true,
                    <input
                      className="input"
                      {...bind('emergencyContactPhone', 'st-em-phone')}
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder={t.organizer.mobilePlaceholder}
                    />,
                  )}
                </div>
              </FormStep>
            </>
          ) : null}

          {v.category ? (
            <FormStep step={school ? 4 : 7} title={s.sectionDeclaration}>
              <blockquote className="declaration">“{s.declarationText}”</blockquote>
              <div className={`field field--wide${declError ? ' field--error' : ''}`}>
                <label className="check check--strong">
                  <input
                    id="st-declaration"
                    type="checkbox"
                    checked={v.declarationAccepted}
                    onChange={(e) => {
                      setValue('declarationAccepted', e.target.checked);
                      form.touch('declarationAccepted');
                    }}
                    {...describe('st-declaration', declError)}
                  />
                  <span>
                    {s.declarationAccept}
                    <span className="field__req" aria-hidden="true">
                      {' '}
                      *
                    </span>
                  </span>
                </label>
                {declError ? (
                  <p id="st-declaration-error" className="field__error" role="alert">
                    {declError}
                  </p>
                ) : null}
              </div>
            </FormStep>
          ) : null}

          <FormError message={form.formError} />
          <FormActions onCancel={close} busy={form.status === 'busy'} submitLabel={t.common.enrollNow} />
        </form>
      ) : null}
    </Modal>
  );
}
