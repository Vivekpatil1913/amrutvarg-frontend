import { useRef, useState } from "react";
import { Upload, Trash2, Search, Image } from "lucide-react";
import { useList, useMutation } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { Pager } from "../components/ui/Pager.jsx";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const API_BASE = import.meta.env.VITE_CMS_API?.replace("/api/v1", "") || "http://localhost:4000";

export default function Media() {
  const toast = useToast();
  const fileRef = useRef();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: deleting } = useMutation();

  const { data, meta, loading, refetch } = useList(
    "/admin/media",
    { page, limit: 25, search },
    [page, search]
  );

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("alt_text", "");
      try {
        await api.upload("/admin/media/upload", fd);
      } catch (err) {
        toast.show(err.message, "bad");
      }
    }
    setUploading(false);
    fileRef.current.value = "";
    refetch();
    toast.show("Upload complete", "ok");
  }

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/media/${confirmId}`);
      toast.show("Asset removed", "ok");
      setConfirmId(null);
      refetch();
    });
  }

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Media Library</h1>
          <p className="a-page-desc">Images and uploaded assets</p>
        </div>
        <button
          className="a-btn a-btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={16} /> {uploading ? "Uploading…" : "Upload images"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
      </div>

      <div className="a-card">
        <div className="a-toolbar">
          <div className="a-search-wrap">
            <Search className="a-search-icon" size={16} />
            <input className="a-search" placeholder="Search media…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? (
          <div className="a-spinner">
            <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            Loading…
          </div>
        ) : data.length === 0 ? (
          <div className="a-empty-state">
            <Image className="a-empty-icon" />
            <p className="a-empty-title">No media files yet</p>
            <p className="a-text-muted a-text-sm">Upload images using the button above</p>
          </div>
        ) : (
          <>
            <div style={{ padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))", gap: "0.75rem" }}>
              {data.map((asset) => (
                <div key={asset.id} style={{ position: "relative", borderRadius: "0.75rem", overflow: "hidden", border: "1px solid var(--a-line)", background: "var(--a-canvas-subtle)" }}>
                  <img
                    src={`${API_BASE}${asset.url}`}
                    alt={asset.alt_text || asset.original_name}
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                  <div style={{ padding: "0.375rem 0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.6875rem", color: "var(--a-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {asset.original_name}
                    </span>
                    <button className="a-action-btn danger" style={{ width: "1.5rem", height: "1.5rem" }} onClick={() => setConfirmId(asset.id)} title="Remove">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pager page={meta?.page || 1} pageSize={meta?.pageSize || 25} total={meta?.total || 0} totalPages={meta?.totalPages || 1} onPage={setPage} />
          </>
        )}
      </div>

      <ConfirmModal open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={handleDelete} loading={deleting} title="Remove Asset" message="Remove this media asset?" subMessage="The file will be soft-deleted and can be restored." />
    </>
  );
}
