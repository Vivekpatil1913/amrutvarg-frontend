import { useEffect, useId, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import Pager, { PAGE_SIZE } from '../components/Pager';
import { CONTACT_ROLES } from '../data/districtContacts';
import { DISTRICTS, DISTRICTS_BY_DIVISION, DIVISION_OF_DISTRICT } from '../data/districts';
import { useDistrictContacts } from '../data/useDistrictContacts';
import { districtFromSlug, districtPath } from '../data/districtLinks';
import { useDistrictOffice } from '../data/useDistrictOffice';
import { useMaster, findByName } from '../data/useMasters';
import DistrictOffice from '../components/DistrictOffice';
import { useDirectory, fill } from '../data/useDirectory';
import { pick } from '../data/useHero';
import { useLanguage } from '../i18n/LanguageContext';
import { OFFICIAL_LINKS, STATE_COORDINATOR_PHONE, translations } from '../i18n/translations';

const norm = (s) => (s || '').toLocaleLowerCase();
const DIVISIONS = Object.keys(DISTRICTS_BY_DIVISION);

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

function ContactCard({ c, featured, labels, roleLabel }) {
  const { num, district } = useLanguage();
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
                {roleLabel(r)}
              </span>
            ))}
          </p>
        </div>
      </div>
      <p className="dcard__where">
        <Icon name="mapPin" size={14} />
        {c.districts.length ? c.districts.map((n) => district(n)).join(', ') : labels.wholeDivision}
      </p>
      <div className="dcard__actions">
        {c.phone ? (
          <a href={`tel:+91${c.phone}`} className="dcard__btn" aria-label={`${labels.call}: ${c.name}, ${c.phone}`}>
            <Icon name="phone" size={15} />
            <span>{num(c.phone)}</span>
          </a>
        ) : null}
        <a href={`mailto:${c.email}`} className="dcard__btn" aria-label={`${labels.email}: ${c.name}, ${c.email}`}>
          <Icon name="mail" size={15} />
          <span className="dcard__email">{c.email}</span>
        </a>
      </div>
    </li>
  );
}

