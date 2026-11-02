import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { cachedMelawas, fetchActiveMelawas, formatTiming, pickLang } from '../services/melawa';
import { MELAWA_PATH } from './MelawaTicker';

// Interactive 'Amrut Varg Melawa' announcement cards: the live melawas, newest
// announcement first, in the terracotta theme. A melawa announced within the
// last seven days wears an animated 'NEW' star-burst; after that the badge
// retires on its own. Renders nothing when no melawa is live.

const NEW_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CARDS = 3;

export const isNewMelawa = (row, now = Date.now()) => {
  const published = Date.parse(row?.created_at);
  return Number.isFinite(published) && now - published >= 0 && now - published < NEW_FOR_MS;
};

// A 12-point star: 24 vertices alternating between the outer and inner radius.
const STAR_POINTS = Array.from({ length: 24 }, (_, i) => {
  const r = i % 2 === 0 ? 50 : 38;
  const a = (Math.PI / 12) * i - Math.PI / 2;
  return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
}).join(' ');

function NewBadge({ label }) {
  return (
    <span className="mcard__new" role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <polygon points={STAR_POINTS} />
      </svg>
      <span className="mcard__new-text" aria-hidden="true">{label}</span>
    </span>
  );
}

// `framed` wraps the cards in a page container, for placing them directly in
// a full-width page such as the home page.
export default function MelawaAnnouncementCard({ framed = false }) {
  const { t, lang, formatDate } = useLanguage();
  const m = t.melawa;
  const p = t.vargPortal;
  const [rows, setRows] = useState(() => cachedMelawas() || []);

  useEffect(() => {
    let alive = true;
    fetchActiveMelawas()
      .then((list) => alive && setRows(list))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!rows.length) return null;

  const cards = [...rows]
    .sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0))
    .slice(0, MAX_CARDS);

  const list = (
    <div className="mcards">
      {cards.map((row) => {
        const title = pickLang(row, 'title', lang);
        return (
          <article key={row.id} className="mcard" aria-label={`${p.melawaEyebrow}: ${title}`}>
            <p className="mcard__eyebrow">
              <span className="mcard__chip">{m.scope[row.jurisdiction_scope] || p.melawaEyebrow}</span>
              <span>{p.melawaEyebrow}</span>
            </p>
            <div className="mcard__head">
              <h3 className="mcard__title">{title}</h3>
              {isNewMelawa(row) ? <NewBadge label={p.melawaNew} /> : null}
            </div>
            <ul className="mcard__meta">
              <li><Icon name="calendar" size={15} />{formatDate(String(row.event_date).slice(0, 10))}</li>
              <li><Icon name="clock" size={15} />{formatTiming(row, lang, m)}</li>
              <li><Icon name="mapPin" size={15} />{pickLang(row, 'venue', lang)}</li>
            </ul>
            <div className="mcard__actions">
              <Link to={MELAWA_PATH} className="mcard__cta">
                {p.melawaCta}
                <Icon name="arrowRight" size={15} />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );

  return framed ? <section className="container mcards-frame" aria-label={p.melawaEyebrow}>{list}</section> : list;
}
