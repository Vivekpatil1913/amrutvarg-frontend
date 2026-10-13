import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import StoryCover from '../components/StoryCover';
import { STORY_CATEGORIES, getStory } from '../data/yashogathaStories';
import { listedStories } from '../data/storyPaging';
import { useLanguage } from '../i18n/LanguageContext';

// One success story, looked up by its slug. Every story uses this page.
export default function StoryPage() {
  const { slug } = useParams();
  const { t, lang } = useLanguage();
  const y = t.yashogatha;
  const story = getStory(slug);
  // Opened from the listing, "back" returns to the same page and filters
  // (passed as ?c=…&q=…&p=…); otherwise it opens the listing's first page.
  const { state } = useLocation();
  const listUrl = `/yashogatha${typeof state?.list === 'string' && state.list.startsWith('?') ? state.list : ''}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!story) {
    return (
      <section className="spage">
        <Mandala className="spage__mandala" points={20} />
        <div className="container sstory sstory--missing">
          <span className="sstory__missing-icon" aria-hidden="true">
            <Icon name="search" size={26} />
          </span>
          <h1 className="section__title">{y.notFoundTitle}</h1>
          <p className="section__lead">{y.notFoundDesc}</p>
          <Link to={listUrl} className="btn btn--primary">
            <Icon name="arrowLeft" size={17} />
            {y.back}
          </Link>
        </div>
      </section>
    );
  }

  const text = story[lang];
  const cat = STORY_CATEGORIES[story.category];
  // Previous / next move between the stories published in the listing only.
  const index = listedStories.indexOf(story);
  const prev = index > 0 ? listedStories[index - 1] : null;
  const next = index >= 0 ? listedStories[index + 1] : null;
  const s = y.sections;

  return (
    <section className="spage" aria-labelledby="sstory-title">
      <Mandala className="spage__mandala" points={20} />
      <div className="container sstory" key={slug}>
        <nav className="crumbs" aria-label={y.breadcrumb}>
          <Link to="/">{t.nav.home}</Link>
          <span aria-hidden="true">/</span>
          <Link to={listUrl}>{y.title}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{text.title}</span>
        </nav>

        <header className="sstory__head">
          <p className="sstory__meta">
            <span className="scard__cat">
              <Icon name={cat.icon} size={15} />
              {y.categories[story.category]}
            </span>
            <span className="sstory__tag">{y.sampleTag}</span>
          </p>
          <h1 id="sstory-title" className="sstory__title">
            {text.title}
          </h1>
          <p className="sstory__lead">{text.short}</p>
        </header>

        <StoryCover story={story} className="sstory__banner" eager />

        <p className="snote snote--sm">
          <Icon name="info" size={17} />
          {y.detailNote}
        </p>

        <article className="sstory__body">
          <h2>{s.intro}</h2>
          <p>{text.intro}</p>

          <h2>{s.challenge}</h2>
          <p>{text.challenge}</p>

          <h2>{s.journey}</h2>
          {text.journey.map((para, i) => (
            <p key={`j-${i}`}>{para}</p>
          ))}

          <h2>{s.change}</h2>
          {text.change.map((para, i) => (
            <p key={`c-${i}`}>{para}</p>
          ))}

          <div className="sstory__lessons">
            <h2>{s.lessons}</h2>
            <ul>
              {text.lessons.map((item, i) => (
                <li key={`l-${i}`}>
                  <Icon name="checkCircle" size={18} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <h2>{s.conclusion}</h2>
          <p>{text.conclusion}</p>
        </article>

        <nav className="sstory__nav" aria-label={y.storyNav}>
          {prev ? (
            <Link to={`/yashogatha/${prev.slug}`} state={state} className="sstory__step">
              <span className="sstory__step-label">
                <Icon name="arrowLeft" size={15} />
                {y.prev}
              </span>
              <span className="sstory__step-title">{prev[lang].title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/yashogatha/${next.slug}`} state={state} className="sstory__step sstory__step--next">
              <span className="sstory__step-label">
                {y.next}
                <Icon name="arrowRight" size={15} />
              </span>
              <span className="sstory__step-title">{next[lang].title}</span>
            </Link>
          ) : null}
        </nav>

        <div className="sstory__back">
          <Link to={listUrl} className="btn btn--primary">
            <Icon name="arrowLeft" size={17} />
            {y.back}
          </Link>
        </div>
      </div>
    </section>
  );
}
