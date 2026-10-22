import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import NoticeItem, { noticeAnchor } from '../components/NoticeItem';
import { useAnnouncements } from '../data/useAnnouncements';
import { useLanguage } from '../i18n/LanguageContext';

// Every current announcement, in full.
//
// This replaces the dialog the strip used to open. A page has an address, so a
// notice can be linked to, bookmarked and returned to with the Back button —
// none of which a dialog could do. Nothing is clamped here: a reader who has
// come this far wants the whole notice, event details and all.
export default function AnnouncementsPage() {
  const { t, num } = useLanguage();
  const a = t.announcements;
  const items = useAnnouncements();
  const { hash } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Arriving from a "Read more" link, scroll to that notice once it is on the
  // page. The list is already rendered by then; the frame wait is for the
  // layout, not the data.
  useEffect(() => {
    if (!hash || !items.length) return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, items.length]);

  return (
    <section className="spage apage" aria-labelledby="apage-title">
      <Mandala className="spage__mandala" points={20} />
      <div className="container">
        <nav className="crumbs" aria-label={a.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{a.title}</span>
        </nav>

        <header className="spage__head">
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            {a.badge}
          </p>
          <h1 id="apage-title" className="section__title">{a.pageTitle}</h1>
          <p className="section__lead">{a.pageLead}</p>
        </header>

        {items.length ? (
          <>
            <p className="spage__count" aria-live="polite">{a.total(num(items.length))}</p>
            <ul className="notices__all apage__list">
              {items.map((item) => (
                <NoticeItem key={item.id} id={noticeAnchor(item.id)} item={item} />
              ))}
            </ul>
          </>
        ) : (
          <div className="sempty">
            <Icon name="megaphone" size={22} />
            <p>{a.none}</p>
          </div>
        )}
      </div>
    </section>
  );
}
