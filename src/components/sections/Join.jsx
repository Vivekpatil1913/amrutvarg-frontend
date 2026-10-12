import Icon from '../Icon';
import { useLanguage } from '../../i18n/LanguageContext';
import { OFFICIAL_LINKS } from '../../i18n/translations';

// The three registration routes: participant (via the class list),
// organiser and Amrut Varg Leader. The organiser and leader cards carry the
// `organizer` / `leader` anchors used by the navigation.
const META = {
  participant: { icon: 'graduation', id: 'participant' },
  organizer: { icon: 'flag', id: 'organizer' },
  leader: { icon: 'award', id: 'leader' },
};

export default function Join({ onFindVarg, onOrganizer, onLeader }) {
  const { t, num } = useLanguage();
  const j = t.join;
  const actions = { participant: onFindVarg, organizer: onOrganizer, leader: onLeader };
  const labels = {
    participant: { text: j.paths[0].action, icon: 'search' },
    organizer: { text: t.common.enrollNow, icon: 'userPlus' },
    leader: { text: t.leader.registerButton, icon: 'userPlus' },
  };
  const descs = { participant: j.paths[0].desc, organizer: t.organizer.desc, leader: t.leader.desc };
  // Required fields of each form, taken from the form definitions themselves.
  const needs = {
    participant: [t.student.fullName, t.student.mobile, t.student.dob, t.student.parentName, t.student.address],
    organizer: [t.organizer.name, t.organizer.place, t.organizer.mobile, t.organizer.designation, t.organizer.district],
  };

  return (
    <section id="join" className="section join" aria-labelledby="join-title">
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {j.badge}
            </p>
            <h2 id="join-title" className="section__title">
              {j.title}
            </h2>
          </div>
          <p className="section__lead">{j.desc}</p>
        </header>

        <ol className="paths">
          {j.paths.map((p, i) => (
            <li key={p.key} id={META[p.key].id} className={`path path--${p.key}`} data-reveal style={{ '--d': i }}>
              <div className="path__top">
                <span className="path__icon">
                  <Icon name={META[p.key].icon} size={22} />
                </span>
                <span className="path__step" aria-hidden="true">
                  {num(`0${i + 1}`)}
                </span>
              </div>
              <h3 className="path__title">{p.title}</h3>
              <p className="path__desc">{descs[p.key]}</p>
              {needs[p.key] ? (
                <div className="path__needs">
                  <p className="path__needs-label">{j.needs}</p>
                  <ul className="path__chips">
                    {needs[p.key].map((label, n) => (
                      <li key={`${p.key}-need-${n}`}>{label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {p.key === 'leader' ? (
                <p className="path__note">
                  <Icon name="info" size={15} />
                  <span>
                    {t.leader.listEmpty}{' '}
                    <a href={OFFICIAL_LINKS.portal} target="_blank" rel="noopener noreferrer">
                      {t.preview.openPortal}
                      <span className="sr-only"> {t.common.opensNewTab}</span>
                    </a>
                  </span>
                </p>
              ) : null}
              <button
                type="button"
                className={`btn ${p.key === 'leader' ? 'btn--light' : 'btn--primary'} path__action`}
                onClick={actions[p.key]}
              >
                <Icon name={labels[p.key].icon} size={18} />
                {labels[p.key].text}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
