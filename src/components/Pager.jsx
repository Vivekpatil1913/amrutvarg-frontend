import Icon from './Icon';
import { useLanguage } from '../i18n/LanguageContext';

// Cards per page in every paginated list.
export const PAGE_SIZE = 8;

// Page numbers to show: all when few, otherwise first, last and the current
// page's neighbours, with null marking a gap.
function pageList(count, current) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const keep = new Set([0, count - 1, current - 1, current, current + 1]);
  const list = [];
  for (let i = 0; i < count; i += 1) {
    if (keep.has(i)) list.push(i);
    else if (list[list.length - 1] !== null) list.push(null);
  }
  return list;
}

// Previous / numbered / Next page buttons. `page` is zero-based.
export default function Pager({ page, pageCount, onChange }) {
  const { t, num } = useLanguage();
  const c = t.common;
  return (
    <div className="pager">
      <button type="button" className="pager__btn" onClick={() => onChange(page - 1)} disabled={page === 0} aria-label={c.prevPage}>
        <Icon name="arrowLeft" size={16} />
      </button>
      {pageList(pageCount, page).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} className="pager__gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            className="pager__btn"
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={c.pageN(num(n + 1))}
          >
            {num(n + 1)}
          </button>
        ),
      )}
      <button
        type="button"
        className="pager__btn"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount - 1}
        aria-label={c.nextPage}
      >
        <Icon name="arrowRight" size={16} />
      </button>
    </div>
  );
}
