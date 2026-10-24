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

// One district's office, added or edited on its own page.
//
// Every detail here is optional on purpose. This record exists so verified
// information can be published; a half-known office is the normal state, and
// an empty field is simply not shown to visitors. The one thing the form will
// not accept is a record with a district and nothing else — it would publish
// nothing while making the district look documented.
//
// Rules mirror src/modules/offices/offices.schema.js, which is what decides.

const EMPTY = {
  district_mr: "", district_id: null,
  office_name_mr: "", office_name_en: "",
  collector_name: "", collector_designation: "",
  address: "", phone: "", email: "", hours: "",
  website_url: "", map_url: "", is_active: true,
};

const MAX = {
  officeName: 200, collector: 200, designation: 150,
  address: 500, phone: 20, email: 200, hours: 200,
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const blank = (v) => !String(v ?? "").trim();

// Mirrors normalisePhone on the server: the length test is what decides a
// leading "91" is a country code.
const normalisePhone = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  return digits;
};

// The fields that count as "an office detail". Kept in step with the server's
// superRefine, which refuses a record where every one of them is empty.
const DETAIL_FIELDS = [
  "office_name_mr", "office_name_en", "collector_name", "collector_designation",
  "address", "phone", "email", "hours", "website_url", "map_url",
];

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
  if (!form.district_id) e.district_mr = "Choose a district";

  const lengths = [
    ["office_name_mr", MAX.officeName], ["office_name_en", MAX.officeName],
    ["collector_name", MAX.collector], ["collector_designation", MAX.designation],
    ["address", MAX.address], ["hours", MAX.hours], ["email", MAX.email],
  ];
  for (const [key, max] of lengths) {
    if (String(form[key]).trim().length > max) e[key] = `Cannot exceed ${max} characters`;
  }

  const email = form.email.trim();
  if (email && !EMAIL.test(email)) e.email = "Enter a valid email address";

  const phone = normalisePhone(form.phone);
  if (form.phone.trim() && !/^[0-9]{10}$/.test(phone)) {
    e.phone = phone.length
      ? `That is ${phone.length} digit${phone.length === 1 ? "" : "s"} — a phone number needs 10`
      : "Enter a 10-digit phone number, or leave it empty";
  }

  for (const key of ["website_url", "map_url"]) {
    const v = form[key].trim();
    if (v && !isSafeHttpUrl(v)) e[key] = "Enter a complete http:// or https:// address";
  }

  if (DETAIL_FIELDS.every((k) => blank(form[k]))) {
    e.office_name_mr = "Fill in at least one office detail — an empty office is not published";
  }
  return e;
}

