import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { BUNDLED } from "../lib/siteImages.js";

// Read-only view of the stored hero configuration.
//
// Shows the PUBLISHED record — what visitors actually see — and says plainly
// when a newer draft is waiting, so this page can never be mistaken for a
// preview of unpublished work.

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

export default function HeroView() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/hero")
      .then((res) => setData(res.data))
      .catch(() => toast.show("Could not load the hero section", "bad"))
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
        <p className="a-empty-title">Hero section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/hero")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  const cfg = data.published ?? {};
  const text = cfg.text ?? {};
  const images = cfg.images ?? {};
  const on = (list) => (list ?? []).filter((i) => i.enabled !== false);

  return (
    <>
      <div className="a-detail-head">
        <div>
          <Badge tone="ok">Published</Badge>
          <h1 className="a-page-title a-mt-1">Hero Section</h1>
          <p className="a-page-desc">
            The configuration visitors are seeing right now. Read-only — use Edit to change it.
          </p>
        </div>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/hero")}>
            <ArrowLeft size={16} /> Back to list
          </button>
          <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/hero/edit")}>
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
          <Section title="General Content" desc="The text at the top of the home page.">
            <div className="a-view-list">
              <Line label="Top label (Marathi)" empty={!text.eyebrow_mr}>{text.eyebrow_mr}</Line>
              <Line label="Top label (English)" empty={!text.eyebrow_en}>{text.eyebrow_en}</Line>
              <Line label="Main heading (Marathi)" empty={!text.title_mr}>
                <span className="a-view-strong">{text.title_mr}</span>
              </Line>
              <Line label="Main heading (English)" empty={!text.title_en}>{text.title_en}</Line>
              <Line label="Subheading (Marathi)" empty={!text.tagline_mr}>{text.tagline_mr}</Line>
              <Line label="Subheading (English)" empty={!text.tagline_en}>{text.tagline_en}</Line>
              <Line label="Description (Marathi)" empty={!text.desc_mr}>{text.desc_mr}</Line>
              <Line label="Description (English)" empty={!text.desc_en}>{text.desc_en}</Line>
              <Line label="Emblem dot">{text.eyebrow_dot !== false ? "Shown" : "Hidden"}</Line>
            </div>
          </Section>

          <Section title="CTA Buttons" desc={`${on(cfg.ctas).length} of ${(cfg.ctas ?? []).length} shown.`}>
            <div className="a-view-list">
              {(cfg.ctas ?? []).length === 0 && <p className="a-field-note">None configured.</p>}
              {(cfg.ctas ?? []).map((c) => (
                <Line key={c.id} label={c.label_mr || "Untitled"}>
                  {c.target} · icon {c.icon}
                  {c.enabled === false && <Badge tone="neutral">Hidden</Badge>}
                </Line>
              ))}
            </div>
          </Section>

          <Section title="Statistics" desc={`${on(cfg.stats).length} of ${(cfg.stats ?? []).length} shown.`}>
            <div className="a-view-list">
              {(cfg.stats ?? []).map((s) => (
                <Line key={s.id} label={s.label_mr || "Untitled"}>
                  {s.source === "manual"
                    ? (s.value_mr || "—")
                    : <Badge tone="accent">counted from the database</Badge>}
                  {s.enabled === false && <Badge tone="neutral">Hidden</Badge>}
                </Line>
              ))}
            </div>
          </Section>

          <Section title="Media & Images" desc="The photographs and the caption chip.">
            <div className="a-media-row">
              {["main", "small"].map((slot) => (
                <div key={slot} className="a-media-thumb">
                  <img src={images[slot]?.url || BUNDLED.hero[slot]} alt="" />
                </div>
              ))}
            </div>
            <div className="a-view-list">
              <Line label="Main alt text" empty={!images.main?.alt_mr}>{images.main?.alt_mr}</Line>
              <Line label="Supporting alt text" empty={!images.small?.alt_mr}>{images.small?.alt_mr}</Line>
              <Line label="Caption" empty={!images.caption_mr}>{images.caption_mr}</Line>
              <Line label="Caption chip">{images.caption_enabled !== false ? "Shown" : "Hidden"}</Line>
            </div>
          </Section>

          <Section title="Quick Navigation" desc={`${on(cfg.quicknav).length} of ${(cfg.quicknav ?? []).length} shown.`}>
            <div className="a-view-list">
              {(cfg.quicknav ?? []).map((q) => (
                <Line key={q.id} label={q.title_mr || "Untitled"}>
                  {q.desc_mr} · {q.target}
                  {q.enabled === false && <Badge tone="neutral">Hidden</Badge>}
                </Line>
              ))}
            </div>
          </Section>

          <Section title="Accessibility" desc="How assistive technology announces the quick-link bar.">
            <div className="a-view-list">
              <Line label="Quick-link bar label (Marathi)" empty={!cfg.a11y?.quick_label_mr}>
                {cfg.a11y?.quick_label_mr}
              </Line>
              <Line label="Quick-link bar label (English)" empty={!cfg.a11y?.quick_label_en}>
                {cfg.a11y?.quick_label_en}
              </Line>
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
