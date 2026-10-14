import Icon from './Icon';
import { STORY_CATEGORIES } from '../data/yashogathaStories';
import { useLanguage } from '../i18n/LanguageContext';
import varg1 from '../assets/varg-1.jpg';
import varg2 from '../assets/varg-2.jpg';
import varg3 from '../assets/varg-3.jpg';

// Programme photos, with the index of their alt text in hero.photoAlts.
const PHOTOS = {
  varg1: { src: varg1, alt: 0, height: 577 },
  varg2: { src: varg2, alt: 1, height: 582 },
  varg3: { src: varg3, alt: 2, height: 576 },
};

// A story's cover: its programme photo when it has one, otherwise an
// illustrated motif (circles of "मंडलं कुरु" around the theme icon) tinted
// in the theme's colour.
export default function StoryCover({ story, className = '', eager = false }) {
  const { t } = useLanguage();
  const cat = STORY_CATEGORIES[story.category] || STORY_CATEGORIES.personality;
  const photo = story.image && PHOTOS[story.image];

  // A photograph uploaded in the admin wins over the bundled programme photo,
  // which in turn wins over the illustrated motif below.
  const uploaded = story.image_url || story.imageUrl;
  if (uploaded) {
    return (
      <div className={`scover ${className}`}>
        <img
          src={uploaded}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      </div>
    );
  }

  if (photo) {
    return (
      <div className={`scover ${className}`}>
        <img
          src={photo.src}
          alt={t.hero.photoAlts[photo.alt]}
          width="1280"
          height={photo.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div className={`scover scover--art ${className}`} style={{ '--h': cat.hue }} aria-hidden="true">
      <svg className="scover__rings" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" focusable="false">
        <circle cx="200" cy="112" r="150" />
        <circle cx="200" cy="112" r="108" />
        <circle cx="200" cy="112" r="66" />
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return <circle key={i} className="scover__dot" cx={200 + Math.cos(a) * 108} cy={112 + Math.sin(a) * 108} r="3.5" />;
        })}
      </svg>
      <span className="scover__icon">
        <Icon name={cat.icon} size={34} />
      </span>
    </div>
  );
}
