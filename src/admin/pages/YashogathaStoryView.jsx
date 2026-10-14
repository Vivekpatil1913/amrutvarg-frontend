import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { storyCover } from "../lib/siteImages.js";

// Read-only view of one yashogatha, as it is stored.

const PARTS = ["intro", "challenge", "journey", "change", "lessons", "conclusion"];
const PART_LABEL = {
  intro: "Introduction",
  challenge: "The challenge",
  journey: "The journey",
  change: "What changed",
  lessons: "What it taught",
  conclusion: "Conclusion",
};

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

export default function YashogathaStoryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/stories/${id}`)
      .then((res) => setStory(res.data))
      .catch(() => {
        toast.show("That yashogatha could not be loaded", "bad");
        navigate("/admin/yashogatha");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

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

  if (!story) return null;

  const cover = storyCover(story);
  const content = story.content || {};
  const hasPart = (lang) => PARTS.some((p) => String(content?.[lang]?.[p] ?? "").trim());

  return (
    <>
      <div className="a-detail-head">
        <div>
          <div className="a-view-tags">
            <Badge tone={story.published ? "ok" : "neutral"}>
              {story.published ? "Published" : "Draft"}
            </Badge>
            {story.featured && <Badge tone="warn">Featured</Badge>}
            <Badge tone="neutral">{story.category}</Badge>
          </div>
          <h1 className="a-page-title a-mt-1">{story.title_mr}</h1>
          <p className="a-page-desc">
            {story.title_en || "Read-only — use Edit to change this story."}
          </p>
        </div>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/yashogatha")}>
            <ArrowLeft size={16} /> Back to list
          </button>
          {story.published && story.slug && (
            <a className="a-btn a-btn-ghost" href={`/yashogatha/${story.slug}`}
               target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> View on site
            </a>
          )}
          <button className="a-btn a-btn-primary" onClick={() => navigate(`/admin/yashogatha/${story.id}/edit`)}>
            <Pencil size={16} /> Edit
          </button>
        </div>
      </div>

      <div className="a-form-layout">
        <div className="a-form-main">
          <Section title="Cover" desc="The photograph on the card and at the top of the story page.">
            <div className="a-media-row">
              <div className="a-media-thumb">
                {cover
                  ? <img src={cover} alt="" />
                  : <span className="a-text-muted a-text-xs">No image — the card draws its own artwork</span>}
              </div>
              <div className="a-view-list" style={{ flex: 1, minWidth: "12rem" }}>
                <Line label="Uploaded image" empty={!story.image_url}>
                  <code className="a-text-xs">{story.image_url}</code>
                </Line>
                <Line label="Programme photo" empty={!story.image_key}>{story.image_key}</Line>
              </div>
            </div>
          </Section>

          <Section title="Headline" desc="The title and summary shown on the card.">
            <div className="a-view-list">
              <Line label="Title (Marathi)">
                <span className="a-view-strong">{story.title_mr}</span>
              </Line>
              <Line label="Title (English)" empty={!story.title_en}>{story.title_en}</Line>
              <Line label="Short description (Marathi)" empty={!story.short_mr}>{story.short_mr}</Line>
              <Line label="Short description (English)" empty={!story.short_en}>{story.short_en}</Line>
            </div>
          </Section>

          {["mr", "en"].map((lang) => (
            <Section
              key={lang}
              title={`Story (${lang === "mr" ? "Marathi" : "English"})`}
              desc={hasPart(lang) ? "The six parts, in reading order." : "Nothing written yet."}
            >
              <div className="a-view-list">
                {PARTS.map((part) => (
                  <Line key={`${lang}-${part}`} label={PART_LABEL[part]}
                        empty={!String(content?.[lang]?.[part] ?? "").trim()}>
                    {content?.[lang]?.[part]}
                  </Line>
                ))}
              </div>
            </Section>
          ))}
        </div>

        <aside className="a-form-side">
          <Section title="Details" desc="How this story is filed and addressed.">
            <div className="a-view-list">
              <Line label="Category">{story.category}</Line>
              <Line label="Slug"><code className="a-text-xs">/yashogatha/{story.slug}</code></Line>
              <Line label="Display order">{story.display_order ?? 0}</Line>
              <Line label="Published">{story.published ? "Yes" : "No"}</Line>
              <Line label="Featured">{story.featured ? "Yes" : "No"}</Line>
              <Line label="Created">{fmtStamp(story.created_at)}</Line>
              <Line label="Last updated">{fmtStamp(story.updated_at)}</Line>
            </div>
          </Section>
        </aside>
      </div>
    </>
  );
}
