import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { BUNDLED } from "../lib/siteImages.js";

// Read-only view of the PUBLISHED About section — what visitors see — with a
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

export default function AboutView() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/about")
      .then((res) => setData(res.data))
      .catch(() => toast.show("Could not load the About section", "bad"))
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
        <p className="a-empty-title">About section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/about")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  const cfg = data.published ?? {};
  const text = cfg.text ?? {};
  const image = cfg.image ?? {};
  const steps = cfg.steps ?? [];
  const features = cfg.features ?? {};
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
          <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/about")}>
            <ArrowLeft size={16} /> Back to list
          </button>
          <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/about/edit")}>
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
          <Section title="Heading" desc="The label and title at the top of the section.">
            <div className="a-view-list">
              <Line label="Top label (Marathi)" empty={!text.badge_mr}>{text.badge_mr}</Line>
              <Line label="Top label (English)" empty={!text.badge_en}>{text.badge_en}</Line>
              <Line label="Section title (Marathi)" empty={!text.title_mr}>
                <span className="a-view-strong">{text.title_mr}</span>
              </Line>
              <Line label="Section title (English)" empty={!text.title_en}>{text.title_en}</Line>
              <Line label="Emblem dot">{text.eyebrow_dot !== false ? "Shown" : "Hidden"}</Line>
            </div>
          </Section>

          <Section title="Steps" desc={`${on(steps).length} of ${steps.length} shown.`}>
            <div className="a-view-list">
              {steps.length === 0 && <p className="a-field-note">None configured.</p>}
              {steps.map((s, i) => (
                <Line key={s.id} label={`${String(i + 1).padStart(2, "0")} · ${s.question_mr}`}>
                  <span className="a-view-strong">{s.title_mr}</span>
                  {s.desc_mr && <><br />{s.desc_mr}</>}
                  <br /><code className="a-text-xs">icon {s.icon}</code>
                  {s.enabled === false && <Badge tone="neutral">Hidden</Badge>}
                </Line>
              ))}
            </div>
          </Section>

          <Section title="Image" desc="The photograph and the quote over it.">
            <div className="a-media-row">
              <div className="a-media-thumb">
                <img src={image.url || BUNDLED.about.image} alt="" />
              </div>
            </div>
            <div className="a-view-list">
              <Line label="Alt text (Marathi)" empty={!image.alt_mr}>{image.alt_mr}</Line>
              <Line label="Quote caption (Marathi)" empty={!image.caption_mr}>{image.caption_mr}</Line>
              <Line label="Quote caption (English)" empty={!image.caption_en}>{image.caption_en}</Line>
              <Line label="Visibility">{image.enabled !== false ? "Shown" : "Hidden"}</Line>
            </div>
          </Section>

          <Section title="Feature Tags" desc={`${on(features.items).length} of ${(features.items ?? []).length} shown.`}>
            <div className="a-view-list">
              <Line label="Group title" empty={!features.title_mr}>{features.title_mr}</Line>
              <Line label="Tags" empty={on(features.items).length === 0}>
                <span className="a-chip-row">
                  {on(features.items).map((f) => <span key={f.id} className="a-chip">{f.label_mr}</span>)}
                </span>
              </Line>
              <Line label="Visibility">{features.enabled !== false ? "Shown" : "Hidden"}</Line>
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
