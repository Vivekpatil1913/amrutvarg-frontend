import { useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import Mandala from '../Mandala';
import CountUp from '../CountUp';
import DivisionWheel, { toneColor } from '../DivisionWheel';
import Pager, { PAGE_SIZE } from '../Pager';
import { useLanguage } from '../../i18n/LanguageContext';
import { useVargsSourceNote } from '../../data/VargsProvider';
import { VARG_NAMES_EN, vargPlaceName } from '../../data/vargNamesEn';
import { vargPath } from '../../data/vargLinks';
import { DISTRICTS, DIVISION_OF_DISTRICT } from '../../data/districts';
import { useMaster } from '../../data/useMasters';
import { useVargsSection, fill } from '../../data/useVargsSection';
import { pick } from '../../data/useHero';
import { translations } from '../../i18n/translations';

const LONG_TEXT = 90;

function Pass({ varg, tone, index, onEnroll, copy }) {
  const { lang, district, division } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const textId = useId();
  const place = vargPlaceName(varg, lang);
  const long = place.length > LONG_TEXT;

  return (
    <li className="pass" style={{ '--tone-color': toneColor(tone), '--i': index }}>
      <div className="pass__top">
        <div className="pass__where">
          <span className="pass__pin">
            <Icon name="mapPin" size={18} />
          </span>
          <div>
            <h3 className="pass__district">
              {/* Stretched over the whole card: clicking anywhere opens this varg's details. */}
              <Link
                to={vargPath(varg)}
                state={{ fromList: true }}
                preventScrollReset
                className="pass__open"
                aria-label={copy.detailsFor(place ? `${district(varg.district)}: ${place}` : district(varg.district))}
              >
                {district(varg.district)}
              </Link>
            </h3>
            <p className="pass__division">{division(varg.vibhag) ? copy.division(division(varg.vibhag)) : '—'}</p>
          </div>
        </div>
      </div>

      <div className="pass__body">
        <p id={textId} className={`pass__place${long && !expanded ? ' is-clamped' : ''}`}>
          {place || '—'}
        </p>
        {long ? (
          <button
            type="button"
            className="pass__more"
            aria-expanded={expanded}
            aria-controls={textId}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? copy.readLess : copy.readMore}
            <Icon name="chevronDown" size={14} />
          </button>
        ) : null}
      </div>

      <div className="pass__tear" aria-hidden="true" />

      <div className="pass__foot">
        <span className="pass__label">
          <span className="pass__dot" aria-hidden="true" />
          {copy.passLabel}
        </span>
        <button
          type="button"
          className="btn btn--primary btn--sm pass__cta"
          onClick={() => onEnroll(varg)}
          aria-label={copy.enrollFor(place || district(varg.district))}
        >
          {copy.cta}
          <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </li>
  );
}

