import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Phone, RefreshCw, UserCheck } from "lucide-react";
import { api, buildQuery } from "../api/client.js";
import { Badge } from "./ui/Badge.jsx";
import { useMaster } from "../../data/useMasters.js";
import { FREQUENCY } from "../lib/vargActivities.js";

// Dashboard card: the Amrut Varg Pramukhs (अमृत वर्ग प्रमुख) currently on
// record, inside the signed-in officer's jurisdiction — their centres,
// jurisdiction, contact and whether they are active. Names, the role label
// and the count badges are always in red (#DC2626) so leaders stand apart from
// participants and students.

const NUMBER = new Intl.NumberFormat("en-IN");
const SOURCE_LABEL = { activity: "Activity record", registration: "Leader registration", varg: "Varg listing" };

export function PramukhLeadersCard() {
  const [divisionId, setDivisionId] = useState("");
  const [state, setState] = useState({ loading: true, error: "", rows: [], totals: null });
  const [reload, setReload] = useState(0);
  const divisions = useMaster("vibhags");

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.get(`/admin/varg-activities/pramukhs${buildQuery({ division_id: divisionId, limit: 8 })}`)
      .then((res) => alive && setState({ loading: false, error: "", rows: res.data.rows, totals: res.data.totals }))
      .catch((err) => alive && setState({ loading: false, error: err.message || "Could not load Pramukhs", rows: [], totals: null }));
    return () => { alive = false; };
  }, [divisionId, reload]);

  const t = state.totals;

  return (
    <section className="a-card dash-panel av-leaders" aria-labelledby="av-leaders-title">
      <header className="dash-panel-header">
        <div>
          <span className="dash-eyebrow av-red">AMRUT VARG PRAMUKH · अमृत वर्ग प्रमुख</span>
          <h2 id="av-leaders-title">Amrut Varg Leaders</h2>
          <p>Pramukhs currently working — their centres, jurisdiction, contact and status</p>
        </div>
        <div className="av-leaders-tools">
          <select className="a-select" value={divisionId} onChange={(e) => setDivisionId(e.target.value)} aria-label="Filter by division">
            <option value="">All divisions</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name_en || d.name_mr}</option>)}
          </select>
          <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => setReload((n) => n + 1)} disabled={state.loading} title="Refresh">
            <RefreshCw size={14} className={state.loading ? "a-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="av-leaders-counts">
        <span className="av-count-badge"><UserCheck size={14} /> {state.loading ? "—" : NUMBER.format(t?.pramukhs ?? 0)} Pramukhs</span>
        <span className="av-count-badge">{state.loading ? "—" : NUMBER.format(t?.active ?? 0)} active</span>
        <span className="av-count-badge av-count-badge--soft">{state.loading ? "—" : NUMBER.format(t?.centres ?? 0)} centres</span>
        <span className="av-count-badge av-count-badge--soft">{state.loading ? "—" : NUMBER.format(t?.students ?? 0)} students</span>
      </div>

      {state.error ? (
        <div className="dash-error" role="alert">{state.error}</div>
      ) : state.loading && !state.rows.length ? (
        <div className="dash-chart-loading">Loading Pramukhs…</div>
      ) : !state.rows.length ? (
        <p className="a-text-muted a-text-sm av-leaders-empty">No Amrut Varg Pramukh is on record for this selection yet.</p>
      ) : (
        <div className="a-table-scroll">
          <table className="a-table av-leaders-table">
            <thead>
              <tr><th>Pramukh</th><th>Centre / institution</th><th>Jurisdiction</th><th>Contact</th><th className="ta-r">Students</th><th>Status</th></tr>
            </thead>
            <tbody>
              {state.rows.map((r) => (
                <tr key={`${r.name}|${r.mobile}`}>
                  <td>
                    <span className="av-pramukh">
                      <span className="av-pramukh-name">{r.name}</span>
                      <span className="av-pramukh-role">Amrut Varg Pramukh (प्रमुख)</span>
                    </span>
                  </td>
                  <td>
                    <span className="td-truncate" title={(r.institutions || []).join(", ")}>{(r.institutions || [])[0] || "—"}</span>
                    {r.centres > 1 ? <span className="av-count-badge av-count-badge--xs">{r.centres} centres</span> : null}
                    {r.frequency ? <span className="a-text-muted a-text-sm"> · {FREQUENCY[r.frequency]?.label}</span> : null}
                  </td>
                  <td className="a-text-sm">{[r.district, r.division].filter(Boolean).join(", ") || <span className="td-muted">Not mapped</span>}</td>
                  <td className="a-text-sm">
                    {r.mobile ? <a href={`tel:${r.mobile}`} className="av-leaders-phone"><Phone size={12} /> {r.mobile}</a> : <span className="td-muted">—</span>}
                  </td>
                  <td className="ta-r"><strong>{NUMBER.format(r.students)}</strong></td>
                  <td>
                    <Badge tone={r.is_active ? "ok" : "neutral"}>{r.is_active ? "Active" : "Inactive"}</Badge>
                    <span className="a-text-muted a-text-sm av-leaders-source">{(r.sources || []).map((s) => SOURCE_LABEL[s] || s).join(" · ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="av-leaders-links">
        <Link to="/admin/varg-activities" className="dash-panel-link">Amrut Varg activities <ArrowRight size={15} /></Link>
        <Link to="/admin/submissions" className="dash-panel-link">Leader registrations <ArrowRight size={15} /></Link>
      </div>
    </section>
  );
}
