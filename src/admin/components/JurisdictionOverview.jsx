import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ChevronDown, ChevronRight, GraduationCap, MapPin, Megaphone,
  MessageSquareWarning, RefreshCw, UserCheck, Users,
} from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "./ui/Badge.jsx";
import { roleLabel } from "../lib/roles.js";

// The tiered operations dashboard. The same component serves all three tiers;
// the CMS decides what is in scope and returns:
//
//   state     totals + one row per division, each expandable into districts
//   division  totals + one row per district (comparative view)
//   district  totals + the local varg / Varga Pramukh roster

const NUMBER = new Intl.NumberFormat("en-IN");
const n = (v) => NUMBER.format(Number(v) || 0);
const hours = (v) => (v == null ? "—" : `${v} h`);
const place = (row) => row?.name_en || row?.name_mr || "";

function Tile({ icon: Icon, label, value, color, to, sub }) {
  const body = (
    <>
      <div className="dash-stat-top">
        <span className="a-stat-label">{label}</span>
        <span className="dash-stat-icon" style={{ color, background: `${color}14` }}><Icon size={17} /></span>
      </div>
      <strong className="a-stat-value">{value}</strong>
      {sub ? <span className="a-text-muted a-text-sm">{sub}</span> : null}
    </>
  );
  return to
    ? <Link to={to} className="a-stat-tile dash-stat-tile">{body}</Link>
    : <div className="a-stat-tile dash-stat-tile">{body}</div>;
}

function GrievanceCell({ row }) {
  return (
    <span className="jo-griev">
      {n(row.open_grievances)}
      {row.red ? <Badge tone="bad">{row.red} overdue</Badge> : null}
      {row.amber ? <Badge tone="warn">{row.amber} amber</Badge> : null}
    </span>
  );
}

