import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Rocket, Undo2, Search, Save } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation, useDebounce } from "../hooks/useApi.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Modal, ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge, Switch } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

// Only the wording around each form and whether it accepts submissions are
// editable. Fields, validation and endpoints belong to the form components and
// are shown here read-only.
const MAX = { title: 120, intro: 600, submit: 60, success: 120, desc: 400, closed: 300 };

const fmtStamp = (v) => (v ? new Date(v).toLocaleString("en-IN") : "—");

function TextField({ label, value, onChange, max, textarea, required }) {
  return (
    <div className="a-field">
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      {textarea ? (
        <textarea className="a-input a-textarea" rows={3} maxLength={max}
                  value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="a-input" maxLength={max}
               value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      <span className="a-char-count">{(value || "").length} / {max}</span>
    </div>
  );
}

function Bilingual({ label, base, obj, onPatch, max, textarea, required, hint }) {
  return (
    <>
      <div className="a-form-grid a-form-grid-2">
        <TextField label={`${label} (Marathi)`} required={required} max={max} textarea={textarea}
                   value={obj[`${base}_mr`] ?? ""} onChange={(v) => onPatch({ [`${base}_mr`]: v })} />
        <TextField label={`${label} (English)`} max={max} textarea={textarea}
                   value={obj[`${base}_en`] ?? ""} onChange={(v) => onPatch({ [`${base}_en`]: v })} />
      </div>
      {hint && <span className="a-field-help">{hint}</span>}
    </>
  );
}

export default function Forms() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(null);
  const { mutate, loading: saving } = useMutation();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/forms")
      .then((res) => setRows(res.data))
      .catch(() => toast.show("Could not load forms", "bad"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.route, r.draft?.title_mr, r.draft?.title_en].join(" ").toLowerCase().includes(q)
    );
  }, [rows, debounced]);

  // DataTable paginates from meta; the registry is three fixed forms, so one page.
  const meta = { total: filtered.length, page: 1, pageSize: Math.max(filtered.length, 1), totalPages: 1 };

  function openEdit(row) {
    setEditRow(row);
    setDraft({ ...row.draft });
  }

  async function saveDraft() {
    await mutate(async () => {
      const res = await api.put(`/admin/forms/${editRow.key}/draft`, draft);
      setDraft(res.data.draft);
      toast.show("Draft saved — not yet live", "ok");
      load();
    });
  }

  async function publish(key, body) {
    await mutate(async () => {
      if (body) await api.put(`/admin/forms/${key}/draft`, body);
      await api.post(`/admin/forms/${key}/publish`);
      toast.show("Published — the website is updated", "ok");
      setEditRow(null);
      load();
    });
  }

  async function discard(key) {
    await mutate(async () => {
      const res = await api.post(`/admin/forms/${key}/discard`);
      if (editRow?.key === key) setDraft(res.data.draft);
      setConfirmDiscard(null);
      toast.show("Draft reset to the published version", "ok");
      load();
    });
  }

  // Publishing the active flag straight from the list, since that is the one
  // setting an administrator is most likely to flip in a hurry.
  async function toggleActive(row) {
    const next = { ...row.published, is_active: row.published.is_active === false };
    await publish(row.key, next);
  }

  const columns = [
    {
      key: "name",
      label: "Form",
      render: (v, row) => (
        <>
          <span className="td-bold">{v}</span>
          <span className="a-text-muted a-text-xs" style={{ display: "block" }}>{row.route}</span>
        </>
      ),
    },
    {
      key: "fieldCount",
      label: "Fields",
      render: (v, row) => (
        <span className="a-tabular">
          {v}{row.hasUpload ? " + file" : ""}
        </span>
      ),
    },
    {
      key: "has_unpublished_changes",
      label: "Config",
      render: (v) => v
        ? <Badge tone="warn">Unpublished changes</Badge>
        : <Badge tone="ok">Published</Badge>,
    },
    {
      key: "published",
      label: "Accepting",
      render: (v, row) => <Switch on={v?.is_active !== false} onToggle={() => toggleActive(row)} />,
    },
    {
      key: "updated_at",
      label: "Last updated",
      render: (v) => <span className="a-text-sm">{fmtStamp(v)}</span>,
    },
  ];

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Forms</h1>
          <p className="a-page-desc">
            Manage the wording and availability of the website&apos;s public forms
          </p>
        </div>
      </div>

      <div className="a-notice a-notice-info">
        <div className="a-notice-body">
          <p className="a-notice-title">Fields are not editable here</p>
          <p>
            Each form&apos;s fields, validation rules and submission endpoint are fixed in code and
            shown read-only. This page manages the title, intro, button label, success message and
            whether the form accepts submissions.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        meta={meta}
        onPage={() => {}}
        onPageSize={() => {}}
        toolbar={
          <div className="a-search-wrap">
            <Search className="a-search-icon" size={16} />
            <input className="a-search" placeholder="Search forms…" value={search}
                   onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
        actions={(row) => (
          <>
            <button className="a-action-btn" onClick={() => setViewRow(row)} title="View">
              <Eye size={15} />
            </button>
            <button className="a-action-btn" onClick={() => openEdit(row)} title="Edit configuration">
              <Pencil size={15} />
            </button>
          </>
        )}
      />

      {/* View — read-only, including the field contract */}
      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Form Details" size="lg"
             footer={<button className="a-btn a-btn-ghost" onClick={() => setViewRow(null)}>Close</button>}>
        {viewRow && (
          <>
            <div className="a-view-tags">
              <Badge tone={viewRow.published?.is_active === false ? "bad" : "ok"}>
                {viewRow.published?.is_active === false ? "Not accepting" : "Accepting submissions"}
              </Badge>
              {viewRow.has_unpublished_changes && <Badge tone="warn">Unpublished changes</Badge>}
            </div>
            <div className="a-view-list">
              <div className="a-view-row"><span className="a-view-label">Form</span>
                <div className="a-view-value a-view-strong">{viewRow.name}</div></div>
              <div className="a-view-row"><span className="a-view-label">Where it appears</span>
                <div className="a-view-value">{viewRow.route}</div></div>
              <div className="a-view-row"><span className="a-view-label">Component</span>
                <div className="a-view-value"><code className="a-text-xs">{viewRow.component}</code></div></div>
              <div className="a-view-row"><span className="a-view-label">Endpoint</span>
                <div className="a-view-value"><code className="a-text-xs">{viewRow.endpoint}</code></div></div>
              <div className="a-view-row"><span className="a-view-label">Fields</span>
                <div className="a-view-value">
                  {viewRow.fieldCount} fields{viewRow.hasUpload ? " + 1 file upload" : ""} — fixed in code
                </div></div>
              <div className="a-view-row"><span className="a-view-label">Published title</span>
                <div className="a-view-value">{viewRow.published?.title_mr}</div></div>
              <div className="a-view-row"><span className="a-view-label">Last published</span>
                <div className="a-view-value">{fmtStamp(viewRow.published_at)}</div></div>
            </div>
          </>
        )}
      </Modal>

      {/* Edit configuration */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)}
             title={editRow ? `${editRow.name} — configuration` : ""} size="lg"
             footer={
               <>
                 <button className="a-btn a-btn-ghost" onClick={() => setEditRow(null)}>Cancel</button>
                 {editRow?.has_unpublished_changes && (
                   <button className="a-btn a-btn-ghost" onClick={() => setConfirmDiscard(editRow.key)}>
                     <Undo2 size={15} /> Discard draft
                   </button>
                 )}
                 <button className="a-btn a-btn-secondary" onClick={saveDraft} disabled={saving}>
                   <Save size={16} /> Save draft
                 </button>
                 <button className="a-btn a-btn-primary" onClick={() => publish(editRow.key, draft)} disabled={saving}>
                   <Rocket size={16} /> {saving ? "Publishing…" : "Publish"}
                 </button>
               </>
             }>
        {draft && editRow && (
          <div className="a-form-section">
            <Bilingual label="Form title" base="title" obj={draft} required max={MAX.title}
                       onPatch={(v) => setDraft({ ...draft, ...v })} />
            <Bilingual label="Intro text" base="intro" obj={draft} textarea max={MAX.intro}
                       hint="Optional. Shown above the fields; leave blank to keep the form as it is."
                       onPatch={(v) => setDraft({ ...draft, ...v })} />
            <Bilingual label="Submit button" base="submit_label" obj={draft} max={MAX.submit}
                       hint="Leave blank to keep the current button text."
                       onPatch={(v) => setDraft({ ...draft, ...v })} />

            <div className="a-form-divider" />
            <Bilingual label="Success title" base="success_title" obj={draft} max={MAX.success}
                       onPatch={(v) => setDraft({ ...draft, ...v })} />
            <Bilingual label="Success message" base="success_desc" obj={draft} textarea max={MAX.desc}
                       onPatch={(v) => setDraft({ ...draft, ...v })} />

            <div className="a-form-divider" />
            <label className="a-checkbox-label">
              <input type="checkbox" className="a-checkbox" checked={draft.is_active !== false}
                     onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
              Accepting submissions
            </label>
            <Bilingual label="Closed message" base="closed_message" obj={draft} textarea max={MAX.closed}
                       hint="Shown to visitors while the form is not accepting submissions. The server refuses these submissions too."
                       onPatch={(v) => setDraft({ ...draft, ...v })} />

            <div className="a-form-divider" />
            <p className="a-field-help">
              This form has {editRow.fieldCount} fields{editRow.hasUpload ? " and one file upload" : ""},
              defined in <code>{editRow.component}</code> and posted to <code>{editRow.endpoint}</code>.
              Fields and validation are not editable from the Admin Panel.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDiscard}
        onClose={() => setConfirmDiscard(null)}
        onConfirm={() => discard(confirmDiscard)}
        loading={saving}
        title="Discard draft"
        message="Throw away the draft and start again from the published configuration?"
        subMessage="The live website is not affected."
      />
    </>
  );
}
