import { Link } from 'react-router-dom';
import Icon from '../Icon';
import Mandala from '../Mandala';
import logo from '../../assets/amrut-logo.png';
import { NAV_ITEMS, useSectionNav } from './Header';
import { useLanguage } from '../../i18n/LanguageContext';
import { OFFICIAL_LINKS, STATE_COORDINATOR_PHONE } from '../../i18n/translations';

export default function Footer() {
  const { t } = useLanguage();
  const goTo = useSectionNav();

  const official = [
    { href: OFFICIAL_LINKS.portal, label: t.resources.items[0].title },
    { href: OFFICIAL_LINKS.amrut, label: t.resources.items[1].title },
  ];

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

        <div className="footer__col">
          <h2 className="footer__heading">{t.footer.official}</h2>
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

        <div className="footer__col">
          <h2 className="footer__heading">{t.footer.contact}</h2>
          <p className="footer__muted">{t.contact.cardTitle}</p>
          <a className="footer__phone" href={`tel:${STATE_COORDINATOR_PHONE}`}>
            <Icon name="phone" size={18} />
            {STATE_COORDINATOR_PHONE}
          </a>
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
