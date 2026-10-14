import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Paperclip, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { FORM_LABELS, groupSubmission } from "../lib/submissionFields.js";

const STATUSES = ["new", "reviewed", "actioned", "archived"];
const STATUS_TONE = { new: "info", reviewed: "ok", actioned: "accent", archived: "neutral" };

// Uploads are stored as site-relative paths and served by the API, not by the
// admin's dev server, so they need the API origin in front.
const API_ORIGIN = import.meta.env.VITE_CMS_API?.replace("/api/v1", "") || "http://localhost:4000";
const fileUrl = (url) => (url?.startsWith("http") ? url : `${API_ORIGIN}${url}`);

const fmtStamp = (v) => (v ? new Date(v).toLocaleString("en-IN") : "—");

const isImage = (name = "") => /\.(jpe?g|png|webp|gif)$/i.test(name);

// A card with a heading and a line explaining what it holds.
function Panel({ title, desc, children, wide }) {
  return (
    <section className={`a-card a-panel${wide ? " a-panel--wide" : ""}`}>
      <header className="a-panel-head">
        <h2 className="a-panel-title">{title}</h2>
        {desc && <p className="a-panel-desc">{desc}</p>}
      </header>
      <div className="a-panel-body">{children}</div>
    </section>
  );
}

// Label above value, the way a record reads rather than a form.
function Line({ label, children, empty }) {
  return (
    <div className="a-line">
      <span className="a-line-label">{label}</span>
      <div className={`a-line-value${empty ? " is-empty" : ""}`}>{empty ? "—" : children}</div>
    </div>
  );
}

export default function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ status: "", notes: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate, loading: saving } = useMutation();

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/submissions/${id}`)
      .then((res) => {
        setRow(res.data);
        setForm({ status: res.data.status, notes: res.data.notes || "" });
      })
      .catch(() => toast.show("Could not load this submission", "bad"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(load, [load]);

  async function save() {
    await mutate(async () => {
      await api.put(`/admin/submissions/${id}/status`, form);
      toast.show("Status updated", "ok");
      load();
    });
  }

  async function remove() {
    await mutate(async () => {
      await api.del(`/admin/submissions/${id}`);
      toast.show("Deleted", "ok");
      navigate("/admin/submissions");
    });
  }

  if (loading) {
    return (
      <div className="a-spinner">
        <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading submission…
      </div>
    );
  }

  if (!row) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Submission not found</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/submissions")}>
          <ArrowLeft size={16} /> Back to submissions
        </button>
      </div>
    );
  }

  const sections = groupSubmission(row.form_type, row.data);
  const files = Array.isArray(row.files) ? row.files : [];
  const dirty = form.status !== row.status || (form.notes || "") !== (row.notes || "");
  const formName = FORM_LABELS[row.form_type] ?? row.form_type;

  return (
    <>
      {/* Page heading: status, what this is, and the way back */}
      <div className="a-detail-head">
        <div>
          <Badge tone={STATUS_TONE[row.status] || "neutral"}>{row.status}</Badge>
          <h1 className="a-page-title a-mt-1">View {formName.toLowerCase()}</h1>
          <p className="a-page-desc">
            Read-only. Use the Review panel to change the status.
          </p>
        </div>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/submissions")}>
            <ArrowLeft size={16} /> Back
          </button>
          {!row.deleted_at && (
            <button className="a-btn a-btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="a-detail-grid">
        {/* Main column — the submitted answers */}
        <div className="a-detail-main">
          {sections.map((section, i) => (
            <Panel
              key={section.title}
              title={section.title}
              desc={i === 0 ? `What was submitted on the ${formName.toLowerCase()} form.` : null}
            >
              {section.rows.map((r) => (
                <Line key={r.key} label={r.label} empty={r.value === null}>
                  {r.value}
                </Line>
              ))}
            </Panel>
          ))}

          {files.length > 0 && (
            <Panel title="Attachments" desc="Files uploaded with this submission.">
              <div className="a-sub-files">
                {files.map((f) => (
                  <a key={f.filename} className="a-sub-file" href={fileUrl(f.url)}
                     target="_blank" rel="noopener noreferrer">
                    {isImage(f.filename)
                      ? <img src={fileUrl(f.url)} alt={f.originalName || f.field} loading="lazy" />
                      : <span className="a-sub-file-icon"><Paperclip size={18} /></span>}
                    <span className="a-sub-file-name">{f.originalName || f.filename}</span>
                  </a>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Side column — record metadata and the one editable thing */}
        <aside className="a-detail-side">
          <Panel title="Submission">
            <Line label="Form">{formName}</Line>
            <Line label="Reference">#{row.id}</Line>
            <Line label="Submitted">{fmtStamp(row.submitted_at)}</Line>
            <Line label="Last updated">{fmtStamp(row.updated_at)}</Line>
            <Line label="Attachments" empty={files.length === 0}>
              {files.length} file{files.length === 1 ? "" : "s"}
            </Line>
          </Panel>

          <Panel title="Review" desc="The only part of this record you can change.">
            <div className="a-field">
              <label className="a-label">Status</label>
              <select className="a-input" value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="a-field">
              <label className="a-label">Notes</label>
              <textarea className="a-input a-textarea" rows={3} value={form.notes}
                        placeholder="Optional notes"
                        onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button className="a-btn a-btn-primary" onClick={save} disabled={saving || !dirty}>
              <Save size={16} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </Panel>
        </aside>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={saving}
        title="Delete Submission"
        message="Delete this submission?"
        subMessage="This is somebody's registration. It is removed from the list; the record itself is retained."
      />
    </>
  );
}
