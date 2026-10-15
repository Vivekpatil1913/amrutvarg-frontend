import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

// Read-only view of the PUBLISHED District Directory wording — what visitors
// see — with a note when a newer draft is waiting, so it can never be mistaken
// for a preview of unpublished work.

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

export default function DirectoryView() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/directory")
      .then((res) => setData(res.data))
      .catch(() => toast.show("Could not load the Directory section", "bad"))
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
        <p className="a-empty-title">Directory section unavailable</p>
        <button className="a-btn a-btn-secondary a-mt-1" onClick={() => navigate("/admin/directory")}>
          <ArrowLeft size={16} /> Back to list
        </button>
      </div>
    );
  }

  const cfg = data.published ?? {};
  const text = cfg.text ?? {};
  const roles = cfg.roles ?? [];
  const links = cfg.links ?? {};

  return (
    <>
      <div className="a-detail-head">
        <div>
          <Badge tone="ok">Published</Badge>
          <h1 className="a-page-title a-mt-1">Directory Page</h1>
          <p className="a-page-desc">
            The configuration visitors are seeing right now. Read-only — use Edit to change it.
          </p>
        </div>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/directory")}>
            <ArrowLeft size={16} /> Back to list
          </button>
          <button className="a-btn a-btn-primary" onClick={() => navigate("/admin/directory/edit")}>
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
          <Section title="Heading" desc="The label, title and lead at the top of the page.">
            <div className="a-view-list">
              <Line label="Top label (Marathi)" empty={!text.badge_mr}>{text.badge_mr}</Line>
              <Line label="Page title (Marathi)" empty={!text.title_mr}>
                <span className="a-view-strong">{text.title_mr}</span>
              </Line>
              <Line label="Page title (English)" empty={!text.title_en}>{text.title_en}</Line>
              <Line label="Lead (Marathi)" empty={!text.lead_mr}>{text.lead_mr}</Line>
              <Line label="Emblem dot">{text.eyebrow_dot !== false ? "Shown" : "Hidden"}</Line>
            </div>
          </Section>

          <Section title="Search and filter">
            <div className="a-view-list">
              <Line label="Search placeholder" empty={!text.search_placeholder_mr}>
                {text.search_placeholder_mr}
              </Line>
              <Line label="“All districts” option" empty={!text.all_districts_mr}>
                {text.all_districts_mr} / {text.all_districts_en}
              </Line>
            </div>
          </Section>

          <Section title="Counts and paging" desc="Shown with their placeholders as stored.">
            <div className="a-view-list">
              <Line label="Count — one" empty={!text.count_one_mr}>
                {text.count_one_mr} / {text.count_one_en}
              </Line>
              <Line label="Count — many" empty={!text.count_many_mr}>
                {text.count_many_mr} / {text.count_many_en}
              </Line>
              <Line label="Paging line" empty={!text.showing_mr}>
                {text.showing_mr} / {text.showing_en}
              </Line>
              <Line label="Division heading" empty={!text.division_label_mr}>
                {text.division_label_mr} / {text.division_label_en}
              </Line>
            </div>
          </Section>

          <Section
            title="Roles"
            desc={`${roles.length} configured · ${roles.filter((r) => r.featured).length} featured. Order is display order.`}
          >
            <div className="a-view-list">
              {roles.length === 0 && <p className="a-field-note">None configured.</p>}
              {roles.map((r, i) => (
                <Line key={r.id} label={`${String(i + 1).padStart(2, "0")} · ${r.id}`}>
                  <span className="a-view-strong">{r.label_mr}</span>
                  {r.label_en && <> / {r.label_en}</>}
                  {r.featured && <> <Badge tone="ok">Wide card</Badge></>}
                </Line>
              ))}
            </div>
          </Section>

          <Section title="Empty states">
            <div className="a-view-list">
              <Line label="No results" empty={!text.no_results_mr}>{text.no_results_mr}</Line>
              <Line label="Nothing published — title" empty={!text.pending_title_mr}>
                {text.pending_title_mr}
              </Line>
              <Line label="Nothing published — text" empty={!text.pending_desc_mr}>
                {text.pending_desc_mr}
              </Line>
            </div>
          </Section>

          <Section title="Footer note and links">
            <div className="a-view-list">
              <Line label="Footer note" empty={!text.state_note_mr}>
                {text.state_note_mr} {text.state_role_mr}
              </Line>
              <Line label="State phone" empty={!links.state_phone}>{links.state_phone}</Line>
              <Line label="Official list" empty={!links.official_url}>
                <a href={links.official_url} target="_blank" rel="noopener noreferrer">
                  {links.official_url}
                </a>
              </Line>
              <Line label="Submit-info form" empty={!links.submit_form_url}>
                <a href={links.submit_form_url} target="_blank" rel="noopener noreferrer">
                  {links.submit_form_url}
                </a>
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
