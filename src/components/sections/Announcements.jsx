import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import Modal from '../Modal';
import { activeAnnouncements, announcements as staticAnnouncements } from '../../data/announcements';
import { useLanguage } from '../../i18n/LanguageContext';

const CMS_API = import.meta.env.VITE_CMS_API;

// Time each announcement stays in the strip before the next one.
const ROTATE_MS = 5000;

const STATUS = {
  new: { icon: 'sparkle', className: 'badge--ok' },
  comingSoon: { icon: 'clock', className: 'badge--muted' },
};

const text = (field, lang) => (field && (field[lang] || field.mr || field.en)) || '';

// Title with badge, description, then date and link. `clamp` cuts the
// description to two lines and offers "Read more" when it is cut off.
function NoticeItem({ item, clamp, onReadMore, className = '', ...rest }) {
  const { t, lang, formatDate } = useLanguage();
  const a = t.announcements;
  const status = STATUS[item.status];
  const descRef = useRef(null);
  const [cut, setCut] = useState(false);

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

  return (
    <li className={`notices__item ${className}`} {...rest}>
      <p className="notices__title">
        {text(item.title, lang)}
        {status ? (
          <span className={`badge ${status.className}`}>
            <Icon name={status.icon} size={12} />
            {a.statuses[item.status]}
          </span>
        ) : null}
      </p>
      {item.desc ? (
        <p ref={descRef} className={`notices__desc${clamp ? ' is-clamped' : ''}`}>
          {text(item.desc, lang)}
        </p>
      ) : null}
      {item.date || item.link?.href || (clamp && cut) ? (
        <p className="notices__meta">
          {item.date ? (
            <time dateTime={item.date} className="notices__date">
              <Icon name="calendar" size={13} />
              {formatDate(item.date)}
            </time>
          ) : null}
          {clamp && cut ? (
            <button type="button" className="notices__more" onClick={() => onReadMore(item.id)}>
              {a.readMore}
              <Icon name="arrowRight" size={13} />
            </button>
          ) : null}
          {item.link?.href ? (
            <a className="notices__link" href={item.link.href} target="_blank" rel="noopener noreferrer">
              {text(item.link.label, lang) || a.viewDetails}
              <Icon name="external" size={13} />
              <span className="sr-only"> {t.common.opensNewTab}</span>
            </a>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}

const reducedMotionQuery = () => window.matchMedia?.('(prefers-reduced-motion: reduce)');

// Announcement strip at the top of the home page. Content and ordering come
// from src/data/announcements.js. One announcement shows at a time and the
// next follows every ROTATE_MS. Rotation pauses while the strip is hovered or
// focused and while the dialog is open, and is off for visitors who ask for
// reduced motion. "View all" opens every announcement in full (the way to
// reach them all without waiting). Renders nothing when empty.
export default function Announcements() {
  const { t, num } = useLanguage();
  const a = t.announcements;
  const [rawList, setRawList] = useState(staticAnnouncements);

  useEffect(() => {
    if (!CMS_API) return;
    fetch(`${CMS_API}/public/announcements`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ data }) => { if (Array.isArray(data) && data.length) setRawList(data); })
      .catch(() => {});
  }, []);

  const items = activeAnnouncements(rawList);
  const count = items.length;
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState(null);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false); // hovered or focused
  const [reduced, setReduced] = useState(() => Boolean(reducedMotionQuery()?.matches));

  useEffect(() => {
    const mq = reducedMotionQuery();
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const current = count ? index % count : 0;
  const rotating = count > 1 && !held && !open && !reduced;

  // One timer per shown announcement.
  useEffect(() => {
    if (!rotating) return undefined;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [rotating, current, count]);

  // Opened from "Read more", the dialog scrolls to that announcement.
  useEffect(() => {
    if (open && focusId) document.getElementById(`notice-all-${focusId}`)?.scrollIntoView({ block: 'start' });
  }, [open, focusId]);

  if (!count) return null;

  const showAll = (id = null) => {
    setFocusId(id);
    setOpen(true);
  };

  // Hover pauses only for a real mouse, and focus only for keyboard focus: on
  // touch screens a tap would otherwise leave the rotation paused for good.
  const hold = {
    onPointerEnter: (e) => e.pointerType === 'mouse' && setHeld(true),
    onPointerLeave: (e) => e.pointerType === 'mouse' && setHeld(false),
    onFocus: (e) => e.target.matches(':focus-visible') && setHeld(true),
    onBlur: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
    },
  };

  return (
    <section className="notices" aria-labelledby="notices-title">
      {/* The bar runs edge to edge; the inner container keeps its content
          aligned with the rest of the page. */}
      <div className="notices__bar" {...(count > 1 ? hold : {})}>
        <div className="container notices__inner">
          <h2 id="notices-title" className="notices__label">
            <span className="notices__icon" aria-hidden="true">
              <Icon name="megaphone" size={18} />
            </span>
            {a.title}
            {count > 1 ? <span className="notices__count">{num(count)}</span> : null}
          </h2>

          <div className="notices__body">
            {/* Every announcement sits in the same grid cell, so the strip keeps
                the height of the tallest and the page never jumps on rotation. */}
            <ul className="notices__list notices__slides" aria-live={rotating ? 'off' : 'polite'}>
              {items.map((item, i) => {
                const active = i === current;
                return (
                  <NoticeItem
                    key={item.id}
                    item={item}
                    clamp
                    onReadMore={showAll}
                    className={`notices__slide${active ? ' is-active' : ''}`}
                    aria-hidden={active ? undefined : true}
                    inert={active ? undefined : ''}
                  />
                );
              })}
            </ul>

            {count > 1 ? (
              <div className="notices__foot">
                <button type="button" className="notices__toggle" aria-haspopup="dialog" onClick={() => showAll()}>
                  {a.viewAll(num(count))}
                  <Icon name="arrowRight" size={15} />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {rotating ? <span key={current} className="notices__timer" aria-hidden="true" /> : null}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={a.title}
        subtitle={a.total(num(items.length))}
        icon="megaphone"
        size="md"
      >
        <ul className="notices__all">
          {items.map((item) => (
            <NoticeItem key={item.id} id={`notice-all-${item.id}`} item={item} />
          ))}
        </ul>
      </Modal>
    </section>
  );
}