// The Amrut Varg regional team, grouped by division with the featured role
// first, searchable in the current language and filterable by district, 8 cards
// per page. Filters and page live in the URL (?d=…&q=…&p=…) so Back restores
// them.
//
// Wording comes from the CMS when it is reachable and falls back to the bundled
// translations otherwise, so the page always renders something complete. The
// role list is CMS-driven too: its order sorts the cards, and the roles marked
// featured get the wide card at the top of their division — both were fixed in
// code before.
export default function DistrictDirectoryPage() {
  const { t, num, district, division, lang } = useLanguage();
  const d = t.directory;
  const cms = useDirectory();
  const districtContacts = useDistrictContacts();
  const [params, setParams] = useSearchParams();
  const { districtSlug } = useParams();
  const navigate = useNavigate();

  const searchId = useId();
  const selectId = useId();
  const listRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const roles = useMemo(
    () =>
      cms
        ? cms.roles
        : CONTACT_ROLES.map((id) => ({
            id,
            label_mr: translations.mr.directory.roles[id],
            label_en: translations.en.directory.roles[id],
            featured: id === 'divisionalManager',
          })),
    [cms]
  );
  const roleOrder = useMemo(() => roles.map((r) => r.id), [roles]);
  const featuredRoles = useMemo(
    () => new Set(roles.filter((r) => r.featured).map((r) => r.id)),
    [roles]
  );

  // A role id with no entry in the list still shows something rather than an
  // empty badge — a contact can carry a role an editor has since renamed.
  const roleLabel = (id) => {
    const role = roles.find((r) => r.id === id);
    return role ? pick(role, 'label', lang) : id;
  };
  const isFeatured = (c) => c.roles.some((r) => featuredRoles.has(r));

  const labels = cms
    ? {
        badge: pick(cms.text, 'badge', lang),
        title: pick(cms.text, 'title', lang),
        lead: pick(cms.text, 'lead', lang),
        breadcrumb: pick(cms.text, 'breadcrumb', lang),
        searchLabel: pick(cms.text, 'search_label', lang),
        searchPlaceholder: pick(cms.text, 'search_placeholder', lang),
        districtLabel: pick(cms.text, 'district_label', lang),
        allDistricts: pick(cms.text, 'all_districts', lang),
        pagination: pick(cms.text, 'pagination', lang),
        noResults: pick(cms.text, 'no_results', lang),
        clearFilters: pick(cms.text, 'clear_filters', lang),
        wholeDivision: pick(cms.text, 'whole_division', lang),
        call: pick(cms.text, 'call', lang),
        email: pick(cms.text, 'email', lang),
        pendingTitle: pick(cms.text, 'pending_title', lang),
        pendingDesc: pick(cms.text, 'pending_desc', lang),
        official: pick(cms.text, 'official', lang),
        submitInfo: pick(cms.text, 'submit_info', lang),
        stateNote: pick(cms.text, 'state_note', lang),
        stateRole: pick(cms.text, 'state_role', lang),
        showDot: cms.text.eyebrow_dot !== false,
      }
    : {
        badge: d.badge,
        title: d.title,
        lead: d.lead,
        breadcrumb: d.breadcrumb,
        searchLabel: d.searchLabel,
        searchPlaceholder: d.searchPlaceholder,
        districtLabel: d.districtLabel,
        allDistricts: d.allDistricts,
        pagination: d.pagination,
        noResults: d.noResults,
        clearFilters: d.clearFilters,
        wholeDivision: d.wholeDivision,
        call: d.call,
        email: d.email,
        pendingTitle: d.pendingTitle,
        pendingDesc: d.pendingDesc,
        official: d.official,
        submitInfo: d.submitInfo,
        stateNote: d.stateNote,
        stateRole: t.contact.cardTitle,
        showDot: true,
      };

  const links = cms
    ? cms.links
    : {
        official_url: OFFICIAL_LINKS.coordinators,
        submit_form_url: OFFICIAL_LINKS.districtOfficerForm,
        state_phone: STATE_COORDINATOR_PHONE,
      };

  // The three lines that carry a value are templates in the CMS and functions
  // in the bundled copy, so each is resolved through one call site.
  const countText = (n) =>
    cms
      ? fill(pick(cms.text, Number(n) === 1 ? 'count_one' : 'count_many', lang), { n: num(n) })
      : d.count(num(n));
  const showingText = (shown, total) =>
    cms ? fill(pick(cms.text, 'showing', lang), { shown, total }) : d.showing(shown, total);
  const divisionText = (name) =>
    cms ? fill(pick(cms.text, 'division_label', lang), { name }) : d.division(name);

  // The district comes from the path when there is one (/district-directory/pune),
  // falling back to the ?d= filter the dropdown has always written. A slug that
  // names no district resolves to null, which is shown as a notice rather than
  // silently becoming "all districts" — a visitor following a district contact
  // link must never be handed another district's team without being told.
  const fromPath = districtSlug ? districtFromSlug(districtSlug) : null;
  const unknownSlug = Boolean(districtSlug) && fromPath === null;
  const fromQuery = DISTRICTS.includes(params.get('d')) ? params.get('d') : '';
  const selected = fromPath ?? fromQuery;
  const query = params.get('q') || '';

  // Choosing a district changes the ADDRESS rather than a query parameter, so
  // the result is a link worth sharing and the Back button returns to the
  // district the visitor came from. The search term travels with it; the page
  // number does not, because the new list starts again at the first page.
  const chooseDistrict = (name) => {
    const search = params.get('q');
    const qs = search ? `?q=${encodeURIComponent(search)}` : '';
    navigate(`${name ? districtPath(name) : '/district-directory'}${qs}`);
  };

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // A new search or district starts again from page 1.
    if (key !== 'p') next.delete('p');
    setParams(next, { replace: true });
  };

  const groups = useMemo(() => {
    // Role first, then district in the official order, so each grid reads the
    // same way. A role missing from the list sorts last rather than jumping to
    // the front, which is what indexOf's -1 would otherwise do.
    const rank = (c) => {
      const idx = roleOrder.indexOf(c.roles[0]);
      return (idx === -1 ? roleOrder.length : idx) * 100
        + (c.districts.length ? DISTRICTS.indexOf(c.districts[0]) : -1);
    };
    const featured = (c) => c.roles.some((r) => featuredRoles.has(r));

    const q = norm(query.trim());
    const matchesDistrict = (c) =>
      !selected ||
      c.districts.includes(selected) ||
      // Division-wide staff also serve the chosen district.
      (c.division === DIVISION_OF_DISTRICT[selected] && (!c.districts.length || featured(c)));
    const matchesQuery = (c) =>
      !q ||
      [
        c.name,
        c.email,
        c.phone,
        division(c.division),
        translations.en.divisions[c.division],
        ...c.districts.flatMap((n) => [n, translations.en.districts[n]]),
        ...c.roles.flatMap((r) => {
          const role = roles.find((x) => x.id === r);
          return role ? [role.label_mr, role.label_en] : [r];
        }),
      ].some((v) => norm(v).includes(q));

    return DIVISIONS.map((name) => {
      const people = districtContacts
        .filter((c) => c.division === name && matchesDistrict(c) && matchesQuery(c))
        .sort((a, b) => rank(a) - rank(b));
      return {
        name,
        leads: people.filter(featured),
        team: people.filter((c) => !featured(c)),
        count: people.length,
      };
    }).filter((g) => g.count);
  }, [selected, query, division, districtContacts, roles, roleOrder, featuredRoles]);

  // The office is keyed on the district master id, which the site already
  // loads for its dropdowns — so no new lookup table and no second source of
  // truth for what a district is.
  const districtRows = useMaster('districts');
  const selectedId = selected ? findByName(districtRows, selected)?.id ?? null : null;
  const { office, status: officeStatus } = useDistrictOffice(selectedId);

  const count = groups.reduce((n, g) => n + g.count, 0);

  // One page of cards, taken from the list in display order (division by
  // division, featured first), then grouped again under their division
  // headings. The page is clamped so a shorter list never shows an empty page.
  const ordered = useMemo(() => groups.flatMap((g) => [...g.leads, ...g.team]), [groups]);
  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const current = Math.min(Math.max(Number.parseInt(params.get('p'), 10) - 1 || 0, 0), pageCount - 1);
  const start = current * PAGE_SIZE;
  const pageItems = ordered.slice(start, start + PAGE_SIZE);
  const pageGroups = groups
    .map((g) => {
      const items = pageItems.filter((c) => c.division === g.name);
      return { ...g, leads: items.filter(isFeatured), team: items.filter((c) => !isFeatured(c)) };
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
        <nav className="crumbs" aria-label={labels.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <span aria-hidden="true">/</span>
          {/* Scoped to one district, the trail gains a step back to the whole
              list — otherwise a visitor arriving from a district contact link
              has no obvious way out to the other districts. */}
          {fromPath ? (
            <>
              <Link to="/district-directory">{labels.title}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{district(fromPath)}</span>
            </>
          ) : (
            <span aria-current="page">{labels.title}</span>
          )}
        </nav>

        <header className="spage__head">
          {labels.badge ? (
            <p className="eyebrow">
              {labels.showDot ? <span className="eyebrow__dot" aria-hidden="true" /> : null}
              {labels.badge}
            </p>
          ) : null}
          <h1 id="ddir-title" className="section__title">
            {fromPath ? d.districtScope(district(fromPath)) : labels.title}
          </h1>
          {labels.lead ? <p className="section__lead">{labels.lead}</p> : null}

          {/* A slug naming no district is said out loud. Showing the full list
              silently would look like the district simply has no contacts,
              and quietly picking a near match would be worse still. */}
          {unknownSlug ? (
            <p className="ddir__unknown" role="status">
              <Icon name="alert" size={16} />
              {d.unknownDistrict}
            </p>
          ) : null}

          {fromPath ? (
            <Link className="btn btn--ghost ddir__all" to="/district-directory">
              <Icon name="arrowLeft" size={16} />
              {d.allDistrictsLink}
            </Link>
          ) : null}
          {links.submit_form_url ? (
            <a
              className="btn btn--ghost ddir__submit"
              href={links.submit_form_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="file" size={16} />
              {labels.submitInfo}
              <Icon name="external" size={16} />
              <span className="sr-only"> {t.common.opensNewTab}</span>
            </a>
          ) : null}
        </header>

        <div className="sfilter ddir__filter">
          <div className="sfilter__search">
            <label htmlFor={searchId} className="sr-only">
              {labels.searchLabel}
            </label>
            <Icon name="search" size={18} />
            <input
              id={searchId}
              type="search"
              value={query}
              placeholder={labels.searchPlaceholder}
              onChange={(e) => update('q', e.target.value)}
            />
          </div>
          <div className="ddir__select">
            <label htmlFor={selectId} className="sr-only">
              {labels.districtLabel}
            </label>
            <Icon name="mapPin" size={18} />
            <select id={selectId} value={selected} onChange={(e) => chooseDistrict(e.target.value)}>
              <option value="">{labels.allDistricts}</option>
              {DISTRICTS.map((n) => (
                <option key={n} value={n}>
                  {district(n)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shown only for a district that has one. A district with no office
            recorded looks exactly as it did before this existed. */}
        {officeStatus === 'loading' ? (
          <p className="doffice doffice--loading" aria-busy="true">{t.media.loading}</p>
        ) : officeStatus === 'ready' ? (
          <DistrictOffice office={office} />
        ) : null}

        <p ref={listRef} className="spage__count" aria-live="polite">
          {countText(count)}
        </p>

        {pageGroups.length ? (
          <div className="ddir__groups">
            {pageGroups.map((g) => (
              <section key={g.name} className="ddir__group" aria-labelledby={`ddir-${g.name}`}>
                <header className="ddir__group-head">
                  <h2 id={`ddir-${g.name}`} className="ddir__district">
                    <Icon name="globe" size={18} />
                    {divisionText(division(g.name))}
                  </h2>
                  <p className="ddir__division">{countText(g.count)}</p>
                </header>
                {g.leads.length ? (
                  <ul className="ddir__lead">
                    {g.leads.map((c) => (
                      <ContactCard key={c.id} c={c} featured labels={labels} roleLabel={roleLabel} />
                    ))}
                  </ul>
                ) : null}
                {g.team.length ? (
                  <ul className="ddir__grid">
                    {g.team.map((c) => (
                      <ContactCard key={c.id} c={c} labels={labels} roleLabel={roleLabel} />
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
            {pageCount > 1 ? (
              <nav className="results__more" aria-label={labels.pagination}>
                <div className="results__progress" aria-hidden="true">
                  <span style={{ width: `${((current + 1) / pageCount) * 100}%` }} />
                </div>
                <span>{showingText(`${num(start + 1)}–${num(start + pageItems.length)}`, num(count))}</span>
                <Pager page={current} pageCount={pageCount} onChange={goToPage} />
              </nav>
            ) : null}
          </div>
        ) : districtContacts.length ? (
          <div className="sempty">
            <p>{labels.noResults}</p>
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/district-directory')}>
              {labels.clearFilters}
            </button>
          </div>
        ) : (
          <div className="sempty ddir__pending">
            <span className="ddir__pending-icon" aria-hidden="true">
              <Icon name="mapPin" size={22} />
            </span>
            <h2 className="ddir__pending-title">{labels.pendingTitle}</h2>
            <p>{labels.pendingDesc}</p>
            {links.official_url ? (
              <a className="btn btn--primary" href={links.official_url} target="_blank" rel="noopener noreferrer">
                {labels.official}
                <Icon name="external" size={16} />
                <span className="sr-only"> {t.common.opensNewTab}</span>
              </a>
            ) : null}
          </div>
        )}

        {labels.stateNote || links.state_phone ? (
          <p className="ddir__state">
            <Icon name="info" size={16} />
            <span>
              {labels.stateNote} {labels.stateRole}
              {links.state_phone ? (
                <>
                  {' — '}
                  <a href={`tel:${links.state_phone}`}>{num(links.state_phone)}</a>
                </>
              ) : null}
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
