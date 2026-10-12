import Icon from '../Icon';
import Mandala from '../Mandala';
import { useLanguage } from '../../i18n/LanguageContext';

// "The climb": the five qualities rise as steps towards the summit — the
// programme's resolve. Step heights are a visual metaphor for growth, not data.
export default function Growth() {
  const { t, num } = useLanguage();
  const g = t.growth;
  const count = g.list.length;

  return (
    <section id="growth" className="section growth" aria-labelledby="growth-title">
      <div className="growth__rays" aria-hidden="true" />
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {g.badge}
            </p>
            <h2 id="growth-title" className="section__title">
              {g.title}
            </h2>
          </div>
          <p className="section__lead">{g.lead}</p>
        </header>

        <div className="climb" data-reveal>
          <ol className="climb__steps">
            {g.list.map((item, i) => (
              <li
                key={`step-${i}`}
                className={`gstep gstep--${i + 1}`}
                // Heights rise evenly from 55% to 91% of the summit.
                style={{ '--i': i, '--h': 0.55 + (0.36 * i) / Math.max(count - 1, 1) }}
              >
                <span className="gstep__num" aria-hidden="true">
                  {num(`0${i + 1}`)}
                </span>
                <span className="gstep__text">{item}</span>
                <span className="gstep__foot" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              </li>
            ))}
          </ol>

          <figure className="summit">
            <Mandala className="summit__mandala" points={20} />
            <span className="summit__peak" aria-hidden="true">
              <Icon name="arrowUp" size={18} />
            </span>
            <p className="summit__label">{g.sankalpTitle}</p>
            <blockquote className="summit__line">{g.sankalpLine}</blockquote>
            <figcaption className="summit__desc">{g.sankalpDesc}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
