import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import { GeoSelect, useGeo } from "../components/ui/GeoSelect.jsx";
import { isSafeHttpUrl } from "../../services/mediaUrl.js";

// One Amrut Varg, edited on its own page.
//
// The fields are exactly those the record has always carried; only the screen
// changed, from a dialog to a full page. Division, district and taluka come
// from the masters and cascade — picking a division narrows the districts, and
// a district narrows the talukas.
//
// Limits mirror the zod schema in src/modules/vargs/vargs.routes.js. The
// browser catches mistakes early; the server is still what decides, and its
// field-level errors are shown against the same inputs.

const MAX = { geo: 100, village: 120, school: 300, varg: 200, coordinator: 200 };
const LIMITS = { enrollment: 100000 };

const EMPTY = {
  vibhag_mr: "", vibhag_en: "", district_mr: "", district_en: "",
  taluka: "", village: "", school_name: "", varg_name: "", coordinator_name: "",
  enrollment_count: 0, is_active: true, display_order: 0, resource_url: "",
};

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

function TextField({ label, value, onChange, max, required, hint, error }) {
  const v = value ?? "";
  return (
    <div className={`a-field ${error ? "has-error" : ""}`}>
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      <input className="a-input" maxLength={max} value={v} onChange={(e) => onChange(e.target.value)} />
      {error
        ? <span className="a-field-error">{error}</span>
        : <span className="a-field-note">{hint ? `${hint} ` : ""}{v.length}/{max}</span>}
    </div>
  );
}

