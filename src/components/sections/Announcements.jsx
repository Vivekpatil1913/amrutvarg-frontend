import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import NoticeItem, { noticeAnchor } from '../NoticeItem';
import { isNewMelawa } from '../MelawaAnnouncementCard';
import { MELAWA_PATH } from '../MelawaTicker';
import { ANNOUNCEMENTS_PATH } from '../layout/Header';
import { useAnnouncements } from '../../data/useAnnouncements';
import { useRotation } from '../../hooks/useRotation';
import { useLanguage } from '../../i18n/LanguageContext';
import { cachedMelawas, fetchActiveMelawas, formatTiming, pickLang } from '../../services/melawa';

// Time each item stays in view before the next one. Kept in step with the
// notice-timer animation in global.css.
const ROTATE_MS = 5000;

// The announcement strip right under the header on the home page.
//
// It carries two panels, each showing ONE item at a time and rotating through
// the rest, so however many announcements or melawas are live the strip keeps
// the same compact height and never pushes the hero down:
//
//   both live      -> two columns side by side on wide screens
//                     (announcements left, melawa right), stacked on narrow ones
//   only one live  -> that panel takes the full width
//   neither        -> the strip is not rendered at all
//
// Each panel has previous / next buttons with an "n / total" position, and a
// "view all" link to its own page (/announcements, /melawa). Rotation pauses
// on hover and keyboard focus, and is off under reduced motion.
export default function Announcements() {
  const announcements = useAnnouncements();
  const melawas = useActiveMelawas();
  const hasAnn = announcements.length > 0;
  const hasMel = melawas.length > 0;

  if (!hasAnn && !hasMel) return null;

  return (
    <section className="notices">
      <div className="notices__bar">
        <div className={`container notices__grid${hasAnn && hasMel ? ' is-split' : ''}`}>
          {hasAnn ? <AnnouncementPanel items={announcements} /> : null}
          {hasMel ? <MelawaPanel rows={melawas} /> : null}
        </div>
      </div>
    </section>
  );
}

// Live melawas, newest announced first.
function useActiveMelawas() {
  const [rows, setRows] = useState(() => cachedMelawas() || []);
  useEffect(() => {
    let alive = true;
    fetchActiveMelawas()
      .then((list) => alive && setRows(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return [...rows].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
}

// Panel frame shared by both kinds: label, pager, "view all", then the slides
// stacked in one grid cell so the panel keeps the height of its tallest item
// and nothing below it moves when the item changes.
function Panel({ id, kind, icon, title, count, rotation, viewAll, viewAllTo, pager, children }) {
  const { num } = useLanguage();
  const { current, rotating, next, prev, hold } = rotation;
  return (
    <section className={`npanel npanel--${kind}`} aria-labelledby={id} {...hold}>
      <div className="npanel__head">
        <h2 id={id} className={`notices__label notices__label--${kind}`}>
          <span className="notices__icon" aria-hidden="true">
            <Icon name={icon} size={17} />
          </span>
          {title}
        </h2>
        {count > 1 ? (
          <div className="npanel__pager" role="group" aria-label={pager.label}>
            <button type="button" className="npanel__step" onClick={prev} aria-label={pager.prev}>
              <Icon name="arrowLeft" size={14} />
            </button>
            <span className="npanel__pos" aria-hidden="true">
              {num(current + 1)}/{num(count)}
            </span>
            <button type="button" className="npanel__step" onClick={next} aria-label={pager.next}>
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
        ) : null}
        <Link className="notices__toggle npanel__all" to={viewAllTo}>
          {viewAll}
          <Icon name="arrowRight" size={15} />
        </Link>
      </div>

      <ul className="npanel__slides" aria-live={rotating ? 'off' : 'polite'}>
        {children(current)}
      </ul>

      {rotating ? <span key={current} className="notices__timer" aria-hidden="true" /> : null}
    </section>
  );
}

// Props that show only the current slide to everyone, sighted or not.
const slideProps = (active) => ({
  'aria-hidden': active ? undefined : true,
  inert: active ? undefined : '',
});

function AnnouncementPanel({ items }) {
  const { t, num } = useLanguage();
  const a = t.announcements;
  const count = items.length;
  const rotation = useRotation(count, ROTATE_MS);

  return (
    <Panel
      id="notices-title"
      kind="ann"
      icon="megaphone"
      title={a.title}
      count={count}
      rotation={rotation}
      viewAll={count > 1 ? a.viewAll(num(count)) : a.viewAllOne}
      viewAllTo={ANNOUNCEMENTS_PATH}
      pager={{ label: a.title, prev: a.prev, next: a.next }}
    >
      {(current) =>
        items.map((item, i) => (
          <NoticeItem
            key={item.id}
            item={item}
            clamp
            // Lands on the page already scrolled to this notice.
            readMoreTo={`${ANNOUNCEMENTS_PATH}#${noticeAnchor(item.id)}`}
            className={`notices__slide${i === current ? ' is-active' : ''}`}
            {...slideProps(i === current)}
          />
        ))
      }
    </Panel>
  );
}

function MelawaPanel({ rows }) {
  const { t, lang, num, formatDate } = useLanguage();
  const m = t.melawa;
  const p = t.vargPortal;
  const count = rows.length;
  const rotation = useRotation(count, ROTATE_MS);

  const dates = (row) => {
    const from = String(row.event_date || '').slice(0, 10);
    const to = String(row.end_date || '').slice(0, 10);
    return to && to !== from ? `${formatDate(from)} – ${formatDate(to)}` : formatDate(from);
  };
  const place = (row) =>
    [pickLang(row, 'venue', lang), pickLang(row, 'district', lang)].filter(Boolean).join(', ');

  return (
    <Panel
      id="melawa-strip-title"
      kind="mel"
      icon="flag"
      title={m.stripTitle}
      count={count}
      rotation={rotation}
      viewAll={m.viewAllCount(num(count))}
      viewAllTo={MELAWA_PATH}
      pager={{ label: m.stripTitle, prev: m.prev, next: m.next }}
    >
      {(current) =>
        rows.map((row, i) => {
          const title = pickLang(row, 'title', lang);
          const where = place(row);
          return (
            <li
              key={row.id}
              className={`mslide notices__slide${i === current ? ' is-active' : ''}`}
              {...slideProps(i === current)}
            >
              <div className="mslide__lead">
                <p className="mslide__tags">
                  <span className="mslide__scope">{m.scope[row.jurisdiction_scope] || p.melawaEyebrow}</span>
                  {isNewMelawa(row) ? <span className="mslide__new">{p.melawaNew}</span> : null}
                </p>
                <h3 className="mslide__title" title={title}>{title}</h3>
                {/* One line: date and time keep their width, the place is
                    cut short with an ellipsis (full text on hover). */}
                <ul className="mslide__meta">
                  <li><Icon name="calendar" size={13} /><span>{dates(row)}</span></li>
                  <li><Icon name="clock" size={13} /><span>{formatTiming(row, lang, m)}</span></li>
                  {where ? (
                    <li className="mslide__where" title={where}>
                      <Icon name="mapPin" size={13} /><span>{where}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
              <Link to={`${MELAWA_PATH}#melawa-${row.id}`} className="mslide__cta">
                {p.melawaCta}
                <Icon name="arrowRight" size={14} />
              </Link>
            </li>
          );
        })
      }
    </Panel>
  );
}
