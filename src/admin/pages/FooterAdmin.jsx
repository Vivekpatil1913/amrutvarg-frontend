import { useEffect, useMemo, useState } from "react";
import { Save, Rocket, Undo2, Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { Modal } from "../components/ui/Modal.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import Icon from "../../components/Icon.jsx";

const blank = (v) => !String(v ?? "").trim();
const normalizeUrl = (v) => {
  const value = String(v ?? "").trim();
  return /^www\./i.test(value) ? `https://${value}` : value;
};
const validUrl = (v) => /^https?:\/\/\S+$/i.test(normalizeUrl(v));

function Field({ label, value, onChange, max, error, multiline = false }) {
  return <div className={`a-field${error ? " has-error" : ""}`}>
    <label className="a-label">{label}</label>
    {multiline
      ? <textarea className="a-input a-textarea" rows={2} maxLength={max} value={value ?? ""}
          onChange={(e) => onChange(e.target.value)} />
      : <input className="a-input" maxLength={max} value={value ?? ""}
          onChange={(e) => onChange(e.target.value)} />}
    {error ? <span className="a-field-error">{error}</span>
      : <span className="a-field-note">{String(value ?? "").length}/{max}</span>}
  </div>;
}

function Bilingual({ label, item, base, patch, max, errors, prefix, multiline = false, required = false }) {
  return <div className="a-form-grid a-form-grid-2">
    <Field label={`${label} (Marathi)${required ? " *" : ""}`} value={item[`${base}_mr`]}
      max={max} multiline={multiline} error={errors[`${prefix}.${base}_mr`]}
      onChange={(v) => patch({ [`${base}_mr`]: v })} />
    <Field label={`${label} (English)`} value={item[`${base}_en`]}
      max={max} multiline={multiline} error={errors[`${prefix}.${base}_en`]}
      onChange={(v) => patch({ [`${base}_en`]: v })} />
  </div>;
}

function Section({ title, desc, children }) {
  return <section className="a-card a-panel">
    <header className="a-panel-head"><h2 className="a-panel-title">{title}</h2>
      {desc && <p className="a-panel-desc">{desc}</p>}</header>
    <div className="a-panel-body">{children}</div>
  </section>;
}

export default function FooterAdmin() {
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [options, setOptions] = useState({ platforms: [], icons: [], socialIcons: [] });
  const [loading, setLoading] = useState(true);
  const [serverErrors, setServerErrors] = useState({});
  const [meta, setMeta] = useState({ published_at: null, has_unpublished_changes: false });
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [socialForm, setSocialForm] = useState(null);
  const [socialFormError, setSocialFormError] = useState("");
  const [removeSocialId, setRemoveSocialId] = useState(null);
  const { mutate, loading: saving } = useMutation();
  const dirty = useMemo(() => !!(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved)), [draft, saved]);

  useEffect(() => {
    Promise.all([api.get("/admin/footer"), api.get("/admin/footer/options")])
      .then(([cfg, opt]) => {
        setDraft(cfg.data.draft);
        setSaved(cfg.data.draft);
        setOptions(opt.data);
        setMeta({ published_at: cfg.data.published_at, has_unpublished_changes: cfg.data.has_unpublished_changes });
      })
      .catch((err) => toast.error(errorMessage(err, "Could not load footer settings")))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (ev) => { ev.preventDefault(); ev.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patchText = (values) => setDraft((d) => ({ ...d, text: { ...d.text, ...values } }));
  const patchLink = (i, values) => setDraft((d) => ({ ...d, links: d.links.map((x, n) => n === i ? { ...x, ...values } : x) }));
  const socialRows = draft?.social.filter((item) => !blank(item.url)) ?? [];

  function openAddSocial() {
    if (socialRows.length >= 30) return;
    setSocialForm({ id: "", platform: "", icon: options.socialIcons[0]?.value ?? "link", url: "", label_mr: "", label_en: "", enabled: true });
    setSocialFormError("");
  }

  function openEditSocial(item) {
    setSocialForm({ ...item, icon: item.icon || (options.socialIcons.some((option) => option.value === item.platform) ? item.platform : "link") });
    setSocialFormError("");
  }

  function saveSocialForm() {
    if (!socialForm?.platform?.trim()) {
      setSocialFormError("Enter a platform name");
      return;
    }
    if (!validUrl(socialForm.url)) {
      setSocialFormError("Enter a web address such as www.facebook.com or https://facebook.com");
      return;
    }
    const normalizedSocial = { ...socialForm, platform: socialForm.platform.trim(), url: normalizeUrl(socialForm.url) };
    setDraft((current) => {
      if (socialForm.id) {
        return { ...current, social: current.social.map((item) => item.id === socialForm.id ? { ...item, ...normalizedSocial } : item) };
      }
      const id = `soc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      return { ...current, social: [...current.social.filter((item) => !blank(item.url)), { ...normalizedSocial, id }] };
    });
    setSocialForm(null);
  }

  function removeSocial() {
    setDraft((current) => ({ ...current, social: current.social.filter((item) => item.id !== removeSocialId) }));
    setRemoveSocialId(null);
  }

  const validationErrors = useMemo(() => {
    if (!draft) return {};
    const errors = {};
    draft.links.forEach((item, i) => {
      if (blank(item.title_mr)) errors[`links.${i}.title_mr`] = "Marathi title is required";
      if (blank(item.url)) errors[`links.${i}.url`] = "Link address is required";
      else if (!validUrl(item.url)) errors[`links.${i}.url`] = "Enter a web address such as www.example.com or https://example.com";
    });
    draft.social.forEach((item, i) => {
      if (!blank(item.url) && blank(item.platform)) errors[`social.${i}.platform`] = "Platform name is required";
      if (!blank(item.url) && !validUrl(item.url)) errors[`social.${i}.url`] = "Enter a web address such as www.example.com or https://example.com";
    });
    return errors;
  }, [draft]);
  const errors = { ...validationErrors, ...serverErrors };

  const socialColumns = [
    {
      key: "platform", label: "Platform",
      render: (platform, row) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Icon name={row.icon || (options.socialIcons.some((item) => item.value === platform) ? platform : "link")} size={20} />
        {options.platforms.find((item) => item.value === platform)?.label ?? platform}
      </span>,
    },
    {
      key: "url", label: "Profile link",
      render: (url) => <a href={url} target="_blank" rel="noopener noreferrer" className="td-truncate">{url}</a>,
    },
    {
      key: "enabled", label: "Status",
      render: (enabled) => enabled === false
        ? <Badge tone="neutral">Hidden</Badge>
        : <Badge tone="ok">Visible</Badge>,
    },
  ];

  async function save(publish = false) {
    if (Object.keys(validationErrors).length) {
      toast.show("Fix the highlighted fields first", "bad");
      return;
    }
    await mutate(async () => {
      setServerErrors({});
      try {
        const normalizedDraft = {
          ...draft,
          links: draft.links.map((item) => ({ ...item, url: normalizeUrl(item.url) })),
          social: draft.social.filter((item) => !blank(item.url)).map((item) => ({ ...item, url: normalizeUrl(item.url) })),
        };
        const res = await api.put("/admin/footer/draft", normalizedDraft);
        const savedDraft = res.data.draft ?? normalizedDraft;
        setDraft(savedDraft);
        setSaved(savedDraft);
        setMeta((m) => ({ ...m, has_unpublished_changes: true }));
        if (publish) {
          const result = await api.post("/admin/footer/publish");
          setMeta({ published_at: result.data.published_at, has_unpublished_changes: false });
          toast.success("Published — the website is updated");
        } else toast.show("Draft saved — not yet live", "ok");
      } catch (err) {
        if (err.details?.length) setServerErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
        toast.error(errorMessage(err));
        throw err;
      }
    }).catch(() => {});
  }

  async function discard() {
    await mutate(async () => {
      try {
        const result = await api.post("/admin/footer/discard");
        setDraft(result.data.draft);
        setSaved(result.data.draft);
        setMeta((m) => ({ ...m, has_unpublished_changes: false }));
        setConfirmDiscard(false);
        toast.show("Draft reset to the published version", "ok");
      } catch (err) { toast.error(errorMessage(err)); throw err; }
    }).catch(() => {});
  }

  if (loading) return <div className="a-card a-panel"><div className="a-panel-body">Loading footer settings…</div></div>;
  if (!draft) return <div className="a-notice a-notice-error">Footer settings could not be loaded. Refresh and try again.</div>;

  return <>
    <div className="a-page-header">
      <div><h1 className="a-page-title">Footer Links & Socials</h1>
        <p className="a-page-desc">Edit the official links and social profiles shown on the website.</p></div>
      <div className="a-toolbar-right">
        <button className="a-btn a-btn-ghost" disabled={saving || !meta.has_unpublished_changes}
          onClick={() => setConfirmDiscard(true)}><Undo2 size={16} /> Discard draft</button>
        <button className="a-btn a-btn-ghost" disabled={saving || !dirty} onClick={() => save(false)}>
          <Save size={16} /> Save draft</button>
        <button className="a-btn a-btn-primary" disabled={saving || !!Object.keys(validationErrors).length}
          onClick={() => save(true)}><Rocket size={16} /> Publish</button>
      </div>
    </div>
    {meta.has_unpublished_changes && <div className="a-notice a-notice-info"><div className="a-notice-body">
      <p className="a-notice-title">Unpublished changes</p><p>The website is still showing the last published version.</p>
    </div></div>}
    {dirty && !meta.has_unpublished_changes && <div className="a-notice a-notice-info"><div className="a-notice-body">
      <p className="a-notice-title">Footer changes are still in this form</p>
      <p>Click Publish to save these changes and show them on the website. Save Draft keeps them unpublished.</p>
    </div></div>}
    <Section title="Headings" desc="Labels above the official links and social icons.">
      <div className="a-form-grid a-form-grid-2">
        <Field label="Official links heading (Marathi)" max={80} value={draft.text.official_heading_mr}
          onChange={(v) => patchText({ official_heading_mr: v })} />
        <Field label="Official links heading (English)" max={80} value={draft.text.official_heading_en}
          onChange={(v) => patchText({ official_heading_en: v })} />
        <Field label="Social heading (Marathi)" max={80} value={draft.text.social_heading_mr}
          onChange={(v) => patchText({ social_heading_mr: v })} />
        <Field label="Social heading (English)" max={80} value={draft.text.social_heading_en}
          onChange={(v) => patchText({ social_heading_en: v })} />
      </div>
    </Section>
    <Section title="Official links" desc="The same links appear in the footer and contact page’s Official Information tab.">
      {draft.links.map((item, i) => <div className="a-row-card" key={item.id}>
        <div className="a-row-head"><span className="a-row-index">{i + 1}</span>
          <span className="a-row-title">{item.title_mr || "Official link"}</span>
          <label className="a-label"><input type="checkbox" checked={item.enabled !== false}
            onChange={(e) => patchLink(i, { enabled: e.target.checked })} /> Enabled</label></div>
        <div className="a-row-body">
          <Field label="URL" value={item.url} max={300} error={errors[`links.${i}.url`]} onChange={(v) => patchLink(i, { url: v })} />
          <div className="a-field"><label className="a-label">Icon</label><select className="a-select"
            value={item.icon} onChange={(e) => patchLink(i, { icon: e.target.value })}>
            {options.icons.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
          </select></div>
          <Bilingual label="Title" item={item} base="title" patch={(v) => patchLink(i, v)} max={120}
            required errors={errors} prefix={`links.${i}`} />
          <Bilingual label="Description" item={item} base="desc" patch={(v) => patchLink(i, v)} max={300}
            multiline errors={errors} prefix={`links.${i}`} />
        </div>
      </div>)}
    </Section>
    <Section title="Social profiles" desc="Add profile links here, then click Publish above to show each enabled icon on the website.">
      <DataTable
        columns={socialColumns}
        rows={socialRows}
        loading={false}
        meta={{ total: socialRows.length, page: 1, pageSize: Math.max(socialRows.length, 1), totalPages: 1 }}
        onPage={() => {}}
        onPageSize={() => {}}
        sno={false}
        toolbar={<div className="a-toolbar-right">
          <span className="a-text-muted a-text-sm">{socialRows.length} profile{socialRows.length === 1 ? "" : "s"}</span>
          <button className="a-btn a-btn-primary" onClick={openAddSocial} disabled={socialRows.length >= 30}>
            <Plus size={16} /> Add social link
          </button>
        </div>}
        actions={(item) => <>
          <button className="a-action-btn" title="Edit social link" onClick={() => openEditSocial(item)}><Pencil size={15} /></button>
          <button className="a-action-btn danger" title="Remove social link" onClick={() => setRemoveSocialId(item.id)}><Trash2 size={15} /></button>
        </>}
      />
    </Section>
    <Modal open={!!socialForm} onClose={() => setSocialForm(null)}
      title={socialForm?.id ? "Edit social link" : "Add social link"}
      footer={<>
        <button className="a-btn a-btn-ghost" onClick={() => setSocialForm(null)}>Cancel</button>
        <button className="a-btn a-btn-primary" onClick={saveSocialForm}>{socialForm?.id ? "Save to draft" : "Add to draft"}</button>
      </>}>
      {socialForm && <div className="a-form-grid">
        <Field label="Platform name" value={socialForm.platform} max={40} error={socialFormError === "Enter a platform name" ? socialFormError : ""}
          onChange={(v) => { setSocialForm((item) => ({ ...item, platform: v })); setSocialFormError(""); }} />
        <div className="a-field"><label className="a-label">Icon</label>
          <select className="a-select" value={socialForm.icon || "link"}
            onChange={(e) => setSocialForm((item) => ({ ...item, icon: e.target.value }))}>
            {options.socialIcons.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
          </select>
          <span className="a-field-note" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            Icon preview: <Icon name={socialForm.icon || "link"} size={18} />
          </span>
        </div>
        <Field label="Profile URL" value={socialForm.url} max={300} error={socialFormError}
          onChange={(v) => { setSocialForm((item) => ({ ...item, url: v })); setSocialFormError(""); }} />
        <Bilingual label="Accessible label (optional)" item={socialForm} base="label"
          patch={(values) => setSocialForm((item) => ({ ...item, ...values }))} max={60} errors={{}} prefix="social" />
        <label className="a-label"><input type="checkbox" checked={socialForm.enabled !== false}
          onChange={(e) => setSocialForm((item) => ({ ...item, enabled: e.target.checked }))} /> Show this icon on the website</label>
      </div>}
    </Modal>
    <Modal open={!!removeSocialId} onClose={() => setRemoveSocialId(null)} title="Remove social link?"
      footer={<>
        <button className="a-btn a-btn-ghost" onClick={() => setRemoveSocialId(null)}>Cancel</button>
        <button className="a-btn a-btn-danger" onClick={removeSocial}>Remove link</button>
      </>}>
      This removes the profile from the current draft. Publish to apply the change to the website.
    </Modal>
    <Modal open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="Discard footer draft?"
      footer={<>
        <button className="a-btn a-btn-ghost" onClick={() => setConfirmDiscard(false)} disabled={saving}>Cancel</button>
        <button className="a-btn a-btn-danger" onClick={discard} disabled={saving}>Discard draft</button>
      </>}>
      <p>This replaces the current draft with the published footer settings.</p>
    </Modal>
  </>;
}
