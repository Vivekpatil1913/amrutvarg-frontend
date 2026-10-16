import { useState } from 'react';
import Icon from './Icon';
import { videoEmbed, audioEmbed, mediaSrc } from '../services/mediaUrl';

// Players for published video and audio content.
//
// Every one of these resolves what to render through src/services/mediaUrl.js,
// which rebuilds an embed address from a parsed provider ID rather than
// passing a stored string into an iframe. A row whose URL cannot be resolved
// safely renders as nothing at all — an invalid or unsupported address must
// not break the page around it, which is why each component returns null or an
// external link instead of throwing.

const CMS_API = import.meta.env.VITE_CMS_API;

// A third-party frame is given the narrowest capability set that still lets a
// player work, and is never allowed to navigate the page that holds it.
const FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-popups';
const FRAME_ALLOW = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

// Resolves a row's content to { mode, src, url } regardless of whether it is a
// file this site stores or an address somewhere else.
export function resolveVideo(item) {
  if (!item) return null;
  if (item.source_type === 'upload') {
    const src = mediaSrc(CMS_API, item.media_url);
    return src ? { mode: 'video', kind: 'file', src, url: src, provider: 'file' } : null;
  }
  return videoEmbed(item.external_url);
}

export function resolveAudio(item) {
  if (!item) return null;
  if (item.source_type === 'upload') {
    const src = mediaSrc(CMS_API, item.media_url);
    return src ? { mode: 'audio', kind: 'file', src, url: src, provider: 'file' } : null;
  }
  return audioEmbed(item.external_url);
}

/**
 * A video with its thumbnail as a cover. The player is only mounted once the
 * visitor asks for it, so a page of twenty videos does not open twenty
 * connections to YouTube before anyone presses anything.
 */
export function VideoPlayer({ item, label, playLabel, openLabel, reel }) {
  const [playing, setPlaying] = useState(false);
  const resolved = resolveVideo(item);
  const poster = mediaSrc(CMS_API, item?.thumbnail_url);

  if (!resolved) return null;

  // Nothing embeddable: the only honest option is to send the visitor there.
  if (resolved.mode === 'link') {
    return (
      <a className="mplayer mplayer--link" href={resolved.url} target="_blank" rel="noopener noreferrer">
        <Icon name="external" size={18} />
        <span>{openLabel}</span>
      </a>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        className={`mplayer mplayer--cover${reel ? ' is-reel' : ''}`}
        onClick={() => setPlaying(true)}
        aria-label={playLabel}
      >
        {poster
          ? <img src={poster} alt="" loading="lazy" />
          : <span className="mplayer__blank" aria-hidden="true" />}
        <span className="mplayer__play" aria-hidden="true">
          <Icon name="play" size={22} />
        </span>
      </button>
    );
  }

  return (
    <div className={`mplayer${reel ? ' is-reel' : ''}`}>
      {resolved.mode === 'iframe' ? (
        <iframe
          src={`${resolved.src}${resolved.src.includes('?') ? '&' : '?'}autoplay=1`}
          title={label}
          loading="lazy"
          allow={FRAME_ALLOW}
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={FRAME_SANDBOX}
          allowFullScreen
        />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={resolved.src} poster={poster || undefined} controls autoPlay preload="metadata" />
      )}
    </div>
  );
}

/**
 * An episode's audio. A file plays in the browser's own player; a Spotify
 * episode plays in Spotify's; anything else is a listening link.
 */
export function AudioPlayer({ item, label, listenLabel }) {
  const resolved = resolveAudio(item);
  if (!resolved) return null;

  if (resolved.mode === 'audio') {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio className="maudio" src={resolved.src} controls preload="none" />;
  }

  if (resolved.mode === 'iframe') {
    return (
      <iframe
        className="maudio maudio--frame"
        src={resolved.src}
        title={label}
        loading="lazy"
        allow="clipboard-write; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={FRAME_SANDBOX}
      />
    );
  }

  return (
    <a className="mplayer mplayer--link" href={resolved.url} target="_blank" rel="noopener noreferrer">
      <Icon name="external" size={18} />
      <span>{listenLabel}</span>
    </a>
  );
}

/**
 * A school's resource URL on the varg details panel: a player when the address
 * is a video the site can embed, a plain external link otherwise, and nothing
 * at all when the field is empty or the address cannot be trusted.
 */
export function ResourceLink({ url, label, openLabel, playLabel }) {
  const resolved = url ? videoEmbed(url) : null;
  if (!resolved) return null;

  if (resolved.mode === 'link') {
    return (
      <a className="vdet__resource" href={resolved.url} target="_blank" rel="noopener noreferrer">
        <Icon name="external" size={15} />
        <span>{openLabel}</span>
      </a>
    );
  }

  return <VideoPlayer item={{ source_type: 'url', external_url: url }} label={label} playLabel={playLabel} openLabel={openLabel} />;
}
