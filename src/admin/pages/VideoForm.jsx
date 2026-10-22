import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, ExternalLink } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { MediaUpload } from "../components/ui/MediaUpload.jsx";
import { CONTENT_TYPES, SOURCE_TYPES, VIDEO_CATEGORIES } from "../lib/mediaContent.js";
import { isSafeHttpUrl, videoEmbed, formatDuration } from "../../services/mediaUrl.js";

// One video or reel, added or edited on its own page.
//
// The form is conditional on the content source: choosing "Upload a file"
// shows the file field and hides the URL, and choosing "External URL" does the
// reverse. The source that is not in use is cleared on save — by this form and
// again by the server — so switching from an upload to a link cannot leave a
// stale file reference on the record.
//
// Rules mirror src/modules/videos/videos.schema.js in the CMS backend, which
// is what decides. Its field-level errors land on the same inputs.

const EMPTY = {
  title_mr: "", title_en: "", desc_mr: "", desc_en: "",
  content_type: "video", source_type: "url",
  media_id: null, media_url: "", external_url: "",
  thumbnail_id: null, thumbnail_url: "", varg_id: null,
  category: "general", duration_seconds: null,
  published: false, display_order: 0,
};

const MAX = { title: 300, desc: 2000 };
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

function Field({ label, required, error, show, hint, children }) {
  const visible = show ? error : null;
  return (
    <div className={`a-field ${visible ? "has-error" : ""}`}>
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      {children}
      {visible
        ? <span className="a-field-error">{visible}</span>
        : hint ? <span className="a-field-help">{hint}</span> : null}
    </div>
  );
}

function validate(form) {
  const e = {};
  if (blank(form.title_mr)) e.title_mr = "A title in Marathi is required";
  else if (form.title_mr.trim().length > MAX.title) e.title_mr = `Cannot exceed ${MAX.title} characters`;
  if (form.title_en.length > MAX.title) e.title_en = `Cannot exceed ${MAX.title} characters`;
  if (form.desc_mr.length > MAX.desc) e.desc_mr = `Cannot exceed ${MAX.desc} characters`;
  if (form.desc_en.length > MAX.desc) e.desc_en = `Cannot exceed ${MAX.desc} characters`;

  // Only the chosen source is required: the other one is about to be cleared.
  if (form.source_type === "upload") {
    if (!form.media_url) e.media_url = "Upload a video file";
  } else if (blank(form.external_url)) {
    e.external_url = "Enter the video URL";
  } else if (!isSafeHttpUrl(form.external_url)) {
    e.external_url = "Enter a complete http:// or https:// address";
  }

  const order = Number(form.display_order);
  if (!Number.isInteger(order) || order < 0 || order > 9999) e.display_order = "A whole number, 0 to 9999";

  if (form.duration_seconds !== null && form.duration_seconds !== "") {
    const d = Number(form.duration_seconds);
    if (!Number.isInteger(d) || d < 0 || d > 86400) e.duration_seconds = "A whole number of seconds, 0 to 86400";
  }
  return e;
}

