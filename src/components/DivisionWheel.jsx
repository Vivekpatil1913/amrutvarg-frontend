import { useState } from 'react';
import Icon from './Icon';
import { useLanguage } from '../i18n/LanguageContext';

// "मंडलं कुरु" — the division filter drawn as a ring. Each arc's length is the
// division's share of all listed Vargs; the legend rows are the accessible
// controls and stay in sync with the ring on hover and focus.
const SIZE = 220;
const C_XY = SIZE / 2;
const R = 82;
const CIRC = 2 * Math.PI * R;
const GAP = 4;

export const toneColor = (tone) => `hsl(22 72% ${36 + tone * 7}%)`;

// `allLabel` is the ring's centre when no division is picked; the section
// passes the CMS wording and falls back to the bundled phrase.
export default function DivisionWheel({ divisions, total, selected, onSelect, allLabel }) {
  const { t, num, division } = useLanguage();
  const v = t.vargs;
  const [hover, setHover] = useState('');
  const max = Math.max(...divisions.map((d) => d.count), 1);

  let start = 0;
  const arcs = divisions.map((d) => {
    const len = (CIRC * d.count) / total;
    const arc = { ...d, len: Math.max(len - GAP, 0.5), offset: -start };
    start += len;
    return arc;
  });

  const focus = hover || selected;
  const focused = divisions.find((d) => d.name === focus);
  const active = (name) => (focus ? focus === name : true);

  return (
    <div className="wheel" onMouseLeave={() => setHover('')}>
      <div className="wheel__dial">
        <svg className="wheel__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false">
          <circle className="wheel__track" cx={C_XY} cy={C_XY} r={R} />
          <circle className="wheel__inner" cx={C_XY} cy={C_XY} r={R - 26} />
          <g transform={`rotate(-90 ${C_XY} ${C_XY})`}>
            {arcs.map((a, i) => (
              <circle
                key={a.name}
                className={`wheel__arc${selected === a.name ? ' is-selected' : ''}${active(a.name) ? '' : ' is-dim'}`}
                cx={C_XY}
                cy={C_XY}
                r={R}
                style={{
                  '--len': a.len,
                  '--circ': CIRC,
                  '--d': i,
                  stroke: toneColor(a.tone),
                  strokeDashoffset: a.offset,
                }}
                onMouseEnter={() => setHover(a.name)}
                onClick={() => onSelect(a.name)}
              />
            ))}
          </g>
        </svg>

        <button
          type="button"
          className="wheel__center"
          onClick={() => onSelect('')}
          aria-label={v.showAll}
          aria-pressed={!selected}
        >
          <span key={focus || 'all'} className="wheel__center-inner">
            <span className="wheel__num">{num(focused ? focused.count : total)}</span>
            <span className="wheel__cap">{focused ? division(focused.name) : allLabel || v.allDivisions}</span>
            {focused ? <span className="wheel__share">{v.share(num(focused.count), num(total))}</span> : null}
          </span>
        </button>
      </div>

      <ul className="wheel__legend" role="group" aria-label={v.filterDivision}>
        {/* "All" clears the division filter and lists every division's Vargs. */}
        <li style={{ '--d': 0 }}>
          <button
            type="button"
            className="wheel__row wheel__row--all"
            data-division=""
            aria-pressed={!selected}
            aria-label={v.showAll}
            onClick={() => onSelect('')}
          >
            <span
              className="wheel__swatch"
              style={{ '--swatch': `conic-gradient(${divisions.map((d) => toneColor(d.tone)).join(', ')})` }}
              aria-hidden="true"
            >
              {!selected ? <Icon name="check" size={12} /> : null}
            </span>
            <span className="wheel__name">{v.all}</span>
            <span className="wheel__bar" aria-hidden="true">
              <span style={{ width: '100%', background: `linear-gradient(90deg, ${toneColor(0)}, ${toneColor(divisions.length - 1)})` }} />
            </span>
            <span className="wheel__count">{num(total)}</span>
          </button>
        </li>
        {divisions.map((d, i) => (
          <li key={d.name} style={{ '--d': i + 1 }}>
            {/* Rows are never dimmed (only the ring fades unfocused arcs);
                a row whose arc is hovered gets a light highlight instead. */}
            <button
              type="button"
              className={`wheel__row${hover === d.name && selected !== d.name ? ' is-hot' : ''}`}
              data-division={d.name}
              aria-pressed={selected === d.name}
              onClick={() => onSelect(d.name)}
              onMouseEnter={() => setHover(d.name)}
              onFocus={() => setHover(d.name)}
              onBlur={() => setHover('')}
            >
              <span className="wheel__swatch" style={{ '--swatch': toneColor(d.tone) }} aria-hidden="true">
                {selected === d.name ? <Icon name="check" size={12} /> : null}
              </span>
              <span className="wheel__name">{division(d.name)}</span>
              <span className="wheel__bar" aria-hidden="true">
                <span style={{ width: `${(d.count / max) * 100}%`, background: toneColor(d.tone) }} />
              </span>
              <span className="wheel__count">{num(d.count)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
