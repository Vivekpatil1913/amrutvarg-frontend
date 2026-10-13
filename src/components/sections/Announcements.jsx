import Icon from '../Icon';
import { useLanguage } from '../../i18n/LanguageContext';

// Top-of-page notice strip, directly below the header, so announcements are the
// first thing visitors see. Renders nothing when there are no announcements.
export default function Announcements() {
  const { t } = useLanguage();
  const a = t.announcements;
  if (!a.items.length) return null;

  return (
    <section className="notices" aria-labelledby="notices-title">
      <div className="container">
        <div className="notices__bar">
          <h2 id="notices-title" className="notices__label">
            <span className="notices__icon" aria-hidden="true">
              <Icon name="megaphone" size={18} />
            </span>
            {a.title}
          </h2>

          <ul className="notices__list">
            {a.items.map((item) => (
              <li key={item.key} className="notices__item">
                <p className="notices__title">
                  {item.title}
                  {item.status ? (
                    <span className="badge badge--muted">
                      <Icon name="clock" size={12} />
                      {item.status}
                    </span>
                  ) : null}
                </p>
                {item.desc ? <p className="notices__desc">{item.desc}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
