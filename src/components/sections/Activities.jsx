import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { useLanguage } from '../../i18n/LanguageContext';
import { useActivities } from '../../data/useActivities';
import { pick } from '../../data/useHero';

// One icon per curriculum area, keyed by the item's `key` in translations.
// Used only for the bundled fallback; CMS cards carry their own icon.
const ICONS = {
  yoga: 'sun',
  shlok: 'scroll',
  indoor: 'bulb',
  outdoor: 'ball',
  songs: 'music',
  stories: 'sparkle',
};

// Content comes from the CMS when it is reachable and falls back to the bundled
// translations otherwise, so the section always renders something complete.
export default function Activities({ onNavigate }) {
  const { t, num, lang } = useLanguage();
  const a = t.activities;
  const cms = useActivities();

  const items = cms
    ? cms.items.map((it) => ({
        key: it.id,
        icon: it.icon,
        title: pick(it, 'title', lang),
        gains: (lang === 'en' && it.gains_en?.length ? it.gains_en : it.gains_mr) ?? [],
      }))
    : a.items.map((item) => ({
        key: item.key,
        icon: ICONS[item.key],
        title: item.title,
        gains: item.gains,
      }));

  const badge = cms ? pick(cms.text, 'badge', lang) : a.badge;
  const title = cms ? pick(cms.text, 'title', lang) : a.title;
  const lead = cms ? pick(cms.text, 'lead', lang) : a.lead;
  const gainsLabel = cms ? pick(cms.text, 'gains_label', lang) : a.gainsLabel;
  const showDot = cms ? cms.text.eyebrow_dot !== false : true;

  const cta = cms ? cms.cta : { label_mr: a.viewSession, target: '#session' };
  const ctaLabel = cms ? (cta ? pick(cta, 'label', lang) : '') : a.viewSession;
  const isSection = (target) => typeof target === 'string' && target.startsWith('#');

  return (
    <section id="activities" className="section activities" aria-labelledby="activities-title">
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            {badge ? (
              <p className="eyebrow">
                {showDot ? <span className="eyebrow__dot" aria-hidden="true" /> : null}
                {badge}
              </p>
            ) : null}
            <h2 id="activities-title" className="section__title">
              {title}
            </h2>
          </div>
          {lead ? <p className="section__lead">{lead}</p> : null}
        </header>

        {items.length ? (
          <ol className="curr" data-reveal>
            {items.map((item, i) => (
              <li key={item.key} className={`curr__card curr__card--${item.key}`} style={{ '--i': i }}>
                <div className="curr__top">
                  <span className="curr__icon" aria-hidden="true">
                    <Icon name={item.icon} size={24} />
                  </span>
                  <span className="curr__num" aria-hidden="true">
                    {num(`0${i + 1}`)}
                  </span>
                </div>
                <h3 className="curr__title">{item.title}</h3>
                {item.gains.length ? (
                  <>
                    {gainsLabel ? <p className="curr__gains-label">{gainsLabel}</p> : null}
                    <ul className="curr__gains">
                      {item.gains.map((g, n) => (
                        <li key={`${item.key}-${n}`}>{g}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}

        {cta && ctaLabel ? (
          <div className="curr__foot" data-reveal>
            {isSection(cta.target) ? (
              <button type="button" className="btn btn--ghost" onClick={() => onNavigate(cta.target.slice(1))}>
                {ctaLabel}
                <Icon name="arrowRight" size={16} />
              </button>
            ) : (
              <Link to={cta.target} className="btn btn--ghost">
                {ctaLabel}
                <Icon name="arrowRight" size={16} />
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
