import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";
import { Topbar } from "./Topbar.jsx";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";

export function AdminLayout() {
  const { user, loading } = useAdminAuth();
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