function BreakdownTable({ level, rows, districts }) {
  const [open, setOpen] = useState(null);
  const label = level === "division" ? "Division" : "District";
  return (
    <div className="a-table-scroll">
      <table className="a-table">
        <thead>
          <tr>
            <th>{label}</th>
            <th>Manager{level === "division" ? "s" : ""}</th>
            <th className="ta-r">Active vargs</th>
            <th className="ta-r">Students</th>
            <th className="ta-r">Varga Pramukhs</th>
            <th className="ta-r">Organizers</th>
            <th>Open grievances</th>
            <th className="ta-r" title="Average time to acknowledge a ticket">Avg. ack.</th>
            <th className="ta-r" title="Average time to resolve a ticket">Avg. resolution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const children = level === "division" ? districts.filter((d) => d.vibhag_id === row.id) : [];
            const expanded = open === row.id;
            return (
              <Fragment key={row.id}>
                <tr className={level === "division" ? "jo-row-click" : ""} onClick={level === "division" ? () => setOpen(expanded ? null : row.id) : undefined}>
                  <td className="td-bold">
                    {level === "division" ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                    {" "}{place(row)}
                    {level === "division" ? <span className="a-text-muted a-text-sm"> · {row.districts} districts</span> : null}
                  </td>
                  <td className="td-muted">{row.managers || "—"}</td>
                  <td className="ta-r">{n(row.vargs)}{row.flagged ? <span className="a-text-muted a-text-sm"> (+{row.flagged} flagged)</span> : null}</td>
                  <td className="ta-r">{n(row.students)}</td>
                  <td className="ta-r">{n(row.pramukhs)}</td>
                  <td className="ta-r">{n(row.organizers)}</td>
                  <td><GrievanceCell row={row} /></td>
                  <td className="ta-r">{hours(row.avg_ack_hours)}</td>
                  <td className="ta-r">{hours(row.avg_resolution_hours)}</td>
                </tr>
                {expanded && children.map((d) => (
                  <tr key={`d-${d.id}`} className="jo-child-row">
                    <td>↳ {place(d)}</td>
                    <td className="td-muted">{d.managers || "—"}</td>
                    <td className="ta-r">{n(d.vargs)}</td>
                    <td className="ta-r">{n(d.students)}</td>
                    <td className="ta-r">{n(d.pramukhs)}</td>
                    <td className="ta-r">{n(d.organizers)}</td>
                    <td><GrievanceCell row={d} /></td>
                    <td className="ta-r">{hours(d.avg_ack_hours)}</td>
                    <td className="ta-r">{hours(d.avg_resolution_hours)}</td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Roster({ roster }) {
  return (
    <div className="jo-roster">
      <section className="a-card dash-panel">
        <header className="dash-panel-header">
          <div><span className="dash-eyebrow">LOCAL VARGS</span><h2>Amrut Vargs &amp; Varga Pramukhs</h2><p>Every varg in your district with its Pramukh / coordinator</p></div>
          <Link to="/admin/vargs" className="a-btn a-btn-ghost a-btn-sm">Manage</Link>
        </header>
        <div className="a-table-scroll">
          <table className="a-table">
            <thead><tr><th>School / venue</th><th>Taluka</th><th>Varga Pramukh</th><th className="ta-r">Enrolled</th><th>Status</th></tr></thead>
            <tbody>
              {roster.vargs.length ? roster.vargs.map((v) => (
                <tr key={v.id}>
                  <td className="td-bold"><Link to={`/admin/vargs/${v.id}`}>{v.school_name}</Link>{v.source === "organizer" ? <span className="a-text-muted a-text-sm"> · self-published</span> : null}</td>
                  <td>{v.taluka || "—"}</td>
                  <td>{v.coordinator_name || <span className="td-muted">Not appointed</span>}</td>
                  <td className="ta-r">{n(v.enrollment_count)}</td>
                  <td><Badge tone={v.status === "PUBLISHED" ? "ok" : v.status === "FLAGGED" ? "bad" : "neutral"}>{v.status}</Badge></td>
                </tr>
              )) : <tr><td colSpan={5} className="td-muted">No vargs in this district yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="a-card dash-panel">
        <header className="dash-panel-header">
          <div><span className="dash-eyebrow">VARGA PRAMUKH REGISTRATIONS</span><h2>Leader roster</h2><p>Varga Pramukh / trainer registrations from your district</p></div>
          <Link to="/admin/submissions" className="a-btn a-btn-ghost a-btn-sm">All forms</Link>
        </header>
        <div className="a-table-scroll">
          <table className="a-table">
            <thead><tr><th>Name</th><th>Institution</th><th>Taluka</th><th>Phone</th><th>Status</th></tr></thead>
            <tbody>
              {roster.leaders.length ? roster.leaders.map((l) => (
                <tr key={l.id}>
                  <td className="td-bold"><Link to={`/admin/submissions/${l.id}`}>{l.name}</Link></td>
                  <td>{l.institution}</td>
                  <td>{l.taluka || "—"}</td>
                  <td>{l.phone || "—"}</td>
                  <td><Badge tone="neutral">{l.status}</Badge></td>
                </tr>
              )) : <tr><td colSpan={5} className="td-muted">No Varga Pramukh registrations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function JurisdictionOverview({ withHeader = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/dashboard/overview");
      setData(res.data);
    } catch (err) {
      setError(err.message || "Overview could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals ?? {};
  const scope = data?.scope;
  const where = scope?.level === "district"
    ? `${place(scope.place)} district · ${scope.place?.vibhag_en || scope.place?.vibhag_mr} division`
    : scope?.level === "division" ? `${place(scope.place)} division` : "All of Maharashtra";
  const v = (x) => (loading ? "—" : n(x));

  return (
    <section className="jo">
      <div className={withHeader ? "a-page-header dash-header" : "jo-head"}>
        <div>
          <span className="dash-eyebrow">{scope ? roleLabel(scope.role).toUpperCase() : "OPERATIONS"}</span>
          {withHeader ? <h1 className="a-page-title">Dashboard</h1> : <h2 className="jo-title">Operations overview</h2>}
          <p className="a-page-desc">{where}</p>
        </div>
        <button className="a-btn a-btn-ghost a-btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "a-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="dash-error" role="alert">{error}</div>}
      {scope?.level === "none" && (
        <div className="dash-error" role="alert">Your account has no division or district assigned. Ask the State Coordinator to assign one.</div>
      )}

      <div className="a-stat-grid dash-stat-grid">
        <Tile icon={MapPin} label="Active Amrut Vargs" value={v(t.vargs)} color="#16a36a" to="/admin/vargs" sub={t.flagged ? `${t.flagged} flagged for correction` : t.self_published ? `${t.self_published} self-published` : null} />
        <Tile icon={GraduationCap} label="Students registered" value={v(t.students)} color="#2563eb" to="/admin/submissions?form_type=participant" sub={t.enrolled ? `${n(t.enrolled)} enrolled across vargs` : null} />
        <Tile icon={UserCheck} label="Active Varga Pramukhs" value={v(t.pramukhs)} color="#7441e8" sub={`${n(t.pramukh_registrations)} leader registrations`} />
        <Tile icon={Users} label="Organizers" value={v(t.organizers)} color="#d96922" to="/admin/submissions?form_type=organizer" sub={t.staff_accounts != null ? `${n(t.staff_accounts)} staff accounts` : null} />
        <Tile icon={MessageSquareWarning} label="Open grievances" value={v(t.open_grievances)} color="#ec4c76" to="/admin/grievances?status=OPEN"
          sub={loading ? null : `${n(t.amber)} amber · ${n(t.red)} overdue · avg. ack ${hours(t.avg_ack_hours)}`} />
        <Tile icon={AlertTriangle} label="Critical escalations" value={v(t.critical)} color="#dc2626" to="/admin/grievances?sla=RED" sub="Unresolved past 72 hours" />
        <Tile icon={Megaphone} label="Live melawa announcements" value={v(t.live_melawa)} color="#0eaa8a" to="/admin/melawa" />
      </div>

      {data?.breakdownLevel && data.breakdown.length ? (
        <section className="a-card dash-panel">
          <header className="dash-panel-header">
            <div>
              <span className="dash-eyebrow">{data.breakdownLevel === "division" ? "DIVISION DRILL-DOWN" : "DISTRICT COMPARISON"}</span>
              <h2>{data.breakdownLevel === "division" ? "By division" : "By district"}</h2>
              <p>{data.breakdownLevel === "division" ? "Click a division to see its districts" : "How each district in your division is doing, including how quickly its manager acknowledges grievances"}</p>
            </div>
          </header>
          <BreakdownTable level={data.breakdownLevel} rows={data.breakdown} districts={data.districts || []} />
        </section>
      ) : null}

      {data?.roster ? <Roster roster={data.roster} /> : null}
    </section>
  );
}
