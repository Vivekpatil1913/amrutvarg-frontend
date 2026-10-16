import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Mandala from '../components/Mandala';
import Pager from '../components/Pager';
import StoryCard from '../components/StoryCard';
import { fetchStoryPage, STORIES_PAGE_SIZE } from '../services/stories';
import { useLanguage } from '../i18n/LanguageContext';
import { useYashogatha } from '../data/useYashogatha';
import { pick } from '../data/useHero';
import YashogathaVideos from '../components/sections/YashogathaVideos';

// All published success stories, paged on the server: each page of 8 cards is
// requested from GET /api/stories. The page lives in the URL (?p=…) so Back
// and shared links restore it.
export default function YashogathaPage() {
  const { t, lang, num } = useLanguage();
  const y = t.yashogatha;
  // Wording comes from the CMS when it is reachable, the bundle otherwise.
  const cms = useYashogatha();
  const badge = cms ? pick(cms.text, 'badge', lang) : y.badge;
  const heading = cms ? pick(cms.text, 'title', lang) : y.title;
  const lead = cms ? pick(cms.text, 'lead', lang) : y.lead;
  const noStories = cms ? pick(cms.labels, 'no_stories', lang) : y.noStories;
  const showDot = cms ? cms.text.eyebrow_dot !== false : true;
  const [params, setParams] = useSearchParams();
  const gridTop = useRef(null);
  const page = Math.max(1, Number.parseInt(params.get('p'), 10) || 1);

  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Identifies the page the URL asks for; each result is tagged with the
  // request it answers, so a previous page's result is never mistaken for it.
  const requestKey = `${page}|${lang}`;

  // A newer request (paging, Back/Forward) cancels the one in flight.
  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('loading');
    fetchStoryPage({ page, pageSize: STORIES_PAGE_SIZE, lang }, ctrl.signal)
      .then((res) => {
        setResult({ ...res, requestKey });
        setStatus('ready');
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus('error');
      });
    return () => ctrl.abort();
  }, [requestKey, page, lang, attempt]);

  // A page past the end (e.g. ?p=9 when there are 5 pages) is corrected to the
  // last page — only once the answer for this very URL has arrived.
  useEffect(() => {
    if (!result || result.requestKey !== requestKey || result.page === page) return;
    const next = new URLSearchParams(params);
    if (result.page > 1) next.set('p', String(result.page));
    else next.delete('p');
    setParams(next, { replace: true });
  }, [result, requestKey, page, params, setParams]);

  const goToPage = (p) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set('p', String(p));
    else next.delete('p');
    setParams(next);
    gridTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // The story page's "back to all stories" returns to this page.
  const listSearch = page > 1 ? `?p=${page}` : '';

  const items = result?.items || [];
  const total = result?.total || 0;
  // Pagination appears only when the API's total exceeds one page (8 cards),
  // so it follows every change in the number of published stories.
  const showPager = Boolean(result) && total > result.pageSize;
  const from = total ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = from ? from + items.length - 1 : 0;

  return (
    <section className="spage" aria-labelledby="spage-title">
      <Mandala className="spage__mandala" points={20} />
      <div className="container">
        <nav className="crumbs" aria-label={y.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{heading}</span>
        </nav>

        <header className="spage__head">
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            {badge}
          </p>
          <h1 id="spage-title" className="section__title">
            {heading}
          </h1>
          <p className="section__lead">{lead}</p>
        </header>

        <p className="spage__count" aria-live="polite" ref={gridTop}>
          {result ? (showPager ? y.range(num(from), num(to), num(total)) : y.count(num(total))) : null}
        </p>

        {status === 'error' ? (
          <div className="sempty" role="alert">
            <p>{y.loadError}</p>
            <button type="button" className="btn btn--ghost" onClick={() => setAttempt((n) => n + 1)}>
              {t.common.retry}
            </button>
          </div>
        ) : !result ? (
          <p className="spage__loading" role="status">
            {t.common.loading}
          </p>
        ) : items.length ? (
          <>
            <div
              className={`sgrid${status === 'loading' ? ' is-loading' : ''}`}
              aria-busy={status === 'loading'}
              key={`${lang}|${result.page}`}
            >
              {items.map((story, i) => (
                <StoryCard
                  key={story.slug}
                  story={story}
                  className="scard--in"
                  style={{ '--i': Math.min(i, 8) }}
                  linkState={{ list: listSearch }}
                />
              ))}
            </div>
            {showPager ? (
              <nav className="spage__pager" aria-label={y.pagesLabel}>
                <Pager page={result.page - 1} pageCount={result.totalPages} onChange={(p) => goToPage(p + 1)} />
              </nav>
            ) : null}
          </>
        ) : (
          <div className="sempty">
            <p>{noStories}</p>
          </div>
        )}

        {/* Video success stories, from the same CMS records the Videos &
            Reels screen manages. Renders nothing when none are published. */}
        <YashogathaVideos />
      </div>
    </section>
  );
}
