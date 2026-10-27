import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../components/ui/Toast.jsx";
import { useGeo } from "../components/ui/GeoSelect.jsx";
import { Section, Field, Spinner, fieldErrors } from "../components/ui/FormBits.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { isStateRole } from "../lib/roles.js";
import { errorMessage } from "../lib/errors.js";

// Add / edit one Amrut Varg Melawa announcement.
//
// The jurisdiction choices follow the officer's tier: the State Coordinator
// can announce at any level; a Divisional Manager for their division or one
// of its districts; a District Manager for their own district only. The CMS
// enforces the same rules — this just does not offer what it would refuse.

const EMPTY = {
  title_mr: "", title_en: "", event_date: "", end_date: "", start_time: "10:00", end_time: "16:00",
  venue_mr: "", venue_en: "", maps_url: "", jurisdiction_scope: "", target_division_id: "",
  target_district_id: "", highlights_mr: "", highlights_en: "", is_active: true,
};

function validate(f) {
  const e = {};
  if (f.title_mr.trim().length < 3) e.title_mr = "A Marathi title is required";
  if (!f.event_date) e.event_date = "The event date is required";
  if (f.end_date && f.event_date && f.end_date < f.event_date) e.end_date = "Cannot be before the event date";
  if (!f.start_time) e.start_time = "Required";
  if (!f.end_time) e.end_time = "Required";
  if (f.start_time && f.end_time && (!f.end_date || f.end_date === f.event_date) && f.end_time <= f.start_time) e.end_time = "Must be after the start time";
  if (f.venue_mr.trim().length < 3) e.venue_mr = "The venue is required";
  if (f.maps_url && !/^https?:\/\/\S+$/i.test(f.maps_url.trim())) e.maps_url = "Enter a full https:// map link";
  if (!f.jurisdiction_scope) e.jurisdiction_scope = "Choose who this melawa is for";
  if (f.jurisdiction_scope === "DIVISION" && !f.target_division_id) e.target_division_id = "Choose the division";
  if (f.jurisdiction_scope === "DISTRICT" && !f.target_district_id) e.target_district_id = "Choose the district";
  return e;
}

