import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { GeoSelect, GeoCheckList, useGeo } from "../components/ui/GeoSelect.jsx";

// One district contact, added or edited on its own page rather than in a
// dialog. The fields, the rules and the request body are exactly what the list
// screen sent before; only the surface changed.
//
// Limits and rules mirror src/modules/contacts/contacts.schema.js exactly. The
// browser catches mistakes before the request; the server is still what
// decides, and its field-level errors land on the same inputs.
const MAX = { division: 100, name: 200, email: 200, phone: 20 };

const EMPTY = {
  division_mr: "", division_en: "", role: "", districts: [],
  name: "", email: "", phone: "", is_active: true, display_order: 0,
};

const blank = (v) => !String(v ?? "").trim();

// Digits only, with a country code removed. Mirrors normalisePhone on the
// server: the length test is what decides a leading "91" is a country code,
// because 9112227668 is itself a valid ten-digit number.
const normalisePhone = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  return digits;
};

// Deliberately not the "one true" email regex — it rejects what a reader would
// call malformed and leaves the rest to the server, which is the authority.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(form) {
  const e = {};
  if (blank(form.division_mr)) e.division_mr = "Choose a division";
  else if (form.division_mr.length > MAX.division) e.division_mr = `Cannot exceed ${MAX.division} characters`;

  if (form.division_en.length > MAX.division) e.division_en = `Cannot exceed ${MAX.division} characters`;

  if (blank(form.name)) e.name = "Name is required";
  else if (form.name.trim().length > MAX.name) e.name = `Cannot exceed ${MAX.name} characters`;

  if (blank(form.role)) e.role = "Choose a role";

  const email = form.email.trim();
  if (email && !EMAIL.test(email)) e.email = "Enter a valid email address";
  else if (email.length > MAX.email) e.email = `Cannot exceed ${MAX.email} characters`;

  const phone = normalisePhone(form.phone);
  if (form.phone.trim() && !/^[0-9]{10}$/.test(phone)) {
    e.phone = phone.length
      ? `That is ${phone.length} digit${phone.length === 1 ? "" : "s"} — a mobile number needs 10`
      : "Enter a 10-digit mobile number";
  }

  if (form.districts.length > 40) e.districts = "At most 40 districts";

  const order = Number(form.display_order);
  if (!Number.isInteger(order) || order < 0) e.display_order = "A whole number, 0 or more";
  else if (order > 9999) e.display_order = "Cannot exceed 9999";

  return e;
}

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

