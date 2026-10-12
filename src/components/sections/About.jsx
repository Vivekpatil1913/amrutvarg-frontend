import Icon from '../Icon';
import Mandala from '../Mandala';
import { useParallax } from '../../hooks/useParallax';
import { useLanguage } from '../../i18n/LanguageContext';
import photo from '../../assets/varg-2.jpg';

export default function About() {
  const { t, num } = useLanguage();
  const a = t.about;
  const photoRef = useParallax(0.04);

  // The programme answered as four questions, in reading order.
  const path = [
    { key: 'who', icon: 'graduation', title: a.targetTitle, desc: a.targetDesc },
    { key: 'how', icon: 'clock', title: a.structureTitle, desc: a.structureDesc },
    { key: 'why', icon: 'flag', title: a.purposeTitle, desc: a.purposeDesc },
    { key: 'next', icon: 'arrowUp', title: a.futureTitle, desc: a.futureDesc },
  ];

  return (
    <section id="about" className="section about" aria-labelledby="about-title">
      <div className="container about__grid">
        <figure className="about__media" data-reveal ref={photoRef}>
          <Mandala className="about__mandala" points={20} />
          <div className="about__frame">
            <img src={photo} alt={t.hero.photoAlts[1]} width="1280" height="582" loading="lazy" />
            <div className="about__shade" aria-hidden="true" />
            <figcaption className="about__quote">
              <span className="about__quote-mark" aria-hidden="true">
                “
              </span>
              {a.tagline}
            </figcaption>
          </div>
        </figure>

        <div className="about__content">
          <header data-reveal>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {a.badge}
            </p>
            <h2 id="about-title" className="section__title">
              {a.title}
            </h2>
          </header>

          <ol className="qpath" data-reveal style={{ '--d': 1 }}>
            {path.map((p, i) => (
              <li key={p.key} className="qpath__item" style={{ '--i': i }}>
                <span className="qpath__node" aria-hidden="true">
                  <Icon name={p.icon} size={18} />
                </span>
                <div className="qpath__body">
                  <p className="qpath__q">
                    <span className="qpath__n">{num(`0${i + 1}`)}</span>
                    {a.questions[p.key]}
                  </p>
                  <h3 className="qpath__title">{p.title}</h3>
                  <p className="qpath__desc">{p.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="about__highlights" data-reveal style={{ '--d': 2 }}>
            <h3 className="about__hl-title">
              <Icon name="sparkle" size={16} />
              {a.featuresTitle}
            </h3>
            <ul className="about__tags">
              {a.featuresList.map((item, i) => (
                <li key={`hl-${i}`} style={{ '--i': i }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
