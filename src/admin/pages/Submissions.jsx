import { useState } from "react";
import { Eye, Search } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const FORM_TYPES = ["", "participant", "organizer", "leader"];
const STATUSES = ["", "new", "reviewed", "actioned", "archived"];
const STATUS_TONE = { new: "info", reviewed: "ok", actioned: "accent", archived: "neutral" };

export default function Submissions() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [formType, setFormType] = useState("");
  const [status, setStatus] = useState("");
  const debouncedSearch = useDebounce(search);
  const [viewRow, setViewRow] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: "", notes: "" });
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/submissions",
    { page, limit, search: debouncedSearch, form_type: formType, status },
    [page, limit, debouncedSearch, formType, status]
  );

  async function openDetail(row) {
    const res = await api.get(`/admin/submissions/${row.id}`);
    setViewRow(res.data);
    setStatusUpdate({ status: res.data.status, notes: res.data.notes || "" });
    setDetailOpen(true);
  }

  async function updateStatus() {
    await mutate(async () => {
      await api.put(`/admin/submissions/${viewRow.id}/status`, statusUpdate);
      toast.show("Status updated", "ok");
      setDetailOpen(false);
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
          <button className="a-action-btn" onClick={() => openDetail(row)} title="View"><Eye size={15} /></button>
        )}
      />
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Submission Details" size="lg"
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setDetailOpen(false)}>Close</button>
            <button className="a-btn a-btn-primary" onClick={updateStatus} disabled={saving}>{saving ? "Saving…" : "Update Status"}</button>
          </>
        }
      >
        {viewRow && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Badge tone="neutral">{viewRow.form_type}</Badge>
              <Badge tone={STATUS_TONE[viewRow.status] || "neutral"}>{viewRow.status}</Badge>
              <span className="a-text-muted a-text-sm">{new Date(viewRow.submitted_at).toLocaleString("en-IN")}</span>
            </div>
            <div className="a-card" style={{ padding: "1rem", maxHeight: "20rem", overflow: "auto" }}>
              <pre style={{ fontSize: "0.75rem", color: "var(--a-content-soft)", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
                {JSON.stringify(viewRow.data, null, 2)}
              </pre>
            </div>
            <div className="a-form-grid a-form-grid-2">
              <div className="a-field">
                <label className="a-label">Update Status</label>
                <select className="a-input" value={statusUpdate.status} onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}>
                  {STATUSES.slice(1).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="a-field">
                <label className="a-label">Notes</label>
                <input className="a-input" value={statusUpdate.notes} onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })} placeholder="Optional notes" />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
