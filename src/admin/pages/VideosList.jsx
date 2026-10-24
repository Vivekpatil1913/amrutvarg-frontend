import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Search, Eye, ExternalLink, Film, Clapperboard,
} from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal, useConfirm } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import { CONTENT_TYPES, VIDEO_CATEGORIES, labelOf } from "../lib/mediaContent.js";
import { mediaSrc, formatDuration, videoEmbed } from "../../services/mediaUrl.js";

// Every video and reel, one row each. Adding and editing happen on their own
// page — see VideoForm.jsx.
//
// The Status column flips published on and off in place: it is the one change
// worth making without opening a record, and it is the change an editor makes
// most often.

const CMS_BASE = import.meta.env.VITE_CMS_API || "http://localhost:4000/api/v1";

const fmtStamp = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "—");

const PROVIDER_LABEL = {
  file: "Uploaded file",
  youtube: "YouTube",
  vimeo: "Vimeo",
  instagram: "Instagram",
  link: "External link",
};

function ViewRow({ label, children, empty }) {
  return (
    <div className="a-view-row">
      <span className="a-view-label">{label}</span>
      <div className={`a-view-value${empty ? " is-empty" : ""}`}>{empty ? "—" : children}</div>
    </div>
  );
}

export default function VideosList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [params, setParams] = useSearchParams();
  // Seeded from the URL so a link can open this list already scoped — the
  // Yashogatha screen points here at the success stories.
  const [category, setCategory] = useState(() => {
    const want = params.get("category");
    return VIDEO_CATEGORIES.some((c) => c.value === want) ? want : "";
  });
  const [type, setType] = useState("");
  const [published, setPublished] = useState("");
  const debouncedSearch = useDebounce(search);
  const [viewRow, setViewRow] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();
  const confirm = useConfirm();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/videos",
    { page, limit, search: debouncedSearch, type, category, published },
    [page, limit, debouncedSearch, type, category, published]
  );

  // Publishing is its own endpoint, so flipping a row never re-sends — and so
  // never re-validates — the whole record.
  function togglePublished(row) {
    const publishing = !row.published;
    confirm({
      title: publishing ? "Publish video" : "Unpublish video",
      message: publishing
        ? `Publish "${row.title_mr}" to the website?`
        : `Take "${row.title_mr}" off the website?`,
      subMessage: publishing
        ? "It will be visible to visitors straight away."
        : "It stays in the admin panel as a draft and can be published again.",
      tone: publishing ? "primary" : "warning",
      confirmLabel: publishing ? "Publish" : "Unpublish",
      errorText: "Could not change the publish status",
      onConfirm: async () => {
        await api.patch(`/admin/videos/${row.id}/publish`, { published: publishing });
        toast.success(publishing ? "Video published — now live on the website" : "Video unpublished — hidden from the website");
        refetch();
      },
    });
  }

  async function handleDelete() {
    await mutate(async () => {
      try {
        await api.del(`/admin/videos/${confirmId}`);
        toast.success("Video moved to trash");
        setConfirmId(null);
        refetch();
      } catch (err) {
        toast.error(errorMessage(err, "Could not delete that video"));
        setConfirmId(null);
        throw err;
      }
    }).catch(() => {});
  }

  const thumbFor = (row) => mediaSrc(CMS_BASE, row.thumbnail_url);

  const columns = [
    {
      key: "thumbnail_url",
      label: "Thumbnail",
      render: (_v, row) => (
        <span className="a-thumb-cell">
          {thumbFor(row)
            ? <img src={thumbFor(row)} alt="" loading="lazy" />
            : row.content_type === "reel" ? <Clapperboard size={16} /> : <Film size={16} />}
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
      key: "content_type",
      label: "Type",
      render: (v) => <Badge tone={v === "reel" ? "info" : "neutral"}>{labelOf(CONTENT_TYPES, v)}</Badge>,
    },
    { key: "category", label: "Category", render: (v) => labelOf(VIDEO_CATEGORIES, v) },
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
    { key: "created_at", label: "Created", render: (v) => <span className="a-text-sm">{fmtStamp(v)}</span> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search videos and reels…"
               value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
        <option value="">All types</option>
        {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <select className="a-select" value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); setParams(e.target.value ? { category: e.target.value } : {}, { replace: true }); }}>
        <option value="">All categories</option>
        {VIDEO_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <select className="a-select" value={published} onChange={(e) => { setPublished(e.target.value); setPage(1); }}>
        <option value="">All statuses</option>
        <option value="true">Published</option>
        <option value="false">Draft</option>
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/videos/new")}>
          <Plus size={16} /> Add Video/Reel
        </button>
      </div>
    </>
  );

  const viewEmbed = viewRow && viewRow.source_type === "url" ? videoEmbed(viewRow.external_url) : null;
  const viewFile = viewRow && viewRow.source_type === "upload" ? mediaSrc(CMS_BASE, viewRow.media_url) : "";

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Videos &amp; Reels</h1>
          <p className="a-page-desc">
            Video content for the website&apos;s media page. Only published items are visible to visitors.
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
            <button className="a-action-btn" onClick={() => navigate(`/admin/videos/${row.id}/edit`)} title="Edit">
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
        title="Video Details"
        size="lg"
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setViewRow(null)}>Close</button>
            <button className="a-btn a-btn-primary" onClick={() => navigate(`/admin/videos/${viewRow.id}/edit`)}>
              <Pencil size={15} /> Edit
            </button>
          </>
        }
      >
        {viewRow && (
          <>
            <div className="a-view-tags">
              <Badge tone={viewRow.published ? "ok" : "neutral"}>{viewRow.published ? "Published" : "Draft"}</Badge>
              <Badge tone={viewRow.content_type === "reel" ? "info" : "neutral"}>
                {labelOf(CONTENT_TYPES, viewRow.content_type)}
              </Badge>
              {viewRow.deleted_at && <Badge tone="bad">In trash</Badge>}
            </div>

            {/* The same renderer the public page uses, so what is previewed
                here is what a visitor would actually get. */}
            <div className="a-view-preview">
              {viewFile && <video src={viewFile} controls preload="metadata" />}
              {viewEmbed?.mode === "iframe" && (
                <iframe
                  src={viewEmbed.src}
                  title={viewRow.title_mr}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                />
              )}
              {viewEmbed?.mode === "video" && <video src={viewEmbed.src} controls preload="metadata" />}
              {viewEmbed?.mode === "link" && (
                <p className="a-text-sm a-text-muted">
                  This address cannot be embedded. Visitors are offered a link to open it instead.
                </p>
              )}
            </div>

            <div className="a-view-list">
              <ViewRow label="Title (Marathi)" empty={!viewRow.title_mr}>
                <span className="a-view-strong">{viewRow.title_mr}</span>
              </ViewRow>
              <ViewRow label="Title (English)" empty={!viewRow.title_en}>{viewRow.title_en}</ViewRow>
              <ViewRow label="Description (Marathi)" empty={!viewRow.desc_mr}>{viewRow.desc_mr}</ViewRow>
              <ViewRow label="Description (English)" empty={!viewRow.desc_en}>{viewRow.desc_en}</ViewRow>
              <ViewRow label="Category">{labelOf(VIDEO_CATEGORIES, viewRow.category)}</ViewRow>
              <ViewRow label="Source">
                {viewRow.source_type === "upload"
                  ? "Uploaded file"
                  : PROVIDER_LABEL[viewRow.provider] || "External URL"}
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
        title="Delete Video"
        message="Delete this video?"
        subMessage="It is removed from the website and moved to the trash. It can be restored later."
      />
    </>
  );
}
