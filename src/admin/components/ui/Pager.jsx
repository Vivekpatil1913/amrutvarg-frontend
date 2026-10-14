const PAGE_SIZE_OPTIONS = [10, 25, 50];

function getPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

export function Pager({ page, pageSize, total, totalPages, onPage, onPageSize }) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last  = Math.min(page * pageSize, total);
  const pages = getPages(page, totalPages || 1);

  return (
    <div className="a-pager">
      <p className="a-pager-info">
        Showing <span>{first}–{last}</span> of <span>{total}</span> records
      </p>

      {(totalPages || 1) > 1 && (
        <div className="a-pager-controls">
          <button
            className="a-btn a-btn-secondary a-btn-sm"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            ‹ Prev
          </button>

          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`e-${i}`} className="a-pager-ellipsis">…</span>
            ) : (
              <button
                key={p}
                className={`a-btn a-btn-sm a-pager-num${p === page ? " a-btn-primary" : " a-btn-ghost"}`}
                onClick={() => onPage(p)}
                disabled={p === page}
              >
                {p}
              </button>
            )
          )}

          <button
            className="a-btn a-btn-secondary a-btn-sm"
            disabled={page >= (totalPages || 1)}
            onClick={() => onPage(page + 1)}
          >
            Next ›
          </button>
        </div>
      )}

      {onPageSize && (
        <div className="a-pager-size">
          <label>Rows</label>
          <select
            className="a-select a-select-sm"
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