export default function OfficeForm() {
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

  const back = () => navigate("/admin/offices");

  // The district is chosen by name, as everywhere else in this admin, and the
  // id is resolved from the master — that id is what the record is keyed on.
  const { rows: districtRows } = useGeo("districts");
  const districtId = districtRows.find((d) => d.name_mr === form.district_mr)?.id ?? null;

  const errors = useMemo(
    () => validate({ ...form, district_id: districtId ?? form.district_id }),
    [form, districtId]
  );
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
    api.get(`/admin/offices/${id}`)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setForm({
          district_mr: d.district_mr || "", district_id: d.district_id ?? null,
          office_name_mr: d.office_name_mr || "", office_name_en: d.office_name_en || "",
          collector_name: d.collector_name || "", collector_designation: d.collector_designation || "",
          address: d.address || "", phone: d.phone || "", email: d.email || "",
          hours: d.hours || "", website_url: d.website_url || "", map_url: d.map_url || "",
          is_active: d.is_active ?? true,
        });
      })
      .catch(() => {
        if (cancelled) return;
        toast.show("That office could not be loaded", "bad");
        navigate("/admin/offices");
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
        district_id: districtId ?? form.district_id,
        office_name_mr: form.office_name_mr.trim(),
        office_name_en: form.office_name_en.trim(),
        collector_name: form.collector_name.trim(),
        collector_designation: form.collector_designation.trim(),
        address: form.address.trim(),
        phone: normalisePhone(form.phone),
        email: form.email.trim(),
        hours: form.hours.trim(),
        website_url: form.website_url.trim(),
        map_url: form.map_url.trim(),
        is_active: form.is_active,
      };
      try {
        if (isNew) {
          await api.post("/admin/offices", body);
          toast.success("District office created successfully");
        } else {
          await api.put(`/admin/offices/${id}`, body);
          toast.success("District office updated successfully");
        }
        back();
      } catch (err) {
        if (err.details?.length) {
          setServerErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
          toast.show(`${err.details[0].field}: ${err.details[0].message}`, "bad");
        } else {
          toast.error(errorMessage(err, "Could not save the office"));
        }
        throw err;
      }
    }).catch(() => {});
  }

  async function remove() {
    await mutate(async () => {
      await api.del(`/admin/offices/${id}`);
      toast.success("District office moved to trash");
      back();
    }).catch((err) => {
      setConfirmDelete(false);
      toast.error(errorMessage(err, "Could not delete that office"));
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

  const text = (key, label, max, hint) => (
    <Field label={label} error={errFor(key)} show={showFor(key)} hint={hint}>
      <input className="a-input" maxLength={max} value={form[key]}
             onChange={(e) => set({ [key]: e.target.value }, key)}
             onBlur={() => touch(key)} />
    </Field>
  );

  return (
    <>
      <div className="a-detail-head">
        <div>
          <h1 className="a-page-title">{isNew ? "Add District Office" : "Edit District Office"}</h1>
          <p className="a-page-desc">
            {isNew
              ? "Record only what has been verified. Empty fields are not shown on the website."
              : form.district_mr || "—"}
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
            <Section title="District" desc="One office per district. The district comes from Master Management.">
              <Field label="District" required error={errFor("district_mr")} show={showFor("district_mr")}>
                <GeoSelect master="districts" value={form.district_mr}
                           onChange={(v) => set({ district_mr: v }, "district_mr")}
                           required searchable placeholder="Select district" />
              </Field>
            </Section>

            <Section
              title="The office"
              desc="Leave anything unconfirmed empty. Nothing here is filled in automatically."
            >
              <div className="a-form-grid a-form-grid-2">
                {text("office_name_mr", "Office name (Marathi)", MAX.officeName)}
                {text("office_name_en", "Office name (English)", MAX.officeName)}
              </div>
              <div className="a-form-grid a-form-grid-2">
                {text("collector_name", "Collector's name", MAX.collector,
                  "The officer's name, if it is to be published.")}
                {text("collector_designation", "Designation", MAX.designation,
                  "For example: जिल्हाधिकारी / District Collector.")}
              </div>
              <Field label="Address" error={errFor("address")} show={showFor("address")}>
                <textarea className="a-input a-textarea" rows={3} maxLength={MAX.address}
                          value={form.address}
                          onChange={(e) => set({ address: e.target.value }, "address")}
                          onBlur={() => touch("address")} />
              </Field>
            </Section>

            <Section title="Getting in touch" desc="Official numbers and addresses only.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Phone" error={errFor("phone")} show={showFor("phone")}
                       hint="10 digits. Spaces, dashes and a +91 prefix are removed on save.">
                  <input className="a-input" type="tel" inputMode="numeric" maxLength={MAX.phone}
                         value={form.phone}
                         onChange={(e) => set({ phone: e.target.value }, "phone")}
                         onBlur={() => touch("phone")} />
                </Field>
                <Field label="Email" error={errFor("email")} show={showFor("email")}>
                  <input className="a-input" type="email" maxLength={MAX.email} value={form.email}
                         onChange={(e) => set({ email: e.target.value }, "email")}
                         onBlur={() => touch("email")} />
                </Field>
              </div>
              {text("hours", "Working hours", MAX.hours,
                "Free text, for example: सोमवार–शुक्रवार, १०:००–१७:४५.")}
              <div className="a-form-grid a-form-grid-2">
                <Field label="Official website" error={errFor("website_url")} show={showFor("website_url")}
                       hint="The district administration's own site.">
                  <input className="a-input" type="url" placeholder="https://…" value={form.website_url}
                         onChange={(e) => set({ website_url: e.target.value }, "website_url")}
                         onBlur={() => touch("website_url")} />
                </Field>
                <Field label="Map link" error={errFor("map_url")} show={showFor("map_url")}
                       hint="A link to the office location. Opened in a new tab, never embedded.">
                  <input className="a-input" type="url" placeholder="https://…" value={form.map_url}
                         onChange={(e) => set({ map_url: e.target.value }, "map_url")}
                         onBlur={() => touch("map_url")} />
                </Field>
              </div>
            </Section>
          </div>

          <aside className="a-form-side">
            <Section title="Publishing" desc="Whether visitors see this office on the district's contact page.">
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.is_active}
                       onChange={(e) => set({ is_active: e.target.checked })} />
                Published — show on the website
              </label>
              <span className="a-field-help">
                Unpublishing keeps everything that has been typed but takes it off the site.
              </span>
              {!isNew && (
                <button type="button" className="a-btn a-btn-ghost a-btn-sm a-mt-1"
                        onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} /> Delete this office
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
              <Save size={16} /> {saving ? "Saving…" : isNew ? "Create office" : "Save office"}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={saving}
        title="Delete District Office"
        message="Delete this office record?"
        subMessage="It will be moved to the trash and can be restored later. Until then the district's contact page shows its Amrut Varg team only."
      />
    </>
  );
}
