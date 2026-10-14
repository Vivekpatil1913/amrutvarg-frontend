import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, BookOpen, MapPin, Users, FileText, TrendingUp, ArrowRight } from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";

const STATUS_TONE = { new: "info", reviewed: "ok", actioned: "accent", archived: "neutral" };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/dashboard").then((res) => {
      setStats(res.data.stats);
      setRecent(res.data.recentSubmissions);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="a-spinner"><svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Loading…</div>
  );

  const TILES = [
    { label: "Active Announcements", value: stats?.activeAnnouncements, icon: Megaphone, to: "/admin/announcements", color: "#1d4ed8" },
    { label: "Published Stories", value: stats?.publishedStories, icon: BookOpen, to: "/admin/yashogatha", color: "#16a34a" },
    { label: "Active Vargs", value: stats?.activeVargs, icon: MapPin, to: "/admin/vargs", color: "#b45309" },
    { label: "Team Contacts", value: stats?.teamContacts, icon: Users, to: "/admin/contacts", color: "#7c3aed" },
    { label: "New Submissions", value: stats?.newSubmissions, icon: FileText, to: "/admin/submissions", color: "#dc2626" },
    { label: "Total Submissions", value: stats?.totalSubmissions, icon: TrendingUp, to: "/admin/submissions", color: "#0891b2" },
  ];

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Dashboard</h1>
          <p className="a-page-desc">Overview of your Amrutvarg CMS</p>
        </div>
      </div>

      <div className="a-stat-grid">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.label} to={tile.to} className="a-stat-tile" style={{ textDecoration: "none" }}>
              <div className="a-flex-between" style={{ marginBottom: "0.5rem" }}>
                <span className="a-stat-label">{tile.label}</span>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", background: `${tile.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={16} style={{ color: tile.color }} />
                </div>
              </div>
              <div className="a-stat-value">{tile.value ?? "—"}</div>
            </Link>
          );
        })}
      </div>

      {/* Recent Submissions */}
      <div className="a-card a-mt-1">
        <div className="a-flex-between" style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--a-line)" }}>
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 700 }}>Recent Form Submissions</h2>
          <Link to="/admin/submissions" className="a-btn a-btn-ghost a-btn-sm">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="a-empty-state">
            <FileText className="a-empty-icon" />
            <p className="a-empty-title">No submissions yet</p>
          </div>
        ) : (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td><Badge tone="neutral">{s.form_type}</Badge></td>
                    <td className="td-bold">{s.name || "—"}</td>
                    <td><Badge tone={STATUS_TONE[s.status] || "neutral"}>{s.status}</Badge></td>
                    <td className="td-muted">{new Date(s.submitted_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
