import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";


// Read-only view of the PUBLISHED Session section — what visitors see — with a
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

export default function SessionView() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/session")
      .then((res) => setData(res.data))
      .catch(() => toast.show("Could not load the Session section", "bad"))
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
        <p className="a-empty-title">Session section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/session")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  const cfg = data.published ?? {};
  const text = cfg.text ?? {};
  const steps = cfg.steps ?? [];
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
          <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/session")}>
            <ArrowLeft size={16} /> Back to list
          </button>
          <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/session/edit")}>
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
              <Line label="Hour-breakdown label" empty={!text.hour_label_mr}>{text.hour_label_mr}</Line>
              <Line label="Minutes suffix" empty={!text.minutes_mr}>
                {text.minutes_mr} / {text.minutes_en}
              </Line>
              <Line label="Emblem dot">{text.eyebrow_dot !== false ? "Shown" : "Hidden"}</Line>
            </div>
          </Section>

          <Section
            title="Steps"
            desc={`${on(steps).length} of ${steps.length} shown · ${on(steps).reduce((n, s) => n + (Number(s.min) || 0), 0)} minutes total.`}
          >
            <div className="a-view-list">
              {steps.length === 0 && <p className="a-field-note">None configured.</p>}
              {steps.map((s, i) => (
                <Line key={s.id} label={`${String(i + 1).padStart(2, "0")} · ${s.min > 0 ? `${s.min} min` : "no clock"}`}>
                  <span className="a-view-strong">{s.title_mr}</span>
                  {s.desc_mr && <><br />{s.desc_mr}</>}
                  {s.enabled === false && <Badge tone="neutral">Hidden</Badge>}
                </Line>
              ))}
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
