import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import { useLanguage } from '../i18n/LanguageContext';
import { OFFICIAL_LINKS } from '../i18n/translations';
import photo from '../assets/varg-1.jpg';

// The admin panel depends on the authenticated AMRUT VARG service, which is
// outside this static front end. The route is kept and points to the real login.
export default function AdminLogin() {
  const { t } = useLanguage();
  return (
    <section className="standalone">
      <Mandala className="standalone__mandala" />
      <div className="standalone__card">
        <div className="standalone__media">
          <img src={photo} alt={t.hero.photoAlts[0]} width="1280" height="577" />
        </div>
        <div className="standalone__body">
          <span className="standalone__icon">
            <Icon name="lock" size={22} />
          </span>
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            {t.hero.title}
          </p>
          <h1 className="standalone__title">{t.admin.title}</h1>
          <p className="standalone__desc">{t.admin.desc}</p>
          <div className="standalone__actions">
            <a className="btn btn--primary" href={OFFICIAL_LINKS.portalAdmin} target="_blank" rel="noopener noreferrer">
              {t.admin.open}
              <Icon name="external" size={16} />
              <span className="sr-only">{t.common.opensNewTab}</span>
            </a>
            <Link to="/" className="btn btn--ghost">
              {t.notFound.home}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
