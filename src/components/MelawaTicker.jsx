import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import Modal from './Modal';
import MelawaDetails from './MelawaDetails';
import { useLanguage } from '../i18n/LanguageContext';
import { cachedMelawas, fetchActiveMelawas, formatTiming, pickLang } from '../services/melawa';

// The flashing "Amrut Varg Melawa" bar above the site header.
//
// Renders nothing until there is something to announce, so a quiet week costs
// the page no space. Each title is a button: one melawa opens its details in a
// dialog; the badge and "All melawas" go to the schedule page. The scroll
// pauses on hover and focus, and for anyone who prefers reduced motion the
// list simply sits still (global.css).
export const MELAWA_PATH = '/melawa';

export default function MelawaTicker() {
  const { t, lang, formatDate } = useLanguage();
  const m = t.melawa;
  const [rows, setRows] = useState(() => cachedMelawas() || []);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchActiveMelawas()
      .then((list) => alive && setRows(list))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!rows.length) return null;

  const items = rows.map((row) => (
    <button key={row.id} type="button" className="melawa-ticker__item" onClick={() => setOpen(row)}>
      <span className="melawa-ticker__dot" aria-hidden="true" />
      <strong>{pickLang(row, 'title', lang)}</strong>
      <span className="melawa-ticker__meta">
        {formatDate(row.event_date)} · {formatTiming(row, lang, m)} · {pickLang(row, 'venue', lang)}
      </span>
    </button>
  ));

  return (
    <>
      <aside className="melawa-ticker" aria-label={m.tickerLabel}>
        <div className="container melawa-ticker__inner">
          <Link to={MELAWA_PATH} className="melawa-ticker__badge">
            <span className="melawa-ticker__flash">{m.flash}</span>
            <span className="melawa-ticker__badge-text">{m.badge}</span>
          </Link>
          <div className="melawa-ticker__viewport">
            {/* The list is drawn twice so the scroll loops without a gap; the
                copy is hidden from assistive technology and from tabbing. */}
            <div className="melawa-ticker__track">
              <div className="melawa-ticker__group">{items}</div>
              <div className="melawa-ticker__group" aria-hidden="true" inert="">
                {items}
              </div>
            </div>
          </div>
          <Link to={MELAWA_PATH} className="melawa-ticker__all">
            {m.viewAll}
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </aside>
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} icon="megaphone" title={m.badge} size="md">
        {open ? (
          <>
            <MelawaDetails row={open} />
            <div className="result__actions">
              <Link to={MELAWA_PATH} className="btn btn--ghost" onClick={() => setOpen(null)}>
                {m.viewAll}
              </Link>
              <button type="button" className="btn btn--primary" onClick={() => setOpen(null)}>
                {t.common.close}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
