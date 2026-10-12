import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { useLanguage } from '../../i18n/LanguageContext';
import photoA from '../../assets/varg-3.jpg';
import photoB from '../../assets/varg-1.jpg';
import photoC from '../../assets/varg-2.jpg';

// One icon per confirmed activity, in the same order as the source list.
const ICONS = ['sun', 'scroll', 'ball', 'music', 'sparkle'];

const ROTATE_MS = 3000;

// Where each activity appears in the daily session (indexes into session.steps),
// taken from the session's own step descriptions:
// sun salutation → Relaxation; chants → Prayer & Peace Mantra;
// games → Seated & Field games; songs and stories → Intellectual session.
const SESSION_STEPS = [[2], [1, 7], [3, 5], [6], [6]];

const PHOTOS = [
  { src: photoA, alt: 2 },
  { src: photoB, alt: 0 },
  { src: photoC, alt: 1 },
];

export default function Activities({ onNavigate }) {
  const { t, num } = useLanguage();
  const a = t.activities;
  const steps = t.session.steps;
  const [active, setActive] = useState(0);
  const tabs = useRef([]);
  const baseId = useId();
  const [paused, setPaused] = useState(false);
  const photo = active % PHOTOS.length;

  // Direction of travel, so the stage wipes forward or back.
  const prevActive = useRef(0);
  const dir = active >= prevActive.current ? 'fwd' : 'back';
  useEffect(() => {
    prevActive.current = active;
  }, [active]);

  // Auto-advance every 3 s. A single timeout at a time: cleared when the step
  // changes, rotation pauses, or the section unmounts. Pausing keeps the time
  // remaining, so the progress ring (a 3 s CSS animation paused with the same
  // flag) and the timer always finish together. Paused while the pointer or
  // keyboard focus is inside the section.
  const remaining = useRef(ROTATE_MS);
  useEffect(() => {
    remaining.current = ROTATE_MS;
  }, [active]);
  useEffect(() => {
    if (paused) return undefined;
    const started = performance.now();
    const id = window.setTimeout(() => setActive((i) => (i + 1) % a.list.length), remaining.current);
    return () => {
      window.clearTimeout(id);
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [active, paused, a.list.length]);

  // Timeline rail: measured centres of the step numbers.
  const listRef = useRef(null);
  const [rail, setRail] = useState(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const measure = () => {
      const lr = list.getBoundingClientRect();
      const centres = [...list.querySelectorAll('.act__item-num')].map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2 - lr.left, y: r.top + r.height / 2 - lr.top };
      });
      if (centres.length) setRail(centres);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [t]);

  const onKey = (e, i) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    let next = null;
    if (step) next = (i + step + a.list.length) % a.list.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = a.list.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="activities" className="section activities" aria-labelledby="activities-title">
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {a.badge}
            </p>
            <h2 id="activities-title" className="section__title">
              {a.title}
            </h2>
          </div>
          <p className="section__lead">{a.lead}</p>
        </header>

        <div
          className={`act${paused ? ' is-paused' : ''}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
          }}
        >
          {/* Stage: the selected activity over programme photography */}
          <div
            id={`${baseId}-stage`}
            className="act__stage"
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${active}`}
            data-reveal
          >
            {PHOTOS.map((p, i) => (
              <img
                key={p.src}
                src={p.src}
                alt={i === photo ? t.hero.photoAlts[p.alt] : ''}
                aria-hidden={i === photo ? undefined : 'true'}
                className={`act__photo${i === photo ? ' is-shown' : ''}`}
                data-dir={dir}
                width="1280"
                height="577"
                loading="lazy"
              />
            ))}
            <div className="act__shade" aria-hidden="true" />
            <span className="act__caption">{a.photoCaption}</span>

            <div key={active} className="act__info" data-dir={dir}>
              <div className="act__top">
                <span className="act__icon">
                  <Icon name={ICONS[active]} size={24} />
                </span>
                <span className="act__index">
                  {num(`0${active + 1}`)}
                  <span> / {num(`0${a.list.length}`)}</span>
                </span>
              </div>
              <h3 className="act__title">{a.list[active]}</h3>

              <p className="act__where">{a.inSession}</p>
              <ul className="act__steps">
                {SESSION_STEPS[active].map((idx) => {
                  const s = steps[idx];
                  return (
                    <li key={idx} className="act__step">
                      <span className="act__step-num">{s.num}</span>
                      <span className="act__step-name">{s.title}</span>
                      {s.min ? (
                        <span className="act__step-min">
                          <Icon name="clock" size={13} />
                          {num(s.min)} {t.session.minutes}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="act__link" onClick={() => onNavigate('session')}>
                {a.viewSession}
                <Icon name="arrowRight" size={16} />
              </button>
            </div>

            <div className="act__progress" aria-hidden="true">
              {a.list.map((item, i) => (
                <span key={`bar-${i}`} className={i === active ? 'is-on' : ''} />
              ))}
            </div>
          </div>

          {/* Activity list (tabs) */}
          <div ref={listRef} className="act__list" role="tablist" aria-orientation="vertical" aria-label={a.choose} data-reveal style={{ '--d': 1 }}>
            {/* Timeline: one segment between each pair of step numbers; segments
                before the active step are filled. Drawn between badges, never over them. */}
            {rail
              ? rail.slice(1).map((c, i) => {
                  const from = rail[i];
                  const gap = 19; // badge radius + breathing room
                  return (
                    <span
                      key={`seg-${i}`}
                      className={`act__seg${i < active ? ' is-filled' : ''}`}
                      aria-hidden="true"
                      style={{ left: from.x, top: from.y + gap, height: Math.max(0, c.y - from.y - gap * 2), '--i': i }}
                    />
                  );
                })
              : null}
            {a.list.map((item, i) => {
              const selected = i === active;
              return (
                <button
                  key={ICONS[i]}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${i}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-stage`}
                  tabIndex={selected ? 0 : -1}
                  className="act__item"
                  style={{ '--i': i }}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  <span className={`act__item-num${i < active ? ' is-done' : ''}`}>
                    {selected ? (
                      // Remounts per step, so the 3 s fill restarts in sync with the timer.
                      <svg key={`ring-${active}`} className="act__ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
                        <circle className="act__ring-track" cx="18" cy="18" r="16" />
                        <circle className="act__ring-fill" cx="18" cy="18" r="16" pathLength="100" />
                      </svg>
                    ) : null}
                    <span className="act__item-num-text">{num(`0${i + 1}`)}</span>
                  </span>
                  <span className="act__item-icon">
                    <Icon name={ICONS[i]} size={20} />
                  </span>
                  <span className="act__item-text">{item}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
