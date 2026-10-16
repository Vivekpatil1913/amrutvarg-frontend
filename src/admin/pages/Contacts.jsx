import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { useGeo } from "../components/ui/GeoSelect.jsx";

// Every district contact, one row each. Adding and editing happen on their own
// page — see ContactForm.jsx.

export default function Contacts() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("");
  const debouncedSearch = useDebounce(search);
  const [roles, setRoles] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/contacts",
    { page, limit, search: debouncedSearch, division },
    [page, limit, debouncedSearch, division]
  );

  // Role labels come from the Directory section, so the table cannot show a
  // role the site could not put a label on.
  useEffect(() => {
    api.get("/admin/contacts/roles")
      .then((res) => setRoles(res.data.roles ?? []))
      .catch(() => toast.show("Could not load the role list", "bad"));
  }, [toast]);

  // Division options for the filter.
  const { rows: divisionRows } = useGeo("vibhags");

  const roleLabel = (v) => roles.find((r) => r.value === v)?.label || v;

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/contacts/${confirmId}`);
      toast.show("Deleted", "ok");
      setConfirmId(null);
      refetch();
    });
  }

  const columns = [
    { key: "name", label: "Name", render: (v) => <span className="td-bold">{v}</span> },
    { key: "role", label: "Role", render: (v) => <Badge tone="neutral">{roleLabel(v)}</Badge> },
    { key: "division_mr", label: "Division" },
    { key: "phone", label: "Phone", render: (v) => v || <span className="td-muted">—</span> },
    { key: "email", label: "Email", render: (v) => v ? <span className="td-truncate">{v}</span> : <span className="td-muted">—</span> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search contacts…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={division} onChange={(e) => { setDivision(e.target.value); setPage(1); }}>
        <option value="">All divisions</option>
        {divisionRows.map((d) => <option key={d.id} value={d.name_mr}>{d.name_mr}</option>)}
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/contacts/new")}>
          <Plus size={16} /> Add new
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">District Contacts</h1>
          <p className="a-page-desc">Regional team contacts across Maharashtra</p>
        </div>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} error={error} meta={meta} onPage={setPage} onPageSize={(n) => { setLimit(n); setPage(1); }} toolbar={toolbar}
        actions={(row) => (
          <>
            <button className="a-action-btn" onClick={() => navigate(`/admin/contacts/${row.id}/edit`)} title="Edit"><Pencil size={15} /></button>
            <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete"><Trash2 size={15} /></button>
          </>
        )}
      />
      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete Contact"
        message="Delete this contact?"
      />
    </>
  );
}
