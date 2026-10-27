import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Search, Paperclip } from "lucide-react";
import { useList, useDebounce } from "../hooks/useApi.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { GRIEVANCE_STATUS, SLA_BADGE, fmtStamp } from "../lib/roles.js";

// Suggestions and complaints from the public portal, confined by the CMS to
// the signed-in officer's jurisdiction. Open, overdue tickets sort first.

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "OPEN", label: "Open (not resolved)" },
  ...Object.entries(GRIEVANCE_STATUS).map(([value, s]) => ({ value, label: s.label })),
];

const SLA_FILTERS = [
  { value: "", label: "Any SLA" },
  { value: "RED", label: "Overdue (red)" },
  { value: "AMBER", label: "Approaching (amber)" },
  { value: "OK", label: "On track" },
  { value: "MET", label: "Done" },
];

export default function Grievances() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") || "");
  const [sla, setSla] = useState(params.get("sla") || "");
  const [type, setType] = useState("");
  const debounced = useDebounce(search);

  const { data, meta, loading, error } = useList(
    "/admin/grievances",
    { page, limit, search: debounced, status, sla, type },
    [page, limit, debounced, status, sla, type]
  );

  const columns = [
    {
      key: "ticket_no",
      label: "Ticket",
      render: (v, row) => (
        <span className="td-bold">
          {v}
          {row.priority === "HIGH" ? <span className="a-text-muted a-text-sm"> · priority</span> : null}
        </span>
      ),
    },
    { key: "submission_type", label: "Type", render: (v) => <Badge tone={v === "COMPLAINT" ? "bad" : "info"}>{v === "COMPLAINT" ? "Complaint" : "Suggestion"}</Badge> },
    {
      key: "subject",
      label: "Subject",
      render: (v, row) => (
        <span className="td-truncate" title={v}>
          {v}
          {row.attachment_count ? <> <Paperclip size={12} /> {row.attachment_count}</> : null}
        </span>
      ),
    },
    { key: "full_name", label: "From" },
    { key: "district_en", label: "District", render: (v, row) => v || row.district_mr },
    { key: "status", label: "Status", render: (v) => <Badge tone={GRIEVANCE_STATUS[v]?.tone}>{GRIEVANCE_STATUS[v]?.label || v}</Badge> },
    {
      key: "sla_state",
      label: "SLA",
      render: (v, row) => (
        <span className="a-sla">
          <Badge tone={SLA_BADGE[v]?.tone}>{SLA_BADGE[v]?.label}</Badge>
          <span className="a-text-muted a-text-sm">{row.age_hours}h{row.escalation_level >= 2 ? " · escalated" : row.escalation_level === 1 ? " · reminded" : ""}</span>
        </span>
      ),
    },
    { key: "created_at", label: "Received", render: (v) => fmtStamp(v) },
  ];

  const reset = (fn) => (e) => { fn(e.target.value); setPage(1); };

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Ticket, name, subject, mobile…" value={search} onChange={reset(setSearch)} />
      </div>
      <select className="a-select" value={status} onChange={reset(setStatus)}>
        {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <select className="a-select" value={sla} onChange={reset(setSla)}>
        {SLA_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <select className="a-select" value={type} onChange={reset(setType)}>
        <option value="">All types</option>
        <option value="COMPLAINT">Complaints</option>
        <option value="SUGGESTION">Suggestions</option>
      </select>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Grievances</h1>
          <p className="a-page-desc">
            Suggestions and complaints from the public portal. Unacknowledged tickets are reminded at 24 hours and escalated to the State Coordinator at 72 hours.
          </p>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        error={error}
        meta={meta}
        onPage={setPage}
        onPageSize={(n) => { setLimit(n); setPage(1); }}
        toolbar={toolbar}
        actions={(row) => (
          <button className="a-action-btn" onClick={() => navigate(`/admin/grievances/${row.id}`)} title="Open ticket">
            <Eye size={15} />
          </button>
        )}
      />
    </>
  );
}
