import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { DIRECTORY_PATH } from '../layout/Header';
import Mandala from '../Mandala';
import { useLanguage } from '../../i18n/LanguageContext';
import { OFFICIAL_LINKS, STATE_COORDINATOR_PHONE } from '../../i18n/translations';
import { copyText } from '../../services/clipboard';

const INTENTS = [
  { key: 'start', icon: 'flag' },
  { key: 'district', icon: 'mapPin' },
  { key: 'join', icon: 'graduation' },
  { key: 'official', icon: 'building' },
];


function ExternalLink({ href, children, className }) {
  const { t } = useLanguage();
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> {t.common.opensNewTab}</span>
    </a>
  );
}

export default function Contact({ onOrganizer, onFindVarg }) {
  const { t } = useLanguage();
  const c = t.contact;
  const r = t.resources;
  const [intent, setIntent] = useState('start');
  const [copied, setCopied] = useState(false);
  const tabRefs = useRef({});
  const baseId = useId();
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    if (await copyText(STATE_COORDINATOR_PHONE)) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    }
  };

  // Arrow keys move between the intent tabs (roving focus, WAI-ARIA tabs pattern).
  const onTabKey = (e, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next = null;
    if (step) next = (index + step + INTENTS.length) % INTENTS.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = INTENTS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const key = INTENTS[next].key;
    setIntent(key);
    tabRefs.current[key]?.focus();
  };

  const panels = {
    start: (
      <>
        <p className="desk__text">{t.organizer.desc}</p>
        <div className="desk__actions">
          <button type="button" className="btn btn--primary" onClick={onOrganizer}>
            <Icon name="userPlus" size={16} />
            {t.organizer.title}
          </button>
          <a className="btn btn--ghost" href={`tel:${STATE_COORDINATOR_PHONE}`}>
            <Icon name="phone" size={16} />
            {c.call}
          </a>
        </div>
      </>
    ),
    district: (
      <>
        <p className="desk__text">{c.districtDesc}</p>
        <div className="desk__actions">
          <Link className="btn btn--primary" to={DIRECTORY_PATH}>
            {c.districtLink}
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </>
    ),
    join: (
      <>
        <p className="desk__text">{t.join.paths[0].desc}</p>
        <div className="desk__actions">
          <button type="button" className="btn btn--primary" onClick={onFindVarg}>
            <Icon name="search" size={16} />
            {t.join.paths[0].action}
          </button>
          <ExternalLink className="btn btn--ghost" href={OFFICIAL_LINKS.portal}>
            {r.items[0].title}
            <Icon name="external" size={16} />
          </ExternalLink>
        </div>
      </>
    ),
    official: (
      <ul className="desk__links">
        {r.items
          .filter((item) => item.key !== 'coordinators')
          .map((item) => (
            <li key={item.key}>
              <ExternalLink className="desk__link" href={OFFICIAL_LINKS[item.key]}>
                <span className="desk__link-icon">
                  <Icon name={item.key === 'portal' ? 'globe' : 'building'} size={18} />
                </span>
                <span className="desk__link-text">
                  <span className="desk__link-title">{item.title}</span>
                  <span className="desk__link-desc">{item.desc}</span>
                </span>
                <Icon name="external" size={16} className="desk__link-arrow" />
              </ExternalLink>
            </li>
          ))}
      </ul>
    ),
  };

  const current = INTENTS.find((i) => i.key === intent);

  return (
    <section id="contact" className="section help" aria-labelledby="contact-title">
      <Mandala className="help__mandala" points={24} />
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {c.badge}
            </p>
            <h2 id="contact-title" className="section__title">
              {c.sectionTitle}
            </h2>
          </div>
          <p className="section__lead">{c.lead}</p>
        </header>

        <div className="help__grid">
          {/* Direct line to the state coordinator: compact contact bar */}
          <article className="line" data-reveal>
            <span className="line__icon" aria-hidden="true">
              <Icon name="phone" size={18} />
            </span>

            <div className="line__meta">
              <p className="line__label">
                <span className="line__live" aria-hidden="true" />
                {c.directLine}
              </p>
              <h3 className="line__title">{c.cardTitle}</h3>
              <p className="line__desc">{c.cardDesc}</p>
            </div>

            <div className="line__actions">
              <a className="line__btn line__btn--solid" href={`tel:${STATE_COORDINATOR_PHONE}`}>
                <Icon name="phone" size={15} />
                {c.call}
              </a>
              <button type="button" className={`line__btn${copied ? ' is-done' : ''}`} onClick={onCopy}>
                <Icon name={copied ? 'check' : 'file'} size={15} />
                {copied ? c.copied : c.copy}
              </button>
            </div>
            <p className="sr-only" role="status" aria-live="polite">
              {copied ? c.copied : ''}
            </p>
          </article>

          {/* Need-based help desk */}
          <div className="desk" data-reveal style={{ '--d': 1 }}>
            <h3 className="desk__title">{c.helpTitle}</h3>
            <div className="desk__tabs" role="tablist" aria-label={c.helpTitle}>
              {INTENTS.map((it, i) => {
                const selected = intent === it.key;
                return (
                  <button
                    key={it.key}
                    ref={(el) => {
                      tabRefs.current[it.key] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`${baseId}-tab-${it.key}`}
                    aria-selected={selected}
                    aria-controls={`${baseId}-panel`}
                    tabIndex={selected ? 0 : -1}
                    className="desk__tab"
                    onClick={() => setIntent(it.key)}
                    onKeyDown={(e) => onTabKey(e, i)}
                  >
                    <span className="desk__tab-icon">
                      <Icon name={it.icon} size={18} />
                    </span>
                    <span className="desk__tab-label">{c.intents[it.key]}</span>
                    <Icon name="arrowRight" size={16} className="desk__tab-arrow" />
                  </button>
                );
              })}
            </div>

            <div
              id={`${baseId}-panel`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-${intent}`}
              className="desk__panel"
            >
              <div key={intent} className="desk__panel-inner">
                <h4 className="desk__panel-title">
                  <span className="desk__panel-icon">
                    <Icon name={current.icon} size={18} />
                  </span>
                  {c.intents[intent]}
                </h4>
                {panels[intent]}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
