import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import "../styles/admin.css";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-root a-login-root">
      <div className="a-login-card">
        <div className="a-login-band">
          <div className="a-login-logo">
            <Sparkles size={24} />
          </div>
          <h1 className="a-login-heading">Amrutvarg CMS</h1>
          <p className="a-login-sub">Sign in to manage your website</p>
        </div>

        <form className="a-login-body" onSubmit={handleSubmit}>
          {error && (
            <div className="a-notice a-notice-bad" style={{ marginBottom: "1rem" }}>
              <span className="a-notice-title">{error}</span>
            </div>
          )}

          <div className="a-form-grid" style={{ gap: "1rem" }}>
            <div className="a-field">
              <label className="a-label a-label-required" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="a-input"
                placeholder="admin@amrutvarg.local"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="a-field">
              <label className="a-label a-label-required" htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  className="a-input"
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: "absolute", right: "0.75rem", top: "50%",
                    transform: "translateY(-50%)", background: "none", border: "none",
                    cursor: "pointer", color: "var(--a-muted)", display: "flex",
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="a-btn a-btn-primary"
            style={{ width: "100%", marginTop: "1.25rem", height: "2.75rem" }}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.8125rem", color: "var(--a-muted)" }}>
            <a href="/" style={{ color: "var(--a-accent)" }}>← Back to website</a>
          </p>
        </form>
      </div>
    </div>
  );
}
