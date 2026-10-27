import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Paperclip, Send, Star } from "lucide-react";
import { api, getToken } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { Section, Field, Spinner, fieldErrors } from "../components/ui/FormBits.jsx";
import { errorMessage } from "../lib/errors.js";
import { GRIEVANCE_STATUS, SLA_BADGE, fmtStamp, roleLabel } from "../lib/roles.js";

// One ticket: what was reported, its evidence, its timeline, and the status
// change form. Moving to Resolved / Closed needs Action Taken Notes — the CMS
// refuses it otherwise — and resolving sends the complainant the outcome with
// a rating link.

const BASE = import.meta.env.VITE_CMS_API || "http://localhost:4000/api/v1";

const NEXT = {
  NEW: ["ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

// Attachments are behind the jurisdiction check, so they are fetched with the
// session token and shown from a local object URL.
function Attachment({ ticketId, file }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let revoke = null;
    let alive = true;
    fetch(`${BASE}/admin/grievances/${ticketId}/attachments/${encodeURIComponent(file.filename)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      credentials: "include",
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(r.status))))
      .then((blob) => {
        if (!alive) return;
        revoke = URL.createObjectURL(blob);
        setUrl(revoke);
      })
      .catch(() => {});
    return () => { alive = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [ticketId, file.filename]);

  if (!url) return <div className="a-attachment is-loading"><Paperclip size={14} /> {file.originalName}</div>;
  return (
    <figure className="a-attachment">
      {file.kind === "video"
        ? <video src={url} controls preload="metadata" />
        : <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={file.originalName} /></a>}
      <figcaption>{file.originalName} · {(file.size / 1048576).toFixed(1)} MB</figcaption>
    </figure>
  );
}

export default function GrievanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ status: "", note: "", action_taken_notes: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/grievances/${id}`);
      setTicket(res.data);
      setForm({ status: "", note: "", action_taken_notes: "" });
    } catch (err) {
      toast.error(errorMessage(err, "That ticket could not be loaded"));
      navigate("/admin/grievances");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => { load(); }, [load]);

  const needsNotes = form.status === "RESOLVED" || (form.status === "CLOSED" && !ticket?.action_taken_notes);

  async function changeStatus(e) {
    e.preventDefault();
    const local = {};
    if (!form.status) local.status = "Choose the new status";
    if (needsNotes && form.action_taken_notes.trim().length < 10) {
      local.action_taken_notes = "Action Taken Notes (at least 10 characters) are required to resolve or close a ticket";
    }
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      await api.post(`/admin/grievances/${id}/status`, form);
      toast.success(`Ticket moved to ${GRIEVANCE_STATUS[form.status].label}`);
      await load();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, "Could not change the status"));
    } finally {
      setSaving(false);
    }
  }

  async function addNote(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.post(`/admin/grievances/${id}/notes`, { note: comment.trim() });
      setComment("");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not add the note"));
    }
  }

  if (loading || !ticket) return <Spinner />;
  const options = NEXT[ticket.status] || [];

  return (
    <>
      <div className="a-detail-head">
        <div>
          <h1 className="a-page-title">{ticket.ticket_no}</h1>
          <p className="a-page-desc">{ticket.subject}</p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/grievances")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>

      <div className="a-view-tags">
        <Badge tone={ticket.submission_type === "COMPLAINT" ? "bad" : "info"}>{ticket.submission_type === "COMPLAINT" ? "Complaint" : "Suggestion"}</Badge>
        <Badge tone={GRIEVANCE_STATUS[ticket.status]?.tone}>{GRIEVANCE_STATUS[ticket.status]?.label}</Badge>
        <Badge tone={SLA_BADGE[ticket.sla_state]?.tone}>{SLA_BADGE[ticket.sla_state]?.label}</Badge>
        {ticket.priority === "HIGH" && <Badge tone="warn">Priority</Badge>}
        {ticket.escalation_level >= 2 && <Badge tone="bad">Escalated to State · Overdue / Critical</Badge>}
        {ticket.escalation_level === 1 && <Badge tone="warn">Level 1 reminder sent</Badge>}
      </div>

      <div className="a-form-layout">
        <div className="a-form-main">
          <Section title="Report">
            <div className="a-view-list">
              <div className="a-view-row"><span className="a-view-label">From</span><div className="a-view-value">{ticket.full_name}</div></div>
              <div className="a-view-row"><span className="a-view-label">Mobile</span><div className="a-view-value"><a href={`tel:${ticket.mobile}`}>{ticket.mobile}</a></div></div>
              <div className="a-view-row"><span className="a-view-label">Email</span><div className="a-view-value"><a href={`mailto:${ticket.email}`}>{ticket.email}</a></div></div>
              <div className="a-view-row"><span className="a-view-label">Place</span><div className="a-view-value">{ticket.district_en || ticket.district_mr} · {ticket.division_en || ticket.division_mr} division</div></div>
              <div className="a-view-row"><span className="a-view-label">Received</span><div className="a-view-value">{fmtStamp(ticket.created_at)}</div></div>
              <div className="a-view-row"><span className="a-view-label">Description</span><div className="a-view-value a-prewrap">{ticket.description}</div></div>
            </div>
            {ticket.attachments.length ? (
              <div className="a-attachments">
                {ticket.attachments.map((f) => <Attachment key={f.filename} ticketId={ticket.id} file={f} />)}
              </div>
            ) : null}
          </Section>

          <Section title="Timeline">
            <ol className="a-timeline">
              {ticket.events.map((ev) => (
                <li key={ev.id} className={`a-timeline-item is-${ev.event_type.toLowerCase()}`}>
                  <div className="a-timeline-head">
                    <strong>
                      {ev.event_type === "STATUS" ? `${GRIEVANCE_STATUS[ev.from_status]?.label} → ${GRIEVANCE_STATUS[ev.to_status]?.label}` : ev.event_type.replace(/_/g, " ").toLowerCase()}
                    </strong>
                    <span className="a-text-muted a-text-sm">
                      {ev.actor_name ? `${ev.actor_name} (${roleLabel(ev.actor_role)}) · ` : "System · "}{fmtStamp(ev.created_at)}
                    </span>
                  </div>
                  {ev.note ? <p className="a-prewrap">{ev.note}</p> : null}
                </li>
              ))}
            </ol>
            <form className="a-timeline-note" onSubmit={addNote}>
              <input className="a-input" placeholder="Add an internal note…" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={4000} />
              <button className="a-btn a-btn-secondary" type="submit" disabled={!comment.trim()}><Send size={14} /> Add</button>
            </form>
          </Section>
        </div>

        <aside className="a-form-side">
          <Section title="Update status" desc={options.length ? "Every change is recorded in the timeline." : "This ticket is closed."}>
            {options.length ? (
              <form onSubmit={changeStatus} noValidate>
                <Field label="New status" required error={errors.status}>
                  <select className="a-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="">Select…</option>
                    {options.map((s) => <option key={s} value={s}>{GRIEVANCE_STATUS[s].label}</option>)}
                  </select>
                </Field>
                {(form.status === "RESOLVED" || form.status === "CLOSED") && (
                  <Field
                    label="Action Taken Notes"
                    required={needsNotes}
                    error={errors.action_taken_notes}
                    hint={form.status === "CLOSED" && ticket.action_taken_notes ? "Optional — the notes recorded at resolution will be kept." : "Sent to the complainant with the resolution summary."}
                  >
                    <textarea className="a-input a-textarea" rows={5} maxLength={4000} value={form.action_taken_notes}
                              onChange={(e) => setForm((f) => ({ ...f, action_taken_notes: e.target.value }))} />
                  </Field>
                )}
                <Field label="Note (optional)" error={errors.note}>
                  <textarea className="a-input a-textarea" rows={2} maxLength={4000} value={form.note}
                            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                </Field>
                <button className="a-btn a-btn-primary" type="submit" disabled={saving} style={{ width: "100%" }}>
                  {saving ? "Saving…" : "Update status"}
                </button>
              </form>
            ) : null}
          </Section>

          <Section title="Resolution">
            <div className="a-view-list">
              <div className="a-view-row"><span className="a-view-label">Acknowledged</span><div className="a-view-value">{ticket.acknowledged_at ? `${fmtStamp(ticket.acknowledged_at)}${ticket.acknowledged_by_name ? ` · ${ticket.acknowledged_by_name}` : ""}` : "—"}</div></div>
              <div className="a-view-row"><span className="a-view-label">Resolved</span><div className="a-view-value">{ticket.resolved_at ? `${fmtStamp(ticket.resolved_at)}${ticket.resolved_by_name ? ` · ${ticket.resolved_by_name}` : ""}` : "—"}</div></div>
              <div className="a-view-row"><span className="a-view-label">Action taken</span><div className="a-view-value a-prewrap">{ticket.action_taken_notes || "—"}</div></div>
              <div className="a-view-row"><span className="a-view-label">Complainant told</span><div className="a-view-value">{ticket.closure_notified_at ? fmtStamp(ticket.closure_notified_at) : "—"}</div></div>
              <div className="a-view-row">
                <span className="a-view-label">Rating</span>
                <div className="a-view-value">
                  {ticket.satisfaction_rating
                    ? <>{Array.from({ length: ticket.satisfaction_rating }, (_, i) => <Star key={i} size={14} fill="currentColor" />)} {ticket.satisfaction_comment}</>
                    : "—"}
                </div>
              </div>
            </div>
          </Section>
        </aside>
      </div>
    </>
  );
}
