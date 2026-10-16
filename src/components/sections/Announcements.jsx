import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import NoticeItem, { noticeAnchor } from '../NoticeItem';
import { ANNOUNCEMENTS_PATH } from '../layout/Header';
import { useAnnouncements } from '../../data/useAnnouncements';
import { useLanguage } from '../../i18n/LanguageContext';

// Time each announcement stays in the strip before the next one.
const ROTATE_MS = 5000;

const reducedMotionQuery = () => window.matchMedia?.('(prefers-reduced-motion: reduce)');

// Announcement strip at the top of the home page.
//
// One announcement shows at a time and the next follows every ROTATE_MS.
// Rotation pauses while the strip is hovered or focused, and is off for
// visitors who ask for reduced motion.
//
// "View all" and "Read more" both go to /announcements — a real page, with an
// address that can be shared, bookmarked and reached by the Back button. It
// used to be a dialog, which could do none of those and left the reader
// scrolling a small box for the one notice they were after.
//
// Renders nothing when there are no announcements.
export default function Announcements() {
  const { t, num } = useLanguage();
  const a = t.announcements;
  const items = useAnnouncements();
  const count = items.length;

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
  const rotating = count > 1 && !held && !reduced;

  // One timer per shown announcement.
  useEffect(() => {
    if (!rotating) return undefined;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [rotating, current, count]);

  if (!count) return null;

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
                    // Lands on the page already scrolled to this notice.
                    readMoreTo={`${ANNOUNCEMENTS_PATH}#${noticeAnchor(item.id)}`}
                    className={`notices__slide${active ? ' is-active' : ''}`}
                    aria-hidden={active ? undefined : true}
                    inert={active ? undefined : ''}
                  />
                );
              })}
            </ul>

            <div className="notices__foot">
              <Link className="notices__toggle" to={ANNOUNCEMENTS_PATH}>
                {count > 1 ? a.viewAll(num(count)) : a.viewAllOne}
                <Icon name="arrowRight" size={15} />
              </Link>
            </div>
          </div>
        </div>

        {rotating ? <span key={current} className="notices__timer" aria-hidden="true" /> : null}
      </div>
    </section>
  );
}
