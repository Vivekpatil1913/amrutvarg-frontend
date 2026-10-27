import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Sidebar } from "./Sidebar.jsx";
import { Topbar } from "./Topbar.jsx";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { isStateRole, roleLabel } from "../../lib/roles.js";

// Screens division and district managers may open. Everything else is state
// level; the CMS refuses it anyway, and this says so plainly instead of
// loading a page that can only fail.
const STAFF_PATHS = [
  "/admin/dashboard", "/admin/grievances", "/admin/melawa", "/admin/vargs",
  "/admin/register-student", "/admin/submissions", "/admin/profile",
];
const staffMayOpen = (path) =>
  STAFF_PATHS.some((p) => path === p || path.startsWith(`${p}/`)) && path !== "/admin/vargs/settings";

export function AdminLayout() {
  const { user, loading } = useAdminAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("av_sidebar_collapsed") === "true"
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="admin-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <div className="a-spinner">
          <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("av_sidebar_collapsed", String(next));
  }

  return (
    <div className="admin-root a-shell">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={`a-body ${collapsed ? "collapsed" : ""}`}>
        <Topbar
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          onMobileMenu={() => setMobileOpen(true)}
        />
        <main className="a-main">
          {isStateRole(user.role) || staffMayOpen(pathname) ? <Outlet /> : (
            <div className="a-card">
              <div className="a-empty-state">
                <ShieldAlert className="a-empty-icon" />
                <p className="a-empty-title">This page is for State-level administrators</p>
                <p className="a-text-muted a-text-sm">Your role ({roleLabel(user.role)}) does not include it. Use the menu to reach your jurisdiction&apos;s screens.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
