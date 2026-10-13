import { Link } from 'react-router-dom';
import Icon from '../Icon';
import StoryCard from '../StoryCard';
import { featuredStories } from '../../data/yashogathaStories';
import { useLanguage } from '../../i18n/LanguageContext';

// Home-page preview of the success stories; the full set lives at /yashogatha.
export default function Yashogatha() {
  const { t } = useLanguage();
  const y = t.yashogatha;

  return (
    <section id="yashogatha" className="section yasho" aria-labelledby="yasho-title">
      <div className="yasho__glow" aria-hidden="true" />
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {y.badge}
            </p>
            <h2 id="yasho-title" className="section__title">
              {y.title}
            </h2>
          </div>
          <p className="section__lead">{y.lead}</p>
        </header>

        <div className="sgrid sgrid--home">
          {featuredStories.map((story, i) => (
            <div key={story.slug} data-reveal style={{ '--d': i + 1 }}>
              <StoryCard story={story} />
            </div>
          ))}
        </div>

        <div className="yasho__all" data-reveal>
          <Link to="/yashogatha" className="btn btn--primary">
            {y.viewAll}
            <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