export default function ContactForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id;

  const [form, setForm] = useState(EMPTY);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate, loading: saving } = useMutation();

  const back = () => navigate("/admin/contacts");

  const errors = useMemo(() => validate(form), [form]);
  const invalid = Object.keys(errors).length > 0;
  const errorCount = Object.keys(errors).length;

  // A server message outranks the local one: it knows things the browser cannot,
  // such as whether a district really belongs to the chosen division.
  const errFor = (k) => serverErrors[k] ?? errors[k];
  const showFor = (k) => Boolean(serverErrors[k]) || submitted || touched[k];

  // Editing a field clears the server's verdict on it — that verdict was about
  // the old value, and leaving it would argue with what is now on screen.
  const set = (values, field) => {
    setForm((f) => ({ ...f, ...values }));
    if (field) setServerErrors((s) => (s[field] ? { ...s, [field]: undefined } : s));
  };
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  // Role options come from the Directory section, so the picker cannot offer a
  // role the server would reject or the site could not put a label on.
  useEffect(() => {
    api.get("/admin/contacts/roles")
      .then((res) => setRoles(res.data.roles ?? []))
      .catch(() => toast.show("Could not load the role list", "bad"));
  }, [toast]);

  // A new contact opens on the first role, as it did in the dialog.
  useEffect(() => {
    if (!isNew || !roles.length) return;
    setForm((f) => (f.role ? f : { ...f, role: roles[0].value }));
  }, [isNew, roles]);

  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    api.get(`/admin/contacts/${id}`)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setForm({
          division_mr: d.division_mr, division_en: d.division_en || "", role: d.role,
          districts: d.districts || [], name: d.name, email: d.email || "",
          phone: d.phone || "", is_active: d.is_active ?? true, display_order: d.display_order || 0,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.show(err.message || "Could not open that contact", "bad");
        navigate("/admin/contacts");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isNew, navigate, toast]);

  // Division drives which districts may be picked.
  const { rows: divisionRows } = useGeo("vibhags");
  const divisionId = divisionRows.find((d) => d.name_mr === form.division_mr)?.id ?? null;

  function pickDivision(name) {
    // Districts from the previous division no longer belong to this contact.
    const row = divisionRows.find((d) => d.name_mr === name);
    set({ division_mr: name, division_en: row?.name_en ?? "", districts: [] }, "division_mr");
    setServerErrors((s) => ({ ...s, districts: undefined }));
    touch("division_mr");
  }

  async function save(e) {
    e?.preventDefault();
    setSubmitted(true);
    setServerErrors({});
    if (invalid) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      // Sent in the shape the server stores, so what is saved is what the form
      // showed: phone stripped of spacing, text trimmed.
      const body = {
        ...form,
        division_mr: form.division_mr.trim(),
        division_en: form.division_en.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: normalisePhone(form.phone),
        display_order: Number(form.display_order) || 0,
      };
      try {
        if (isNew) {
          await api.post("/admin/contacts", body);
          toast.show("Contact created", "ok");
        } else {
          await api.put(`/admin/contacts/${id}`, body);
          toast.show("Contact updated", "ok");
        }
        back();
      } catch (err) {
        if (err.details?.length) {
          // Several issues can land on one field — the district list reports one
          // per bad name — so they are joined rather than silently dropped.
          const byField = {};
          err.details.forEach((d) => {
            byField[d.field] = byField[d.field] ? `${byField[d.field]} ${d.message}` : d.message;
          });
          setServerErrors(byField);
          toast.show(`${err.details[0].field}: ${err.details[0].message}`, "bad");
        } else {
          toast.show(err.message || "Could not save the contact", "bad");
        }
        throw err;
      }
    }).catch(() => {});
  }

  async function remove() {
    await mutate(async () => {
      await api.del(`/admin/contacts/${id}`);
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

  return (
    <>
      <div className="a-detail-head">
        <div>
          <h1 className="a-page-title">{isNew ? "Add Contact" : "Edit Contact"}</h1>
          <p className="a-page-desc">
            {isNew
              ? "A new contact appears in the district directory as soon as it is marked active."
              : form.name || "—"}
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
            <Section title="The person" desc="Who this is, and what they are listed as.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Name" required error={errFor("name")} show={showFor("name")}>
                  <input className="a-input" maxLength={MAX.name} value={form.name}
                         onChange={(e) => set({ name: e.target.value }, "name")}
                         onBlur={() => touch("name")} />
                </Field>
                <Field label="Role" required error={errFor("role")} show={showFor("role")}
                       hint="Roles are managed under Website › Directory Page.">
                  <select className="a-input" value={form.role}
                          onChange={(e) => set({ role: e.target.value }, "role")}
                          onBlur={() => touch("role")}>
                    <option value="">Select role</option>
                    {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    {/* Keeps a role the Directory section no longer lists selectable. */}
                    {form.role && !roles.some((r) => r.value === form.role) && (
                      <option value={form.role}>{form.role} (not in the role list)</option>
                    )}
                  </select>
                </Field>
              </div>

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
            </Section>

            <Section title="Where they cover" desc="Division comes from the Vibhag master; it decides which districts may be ticked.">
              <div className="a-form-grid a-form-grid-2">
                <Field label="Division (Marathi)" required
                       error={errFor("division_mr")} show={showFor("division_mr")}>
                  <GeoSelect master="vibhags" value={form.division_mr} onChange={pickDivision}
                             placeholder="Select division" />
                </Field>
                <Field label="Division (English)" error={errFor("division_en")} show={showFor("division_en")}
                       hint="Filled in from the master when you pick a division.">
                  <input className="a-input" maxLength={MAX.division} value={form.division_en}
                         onChange={(e) => set({ division_en: e.target.value }, "division_en")}
                         onBlur={() => touch("division_en")} />
                </Field>
              </div>

              <Field label="Districts" error={errFor("districts")} show={showFor("districts")}
                     hint={divisionId ? "Only districts in the chosen division are offered." : "Pick a division first."}>
                <GeoCheckList master="districts" parentColumn="vibhag_id" parentId={divisionId}
                              value={form.districts}
                              onChange={(districts) => set({ districts }, "districts")} />
              </Field>
            </Section>
          </div>

          <aside className="a-form-side">
            <Section title="Listing" desc="Whether this contact appears, and where in the order.">
              <label className="a-checkbox-label">
                <input type="checkbox" className="a-checkbox" checked={form.is_active}
                       onChange={(e) => set({ is_active: e.target.checked })} />
                Active — show on the website
              </label>
              <Field label="Display order" error={errFor("display_order")} show={showFor("display_order")}
                     hint="Lower numbers come first within a division.">
                <input className="a-input" type="number" min="0" max="9999" value={form.display_order}
                       onChange={(e) => set({ display_order: e.target.value === "" ? 0 : Number(e.target.value) }, "display_order")}
                       onBlur={() => touch("display_order")} />
              </Field>
              {!isNew && (
                <button type="button" className="a-btn a-btn-ghost a-btn-sm a-mt-1"
                        onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} /> Delete this contact
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
              <Save size={16} /> {saving ? "Saving…" : isNew ? "Create contact" : "Save contact"}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={saving}
        title="Delete Contact"
        message="Delete this contact?"
      />
    </>
  );
}
