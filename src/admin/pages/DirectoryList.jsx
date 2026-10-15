import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Eye, Rocket, Undo2, Search, RefreshCw } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

// Listing page for the District Directory page wording.
//
// directory_section is constrained to a single row (CHECK (id = 1)), so there
// is exactly one configuration and the table shows exactly one record — Add is
// disabled rather than offering an action the database would refuse.

const fmtStamp = (v) => (v ? new Date(v).toLocaleString("en-IN") : "—");

export default function DirectoryList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { mutate, loading: saving } = useMutation();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get("/admin/directory")
      .then((res) => {
        const d = res.data;
        const draft = d.draft ?? {};
        setRow({
          id: "directory",
          heading: draft.text?.title_mr ?? "",
          heading_en: draft.text?.title_en ?? "",
          badge: draft.text?.badge_mr ?? "",
          lead: draft.text?.lead_mr ?? "",
          roles: (draft.roles ?? []).length,
          featured: (draft.roles ?? []).filter((r) => r.featured).length,
          status: d.has_unpublished_changes ? "draft" : "published",
          published_at: d.published_at,
          updated_at: d.updated_at,
        });
      })
      .catch((err) => setError(err.message || "Could not load the Directory section"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function publish() {
    await mutate(async () => {
      try {
        await api.post("/admin/directory/publish");
        toast.show("Published — the website is updated", "ok");
        load();
      } catch (err) {
        const first = err.details?.[0];
        toast.show(first ? `${first.field}: ${first.message}` : err.message, "bad");
        throw err;
      }
    }).catch(() => {});
  }

  async function discard() {
    await mutate(async () => {
      await api.post("/admin/directory/discard");
      toast.show("Draft reset to the published version", "ok");
      setConfirmDiscard(false);
      load();
    });
  }

  const rows = useMemo(() => {
    if (!row) return [];
    if (status && row.status !== status) return [];
    const q = search.trim().toLowerCase();
    if (!q) return [row];
    return [row.heading, row.heading_en, row.badge, row.lead].join(" ").toLowerCase().includes(q) ? [row] : [];
  }, [row, search, status]);

  const meta = { total: rows.length, page: 1, pageSize: Math.max(rows.length, 1), totalPages: 1 };

  const columns = [
    {
      key: "heading", label: "Page",
      render: (v, r) => (
        <>
          <span className="td-bold">{v || <em className="a-text-muted">No heading</em>}</span>
          {r.heading_en && <span className="a-row-sub">{r.heading_en}</span>}
        </>
      ),
    },
    {
      key: "badge", label: "Top Label",
      render: (v) => v || <span className="td-muted">—</span>,
    },
    {
      key: "lead", label: "Lead",
      render: (v) => v ? <span className="td-truncate">{v}</span> : <span className="td-muted">—</span>,
    },
    { key: "roles", label: "Roles", render: (v) => <span className="a-tabular">{v}</span> },
    { key: "featured", label: "Featured", render: (v) => <span className="a-tabular">{v}</span> },
    {
      key: "status", label: "Status",
      render: (v) => v === "published"
        ? <Badge tone="ok">Published</Badge>
        : <Badge tone="info">Draft</Badge>,
    },
    { key: "updated_at", label: "Last Updated", render: (v) => <span className="a-text-sm">{fmtStamp(v)}</span> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search…"
               value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <select className="a-select" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-ghost" onClick={load} title="Reload from the server">
          <RefreshCw size={16} /> Refresh
        </button>
        <button
          className="a-btn a-btn-primary"
          onClick={() => navigate("/admin/directory/edit")}
          disabled={!!row}
          title={row ? "There is one District Directory page — edit the existing one" : undefined}
        >
          <Plus size={16} /> Add Section
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Directory Page</h1>
          <p className="a-page-desc">
            “District Coordinators / Managers” — heading, filter labels, role badges
            and links. The contact cards live under Content › District Contacts.
          </p>
        </div>
      </div>

      {row && (
        <div className="a-notice a-notice-info">
          <div className="a-notice-body">
            <p className="a-notice-title">This record is the page wording, not the people</p>
            <p>
              Add Section is disabled because a second one cannot exist. To add or edit
              a coordinator, use Content › District Contacts.
            </p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        meta={meta}
        onPage={() => {}}
        onPageSize={() => {}}
        toolbar={toolbar}
        actions={(r) => (
          <>
            <button className="a-action-btn" onClick={() => navigate("/admin/directory/view")} title="View">
              <Eye size={15} />
            </button>
            <button className="a-action-btn" onClick={() => navigate("/admin/directory/edit")} title="Edit">
              <Pencil size={15} />
            </button>
            {r.status === "draft" && (
              <>
                <button className="a-action-btn success" onClick={publish} disabled={saving} title="Publish">
                  <Rocket size={15} />
                </button>
                <button className="a-action-btn danger" onClick={() => setConfirmDiscard(true)} title="Discard draft">
                  <Undo2 size={15} />
                </button>
              </>
            )}
          </>
        )}
      />

      {!loading && !error && rows.length === 0 && (search || status) && (
        <div className="a-card"><div className="a-empty-state">
          <p className="a-empty-title">Nothing matches that filter</p>
          <button className="a-btn a-btn-secondary a-mt-1"
                  onClick={() => { setSearch(""); setStatus(""); }}>
            Clear filters
          </button>
        </div></div>
      )}

      <ConfirmModal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discard}
        loading={saving}
        title="Discard draft"
        message="Throw away the draft and start again from the published version?"
        subMessage="The live website is not affected."
      />
    </>
  );
}
