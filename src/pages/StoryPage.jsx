import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import ShareButton from '../components/ShareButton';
import Mandala from '../components/Mandala';
import StoryCover from '../components/StoryCover';
import { STORY_CATEGORIES, getStory } from '../data/yashogathaStories';
import { listedStories } from '../data/storyPaging';
import { useLanguage } from '../i18n/LanguageContext';
import { useYashogatha } from '../data/useYashogatha';
import { pick } from '../data/useHero';
import { fetchStory } from '../services/stories';

// One success story, looked up by its slug. Every story uses this page.
export default function StoryPage() {
  const { slug } = useParams();
  const { t, lang } = useLanguage();
  const y = t.yashogatha;
  // Wording comes from the CMS when it is reachable, the bundle otherwise.
  const cms = useYashogatha();
  const listLabel = cms ? pick(cms.text, 'title', lang) : y.title;
  const sampleTag = cms ? pick(cms.labels, 'sample_tag', lang) : y.sampleTag;
  // A null note means an editor switched the disclaimer off.
  const detailNote = cms ? (cms.detail_note ? pick(cms.detail_note, 'text', lang) : '') : y.detailNote;
  // Start with the bundled story so the page renders at once, then replace it
  // with the CMS record, which is what an editor actually manages. A story
  // created only in the admin has no bundled version and arrives with the fetch.
  const [story, setStory] = useState(() => getStory(slug));

  const { state } = useLocation();
  const listUrl = `/yashogatha${typeof state?.list === 'string' && state.list.startsWith('?') ? state.list : ''}`;

  useEffect(() => {
    window.scrollTo(0, 0);
    // Back to the bundled story first, so navigating between stories never
    // shows the previous one's body while the next is still loading.
    setStory(getStory(slug));
    const ctrl = new AbortController();
    fetchStory(slug, ctrl.signal)
      .then((data) => { if (data) setStory(data); })
      .catch(() => {});
    return () => ctrl.abort();
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
  // Matched by slug, not by identity: a story loaded from the CMS is a
  // different object from the bundled one with the same slug.
  const index = listedStories.findIndex((s) => s.slug === story.slug);
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
          <Link to={listUrl}>{listLabel}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{text.title}</span>
        </nav>

        <header className="sstory__head">
          <p className="sstory__meta">
            <span className="scard__cat">
              <Icon name={cat.icon} size={15} />
              {y.categories[story.category]}
            </span>
            <span className="sstory__tag">{sampleTag}</span>
          </p>
          <h1 id="sstory-title" className="sstory__title">
            {text.title}
          </h1>
          <p className="sstory__lead">{text.short}</p>
        </header>

        <StoryCover story={story} className="sstory__banner" eager />

        {/* Empty when an editor switched the disclaimer off. */}
        {detailNote ? (
          <p className="snote snote--sm">
            <Icon name="info" size={17} />
            {detailNote}
          </p>
        ) : null}

        {/* A part an editor has not written yet is left out altogether, rather
            than printing its heading above nothing. */}
        <article className="sstory__body">
          {text.intro ? (
            <>
              <h2>{s.intro}</h2>
              <p>{text.intro}</p>
            </>
          ) : null}

          {text.challenge ? (
            <>
              <h2>{s.challenge}</h2>
              <p>{text.challenge}</p>
            </>
          ) : null}

          {text.journey.length ? (
            <>
              <h2>{s.journey}</h2>
              {text.journey.map((para, i) => (
                <p key={`j-${i}`}>{para}</p>
              ))}
            </>
          ) : null}

          {text.change.length ? (
            <>
              <h2>{s.change}</h2>
              {text.change.map((para, i) => (
                <p key={`c-${i}`}>{para}</p>
              ))}
            </>
          ) : null}

          {text.lessons.length ? (
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
          ) : null}

          {text.conclusion ? (
            <>
              <h2>{s.conclusion}</h2>
              <p>{text.conclusion}</p>
            </>
          ) : null}
        </article>

        {/* The end of the story is where a reader decides to pass it on, so
            the share row sits here rather than behind an icon at the top. */}
        <div className="sstory__share">
          <p className="sstory__share-label">{t.share.lead}</p>
          <ShareButton variant="inline" path={`/yashogatha/${story.slug}`} title={text.title} />
        </div>

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
