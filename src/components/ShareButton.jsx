import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { copyText } from '../services/clipboard';
import { canWebShare, publicUrl, shareText, webShare, whatsappHref } from '../services/share';

// Share one story or video.
//
// On a phone the operating system's own share sheet is better than anything a
// web page can offer, so that is tried first where the browser has it. The
// explicit WhatsApp and Copy-link buttons are always available underneath —
// they are the fallback on desktop and the answer when the sheet is dismissed.
//
// Nothing is ever sent. WhatsApp opens with the message prefilled and the
// visitor chooses the recipient.
//
// `path` is a path on this site ("/yashogatha#video-3"), never a CMS or upload
// address: a share is opened by someone with no account here.
export default function ShareButton({ path, title, className = '', compact = false, variant = 'menu' }) {
  const { t } = useLanguage();
  const s = t.share;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);
  const firstRef = useRef(null);
  const timer = useRef(0);
  const menuId = useId();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Clicking away closes the menu; Escape returns focus to the button.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) firstRef.current?.focus();
  }, [open]);

  const url = publicUrl(path);
  // A path that is not on this site yields no URL, and a share with no
  // destination is worse than no share button at all.
  if (!url) return null;

  const message = shareText({ lead: s.lead, title, url });
  const whatsapp = whatsappHref(message);

  const onShare = async (e) => {
    // Never let the click reach a card that would open the story or start a
    // video behind the menu.
    e.preventDefault();
    e.stopPropagation();
    if (canWebShare() && (await webShare({ title, text: message, url }))) return;
    setOpen((v) => !v);
  };

  const onCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (await copyText(url)) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      wrapRef.current?.querySelector('.share__toggle')?.focus();
    }
  };

  // Where there is room, WhatsApp is a button of its own rather than an option
  // behind a menu. It is how most readers of this site actually pass something
  // on, and a share that takes two taps to find is one that does not happen.
  // The native share sheet is offered beside it, not instead of it: on a phone
  // it would otherwise swallow the WhatsApp button entirely.
  if (variant === 'inline') {
    return (
      <div className={`share share--inline ${className}`} ref={wrapRef}>
        {whatsapp ? (
          <a
            className="share__wa"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon name="whatsapp" size={17} />
            <span>{s.whatsapp}</span>
            <span className="sr-only"> {t.common.opensNewTab}</span>
          </a>
        ) : null}

        <button type="button" className="share__plain" onClick={onCopy}>
          <Icon name={copied ? 'check' : 'link'} size={16} />
          <span aria-live="polite">{copied ? s.copied : s.copy}</span>
        </button>

        {canWebShare() ? (
          <button
            type="button"
            className="share__plain"
            onClick={(e) => { e.stopPropagation(); webShare({ title, text: message, url }); }}
          >
            <Icon name="share" size={16} />
            <span>{s.more}</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`share ${className}`} ref={wrapRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`share__toggle${compact ? ' share__toggle--compact' : ''}`}
        onClick={onShare}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${s.share}: ${title}`}
      >
        <Icon name="share" size={15} />
        {!compact && <span>{s.share}</span>}
      </button>

      {open ? (
        <div className="share__menu" id={menuId} role="menu">
          {whatsapp ? (
            <a
              ref={firstRef}
              className="share__item"
              role="menuitem"
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            >
              <Icon name="whatsapp" size={16} />
              <span>{s.whatsapp}</span>
              <span className="sr-only"> {t.common.opensNewTab}</span>
            </a>
          ) : null}

          <button type="button" className="share__item" role="menuitem" onClick={onCopy}>
            <Icon name={copied ? 'check' : 'link'} size={16} />
            <span aria-live="polite">{copied ? s.copied : s.copy}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
