import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import MelawaDetails from '../components/MelawaDetails';
import { useLanguage } from '../i18n/LanguageContext';
import { cachedMelawas, fetchActiveMelawas } from '../services/melawa';

// Melawa Schedule & Details: every live announcement in full, state-wide
// first. Reached from the ticker's badge and "All melawas" link.
export default function MelawaPage() {
  const { t } = useLanguage();
  const m = t.melawa;
  const [rows, setRows] = useState(() => cachedMelawas());

  useEffect(() => {
    window.scrollTo(0, 0);
    let alive = true;
    fetchActiveMelawas()
      .then((list) => alive && setRows(list))
      .catch(() => alive && setRows((r) => r || []));
    return () => { alive = false; };
  }, []);

  return (
    <section className="spage" aria-labelledby="mpage-title">
      <Mandala className="spage__mandala" points={20} />
      <div className="container">
        <nav className="crumbs" aria-label={t.announcements.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t.nav.melawa}</span>
        </nav>

        <header className="spage__head">
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            {m.badge}
          </p>
          <h1 id="mpage-title" className="section__title">{m.pageTitle}</h1>
          <p className="section__lead">{m.pageDesc}</p>
        </header>

        {rows === null ? (
          <p className="spage__loading" role="status">{m.loading}</p>
        ) : rows.length ? (
          <ul className="melawa-list">
            {rows.map((row) => (
              <li key={row.id} id={`melawa-${row.id}`}>
                <MelawaDetails row={row} headingLevel={2} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="sempty">
            <Icon name="megaphone" size={22} />
            <p>{m.empty}</p>
          </div>
        )}
      </div>
    </section>
  );
}
