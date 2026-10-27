import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Eye, Settings, Flag, EyeOff, CheckCircle2 } from "lucide-react";
import { api } from "../api/client.js";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { ConfirmModal, Modal, useConfirm } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { isStateRole } from "../lib/roles.js";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import { useGeo } from "../components/ui/GeoSelect.jsx";

// Every Amrut Varg, one row each.
//
// Vargs are records in the `vargs` table and this is the list for them. The
// wording around them — heading, statistics, atlas, search and card labels — is
// a single configuration reached through Section settings, rather than mixed in
// among these rows.

const fmtStamp = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "—");

// Organiser registrations publish themselves; this is the post-publication
// moderation that replaced the old approval queue.
const LISTING = {
  PUBLISHED: { label: "Live", tone: "ok" },
  UNPUBLISHED: { label: "Unpublished", tone: "neutral" },
  FLAGGED: { label: "Flagged", tone: "bad" },
};
const MODERATE_COPY = {
  publish: { title: "Publish listing", verb: "Publish", done: "Listing published" },
  unpublish: { title: "Unpublish listing", verb: "Unpublish", done: "Listing taken down" },
  flag: { title: "Flag listing", verb: "Flag", done: "Listing flagged and hidden" },
};

export default function VargsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [vibhag, setVibhag] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [moderating, setModerating] = useState(null); // { row, action }
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const { user } = useAdminAuth();
  const state = isStateRole(user?.role);
  const debouncedSearch = useDebounce(search);
  const { mutate, loading: saving } = useMutation();
  const confirm = useConfirm();

  // Division options come from the Vibhag master, so the filter cannot offer a
  // division the masters no longer carry.
  const { rows: vibhagRows } = useGeo("vibhags");

  const { data, meta, loading, error, refetch } = useList(
    "/admin/vargs",
    { page, limit, search: debouncedSearch, vibhag, status, source },
    [page, limit, debouncedSearch, vibhag, status, source]
  );

  function startModeration(row, action) {
    setReason(action === "flag" ? "" : row.flag_reason || "");
    setReasonError("");
    setModerating({ row, action });
  }

  async function moderate() {
    const { row, action } = moderating;
    if (action === "flag" && reason.trim().length < 5) {
      setReasonError("Give a reason of at least 5 characters");
      return;
    }
    await mutate(async () => {
      await api.post(`/admin/vargs/${row.id}/moderate`, { action, reason: reason.trim() });
      toast.success(MODERATE_COPY[action].done);
      setModerating(null);
      refetch();
    }).catch((err) => toast.error(errorMessage(err, "Could not update the listing")));
  }

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/vargs/${confirmId}`);
      toast.success("Amrut Varg moved to trash");
      setConfirmId(null);
      refetch();
    }).catch((err) => {
      setConfirmId(null);
      toast.error(errorMessage(err, "Could not delete that varg"));
    });
  }

  // Active is the one flag worth flipping without opening the whole record.
  //
  // PUT replaces the record, so the re-read row is sent back whole with only
  // is_active changed. Listing the fields individually, as this used to, meant
  // every field added later was silently blanked by a toggle — the village and
  // the resource URL were both lost that way.
  function toggleActive(row) {
    const activating = !row.is_active;
    const name = row.school_name || row.district_mr;
    confirm({
      title: activating ? "Activate Amrut Varg" : "Deactivate Amrut Varg",
      message: `${activating ? "Activate" : "Deactivate"} "${name}"?`,
      subMessage: activating
        ? "It will be listed on the website again."
        : "It will be hidden from the website. You can activate it again at any time.",
      tone: activating ? "primary" : "warning",
      confirmLabel: activating ? "Activate" : "Deactivate",
      errorText: "Could not change the varg status",
      onConfirm: async () => {
        const { data: d } = await api.get(`/admin/vargs/${row.id}`);
        await api.put(`/admin/vargs/${row.id}`, {
          ...d,
          // Columns the write schema does not accept.
          id: undefined, created_at: undefined, updated_at: undefined, deleted_at: undefined,
          // Nullable columns the schema expects as strings or ids.
          vibhag_en: d.vibhag_en || "", district_en: d.district_en || "",
          taluka: d.taluka || "", village: d.village || "",
          varg_name: d.varg_name || "", coordinator_name: d.coordinator_name || "",
          resource_url: d.resource_url || "",
          enrollment_count: d.enrollment_count || 0,
          display_order: d.display_order || 0,
          is_active: activating,
        });
        toast.success(`Amrut Varg ${activating ? "activated" : "deactivated"}`);
        refetch();
      },
    });
  }

  const columns = [
    {
      key: "district_mr", label: "District",
      render: (v, row) => (
        <>
          <span className="td-bold">{v}</span>
          <span className="a-row-sub">{row.vibhag_mr}</span>
        </>
      ),
    },
    { key: "school_name", label: "School / Location", className: "td-truncate" },
    { key: "taluka", label: "Taluka", render: (v) => v || <span className="td-muted">—</span> },
    { key: "enrollment_count", label: "Enrolled", className: "td-muted a-tabular" },
    {
      key: "status", label: "Listing",
      render: (v, row) => (
        <>
          <Badge tone={LISTING[v]?.tone}>{LISTING[v]?.label || v}</Badge>
          {row.source === "organizer" && <span className="a-row-sub">Self-published</span>}
          {v === "FLAGGED" && row.flag_reason && <span className="a-row-sub" title={row.flag_reason}>{row.flag_reason}</span>}
        </>
      ),
    },
    {
      key: "is_active", label: "Active",
      render: (v, row) => <Switch on={v} onToggle={() => toggleActive(row)} />,
    },
    { key: "updated_at", label: "Updated", render: (v) => <span className="a-text-sm">{fmtStamp(v)}</span> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search vargs…"
               value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={vibhag} onChange={(e) => { setVibhag(e.target.value); setPage(1); }}>
        <option value="">All divisions</option>
        {vibhagRows.map((v) => <option key={v.id} value={v.name_mr}>{v.name_mr}</option>)}
      </select>
      <select className="a-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All listings</option>
        <option value="PUBLISHED">Live</option>
        <option value="FLAGGED">Flagged</option>
        <option value="UNPUBLISHED">Unpublished</option>
      </select>
      <select className="a-select" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
        <option value="">Any source</option>
        <option value="organizer">Self-published by organisers</option>
        <option value="admin">Added by staff</option>
      </select>
      <div className="a-toolbar-right">
        {state && (
          <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/vargs/settings")}>
            <Settings size={16} /> Section settings
          </button>
        )}
        <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/vargs/new")}>
          <Plus size={16} /> Add Amrut Varg
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Amrut Varg</h1>
          <p className="a-page-desc">
            Every active class across Maharashtra, with its division, district and school.
            Section settings holds the heading, statistics and labels that wrap them.
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
          <>
            <button className="a-action-btn" onClick={() => navigate(`/admin/vargs/${row.id}`)} title="View">
              <Eye size={15} />
            </button>
            <button className="a-action-btn" onClick={() => navigate(`/admin/vargs/${row.id}/edit`)} title="Edit">
              <Pencil size={15} />
            </button>
            {row.status === "PUBLISHED" ? (
              <>
                <button className="a-action-btn" onClick={() => startModeration(row, "flag")} title="Flag for correction">
                  <Flag size={15} />
                </button>
                <button className="a-action-btn" onClick={() => startModeration(row, "unpublish")} title="Unpublish">
                  <EyeOff size={15} />
                </button>
              </>
            ) : (
              <button className="a-action-btn" onClick={() => startModeration(row, "publish")} title="Publish">
                <CheckCircle2 size={15} />
              </button>
            )}
            <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete">
              <Trash2 size={15} />
            </button>
          </>
        )}
      />

      <Modal
        open={!!moderating}
        onClose={() => setModerating(null)}
        title={moderating ? MODERATE_COPY[moderating.action].title : ""}
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setModerating(null)}>Cancel</button>
            <button className="a-btn a-btn-primary" onClick={moderate} disabled={saving}>
              {moderating ? MODERATE_COPY[moderating.action].verb : ""}
            </button>
          </>
        }
      >
        {moderating && (
          <>
            <p><strong>{moderating.row.school_name}</strong> · {moderating.row.district_mr}</p>
            <p className="a-text-muted a-text-sm">
              {moderating.action === "publish"
                ? "It will be listed on the public directory again."
                : "It will be removed from the public directory straight away. Nothing is deleted."}
            </p>
            {moderating.action === "flag" && (
              <div className={`a-field ${reasonError ? "has-error" : ""}`}>
                <label className="a-label a-label-required">Reason</label>
                <textarea className="a-input a-textarea" rows={3} maxLength={500} value={reason}
                          placeholder="e.g. Venue address is incomplete"
                          onChange={(e) => { setReason(e.target.value); setReasonError(""); }} />
                {reasonError && <span className="a-field-error">{reasonError}</span>}
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete Amrut Varg"
        message="Delete this varg?"
        subMessage="It is removed from the website and moved to the trash. It can be restored later."
      />
    </>
  );
}
