import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import StoryCard from '../StoryCard';
import { featuredStories } from '../../data/yashogathaStories';
import { useLanguage } from '../../i18n/LanguageContext';
import { useYashogatha } from '../../data/useYashogatha';
import { pick } from '../../data/useHero';
import { fetchFeaturedStories } from '../../services/stories';

// Home-page preview of the success stories; the full set lives at /yashogatha.
//
// Both halves come from the CMS: the wording from the Yashogatha section
// settings, the stories from the records marked Featured. The bundled wording
// and the bundled three stories stand in while that loads and whenever the CMS
// cannot be reached, so an outage never empties the section.
export default function Yashogatha() {
  const { t, lang } = useLanguage();
  const y = t.yashogatha;
  const cms = useYashogatha();

  const [stories, setStories] = useState(featuredStories);

  // How many the strip shows is a section setting; the request asks for exactly
  // that many, so the count is decided in one place rather than by slicing here.
  const count = cms?.homepage?.featured_count ?? featuredStories.length;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchFeaturedStories(count, ctrl.signal)
      .then((items) => { if (items) setStories(items); })
      .catch(() => {
        // Keeps the bundled stories on screen; visitors see no error.
      });
    return () => ctrl.abort();
  }, [count]);

  // A null homepage block means an editor switched the strip off.
  if (cms && cms.homepage === null) return null;

  const badge = (cms && pick(cms.text, 'badge', lang)) || y.badge;
  const title = (cms && pick(cms.text, 'title', lang)) || y.title;
  const lead = (cms && pick(cms.text, 'lead', lang)) || y.lead;
  const viewAll = (cms && pick(cms.labels, 'view_all', lang)) || y.viewAll;
  const noStories = (cms && pick(cms.labels, 'no_stories', lang)) || y.noStories || '';
  const viewAllTarget = cms?.homepage?.view_all_target || '/yashogatha';
  const showDot = cms ? cms.text?.eyebrow_dot !== false : true;

  return (
    <section id="yashogatha" className="section yasho" aria-labelledby="yasho-title">
      <div className="yasho__glow" aria-hidden="true" />
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            <p className="eyebrow">
              {showDot ? <span className="eyebrow__dot" aria-hidden="true" /> : null}
              {badge}
            </p>
            <h2 id="yasho-title" className="section__title">
              {title}
            </h2>
          </div>
          <p className="section__lead">{lead}</p>
        </header>

        {stories.length === 0 ? (
          <div className="empty" role="status">
            <Icon name="info" size={28} />
            <p>{noStories}</p>
          </div>
        ) : (
          <div className="sgrid sgrid--home">
            {stories.map((story, i) => (
              <div key={story.slug} data-reveal style={{ '--d': i + 1 }}>
                <StoryCard story={story} />
              </div>
            ))}
          </div>
        )}

        <div className="yasho__all" data-reveal>
          <Link to={viewAllTarget} className="btn btn--primary">
            {viewAll}
            <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