export default function VargForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id || id === "new";

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [serverErrors, setServerErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate, loading: saving } = useMutation();

  const back = () => navigate("/admin/vargs");

  // Resolved master rows: they supply the English columns and the parent id a
  // dependent dropdown needs.
  const { rows: vibhagRows } = useGeo("vibhags");
  const vibhagId = vibhagRows.find((v) => v.name_mr === form.vibhag_mr)?.id ?? null;
  const { rows: districtRows } = useGeo("districts", "vibhag_id", vibhagId);
  const districtId = districtRows.find((d) => d.name_mr === form.district_mr)?.id ?? null;
  // Loaded here as well as inside the taluka dropdown so the submitted body can
  // carry the taluka's id. The loader caches per master and parent, so asking
  // for the same list twice costs one request.
  const { rows: talukaRows } = useGeo("talukas", "district_id", districtId);

  // The same rules the server applies, so a mistake is caught before the request.
  const errors = useMemo(() => {
    const e = {};
    if (blank(form.vibhag_mr)) e.vibhag_mr = "A division is required";
    if (blank(form.district_mr)) e.district_mr = "A district is required";
    if (blank(form.school_name)) e.school_name = "A school or location name is required";
    else if (form.school_name.trim().length > MAX.school) e.school_name = `Cannot exceed ${MAX.school} characters`;
    // Optional, but a value that is present has to fit the column.
    if (form.village.trim().length > MAX.village) e.village = `Cannot exceed ${MAX.village} characters`;
    const n = Number(form.enrollment_count);
    if (!Number.isInteger(n) || n < 0) e.enrollment_count = "Enter a whole number, zero or more";
    else if (n > LIMITS.enrollment) e.enrollment_count = "That number is too large";
    const order = Number(form.display_order);
    if (!Number.isInteger(order)) e.display_order = "Enter a whole number";
    // Optional, but a value that is present has to be an address a browser
    // can open — the public page turns it into a link or a player.
    if (!blank(form.resource_url) && !isSafeHttpUrl(form.resource_url)) {
      e.resource_url = "Enter a complete http:// or https:// address";
    }
    return e;
  }, [form]);

  const invalid = Object.keys(errors).length > 0;
  const errFor = (k) => errors[k] ?? serverErrors[k];

  useEffect(() => {
    if (isNew) return;
    api.get(`/admin/vargs/${id}`)
      .then((res) => {
        const d = res.data;
        setForm({
          vibhag_mr: d.vibhag_mr || "", vibhag_en: d.vibhag_en || "",
          district_mr: d.district_mr || "", district_en: d.district_en || "",
          taluka: d.taluka || "", village: d.village || "",
          school_name: d.school_name || "",
          varg_name: d.varg_name || "", coordinator_name: d.coordinator_name || "",
          enrollment_count: d.enrollment_count || 0, is_active: d.is_active ?? true,
          display_order: d.display_order || 0, resource_url: d.resource_url || "",
        });
      })
      .catch(() => {
        toast.show("That varg could not be loaded", "bad");
        navigate("/admin/vargs");
      })
      .finally(() => setLoading(false));
  }, [id, isNew, navigate, toast]);

  function pickVibhag(name) {
    const row = vibhagRows.find((v) => v.name_mr === name);
    // A district and taluka from the previous division are no longer valid.
    setForm((f) => ({
      ...f, vibhag_mr: name, vibhag_en: row?.name_en ?? "",
      district_mr: "", district_en: "", taluka: "",
    }));
  }

  function pickDistrict(name) {
    const row = districtRows.find((d) => d.name_mr === name);
    setForm((f) => ({ ...f, district_mr: name, district_en: row?.name_en ?? "", taluka: "" }));
  }

  async function save() {
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      setServerErrors({});
      const body = {
        ...form,
        school_name: form.school_name.trim(),
        village: form.village.trim(),
        enrollment_count: Number(form.enrollment_count) || 0,
        display_order: Number(form.display_order) || 0,
        resource_url: form.resource_url.trim(),
        // The ids are what the server checks the district -> taluka
        // relationship against; the names travel with them for display.
        district_id: districtId,
        taluka_id: talukaRows.find((t) => t.name_mr === form.taluka)?.id ?? null,
      };
      try {
        if (isNew) {
          await api.post("/admin/vargs", body);
          toast.success("Amrut Varg created successfully");
        } else {
          await api.put(`/admin/vargs/${id}`, body);
          toast.success("Amrut Varg updated successfully");
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
      await api.del(`/admin/vargs/${id}`);
      toast.success("Amrut Varg moved to trash");
      back();
    }).catch((err) => {
      setConfirmDelete(false);
      toast.error(errorMessage(err, "Could not delete that varg"));
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
          <h1 className="a-page-title">{isNew ? "Add Amrut Varg" : "Edit Amrut Varg"}</h1>
          <p className="a-page-desc">
            {isNew
              ? "A new class appears on the website as soon as it is marked active."
              : form.school_name || "—"}
          </p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={back}>
          <ArrowLeft size={16} /> Back to list
        </button>
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
          <Section title="Where" desc="Division, district and taluka come from Master Management.">
            <div className="a-form-grid a-form-grid-2">
              <div className={`a-field ${errFor("vibhag_mr") ? "has-error" : ""}`}>
                <label className="a-label a-label-required">Division (Marathi)</label>
                <GeoSelect master="vibhags" value={form.vibhag_mr}
                           onChange={pickVibhag} required placeholder="Select division" />
                {errFor("vibhag_mr") && <span className="a-field-error">{errFor("vibhag_mr")}</span>}
              </div>
              <div className="a-field">
                <label className="a-label">Division (English)</label>
                <input className="a-input" maxLength={MAX.geo} value={form.vibhag_en}
                       onChange={(e) => setForm({ ...form, vibhag_en: e.target.value })} />
                <span className="a-field-note">Filled in from the master; change it only if it is wrong.</span>
              </div>
            </div>

            <div className="a-form-grid a-form-grid-2">
              <div className={`a-field ${errFor("district_mr") ? "has-error" : ""}`}>
                <label className="a-label a-label-required">District (Marathi)</label>
                <GeoSelect master="districts" parentColumn="vibhag_id" parentId={vibhagId}
                           value={form.district_mr} onChange={pickDistrict}
                           required searchable placeholder="Select district"
                           waitingLabel="Select a division first"
                           emptyLabel="No active districts in this division — add one in District Master." />
                {errFor("district_mr")
                  ? <span className="a-field-error">{errFor("district_mr")}</span>
                  : <span className="a-field-note">Pick a division first. Type to search the list.</span>}
              </div>
              <div className="a-field">
                <label className="a-label">District (English)</label>
                <input className="a-input" maxLength={MAX.geo} value={form.district_en}
                       onChange={(e) => setForm({ ...form, district_en: e.target.value })} />
              </div>
            </div>

            <div className="a-form-grid a-form-grid-2">
              {/* Dependent on the district above: disabled until one is
                  chosen, refilled when it changes, and cleared by pickDistrict
                  so a taluka from the previous district can never be left
                  selected. The server re-checks the pair by id regardless. */}
              <div className={`a-field ${errFor("taluka") ? "has-error" : ""}`}>
                <label className="a-label">Taluka</label>
                <GeoSelect master="talukas" parentColumn="district_id" parentId={districtId}
                           value={form.taluka}
                           onChange={(v) => setForm((f) => ({ ...f, taluka: v }))}
                           searchable placeholder="Select taluka"
                           waitingLabel="Select a district first"
                           emptyLabel="No talukas recorded for this district yet — add them in Taluka Master." />
                {errFor("taluka")
                  ? <span className="a-field-error">{errFor("taluka")}</span>
                  : <span className="a-field-note">Optional. Pick a district first.</span>}
              </div>

              {/* REQ-09: directly below the taluka. Free text for now — this
                  database has no village master, and the field is written so
                  it can become a dependent dropdown later without the record
                  shape or the API changing. */}
              <div className={`a-field ${errFor("village") ? "has-error" : ""}`}>
                <label className="a-label">Village Name</label>
                <input className="a-input" maxLength={MAX.village}
                       placeholder="Enter village name"
                       value={form.village}
                       onChange={(e) => setForm({ ...form, village: e.target.value })} />
                {errFor("village")
                  ? <span className="a-field-error">{errFor("village")}</span>
                  : <span className="a-field-note">
                      Optional. The village or locality within the taluka.
                      {" "}{form.village.trim().length}/{MAX.village}
                    </span>}
              </div>
            </div>

            <div className="a-form-grid a-form-grid-2">
              <div className={`a-field ${errFor("enrollment_count") ? "has-error" : ""}`}>
                <label className="a-label">Enrollment Count</label>
                <input className="a-input" type="number" min="0" value={form.enrollment_count}
                       onChange={(e) => setForm({ ...form, enrollment_count: e.target.value })} />
                {errFor("enrollment_count")
                  ? <span className="a-field-error">{errFor("enrollment_count")}</span>
                  : <span className="a-field-note">Students currently enrolled, if known.</span>}
              </div>
            </div>
          </Section>

          <Section title="The class" desc="What the card on the website shows.">
            <TextField label="School / Location Name" required max={MAX.school}
                       hint="The place the class is held."
                       error={errFor("school_name")}
                       value={form.school_name} onChange={(v) => setForm({ ...form, school_name: v })} />
            <div className="a-form-grid a-form-grid-2">
              <TextField label="Varg Name" max={MAX.varg}
                         hint="Shown instead of the school name when given."
                         value={form.varg_name} onChange={(v) => setForm({ ...form, varg_name: v })} />
              <TextField label="Coordinator Name" max={MAX.coordinator}
                         value={form.coordinator_name}
                         onChange={(v) => setForm({ ...form, coordinator_name: v })} />
            </div>

            {/* Optional. Shown on the varg's details panel as a link, or as a
                player when the address is a video the site can embed. */}
            <div className={`a-field ${errFor("resource_url") ? "has-error" : ""}`}>
              <label className="a-label">Video / Resource URL</label>
              <input
                className="a-input"
                type="url"
                inputMode="url"
                placeholder="Enter a video or resource URL"
                value={form.resource_url}
                onChange={(e) => setForm({ ...form, resource_url: e.target.value })}
              />
              {errFor("resource_url")
                ? <span className="a-field-error">{errFor("resource_url")}</span>
                : <span className="a-field-note">
                    Add a school introduction video, website, or other relevant resource.
                    Leave it empty to show nothing. Clearing the box removes the link.
                  </span>}
            </div>
          </Section>
        </div>

        <aside className="a-form-side">
          <Section title="Listing" desc="Whether this varg appears, and where in the order.">
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={form.is_active}
                     onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active — show on the website
            </label>
            <div className={`a-field ${errFor("display_order") ? "has-error" : ""}`}>
              <label className="a-label">Display order</label>
              <input className="a-input" type="number" value={form.display_order}
                     onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
              {errFor("display_order")
                ? <span className="a-field-error">{errFor("display_order")}</span>
                : <span className="a-field-note">Lower numbers come first.</span>}
            </div>
            {!isNew && (
              <button className="a-btn a-btn-ghost a-btn-sm a-mt-1" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} /> Delete this varg
              </button>
            )}
          </Section>
        </aside>
      </div>

      <div className="a-save-bar">
        <span className="a-save-bar-state">
          {invalid ? `${Object.keys(errors).length} field(s) need attention` : "Ready to save"}
        </span>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-ghost" onClick={back}>Cancel</button>
          <button className="a-btn a-btn-primary" onClick={save} disabled={saving || invalid}>
            <Save size={16} /> {saving ? "Saving…" : isNew ? "Create varg" : "Save varg"}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={saving}
        title="Delete Amrut Varg"
        message="Delete this varg?"
        subMessage="It is removed from the website and moved to the trash. It can be restored later."
      />
    </>
  );
}
