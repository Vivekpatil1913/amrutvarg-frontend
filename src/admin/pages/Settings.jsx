import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { api } from "../api/client.js";
import { useMutation } from "../hooks/useApi.js";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";

const GROUP_LABELS = {
  general: "General",
  contact: "Contact Information",
  links: "Official Links",
  seo: "SEO",
};

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const { mutate, loading: saving } = useMutation();

  useEffect(() => {
    api.get("/admin/settings").then((res) => {
      setSettings(res.data);
      const v = {};
      for (const s of res.data) v[s.setting_key] = s.value;
      setValues(v);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    await mutate(async () => {
      await api.post("/admin/settings/bulk", values);
      toast.success("Settings saved successfully");
    }).catch((err) => {
      toast.error(errorMessage(err, "Could not save the settings"));
    });
  }

  if (loading) return (
    <div className="a-spinner">
      <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
      Loading…
    </div>
  );

  // Group settings
  const grouped = {};
  for (const s of settings) {
    if (!grouped[s.group_name]) grouped[s.group_name] = [];
    grouped[s.group_name].push(s);
  }

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Website Settings</h1>
          <p className="a-page-desc">Configure global website settings</p>
        </div>
        <button className="a-btn a-btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? "Saving…" : "Save all"}
        </button>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="a-card">
              <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--a-line)", fontWeight: 700, fontSize: "0.8125rem", color: "var(--a-content-soft)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {GROUP_LABELS[group] || group}
              </div>
              <div className="a-form-section">
                {items.map((s) => (
                  <div key={s.setting_key} className="a-field">
                    <label className="a-label">{s.label}</label>
                    {s.setting_key === "meta_description" ? (
                      <textarea
                        className="a-input a-textarea"
                        rows={3}
                        value={values[s.setting_key] || ""}
                        onChange={(e) => setValues({ ...values, [s.setting_key]: e.target.value })}
                      />
                    ) : (
                      <input
                        className="a-input"
                        type={s.setting_key.includes("url") || s.setting_key.includes("_url") ? "url" : "text"}
                        value={values[s.setting_key] || ""}
                        onChange={(e) => setValues({ ...values, [s.setting_key]: e.target.value })}
                        placeholder={s.setting_key.includes("url") ? "https://…" : ""}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </form>
    </>
  );
}
