import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, ExternalLink } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { MediaUpload } from "../components/ui/MediaUpload.jsx";
import { SOURCE_TYPES, PODCAST_CATEGORIES } from "../lib/mediaContent.js";
import { isSafeHttpUrl, audioEmbed, formatDuration } from "../../services/mediaUrl.js";

// One podcast episode, added or edited on its own page.
//
// The conditional source behaves exactly as it does on the video form, and for
// the same reason: the two modules are meant to feel like one feature. Rules
// mirror src/modules/podcasts/podcasts.schema.js in the CMS backend.
//
// Episode length is read from the chosen file by the browser where it can be,
// and typed in where it cannot — an external episode page has no length the
// site can detect.

const EMPTY = {
  title_mr: "", title_en: "", desc_mr: "", desc_en: "",
  source_type: "url",
  media_id: null, media_url: "", external_url: "",
  cover_id: null, cover_url: "",
  category: "general", duration_seconds: null,
  publish_date: "", published: false, display_order: 0,
};

const MAX = { title: 300, desc: 4000 };
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

  if (form.source_type === "upload") {
    if (!form.media_url) e.media_url = "Upload an audio file";
  } else if (blank(form.external_url)) {
    e.external_url = "Enter the audio or episode URL";
  } else if (!isSafeHttpUrl(form.external_url)) {
    e.external_url = "Enter a complete http:// or https:// address";
  }

  if (form.publish_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.publish_date)) {
    e.publish_date = "Enter a valid date";
  }

  const order = Number(form.display_order);
  if (!Number.isInteger(order) || order < 0 || order > 9999) e.display_order = "A whole number, 0 to 9999";

  if (form.duration_seconds !== null && form.duration_seconds !== "") {
    const d = Number(form.duration_seconds);
    if (!Number.isInteger(d) || d < 0 || d > 86400) e.duration_seconds = "A whole number of seconds, 0 to 86400";
  }
  return e;
}

