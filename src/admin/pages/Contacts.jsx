import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { GeoSelect, GeoCheckList, useGeo } from "../components/ui/GeoSelect.jsx";

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

export default function Contacts() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("");
  const debouncedSearch = useDebounce(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const { mutate, loading: saving } = useMutation();

  const { data, meta, loading, error, refetch } = useList(
    "/admin/contacts",
    { page, limit, search: debouncedSearch, division },
    [page, limit, debouncedSearch, division]
  );

  // Role options come from the Directory section, so the picker cannot offer a
  // role the server would reject or the site could not put a label on.
  useEffect(() => {
    api.get("/admin/contacts/roles")
      .then((res) => setRoles(res.data.roles ?? []))
      .catch(() => toast.show("Could not load the role list", "bad"));
  }, [toast]);

  const errors = useMemo(() => validate(form), [form]);
  const invalid = Object.keys(errors).length > 0;
  const errorCount = Object.keys(errors).length;

  // A server message outranks the local one: it knows things the browser cannot,
  // such as whether a district really belongs to the chosen division.
  const errFor = (k) => serverErrors[k] ?? errors[k];
  const showFor = (k) => Boolean(serverErrors[k]) || submitted || touched[k];

  const reset = useCallback((next) => {
    setForm(next);
    setTouched({});
    setSubmitted(false);
    setServerErrors({});
  }, []);

  // Editing a field clears the server's verdict on it — that verdict was about
  // the old value, and leaving it would argue with what is now on screen.
  const set = (values, field) => {
    setForm((f) => ({ ...f, ...values }));
    if (field) setServerErrors((s) => (s[field] ? { ...s, [field]: undefined } : s));
  };
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  function openNew() {
    setEditId(null);
    reset({ ...EMPTY, role: roles[0]?.value ?? "" });
    setFormOpen(true);
  }

  async function openEdit(row) {
    try {
      const res = await api.get(`/admin/contacts/${row.id}`);
      const d = res.data;
      setEditId(d.id);
      reset({
        division_mr: d.division_mr, division_en: d.division_en || "", role: d.role,
        districts: d.districts || [], name: d.name, email: d.email || "",
        phone: d.phone || "", is_active: d.is_active ?? true, display_order: d.display_order || 0,
      });
      setFormOpen(true);
    } catch (err) {
      toast.show(err.message || "Could not open that contact", "bad");
    }
  }

  // Division drives which districts may be picked. Field names, order and the
  // submitted array of Marathi names are unchanged.
  const { rows: divisionRows } = useGeo("vibhags");
  const divisionId = divisionRows.find((d) => d.name_mr === form.division_mr)?.id ?? null;

  function pickDivision(name) {
    // Districts from the previous division no longer belong to this contact.
    const row = divisionRows.find((d) => d.name_mr === name);
    set({ division_mr: name, division_en: row?.name_en ?? "", districts: [] }, "division_mr");
    setServerErrors((s) => ({ ...s, districts: undefined }));
    touch("division_mr");
  }

  async function handleSave(e) {
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
        if (editId) {
          await api.put(`/admin/contacts/${editId}`, body);
          toast.show("Contact updated", "ok");
        } else {
          await api.post("/admin/contacts", body);
          toast.show("Contact created", "ok");
        }
        setFormOpen(false);
        refetch();
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

  const roleLabel = (v) => roles.find((r) => r.value === v)?.label || v;

  const columns = [
    { key: "name", label: "Name", render: (v) => <span className="td-bold">{v}</span> },
    { key: "role", label: "Role", render: (v) => <Badge tone="neutral">{roleLabel(v)}</Badge> },
    { key: "division_mr", label: "Division" },
    { key: "phone", label: "Phone", render: (v) => v || <span className="td-muted">—</span> },
    { key: "email", label: "Email", render: (v) => v ? <span className="td-truncate">{v}</span> : <span className="td-muted">—</span> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search contacts…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={division} onChange={(e) => { setDivision(e.target.value); setPage(1); }}>
        <option value="">All divisions</option>
        {divisionRows.map((d) => <option key={d.id} value={d.name_mr}>{d.name_mr}</option>)}
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={openNew}><Plus size={16} /> Add new</button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">District Contacts</h1>
          <p className="a-page-desc">Regional team contacts across Maharashtra</p>
        </div>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} error={error} meta={meta} onPage={setPage} onPageSize={(n) => { setLimit(n); setPage(1); }} toolbar={toolbar}
        actions={(row) => (
          <>
            <button className="a-action-btn" onClick={() => openEdit(row)} title="Edit"><Pencil size={15} /></button>
            <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete"><Trash2 size={15} /></button>
          </>
        )}
      />
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? "Edit Contact" : "New Contact"} size="lg"
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="a-btn a-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} noValidate>
          <div className="a-form-section">
            {submitted && invalid && (
              <div className="a-notice a-notice-warn">
                <div className="a-notice-body">
                  <p className="a-notice-title">{errorCount} field(s) need attention</p>
                  <p>Saving is blocked until the highlighted fields are corrected.</p>
                </div>
              </div>
            )}

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

            <Field label="Districts" error={errFor("districts")} show={showFor("districts")}
                   hint={divisionId ? "Only districts in the chosen division are offered." : undefined}>
              <GeoCheckList master="districts" parentColumn="vibhag_id" parentId={divisionId}
                            value={form.districts}
                            onChange={(districts) => set({ districts }, "districts")} />
            </Field>

            <div className="a-form-grid a-form-grid-2">
              <Field label="Display order" error={errFor("display_order")} show={showFor("display_order")}
                     hint="Lower numbers come first within a division.">
                <input className="a-input" type="number" min="0" max="9999" value={form.display_order}
                       onChange={(e) => set({ display_order: e.target.value === "" ? 0 : Number(e.target.value) }, "display_order")}
                       onBlur={() => touch("display_order")} />
              </Field>
              <div className="a-field">
                <label className="a-checkbox-label">
                  <input type="checkbox" className="a-checkbox" checked={form.is_active}
                         onChange={(e) => set({ is_active: e.target.checked })} />
                  Active
                </label>
                <span className="a-field-help">Inactive contacts stay saved but are hidden from the website.</span>
              </div>
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={async () => { await mutate(async () => { await api.del(`/admin/contacts/${confirmId}`); toast.show("Deleted", "ok"); setConfirmId(null); refetch(); }); }} loading={saving} title="Delete Contact" message="Delete this contact?" />
    </>
  );
}
