import { useEffect, useId, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import { districtContacts } from '../data/districtContacts';
import { DIVISION_OF_DISTRICT as DIVISION_OF, sortDistricts } from '../data/districts';
import { useLanguage } from '../i18n/LanguageContext';
import { OFFICIAL_LINKS, STATE_COORDINATOR_PHONE } from '../i18n/translations';

const norm = (s) => (s || '').toLocaleLowerCase();


// District Coordinators / Managers, grouped by district, searchable in the
// current language and filterable by district. Filters live in the URL
// (?d=…&q=…) so Back restores them.
export default function DistrictDirectoryPage() {
  const { t, lang, num, district, division } = useLanguage();
  const d = t.directory;
  const [params, setParams] = useSearchParams();
  const searchId = useId();
  const selectId = useId();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // All 36 districts (the same list as every district dropdown), plus any
  // other district name a contact record uses.
  const districts = useMemo(() => {
    const all = sortDistricts(district, lang);
    const extra = districtContacts.map((c) => c.district).filter((n) => n && !all.includes(n));
    return [...all, ...new Set(extra)];
  }, [district, lang]);

  const selected = districts.includes(params.get('d')) ? params.get('d') : '';
  const query = params.get('q') || '';

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const groups = useMemo(() => {
    const q = norm(query.trim());
    const matches = (c) =>
      !q ||
      [c.district, district(c.district), c.name?.mr, c.name?.en, d.roles[c.role]].some((v) => norm(v).includes(q));
    return districts
      .filter((n) => !selected || n === selected)
      .map((n) => ({ name: n, items: districtContacts.filter((c) => c.district === n && matches(c)) }))
      .filter((g) => g.items.length);
  }, [districts, selected, query, district, d]);

  const count = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="spage ddir" aria-labelledby="ddir-title">
      <Mandala className="spage__mandala" points={20} />
      <div className="container">
        <nav className="crumbs" aria-label={d.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{d.title}</span>
        </nav>

        <header className="spage__head">
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            {d.badge}
          </p>
          <h1 id="ddir-title" className="section__title">
            {d.title}
          </h1>
          <p className="section__lead">{d.lead}</p>
          {OFFICIAL_LINKS.districtOfficerForm ? (
            <a className="btn btn--ghost ddir__submit" href={OFFICIAL_LINKS.districtOfficerForm} target="_blank" rel="noopener noreferrer">
              <Icon name="file" size={16} />
              {d.submitInfo}
              <Icon name="external" size={16} />
              <span className="sr-only"> {t.common.opensNewTab}</span>
            </a>
          ) : null}
        </header>

        <div className="sfilter ddir__filter">
          <div className="sfilter__search">
            <label htmlFor={searchId} className="sr-only">
              {d.searchLabel}
            </label>
            <Icon name="search" size={18} />
            <input
              id={searchId}
              type="search"
              value={query}
              placeholder={d.searchPlaceholder}
              onChange={(e) => update('q', e.target.value)}
            />
          </div>
          <div className="ddir__select">
            <label htmlFor={selectId} className="sr-only">
              {d.districtLabel}
            </label>
            <Icon name="mapPin" size={18} />
            <select id={selectId} value={selected} onChange={(e) => update('d', e.target.value)}>
              <option value="">{d.allDistricts}</option>
              {districts.map((n) => (
                <option key={n} value={n}>
                  {district(n)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {districtContacts.length ? (
          <p className="spage__count" aria-live="polite">
            {d.count(num(count))}
          </p>
        ) : null}

        {groups.length ? (
          <div className="ddir__groups">
            {groups.map((g) => (
              <section key={g.name} className="ddir__group" aria-labelledby={`ddir-${g.name}`}>
                <header className="ddir__group-head">
                  <h2 id={`ddir-${g.name}`} className="ddir__district">
                    <Icon name="mapPin" size={18} />
                    {district(g.name)}
                  </h2>
                  {DIVISION_OF[g.name] ? (
                    <p className="ddir__division">{d.division(division(DIVISION_OF[g.name]))}</p>
                  ) : null}
                </header>
                <ul className="ddir__grid">
                  {g.items.map((c) => {
                    const name = c.name?.[lang] || c.name?.mr || c.name?.en;
                    return (
                      <li key={c.id} className="dcard">
                        <p className="dcard__role">{d.roles[c.role] || d.roles.coordinator}</p>
                        {name ? <p className="dcard__name">{name}</p> : null}
                        {c.phone || c.email ? (
                          <div className="dcard__links">
                            {c.phone ? (
                              <a href={`tel:${c.phone}`} className="dcard__link">
                                <Icon name="phone" size={15} />
                                {num(c.phone)}
                              </a>
                            ) : null}
                            {c.email ? (
                              <a href={`mailto:${c.email}`} className="dcard__link">
                                <Icon name="mail" size={15} />
                                {c.email}
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : districtContacts.length ? (
          <div className="sempty">
            <p>{d.noResults}</p>
            <button type="button" className="btn btn--ghost" onClick={() => setParams({}, { replace: true })}>
              {d.clearFilters}
            </button>
          </div>
        ) : (
          <div className="sempty ddir__pending">
            <span className="ddir__pending-icon" aria-hidden="true">
              <Icon name="mapPin" size={22} />
            </span>
            <h2 className="ddir__pending-title">{d.pendingTitle}</h2>
            <p>{d.pendingDesc}</p>
            <a className="btn btn--primary" href={OFFICIAL_LINKS.coordinators} target="_blank" rel="noopener noreferrer">
              {d.official}
              <Icon name="external" size={16} />
              <span className="sr-only"> {t.common.opensNewTab}</span>
            </a>
          </div>
        )}

        <p className="ddir__state">
          <Icon name="info" size={16} />
          <span>
            {d.stateNote} {t.contact.cardTitle} —{' '}
            <a href={`tel:${STATE_COORDINATOR_PHONE}`}>{num(STATE_COORDINATOR_PHONE)}</a>
          </span>
        </p>
      </div>
    </section>
  );
}
