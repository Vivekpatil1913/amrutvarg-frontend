import { Link } from 'react-router-dom';
import Icon from './Icon';
import StoryCover from './StoryCover';
import { STORY_CATEGORIES } from '../data/yashogathaStories';
import { useLanguage } from '../i18n/LanguageContext';

// One success-story card, shared by the home preview and the listing page.
// Deliberately unnumbered: stories are told apart by cover, theme and title.
export default function StoryCard({ story, className = '', style }) {
  const { t, lang } = useLanguage();
  const y = t.yashogatha;
  const text = story[lang];
  const cat = STORY_CATEGORIES[story.category];

  return (
    <article className={`scard ${className}`} style={style}>
      <StoryCover story={story} className="scard__cover" />
      <div className="scard__body">
        <h3 className="scard__title">{text.title}</h3>
        <p className="scard__desc">{text.short}</p>
        <div className="scard__foot">
          <span className="scard__cat">
            <Icon name={cat?.icon || 'sparkle'} size={15} />
            {y.categories[story.category]}
          </span>
          <Link to={`/yashogatha/${story.slug}`} className="scard__more" aria-label={y.readMoreAbout(text.title)}>
            {y.readMore}
            <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
