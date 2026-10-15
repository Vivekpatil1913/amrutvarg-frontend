import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

// Read-only view of the PUBLISHED Join section — what visitors see — with a
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

export default function JoinView() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/join")
      .then((res) => setData(res.data))
      .catch(() => toast.show("Could not load the Join section", "bad"))
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
        <p className="a-empty-title">Join section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/join")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  const cfg = data.published ?? {};
  const text = cfg.text ?? {};
  const cards = cfg.cards ?? [];
  const on = (list) => (list ?? []).filter((i) => i.enabled !== false);

  return (
    <>
      <div className="a-detail-head">
        <div>
          <Badge tone="ok">Published</Badge>
          <h1 className="a-page-title a-mt-1">Join Section</h1>
          <p className="a-page-desc">
            The configuration visitors are seeing right now. Read-only — use Edit to change it.
          </p>
        </div>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/join")}>
            <ArrowLeft size={16} /> Back to list
          </button>
          <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/join/edit")}>
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
              <Line label="Required-details label" empty={!text.needs_label_mr}>
                {text.needs_label_mr} / {text.needs_label_en}
              </Line>
              <Line label="Emblem dot">{text.eyebrow_dot !== false ? "Shown" : "Hidden"}</Line>
            </div>
          </Section>

          <Section
            title="Registration cards"
            desc={`${on(cards).length} of ${cards.length} shown.`}
          >
            <div className="a-view-list">
              {cards.length === 0 && <p className="a-field-note">None configured.</p>}
              {cards.map((c, i) => (
                <Line key={c.id} label={`${String(i + 1).padStart(2, "0")} · ${c.action}`}>
                  <span className="a-view-strong">{c.title_mr}</span>
                  {c.desc_mr && <><br />{c.desc_mr}</>}
                  {(c.needs?.length ?? 0) > 0 && (
                    <><br /><span className="a-text-sm">
                      {c.needs.map((n) => n.label_mr).filter(Boolean).join(" · ")}
                    </span></>
                  )}
                  {c.note_mr && <><br /><span className="a-text-sm">ⓘ {c.note_mr}</span></>}
                  {c.link_url && (
                    <><br /><span className="a-text-sm">
                      ⓘ {c.link_note_mr} <a href={c.link_url} target="_blank" rel="noopener noreferrer">
                        {c.link_label_mr}
                      </a>
                    </span></>
                  )}
                  <br /><span className="a-text-sm">▸ {c.action_mr}</span>
                  {c.enabled === false && <Badge tone="neutral">Hidden</Badge>}
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
