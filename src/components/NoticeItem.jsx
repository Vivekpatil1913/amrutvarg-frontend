import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { hasEventDetails } from '../data/useAnnouncements';
import { useLanguage } from '../i18n/LanguageContext';

// One announcement, rendered the same way wherever it appears.
//
// Shared by the rotating strip and the full announcements page so the two
// cannot drift. `clamp` is what separates them: the strip cuts the description
// to two lines and offers a link to read the rest, the page shows everything.

const STATUS = {
  info: { icon: 'info', className: 'badge--muted' },
  new: { icon: 'sparkle', className: 'badge--ok' },
  comingSoon: { icon: 'clock', className: 'badge--muted' },
  urgent: { icon: 'alert', className: 'badge--urgent' },
};

export const noticeText = (field, lang) => (field && (field[lang] || field.mr || field.en)) || '';

// The anchor a link from the strip lands on.
export const noticeAnchor = (id) => `notice-${id}`;

// Where and when an AMRUT training takes place.
//
// Each row appears only if it has a value, so a notice carrying just a venue
// shows just a venue rather than a column of blanks.
export function EventDetails({ item }) {
  const { t, lang, district, formatDateWithDay } = useLanguage();
  const e = t.announcements.event;
  const notes = noticeText(item.event.notes, lang);
  // The district is shown in the reader's language; the taluka is stored as
  // the master spells it.
  const place = [item.event.taluka, district(item.event.district)].filter(Boolean).join(', ');

  const rows = [
    item.date && { key: 'when', icon: 'calendar', label: e.when, value: formatDateWithDay(item.date) },
    item.event.time && { key: 'time', icon: 'clock', label: e.time, value: item.event.time },
    place && { key: 'place', icon: 'mapPin', label: e.location, value: place },
    item.event.venue && { key: 'venue', icon: 'building', label: e.venue, value: item.event.venue },
  ].filter(Boolean);

  if (!rows.length && !notes) return null;

  return (
    <div className="notices__event">
      <p className="notices__event-head">
        <Icon name="flag" size={14} />
        {e.title}
      </p>
      {rows.length ? (
        <dl className="notices__event-list">
          {rows.map((r) => (
            <div key={r.key} className="notices__event-row">
              <dt>
                <Icon name={r.icon} size={14} />
                {r.label}
              </dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {notes ? (
        <p className="notices__event-notes">
          <Icon name="info" size={14} />
          {notes}
        </p>
      ) : null}
    </div>
  );
}

/**
 * `clamp` cuts the description to two lines and, when it is actually cut off,
 * offers a link to the full page anchored at this notice. `readMoreTo` is that
 * address; without it the link is not offered, which is what the page itself
 * needs — it is already showing everything.
 */
export default function NoticeItem({ item, clamp, readMoreTo, className = '', ...rest }) {
  const { t, lang, district, formatDate, formatDateWithDay } = useLanguage();
  const a = t.announcements;
  const status = STATUS[item.status];
  const descRef = useRef(null);
  const [cut, setCut] = useState(false);
  const event = hasEventDetails(item);
  // Taluka first, then district — the way the place is actually said.
  const summaryPlace = event
    ? [item.event.taluka, district(item.event.district)].filter(Boolean).join(', ')
    : '';

  useLayoutEffect(() => {
    const el = descRef.current;
    if (!clamp || !el) return undefined;
    // Cut off by at least half a line; Devanagari marks alone overflow a pixel or two.
    const measure = () => {
      const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
      setCut(el.scrollHeight - el.clientHeight > line / 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clamp, lang]);

  const showReadMore = Boolean(clamp && cut && readMoreTo);

  return (
    <li className={`notices__item ${className}`} {...rest}>
      <p className="notices__title">
        {noticeText(item.title, lang)}
        {status ? (
          <span className={`badge ${status.className}`}>
            <Icon name={status.icon} size={12} />
            {a.statuses[item.status]}
          </span>
        ) : null}
      </p>
      {item.desc ? (
        <p ref={descRef} className={`notices__desc${clamp ? ' is-clamped' : ''}`}>
          {noticeText(item.desc, lang)}
        </p>
      ) : null}

      {/* The strip rotates every few seconds, so there an event gets a single
          summary line; the full block belongs on the page, where there is time
          to read a venue off. */}
      {event && clamp ? (
        <p className="notices__event-line">
          <Icon name="mapPin" size={13} />
          {[
            item.date && formatDateWithDay(item.date),
            item.event.time,
            item.event.venue || summaryPlace,
          ].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {event && !clamp ? <EventDetails item={item} /> : null}

      {item.date || item.link?.href || showReadMore ? (
        <p className="notices__meta">
          {item.date ? (
            <time dateTime={item.date} className="notices__date">
              <Icon name="calendar" size={13} />
              {formatDate(item.date)}
            </time>
          ) : null}
          {showReadMore ? (
            <Link className="notices__more" to={readMoreTo}>
              {a.readMore}
              <Icon name="arrowRight" size={13} />
            </Link>
          ) : null}
          {item.link?.href ? (
            <a className="notices__link" href={item.link.href} target="_blank" rel="noopener noreferrer">
              {noticeText(item.link.label, lang) || a.viewDetails}
              <Icon name="external" size={13} />
              <span className="sr-only"> {t.common.opensNewTab}</span>
            </a>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}
