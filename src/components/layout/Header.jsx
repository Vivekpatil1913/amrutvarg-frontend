import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import LanguageSwitch from './LanguageSwitch';
import logo from '../../assets/amrut-logo.png';
import { useLanguage } from '../../i18n/LanguageContext';
import { LIVE_SUBMIT } from '../../services/submissions';

const TEXT_SCALES = [0.9, 1, 1.125];
const SCALE_KEY = 'amrut_text_scale';

const readScale = () => {
  try {
    const saved = localStorage.getItem(SCALE_KEY);
    const i = saved === null ? NaN : Number(saved);
    return Number.isInteger(i) && TEXT_SCALES[i] ? i : 1;
  } catch {
    return 1;
  }
};

export const NAV_ITEMS = [
  { id: 'hero', key: 'home' },
  { id: 'about', key: 'amrutVarg' },
  { id: 'session', key: 'session' },
  { id: 'vargs', key: 'workingVargs' },
  { id: 'leader', key: 'leader' },
  { id: 'contact', key: 'contact' },
];

// Scrolls to a home-page section, navigating home first when needed.
export function useSectionNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (id) => {
    const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (pathname !== '/') {
      navigate('/');
      window.setTimeout(go, 120);
    } else {
      go();
    }
    window.history.replaceState(null, '', `#${id}`);
  };
}

export default function Header() {
  const { t } = useLanguage();
  const goTo = useSectionNav();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef(null);
  const [active, setActive] = useState('hero');
  const [scale, setScale] = useState(readScale);

  useEffect(() => {
    document.documentElement.style.fontSize = `${TEXT_SCALES[scale] * 100}%`;
    try {
      localStorage.setItem(SCALE_KEY, String(scale));
    } catch {
      /* ignore */
    }
  }, [scale]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressRef.current?.style.setProperty('--progress', max > 0 ? String(window.scrollY / max) : '0');
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Sliding pill behind the active link, measured so it fits either language.
  const listRef = useRef(null);
  const [pill, setPill] = useState(null);
  const activeId = pathname === '/' ? active : null;
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const place = () => {
      const link = activeId && list.querySelector(`[data-nav="${activeId}"]`);
      if (!link) {
        setPill(null);
        return;
      }
      setPill({ x: link.offsetLeft, w: link.offsetWidth });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [activeId, t]);

  // Highlight the nav item for the section currently in view.
  useEffect(() => {
    if (pathname !== '/' || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth >= 1100 && setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    document.body.classList.add('menu-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.classList.remove('menu-open');
    };
  }, [open]);

  const onNav = (e, id) => {
    e.preventDefault();
    if (!open) {
      goTo(id);
      return;
    }
    // The open menu sits inside the sticky header and pushes the page down;
    // scroll only after it has closed so the target position is correct.
    setOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(() => goTo(id)));
  };

  return (
    <>
      <a className="skip-link" href="#main">
        {t.a11y.skip}
      </a>
      <div className="govbar">
        <div className="container govbar__inner">
          <p className="govbar__id">
            <span className="govbar__state">{t.gov.state}</span>
            <span className="govbar__sep" aria-hidden="true" />
            <span className="govbar__org">{t.gov.org}</span>
          </p>
          <div className="govbar__tools">
            {!LIVE_SUBMIT ? (
              <p className="govbar__preview" title={t.preview.banner}>
                <Icon name="info" size={14} />
                <span className="govbar__preview-long">{t.preview.banner}</span>
                <span className="govbar__preview-short" aria-hidden="true">
                  {t.preview.short}
                </span>
              </p>
            ) : null}
            <div className="textsize" role="group" aria-label={t.a11y.textSize}>
              {[
                ['A−', t.a11y.smaller],
                ['A', t.a11y.reset],
                ['A+', t.a11y.larger],
              ].map(([label, aria], i) => (
                <button
                  key={label}
                  type="button"
                  className="textsize__btn"
                  aria-label={aria}
                  aria-pressed={scale === i}
                  onClick={() => setScale(i)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <header className={`site-header${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
        <div className="container site-header__inner">
          <Link to="/" className="brand" onClick={(e) => pathname === '/' && onNav(e, 'hero')}>
            <img src={logo} alt={t.a11y.logoAlt} width="383" height="86" className="brand__logo" />
            <span className="brand__divider" aria-hidden="true" />
            <span className="brand__name">{t.hero.title}</span>
          </Link>

          <nav className="nav" aria-label={t.a11y.mainNav}>
            <ul className="nav__list" ref={listRef}>
              <li
                className={`nav__pill${pill ? ' is-on' : ''}`}
                aria-hidden="true"
                style={pill ? { transform: `translateX(${pill.x}px)`, width: pill.w } : undefined}
              />
              {NAV_ITEMS.map(({ id, key }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    data-nav={id}
                    className={`nav__link${pathname === '/' && active === id ? ' is-active' : ''}`}
                    aria-current={pathname === '/' && active === id ? 'true' : undefined}
                    onClick={(e) => onNav(e, id)}
                  >
                    {t.nav[key]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-header__actions">
            <LanguageSwitch />
            <a href="#join" className="btn btn--primary btn--sm site-header__cta" onClick={(e) => onNav(e, 'join')}>
              {t.nav.cta}
              <Icon name="arrowRight" size={15} />
            </a>
            <button
              type="button"
              className="icon-btn menu-toggle"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t.common.closeMenu : t.common.openMenu}
              onClick={() => setOpen((o) => !o)}
            >
              <Icon name={open ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>

        <span ref={progressRef} className="site-header__progress" aria-hidden="true" />
        <div id="mobile-menu" className="mobile-menu" hidden={!open}>
          <nav className="container" aria-label={t.a11y.mainNav}>
            <ul className="mobile-menu__list">
              {NAV_ITEMS.map(({ id, key }, i) => (
                <li key={id} style={{ '--i': i }}>
                  <a href={`#${id}`} className="mobile-menu__link" onClick={(e) => onNav(e, id)}>
                    {t.nav[key]}
                    <Icon name="arrowRight" size={18} />
                  </a>
                </li>
              ))}
            </ul>
            <div className="mobile-menu__foot">
              <a href="#join" className="btn btn--primary" onClick={(e) => onNav(e, 'join')}>
                {t.nav.cta}
              </a>
              <Link to="/admin/login" className="mobile-menu__admin" onClick={() => setOpen(false)}>
                <Icon name="lock" size={16} />
                {t.nav.admin}
              </Link>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
