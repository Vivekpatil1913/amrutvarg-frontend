import { Link } from 'react-router-dom';
import Icon from './Icon';
import StoryCover from './StoryCover';
import { STORY_CATEGORIES } from '../data/yashogathaStories';
import { useLanguage } from '../i18n/LanguageContext';
import ShareButton from './ShareButton';

// One success-story card, shared by the home preview and the listing page.
// Deliberately unnumbered: stories are told apart by cover, theme and title.
// `linkState` travels with the "read more" link (the listing passes its own
// page and filters, so the story page can lead back to them).
export default function StoryCard({ story, className = '', style, linkState }) {
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
          <Link
            to={`/yashogatha/${story.slug}`}
            state={linkState}
            className="scard__more"
            aria-label={y.readMoreAbout(text.title)}
          >
            {y.readMore}
            <Icon name="arrowRight" size={15} />
          </Link>
          {/* The story has its own public address already, so sharing one
              needs no new route — just the slug it is read at. */}
          <ShareButton path={`/yashogatha/${story.slug}`} title={text.title} compact />
        </div>
      </div>
    </article>
  );
}
