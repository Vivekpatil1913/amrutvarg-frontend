import Icon from '../Icon';
import Mandala from '../Mandala';
import { useParallax } from '../../hooks/useParallax';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAbout } from '../../data/useAbout';
import { pick } from '../../data/useHero';
import photo from '../../assets/varg-2.jpg';

// Content comes from the CMS when it is reachable and falls back to the bundled
// translations otherwise, so the section always renders something complete.
export default function About() {
  const { t, num, lang } = useLanguage();
  const a = t.about;
  const cms = useAbout();
  const photoRef = useParallax(0.04);

  // The programme answered as questions, in reading order.
  const steps = cms
    ? cms.steps.map((s) => ({
        key: s.id,
        icon: s.icon,
        question: pick(s, 'question', lang),
        title: pick(s, 'title', lang),
        desc: pick(s, 'desc', lang),
      }))
    : [
        { key: 'who', icon: 'graduation', question: a.questions.who, title: a.targetTitle, desc: a.targetDesc },
        { key: 'how', icon: 'clock', question: a.questions.how, title: a.structureTitle, desc: a.structureDesc },
        { key: 'why', icon: 'flag', question: a.questions.why, title: a.purposeTitle, desc: a.purposeDesc },
        { key: 'next', icon: 'arrowUp', question: a.questions.next, title: a.futureTitle, desc: a.futureDesc },
      ];

  const badge = cms ? pick(cms.text, 'badge', lang) : a.badge;
  const title = cms ? pick(cms.text, 'title', lang) : a.title;
  const showDot = cms ? cms.text.eyebrow_dot !== false : true;

  // An uploaded image wins; the bundled photograph stands in when the slot is
  // empty, so the layout never collapses.
  const showImage = cms ? Boolean(cms.image) : true;
  const imgSrc = cms?.image?.url || photo;
  const imgAlt = cms?.image ? pick(cms.image, 'alt', lang) : t.hero.photoAlts[1];
  const caption = cms?.image ? pick(cms.image, 'caption', lang) : a.tagline;

  const showFeatures = cms ? Boolean(cms.features) : true;
  const featuresTitle = cms?.features ? pick(cms.features, 'title', lang) : a.featuresTitle;
  const featuresIcon = cms?.features?.icon || 'sparkle';
  const features = cms?.features
    ? cms.features.items.map((f) => ({ key: f.id, label: pick(f, 'label', lang) }))
    : a.featuresList.map((label, i) => ({ key: `hl-${i}`, label }));

  return (
    <section id="about" className="section about" aria-labelledby="about-title">
      <div className="container about__grid">
        {showImage ? (
          <figure className="about__media" data-reveal ref={photoRef}>
            <Mandala className="about__mandala" points={20} />
            <div className="about__frame">
              <img src={imgSrc} alt={imgAlt} width="1280" height="582" loading="lazy" />
              <div className="about__shade" aria-hidden="true" />
              {caption ? (
                <figcaption className="about__quote">
                  <span className="about__quote-mark" aria-hidden="true">
                    “
                  </span>
                  {caption}
                </figcaption>
              ) : null}
            </div>
          </figure>
        ) : null}

        <div className="about__content">
          <header data-reveal>
            {badge ? (
              <p className="eyebrow">
                {showDot ? <span className="eyebrow__dot" aria-hidden="true" /> : null}
                {badge}
              </p>
            ) : null}
            <h2 id="about-title" className="section__title">
              {title}
            </h2>
          </header>

          {steps.length ? (
            <ol className="qpath" data-reveal style={{ '--d': 1 }}>
              {steps.map((p, i) => (
                <li key={p.key} className="qpath__item" style={{ '--i': i }}>
                  <span className="qpath__node" aria-hidden="true">
                    <Icon name={p.icon} size={18} />
                  </span>
                  <div className="qpath__body">
                    <p className="qpath__q">
                      <span className="qpath__n">{num(`0${i + 1}`)}</span>
                      {p.question}
                    </p>
                    <h3 className="qpath__title">{p.title}</h3>
                    {p.desc ? <p className="qpath__desc">{p.desc}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : null}

          {showFeatures && features.length ? (
            <div className="about__highlights" data-reveal style={{ '--d': 2 }}>
              <h3 className="about__hl-title">
                <Icon name={featuresIcon} size={16} />
                {featuresTitle}
              </h3>
              <ul className="about__tags">
                {features.map((item, i) => (
                  <li key={item.key} style={{ '--i': i }}>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
