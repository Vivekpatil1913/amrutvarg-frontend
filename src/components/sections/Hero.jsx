import Icon from '../Icon';
import Mandala from '../Mandala';
import { useParallax } from '../../hooks/useParallax';
import { useLanguage } from '../../i18n/LanguageContext';
import photoMain from '../../assets/varg-3.jpg';
import photoSmall from '../../assets/varg-1.jpg';

export default function Hero({ stats, onNavigate }) {
  const { t, num } = useLanguage();
  const h = t.hero;
  const visualRef = useParallax(0.05);

  const go = (e, id) => {
    e.preventDefault();
    onNavigate(id);
  };

  const quick = [
    { id: 'vargs', icon: 'search', title: t.nav.workingVargs, desc: h.quick.vargs },
    { id: 'session', icon: 'clock', title: t.nav.session, desc: h.quick.session },
    { id: 'join', icon: 'userPlus', title: t.join.badge, desc: h.quick.join },
    { id: 'contact', icon: 'phone', title: t.contact.title, desc: h.quick.contact },
  ];

  const facts = [
    { label: h.factClassLabel, value: h.factClass },
    { label: h.factTimeLabel, value: h.factTime },
    { label: h.factVargs, value: num(stats.vargs) },
    { label: h.factDivisions, value: num(stats.divisions) },
  ];

  return (
    <section id="hero" className="hero" aria-labelledby="hero-title">
      <div className="hero__backdrop" aria-hidden="true">
        <Mandala className="hero__mandala" />
        <span className="hero__glow" />
      </div>

      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="eyebrow hero__in" style={{ '--d': 0 }}>
            <span className="eyebrow__dot" aria-hidden="true" />
            {h.eyebrow}
          </p>
          <h1 id="hero-title" className="hero__title hero__in" style={{ '--d': 1 }}>
            {h.title}
          </h1>
          <p className="hero__tagline hero__in" style={{ '--d': 2 }}>
            {h.tagline}
          </p>
          <p className="hero__desc hero__in" style={{ '--d': 3 }}>
            {h.desc}
          </p>
          <div className="hero__actions hero__in" style={{ '--d': 4 }}>
            <a href="#vargs" className="btn btn--primary btn--lg" onClick={(e) => go(e, 'vargs')}>
              <Icon name="search" size={18} />
              {h.primary}
            </a>
            <a href="#about" className="btn btn--ghost btn--lg" onClick={(e) => go(e, 'about')}>
              {h.secondary}
              <Icon name="arrowRight" size={18} />
            </a>
          </div>
          <dl className="hero__facts hero__in" style={{ '--d': 5 }}>
            {facts.map((f, i) => (
              <div key={`fact-${i}`} className="hero__fact">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hero__visual" ref={visualRef}>
          <figure className="hero__photo hero__photo--main">
            <img src={photoMain} alt={h.photoAlts[2]} width="1280" height="576" fetchpriority="high" />
          </figure>
          <figure className="hero__photo hero__photo--small">
            <img src={photoSmall} alt={h.photoAlts[0]} width="1280" height="577" loading="lazy" />
          </figure>
          <div className="hero__chip" aria-hidden="true">
            <Icon name="sun" size={18} />
            <span>{t.activities.items[0].title}</span>
          </div>
          <div className="hero__ring" aria-hidden="true" />
        </div>
      </div>

      <div className="container">
        <nav className="quick hero__in" style={{ '--d': 6 }} aria-label={h.quickLabel}>
          {quick.map((q) => (
            <a key={q.id} href={`#${q.id}`} className="quick__item" onClick={(e) => go(e, q.id)}>
              <span className="quick__icon">
                <Icon name={q.icon} size={20} />
              </span>
              <span className="quick__text">
                <span className="quick__title">{q.title}</span>
                <span className="quick__desc">{q.desc}</span>
              </span>
              <Icon name="arrowRight" size={18} className="quick__arrow" />
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
