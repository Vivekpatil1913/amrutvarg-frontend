import Icon from '../Icon';
import ShareButton from '../ShareButton';
import { VideoPlayer, resolveVideo } from '../MediaPlayers';
import { useVideos } from '../../data/useMediaLibrary';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatDuration } from '../../services/mediaUrl';

// Video success stories, shown inside Yashogatha.
//
// These are the SAME records the Videos & Reels screen manages — the ones
// filed under the "Success story" category — not a second video library. The
// Media page shows every category; this shows that one, in the place a reader
// looking for student stories would go.
//
// The player and the URL handling are the existing ones; nothing about
// playback is reimplemented here.

// Marathi first when it is there, English when it is not — and the reverse in
// English. A record may legitimately carry only one of the two.
const pick = (lang, mr, en) => (lang === 'en' ? en || mr : mr || en) || '';

// What a reader is told about where the video lives. An uploaded file plays on
// this site, so it needs no label at all.
const SOURCE_LABEL = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  instagram: 'Instagram',
};

function VideoStoryCard({ item, t, lang }) {
  const title = pick(lang, item.title_mr, item.title_en);
  const desc = pick(lang, item.desc_mr, item.desc_en);
  const length = formatDuration(item.duration_seconds);
  const resolved = resolveVideo(item);
  const source = SOURCE_LABEL[resolved?.provider];
  const y = t.yashogathaVideos;

  // A record whose address cannot be resolved renders nothing rather than an
  // empty frame — one bad row must not leave a hole in the shelf.
  if (!resolved) return null;

  return (
    <article className="vstory" id={`video-${item.id}`} data-reveal>
      <VideoPlayer
        item={item}
        reel={item.content_type === 'reel'}
        label={title}
        playLabel={t.media.playLabel(title)}
        openLabel={t.media.openExternal}
      />

      <div className="vstory__body">
        <div className="vstory__meta">
          {item.school_name ? (
            <span className="vstory__school">
              <Icon name="building" size={13} />
              {item.school_name}
              {item.school_district ? `, ${item.school_district}` : ''}
            </span>
          ) : null}
          {length ? <span className="vstory__len">{length}</span> : null}
          {source ? <span className="vstory__source">{source}</span> : null}
        </div>

        <h3 className="vstory__title">{title}</h3>
        {desc ? <p className="vstory__desc">{desc}</p> : null}

        <div className="vstory__actions">
          {/* The canonical public address of this video: the Yashogatha page,
              anchored at this card. A recipient with no account here can open
              it and land on the video. */}
          <ShareButton path={`/yashogatha#video-${item.id}`} title={title} compact />

          {/* Only offered when the video really does live somewhere else —
              and it opens exactly the address the editor saved, whether that
              names a video, a channel or a playlist. */}
          {resolved.mode !== 'video' && resolved.url ? (
            <a
              className="vstory__open"
              href={resolved.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="external" size={14} />
              {resolved.kind === 'channel' ? y.openChannel
                : resolved.kind === 'playlist' ? y.openPlaylist
                : y.openOriginal}
              <span className="sr-only"> {t.common.opensNewTab}</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function YashogathaVideos({ limit = 12 }) {
  const { t, lang } = useLanguage();
  const y = t.yashogathaVideos;
  // Only the success-story category, and only published rows — the API
  // excludes drafts from the query itself.
  const { items, status, retry } = useVideos({ limit, category: 'success' });

  // Nothing published yet is not a failure and not worth a notice: the section
  // simply is not there, exactly as before this existed.
  if (status === 'idle' || (status === 'ready' && items.length === 0)) return null;

  return (
    <section className="vstories" aria-labelledby="vstories-title">
      <header className="vstories__head">
        <h2 id="vstories-title" className="vstories__title">
          <Icon name="film" size={18} />
          {y.title}
        </h2>
        {y.lead ? <p className="vstories__lead">{y.lead}</p> : null}
      </header>

      {status === 'loading' ? (
        <div className="vstories__grid" aria-busy="true" aria-label={t.media.loading}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="vstory vstory--skeleton" aria-hidden="true">
              <div className="vstory__skel-media" />
              <div className="vstory__skel-line" />
              <div className="vstory__skel-line vstory__skel-line--short" />
            </div>
          ))}
        </div>
      ) : null}

      {status === 'error' ? (
        <p className="vstories__error" role="status">
          <Icon name="alert" size={16} />
          {t.media.loadError}{' '}
          <button type="button" className="btn btn--ghost btn--sm" onClick={retry}>
            {t.media.retry}
          </button>
        </p>
      ) : null}

      {status === 'ready' && items.length ? (
        <div className="vstories__grid">
          {items.map((item) => (
            <VideoStoryCard key={item.id} item={item} t={t} lang={lang} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// Exported so a test can render one card in isolation.
export { VideoStoryCard };
