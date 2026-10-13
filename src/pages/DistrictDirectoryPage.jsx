import { useEffect, useId, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import Pager, { PAGE_SIZE } from '../components/Pager';
import { CONTACT_ROLES, districtContacts } from '../data/districtContacts';
import { DISTRICTS, DISTRICTS_BY_DIVISION, DIVISION_OF_DISTRICT } from '../data/districts';
import { useLanguage } from '../i18n/LanguageContext';
import { OFFICIAL_LINKS, STATE_COORDINATOR_PHONE, translations } from '../i18n/translations';

const norm = (s) => (s || '').toLocaleLowerCase();
const DIVISIONS = Object.keys(DISTRICTS_BY_DIVISION);

// Role first, then district in the official order, so each grid reads the same way.
const rank = (c) => CONTACT_ROLES.indexOf(c.roles[0]) * 100 + (c.districts.length ? DISTRICTS.indexOf(c.districts[0]) : -1);

// First letters of the first name and the surname, as whole graphemes so
// Marathi conjuncts stay intact.
const graphemes = (s) =>
  typeof Intl !== 'undefined' && Intl.Segmenter
    ? [...new Intl.Segmenter('mr', { granularity: 'grapheme' }).segment(s)].map((g) => g.segment)
    : Array.from(s);
const initials = (name) => {
  const words = name.trim().split(/\s+/);
  return [words[0], words.length > 1 ? words[words.length - 1] : '']
    .map((w) => (w ? graphemes(w)[0] : ''))
    .join('');
};

function ContactCard({ c, featured }) {
  const { t, num, district } = useLanguage();
  const d = t.directory;
  return (
    <li className={`dcard${featured ? ' dcard--featured' : ''}`}>
      <div className="dcard__head">
        <span className="dcard__avatar" aria-hidden="true">
          {initials(c.name)}
        </span>
        <div className="dcard__who">
          <p className="dcard__name">{c.name}</p>
          <p className="dcard__roles">
            {c.roles.map((r) => (
              <span key={r} className={`dcard__role dcard__role--${r}`}>
                {d.roles[r]}
              </span>
            ))}
          </p>
        </div>
      </div>
      <p className="dcard__where">
        <Icon name="mapPin" size={14} />
        {c.districts.length ? c.districts.map((n) => district(n)).join(', ') : d.wholeDivision}
      </p>
      <div className="dcard__actions">
        {c.phone ? (
          <a href={`tel:+91${c.phone}`} className="dcard__btn" aria-label={`${d.call}: ${c.name}, ${c.phone}`}>
            <Icon name="phone" size={15} />
            <span>{num(c.phone)}</span>
          </a>
        ) : null}
        <a href={`mailto:${c.email}`} className="dcard__btn" aria-label={`${d.email}: ${c.name}, ${c.email}`}>
          <Icon name="mail" size={15} />
          <span className="dcard__email">{c.email}</span>
        </a>
      </div>
    </li>
  );
}

// The Amrut Varg regional team, grouped by division with the divisional
// manager first, searchable in the current language and filterable by
// district, 8 cards per page. Filters and page live in the URL (?d=…&q=…&p=…)
// so Back restores them.
export default function DistrictDirectoryPage() {
  const { t, num, district, division } = useLanguage();
  const d = t.directory;
  const [params, setParams] = useSearchParams();
  const searchId = useId();
  const selectId = useId();
  const listRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const selected = DISTRICTS.includes(params.get('d')) ? params.get('d') : '';
  const query = params.get('q') || '';

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // A new search or district starts again from page 1.
    if (key !== 'p') next.delete('p');
    setParams(next, { replace: true });
  };

  const groups = useMemo(() => {
    const q = norm(query.trim());
    const matchesDistrict = (c) =>
      !selected ||
      c.districts.includes(selected) ||
      // Division-wide staff also serve the chosen district.
      (c.division === DIVISION_OF_DISTRICT[selected] && (!c.districts.length || c.roles.includes('divisionalManager')));
    const matchesQuery = (c) =>
      !q ||
      [
        c.name,
        c.email,
        c.phone,
        division(c.division),
        translations.en.divisions[c.division],
        ...c.districts.flatMap((n) => [n, translations.en.districts[n]]),
        ...c.roles.flatMap((r) => [translations.mr.directory.roles[r], translations.en.directory.roles[r]]),
      ].some((v) => norm(v).includes(q));

    return DIVISIONS.map((name) => {
      const people = districtContacts
        .filter((c) => c.division === name && matchesDistrict(c) && matchesQuery(c))
        .sort((a, b) => rank(a) - rank(b));
      return {
        name,
        leads: people.filter((c) => c.roles.includes('divisionalManager')),
        team: people.filter((c) => !c.roles.includes('divisionalManager')),
        count: people.length,
      };
    }).filter((g) => g.count);
  }, [selected, query, division]);

  const count = groups.reduce((n, g) => n + g.count, 0);

  // One page of cards, taken from the list in display order (division by
  // division, divisional manager first), then grouped again under their
  // division headings. The page is clamped so a shorter list never shows an
  // empty page.
  const ordered = useMemo(() => groups.flatMap((g) => [...g.leads, ...g.team]), [groups]);
  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const current = Math.min(Math.max(Number.parseInt(params.get('p'), 10) - 1 || 0, 0), pageCount - 1);
  const start = current * PAGE_SIZE;
  const pageItems = ordered.slice(start, start + PAGE_SIZE);
  const pageGroups = groups
    .map((g) => {
      const items = pageItems.filter((c) => c.division === g.name);
      return {
        ...g,
        leads: items.filter((c) => c.roles.includes('divisionalManager')),
        team: items.filter((c) => !c.roles.includes('divisionalManager')),
      };
    })
    .filter((g) => g.leads.length || g.team.length);

  const goToPage = (n) => {
    update('p', n > 0 ? String(n + 1) : '');
    const top = listRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
              {DISTRICTS.map((n) => (
                <option key={n} value={n}>
                  {district(n)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p ref={listRef} className="spage__count" aria-live="polite">
          {d.count(num(count))}
        </p>

        {pageGroups.length ? (
          <div className="ddir__groups">
            {pageGroups.map((g) => (
              <section key={g.name} className="ddir__group" aria-labelledby={`ddir-${g.name}`}>
                <header className="ddir__group-head">
                  <h2 id={`ddir-${g.name}`} className="ddir__district">
                    <Icon name="globe" size={18} />
                    {d.division(division(g.name))}
                  </h2>
                  <p className="ddir__division">{d.count(num(g.count))}</p>
                </header>
                {g.leads.length ? (
                  <ul className="ddir__lead">
                    {g.leads.map((c) => (
                      <ContactCard key={c.id} c={c} featured />
                    ))}
                  </ul>
                ) : null}
                {g.team.length ? (
                  <ul className="ddir__grid">
                    {g.team.map((c) => (
                      <ContactCard key={c.id} c={c} />
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
            {pageCount > 1 ? (
              <nav className="results__more" aria-label={d.pagination}>
                <div className="results__progress" aria-hidden="true">
                  <span style={{ width: `${((current + 1) / pageCount) * 100}%` }} />
                </div>
                <span>{d.showing(`${num(start + 1)}–${num(start + pageItems.length)}`, num(count))}</span>
                <Pager page={current} pageCount={pageCount} onChange={goToPage} />
              </nav>
            ) : null}
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
