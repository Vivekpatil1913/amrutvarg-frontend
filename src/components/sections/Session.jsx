import Icon from '../Icon';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Session() {
  const { t, num } = useLanguage();
  const s = t.session;
  const timed = s.steps.filter((step) => step.min > 0);
  const total = timed.reduce((sum, step) => sum + step.min, 0);

  return (
    <section id="session" className="section session" aria-labelledby="session-title">
      <div className="session__texture" aria-hidden="true" />
      <div className="container">
        <div className="session__top">
          <header data-reveal>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {s.badge}
            </p>
            <h2 id="session-title" className="section__title">
              {s.title}
            </h2>
            <p className="section__lead">{s.lead}</p>
          </header>

          <figure className="hour" data-reveal style={{ '--d': 1 }}>
            <figcaption className="hour__label">
              <Icon name="clock" size={16} />
              {s.hourLabel}
            </figcaption>
            <div className="hour__bar" aria-hidden="true">
              {timed.map((step, i) => (
                <span key={`seg-${i}`} className="hour__seg" style={{ '--w': step.min / total, '--d': i }}>
                  {num(step.min)}
                </span>
              ))}
            </div>
            <ol className="hour__legend">
              {timed.map((step, i) => (
                <li key={`legend-${i}`} style={{ '--d': i }}>
                  <span className="hour__swatch" aria-hidden="true" />
                  <span className="hour__name">{step.title}</span>
                  <span className="hour__min">
                    {num(step.min)} {s.minutes}
                  </span>
                </li>
              ))}
            </ol>
          </figure>
        </div>

        <ol className="steps">
          {s.steps.map((step, i) => (
            <li key={`step-${i}`} className="step" data-reveal style={{ '--d': i % 4 }}>
              <div className="step__head">
                <span className="step__num" aria-hidden="true">
                  {step.num}
                </span>
                {step.min ? (
                  <span className="step__min">
                    <Icon name="clock" size={13} />
                    {num(step.min)} {s.minutes}
                  </span>
                ) : null}
              </div>
              <h3 className="step__title">{step.title}</h3>
              {step.desc ? <p className="step__desc">{step.desc}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