export default function PodcastForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id;

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate, loading: saving } = useMutation();

  const back = () => navigate("/admin/podcasts");

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
    api.get(`/admin/podcasts/${id}`)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setForm({
          title_mr: d.title_mr || "", title_en: d.title_en || "",
          desc_mr: d.desc_mr || "", desc_en: d.desc_en || "",
          source_type: d.source_type || "url",
          media_id: d.media_id ?? null, media_url: d.media_url || "",
          external_url: d.external_url || "",
          cover_id: d.cover_id ?? null, cover_url: d.cover_url || "",
          category: d.category || "general",
          duration_seconds: d.duration_seconds ?? null,
          publish_date: d.publish_date?.slice(0, 10) || "",
          published: d.published ?? false, display_order: d.display_order || 0,
        });
      })
      .catch(() => {
        if (cancelled) return;
        toast.show("That episode could not be loaded", "bad");
        navigate("/admin/podcasts");
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
          await api.post("/admin/podcasts", body);
          toast.show("Podcast created", "ok");
        } else {
          await api.put(`/admin/podcasts/${id}`, body);
          toast.show("Podcast saved", "ok");
        }
        back();
      } catch (err) {
        if (err.details?.length) {
          setServerErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
          toast.show(`${err.details[0].field}: ${err.details[0].message}`, "bad");
        } else {
          toast.show(err.message || "Could not save the episode", "bad");
        }
        throw err;
      }
    }).catch(() => {});
  }

  async function remove() {
    await mutate(async () => {
      await api.del(`/admin/podcasts/${id}`);
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

  const linked = form.source_type === "url" && isSafeHttpUrl(form.external_url)
    ? audioEmbed(form.external_url)
    : null;

  return (
    <>
      <div className="a-detail-head">
        <div>
          <h1 className="a-page-title">{isNew ? "Add Podcast" : "Edit Podcast"}</h1>
          <p className="a-page-desc">
            {isNew ? "A new episode stays a draft until it is published." : form.title_mr || "—"}
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
            <Section title="The episode" desc="Marathi is what the website shows; English is used when the visitor switches language.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Podcast title (Marathi)" required error={errFor("title_mr")} show={showFor("title_mr")}>
                  <input className="a-input" maxLength={MAX.title} value={form.title_mr}
                         onChange={(e) => set({ title_mr: e.target.value }, "title_mr")}
                         onBlur={() => touch("title_mr")} />
                </Field>
                <Field label="Podcast title (English)" error={errFor("title_en")} show={showFor("title_en")}>
                  <input className="a-input" maxLength={MAX.title} value={form.title_en}
                         onChange={(e) => set({ title_en: e.target.value }, "title_en")}
                         onBlur={() => touch("title_en")} />
                </Field>
              </div>
              <div className="a-form-grid a-form-grid-2">
                <Field label="Summary (Marathi)" error={errFor("desc_mr")} show={showFor("desc_mr")}>
                  <textarea className="a-input a-textarea" rows={5} maxLength={MAX.desc} value={form.desc_mr}
                            onChange={(e) => set({ desc_mr: e.target.value }, "desc_mr")}
                            onBlur={() => touch("desc_mr")} />
                </Field>
                <Field label="Summary (English)" error={errFor("desc_en")} show={showFor("desc_en")}>
                  <textarea className="a-input a-textarea" rows={5} maxLength={MAX.desc} value={form.desc_en}
                            onChange={(e) => set({ desc_en: e.target.value }, "desc_en")}
                            onBlur={() => touch("desc_en")} />
                </Field>
              </div>
            </Section>

            <Section
              title="Audio source"
              desc="Either a file hosted by this site, or an address on Spotify or another podcast host."
            >
              <fieldset className="a-field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="a-label a-label-required">Audio source</legend>
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

              {form.source_type === "upload" ? (
                <Field label="Audio file" required error={errFor("media_url")} show={showFor("media_url")}>
                  <MediaUpload
                    kind="audio"
                    label="Audio"
                    url={form.media_url}
                    hint="MP3, WAV, M4A, AAC, OGG or FLAC."
                    onChange={({ id: mediaId, url }) => set({ media_id: mediaId, media_url: url }, "media_url")}
                    onDuration={(seconds) => set({ duration_seconds: seconds })}
                  />
                </Field>
              ) : (
                <Field
                  label="Audio / episode URL" required
                  error={errFor("external_url")} show={showFor("external_url")}
                  hint="A Spotify episode, or a direct link to an MP3 or other audio file."
                >
                  <input className="a-input" type="url" placeholder="https://open.spotify.com/episode/…"
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
                        <p className="a-notice-title">This address cannot be played on the page</p>
                        <p>
                          It will be saved, and visitors will be offered a listening link that opens it in a
                          new tab instead of a player.
                        </p>
                      </>
                    ) : (
                      <p>
                        Recognised as <strong>{linked.provider}</strong> — visitors will be able to play it on the page.
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

            <Section title="Cover image" desc="The artwork on the episode card. Optional.">
              <MediaUpload
                kind="image"
                label="Cover image"
                url={form.cover_url}
                hint="PNG, JPG, WebP or GIF. A square image works best."
                onChange={({ id: mediaId, url }) => set({ cover_id: mediaId, cover_url: url })}
              />
            </Section>
          </div>

          <aside className="a-form-side">
            <Section title="Listing" desc="How this episode is classified, and whether visitors can see it.">
              <Field label="Category" error={errFor("category")} show={showFor("category")}>
                <select className="a-input" value={form.category}
                        onChange={(e) => set({ category: e.target.value }, "category")}>
                  {PODCAST_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>

              <Field label="Publish date" error={errFor("publish_date")} show={showFor("publish_date")}
                     hint="The date shown on the episode. Optional.">
                <input className="a-input" type="date" value={form.publish_date}
                       onChange={(e) => set({ publish_date: e.target.value }, "publish_date")}
                       onBlur={() => touch("publish_date")} />
              </Field>

              <Field label="Publish status" hint="A draft is never returned by the public API.">
                <select className="a-input" value={form.published ? "published" : "draft"}
                        onChange={(e) => set({ published: e.target.value === "published" })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </Field>

              <Field
                label="Episode duration (seconds)"
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
                     hint="Lower numbers come first, above the date order.">
                <input className="a-input" type="number" min="0" max="9999" value={form.display_order}
                       onChange={(e) => set({ display_order: e.target.value === "" ? 0 : Number(e.target.value) }, "display_order")}
                       onBlur={() => touch("display_order")} />
              </Field>

              {!isNew && (
                <button type="button" className="a-btn a-btn-ghost a-btn-sm a-mt-1"
                        onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} /> Delete this episode
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
              <Save size={16} /> {saving ? "Saving…" : isNew ? "Create episode" : "Save episode"}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={saving}
        title="Delete Podcast"
        message="Delete this episode?"
        subMessage="It is removed from the list and from the website. The record is retained."
      />
    </>
  );
}
