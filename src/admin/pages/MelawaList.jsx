import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, ExternalLink } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";

// Amrut Varg Melawa announcements for the website's flashing ticker. Each
// officer sees and manages their own jurisdiction's; the State Coordinator
// also publishes state-wide ones. A melawa leaves the ticker on its own once
// its end time has passed.

const SCOPE = {
  STATE: { label: "State", tone: "bad" },
  DIVISION: { label: "Division", tone: "accent" },
  DISTRICT: { label: "District", tone: "info" },
};

const fmtDate = (v) => {
  if (!v) return "";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const hhmm = (t) => String(t || "").slice(0, 5);

export default function MelawaList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const debounced = useDebounce(search);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/melawa",
    { page, limit, search: debounced, state },
    [page, limit, debounced, state]
  );

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/melawa/${confirmId}`);
      toast.success("Melawa deleted");
      setConfirmId(null);
      refetch();
    }).catch((err) => {
      setConfirmId(null);
      toast.error(errorMessage(err, "Could not delete that melawa"));
    });
  }

  const columns = [
    { key: "title_mr", label: "Title", render: (v, row) => <span className="td-bold td-truncate" title={row.title_en}>{v}</span> },
    {
      key: "jurisdiction_scope",
      label: "Scope",
      render: (v, row) => (
        <span>
          <Badge tone={SCOPE[v].tone}>{SCOPE[v].label}</Badge>{" "}
          <span className="a-text-muted a-text-sm">{row.district_en || row.district_mr || row.division_en || row.division_mr || ""}</span>
        </span>
      ),
    },
    {
      key: "event_date",
      label: "When",
      render: (v, row) => `${fmtDate(v)}${row.end_date && row.end_date !== v ? ` – ${fmtDate(row.end_date)}` : ""} · ${hhmm(row.start_time)}–${hhmm(row.end_time)}`,
    },
    { key: "venue_mr", label: "Venue", render: (v) => <span className="td-truncate">{v}</span> },
    {
      key: "is_live",
      label: "On ticker",
      render: (v, row) => v
        ? <Badge tone="ok">Live</Badge>
        : row.archived_at ? <Badge tone="neutral">Expired</Badge> : <Badge tone="neutral">Hidden</Badge>,
    },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search melawas…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
        <option value="">All</option>
        <option value="live">Live on ticker</option>
        <option value="upcoming">Upcoming</option>
        <option value="expired">Expired</option>
        <option value="inactive">Hidden</option>
      </select>
      <div className="a-toolbar-right">
        <a className="a-btn a-btn-secondary" href="/melawa" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Public page</a>
        <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/melawa/new")}><Plus size={16} /> Announce melawa</button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Melawa Announcements</h1>
          <p className="a-page-desc">The flashing “अमृत वर्ग मेळावा” ticker above the website header. Expired melawas are archived automatically.</p>
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
          <>
            <button className="a-action-btn" onClick={() => navigate(`/admin/melawa/${row.id}/edit`)} title="Edit"><Pencil size={15} /></button>
            <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete"><Trash2 size={15} /></button>
          </>
        )}
      />
      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete Melawa"
        message="Delete this melawa announcement?"
        subMessage="It is removed from the ticker immediately."
      />
    </>
  );
}
