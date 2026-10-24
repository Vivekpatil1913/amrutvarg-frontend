import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Eye, Settings } from "lucide-react";
import { api } from "../api/client.js";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { ConfirmModal, useConfirm } from "../components/ui/Modal.jsx";
import { Switch } from "../components/ui/Badge.jsx";
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

export default function VargsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [vibhag, setVibhag] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const debouncedSearch = useDebounce(search);
  const { mutate, loading: saving } = useMutation();
  const confirm = useConfirm();

  // Division options come from the Vibhag master, so the filter cannot offer a
  // division the masters no longer carry.
  const { rows: vibhagRows } = useGeo("vibhags");

  const { data, meta, loading, error, refetch } = useList(
    "/admin/vargs",
    { page, limit, search: debouncedSearch, vibhag },
    [page, limit, debouncedSearch, vibhag]
  );

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
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/vargs/settings")}>
          <Settings size={16} /> Section settings
        </button>
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
        title="Delete Amrut Varg"
        message="Delete this varg?"
        subMessage="It is removed from the website and moved to the trash. It can be restored later."
      />
    </>
  );
}