export default function MelawaForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAdminAuth();
  const state = isStateRole(user?.role);
  const division = user?.role === "division_manager";
  const district = user?.role === "district_manager";

  const [form, setForm] = useState(() => ({
    ...EMPTY,
    // A district manager's melawa can only be for their district, so it is
    // filled in and fixed.
    ...(district ? { jurisdiction_scope: "DISTRICT", target_division_id: user.vibhagId ?? "", target_district_id: user.districtId ?? "" } : {}),
    ...(division ? { jurisdiction_scope: "DIVISION", target_division_id: user.vibhagId ?? "" } : {}),
  }));
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  const vibhags = useGeo("vibhags");
  const districts = useGeo("districts", "vibhag_id", form.target_division_id || null);

  useEffect(() => {
    if (isNew) return;
    api.get(`/admin/melawa/${id}`)
      .then(({ data: d }) => setForm({
        ...EMPTY,
        ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, d[k] ?? EMPTY[k]])),
        event_date: d.event_date?.slice(0, 10) || "",
        end_date: d.end_date?.slice(0, 10) || "",
        start_time: String(d.start_time || "").slice(0, 5),
        end_time: String(d.end_time || "").slice(0, 5),
        target_division_id: d.target_division_id ?? "",
        target_district_id: d.target_district_id ?? "",
      }))
      .catch((err) => {
        toast.error(errorMessage(err, "That melawa could not be loaded"));
        navigate("/admin/melawa");
      })
      .finally(() => setLoading(false));
  }, [id, isNew, navigate, toast]);

  const errors = useMemo(() => ({ ...validate(form), ...serverErrors }), [form, serverErrors]);
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setServerErrors((s) => {
      const next = { ...s };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const scopeOptions = state
    ? [["STATE", "State-wide (all Maharashtra)"], ["DIVISION", "One division"], ["DISTRICT", "One district"]]
    : division ? [["DIVISION", "My division"], ["DISTRICT", "One district in my division"]]
      : [["DISTRICT", "My district"]];

  async function save(e) {
    e.preventDefault();
    setAttempted(true);
    if (Object.keys(validate(form)).length) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    setSaving(true);
    const body = {
      ...form,
      end_date: form.end_date || null,
      target_division_id: form.jurisdiction_scope === "STATE" ? null : Number(form.target_division_id) || null,
      target_district_id: form.jurisdiction_scope === "DISTRICT" ? Number(form.target_district_id) || null : null,
    };
    try {
      if (isNew) await api.post("/admin/melawa", body);
      else await api.put(`/admin/melawa/${id}`, body);
      toast.success(isNew ? "Melawa announced" : "Melawa updated");
      navigate("/admin/melawa");
    } catch (err) {
      setServerErrors(fieldErrors(err));
      toast.error(errorMessage(err, "Could not save the melawa"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  const err = (k) => (attempted ? errors[k] : serverErrors[k]);

  return (
    <>
      <div className="a-detail-head">
        <div>
          <h1 className="a-page-title">{isNew ? "Announce Melawa" : "Edit Melawa"}</h1>
          <p className="a-page-desc">Shown in the flashing ticker on every page of the website until it ends.</p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/melawa")}><ArrowLeft size={16} /> Back to list</button>
      </div>

      <form onSubmit={save} noValidate>
        <div className="a-form-layout">
          <div className="a-form-main">
            <Section title="Title" desc="Marathi is what the ticker shows; English is used when the visitor switches language.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Title (Marathi)" required error={err("title_mr")}>
                  <input className="a-input" maxLength={200} placeholder="राज्यस्तरीय अमृत वर्ग महामेळावा २०२६" value={form.title_mr} onChange={(e) => set({ title_mr: e.target.value })} />
                </Field>
                <Field label="Title (English)" error={err("title_en")}>
                  <input className="a-input" maxLength={200} value={form.title_en} onChange={(e) => set({ title_en: e.target.value })} />
                </Field>
              </div>
            </Section>

            <Section title="When" desc="Times are Indian Standard Time. The melawa leaves the ticker when the last day's end time passes.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Event date" required error={err("event_date")}>
                  <input className="a-input" type="date" value={form.event_date} onChange={(e) => set({ event_date: e.target.value })} />
                </Field>
                <Field label="End date" error={err("end_date")} hint="Only for a melawa spanning several days">
                  <input className="a-input" type="date" min={form.event_date || undefined} value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} />
                </Field>
                <Field label="Start time" required error={err("start_time")}>
                  <input className="a-input" type="time" value={form.start_time} onChange={(e) => set({ start_time: e.target.value })} />
                </Field>
                <Field label="End time" required error={err("end_time")}>
                  <input className="a-input" type="time" value={form.end_time} onChange={(e) => set({ end_time: e.target.value })} />
                </Field>
              </div>
            </Section>

            <Section title="Where">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Venue (Marathi)" required error={err("venue_mr")}>
                  <textarea className="a-input a-textarea" rows={2} maxLength={500} value={form.venue_mr} onChange={(e) => set({ venue_mr: e.target.value })} />
                </Field>
                <Field label="Venue (English)" error={err("venue_en")}>
                  <textarea className="a-input a-textarea" rows={2} maxLength={500} value={form.venue_en} onChange={(e) => set({ venue_en: e.target.value })} />
                </Field>
              </div>
              <Field label="Google Maps link" error={err("maps_url")} hint="Paste the Share link from Google Maps">
                <input className="a-input" type="url" placeholder="https://maps.app.goo.gl/…" value={form.maps_url} onChange={(e) => set({ maps_url: e.target.value })} />
              </Field>
            </Section>

            <Section title="Highlights" desc="Agenda, chief guests, felicitations — one per line; each line becomes a bullet.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Highlights (Marathi)" error={err("highlights_mr")}>
                  <textarea className="a-input a-textarea" rows={6} maxLength={4000} value={form.highlights_mr} onChange={(e) => set({ highlights_mr: e.target.value })} />
                </Field>
                <Field label="Highlights (English)" error={err("highlights_en")}>
                  <textarea className="a-input a-textarea" rows={6} maxLength={4000} value={form.highlights_en} onChange={(e) => set({ highlights_en: e.target.value })} />
                </Field>
              </div>
            </Section>
          </div>

          <aside className="a-form-side">
            <Section title="Jurisdiction">
              <Field label="Announce for" required error={err("jurisdiction_scope")}>
                <select className="a-input" value={form.jurisdiction_scope} disabled={district}
                        onChange={(e) => set({
                          jurisdiction_scope: e.target.value,
                          ...(state ? { target_division_id: "", target_district_id: "" } : { target_district_id: "" }),
                        })}>
                  {state && <option value="">Select…</option>}
                  {scopeOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              {(form.jurisdiction_scope === "DIVISION" || form.jurisdiction_scope === "DISTRICT") && (
                <Field label="Division" required error={err("target_division_id")}>
                  <select className="a-input" value={form.target_division_id} disabled={!state}
                          onChange={(e) => set({ target_division_id: e.target.value, target_district_id: "" })}>
                    <option value="">Select…</option>
                    {vibhags.rows.map((v) => <option key={v.id} value={v.id}>{v.name_en || v.name_mr} · {v.name_mr}</option>)}
                  </select>
                </Field>
              )}
              {form.jurisdiction_scope === "DISTRICT" && (
                <Field label="District" required error={err("target_district_id")}>
                  <select className="a-input" value={form.target_district_id} disabled={district || !form.target_division_id}
                          onChange={(e) => set({ target_district_id: e.target.value })}>
                    <option value="">{form.target_division_id ? "Select…" : "Choose the division first"}</option>
                    {districts.rows.map((d) => <option key={d.id} value={d.id}>{d.name_en || d.name_mr} · {d.name_mr}</option>)}
                  </select>
                </Field>
              )}
            </Section>
            <Section title="Visibility">
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} />
                Show on the website ticker
              </label>
              <button className="a-btn a-btn-primary" type="submit" disabled={saving} style={{ width: "100%", marginTop: "1rem" }}>
                <Save size={15} /> {saving ? "Saving…" : isNew ? "Publish melawa" : "Save changes"}
              </button>
            </Section>
          </aside>
        </div>
      </form>
    </>
  );
}
