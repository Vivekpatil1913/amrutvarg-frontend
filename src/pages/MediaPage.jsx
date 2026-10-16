import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { VideoPlayer, AudioPlayer } from '../components/MediaPlayers';
import { useVideos, usePodcasts } from '../data/useMediaLibrary';
import { useLanguage } from '../i18n/LanguageContext';
import { useReveal } from '../hooks/useReveal';
import { formatDuration, mediaSrc } from '../services/mediaUrl';

// Published video, reel and podcast content.
//
// One page with two tabs rather than two pages: the main menu is already long,
// and a visitor looking for "what can I watch or listen to" is looking for one
// place. The tab is reflected in the URL hash so a link to #podcasts opens on
// the right one.
//
// Nothing here is ever a draft: the API these hooks call excludes unpublished
// rows from the query itself.

const TABS = ['videos', 'podcasts'];

// Marathi first when it is there, English when it is not — and the other way
// round in English. A record may legitimately carry only one of the two.
const pick = (lang, mr, en) => (lang === 'en' ? en || mr : mr || en) || '';

// date columns arrive as 'YYYY-MM-DD'. Split rather than parse: through Date
// they would be read as UTC midnight and shown a day early west of Greenwich.
const dateParts = (v) => {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split('-');
  return y && m && d ? `${y}-${m}-${d}` : null;
};

function Empty({ icon, title, note }) {
  return (
    <div className="mlib__empty">
      <Icon name={icon} size={22} />
      <p className="mlib__empty-title">{title}</p>
      {note && <p className="mlib__empty-note">{note}</p>}
    </div>
  );
}

function Loading({ label, count = 3 }) {
  return (
    <div className="mlib__grid" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mlib__card mlib__card--skeleton" aria-hidden="true">
          <div className="mlib__skel-media" />
          <div className="mlib__skel-line" />
          <div className="mlib__skel-line mlib__skel-line--short" />
        </div>
      ))}
    </div>
  );
}

function VideoCard({ item, t, lang }) {
  const title = pick(lang, item.title_mr, item.title_en);
  const desc = pick(lang, item.desc_mr, item.desc_en);
  const length = formatDuration(item.duration_seconds);
  return (
    <article className={`mlib__card${item.content_type === 'reel' ? ' is-reel' : ''}`} data-reveal>
      <VideoPlayer
        item={item}
        reel={item.content_type === 'reel'}
        label={title}
        playLabel={t.media.playLabel(title)}
        openLabel={t.media.openExternal}
      />
      <div className="mlib__body">
        <div className="mlib__meta">
          <span className="mlib__tag">
            {item.content_type === 'reel' ? t.media.typeReel : t.media.typeVideo}
          </span>
          {length && <span className="mlib__len">{length}</span>}
        </div>
        <h3 className="mlib__title">{title}</h3>
        {desc && <p className="mlib__desc">{desc}</p>}
      </div>
    </article>
  );
}

function PodcastCard({ item, t, lang, formatDate }) {
  const title = pick(lang, item.title_mr, item.title_en);
  const desc = pick(lang, item.desc_mr, item.desc_en);
  const length = formatDuration(item.duration_seconds);
  const date = dateParts(item.publish_date);
  const cover = mediaSrc(import.meta.env.VITE_CMS_API, item.cover_url);
  return (
    <article className="mlib__card mlib__card--pod" data-reveal>
      <div className="mlib__pod-head">
        <div className="mlib__cover">
          {cover
            ? <img src={cover} alt="" loading="lazy" />
            : <Icon name="mic" size={24} />}
        </div>
        <div className="mlib__pod-meta">
          <h3 className="mlib__title">{title}</h3>
          <p className="mlib__meta">
            {date && <span>{formatDate(date)}</span>}
            {date && length && <span aria-hidden="true"> · </span>}
            {length && <span className="mlib__len">{length}</span>}
          </p>
        </div>
      </div>
      {desc && <p className="mlib__desc">{desc}</p>}
      <AudioPlayer item={item} label={title} listenLabel={t.media.listenExternal} />
    </article>
  );
}

export default function MediaPage() {
  const { t, lang, formatDate } = useLanguage();
  const initial = TABS.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'videos';
  const [tab, setTab] = useState(initial);

  const videos = useVideos();
  const podcasts = usePodcasts();
  useReveal([lang, tab, videos.status, podcasts.status]);

  const current = tab === 'videos' ? videos : podcasts;

  const counts = useMemo(
    () => ({ videos: videos.items.length, podcasts: podcasts.items.length }),
    [videos.items, podcasts.items],
  );

  const choose = (next) => {
    setTab(next);
    window.history.replaceState(null, '', `#${next}`);
  };

  return (
    <main id="main" className="section mlib">
      <div className="container">
        <nav className="mlib__crumb" aria-label={t.media.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <Icon name="arrowRight" size={13} />
          <span aria-current="page">{t.media.title}</span>
        </nav>

        <header className="section__head mlib__head" data-reveal>
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {t.media.badge}
            </p>
            <h1 className="section__title">{t.media.title}</h1>
          </div>
          <p className="section__lead">{t.media.lead}</p>
        </header>

        <div className="mlib__tabs" role="tablist" aria-label={t.media.title}>
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`mtab-${key}`}
              aria-selected={tab === key}
              aria-controls={`mpanel-${key}`}
              className={`mlib__tab${tab === key ? ' is-on' : ''}`}
              onClick={() => choose(key)}
            >
              <Icon name={key === 'videos' ? 'film' : 'mic'} size={16} />
              {key === 'videos' ? t.media.tabVideos : t.media.tabPodcasts}
              {counts[key] > 0 && <span className="mlib__count">{counts[key]}</span>}
            </button>
          ))}
        </div>

        <section
          role="tabpanel"
          id={`mpanel-${tab}`}
          aria-labelledby={`mtab-${tab}`}
          className="mlib__panel"
        >
          {current.status === 'loading' && <Loading label={t.media.loading} />}

          {current.status === 'error' && (
            <Empty
              icon="alert"
              title={t.media.loadError}
              note={
                <button type="button" className="btn btn--ghost btn--sm" onClick={current.retry}>
                  {t.media.retry}
                </button>
              }
            />
          )}

          {current.status === 'idle' && <Empty icon="info" title={t.media.unavailable} />}

          {current.status === 'ready' && current.items.length === 0 && (
            <Empty
              icon={tab === 'videos' ? 'film' : 'mic'}
              title={tab === 'videos' ? t.media.noVideos : t.media.noPodcasts}
              note={t.media.emptyNote}
            />
          )}

          {current.status === 'ready' && current.items.length > 0 && (
            <div className={`mlib__grid${tab === 'podcasts' ? ' mlib__grid--pod' : ''}`}>
              {tab === 'videos'
                ? videos.items.map((item) => <VideoCard key={item.id} item={item} t={t} lang={lang} />)
                : podcasts.items.map((item) => (
                    <PodcastCard key={item.id} item={item} t={t} lang={lang} formatDate={formatDate} />
                  ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
