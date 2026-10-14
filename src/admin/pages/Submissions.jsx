import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Search, Trash2 } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const FORM_TYPES = ["", "participant", "organizer", "leader"];
const STATUSES = ["", "new", "reviewed", "actioned", "archived"];
const STATUS_TONE = { new: "info", reviewed: "ok", actioned: "accent", archived: "neutral" };

export default function Submissions() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [formType, setFormType] = useState("");
  const [status, setStatus] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const debouncedSearch = useDebounce(search);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/submissions",
    { page, limit, search: debouncedSearch, form_type: formType, status },
    [page, limit, debouncedSearch, formType, status]
  );

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/submissions/${confirmId}`);
      toast.show("Deleted", "ok");
      setConfirmId(null);
      refetch();
    });
  }


  const columns = [
    { key: "form_type", label: "Form", render: (v) => <Badge tone="neutral">{v}</Badge> },
    { key: "submitter_name", label: "Name", render: (v) => <span className="td-bold">{v || "—"}</span> },
    { key: "status", label: "Status", render: (v) => <Badge tone={STATUS_TONE[v] || "neutral"}>{v}</Badge> },
    { key: "submitted_at", label: "Submitted", render: (v) => new Date(v).toLocaleDateString("en-IN") + " " + new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search submissions…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={formType} onChange={(e) => { setFormType(e.target.value); setPage(1); }}>
        <option value="">All forms</option>
        {FORM_TYPES.slice(1).map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select className="a-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All statuses</option>
        {STATUSES.slice(1).map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Form Submissions</h1>
          <p className="a-page-desc">Participant, organizer, and leader registrations</p>
        </div>
      </div>

      <DataTable columns={columns} rows={data} loading={loading} error={error} meta={meta} onPage={setPage} onPageSize={(n) => { setLimit(n); setPage(1); }} toolbar={toolbar}
        actions={(row) => (
          <>
            <button className="a-action-btn" onClick={() => navigate(`/admin/submissions/${row.id}`)} title="View">
              <Eye size={15} />
            </button>
            <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete">
                <Trash2 size={15} />
              </button>
          </>
        )}
      />

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete Submission"
        message="Delete this submission?"
        subMessage="This is somebody's registration. It is removed from the list; the record itself is retained."
      />
    </>
  );
}
