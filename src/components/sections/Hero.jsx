import { Link } from 'react-router-dom';
import Icon from '../Icon';
import Mandala from '../Mandala';
import { useParallax } from '../../hooks/useParallax';
import { useLanguage } from '../../i18n/LanguageContext';
import { useHero, pick } from '../../data/useHero';
import photoMain from '../../assets/varg-3.jpg';
import photoSmall from '../../assets/varg-1.jpg';

// Content comes from the CMS when it is reachable and falls back to the bundled
// translations otherwise, so the section always renders something complete.
export default function Hero({ stats, onNavigate }) {
  const { t, num, lang } = useLanguage();
  const h = t.hero;
  const cms = useHero();
  const visualRef = useParallax(0.05);

  const go = (e, id) => {
    e.preventDefault();
    onNavigate(id);
  };

  // A destination is either "#section" on this page or a route to navigate to.
  const isSection = (target) => typeof target === 'string' && target.startsWith('#');

  const quick = cms
    ? cms.quicknav.map((q) => ({
        key: q.id,
        target: q.target,
        icon: q.icon,
        title: pick(q, 'title', lang),
        desc: pick(q, 'desc', lang),
      }))
    : [
        { key: 'vargs', target: '#vargs', icon: 'search', title: t.nav.workingVargs, desc: h.quick.vargs },
        { key: 'session', target: '#session', icon: 'clock', title: t.nav.session, desc: h.quick.session },
        { key: 'join', target: '#join', icon: 'userPlus', title: t.join.badge, desc: h.quick.join },
        { key: 'contact', target: '#contact', icon: 'phone', title: t.contact.title, desc: h.quick.contact },
      ];

  // A counted statistic carries its number from the database; a manual one
  // carries the text an editor typed.
  const facts = cms
    ? cms.stats.map((s) => ({
        key: s.id,
        label: pick(s, 'label', lang),
        value: s.count === null || s.count === undefined ? pick(s, 'value', lang) : num(s.count),
      }))
    : [
        { key: 'class', label: h.factClassLabel, value: h.factClass },
        { key: 'time', label: h.factTimeLabel, value: h.factTime },
        { key: 'vargs', label: h.factVargs, value: num(stats.vargs) },
        { key: 'divisions', label: h.factDivisions, value: num(stats.divisions) },
      ];

  const ctas = cms
    ? cms.ctas.map((c) => ({ key: c.id, target: c.target, icon: c.icon, label: pick(c, 'label', lang) }))
    : [
        { key: 'primary', target: '#vargs', icon: 'search', label: h.primary },
        { key: 'secondary', target: '#about', icon: 'arrowRight', label: h.secondary },
      ];

  const eyebrow = cms ? pick(cms.text, 'eyebrow', lang) : h.eyebrow;
  const title = cms ? pick(cms.text, 'title', lang) : h.title;
  const tagline = cms ? pick(cms.text, 'tagline', lang) : h.tagline;
  const desc = cms ? pick(cms.text, 'desc', lang) : h.desc;
  const quickLabel = cms ? pick(cms.a11y, 'quick_label', lang) : h.quickLabel;

  // An uploaded image wins; the bundled photograph stands in when the slot is
  // empty or the editor disabled it, so the layout never collapses.
  const mainImg = cms?.images?.main?.url || photoMain;
  const mainAlt = cms?.images?.main ? pick(cms.images.main, 'alt', lang) : h.photoAlts[2];
  const smallImg = cms?.images?.small?.url || photoSmall;
  const smallAlt = cms?.images?.small ? pick(cms.images.small, 'alt', lang) : h.photoAlts[0];
  const caption = cms ? pick(cms.images, 'caption', lang) : t.activities.items[0].title;
  const captionIcon = cms?.images?.caption_icon || 'sun';
  const showCaption = cms ? cms.images.caption_enabled !== false : true;

  // A button scrolls within the page or routes away, depending on its target.
  const renderCta = (c, i) => {
    const className = `btn ${i === 0 ? 'btn--primary' : 'btn--ghost'} btn--lg`;
    const inner = (
      <>
        {i === 0 && c.icon ? <Icon name={c.icon} size={18} /> : null}
        {c.label}
        {i !== 0 && c.icon ? <Icon name={c.icon} size={18} /> : null}
      </>
    );
    return isSection(c.target) ? (
      <a key={c.key} href={c.target} className={className} onClick={(e) => go(e, c.target.slice(1))}>
        {inner}
      </a>
    ) : (
      <Link key={c.key} to={c.target} className={className}>
        {inner}
      </Link>
    );
  };

  const quickInner = (q) => (
    <>
      <span className="quick__icon">
        <Icon name={q.icon} size={20} />
      </span>
      <span className="quick__text">
        <span className="quick__title">{q.title}</span>
        <span className="quick__desc">{q.desc}</span>
      </span>
      <Icon name="arrowRight" size={18} className="quick__arrow" />
    </>
  );

  return (
    <section id="hero" className="hero" aria-labelledby="hero-title">
      <div className="hero__backdrop" aria-hidden="true">
        <Mandala className="hero__mandala" />
        <span className="hero__glow" />
      </div>

      <div className="container hero__grid">
        <div className="hero__copy">
          {eyebrow ? (
            <p className="eyebrow hero__in" style={{ '--d': 0 }}>
              <span className="eyebrow__dot" aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}
          <h1 id="hero-title" className="hero__title hero__in" style={{ '--d': 1 }}>
            {title}
          </h1>
          {tagline ? (
            <p className="hero__tagline hero__in" style={{ '--d': 2 }}>
              {tagline}
            </p>
          ) : null}
          {desc ? (
            <p className="hero__desc hero__in" style={{ '--d': 3 }}>
              {desc}
            </p>
          ) : null}
          {ctas.length ? (
            <div className="hero__actions hero__in" style={{ '--d': 4 }}>
              {ctas.map(renderCta)}
            </div>
          ) : null}
          {facts.length ? (
            <dl className="hero__facts hero__in" style={{ '--d': 5 }}>
              {facts.map((f) => (
                <div key={f.key} className="hero__fact">
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div className="hero__visual" ref={visualRef}>
          <figure className="hero__photo hero__photo--main">
            <img src={mainImg} alt={mainAlt} width="1280" height="576" fetchpriority="high" />
          </figure>
          <figure className="hero__photo hero__photo--small">
            <img src={smallImg} alt={smallAlt} width="1280" height="577" loading="lazy" />
          </figure>
          {showCaption && caption ? (
            <div className="hero__chip" aria-hidden="true">
              <Icon name={captionIcon} size={18} />
              <span>{caption}</span>
            </div>
          ) : null}
          <div className="hero__ring" aria-hidden="true" />
        </div>
      </div>

      {quick.length ? (
        <div className="container">
          <nav className="quick hero__in" style={{ '--d': 6 }} aria-label={quickLabel}>
            {quick.map((q) =>
              isSection(q.target) ? (
                <a key={q.key} href={q.target} className="quick__item" onClick={(e) => go(e, q.target.slice(1))}>
                  {quickInner(q)}
                </a>
              ) : (
                <Link key={q.key} to={q.target} className="quick__item">
                  {quickInner(q)}
                </Link>
              )
            )}
          </nav>
        </div>
      ) : null}
    </section>
  );
}
