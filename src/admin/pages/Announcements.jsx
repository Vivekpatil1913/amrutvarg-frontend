import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Eye, ExternalLink } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal, useConfirm } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";

// Every announcement, one row each. Adding and editing happen on their own
// page — see AnnouncementForm.jsx.

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "info", label: "Info" },
  { value: "comingSoon", label: "Coming Soon" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_TONE = { new: "info", info: "neutral", comingSoon: "warn", urgent: "bad" };

const STATUS_LABEL = Object.fromEntries(STATUSES.slice(1).map((s) => [s.value, s.label]));

// date columns arrive as 'YYYY-MM-DD'. Split rather than parse: through Date
// they would be read as UTC midnight and shown a day early west of Greenwich.
const fmtDate = (v) => {
  if (!v) return "";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};

const fmtStamp = (v) => (v ? new Date(v).toLocaleString("en-IN") : "");

// One label/value line in the view modal; renders an em dash when unset.
function ViewRow({ label, children, empty }) {
  return (
    <div className="a-view-row">
      <span className="a-view-label">{label}</span>
      <div className={`a-view-value${empty ? " is-empty" : ""}`}>
        {empty ? "—" : children}
      </div>
    </div>
  );
}

export default function Announcements() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const debouncedSearch = useDebounce(search);
  const [confirmId, setConfirmId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const { mutate, loading: saving } = useMutation();
  const confirm = useConfirm();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/announcements",
    { page, limit, search: debouncedSearch, status },
    [page, limit, debouncedSearch, status]
  );

  // The list already selects every column, and trashed rows are not fetchable
  // by id, so the row itself is what the view shows — in both tabs.
  function openView(row) {
    setViewRow(row);
  }

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/announcements/${confirmId}`);
      toast.success("Announcement moved to trash");
      setConfirmId(null);
      refetch();
    }).catch((err) => {
      setConfirmId(null);
      toast.error(errorMessage(err, "Could not delete that announcement"));
    });
  }

  function toggleActive(row) {
    const activating = !row.is_active;
    confirm({
      title: activating ? "Activate announcement" : "Deactivate announcement",
      message: `${activating ? "Activate" : "Deactivate"} "${row.title_mr}"?`,
      subMessage: activating
        ? "It will be shown on the website again."
        : "It will be hidden from the website. You can activate it again at any time.",
      tone: activating ? "primary" : "warning",
      confirmLabel: activating ? "Activate" : "Deactivate",
      errorText: "Could not change the announcement status",
      onConfirm: async () => {
        await api.put(`/admin/announcements/${row.id}`, {
          ...row, is_active: activating,
          display_order: row.display_order || 0,
        });
        toast.success(`Announcement ${activating ? "activated" : "deactivated"}`);
        refetch();
      },
    });
  }

  const columns = [
    {
      key: "title_mr",
      label: "Title (Marathi)",
      render: (v) => <span className="td-bold td-truncate">{v}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge tone={STATUS_TONE[v] || "neutral"}>{v}</Badge>,
    },
    {
      key: "pinned",
      label: "Pinned",
      render: (v) => v ? <Badge tone="info">Pinned</Badge> : <span className="td-muted">—</span>,
    },
    {
      key: "is_active",
      label: "Active",
      render: (v, row) => (
        <Switch on={v} onToggle={() => toggleActive(row)} />
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (v) => v ? fmtDate(v) : <span className="td-muted">—</span>,
    },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input
          className="a-search"
          placeholder="Search announcements…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      <select className="a-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/announcements/new")}>
          <Plus size={16} /> Add new
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Announcements</h1>
          <p className="a-page-desc">Manage website announcements and notices</p>
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
            <button className="a-action-btn" onClick={() => openView(row)} title="View">
              <Eye size={15} />
            </button>
            <button className="a-action-btn"
                    onClick={() => navigate(`/admin/announcements/${row.id}/edit`)} title="Edit">
              <Pencil size={15} />
            </button>
            <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete">
              <Trash2 size={15} />
            </button>
          </>
        )}
      />

      {/* View Modal */}
      <Modal
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        title="Announcement Details"
        size="lg"
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setViewRow(null)}>Close</button>
            <button className="a-btn a-btn-primary"
                    onClick={() => navigate(`/admin/announcements/${viewRow.id}/edit`)}>
              <Pencil size={15} /> Edit
            </button>
          </>
        }
      >
        {viewRow && (
          <>
            <div className="a-view-tags">
              <Badge tone={STATUS_TONE[viewRow.status] || "neutral"}>
                {STATUS_LABEL[viewRow.status] || viewRow.status}
              </Badge>
              {viewRow.pinned && <Badge tone="info">Pinned</Badge>}
              <Badge tone={viewRow.is_active ? "ok" : "neutral"}>
                {viewRow.is_active ? "Active" : "Inactive"}
              </Badge>
              {viewRow.deleted_at && <Badge tone="bad">In trash</Badge>}
            </div>

            <div className="a-view-list">
              <ViewRow label="Title (Marathi)" empty={!viewRow.title_mr}>
                <span className="a-view-strong">{viewRow.title_mr}</span>
              </ViewRow>
              <ViewRow label="Title (English)" empty={!viewRow.title_en}>
                {viewRow.title_en}
              </ViewRow>
              <ViewRow label="Description (Marathi)" empty={!viewRow.desc_mr}>
                {viewRow.desc_mr}
              </ViewRow>
              <ViewRow label="Description (English)" empty={!viewRow.desc_en}>
                {viewRow.desc_en}
              </ViewRow>
              <ViewRow label="Link" empty={!viewRow.link}>
                <a className="a-view-link" href={viewRow.link} target="_blank" rel="noopener noreferrer">
                  {viewRow.link_label || viewRow.link}
                  <ExternalLink size={13} />
                </a>
              </ViewRow>
              <ViewRow label="Date" empty={!viewRow.date}>{fmtDate(viewRow.date)}</ViewRow>
              <ViewRow label="Valid Until" empty={!viewRow.until_date}>
                {fmtDate(viewRow.until_date)}
              </ViewRow>
              <ViewRow label="Display Order">{viewRow.display_order ?? 0}</ViewRow>
              <ViewRow label="Created" empty={!viewRow.created_at}>
                {fmtStamp(viewRow.created_at)}
              </ViewRow>
              <ViewRow label="Last Updated" empty={!viewRow.updated_at}>
                {fmtStamp(viewRow.updated_at)}
              </ViewRow>
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete Announcement"
        message="Delete this announcement?"
      />
    </>
  );
}
