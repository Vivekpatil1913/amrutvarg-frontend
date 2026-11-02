import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import MelawaAnnouncementCard from '../components/MelawaAnnouncementCard';
import ActivityReportForm from '../components/forms/ActivityReportForm';
import { useLanguage } from '../i18n/LanguageContext';
import { useMaster } from '../data/useMasters';
import { mediaSrc } from '../services/mediaUrl';
import { fetchActivities, cmsApiBase, FREQUENCIES } from '../services/vargActivities';

// The 'Amrut Varg' tab: the activity recording form and the digital
// repository of everything recorded, with the Melawa announcement cards on
// top. A page of its own (VARG_PORTAL_PATH) so the header can link to it and
// it can be bookmarked.
export const VARG_PORTAL_PATH = '/amrut-varg';

// ── Digital repository ──────────────────────────────────────────────────────

const PAGE_SIZE = 9;

function Pramukh({ name, label }) {
  return (
    <p className="avp-pramukh">
      <span className="avp-pramukh__role">{label}:</span> <span className="avp-pramukh__name">{name}</span>
    </p>
  );
}

function Repository({ refreshKey }) {
  const { t, lang, num } = useLanguage();
  const p = t.vargPortal;
  const [divisionId, setDivisionId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [frequency, setFrequency] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', rows: [], summary: null, meta: null });

  const divisions = useMaster('vibhags');
  const districts = useMaster('districts', 'vibhag_id', divisionId ? Number(divisionId) : null);
  const label = (row) => (lang === 'en' && row.name_en ? row.name_en : row.name_mr);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, status: 'loading' }));
    fetchActivities(
      { division_id: divisionId, district_id: districtId, frequency, search: debounced, page, pageSize: PAGE_SIZE },
      ctrl.signal,
    )
      .then((res) => setState({ status: 'ready', rows: res.data || [], summary: res.summary, meta: res.meta }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', rows: [], summary: null, meta: null });
      });
    return () => ctrl.abort();
  }, [divisionId, districtId, frequency, debounced, page, refreshKey]);

  const pick = (row, field) => (lang === 'en' && row[`${field}_en`]) || row[`${field}_mr`];
  const totalPages = state.meta?.totalPages || 1;

  return (
    <section id="avp-repo" className="avp__repo" aria-labelledby="avp-repo-title">
      <header className="avp__repo-head">
        <h2 id="avp-repo-title" className="avp__repo-title">{p.repoTitle}</h2>
        <p className="section__lead">{p.repoDesc}</p>
      </header>

      <div className="avp__filters">
        <input
          className="input"
          type="search"
          value={search}
          placeholder={p.search}
          aria-label={p.search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input" aria-label={p.division} value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setDistrictId(''); setPage(1); }}>
          <option value="">{p.allDivisions}</option>
          {divisions.map((row) => <option key={row.id} value={row.id}>{label(row)}</option>)}
        </select>
        <select className="input" aria-label={p.district} value={districtId} disabled={!divisionId} onChange={(e) => { setDistrictId(e.target.value); setPage(1); }}>
          <option value="">{p.allDistricts}</option>
          {districts.map((row) => <option key={row.id} value={row.id}>{label(row)}</option>)}
        </select>
        <select className="input" aria-label={p.frequency} value={frequency} onChange={(e) => { setFrequency(e.target.value); setPage(1); }}>
          <option value="">{p.allFrequencies}</option>
          {FREQUENCIES.map((f) => <option key={f} value={f}>{p.frequencies[f]}</option>)}
        </select>
      </div>

      {state.summary ? (
        <dl className="avp__summary">
          <div><dt>{p.summary.records}</dt><dd>{num(state.summary.records)}</dd></div>
          <div><dt>{p.summary.participants}</dt><dd>{num(state.summary.participants)}</dd></div>
          <div><dt>{p.summary.districts}</dt><dd>{num(state.summary.districts)}</dd></div>
        </dl>
      ) : null}

      {state.status === 'loading' && !state.rows.length ? (
        <p className="avp__note" role="status">{p.loading}</p>
      ) : state.status === 'error' ? (
        <p className="avp__note" role="alert">{p.loadError}</p>
      ) : !state.rows.length ? (
        <p className="avp__note">{p.empty}</p>
      ) : (
        <ul className="avp__grid" aria-busy={state.status === 'loading' || undefined}>
          {state.rows.map((row) => {
            const photos = Array.isArray(row.photos) ? row.photos : [];
            const cover = mediaSrc(cmsApiBase, photos[0]?.url);
            return (
              <li key={row.id} className="avp-card">
                <div className="avp-card__media">
                  {cover ? <img src={cover} alt={row.institution_name} loading="lazy" /> : null}
                  <span className="avp-card__freq">{p.frequencies[row.frequency] || row.frequency}</span>
                  {photos.length > 1 ? (
                    <span className="avp-card__count"><Icon name="camera" size={13} />{num(photos.length)}</span>
                  ) : null}
                </div>
                <div className="avp-card__body">
                  <h3 className="avp-card__title">{row.institution_name}</h3>
                  <p className="avp-card__place">
                    <Icon name="mapPin" size={14} />
                    {[row.taluka, pick(row, 'district'), pick(row, 'division')].filter(Boolean).join(', ')}
                  </p>
                  <div className="avp-card__stats">
                    <span className="avp-card__students"><Icon name="users" size={15} />{p.students(num(row.participant_count))}</span>
                    <Pramukh name={row.incharge_name} label={p.pramukh} />
                  </div>
                  {row.description ? <p className="avp-card__desc">{row.description}</p> : null}
                  {photos.length > 1 ? (
                    <div className="avp-card__thumbs">
                      {photos.slice(1, 5).map((ph) => {
                        const src = mediaSrc(cmsApiBase, ph.url);
                        return src ? (
                          <a key={ph.url} href={src} target="_blank" rel="noopener noreferrer">
                            <img src={src} alt="" loading="lazy" />
                          </a>
                        ) : null;
                      })}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="avp__pager" aria-label={p.repoTitle}>
          <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>{p.prev}</button>
          <span>{p.pageOf(num(page), num(totalPages))}</span>
          <button type="button" className="btn btn--ghost btn--sm" disabled={page >= totalPages} onClick={() => setPage((n) => n + 1)}>{p.next}</button>
        </nav>
      ) : null}
    </section>
  );
}

export default function AmrutVargPage() {
  const { t } = useLanguage();
  const p = t.vargPortal;
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="spage avp" aria-labelledby="avp-title">
      <Mandala className="spage__mandala" points={20} />
      <div className="container">
        <nav className="crumbs" aria-label={t.announcements.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{p.nav}</span>
        </nav>

        <header className="spage__head">
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            {p.eyebrow}
          </p>
          <h1 id="avp-title" className="section__title">{p.title}</h1>
          <p className="section__lead">{p.desc}</p>
        </header>

        <MelawaAnnouncementCard />

        <div className="avp__panel">
          <ActivityReportForm onRecorded={() => setRefreshKey((k) => k + 1)} />
        </div>

        <Repository refreshKey={refreshKey} />
      </div>
    </section>
  );
}
