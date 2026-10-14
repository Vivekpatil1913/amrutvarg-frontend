import Icon from '../Icon';
import { useLanguage } from '../../i18n/LanguageContext';
import { useSession } from '../../data/useSession';
import { pick } from '../../data/useHero';

// Content comes from the CMS when it is reachable and falls back to the bundled
// translations otherwise, so the section always renders something complete.
//
// The step number and the hour-breakdown bar are derived here, not stored: the
// number from position, the bar from the steps that carry minutes.
export default function Session() {
  const { t, num, lang } = useLanguage();
  const s = t.session;
  const cms = useSession();

  const steps = cms
    ? cms.steps.map((step) => ({
        key: step.id,
        min: Number(step.min) || 0,
        title: pick(step, 'title', lang),
        desc: pick(step, 'desc', lang),
      }))
    : s.steps.map((step, i) => ({
        key: `step-${i}`,
        min: step.min,
        title: step.title,
        desc: step.desc,
      }));

  const badge = cms ? pick(cms.text, 'badge', lang) : s.badge;
  const title = cms ? pick(cms.text, 'title', lang) : s.title;
  const lead = cms ? pick(cms.text, 'lead', lang) : s.lead;
  const hourLabel = cms ? pick(cms.text, 'hour_label', lang) : s.hourLabel;
  const minutes = cms ? pick(cms.text, 'minutes', lang) : s.minutes;
  const showDot = cms ? cms.text.eyebrow_dot !== false : true;

  const timed = steps.filter((step) => step.min > 0);
  const total = timed.reduce((sum, step) => sum + step.min, 0);

  return (
    <section id="session" className="section session" aria-labelledby="session-title">
      <div className="session__texture" aria-hidden="true" />
      <div className="container">
        <div className="session__top">
          <header data-reveal>
            {badge ? (
              <p className="eyebrow">
                {showDot ? <span className="eyebrow__dot" aria-hidden="true" /> : null}
                {badge}
              </p>
            ) : null}
            <h2 id="session-title" className="section__title">
              {title}
            </h2>
            {lead ? <p className="section__lead">{lead}</p> : null}
          </header>

          {timed.length ? (
            <figure className="hour" data-reveal style={{ '--d': 1 }}>
              {hourLabel ? (
                <figcaption className="hour__label">
                  <Icon name="clock" size={16} />
                  {hourLabel}
                </figcaption>
              ) : null}
              <div className="hour__bar" aria-hidden="true">
                {timed.map((step, i) => (
                  <span key={`seg-${step.key}`} className="hour__seg" style={{ '--w': step.min / total, '--d': i }}>
                    {num(step.min)}
                  </span>
                ))}
              </div>
              <ol className="hour__legend">
                {timed.map((step, i) => (
                  <li key={`legend-${step.key}`} style={{ '--d': i }}>
                    <span className="hour__swatch" aria-hidden="true" />
                    <span className="hour__name">{step.title}</span>
                    <span className="hour__min">
                      {num(step.min)} {minutes}
                    </span>
                  </li>
                ))}
              </ol>
            </figure>
          ) : null}
        </div>

        {steps.length ? (
          <ol className="steps">
            {steps.map((step, i) => (
              <li key={step.key} className="step" data-reveal style={{ '--d': i % 4 }}>
                <div className="step__head">
                  <span className="step__num" aria-hidden="true">
                    {num(i + 1)}
                  </span>
                  {step.min ? (
                    <span className="step__min">
                      <Icon name="clock" size={13} />
                      {num(step.min)} {minutes}
                    </span>
                  ) : null}
                </div>
                <h3 className="step__title">{step.title}</h3>
                {step.desc ? <p className="step__desc">{step.desc}</p> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
