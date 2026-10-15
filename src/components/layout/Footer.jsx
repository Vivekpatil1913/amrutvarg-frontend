import { Link } from 'react-router-dom';
import Icon from '../Icon';
import Mandala from '../Mandala';
import logo from '../../assets/amrut-logo.png';
import { NAV_ITEMS, useSectionNav } from './Header';
import { useLanguage } from '../../i18n/LanguageContext';
import { OFFICIAL_LINKS, STATE_COORDINATOR_PHONE } from '../../i18n/translations';
import { useFooter } from '../../data/useFooter';
import { pick } from '../../data/useHero';

// Fallback names for the screen-reader label on a social icon, used when the
// admin leaves the label blank — which is the normal case, since the icon is
// the whole point.
const PLATFORM_NAMES = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X',
  linkedin: 'LinkedIn',
};

export default function Footer() {
  const { t, lang } = useLanguage();
  const goTo = useSectionNav();
  const cms = useFooter();

  const official = cms
    ? cms.links.map((l) => ({ href: l.url, label: pick(l, 'title', lang) }))
    : [
        { href: OFFICIAL_LINKS.portal, label: t.resources.items[0].title },
        { href: OFFICIAL_LINKS.amrut, label: t.resources.items[1].title },
      ];

  // Only profiles with an address reach the site, so this is already the list
  // worth drawing.
  const social = cms?.social ?? [];
  const officialHeading = cms ? pick(cms.text, 'official_heading', lang) || t.footer.official : t.footer.official;
  const socialHeading = cms ? pick(cms.text, 'social_heading', lang) : '';

  return (
    <footer className="footer">
      <div className="footer__ring" aria-hidden="true" />
      <div className="container">
        <blockquote className="footer__quote">
          <Mandala className="footer__mandala" points={16} />
          <p>{t.conclusion}</p>
        </blockquote>
      </div>
      <div className="container footer__grid">
        <div className="footer__brand">
          <img src={logo} alt={t.a11y.logoAlt} width="383" height="86" className="footer__logo" />
          <p className="footer__title">{t.hero.title}</p>
          <p className="footer__about">{t.footer.about}</p>
          <p className="footer__gov">{t.gov.state}</p>
        </div>

        <nav className="footer__col" aria-label={t.footer.explore}>
          <h2 className="footer__heading">{t.footer.explore}</h2>
          <ul className="footer__links">
            {NAV_ITEMS.map(({ id, key, to }) => (
              <li key={id}>
                {to ? (
                  <Link to={to}>{t.nav[key]}</Link>
                ) : (
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo(id);
                    }}
                  >
                    {t.nav[key]}
                  </a>
                )}
              </li>
            ))}
            <li>
              <Link to="/admin/login">{t.nav.admin}</Link>
            </li>
          </ul>
        </nav>

        {official.length ? (
          <div className="footer__col">
            <h2 className="footer__heading">{officialHeading}</h2>
            <ul>
              {official.map(({ href, label }) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {label}
                    <Icon name="external" size={14} />
                    <span className="sr-only">{t.common.opensNewTab}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="footer__col">
          <h2 className="footer__heading">{t.footer.contact}</h2>
          <p className="footer__muted">{t.contact.cardTitle}</p>
          <a className="footer__phone" href={`tel:${STATE_COORDINATOR_PHONE}`}>
            <Icon name="phone" size={18} />
            {STATE_COORDINATOR_PHONE}
          </a>

          {social.length ? (
            <div className="footer__social-wrap">
              {socialHeading ? <p className="footer__muted footer__social-heading">{socialHeading}</p> : null}
              <ul className="footer__social">
                {social.map((s) => {
                  const name = pick(s, 'label', lang) || PLATFORM_NAMES[s.platform] || s.platform;
                  return (
                    <li key={s.id}>
                      <a
                        className="footer__social-link"
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer me"
                        aria-label={name}
                      >
                        <Icon name={s.icon || (PLATFORM_NAMES[s.platform] ? s.platform : 'link')} size={18} />
                        <span className="sr-only">{t.common.opensNewTab}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="container footer__bottom">
        <p>{t.footer.copyright}</p>
        <button type="button" className="footer__top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          {t.a11y.backToTop}
          <Icon name="arrowUp" size={16} />
        </button>
      </div>
    </footer>
  );
}
