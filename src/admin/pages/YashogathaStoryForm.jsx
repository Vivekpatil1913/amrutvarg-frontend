import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, UploadCloud, X, ExternalLink } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import { STORY_PHOTO_OPTIONS, storyCover } from "../lib/siteImages.js";

// One yashogatha, edited on its own page.
//
// Stories are ordinary records in the `stories` table with their own endpoints;
// this page is a full-page editor for one of them, so a long story is written
// with room rather than inside a modal.

const CATEGORIES = [
  { value: "personality", label: "Personality" },
  { value: "confidence", label: "Confidence" },
  { value: "communication", label: "Communication" },
  { value: "leadership", label: "Leadership" },
  { value: "creativity", label: "Creativity" },
  { value: "discipline", label: "Discipline" },
  { value: "learning", label: "Learning" },
  { value: "social", label: "Social" },
  { value: "community", label: "Community" },
];

// The six parts every story is told in, in reading order.
const PARTS = ["intro", "challenge", "journey", "change", "lessons", "conclusion"];
const PART_LABEL = {
  intro: "Introduction",
  challenge: "The challenge",
  journey: "The journey",
  change: "What changed",
  lessons: "What it taught",
  conclusion: "Conclusion",
};

const MAX = { title: 300, short: 500, slug: 120, part: 2000 };

const emptyContent = () => ({
  mr: Object.fromEntries(PARTS.map((p) => [p, ""])),
  en: Object.fromEntries(PARTS.map((p) => [p, ""])),
});

const EMPTY = {
  slug: "", category: "personality", title_mr: "", title_en: "",
  image_key: "",
  short_mr: "", short_en: "", image_media_id: null, image_url: "",
  featured: false, published: false, display_order: 0,
  content: emptyContent(),
};

const toSlug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const blank = (v) => !String(v ?? "").trim();

