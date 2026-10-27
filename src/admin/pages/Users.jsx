import { useState } from "react";
import { Plus, Pencil, Search } from "lucide-react";
import { useList, useDebounce } from "../hooks/useApi.js";
import { api } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { useGeo } from "../components/ui/GeoSelect.jsx";
import { Field, fieldErrors } from "../components/ui/FormBits.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { ASSIGNABLE_ROLES, ROLE_LABELS, roleLabel } from "../lib/roles.js";
import { errorMessage } from "../lib/errors.js";

// Administrator accounts and their jurisdictions — State Coordinator only.
// A Divisional Manager is tied to a division, a District Manager to a
// district; changing either signs that person out so the new boundary applies
// at once.

const EMPTY = { name: "", email: "", phone: "", role: "district_manager", vibhag_id: "", district_id: "", password: "", is_active: true };
const ROLE_TONE = { superadmin: "bad", admin: "bad", state_coordinator: "accent", division_manager: "info", district_manager: "ok" };

function UserForm({ initial, onClose, onSaved, self }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const vibhags = useGeo("vibhags");
  const districts = useGeo("districts", "vibhag_id", form.vibhag_id || null);
  const isNew = !initial.id;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a 10-digit mobile number (used for SMS alerts)";
    if (isNew && form.password.length < 8) e.password = "At least 8 characters";
    if (!isNew && form.password && form.password.length < 8) e.password = "At least 8 characters";
    if (form.role === "division_manager" && !form.vibhag_id) e.vibhag_id = "Choose the division";
    if (form.role === "district_manager" && !form.district_id) e.district_id = "Choose the district";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const body = {
      ...form,
      vibhag_id: form.vibhag_id ? Number(form.vibhag_id) : null,
      district_id: form.district_id ? Number(form.district_id) : null,
    };
    try {
      if (isNew) await api.post("/admin/users", body);
      else await api.put(`/admin/users/${initial.id}`, body);
      toast.success(isNew ? "User created" : "User updated");
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, "Could not save the user"));
    } finally {
      setSaving(false);
    }
  }

  const needsDivision = form.role === "division_manager" || form.role === "district_manager";

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Add user" : `Edit ${initial.name}`}
      size="lg"
      footer={
        <>
          <button className="a-btn a-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="a-btn a-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </>
      }
    >
      <div className="a-form-grid a-form-grid-2">
        <Field label="Name" required error={errors.name}><input className="a-input" value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Email (sign-in)" required error={errors.email}><input className="a-input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Mobile (for SMS alerts)" error={errors.phone}><input className="a-input" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label={isNew ? "Password" : "New password"} required={isNew} error={errors.password} hint={isNew ? null : "Leave blank to keep the current password"}>
          <input className="a-input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set({ password: e.target.value })} />
        </Field>
        <Field label="Role" required error={errors.role} hint={self ? "You cannot change your own role" : null}>
          <select className="a-input" value={form.role} disabled={self} onChange={(e) => set({ role: e.target.value, vibhag_id: "", district_id: "" })}>
            {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <label className="a-checkbox-label">
            <input type="checkbox" className="a-checkbox" checked={form.is_active} disabled={self} onChange={(e) => set({ is_active: e.target.checked })} />
            Account active
          </label>
        </Field>
        {needsDivision && (
          <Field label="Division" required={form.role === "division_manager"} error={errors.vibhag_id}>
            <select className="a-input" value={form.vibhag_id} onChange={(e) => set({ vibhag_id: e.target.value, district_id: "" })}>
              <option value="">Select…</option>
              {vibhags.rows.map((v) => <option key={v.id} value={v.id}>{v.name_en || v.name_mr} · {v.name_mr}</option>)}
            </select>
          </Field>
        )}
        {form.role === "district_manager" && (
          <Field label="District" required error={errors.district_id}>
            <select className="a-input" value={form.district_id} disabled={!form.vibhag_id} onChange={(e) => set({ district_id: e.target.value })}>
              <option value="">{form.vibhag_id ? "Select…" : "Choose the division first"}</option>
              {districts.rows.map((d) => <option key={d.id} value={d.id}>{d.name_en || d.name_mr} · {d.name_mr}</option>)}
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAdminAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [editing, setEditing] = useState(null);
  const debounced = useDebounce(search);

  const { data, meta, loading, error, refetch } = useList(
    "/admin/users",
    { page, limit, search: debounced, role },
    [page, limit, debounced, role]
  );

  const columns = [
    { key: "name", label: "Name", render: (v, row) => <span className="td-bold">{v}<br /><span className="a-text-muted a-text-sm">{row.email}</span></span> },
    { key: "role", label: "Role", render: (v) => <Badge tone={ROLE_TONE[v]}>{roleLabel(v)}</Badge> },
    {
      key: "district_en",
      label: "Jurisdiction",
      render: (_, row) => row.district_id ? `${row.district_en || row.district_mr} district`
        : row.vibhag_id ? `${row.vibhag_en || row.vibhag_mr} division` : "State-wide",
    },
    { key: "phone", label: "SMS", render: (v) => v || <span className="td-muted">—</span> },
    { key: "is_active", label: "Status", render: (v) => <Badge tone={v ? "ok" : "neutral"}>{v ? "Active" : "Inactive"}</Badge> },
  ];

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="Search users…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <select className="a-select" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
        <option value="">All roles</option>
        {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </select>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-primary" onClick={() => setEditing(EMPTY)}><Plus size={16} /> Add user</button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Users &amp; Roles</h1>
          <p className="a-page-desc">State Coordinators see everything; Divisional Managers their division; District Managers only their district.</p>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        error={error}
        meta={meta}
        onPage={setPage}
        onPageSize={(n) => { setLimit(n); setPage(1); }}
        toolbar={toolbar}
        actions={(row) => (
          <button className="a-action-btn" title="Edit" onClick={() => setEditing({
            ...EMPTY, ...row, phone: row.phone || "", password: "",
            vibhag_id: row.vibhag_id ?? "", district_id: row.district_id ?? "",
          })}>
            <Pencil size={15} />
          </button>
        )}
      />
      {editing && (
        <UserForm
          initial={editing}
          self={editing.id === me?.id}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}
    </>
  );
}
