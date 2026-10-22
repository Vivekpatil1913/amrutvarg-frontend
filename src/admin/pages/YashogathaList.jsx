import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Eye, Settings, Star, Clapperboard } from "lucide-react";
import { api } from "../api/client.js";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { storyCover } from "../lib/siteImages.js";

// Every yashogatha, one row each.
//
// Stories are records in the `stories` table and this is the list for them. The
// wording around them — heading, labels, disclaimer — is a single configuration
// reached through Section settings, rather than mixed in among these rows.

const CATEGORIES = [
  "personality", "confidence", "communication", "leadership",
  "creativity", "discipline", "learning", "social", "community",
];

const fmtStamp = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "—");

export default function YashogathaList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const debouncedSearch = useDebounce(search);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/stories",
    { page, limit, search: debouncedSearch, category, published },
    [page, limit, debouncedSearch, category, published]
  );

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/stories/${confirmId}`);
      toast.show("Deleted", "ok");
      setConfirmId(null);
      refetch();
    });
  }

  // Published and Featured are the two flags worth flipping without opening the
  // whole story, so they toggle from the row. The record is re-read first so a
  // partial row never overwrites the rest of the story.
  async function toggle(row, field) {
    await mutate(async () => {
      const { data: d } = await api.get(`/admin/stories/${row.id}`);
      await api.put(`/admin/stories/${row.id}`, {
        slug: d.slug, category: d.category,
        title_mr: d.title_mr, title_en: d.title_en || "",
        short_mr: d.short_mr || "", short_en: d.short_en || "",
        image_key: d.image_key, image_media_id: d.image_media_id ?? null,
        image_url: d.image_url || "",
        content: d.content || {},
        featured: field === "featured" ? !d.featured : d.featured,
        published: field === "published" ? !d.published : d.published,
        display_order: d.display_order || 0,
      });
      refetch();
    });
  }

  const columns = [
    {
      key: "image_url", label: "Cover",
      // An uploaded photograph first, then a bundled programme photo; a story
      // with neither draws its own motif on the site.
      render: (v, row) => {
        const src = storyCover(row);
        return (
          <span className="a-thumb-sm">
            {src ? <img src={src} alt="" loading="lazy" /> : <span className="a-text-muted a-text-xs">Artwork</span>}
          </span>
        );
      },
    },
    {
      key: "title_mr", label: "Yashogatha",
      render: (v, row) => (
        <>
          <span className="td-bold">{v}</span>
          {row.title_en && <span className="a-row-sub">{row.title_en}</span>}
        </>
      ),
    },
    { key: "category", label: "Category", render: (v) => <Badge tone="neutral">{v}</Badge> },
    {
      key: "featured", label: "Featured",
      render: (v, row) => (
        <button type="button" className="a-action-btn"
                title={v ? "Featured — click to unfeature" : "Not featured — click to feature"}
                onClick={() => toggle(row, "featured")}>
          <Star size={15} style={{ fill: v ? "currentColor" : "none", color: v ? "var(--a-warn)" : "var(--a-muted)" }} />
        </button>
      ),
    },
    {
      key: "published", label: "Published",
      render: (v, row) => <Switch on={v} onToggle={() => toggle(row, "published")} />,
    },
    { key: "updated_at", label: "Updated", render: (v) => <span className="a-text-sm">{fmtStamp(v)}</span> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search yashogatha…"
               value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="a-select" value={published} onChange={(e) => { setPublished(e.target.value); setPage(1); }}>
        <option value="">All statuses</option>
        <option value="true">Published</option>
        <option value="false">Draft</option>
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/yashogatha/settings")}>
          <Settings size={16} /> Section settings
        </button>
        {/* Video stories live in the Videos & Reels module rather than in a
            second video library of their own. Without this button an editor
            standing on the Yashogatha screen has no way of knowing that. */}
        <button className="a-btn a-btn-ghost" onClick={() => navigate("/admin/videos/new?category=success")}>
          <Clapperboard size={16} /> Add video story
        </button>
        <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/yashogatha/new")}>
          <Plus size={16} /> Add Yashogatha
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Yashogatha</h1>
          <p className="a-page-desc">
            Each student's story, with its cover, summary and body. Section settings holds
            the heading, labels and disclaimer that wrap them.
          </p>
          <p className="a-page-desc">
            Video stories are managed under{" "}
            <Link className="a-view-link" to="/admin/videos?category=success">
              Content › Videos &amp; Reels
            </Link>{" "}
            — any video filed under the <strong>Success story</strong> category appears in the
            Yashogatha section on the website, as an upload or a YouTube link.
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
            <button className="a-action-btn" onClick={() => navigate(`/admin/yashogatha/${row.id}`)} title="View">
              <Eye size={15} />
            </button>
            <button className="a-action-btn" onClick={() => navigate(`/admin/yashogatha/${row.id}/edit`)} title="Edit">
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
        title="Delete yashogatha"
        message="Delete this story?"
        subMessage="It is removed from the list and from the website. The record is retained."
      />
    </>
  );
}
