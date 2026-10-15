import Icon from '../Icon';
import { useLanguage } from '../../i18n/LanguageContext';
import { OFFICIAL_LINKS } from '../../i18n/translations';
import { useJoin } from '../../data/useJoin';
import { pick } from '../../data/useHero';

// The three registration routes: student (via the class list — the student
// form belongs to a chosen Varg), organiser and Amrut Varg Leader.
//
// Content comes from the CMS when it is reachable and falls back to the bundled
// translations otherwise, so the section always renders something complete.
//
// `action` decides which flow a card's button opens. It is an enum, not free
// text: every value is wired to a handler here, so a card can never carry a
// button that does nothing.
//
// It also maps to the slug the anchor links and the per-card styling already
// use (#participant, .path--participant), which is why the map is kept rather
// than deriving the slug from the action name.
const SLUGS = { varg: 'participant', organizer: 'organizer', leader: 'leader' };

// React key for a card. Deliberately derived from the slug and position rather
// than the record id: the bundled fallback renders first and the CMS copy swaps
// in a moment later, and a key that changed between the two would make React
// replace the <li> instead of updating it. The replacement is a fresh node, so
// the reveal attribute and the header's scroll-spy observer — both bound to the
// element that existed at mount — would quietly stop applying to it.
const cardKey = (card, i) => `${SLUGS[card.action]}-${i}`;

// Shape of the bundled fallback, kept in the same field order the CMS sends so
// the two render through one code path.
function bundled(t) {
  const j = t.join;
  const chips = (labels) => labels.map((label, n) => ({ id: `need-${n}`, label }));
  return [
    {
      key: 'participant', action: 'varg', icon: 'graduation', actionIcon: 'graduation',
      title: j.paths[0].title, desc: j.paths[0].desc,
      needs: chips([t.student.fullName, t.student.mobile, t.student.dob, t.student.parentName, t.student.address]),
      note: j.paths[0].note, linkNote: '', linkLabel: '', linkUrl: '',
      actionLabel: j.paths[0].action,
    },
    {
      key: 'organizer', action: 'organizer', icon: 'flag', actionIcon: 'userPlus',
      title: j.paths[1].title, desc: t.organizer.desc,
      needs: chips([t.organizer.name, t.organizer.place, t.organizer.mobile, t.organizer.designation, t.organizer.district]),
      note: '', linkNote: '', linkLabel: '', linkUrl: '',
      actionLabel: j.paths[1].action,
    },
    {
      key: 'leader', action: 'leader', icon: 'award', actionIcon: 'userPlus',
      title: j.paths[2].title, desc: t.leader.desc,
      needs: [],
      note: '',
      linkNote: t.leader.listEmpty, linkLabel: t.preview.openPortal, linkUrl: OFFICIAL_LINKS.portal,
      actionLabel: t.leader.registerButton,
    },
  ];
}

export default function Join({ onFindVarg, onOrganizer, onLeader }) {
  const { t, num, lang } = useLanguage();
  const j = t.join;
  const cms = useJoin();
  const handlers = { varg: onFindVarg, organizer: onOrganizer, leader: onLeader };

  const cards = cms
    ? cms.cards.map((card) => ({
        key: card.id,
        action: card.action,
        icon: card.icon,
        actionIcon: card.action_icon,
        title: pick(card, 'title', lang),
        desc: pick(card, 'desc', lang),
        needs: (card.needs ?? []).map((need) => ({ id: need.id, label: pick(need, 'label', lang) })),
        note: pick(card, 'note', lang),
        linkNote: pick(card, 'link_note', lang),
        linkLabel: pick(card, 'link_label', lang),
        linkUrl: card.link_url ?? '',
        actionLabel: pick(card, 'action', lang),
      }))
    : bundled(t);

  const badge = cms ? pick(cms.text, 'badge', lang) : j.badge;
  const title = cms ? pick(cms.text, 'title', lang) : j.title;
  const lead = cms ? pick(cms.text, 'lead', lang) : j.desc;
  const needsLabel = cms ? pick(cms.text, 'needs_label', lang) : j.needs;
  const showDot = cms ? cms.text.eyebrow_dot !== false : true;

  return (
    <section id="join" className="section join" aria-labelledby="join-title">
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            {badge ? (
              <p className="eyebrow">
                {showDot ? <span className="eyebrow__dot" aria-hidden="true" /> : null}
                {badge}
              </p>
            ) : null}
            <h2 id="join-title" className="section__title">
              {title}
            </h2>
          </div>
          {lead ? <p className="section__lead">{lead}</p> : null}
        </header>

        {cards.length ? (
          <ol className="paths">
            {cards.map((card, i) => (
              <li
                key={cardKey(card, i)}
                id={SLUGS[card.action]}
                className={`path path--${SLUGS[card.action]}`}
                data-reveal
                style={{ '--d': i }}
              >
                <div className="path__top">
                  <span className="path__icon">
                    <Icon name={card.icon} size={22} />
                  </span>
                  <span className="path__step" aria-hidden="true">
                    {num(`0${i + 1}`)}
                  </span>
                </div>
                <h3 className="path__title">{card.title}</h3>
                {card.desc ? <p className="path__desc">{card.desc}</p> : null}
                {card.needs.length ? (
                  <div className="path__needs">
                    {needsLabel ? <p className="path__needs-label">{needsLabel}</p> : null}
                    <ul className="path__chips">
                      {card.needs.map((need) => (
                        <li key={`${card.key}-${need.id}`}>{need.label}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {card.note ? (
                  <p className="path__note path__note--light">
                    <Icon name="info" size={15} />
                    <span>{card.note}</span>
                  </p>
                ) : null}
                {card.linkUrl && card.linkLabel ? (
                  <p className="path__note path__note--light">
                    <Icon name="info" size={15} />
                    <span>
                      {card.linkNote ? `${card.linkNote} ` : null}
                      <a href={card.linkUrl} target="_blank" rel="noopener noreferrer">
                        {card.linkLabel}
                        <span className="sr-only"> {t.common.opensNewTab}</span>
                      </a>
                    </span>
                  </p>
                ) : null}
                <button
                  type="button"
                  className="btn btn--primary path__action"
                  onClick={handlers[card.action]}
                >
                  <Icon name={card.actionIcon} size={18} />
                  {card.actionLabel}
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
