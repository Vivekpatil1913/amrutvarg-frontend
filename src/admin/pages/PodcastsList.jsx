import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Eye, ExternalLink, Mic } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { PODCAST_CATEGORIES, labelOf } from "../lib/mediaContent.js";
import { mediaSrc, formatDuration, audioEmbed } from "../../services/mediaUrl.js";

// Every podcast episode, one row each. Adding and editing happen on their own
// page — see PodcastForm.jsx.

const CMS_BASE = import.meta.env.VITE_CMS_API || "http://localhost:4000/api/v1";

const PROVIDER_LABEL = {
  file: "Uploaded file",
  spotify: "Spotify",
  link: "External link",
};

// date columns arrive as 'YYYY-MM-DD'. Split rather than parse: through Date
// they would be read as UTC midnight and shown a day early west of Greenwich.
const fmtDate = (v) => {
  if (!v) return "";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};

const fmtStamp = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "—");

function ViewRow({ label, children, empty }) {
  return (
    <div className="a-view-row">
      <span className="a-view-label">{label}</span>
      <div className={`a-view-value${empty ? " is-empty" : ""}`}>{empty ? "—" : children}</div>
    </div>
  );
}

export default function PodcastsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState("");
  const debouncedSearch = useDebounce(search);
  const [viewRow, setViewRow] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/podcasts",
    { page, limit, search: debouncedSearch, category, published },
    [page, limit, debouncedSearch, category, published]
  );

  async function togglePublished(row) {
    await mutate(async () => {
      try {
        await api.patch(`/admin/podcasts/${row.id}/publish`, { published: !row.published });
        toast.show(row.published ? "Unpublished" : "Published", "ok");
        refetch();
      } catch (err) {
        toast.show(err.message || "Could not change the publish status", "bad");
        throw err;
      }
    }).catch(() => {});
  }

  async function handleDelete() {
    await mutate(async () => {
      try {
        await api.del(`/admin/podcasts/${confirmId}`);
        toast.show("Deleted", "ok");
        setConfirmId(null);
        refetch();
      } catch (err) {
        toast.show(err.message || "Could not delete that episode", "bad");
        setConfirmId(null);
        throw err;
      }
    }).catch(() => {});
  }

  const coverFor = (row) => mediaSrc(CMS_BASE, row.cover_url);

  const columns = [
    {
      key: "cover_url",
      label: "Cover",
      render: (_v, row) => (
        <span className="a-thumb-cell">
          {coverFor(row) ? <img src={coverFor(row)} alt="" loading="lazy" /> : <Mic size={16} />}
        </span>
      ),
    },
    {
      key: "title_mr",
      label: "Title",
      render: (v, row) => (
        <>
          <span className="td-bold td-truncate">{v}</span>
          {row.title_en && <span className="a-row-sub">{row.title_en}</span>}
        </>
      ),
    },
    {
      key: "duration_seconds",
      label: "Duration",
      render: (v) => (v ? <span className="a-tabular">{formatDuration(v)}</span> : <span className="td-muted">—</span>),
    },
    {
      key: "source_type",
      label: "Source",
      render: (v, row) => (
        <span className="a-text-sm">
          {v === "upload" ? "Uploaded file" : PROVIDER_LABEL[row.provider] || "External URL"}
        </span>
      ),
    },
    {
      key: "published",
      label: "Status",
      render: (v, row) => (
        <span className="a-flex a-gap-2" style={{ alignItems: "center" }}>
          <Switch on={v} onToggle={() => togglePublished(row)} />
          <span className="a-text-xs a-text-muted">{v ? "Published" : "Draft"}</span>
        </span>
      ),
    },
    {
      key: "publish_date",
      label: "Publish date",
      render: (v) => (v ? fmtDate(v) : <span className="td-muted">—</span>),
    },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search podcasts…"
               value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
        <option value="">All categories</option>
        {PODCAST_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <select className="a-select" value={published} onChange={(e) => { setPublished(e.target.value); setPage(1); }}>
        <option value="">All statuses</option>
        <option value="true">Published</option>
        <option value="false">Draft</option>
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/podcasts/new")}>
          <Plus size={16} /> Add Podcast
        </button>
      </div>
    </>
  );

  const viewFile = viewRow && viewRow.source_type === "upload" ? mediaSrc(CMS_BASE, viewRow.media_url) : "";
  const viewEmbed = viewRow && viewRow.source_type === "url" ? audioEmbed(viewRow.external_url) : null;

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Podcasts</h1>
          <p className="a-page-desc">
            Audio episodes for the website&apos;s media page. Only published episodes are visible to visitors.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns} rows={data} loading={loading} error={error} meta={meta}
        onPage={setPage} onPageSize={(n) => { setLimit(n); setPage(1); }} toolbar={toolbar}
        actions={(row) => (
          <>
            <button className="a-action-btn" onClick={() => setViewRow(row)} title="View">
              <Eye size={15} />
            </button>
            <button className="a-action-btn" onClick={() => navigate(`/admin/podcasts/${row.id}/edit`)} title="Edit">
              <Pencil size={15} />
            </button>
            <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete">
              <Trash2 size={15} />
            </button>
          </>
        )}
      />

      <Modal
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        title="Podcast Details"
        size="lg"
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setViewRow(null)}>Close</button>
            <button className="a-btn a-btn-primary" onClick={() => navigate(`/admin/podcasts/${viewRow.id}/edit`)}>
              <Pencil size={15} /> Edit
            </button>
          </>
        }
      >
        {viewRow && (
          <>
            <div className="a-view-tags">
              <Badge tone={viewRow.published ? "ok" : "neutral"}>{viewRow.published ? "Published" : "Draft"}</Badge>
              <Badge tone="neutral">{labelOf(PODCAST_CATEGORIES, viewRow.category)}</Badge>
              {viewRow.deleted_at && <Badge tone="bad">In trash</Badge>}
            </div>

            <div className="a-view-preview">
              {viewFile && <audio src={viewFile} controls style={{ width: "100%" }} />}
              {viewEmbed?.mode === "audio" && <audio src={viewEmbed.src} controls style={{ width: "100%" }} />}
              {viewEmbed?.mode === "iframe" && (
                <iframe
                  src={viewEmbed.src}
                  title={viewRow.title_mr}
                  loading="lazy"
                  allow="clipboard-write; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                  style={{ height: 152 }}
                />
              )}
              {viewEmbed?.mode === "link" && (
                <p className="a-text-sm a-text-muted">
                  This address cannot be played on the page. Visitors are offered a listening link instead.
                </p>
              )}
            </div>

            <div className="a-view-list">
              <ViewRow label="Title (Marathi)" empty={!viewRow.title_mr}>
                <span className="a-view-strong">{viewRow.title_mr}</span>
              </ViewRow>
              <ViewRow label="Title (English)" empty={!viewRow.title_en}>{viewRow.title_en}</ViewRow>
              <ViewRow label="Summary (Marathi)" empty={!viewRow.desc_mr}>{viewRow.desc_mr}</ViewRow>
              <ViewRow label="Summary (English)" empty={!viewRow.desc_en}>{viewRow.desc_en}</ViewRow>
              <ViewRow label="Source">
                {viewRow.source_type === "upload" ? "Uploaded file" : PROVIDER_LABEL[viewRow.provider] || "External URL"}
              </ViewRow>
              <ViewRow label="Address" empty={!viewRow.external_url && !viewRow.media_url}>
                {viewRow.external_url ? (
                  <a className="a-view-link" href={viewRow.external_url} target="_blank" rel="noopener noreferrer">
                    {viewRow.external_url} <ExternalLink size={13} />
                  </a>
                ) : (
                  <span className="a-tabular">{viewRow.media_url}</span>
                )}
              </ViewRow>
              <ViewRow label="Duration" empty={!viewRow.duration_seconds}>
                {formatDuration(viewRow.duration_seconds)}
              </ViewRow>
              <ViewRow label="Publish date" empty={!viewRow.publish_date}>{fmtDate(viewRow.publish_date)}</ViewRow>
              <ViewRow label="Display order">{viewRow.display_order ?? 0}</ViewRow>
              <ViewRow label="Created" empty={!viewRow.created_at}>{fmtStamp(viewRow.created_at)}</ViewRow>
              <ViewRow label="Last updated" empty={!viewRow.updated_at}>{fmtStamp(viewRow.updated_at)}</ViewRow>
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete Podcast"
        message="Delete this episode?"
        subMessage="It is removed from the list and from the website. The record is retained."
      />
    </>
  );
}
