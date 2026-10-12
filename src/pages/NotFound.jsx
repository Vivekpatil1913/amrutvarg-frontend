import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import { useLanguage } from '../i18n/LanguageContext';
import photo from '../assets/varg-3.jpg';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <section className="standalone">
      <Mandala className="standalone__mandala" />
      <div className="standalone__card">
        <div className="standalone__media">
          <img src={photo} alt={t.hero.photoAlts[2]} width="1280" height="576" />
        </div>
        <div className="standalone__body">
          <p className="standalone__code">{t.notFound.title}</p>
          <h1 className="standalone__title">{t.notFound.message}</h1>
          <div className="standalone__actions">
            <Link to="/" className="btn btn--primary">
              <Icon name="arrowRight" size={16} />
              {t.notFound.home}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
