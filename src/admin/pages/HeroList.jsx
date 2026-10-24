import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Eye, Rocket, Undo2, Search, RefreshCw } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import { BUNDLED } from "../lib/siteImages.js";

// Listing page for the homepage hero.
//
// hero_section is constrained to a single row (CHECK (id = 1)) and the API
// creates it on first access, so there is exactly one configuration and the
// table shows exactly one record. Adding a second is refused by the database,
// which is why the Add button is disabled while that record exists rather than
// offering an action that could not succeed.

const fmtStamp = (v) => (v ? new Date(v).toLocaleString("en-IN") : "—");

export default function HeroList() {
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
    api.get("/admin/hero")
      .then((res) => {
        const d = res.data;
        const draft = d.draft ?? {};
        setRow({
          id: "homepage",
          heading: draft.text?.title_mr ?? "",
          heading_en: draft.text?.title_en ?? "",
          subtitle: draft.text?.tagline_mr ?? "",
          image: draft.images?.main?.url ?? "",
          ctas: (draft.ctas ?? []).filter((c) => c.enabled !== false).length,
          stats: (draft.stats ?? []).filter((s) => s.enabled !== false).length,
          status: d.has_unpublished_changes ? "draft" : "published",
          published_at: d.published_at,
          updated_at: d.updated_at,
        });
      })
      .catch((err) => setError(err.message || "Could not load the hero section"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Publishing from the list puts the saved draft live without opening the form.
  async function publish() {
    await mutate(async () => {
      try {
        await api.post("/admin/hero/publish");
        toast.success("Published — the website is updated");
        load();
      } catch (err) {
        const first = err.details?.[0];
        toast.error(errorMessage(err));
        throw err;
      }
    }).catch(() => {});
  }

  async function discard() {
    await mutate(async () => {
      await api.post("/admin/hero/discard");
      toast.show("Draft reset to the published version", "ok");
      setConfirmDiscard(false);
      load();
    }).catch((err) => {
      setConfirmDiscard(false);
      toast.error(errorMessage(err, "Could not discard the draft"));
    });
  }

  const rows = useMemo(() => {
    if (!row) return [];
    if (status && row.status !== status) return [];
    const q = search.trim().toLowerCase();
    if (!q) return [row];
    return [row.heading, row.heading_en, row.subtitle].join(" ").toLowerCase().includes(q) ? [row] : [];
  }, [row, search, status]);

  const meta = { total: rows.length, page: 1, pageSize: Math.max(rows.length, 1), totalPages: 1 };

  const columns = [
    {
      key: "image", label: "Main Image",
      render: (v) => (
        <span className="a-thumb-sm">
          <img src={v || BUNDLED.hero.main} alt="" loading="lazy" />
        </span>
      ),
    },
    {
      key: "heading", label: "Hero Section",
      render: (v, r) => (
        <>
          <span className="td-bold">{v || <em className="a-text-muted">No heading</em>}</span>
          {r.heading_en && <span className="a-row-sub">{r.heading_en}</span>}
        </>
      ),
    },
    {
      key: "subtitle", label: "Subtitle",
      render: (v) => v ? <span className="td-truncate">{v}</span> : <span className="td-muted">—</span>,
    },
    { key: "ctas", label: "CTA Buttons", render: (v) => <span className="a-tabular">{v}</span> },
    { key: "stats", label: "Statistics", render: (v) => <span className="a-tabular">{v}</span> },
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
        <input className="a-search" placeholder="Search hero sections…"
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
          onClick={() => navigate("/admin/hero/edit")}
          disabled={!!row}
          title={row ? "The home page takes one hero section — edit the existing one" : undefined}
        >
          <Plus size={16} /> Add Hero Section
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Amrut Varg Hero Sections</h1>
          <p className="a-page-desc">
            Manage homepage hero content, images, statistics, CTA buttons and quick navigation.
          </p>
        </div>
      </div>

      {row && (
        <div className="a-notice a-notice-info">
          <div className="a-notice-body">
            <p className="a-notice-title">The home page shows one hero section</p>
            <p>
              That record is listed below. Add Hero Section is disabled because a second
              one cannot exist — edit this one instead.
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
            <button className="a-action-btn" onClick={() => navigate("/admin/hero/view")} title="View">
              <Eye size={15} />
            </button>
            <button className="a-action-btn" onClick={() => navigate("/admin/hero/edit")} title="Edit">
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
        confirmLabel="Discard"
        loadingLabel="Discarding…"
        message="Throw away the draft and start again from the published version?"
        subMessage="The live website is not affected."
      />
    </>
  );
}
