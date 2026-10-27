import { useState } from "react";
import { Search } from "lucide-react";
import { useList, useDebounce } from "../hooks/useApi.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { fmtStamp, roleLabel } from "../lib/roles.js";

// The master audit trail: who changed accounts, published or took down
// listings, announced melawas and moved grievance tickets. Read-only, state
// level only.

const ENTITIES = [
  { value: "", label: "Everything" },
  { value: "admin_user", label: "Users & roles" },
  { value: "varg", label: "Amrut Vargs" },
  { value: "melawa", label: "Melawa" },
  { value: "grievance", label: "Grievances" },
  { value: "submission", label: "Registrations" },
];

const summary = (d) =>
  Object.entries(d || {})
    .map(([k, v]) => `${k}: ${typeof v === "object" && v !== null ? JSON.stringify(v) : v}`)
    .join(" · ");

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const debounced = useDebounce(search);

  const { data, meta, loading, error } = useList(
    "/admin/audit-logs",
    { page, limit, search: debounced, entity },
    [page, limit, debounced, entity]
  );

  const columns = [
    { key: "created_at", label: "When", render: (v) => fmtStamp(v) },
    { key: "user_name", label: "Who", render: (v, row) => v ? <span>{v}<br /><span className="a-text-muted a-text-sm">{roleLabel(row.user_role)}</span></span> : <span className="td-muted">Public / system</span> },
    { key: "action", label: "Action", render: (v) => <Badge tone="neutral">{v}</Badge> },
    { key: "entity_id", label: "Record", render: (v, row) => `${row.entity} #${v ?? "—"}` },
    { key: "details", label: "Details", render: (v) => <span className="td-truncate a-text-sm" title={summary(v)}>{summary(v)}</span> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search actions, people, details…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
        {ENTITIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
      </select>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Audit Log</h1>
          <p className="a-page-desc">Every change to accounts, listings, melawas and grievance tickets.</p>
        </div>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} error={error} meta={meta}
                 onPage={setPage} onPageSize={(n) => { setLimit(n); setPage(1); }} toolbar={toolbar} />
    </>
  );
}
