import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";


// Read-only view of the PUBLISHED Activities section — what visitors see — with a
// note when a newer draft is waiting, so it can never be mistaken for a preview
// of unpublished work.

const fmtStamp = (v) => (v ? new Date(v).toLocaleString("en-IN") : "—");

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

function Line({ label, children, empty }) {
  return (
    <div className="a-view-row">
      <span className="a-view-label">{label}</span>
      <div className={`a-view-value${empty ? " is-empty" : ""}`}>{empty ? "—" : children}</div>
    </div>
  );
}

export default function ActivitiesView() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/activities")
      .then((res) => setData(res.data))
      .catch(() => toast.show("Could not load the Activities section", "bad"))
      .finally(() => setLoading(false));
  }, [toast]);

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

  if (!data) {
    return (
      <div className="a-empty-state">
        <p className="a-empty-title">Activities section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/activities")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  const cfg = data.published ?? {};
  const text = cfg.text ?? {};
  const items = cfg.items ?? [];
  const cta = cfg.cta ?? {};
  const on = (list) => (list ?? []).filter((i) => i.enabled !== false);

  return (
    <>
      <div className="a-detail-head">
        <div>
          <Badge tone="ok">Published</Badge>
          <h1 className="a-page-title a-mt-1">About Section</h1>
          <p className="a-page-desc">
            The configuration visitors are seeing right now. Read-only — use Edit to change it.
          </p>
        </div>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/activities")}>
            <ArrowLeft size={16} /> Back to list
          </button>
          <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/activities/edit")}>
            <Pencil size={16} /> Edit
          </button>
        </div>
      </div>

      {data.has_unpublished_changes && (
        <div className="a-notice a-notice-info">
          <div className="a-notice-body">
            <p className="a-notice-title">A newer draft is waiting</p>
            <p>This page shows the published version. The draft differs and is not live yet.</p>
          </div>
        </div>
      )}

      <div className="a-form-layout">
        <div className="a-form-main">
          <Section title="Heading" desc="The label, title and lead at the top of the section.">
            <div className="a-view-list">
              <Line label="Top label (Marathi)" empty={!text.badge_mr}>{text.badge_mr}</Line>
              <Line label="Section title (Marathi)" empty={!text.title_mr}>
                <span className="a-view-strong">{text.title_mr}</span>
              </Line>
              <Line label="Section title (English)" empty={!text.title_en}>{text.title_en}</Line>
              <Line label="Lead (Marathi)" empty={!text.lead_mr}>{text.lead_mr}</Line>
              <Line label="Outcomes label" empty={!text.gains_label_mr}>{text.gains_label_mr}</Line>
              <Line label="Emblem dot">{text.eyebrow_dot !== false ? "Shown" : "Hidden"}</Line>
            </div>
          </Section>

          <Section title="Activity Cards" desc={`${on(items).length} of ${items.length} shown.`}>
            <div className="a-view-list">
              {items.length === 0 && <p className="a-field-note">None configured.</p>}
              {items.map((it, i) => (
                <Line key={it.id} label={`${String(i + 1).padStart(2, "0")} · icon ${it.icon}`}>
                  <span className="a-view-strong">{it.title_mr}</span>
                  <span className="a-chip-row">
                    {(it.gains_mr ?? []).map((g, n) => <span key={n} className="a-chip">{g}</span>)}
                  </span>
                  {it.enabled === false && <Badge tone="neutral">Hidden</Badge>}
                </Line>
              ))}
            </div>
          </Section>

          <Section title="Footer Button" desc="The link under the grid.">
            <div className="a-view-list">
              <Line label="Label (Marathi)" empty={!cta.label_mr}>{cta.label_mr}</Line>
              <Line label="Destination" empty={!cta.target}>{cta.target}</Line>
              <Line label="Visibility">{cta.enabled !== false ? "Shown" : "Hidden"}</Line>
            </div>
          </Section>
        </div>

        <aside className="a-form-side">
          <Section title="Publication" desc="What the website is serving.">
            <div className="a-view-list">
              <Line label="Status"><Badge tone="ok">Published</Badge></Line>
              <Line label="Last published">{fmtStamp(data.published_at)}</Line>
              <Line label="Last edited">{fmtStamp(data.updated_at)}</Line>
              <Line label="Pending draft">
                {data.has_unpublished_changes
                  ? <Badge tone="info">Yes — not live</Badge>
                  : <Badge tone="ok">None</Badge>}
              </Line>
            </div>
          </Section>
        </aside>
      </div>
    </>
  );
}
