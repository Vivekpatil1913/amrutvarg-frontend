import Icon from './Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { isSafeHttpUrl } from '../services/mediaUrl';

// One district's office, shown above its Amrut Varg team.
//
// Every row is conditional. This record is filled in as details are verified,
// so a partly-complete office is the normal state — an address may be known
// long before a Collector is appointed. A field with nothing in it renders
// nothing at all rather than a label over an em dash, because an empty label
// reads as "we have this and it is blank" when the truth is "not recorded".
//
// If nothing at all is recorded the component renders null, so the page looks
// exactly as it did before any office existed.
export default function DistrictOffice({ office }) {
  const { t, num, lang } = useLanguage();
  const o = t.office;
  if (!office) return null;

  const name = lang === 'en'
    ? office.office_name_en || office.office_name_mr
    : office.office_name_mr || office.office_name_en;

  // Links are re-checked here, not trusted from the record: the server refuses
  // an unsafe address on save, but a page must never put one in an href on the
  // strength of that alone.
  const website = isSafeHttpUrl(office.website_url) ? office.website_url : '';
  const map = isSafeHttpUrl(office.map_url) ? office.map_url : '';

  const rows = [
    office.collector_name && {
      key: 'collector',
      icon: 'users',
      label: office.collector_designation || o.collector,
      value: office.collector_name,
    },
    office.address && { key: 'address', icon: 'mapPin', label: o.address, value: office.address },
    office.hours && { key: 'hours', icon: 'clock', label: o.hours, value: office.hours },
  ].filter(Boolean);

  const hasContact = office.phone || office.email || website || map;
  if (!name && !rows.length && !hasContact) return null;

  return (
    <section className="doffice" aria-labelledby="doffice-title">
      <header className="doffice__head">
        <span className="doffice__icon" aria-hidden="true">
          <Icon name="building" size={18} />
        </span>
        <div>
          <p className="doffice__eyebrow">{o.title}</p>
          <h2 id="doffice-title" className="doffice__name">{name || o.title}</h2>
        </div>
      </header>

      {rows.length ? (
        <dl className="doffice__list">
          {rows.map((r) => (
            <div key={r.key} className="doffice__row">
              <dt>
                <Icon name={r.icon} size={15} />
                {r.label}
              </dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hasContact ? (
        <div className="doffice__actions">
          {office.phone ? (
            <a className="doffice__btn" href={`tel:+91${office.phone}`}>
              <Icon name="phone" size={15} />
              <span>{num(office.phone)}</span>
            </a>
          ) : null}
          {office.email ? (
            <a className="doffice__btn" href={`mailto:${office.email}`}>
              <Icon name="mail" size={15} />
              <span className="doffice__email">{office.email}</span>
            </a>
          ) : null}
          {website ? (
            <a className="doffice__btn" href={website} target="_blank" rel="noopener noreferrer">
              <Icon name="globe" size={15} />
              <span>{o.website}</span>
              <span className="sr-only"> {t.common.opensNewTab}</span>
            </a>
          ) : null}
          {map ? (
            <a className="doffice__btn" href={map} target="_blank" rel="noopener noreferrer">
              <Icon name="mapPin" size={15} />
              <span>{o.map}</span>
              <span className="sr-only"> {t.common.opensNewTab}</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
