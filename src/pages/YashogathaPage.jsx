import { useEffect, useId, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import StoryCard from '../components/StoryCard';
import { STORY_CATEGORIES, stories } from '../data/yashogathaStories';
import { useLanguage } from '../i18n/LanguageContext';

// Lower-cased, so search ignores case in English; Devanagari is unaffected.
const norm = (s) => s.toLocaleLowerCase();

// All success stories, filterable by theme and searchable in the current
// language. Filters live in the URL (?c=…&q=…) so Back restores them.
export default function YashogathaPage() {
  const { t, lang } = useLanguage();
  const y = t.yashogatha;
  const [params, setParams] = useSearchParams();
  const searchId = useId();
  const category = STORY_CATEGORIES[params.get('c')] ? params.get('c') : '';
  const query = params.get('q') || '';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    const q = norm(query.trim());
    return stories.filter((s) => {
      if (category && s.category !== category) return false;
      if (!q) return true;
      const text = s[lang];
      return [text.title, text.short, y.categories[s.category]].some((v) => norm(v).includes(q));
    });
  }, [category, query, lang, y]);

  return (
    <section className="spage" aria-labelledby="spage-title">
      <Mandala className="spage__mandala" points={20} />
      <div className="container">
        <nav className="crumbs" aria-label={y.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{y.title}</span>
        </nav>

        <header className="spage__head">
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            {y.badge}
          </p>
          <h1 id="spage-title" className="section__title">
            {y.title}
          </h1>
          <p className="section__lead">{y.lead}</p>
        </header>

        <div className="sfilter">
          <div className="sfilter__search">
            <label htmlFor={searchId} className="sr-only">
              {y.searchLabel}
            </label>
            <Icon name="search" size={18} />
            <input
              id={searchId}
              type="search"
              value={query}
              placeholder={y.searchPlaceholder}
              onChange={(e) => update('q', e.target.value)}
            />
          </div>
          <div className="sfilter__chips" role="group" aria-label={y.categoryLabel}>
            {['', ...Object.keys(STORY_CATEGORIES)].map((key) => (
              <button
                key={key || 'all'}
                type="button"
                className="schip"
                aria-pressed={category === key}
                onClick={() => update('c', key)}
              >
                {key ? <Icon name={STORY_CATEGORIES[key].icon} size={14} /> : null}
                {key ? y.categories[key] : y.allCategories}
              </button>
            ))}
          </div>
        </div>

        <p className="spage__count" aria-live="polite">
          {y.count(list.length)}
        </p>

        {list.length ? (
          <div className="sgrid" key={`${category}|${query}|${lang}`}>
            {list.map((story, i) => (
              <StoryCard key={story.slug} story={story} className="scard--in" style={{ '--i': Math.min(i, 8) }} />
            ))}
          </div>
        ) : (
          <div className="sempty">
            <p>{y.noResults}</p>
            <button type="button" className="btn btn--ghost" onClick={() => setParams({}, { replace: true })}>
              {y.clearFilters}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
