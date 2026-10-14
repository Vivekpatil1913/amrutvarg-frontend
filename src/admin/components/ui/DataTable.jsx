import { Pager } from "./Pager.jsx";
import { Loader2, DatabaseBackup, AlertCircle } from "lucide-react";

export function DataTable({
  columns,
  rows,
  loading,
  error,
  meta,
  onPage,
  onPageSize,
  toolbar,
  actions,
  sno = true,
}) {
  const page = meta?.page || 1;
  const pageSize = meta?.pageSize || 10;
  const total = meta?.total || 0;
  const totalPages = meta?.totalPages || 1;

  if (error) {
    return (
      <div className="a-card">
        <div className="a-empty-state">
          <AlertCircle className="a-empty-icon" style={{ color: "var(--a-bad)" }} />
          <p className="a-empty-title">Failed to load data</p>
          <p className="a-text-muted a-text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="a-card">
      {/* Toolbar */}
      {toolbar && (
        <div className="a-toolbar">{toolbar}</div>
      )}

      {loading ? (
        <div className="a-spinner">
          <Loader2 className="a-spin" size={20} />
          <span>Loading…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="a-empty-state">
          <DatabaseBackup className="a-empty-icon" />
          <p className="a-empty-title">No records found</p>
        </div>
      ) : (
        <>
          <div className="a-table-scroll">
            <table className="a-table">
              <thead>
                <tr>
                  {sno && <th className="td-sno">Sr No</th>}
                  {columns.map((col) => (
                    <th key={col.key} style={col.width ? { width: col.width } : {}}>
                      {col.label}
                    </th>
                  ))}
                  {actions && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id || i}>
                    {sno && (
                      <td className="td-sno">{(page - 1) * pageSize + i + 1}</td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={col.className || ""}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                      </td>
                    ))}
                    {actions && (
                      <td className="td-actions">{actions(row)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={pageSize} total={total} totalPages={totalPages} onPage={onPage} onPageSize={onPageSize} />
        </>
      )}
    </div>
  );
}