export default function Vargs({ vargs, onEnroll }) {
  const { t, num, lang, district, division } = useLanguage();
  const v = t.vargs;
  const sourceNote = useVargsSourceNote();
  // Published section settings. Null while loading and whenever the CMS cannot
  // be reached, which keeps the bundled wording on screen rather than blanking
  // the section.
  const cms = useVargsSection();
  const [query, setQuery] = useState('');
  const [div, setDiv] = useState('');
  const [dist, setDist] = useState('');
  const [page, setPage] = useState(0);
  const resultsRef = useRef(null);

  // Districts and the division each belongs to come from the masters; the
  // bundled list stands in while they load or if the API is unreachable.
  const districtRows = useMaster('districts');
  const vibhagRows = useMaster('vibhags');

  // Every piece of wording on this section, resolved once: the CMS value for
  // the language being shown, otherwise the bundled phrase. A block the CMS
  // reports as null has been switched off in the admin; with no CMS at all,
  // every block shows as it always did.
  const copy = useMemo(() => {
    const g = (group, base) => pick(cms?.[group], base, lang);
    return {
      badge: g('text', 'badge') || v.badge,
      title: g('text', 'title') || v.title,
      eyebrowDot: cms?.text?.eyebrow_dot !== false,
      lead: (n) => {
        const tpl = g('text', 'lead');
        return tpl ? fill(tpl, { count: n }) : v.desc(n);
      },
      empty: g('text', 'empty') || v.empty,

      statsOn: !cms || cms.stats !== null,
      statItems: cms?.stats?.items ?? null,

      atlasOn: !cms || cms.atlas !== null,
      atlasTitle: g('atlas', 'title') || v.atlasTitle,
      atlasNote: g('atlas', 'note') || v.atlasNote,
      allDivisions: g('atlas', 'all_divisions') || v.allDivisions,
      allDistrictsOf: (n) => {
        const tpl = g('atlas', 'all_districts');
        return tpl ? fill(tpl, { count: n }) : v.allDistrictsOf(n);
      },
      districtsIn: (name) => {
        const tpl = g('atlas', 'districts_in');
        return tpl ? fill(tpl, { name }) : v.districtsIn(name);
      },
      divisionOrder: cms?.atlas?.division_order ?? 'listing',
      districtOrder: cms?.atlas?.district_order ?? 'master',
      showChips: cms?.atlas?.show_district_chips !== false,

      searchOn: !cms || cms.search !== null,
      searchPlaceholder: g('search', 'placeholder') || v.searchPlaceholder,
      searchLabel: g('search', 'label') || v.searchLabel,
      viewing: g('search', 'viewing') || v.viewing,
      resultsCount: (n) => {
        const tpl = g('search', 'results_count');
        return tpl ? fill(tpl, { count: n }) : v.resultsCount(n);
      },
      noMatch: g('search', 'no_match') || v.noMatch,
      noneInDistrict: (name) => {
        const tpl = g('search', 'none_in_district');
        return tpl ? fill(tpl, { name }) : v.noneInDistrict(name);
      },
      clearFilters: g('search', 'clear_filters') || v.clearFilters,

      passLabel: g('card', 'pass_label') || v.passLabel,
      cta: g('card', 'cta') || t.common.enrollNow,
      division: (name) => {
        const tpl = g('card', 'division_suffix');
        return tpl ? fill(tpl, { name }) : v.division(name);
      },
      readMore: g('card', 'read_more') || v.readMore,
      readLess: g('card', 'read_less') || v.readLess,
      detailsFor: v.detailsFor,
      enrollFor: v.enrollFor,

      pageSize: cms?.list?.page_size || PAGE_SIZE,
      showSourceNote: cms?.list?.show_source_note !== false,
      // The official number of districts comes from the master, not from a list
      // compiled by hand, so adding one to the master moves this figure.
      districtTotal: cms?.counts?.districts_count ?? DISTRICTS.length,
    };
  }, [cms, lang, t, v]);

  const PAGE = copy.pageSize;

  // Divisions with their listings' districts. The order follows the section
  // setting: the Vibhag master, the busiest division first, or the order the
  // listings themselves arrive in.
  const divisions = useMemo(() => {
    const map = new Map();
    vargs.forEach((x) => {
      if (!x.vibhag) return;
      if (!map.has(x.vibhag)) map.set(x.vibhag, []);
      map.get(x.vibhag).push(x.district);
    });
    const entries = [...map.entries()];
    if (copy.divisionOrder === 'count') {
      entries.sort((a, b) => b[1].length - a[1].length);
    } else if (copy.divisionOrder === 'master' && vibhagRows.length) {
      const rank = new Map(vibhagRows.map((r, i) => [r.name_mr, i]));
      entries.sort((a, b) => (rank.get(a[0]) ?? 1e9) - (rank.get(b[0]) ?? 1e9));
    }
    return entries.map(([name, districts], i) => ({ name, districts, count: districts.length, tone: i }));
  }, [vargs, copy.divisionOrder, vibhagRows]);
  const toneOf = useMemo(() => Object.fromEntries(divisions.map((d) => [d.name, d.tone])), [divisions]);

  // District chips come from the official master list (not from the listings,
  // which only cover districts that have a varg): all of them in the master's
  // order, or the selected division's districts. Each carries its number of
  // vargs, 0 where none is listed yet. A listing whose district is not in the
  // master (e.g. "मुंबई", which does not say City or Suburban) gets no chip of
  // its own, so no district appears twice; it still shows under its division.
  const vargsPerDistrict = useMemo(() => {
    const counts = new Map();
    vargs.forEach((x) => counts.set(x.district, (counts.get(x.district) || 0) + 1));
    return counts;
  }, [vargs]);
  const districtChips = useMemo(() => {
    let rows;
    if (!districtRows.length) {
      rows = DISTRICTS.filter((n) => !div || DIVISION_OF_DISTRICT[n] === div)
        .map((n) => [n, vargsPerDistrict.get(n) || 0]);
    } else {
      const vibhagOf = new Map(vibhagRows.map((g) => [g.id, g.name_mr]));
      rows = districtRows
        .filter((r) => !div || vibhagOf.get(r.vibhag_id) === div)
        .map((r) => [r.name_mr, vargsPerDistrict.get(r.name_mr) || 0]);
    }
    if (copy.districtOrder === 'count') rows = [...rows].sort((a, b) => b[1] - a[1]);
    return rows;
  }, [div, vargsPerDistrict, districtRows, vibhagRows, copy.districtOrder]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vargs.filter(
      (x) =>
        (!div || x.vibhag === div) &&
        (!dist || x.district === dist) &&
        (!q ||
          // Match Marathi and English place names whichever language is shown.
          [
            x.vargName,
            x.schoolName,
            VARG_NAMES_EN[x.id],
            x.district,
            x.taluka,
            x.vibhag,
            x.coordinatorName,
            translations.en.districts[x.district],
            translations.en.divisions[x.vibhag],
          ].some(
            (f) => (f || '').toLowerCase().includes(q),
          )),
    );
  }, [vargs, query, div, dist]);

  // Exactly one page of cards at a time. The page is clamped so a shorter
  // list (new filter, or a refreshed listing) never leaves an empty page.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pageCount - 1);
  const start = current * PAGE;
  const shown = filtered.slice(start, start + PAGE);
  const filterKey = `${div}|${dist}|${query.trim()}|${current}`;

  const goToPage = (next) => {
    setPage(next);
    // Bring the top of the results back into view if it has scrolled away.
    const top = resultsRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Picking the selected division again (or the ring's centre) shows all divisions.
  const selectDivision = (name) => {
    setDiv((cur) => (cur === name ? '' : name));
    setDist('');
    setPage(0);
  };
  const pickDistrict = (name) => {
    setDist((cur) => (cur === name ? '' : name));
    setPage(0);
  };
  const clearAll = () => {
    setQuery('');
    setDiv('');
    setDist('');
    setPage(0);
  };

  const viewing =
    [div && copy.division(division(div)), dist && district(dist)].filter(Boolean).join(' · ') || copy.allDivisions;

  // The statistics strip. Each figure is counted by the CMS — active vargs,
  // districts and vibhags in the masters — so it cannot drift from the data;
  // without the CMS the page counts what it has.
  const stats = copy.statItems
    ? copy.statItems.map((s) => ({ key: s.key, icon: s.icon, label: pick(s, 'label', lang), value: s.value }))
    : [
        { key: 'vargs', icon: 'building', label: v.statVargs, value: vargs.length },
        { key: 'districts', icon: 'mapPin', label: v.statDistricts, value: copy.districtTotal },
        { key: 'divisions', icon: 'globe', label: v.statDivisions, value: divisions.length },
      ];

  return (
    <section id="vargs" className="section vargs" aria-labelledby="vargs-title">
      <div className="vargs__glow" aria-hidden="true" />
      <Mandala className="vargs__mandala" points={20} />

      <div className="container">
        <header className="vargs__head" data-reveal>
          <div className="vargs__intro">
            <p className="eyebrow">
              {copy.eyebrowDot ? <span className="eyebrow__dot" aria-hidden="true" /> : null}
              {copy.badge}
            </p>
            <h2 id="vargs-title" className="section__title">
              {copy.title}
            </h2>
            <p className="section__lead">{vargs.length ? copy.lead(num(vargs.length)) : copy.empty}</p>
          </div>
          {vargs.length && copy.statsOn ? (
            <dl className="vstats">
              {stats.map((s) => (
                <div key={s.key} className="vstats__item">
                  <dd className="vstats__value">
                    <CountUp value={s.value} />
                  </dd>
                  <dt className="vstats__label">
                    <Icon name={s.icon} size={15} />
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          ) : null}
        </header>

        {vargs.length === 0 ? (
          <div className="empty" role="status">
            <Icon name="info" size={28} />
            <p>{copy.empty}</p>
          </div>
        ) : (
          <div className={`explorer${copy.atlasOn ? '' : ' explorer--wide'}`}>
            {copy.atlasOn ? (
              <aside className="atlas" data-reveal aria-labelledby="atlas-title">
                <div className="atlas__head">
                  <h3 id="atlas-title" className="atlas__title">
                    <Icon name="globe" size={18} />
                    {copy.atlasTitle}
                  </h3>
                  <p className="atlas__note">{copy.atlasNote}</p>
                </div>

                <DivisionWheel
                  divisions={divisions}
                  total={vargs.length}
                  selected={div}
                  onSelect={selectDivision}
                  allLabel={copy.allDivisions}
                />

                {copy.showChips ? (
                  <div className="atlas__districts">
                    <p className="atlas__sub">
                      {div ? copy.districtsIn(division(div)) : copy.allDistrictsOf(num(copy.districtTotal))}
                    </p>
                    <div className="atlas__chips" role="group" aria-label={v.filterDistrict}>
                      {districtChips.map(([name, count]) => (
                        <button
                          key={name}
                          type="button"
                          className="atlas__chip"
                          aria-pressed={dist === name}
                          onClick={() => pickDistrict(name)}
                        >
                          {district(name)}
                          {count > 1 ? <span className="atlas__chip-count">{num(count)}</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </aside>
            ) : null}

            <div ref={resultsRef} className="results" data-reveal style={{ '--d': 1 }}>
              {copy.searchOn ? (
                <div className="results__bar">
                  <div className="vsearch">
                    <Icon name="search" size={18} className="vsearch__icon" />
                    <label htmlFor="varg-search" className="sr-only">
                      {copy.searchLabel}
                    </label>
                    <input
                      id="varg-search"
                      type="search"
                      className="vsearch__input"
                      placeholder={copy.searchPlaceholder}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(0);
                      }}
                    />
                    {query ? (
                      <button type="button" className="vsearch__clear" onClick={() => {
                          setQuery('');
                          setPage(0);
                        }}
                        aria-label={v.clearSearch}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    ) : null}
                  </div>
                  <p className="results__status" role="status" aria-live="polite">
                    <span className="results__viewing">
                      {copy.viewing}: <strong>{viewing}</strong>
                    </span>
                    <span className="results__count">{copy.resultsCount(num(filtered.length))}</span>
                  </p>
                </div>
              ) : null}

              {filtered.length === 0 ? (
                <div className="results__empty">
                  <Mandala className="results__empty-art" points={12} />
                  <p>{dist && !vargsPerDistrict.get(dist) ? copy.noneInDistrict(district(dist)) : copy.noMatch}</p>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll}>
                    {copy.clearFilters}
                  </button>
                </div>
              ) : (
                <ul key={filterKey} className="passes">
                  {shown.map((x, i) => (
                    <Pass key={x.id} varg={x} tone={toneOf[x.vibhag] ?? 0} index={i} onEnroll={onEnroll} copy={copy} />
                  ))}
                </ul>
              )}

              {pageCount > 1 ? (
                <nav className="results__more" aria-label={v.pagination}>
                  <div className="results__progress" aria-hidden="true">
                    <span style={{ width: `${((current + 1) / pageCount) * 100}%` }} />
                  </div>
                  <span>{v.showing(`${num(start + 1)}–${num(start + shown.length)}`, num(filtered.length))}</span>
                  <Pager page={current} pageCount={pageCount} onChange={goToPage} />
                </nav>
              ) : null}

              {copy.showSourceNote ? (
                <p className="results__source" role="status">
                  <Icon name="info" size={15} />
                  {sourceNote}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
