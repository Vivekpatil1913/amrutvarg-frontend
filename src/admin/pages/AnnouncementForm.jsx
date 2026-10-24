import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import { GeoSelect, useGeo } from "../components/ui/GeoSelect.jsx";

// One announcement, added or edited on its own page rather than in a dialog.
// The fields and the request body are exactly what the list screen sent before.
//
// Limits mirror the zod schema in src/modules/announcements/announcements.routes.js.
// The browser catches mistakes early; the server is still what decides, and its
// field-level errors are shown against the same inputs.

const MAX = { title: 300, desc: 1000, linkLabel: 100, time: 120, venue: 300, location: 200, notes: 1000 };

const STATUSES = [
  { value: "new", label: "New" },
  { value: "info", label: "Info" },
  { value: "comingSoon", label: "Coming Soon" },
  { value: "urgent", label: "Urgent" },
];

const EMPTY = {
  title_mr: "", title_en: "", desc_mr: "", desc_en: "",
  link: "", link_label: "", date: "", until_date: "",
  event_time: "", venue: "", district: "", taluka: "", notes_mr: "", notes_en: "",
  status: "info", pinned: false, is_active: true, display_order: 0,
};


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

// A field shows its error once it has been touched or once a save was
// attempted, so a fresh empty form is not covered in red before anything is
// typed.
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
  const titleMr = form.title_mr.trim();
  if (!titleMr) e.title_mr = "A title in Marathi is required";
  else if (titleMr.length > MAX.title) e.title_mr = `Cannot exceed ${MAX.title} characters`;

  if (form.title_en.length > MAX.title) e.title_en = `Cannot exceed ${MAX.title} characters`;
  if (form.desc_mr.length > MAX.desc) e.desc_mr = `Cannot exceed ${MAX.desc} characters`;
  if (form.desc_en.length > MAX.desc) e.desc_en = `Cannot exceed ${MAX.desc} characters`;
  if (form.link_label.length > MAX.linkLabel) e.link_label = `Cannot exceed ${MAX.linkLabel} characters`;

  // Event details are all optional; only their length is policed.
  for (const [key, max] of [
    ["event_time", MAX.time], ["venue", MAX.venue],
    ["notes_mr", MAX.notes], ["notes_en", MAX.notes],
  ]) {
    if (String(form[key]).trim().length > max) e[key] = `Cannot exceed ${max} characters`;
  }

  // The server takes a full URL or nothing at all, so a bare domain is caught
  // here rather than coming back as a validation failure.
  const link = form.link.trim();
  if (link) {
    try {
      // eslint-disable-next-line no-new
      new URL(link);
    } catch {
      e.link = "Enter a full URL, starting with https://";
    }
  }
  if (!link && form.link_label.trim()) e.link_label = "A label needs a link to go with it";

  if (form.date && form.until_date && form.until_date < form.date) {
    e.until_date = "Valid Until cannot be before the date";
  }

  const order = Number(form.display_order);
  if (!Number.isInteger(order)) e.display_order = "Enter a whole number";

  return e;
}

