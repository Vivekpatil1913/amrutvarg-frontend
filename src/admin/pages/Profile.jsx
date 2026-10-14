import { useState, useRef } from "react";
import { Camera, User, Mail, KeyRound, Save, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { api } from "../api/client.js";
import { useToast } from "../components/ui/Toast.jsx";

function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A";
}

export default function Profile() {
  const { user } = useAdminAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [tab, setTab] = useState("info");

  /* ── Profile info ── */
  const [info, setInfo] = useState({ name: user?.name || "", email: user?.email || "" });
  const [avatar, setAvatar] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);

  /* ── Password ── */
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);
  const [pwErr, setPwErr] = useState("");

  function onAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatar(URL.createObjectURL(file));
  }

  async function saveInfo(e) {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const fd = new FormData();
      fd.append("name", info.name);
      fd.append("email", info.email);
      if (avatarFile) fd.append("avatar", avatarFile);
      await api.patch("/auth/profile", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingInfo(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwErr("");
    if (pw.next !== pw.confirm) { setPwErr("New passwords do not match."); return; }
    if (pw.next.length < 6) { setPwErr("Password must be at least 6 characters."); return; }
    setSavingPw(true);
    try {
      await api.post("/auth/change-password", { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password changed successfully");
    } catch (err) {
      setPwErr(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setSavingPw(false);
    }
  }

  const strength = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(pw.next)).length;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#dc2626", "#f59e0b", "#16a34a", "#15803d"][strength];

  return (
    <div style={{ maxWidth: "52rem", margin: "0 auto" }}>

      {/* ── Hero card ── */}
      <div className="a-card" style={{ marginBottom: "1.5rem", overflow: "hidden" }}>
        {/* Banner */}
        <div style={{
          background: "var(--a-band)",
          height: "7rem",
          position: "relative",
        }} />

        {/* Avatar + info row */}
        <div style={{ padding: "0 1.75rem 1.5rem", position: "relative" }}>
          {/* Avatar */}
          <div style={{ position: "relative", display: "inline-block", marginTop: "-3rem", marginBottom: "0.75rem" }}>
            {avatar
              ? <img src={avatar} alt="avatar" style={{
                  width: "6rem", height: "6rem", borderRadius: "50%", objectFit: "cover",
                  border: "3px solid white", boxShadow: "0 2px 12px rgba(0,0,0,0.15)"
                }} />
              : <div className="a-avatar" style={{
                  width: "6rem", height: "6rem", fontSize: "1.75rem", fontWeight: 800,
                  border: "3px solid white", boxShadow: "0 2px 12px rgba(0,0,0,0.15)"
                }}>
                  {initials(info.name || user?.name)}
                </div>
            }
            <button type="button" onClick={() => fileRef.current?.click()}
              title="Change photo"
              style={{
                position: "absolute", bottom: "2px", right: "2px",
                width: "2rem", height: "2rem", borderRadius: "50%",
                background: "var(--a-accent)", border: "2.5px solid white",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
              }}>
              <Camera size={13} />
            </button>
            <input ref={fileRef} type="file" accept="image/*"
              style={{ display: "none" }} onChange={onAvatarChange} />
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--a-content)", letterSpacing: "-0.02em" }}>
                {info.name || user?.name || "Admin"}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--a-muted)", marginTop: "0.125rem" }}>
                {user?.email}
              </div>
              <span className="a-badge a-badge-accent" style={{ marginTop: "0.5rem" }}>
                {user?.role || "Admin"}
              </span>
            </div>
            <button type="button" className="a-btn a-btn-ghost a-btn-sm"
              onClick={() => fileRef.current?.click()}
              style={{ color: "var(--a-accent)", marginTop: "0.25rem" }}>
              <Camera size={14} /> Change photo
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs card ── */}
      <div className="a-card" style={{ overflow: "hidden" }}>
        {/* Tab bar */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--a-line)",
          padding: "0 1.5rem",
          background: "var(--a-canvas-subtle)"
        }}>
          {[
            { key: "info", icon: <User size={15} />, label: "Profile Info" },
            { key: "security", icon: <ShieldCheck size={15} />, label: "Security" },
          ].map((t) => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.875rem 1rem",
                border: "none", background: "none",
                fontFamily: "inherit", fontWeight: 600, fontSize: "0.875rem",
                cursor: "pointer",
                color: tab === t.key ? "var(--a-accent)" : "var(--a-muted)",
                borderBottom: tab === t.key ? "2px solid var(--a-accent)" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "color 0.15s",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Profile Info tab ── */}
        {tab === "info" && (
          <form onSubmit={saveInfo}>
            <div style={{ padding: "1.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <div className="a-field">
                  <label className="a-label a-label-required" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <User size={11} /> Full name
                  </label>
                  <input type="text" className="a-input"
                    value={info.name}
                    onChange={(e) => setInfo((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your name" required />
                </div>
                <div className="a-field">
                  <label className="a-label a-label-required" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Mail size={11} /> Email address
                  </label>
                  <input type="email" className="a-input"
                    value={info.email}
                    onChange={(e) => setInfo((f) => ({ ...f, email: e.target.value }))}
                    placeholder="admin@example.com" required />
                </div>
              </div>

              <p className="a-field-help" style={{ marginTop: "1rem" }}>
                Changes to your name or email will take effect on your next login.
              </p>
            </div>

            <div style={{
              display: "flex", justifyContent: "flex-end",
              padding: "1rem 1.75rem",
              borderTop: "1px solid var(--a-line)",
              background: "var(--a-canvas-subtle)"
            }}>
              <button type="submit" className="a-btn a-btn-primary" disabled={savingInfo}>
                <Save size={15} />
                {savingInfo ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}

        {/* ── Security tab ── */}
        {tab === "security" && (
          <form onSubmit={savePassword}>
            <div style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              <PwField
                label="Current password"
                value={pw.current}
                show={showPw.current}
                onChange={(v) => setPw((f) => ({ ...f, current: v }))}
                onToggle={() => setShowPw((p) => ({ ...p, current: !p.current }))}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <PwField
                  label="New password"
                  value={pw.next}
                  show={showPw.next}
                  onChange={(v) => setPw((f) => ({ ...f, next: v }))}
                  onToggle={() => setShowPw((p) => ({ ...p, next: !p.next }))}
                />
                <PwField
                  label="Confirm new password"
                  value={pw.confirm}
                  show={showPw.confirm}
                  onChange={(v) => setPw((f) => ({ ...f, confirm: v }))}
                  onToggle={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}
                />
              </div>

              {/* Strength bar */}
              {pw.next && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{
                        flex: 1, height: "5px", borderRadius: "3px",
                        background: i <= strength ? strengthColor : "var(--a-line-strong)",
                        transition: "background 0.25s"
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: strengthColor, fontWeight: 600 }}>
                    {strengthLabel} password
                  </span>
                </div>
              )}

              {pwErr && (
                <div className="a-notice a-notice-bad" style={{ padding: "0.625rem 0.875rem" }}>
                  {pwErr}
                </div>
              )}

              <div className="a-notice a-notice-info" style={{ fontSize: "0.8125rem" }}>
                <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                <span>Use at least 8 characters with a mix of uppercase, numbers and symbols.</span>
              </div>
            </div>

            <div style={{
              display: "flex", justifyContent: "flex-end",
              padding: "1rem 1.75rem",
              borderTop: "1px solid var(--a-line)",
              background: "var(--a-canvas-subtle)"
            }}>
              <button type="submit" className="a-btn a-btn-primary"
                disabled={savingPw || !pw.current || !pw.next}>
                <KeyRound size={15} />
                {savingPw ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function PwField({ label, value, show, onChange, onToggle }) {
  return (
    <div className="a-field">
      <label className="a-label a-label-required">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          className="a-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: "2.75rem" }}
          required
        />
        <button type="button" onClick={onToggle}
          style={{
            position: "absolute", right: "0.75rem", top: "50%",
            transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--a-muted)", display: "flex", alignItems: "center",
            padding: 0,
          }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}
