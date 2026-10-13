import Icon from '../Icon';
import { useLanguage } from '../../i18n/LanguageContext';

// One icon per curriculum area, keyed by the item's `key` in translations.
const ICONS = {
  yoga: 'sun',
  shlok: 'scroll',
  indoor: 'bulb',
  outdoor: 'ball',
  songs: 'music',
  stories: 'sparkle',
};

export default function Activities({ onNavigate }) {
  const { t, num } = useLanguage();
  const a = t.activities;

  return (
    <section id="activities" className="section activities" aria-labelledby="activities-title">
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {a.badge}
            </p>
            <h2 id="activities-title" className="section__title">
              {a.title}
            </h2>
          </div>
          <p className="section__lead">{a.lead}</p>
        </header>

        <ol className="curr" data-reveal>
          {a.items.map((item, i) => (
            <li key={item.key} className={`curr__card curr__card--${item.key}`} style={{ '--i': i }}>
              <div className="curr__top">
                <span className="curr__icon" aria-hidden="true">
                  <Icon name={ICONS[item.key]} size={24} />
                </span>
                <span className="curr__num" aria-hidden="true">
                  {num(`0${i + 1}`)}
                </span>
              </div>
              <h3 className="curr__title">{item.title}</h3>
              <p className="curr__gains-label">{a.gainsLabel}</p>
              <ul className="curr__gains">
                {item.gains.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="curr__foot" data-reveal>
          <button type="button" className="btn btn--ghost" onClick={() => onNavigate('session')}>
            {a.viewSession}
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