export default function AnnouncementForm() {
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

  const back = () => navigate("/admin/announcements");

  // District drives the taluka list, the same cascade the school form uses.
  // The loader caches per master and parent, so asking twice costs one request.
  const { rows: districtRows } = useGeo("districts");
  const districtId = districtRows.find((x) => x.name_mr === form.district)?.id ?? null;
  const { rows: talukaRows } = useGeo("talukas", "district_id", districtId);

  const errors = useMemo(() => validate(form), [form]);
  const invalid = Object.keys(errors).length > 0;
  const errorCount = Object.keys(errors).length;

  const errFor = (k) => serverErrors[k] ?? errors[k];
  const showFor = (k) => Boolean(serverErrors[k]) || submitted || touched[k];

  // Editing a field clears the server's verdict on it — that verdict was about
  // the old value, and leaving it would argue with what is now on screen.
  const set = (values, field) => {
    setForm((f) => ({ ...f, ...values }));
    if (field) setServerErrors((s) => (s[field] ? { ...s, [field]: undefined } : s));
  };
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    api.get(`/admin/announcements/${id}`)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setForm({
          title_mr: d.title_mr || "", title_en: d.title_en || "",
          desc_mr: d.desc_mr || "", desc_en: d.desc_en || "",
          link: d.link || "", link_label: d.link_label || "",
          date: d.date?.slice(0, 10) || "", until_date: d.until_date?.slice(0, 10) || "",
          event_time: d.event_time || "", venue: d.venue || "",
          district: d.district || "", taluka: d.taluka || "",
          notes_mr: d.notes_mr || "", notes_en: d.notes_en || "",
          status: d.status || "info", pinned: d.pinned || false,
          is_active: d.is_active ?? true, display_order: d.display_order || 0,
        });
      })
      .catch(() => {
        if (cancelled) return;
        toast.show("That announcement could not be loaded", "bad");
        navigate("/admin/announcements");
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
      const body = {
        ...form,
        title_mr: form.title_mr.trim(),
        title_en: form.title_en.trim(),
        // The column is nullable and the server rejects an empty string as a
        // URL, so "nothing entered" has to travel as null.
        link: form.link.trim() || null,
        link_label: form.link_label.trim() || null,
        date: form.date || null,
        until_date: form.until_date || null,
        event_time: form.event_time.trim(),
        venue: form.venue.trim(),
        district: form.district,
        taluka: form.taluka,
        // The ids are what the server checks the pairing against.
        district_id: districtId,
        taluka_id: talukaRows.find((tk) => tk.name_mr === form.taluka)?.id ?? null,
        notes_mr: form.notes_mr.trim(),
        notes_en: form.notes_en.trim(),
        display_order: Number(form.display_order) || 0,
      };
      try {
        if (isNew) {
          await api.post("/admin/announcements", body);
          toast.success("Announcement created successfully");
        } else {
          await api.put(`/admin/announcements/${id}`, body);
          toast.success("Announcement updated successfully");
        }
        back();
      } catch (err) {
        if (err.details?.length) {
          setServerErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
          toast.show(`${err.details[0].field}: ${err.details[0].message}`, "bad");
        } else {
          toast.error(errorMessage(err, "Could not save the announcement"));
        }
        throw err;
      }
    }).catch(() => {});
  }

  async function remove() {
    await mutate(async () => {
      await api.del(`/admin/announcements/${id}`);
      toast.success("Announcement moved to trash");
      back();
    }).catch((err) => {
      setConfirmDelete(false);
      toast.error(errorMessage(err, "Could not delete that announcement"));
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

  return (
    <>
      <div className="a-detail-head">
        <div>
          <h1 className="a-page-title">{isNew ? "Add Announcement" : "Edit Announcement"}</h1>
          <p className="a-page-desc">
            {isNew
              ? "A new notice appears on the website as soon as it is marked active."
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
            <Section title="The notice" desc="Marathi is what the website shows; English is used when the visitor switches language.">
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

            <Section title="Link" desc="Optional. Where the notice sends the reader — a circular, a form, a page.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Link URL" error={errFor("link")} show={showFor("link")}
                       hint="A full address, starting with https://">
                  <input className="a-input" type="url" placeholder="https://…" value={form.link}
                         onChange={(e) => set({ link: e.target.value }, "link")}
                         onBlur={() => touch("link")} />
                </Field>
                <Field label="Link Label" error={errFor("link_label")} show={showFor("link_label")}
                       hint="What the button says. The address itself is shown when this is empty.">
                  <input className="a-input" maxLength={MAX.linkLabel} placeholder="Download PDF"
                         value={form.link_label}
                         onChange={(e) => set({ link_label: e.target.value }, "link_label")}
                         onBlur={() => touch("link_label")} />
                </Field>
              </div>
            </Section>

            <Section title="Dates" desc="Both optional. Valid Until is when the notice stops being current.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Date / Event date" error={errFor("date")} show={showFor("date")}
                       hint="For a training or event, this is the day it takes place. The weekday is worked out from it.">
                  <input className="a-input" type="date" value={form.date}
                         onChange={(e) => set({ date: e.target.value }, "date")}
                         onBlur={() => touch("date")} />
                </Field>
                <Field label="Valid Until" error={errFor("until_date")} show={showFor("until_date")}>
                  <input className="a-input" type="date" value={form.until_date}
                         onChange={(e) => set({ until_date: e.target.value }, "until_date")}
                         onBlur={() => touch("until_date")} />
                </Field>
              </div>
            </Section>

            {/* For an AMRUT training or event. Every field is optional — a
                circular has no venue — and an empty one is not shown to
                visitors, so a plain notice looks exactly as it did before. */}
            <Section
              title="Event details"
              desc="For a training or event: where and when to turn up. Leave empty for an ordinary notice — nothing empty is shown on the website."
            >
              <div className="a-form-grid a-form-grid-2">
                <Field label="Time" error={errFor("event_time")} show={showFor("event_time")}
                       hint="Free text, so a range works: सकाळी १० ते दुपारी ४.">
                  <input className="a-input" maxLength={MAX.time} value={form.event_time}
                         placeholder="सकाळी १० ते दुपारी ४"
                         onChange={(e) => set({ event_time: e.target.value }, "event_time")}
                         onBlur={() => touch("event_time")} />
                </Field>
                {/* From the masters, so a notice cannot name a district the
                    programme does not recognise. Taluka depends on it and is
                    cleared whenever the district changes. */}
                <Field label="District" error={errFor("district")} show={showFor("district")}
                       hint="Where the training or event is held.">
                  <GeoSelect master="districts" value={form.district}
                             onChange={(v) => set({ district: v, taluka: "" }, "district")}
                             searchable placeholder="Select district" />
                </Field>
              </div>

              <div className="a-form-grid a-form-grid-2">
                <Field label="Taluka" error={errFor("taluka")} show={showFor("taluka")}
                       hint="Pick a district first.">
                  <GeoSelect master="talukas" parentColumn="district_id" parentId={districtId}
                             value={form.taluka}
                             onChange={(v) => set({ taluka: v }, "taluka")}
                             searchable placeholder="Select taluka"
                             waitingLabel="Select a district first"
                             emptyLabel="No talukas recorded for this district yet — add them in Taluka Master." />
                </Field>
                <Field label="Venue" error={errFor("venue")} show={showFor("venue")}
                       hint="The building or hall — where exactly to go.">
                  <input className="a-input" maxLength={MAX.venue} value={form.venue}
                         onChange={(e) => set({ venue: e.target.value }, "venue")}
                         onBlur={() => touch("venue")} />
                </Field>
              </div>

              <div className="a-form-grid a-form-grid-2">
                <Field label="Notes / Remarks (Marathi)" error={errFor("notes_mr")} show={showFor("notes_mr")}
                       hint="Anything a visitor should know before coming.">
                  <textarea className="a-input a-textarea" rows={3} maxLength={MAX.notes}
                            value={form.notes_mr}
                            onChange={(e) => set({ notes_mr: e.target.value }, "notes_mr")}
                            onBlur={() => touch("notes_mr")} />
                </Field>
                <Field label="Notes / Remarks (English)" error={errFor("notes_en")} show={showFor("notes_en")}>
                  <textarea className="a-input a-textarea" rows={3} maxLength={MAX.notes}
                            value={form.notes_en}
                            onChange={(e) => set({ notes_en: e.target.value }, "notes_en")}
                            onBlur={() => touch("notes_en")} />
                </Field>
              </div>
            </Section>
          </div>

          <aside className="a-form-side">
            <Section title="Listing" desc="How the notice is marked, and where it sits.">
              <Field label="Status" hint="Shown as the badge beside the title.">
                <select className="a-input" value={form.status}
                        onChange={(e) => set({ status: e.target.value }, "status")}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.pinned}
                       onChange={(e) => set({ pinned: e.target.checked })} />
                Pin to top
              </label>
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.is_active}
                       onChange={(e) => set({ is_active: e.target.checked })} />
                Active — show on the website
              </label>
              <Field label="Display order" error={errFor("display_order")} show={showFor("display_order")}
                     hint="Lower numbers come first among unpinned notices.">
                <input className="a-input" type="number" value={form.display_order}
                       onChange={(e) => set({ display_order: e.target.value }, "display_order")}
                       onBlur={() => touch("display_order")} />
              </Field>
              {!isNew && (
                <button type="button" className="a-btn a-btn-ghost a-btn-sm a-mt-1"
                        onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} /> Delete this announcement
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
              <Save size={16} /> {saving ? "Saving…" : isNew ? "Create announcement" : "Save announcement"}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={saving}
        title="Delete Announcement"
        message="Delete this announcement?"
      />
    </>
  );
}
