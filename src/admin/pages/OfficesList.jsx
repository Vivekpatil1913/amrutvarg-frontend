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

// One office per district. Adding and editing happen on their own page — see
// OfficeForm.jsx.
//
// The table shows what has actually been filled in rather than a row of ticks:
// an office that has only a Collector's name is a normal, useful record, and
// the point of the "Recorded" column is to make the gaps visible.

const fmtStamp = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "—");

const DETAILS = [
  ["collector_name", "Collector"],
  ["address", "Address"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["hours", "Hours"],
  ["website_url", "Website"],
  ["map_url", "Map"],
];

export default function OfficesList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/offices",
    { page, limit, search: debouncedSearch },
    [page, limit, debouncedSearch]
  );

  async function handleDelete() {
    await mutate(async () => {
      try {
        await api.del(`/admin/offices/${confirmId}`);
        toast.success("District office moved to trash");
        setConfirmId(null);
        refetch();
      } catch (err) {
        toast.error(errorMessage(err, "Could not delete that office"));
        setConfirmId(null);
        throw err;
      }
    }).catch(() => {});
  }

  const columns = [
    {
      key: "district_mr",
      label: "District",
      render: (v, row) => (
        <>
          <span className="td-bold">{v}</span>
          {row.district_en && <span className="a-row-sub">{row.district_en}</span>}
        </>
      ),
    },
    {
      key: "office_name_mr",
      label: "Office",
      render: (v, row) => v || row.office_name_en || <span className="td-muted">—</span>,
    },
    {
      key: "collector_name",
      label: "Collector",
      render: (v, row) => (v
        ? <>
            <span>{v}</span>
            {row.collector_designation && <span className="a-row-sub">{row.collector_designation}</span>}
          </>
        : <span className="td-muted">Not recorded</span>),
    },
    {
      key: "address",
      label: "Recorded",
      render: (_v, row) => {
        const filled = DETAILS.filter(([k]) => row[k]);
        return (
          <span className="a-text-xs a-text-muted">
            {filled.length ? filled.map(([, label]) => label).join(", ") : "Nothing yet"}
          </span>
        );
      },
    },
    {
      key: "is_active",
      label: "Status",
      render: (v) => <Badge tone={v ? "ok" : "neutral"}>{v ? "Published" : "Hidden"}</Badge>,
    },
    { key: "updated_at", label: "Updated", render: (v) => <span className="a-text-sm">{fmtStamp(v)}</span> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search by district, office or Collector…"
               value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/offices/new")}>
          <Plus size={16} /> Add District Office
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">District Offices</h1>
          <p className="a-page-desc">
            Official office details shown on a district&apos;s contact page. Every field is optional —
            record only what has been verified, and leave the rest empty. Empty fields are not shown
            to visitors.
          </p>
        </div>
      </div>

      {!loading && !error && data?.length === 0 && (
        <div className="a-notice">
          <div className="a-notice-body">
            <p className="a-notice-title">No district offices recorded yet</p>
            <p>
              Until an office is added, a district&apos;s contact page shows its Amrut Varg team only.
              Nothing is invented or filled in automatically.
            </p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns} rows={data} loading={loading} error={error} meta={meta}
        onPage={setPage} onPageSize={(n) => { setLimit(n); setPage(1); }} toolbar={toolbar}
        actions={(row) => (
          <>
            {row.website_url && (
              <a className="a-action-btn" href={row.website_url} target="_blank"
                 rel="noopener noreferrer" title="Open the official website">
                <ExternalLink size={15} />
              </a>
            )}
            <button className="a-action-btn" onClick={() => navigate(`/admin/offices/${row.id}/edit`)} title="Edit">
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
        title="Delete District Office"
        message="Delete this office record?"
        subMessage="It will be moved to the trash and can be restored later. Until then the district's contact page shows its Amrut Varg team only."
      />
    </>
  );
}
