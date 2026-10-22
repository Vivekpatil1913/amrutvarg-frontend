import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";
import { api } from "../api/client.js";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";

// Read-only view of one Amrut Varg, as it is stored.

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

export default function VargView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [varg, setVarg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/vargs/${id}`)
      .then((res) => setVarg(res.data))
      .catch(() => {
        toast.show("That varg could not be loaded", "bad");
        navigate("/admin/vargs");
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

  if (!varg) return null;

  return (
    <>
      <div className="a-detail-head">
        <div>
          <div className="a-view-tags">
            <Badge tone={varg.is_active ? "ok" : "neutral"}>
              {varg.is_active ? "Active" : "Hidden"}
            </Badge>
            <Badge tone="neutral">{varg.vibhag_mr}</Badge>
          </div>
          <h1 className="a-page-title a-mt-1">{varg.district_mr}</h1>
          <p className="a-page-desc">
            {varg.school_name || "Read-only — use Edit to change this varg."}
          </p>
        </div>
        <div className="a-flex a-gap-2">
          <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/vargs")}>
            <ArrowLeft size={16} /> Back to list
          </button>
          {varg.is_active && (
            <a className="a-btn a-btn-ghost" href="/#vargs" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> View on site
            </a>
          )}
          <button className="a-btn a-btn-primary" onClick={() => navigate(`/admin/vargs/${varg.id}/edit`)}>
            <Pencil size={16} /> Edit
          </button>
        </div>
      </div>

      <div className="a-form-layout">
        <div className="a-form-main">
          <Section title="Where" desc="The geography this varg is filed under.">
            <div className="a-view-list">
              <Line label="Division (Marathi)">
                <span className="a-view-strong">{varg.vibhag_mr}</span>
              </Line>
              <Line label="Division (English)" empty={!varg.vibhag_en}>{varg.vibhag_en}</Line>
              <Line label="District (Marathi)">
                <span className="a-view-strong">{varg.district_mr}</span>
              </Line>
              <Line label="District (English)" empty={!varg.district_en}>{varg.district_en}</Line>
              <Line label="Taluka" empty={!varg.taluka}>{varg.taluka}</Line>
              <Line label="Village" empty={!varg.village}>{varg.village}</Line>
            </div>
          </Section>

          <Section title="The class" desc="What the card on the website shows.">
            <div className="a-view-list">
              <Line label="School / Location">
                <span className="a-view-strong">{varg.school_name}</span>
              </Line>
              <Line label="Varg name" empty={!varg.varg_name}>{varg.varg_name}</Line>
              <Line label="Coordinator" empty={!varg.coordinator_name}>{varg.coordinator_name}</Line>
              <Line label="Enrolled">{varg.enrollment_count ?? 0}</Line>
            </div>
          </Section>
        </div>

        <aside className="a-form-side">
          <Section title="Listing" desc="Whether this varg appears, and where in the order.">
            <div className="a-view-list">
              <Line label="Active">{varg.is_active ? "Yes" : "No"}</Line>
              <Line label="Display order">{varg.display_order ?? 0}</Line>
              <Line label="Created">{fmtStamp(varg.created_at)}</Line>
              <Line label="Last updated">{fmtStamp(varg.updated_at)}</Line>
            </div>
          </Section>
        </aside>
      </div>
    </>
  );
}