export default function VideoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id;
  const [params] = useSearchParams();

  // A link can open this form already pointed at a category — the Yashogatha
  // screen sends editors here with ?category=success, so adding a video story
  // does not mean knowing to change a dropdown afterwards.
  const presetCategory = VIDEO_CATEGORIES.some((c) => c.value === params.get("category"))
    ? params.get("category")
    : "";

  const [form, setForm] = useState(
    isNew && presetCategory ? { ...EMPTY, category: presetCategory } : EMPTY
  );
  const [loading, setLoading] = useState(!isNew);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [schools, setSchools] = useState([]);
  const { mutate, loading: saving } = useMutation();

  // The school list for the optional picker. A failure here is not worth an
  // error: the field is optional, and the rest of the form still works.
  useEffect(() => {
    let cancelled = false;
    api.get("/admin/vargs?limit=100")
      .then((res) => { if (!cancelled) setSchools(res.data ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const back = () => navigate("/admin/videos");

  const errors = useMemo(() => validate(form), [form]);
  const invalid = Object.keys(errors).length > 0;
  const errorCount = Object.keys(errors).length;

  const errFor = (k) => serverErrors[k] ?? errors[k];
  const showFor = (k) => Boolean(serverErrors[k]) || submitted || touched[k];

  const set = (values, field) => {
    setForm((f) => ({ ...f, ...values }));
    if (field) setServerErrors((s) => (s[field] ? { ...s, [field]: undefined } : s));
  };
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    api.get(`/admin/videos/${id}`)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setForm({
          title_mr: d.title_mr || "", title_en: d.title_en || "",
          desc_mr: d.desc_mr || "", desc_en: d.desc_en || "",
          content_type: d.content_type || "video", source_type: d.source_type || "url",
          media_id: d.media_id ?? null, media_url: d.media_url || "",
          external_url: d.external_url || "",
          thumbnail_id: d.thumbnail_id ?? null, thumbnail_url: d.thumbnail_url || "",
          varg_id: d.varg_id ?? null,
          category: d.category || "general",
          duration_seconds: d.duration_seconds ?? null,
          published: d.published ?? false, display_order: d.display_order || 0,
        });
      })
      .catch(() => {
        if (cancelled) return;
        toast.show("That video could not be loaded", "bad");
        navigate("/admin/videos");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isNew, navigate, toast]);

  async function save(e) {
    e?.preventDefault();
    setSubmitted(true);
    setServerErrors({});
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      const upload = form.source_type === "upload";
      const body = {
        ...form,
        title_mr: form.title_mr.trim(),
        title_en: form.title_en.trim(),
        desc_mr: form.desc_mr.trim(),
        desc_en: form.desc_en.trim(),
        // Whichever source is not in use is cleared here as well as on the
        // server, so what is sent matches what the form was showing.
        external_url: upload ? "" : form.external_url.trim(),
        media_url: upload ? form.media_url : "",
        media_id: upload ? form.media_id : null,
        duration_seconds:
          form.duration_seconds === null || form.duration_seconds === ""
            ? null
            : Number(form.duration_seconds),
        display_order: Number(form.display_order) || 0,
      };
      try {
        if (isNew) {
          await api.post("/admin/videos", body);
          toast.show("Video created", "ok");
        } else {
          await api.put(`/admin/videos/${id}`, body);
          toast.show("Video saved", "ok");
        }
        back();
      } catch (err) {
        if (err.details?.length) {
          setServerErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
          toast.show(`${err.details[0].field}: ${err.details[0].message}`, "bad");
        } else {
          toast.show(err.message || "Could not save the video", "bad");
        }
        throw err;
      }
    }).catch(() => {});
  }

  async function remove() {
    await mutate(async () => {
      await api.del(`/admin/videos/${id}`);
      toast.show("Deleted", "ok");
      back();
    });
  }

  if (loading) {
    return (
      <div className="a-spinner">
        <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading…
      </div>
    );
  }

  // What the chosen URL will actually do on the public page, shown as the
  // administrator types rather than discovered after publishing.
  const linked = form.source_type === "url" && isSafeHttpUrl(form.external_url)
    ? videoEmbed(form.external_url)
    : null;

  return (
    <>
      <div className="a-detail-head">
        <div>
          <h1 className="a-page-title">{isNew ? "Add Video/Reel" : "Edit Video/Reel"}</h1>
          <p className="a-page-desc">
            {isNew
              ? "New content stays a draft until it is published."
              : form.title_mr || "—"}
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={back}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>

      {submitted && invalid && (
        <div className="a-notice a-notice-warn">
          <div className="a-notice-body">
            <p className="a-notice-title">{errorCount} field(s) need attention</p>
            <p>Saving is blocked until the highlighted fields are corrected.</p>
          </div>
        </div>
      )}

      <form onSubmit={save} noValidate>
        <div className="a-form-layout">
          <div className="a-form-main">
            <Section title="The content" desc="Marathi is what the website shows; English is used when the visitor switches language.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Title (Marathi)" required error={errFor("title_mr")} show={showFor("title_mr")}>
                  <input className="a-input" maxLength={MAX.title} value={form.title_mr}
                         onChange={(e) => set({ title_mr: e.target.value }, "title_mr")}
                         onBlur={() => touch("title_mr")} />
                </Field>
                <Field label="Title (English)" error={errFor("title_en")} show={showFor("title_en")}>
                  <input className="a-input" maxLength={MAX.title} value={form.title_en}
                         onChange={(e) => set({ title_en: e.target.value }, "title_en")}
                         onBlur={() => touch("title_en")} />
                </Field>
              </div>
              <div className="a-form-grid a-form-grid-2">
                <Field label="Description (Marathi)" error={errFor("desc_mr")} show={showFor("desc_mr")}>
                  <textarea className="a-input a-textarea" rows={4} maxLength={MAX.desc} value={form.desc_mr}
                            onChange={(e) => set({ desc_mr: e.target.value }, "desc_mr")}
                            onBlur={() => touch("desc_mr")} />
                </Field>
                <Field label="Description (English)" error={errFor("desc_en")} show={showFor("desc_en")}>
                  <textarea className="a-input a-textarea" rows={4} maxLength={MAX.desc} value={form.desc_en}
                            onChange={(e) => set({ desc_en: e.target.value }, "desc_en")}
                            onBlur={() => touch("desc_en")} />
                </Field>
              </div>
            </Section>

            <Section
              title="Content source"
              desc="Either a file hosted by this site, or an address on YouTube, Vimeo or Instagram."
            >
              <fieldset className="a-field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="a-label a-label-required">Content source</legend>
                <div className="a-radio-row">
                  {SOURCE_TYPES.map((s) => (
                    <label key={s.value} className="a-checkbox-label">
                      <input
                        type="radio"
                        name="source_type"
                        className="a-checkbox"
                        checked={form.source_type === s.value}
                        onChange={() => set({ source_type: s.value }, s.value === "upload" ? "media_url" : "external_url")}
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Conditional: only the chosen source is asked for. */}
              {form.source_type === "upload" ? (
                <Field label="Video file" required error={errFor("media_url")} show={showFor("media_url")}>
                  <MediaUpload
                    kind="video"
                    label="Video"
                    url={form.media_url}
                    hint="MP4, WebM, OGG or QuickTime."
                    onChange={({ id: mediaId, url }) => set({ media_id: mediaId, media_url: url }, "media_url")}
                    onDuration={(seconds) => set({ duration_seconds: seconds })}
                  />
                </Field>
              ) : (
                <Field
                  label="Video URL" required
                  error={errFor("external_url")} show={showFor("external_url")}
                  hint="A YouTube, Vimeo or Instagram reel address, or a direct link to a video file."
                >
                  <input className="a-input" type="url" placeholder="https://www.youtube.com/watch?v=…"
                         value={form.external_url}
                         onChange={(e) => set({ external_url: e.target.value }, "external_url")}
                         onBlur={() => touch("external_url")} />
                </Field>
              )}

              {linked && (
                <div className={`a-notice ${linked.mode === "link" ? "a-notice-warn" : ""}`}>
                  <div className="a-notice-body">
                    {linked.mode === "link" ? (
                      <>
                        <p className="a-notice-title">This address cannot be embedded</p>
                        <p>
                          It will be saved, and visitors will be offered a link that opens it in a new tab
                          instead of a player on the page.
                        </p>
                      </>
                    ) : (
                      <p>
                        Recognised as <strong>{linked.provider}</strong> — visitors will see it play on the page.
                        {" "}
                        <a className="a-view-link" href={linked.url} target="_blank" rel="noopener noreferrer">
                          Open the original <ExternalLink size={12} />
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Thumbnail" desc="The still shown on the card before the video is played. Optional.">
              <MediaUpload
                kind="image"
                label="Thumbnail"
                url={form.thumbnail_url}
                previewAlt=""
                hint="PNG, JPG, WebP or GIF."
                onChange={({ id: mediaId, url }) => set({ thumbnail_id: mediaId, thumbnail_url: url })}
              />
            </Section>
          </div>

          <aside className="a-form-side">
            <Section title="Listing" desc="How this is classified, and whether visitors can see it.">
              <Field label="Content type" required error={errFor("content_type")} show={showFor("content_type")}
                     hint={CONTENT_TYPES.find((t) => t.value === form.content_type)?.hint}>
                <select className="a-input" value={form.content_type}
                        onChange={(e) => set({ content_type: e.target.value }, "content_type")}>
                  {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>

              <Field label="Category" error={errFor("category")} show={showFor("category")}
                     hint={form.category === "success"
                       ? "Success stories also appear in the Yashogatha section on the website."
                       : undefined}>
                <select className="a-input" value={form.category}
                        onChange={(e) => set({ category: e.target.value }, "category")}>
                  {VIDEO_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>

              {/* Optional. Naming the school lets the website show it under the
                  title without the name being retyped here — and keeps it
                  right when the school record itself is corrected. */}
              <Field label="School" error={errFor("varg_id")} show={showFor("varg_id")}
                     hint="The school this video is about, if it is about one.">
                <select className="a-input" value={form.varg_id ?? ""}
                        onChange={(e) => set({ varg_id: e.target.value === "" ? null : Number(e.target.value) }, "varg_id")}>
                  <option value="">No particular school</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.school_name}{s.district_mr ? ` — ${s.district_mr}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Publish status" hint="A draft is never returned by the public API.">
                <select className="a-input" value={form.published ? "published" : "draft"}
                        onChange={(e) => set({ published: e.target.value === "published" })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </Field>

              <Field
                label="Duration (seconds)"
                error={errFor("duration_seconds")} show={showFor("duration_seconds")}
                hint={form.duration_seconds
                  ? `Shown as ${formatDuration(form.duration_seconds)}. Detected from the file where possible.`
                  : "Optional. Filled in automatically when a file is uploaded."}
              >
                <input className="a-input" type="number" min="0" max="86400"
                       value={form.duration_seconds ?? ""}
                       onChange={(e) => set({ duration_seconds: e.target.value === "" ? null : Number(e.target.value) }, "duration_seconds")}
                       onBlur={() => touch("duration_seconds")} />
              </Field>

              <Field label="Display order" error={errFor("display_order")} show={showFor("display_order")}
                     hint="Lower numbers come first.">
                <input className="a-input" type="number" min="0" max="9999" value={form.display_order}
                       onChange={(e) => set({ display_order: e.target.value === "" ? 0 : Number(e.target.value) }, "display_order")}
                       onBlur={() => touch("display_order")} />
              </Field>

              {!isNew && (
                <button type="button" className="a-btn a-btn-ghost a-btn-sm a-mt-1"
                        onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} /> Delete this video
                </button>
              )}
            </Section>
          </aside>
        </div>

        <div className="a-save-bar">
          <span className="a-save-bar-state">
            {submitted && invalid ? `${errorCount} field(s) need attention` : "Ready to save"}
          </span>
          <div className="a-flex a-gap-2">
            <button type="button" className="a-btn a-btn-ghost" onClick={back}>Cancel</button>
            <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? "Saving…" : isNew ? "Create video" : "Save video"}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={saving}
        title="Delete Video"
        message="Delete this video?"
        subMessage="It is removed from the list and from the website. The record is retained."
      />
    </>
  );
}
