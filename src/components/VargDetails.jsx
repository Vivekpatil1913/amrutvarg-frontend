import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import Modal from './Modal';
import { districtPath } from '../data/districtLinks';
import { useLanguage } from '../i18n/LanguageContext';
import { STATE_COORDINATOR_PHONE } from '../i18n/translations';
import { useVargsSourceNote } from '../data/VargsProvider';
import { vargPlaceName } from '../data/vargNamesEn';
import { vargPath } from '../data/vargLinks';
import { copyText } from '../services/clipboard';
import { ResourceLink } from './MediaPlayers';
import ShareButton from './ShareButton';
import { isSafeHttpUrl } from '../services/mediaUrl';

// Full details of one Amrut Varg, opened from its shareable /vargs/<slug> link.
// Shows only what the portal publishes; missing details are stated, not filled in.
// `varg` is null for an unknown slug, which shows a not-found message instead.
export default function VargDetails({ open, varg, onClose, onEnroll, onSeeAll }) {
  const { t, num, lang, district, division } = useLanguage();
  const v = t.vargs;
  const sourceNote = useVargsSourceNote();
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => setCopied(false), [varg]);

  if (!open) return null;

  if (!varg) {
    return (
      <Modal open title={v.notFoundTitle} icon="search" onClose={onClose} size="sm">
        <div className="vdet">
          <p className="vdet__missing">{v.notFoundDesc}</p>
          <div className="vdet__actions">
            <button type="button" className="btn btn--primary" onClick={onSeeAll}>
              {v.seeAll}
              <Icon name="arrowRight" size={16} />
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const url = `${window.location.origin}${vargPath(varg)}`;
  const place = vargPlaceName(varg, lang);
  const div = division(varg.vibhag);

  const onCopy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    }
  };

  const rows = [
    { key: 'place', icon: 'building', label: v.colSchool, value: place },
    { key: 'district', icon: 'mapPin', label: v.colDistrict, value: district(varg.district) },
    { key: 'division', icon: 'globe', label: v.colDivision, value: div ? v.division(div) : '' },
    varg.taluka?.trim() ? { key: 'taluka', icon: 'mapPin', label: t.leader.taluka, value: varg.taluka } : null,
    varg.village?.trim() ? { key: 'village', icon: 'mapPin', label: t.leader.village, value: varg.village } : null,
    { key: 'programme', icon: 'clock', label: v.dProgramme, value: v.programmeValue },
  ].filter((r) => r && r.value);

  return (
    <Modal open title={district(varg.district)} subtitle={div ? v.division(div) : undefined} icon="mapPin" onClose={onClose}>
      <div className="vdet">
        <dl className="vdet__list">
          {rows.map((r) => (
            <div key={r.key} className="vdet__row">
              <dt>
                <Icon name={r.icon} size={16} />
                {r.label}
              </dt>
              <dd>{r.value}</dd>
            </div>
          ))}
          <div className="vdet__row">
            <dt>
              <Icon name="phone" size={16} />
              {v.dContact}
            </dt>
            <dd>
              <span className="vdet__contact">
                {v.contactState}:{' '}
                <a href={`tel:${STATE_COORDINATOR_PHONE}`}>{num(STATE_COORDINATOR_PHONE)}</a>
              </span>
              {/* REQ-10: this is district contact information, so it goes to
                  THIS varg's district rather than the unfiltered list. An
                  unknown district name falls back to the full directory — the
                  general behaviour — rather than to a broken address. */}
              <Link className="vdet__contact" to={districtPath(varg.district)}>
                {v.contactDistrict}
                <Icon name="arrowRight" size={14} />
              </Link>
            </dd>
          </div>
        </dl>

        {/* The school's own video or website, when the record carries one.
            The heading is gated on the same test ResourceLink uses to decide
            whether it will render anything: a field that is empty — or holds
            an address the site refuses to open — must take its label with it,
            rather than leaving a heading stranded over nothing. */}
        {isSafeHttpUrl(varg.resourceUrl) ? (
          <div className="vdet__resource-row">
            <p className="vdet__resource-label">
              <Icon name="film" size={15} />
              {t.media.resource}
            </p>
            <ResourceLink
              url={varg.resourceUrl}
              label={place}
              openLabel={t.media.resourceOpen}
              playLabel={t.media.playLabel(place)}
            />
          </div>
        ) : null}

        <p className="vdet__note">
          <Icon name="info" size={16} />
          {v.unavailable}
        </p>

        <div className="vdet__share">
          <label className="vdet__share-label" htmlFor={`varg-link-${varg.id}`}>
            {v.linkLabel}
          </label>
          <div className="vdet__share-row">
            <input
              id={`varg-link-${varg.id}`}
              className="vdet__url"
              value={url}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className={`btn btn--ghost btn--sm${copied ? ' is-done' : ''}`} onClick={onCopy}>
              <Icon name={copied ? 'check' : 'file'} size={15} />
              <span aria-live="polite">{copied ? v.linkCopied : v.copyLink}</span>
            </button>
          </div>
        </div>

        {/* The copy box above hands over a link; this hands it straight to the
            app people here actually send it in. */}
        <div className="vdet__share-wa">
          <ShareButton variant="inline" path={vargPath(varg)} title={place} />
        </div>

        <div className="vdet__actions">
          <button type="button" className="btn btn--primary" onClick={() => onEnroll(varg)}>
            {t.common.enrollNow}
            <Icon name="arrowRight" size={16} />
          </button>
        </div>

        <p className="vdet__source">{sourceNote}</p>
      </div>
    </Modal>
  );
}