function Section({ title, desc, children }) {
  return (
    <section className="a-card a-panel">
      <header className="a-panel-head">
        <h2 className="a-panel-title">{title}</h2>
        {desc && <p className="a-panel-desc">{desc}</p>}
      </header>
      <div className="a-panel-body">{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange, max, required, textarea, rows = 3, hint, error }) {
  const v = value ?? "";
  return (
    <div className={`a-field ${error ? "has-error" : ""}`}>
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      {textarea ? (
        <textarea className="a-input a-textarea" rows={rows} maxLength={max}
                  value={v} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="a-input" maxLength={max}
               value={v} onChange={(e) => onChange(e.target.value)} />
      )}
      {error
        ? <span className="a-field-error">{error}</span>
        : <span className="a-field-note">{hint ? `${hint} ` : ""}{v.length}/{max}</span>}
    </div>
  );
}

export default function YashogathaStoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id || id === "new";

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [uploading, setUploading] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate, loading: saving } = useMutation();

  const back = () => navigate("/admin/yashogatha");

  // The same rules the server applies, so a mistake is caught before the request.
  const errors = useMemo(() => {
    const e = {};
    if (blank(form.title_mr)) e.title_mr = "A Marathi title is required";
    if (blank(form.slug)) e.slug = "A slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = "Lowercase letters, numbers and hyphens only";
    return e;
  }, [form]);

  const invalid = Object.keys(errors).length > 0;
  const errFor = (k) => errors[k] ?? serverErrors[k];

  useEffect(() => {
    if (isNew) return;
    api.get(`/admin/stories/${id}`)
      .then((res) => {
        const d = res.data;
        setForm({
          slug: d.slug, category: d.category,
          title_mr: d.title_mr, title_en: d.title_en || "",
          short_mr: d.short_mr || "", short_en: d.short_en || "",
          image_key: d.image_key || "",
          image_media_id: d.image_media_id ?? null, image_url: d.image_url || "",
          featured: d.featured, published: d.published,
          display_order: d.display_order || 0,
          content: { ...emptyContent(), ...(d.content || {}) },
        });
      })
      .catch(() => {
        toast.show("That yashogatha could not be loaded", "bad");
        navigate("/admin/yashogatha");
      })
      .finally(() => setLoading(false));
  }, [id, isNew, navigate, toast]);

  const setPart = useCallback((lang, part, value) => {
    setForm((f) => ({
      ...f,
      content: { ...f.content, [lang]: { ...f.content[lang], [part]: value } },
    }));
  }, []);

  // A new story takes its slug from the Marathi title until the slug is touched.
  const onTitle = (value) => {
    setForm((f) => ({
      ...f,
      title_mr: value,
      slug: isNew && (!f.slug || f.slug === toSlug(f.title_mr)) ? toSlug(value) : f.slug,
    }));
  };

  async function uploadImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload("/admin/media/upload", fd);
      setForm((f) => ({ ...f, image_media_id: res.data.id, image_url: res.data.url }));
      toast.show("Image uploaded", "ok");
    } catch (err) {
      toast.error(errorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      setServerErrors({});
      const body = { ...form, display_order: Number(form.display_order) || 0 };
      try {
        if (isNew) {
          await api.post("/admin/stories", body);
          toast.success("Yashogatha created successfully");
        } else {
          await api.put(`/admin/stories/${id}`, body);
          toast.success("Yashogatha updated successfully");
        }
        back();
      } catch (err) {
        if (err.details?.length) {
          setServerErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
          toast.show(`${err.details[0].field}: ${err.details[0].message}`, "bad");
        } else {
          toast.error(errorMessage(err));
        }
        throw err;
      }
    }).catch(() => {});
  }

  async function remove() {
    await mutate(async () => {
      await api.del(`/admin/stories/${id}`);
      toast.success("Yashogatha moved to trash");
      back();
    }).catch((err) => {
      setConfirmDelete(false);
      toast.error(errorMessage(err, "Could not delete that story"));
    });
  }

  if (loading) {
    return (
      <div className="a-spinner">
        <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading yashogatha…
      </div>
    );
  }

  return (
    <>
      <div className="a-detail-head">
        <div>
          <Badge tone={form.published ? "ok" : "neutral"}>
            {form.published ? "Published" : "Draft"}
          </Badge>
          <h1 className="a-page-title a-mt-1">{isNew ? "New yashogatha" : "Edit yashogatha"}</h1>
          <p className="a-page-desc">
            One story — its cover, summary and the six parts it is told in.
          </p>
        </div>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-secondary" onClick={back}>
            <ArrowLeft size={16} /> Back
          </button>
          {!isNew && form.published && form.slug && (
            <a className="a-btn a-btn-ghost" href={`/yashogatha/${form.slug}`}
               target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> View on site
            </a>
          )}
          {!isNew && (
            <button className="a-btn a-btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      {invalid && (
        <div className="a-notice a-notice-warn">
          <div className="a-notice-body">
            <p className="a-notice-title">{Object.keys(errors).length} field(s) need attention</p>
            <p>Saving is blocked until the highlighted fields are filled in.</p>
          </div>
        </div>
      )}

      <div className="a-form-layout">
        <div className="a-form-main">
          <Section title="Cover" desc="The photograph on the card and at the top of the story page.">
            <div className="a-media-row">
              <div className="a-media-thumb">
                {storyCover(form)
                  ? <img src={storyCover(form)} alt="" />
                  : <span className="a-text-muted a-text-xs">No image — the card draws its own artwork</span>}
              </div>
              <div className="a-media-actions">
                <label className="a-btn a-btn-primary">
                  <UploadCloud size={16} /> {uploading ? "Uploading…" : "Upload image"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                         hidden onChange={uploadImage} disabled={uploading} />
                </label>
                {form.image_url && (
                  <button type="button" className="a-btn a-btn-ghost"
                          onClick={() => setForm({ ...form, image_media_id: null, image_url: "" })}>
                    <X size={15} /> Remove
                  </button>
                )}
                <span className="a-field-note">PNG, JPG, WebP or GIF, up to 10 MB.</span>
              </div>
            </div>

            <div className="a-field">
              <label className="a-label">Or use a programme photograph</label>
              <select className="a-input" value={form.image_key || ""}
                      onChange={(e) => setForm({ ...form, image_key: e.target.value })}>
                {STORY_PHOTO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span className="a-field-note">
                One of the three photographs shipped with the site. An uploaded image wins over this.
              </span>
            </div>
          </Section>

          <Section title="Headline" desc="The title and the summary shown on the card.">
            <div className="a-form-grid a-form-grid-2">
              <TextField label="Title (Marathi)" required max={MAX.title}
                         error={errFor("title_mr")}
                         value={form.title_mr} onChange={onTitle} />
              <TextField label="Title (English)" max={MAX.title}
                         value={form.title_en} onChange={(v) => setForm({ ...form, title_en: v })} />
            </div>
            <div className="a-form-grid a-form-grid-2">
              <TextField label="Short description (Marathi)" textarea max={MAX.short}
                         hint="Shown on the card and under the title."
                         value={form.short_mr} onChange={(v) => setForm({ ...form, short_mr: v })} />
              <TextField label="Short description (English)" textarea max={MAX.short}
                         value={form.short_en} onChange={(v) => setForm({ ...form, short_en: v })} />
            </div>
          </Section>

          <Section title="Story (Marathi)" desc="The six parts, in reading order. Leave a part blank to omit it.">
            {PARTS.map((part) => (
              <TextField key={`mr-${part}`} label={PART_LABEL[part]} textarea rows={4} max={MAX.part}
                         value={form.content?.mr?.[part]} onChange={(v) => setPart("mr", part, v)} />
            ))}
          </Section>

          <Section title="Story (English)" desc="The same six parts. Leave blank to show only the Marathi story.">
            {PARTS.map((part) => (
              <TextField key={`en-${part}`} label={PART_LABEL[part]} textarea rows={4} max={MAX.part}
                         value={form.content?.en?.[part]} onChange={(v) => setPart("en", part, v)} />
            ))}
          </Section>
        </div>

        <aside className="a-form-side">
          <Section title="Publication" desc="Where this story appears.">
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={form.published}
                     onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published — visible on the website
            </label>
            <label className="a-checkbox-label a-mt-1">
              <input type="checkbox" className="a-checkbox" checked={form.featured}
                     onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              Featured — eligible for the home page strip
            </label>
            <p className="a-field-note">
              How many featured stories the home page shows is set in Section settings.
            </p>
          </Section>

          <Section title="Details" desc="How the story is filed and addressed.">
            <div className="a-field">
              <label className="a-label">Category</label>
              <select className="a-input" value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <span className="a-field-note">Sets the card's tint and its tag.</span>
            </div>
            <TextField label="Slug" required max={MAX.slug}
                       hint="The web address: /yashogatha/<slug>."
                       error={errFor("slug")}
                       value={form.slug} onChange={(v) => setForm({ ...form, slug: toSlug(v) })} />
            <div className="a-field">
              <label className="a-label">Display order</label>
              <input className="a-input" type="number" value={form.display_order}
                     onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
              <span className="a-field-note">Lower numbers come first.</span>
            </div>
          </Section>
        </aside>
      </div>

      <div className="a-save-bar">
        <span className="a-save-bar-state">
          {invalid
            ? `${Object.keys(errors).length} field(s) need attention`
            : form.published
              ? "Saving publishes this story to the website."
              : "Saved as a draft — not visible on the website."}
        </span>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-ghost" onClick={back}>Cancel</button>
          <button className="a-btn a-btn-primary" onClick={save} disabled={saving || invalid}>
            <Save size={16} /> {saving ? "Saving…" : isNew ? "Create yashogatha" : "Save changes"}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={saving}
        title="Delete yashogatha"
        message="Delete this story?"
        subMessage="It is removed from the website and moved to the trash. It can be restored later."
      />
    </>
  );
}
