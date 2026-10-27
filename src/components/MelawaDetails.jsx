import Icon from './Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { formatTiming, highlightLines, pickLang } from '../services/melawa';

// One melawa in full: when, where, how to get there, and what happens there.
// Shared by the ticker's dialog and the schedule page, so both say the same.
export function melawaPlace(row, lang, { district, division }) {
  if (row.jurisdiction_scope === 'DISTRICT') return lang === 'en' && row.district_en ? row.district_en : district(row.district_mr);
  if (row.jurisdiction_scope === 'DIVISION') return lang === 'en' && row.division_en ? row.division_en : division(row.division_mr);
  return '';
}

export default function MelawaDetails({ row, headingLevel = 3 }) {
  const { t, lang, formatDateWithDay, district, division } = useLanguage();
  const m = t.melawa;
  const Heading = `h${headingLevel}`;
  const highlights = highlightLines(pickLang(row, 'highlights', lang));
  const place = melawaPlace(row, lang, { district, division });
  const dates = row.end_date && row.end_date !== row.event_date
    ? `${formatDateWithDay(row.event_date)} – ${formatDateWithDay(row.end_date)}`
    : formatDateWithDay(row.event_date);

  return (
    <article className="melawa-card">
      <p className={`melawa-card__scope melawa-card__scope--${row.jurisdiction_scope.toLowerCase()}`}>
        {m.scope[row.jurisdiction_scope]}
        {place ? ` · ${place}` : ''}
      </p>
      <Heading className="melawa-card__title">{pickLang(row, 'title', lang)}</Heading>
      <dl className="melawa-card__facts">
        <div>
          <dt><Icon name="calendar" size={16} />{m.date}</dt>
          <dd>{dates}</dd>
        </div>
        <div>
          <dt><Icon name="clock" size={16} />{m.timing}</dt>
          <dd>{formatTiming(row, lang, m)}</dd>
        </div>
        <div>
          <dt><Icon name="mapPin" size={16} />{m.venue}</dt>
          <dd>
            {pickLang(row, 'venue', lang)}
            {row.maps_url ? (
              <a className="melawa-card__map" href={row.maps_url} target="_blank" rel="noopener noreferrer">
                {m.navigate}
                <Icon name="external" size={14} />
                <span className="sr-only">{t.common.opensNewTab}</span>
              </a>
            ) : null}
          </dd>
        </div>
      </dl>
      {highlights.length ? (
        <div className="melawa-card__highlights">
          <p className="melawa-card__label">{m.highlights}</p>
          <ul>
            {highlights.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
