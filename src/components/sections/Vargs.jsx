import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import Mandala from '../Mandala';
import CountUp from '../CountUp';
import DivisionWheel, { toneColor } from '../DivisionWheel';
import { useLanguage } from '../../i18n/LanguageContext';
import { useVargsSourceNote } from '../../data/VargsProvider';
import { VARG_NAMES_EN, vargPlaceName } from '../../data/vargNamesEn';
import { vargPath } from '../../data/vargLinks';
import { DISTRICTS, DIVISION_OF_DISTRICT } from '../../data/districts';
import { translations } from '../../i18n/translations';

const PAGE = 8;
const LONG_TEXT = 90;

function Pass({ varg, tone, index, onEnroll }) {
  const { t, lang, district, division } = useLanguage();
  const v = t.vargs;
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
                aria-label={v.detailsFor(place ? `${district(varg.district)}: ${place}` : district(varg.district))}
              >
                {district(varg.district)}
              </Link>
            </h3>
            <p className="pass__division">{division(varg.vibhag) ? v.division(division(varg.vibhag)) : '—'}</p>
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
            {expanded ? v.readLess : v.readMore}
            <Icon name="chevronDown" size={14} />
          </button>
        ) : null}
      </div>

      <div className="pass__tear" aria-hidden="true" />

      <div className="pass__foot">
        <span className="pass__label">
          <span className="pass__dot" aria-hidden="true" />
          {v.passLabel}
        </span>
        <button
          type="button"
          className="btn btn--primary btn--sm pass__cta"
          onClick={() => onEnroll(varg)}
          aria-label={v.enrollFor(place || district(varg.district))}
        >
          {t.common.enrollNow}
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
  const [query, setQuery] = useState('');
  const [div, setDiv] = useState('');
  const [dist, setDist] = useState('');
  const [limit, setLimit] = useState(PAGE);

  // Divisions in first-seen order, with their listings' districts.
  const divisions = useMemo(() => {
    const map = new Map();
    vargs.forEach((x) => {
      if (!x.vibhag) return;
      if (!map.has(x.vibhag)) map.set(x.vibhag, []);
      map.get(x.vibhag).push(x.district);
    });
    return [...map.entries()].map(([name, districts], i) => ({ name, districts, count: districts.length, tone: i }));
  }, [vargs]);
  const toneOf = useMemo(() => Object.fromEntries(divisions.map((d) => [d.name, d.tone])), [divisions]);

  // District chips come from the official list of 36 (not from the listings,
  // which only cover districts that have a varg): all 36 in the official order,
  // or the selected division's districts. Each carries its number of vargs, 0
  // where none is listed yet. A listing whose district is not one of the 36
  // (e.g. "मुंबई", which does not say City or Suburban) gets no chip of its
  // own, so no district appears twice; it still shows under its division.
  const vargsPerDistrict = useMemo(() => {
    const counts = new Map();
    vargs.forEach((x) => counts.set(x.district, (counts.get(x.district) || 0) + 1));
    return counts;
  }, [vargs]);
  const districtChips = useMemo(
    () =>
      DISTRICTS.filter((n) => !div || DIVISION_OF_DISTRICT[n] === div).map((n) => [n, vargsPerDistrict.get(n) || 0]),
    [div, vargsPerDistrict],
  );

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

  const shown = filtered.slice(0, limit);
  const filterKey = `${div}|${dist}|${query.trim()}`;

  // Picking the selected division again (or the ring's centre) shows all divisions.
  const selectDivision = (name) => {
    setDiv((cur) => (cur === name ? '' : name));
    setDist('');
    setLimit(PAGE);
  };
  const pickDistrict = (name) => {
    setDist((cur) => (cur === name ? '' : name));
    setLimit(PAGE);
  };
  const clearAll = () => {
    setQuery('');
    setDiv('');
    setDist('');
    setLimit(PAGE);
  };

  const viewing = [div && v.division(division(div)), dist && district(dist)].filter(Boolean).join(' · ') || v.allDivisions;

  return (
    <section id="vargs" className="section vargs" aria-labelledby="vargs-title">
      <div className="vargs__glow" aria-hidden="true" />
      <Mandala className="vargs__mandala" points={20} />

      <div className="container">
        <header className="vargs__head" data-reveal>
          <div className="vargs__intro">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {v.badge}
            </p>
            <h2 id="vargs-title" className="section__title">
              {v.title}
            </h2>
            <p className="section__lead">{vargs.length ? v.desc(num(vargs.length)) : v.empty}</p>
          </div>
          {vargs.length ? (
            <dl className="vstats">
              {[
                { key: 'vargs', icon: 'building', label: v.statVargs, value: vargs.length },
                { key: 'districts', icon: 'mapPin', label: v.statDistricts, value: DISTRICTS.length },
                { key: 'divisions', icon: 'globe', label: v.statDivisions, value: divisions.length },
              ].map((s) => (
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
            <p>{v.empty}</p>
          </div>
        ) : (
          <div className="explorer">
            <aside className="atlas" data-reveal aria-labelledby="atlas-title">
              <div className="atlas__head">
                <h3 id="atlas-title" className="atlas__title">
                  <Icon name="globe" size={18} />
                  {v.atlasTitle}
                </h3>
                <p className="atlas__note">{v.atlasNote}</p>
              </div>

              <DivisionWheel divisions={divisions} total={vargs.length} selected={div} onSelect={selectDivision} />

              <div className="atlas__districts">
                <p className="atlas__sub">{div ? v.districtsIn(division(div)) : v.allDistrictsOf(num(DISTRICTS.length))}</p>
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
            </aside>

            <div className="results" data-reveal style={{ '--d': 1 }}>
              <div className="results__bar">
                <div className="vsearch">
                  <Icon name="search" size={18} className="vsearch__icon" />
                  <label htmlFor="varg-search" className="sr-only">
                    {v.searchLabel}
                  </label>
                  <input
                    id="varg-search"
                    type="search"
                    className="vsearch__input"
                    placeholder={v.searchPlaceholder}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setLimit(PAGE);
                    }}
                  />
                  {query ? (
                    <button type="button" className="vsearch__clear" onClick={() => setQuery('')} aria-label={v.clearSearch}>
                      <Icon name="close" size={16} />
                    </button>
                  ) : null}
                </div>
                <p className="results__status" role="status" aria-live="polite">
                  <span className="results__viewing">
                    {v.viewing}: <strong>{viewing}</strong>
                  </span>
                  <span className="results__count">{v.resultsCount(num(filtered.length))}</span>
                </p>
              </div>

              {filtered.length === 0 ? (
                <div className="results__empty">
                  <Mandala className="results__empty-art" points={12} />
                  <p>{dist && !vargsPerDistrict.get(dist) ? v.noneInDistrict(district(dist)) : v.noMatch}</p>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll}>
                    {v.clearFilters}
                  </button>
                </div>
              ) : (
                <ul key={filterKey} className="passes">
                  {shown.map((x, i) => (
                    <Pass key={x.id} varg={x} tone={toneOf[x.vibhag] ?? 0} index={i % PAGE} onEnroll={onEnroll} />
                  ))}
                </ul>
              )}

              {filtered.length > PAGE ? (
                <div className="results__more">
                  <div className="results__progress" aria-hidden="true">
                    <span style={{ width: `${(shown.length / filtered.length) * 100}%` }} />
                  </div>
                  <span>{v.showing(num(shown.length), num(filtered.length))}</span>
                  {shown.length < filtered.length ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLimit((l) => l + PAGE)}>
                      {t.common.showMore}
                      <Icon name="chevronDown" size={16} />
                    </button>
                  ) : (
                    <button type="button" className="btn btn--text btn--sm" onClick={() => setLimit(PAGE)}>
                      {t.common.showLess}
                    </button>
                  )}
                </div>
              ) : null}

              <p className="results__source" role="status">
                <Icon name="info" size={15} />
                {sourceNote}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
