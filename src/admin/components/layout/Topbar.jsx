import { useState, useRef, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen, ExternalLink, UserCircle, LogOut, Menu, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";

// Breadcrumb trail per route: the sidebar group it sits under, then the page.
// Routes added after this map was written fell through to "Admin", which is why
// the trail read "Admin / Admin" on the newer screens.
const ROUTE_LABELS = {
  "/admin/dashboard": ["Overview", "Dashboard"],
  "/admin/hero": ["Website", "Amrut Varg Hero"],
  "/admin/about": ["Website", "About Section"],
  "/admin/activities": ["Website", "Activities Section"],
  "/admin/session": ["Website", "Session Section"],
  "/admin/yashogatha": ["Website", "Yashogatha"],
  "/admin/forms": ["Website", "Forms"],
  "/admin/masters/states": ["Master Management", "State Master"],
  "/admin/masters/vibhags": ["Master Management", "Vibhag Master"],
  "/admin/masters/districts": ["Master Management", "District Master"],
  "/admin/masters/talukas": ["Master Management", "Taluka Master"],
  "/admin/announcements": ["Content", "Announcements"],
  "/admin/stories": ["Content", "Yashogatha Stories"],
  "/admin/vargs": ["Website", "Amrut Varg Section"],
  "/admin/contacts": ["Content", "District Contacts"],
  "/admin/media": ["Content", "Media Library"],
  "/admin/submissions": ["Operations", "Form Submissions"],
  "/admin/settings": ["Operations", "Website Settings"],
  "/admin/profile": ["Account", "My Profile"],
};

// Longest path first, so /admin/masters/states is not shadowed by a prefix.
function getTrail(pathname) {
  const match = Object.keys(ROUTE_LABELS)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(path + "/"));
  return match ? ROUTE_LABELS[match] : [null, "Admin"];
}

function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A";
}

function ProfileDropdown({ user, logout }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
        {/* Avatar trigger */}
        <button className="a-profile-trigger" onClick={() => setOpen((v) => !v)}>
          <div className="a-avatar" style={{ width: "2.25rem", height: "2.25rem", fontSize: "0.8125rem" }}>
            {initials(user?.name)}
          </div>
          <div className="a-profile-info">
            <span className="a-profile-name">{user?.name || "Admin"}</span>
            <span className="a-profile-role">{user?.role || "Admin"}</span>
          </div>
          <ChevronDown size={14} className={`a-profile-chevron${open ? " open" : ""}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="a-profile-dropdown">
            {/* Header row */}
            <div className="a-pd-header">
              <div className="a-avatar" style={{ width: "2.5rem", height: "2.5rem", fontSize: "0.875rem", flexShrink: 0 }}>
                {initials(user?.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="a-pd-name">{user?.name || "Admin"}</div>
                <div className="a-pd-role">{user?.role || "Admin"}</div>
              </div>
            </div>

            <div className="a-pd-divider" />

            <div className="a-pd-email">{user?.email}</div>

            <div className="a-pd-divider" />

            <button className="a-pd-item" onClick={() => { setOpen(false); navigate("/admin/profile"); }}>
              <UserCircle size={15} />
              My profile
            </button>
            <button className="a-pd-item danger" onClick={() => { setOpen(false); logout(); }}>
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        )}
      </div>
  );
}


export function Topbar({ collapsed, onToggle, onMobileMenu }) {
  const location = useLocation();
  const { user, logout } = useAdminAuth();
  const [group, pageLabel] = getTrail(location.pathname);

  return (
    <header className="a-topbar">
      <div className="a-topbar-left">
        {/* Mobile hamburger — hidden on desktop */}
        <button className="a-action-btn" onClick={onMobileMenu}
          id="mobile-menu-btn" title="Menu">
          <Menu size={18} />
        </button>

        {/* Desktop collapse toggle — hidden on mobile */}
        <button
          className="a-action-btn"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ display: "none" }}
          id="collapse-btn"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Breadcrumb */}
        <div className="a-breadcrumb">
          <span>Admin</span>
          <span className="a-breadcrumb-sep">/</span>
          <span className="a-breadcrumb-current">{pageLabel}</span>
        </div>
      </div>

      <div className="a-topbar-right">
        <a href="/" target="_blank" rel="noopener noreferrer"
          className="a-btn a-btn-secondary a-btn-sm">
          <ExternalLink size={14} />
          View Site
        </a>

        <ProfileDropdown user={user} logout={logout} />
      </div>

      <style>{`
        #mobile-menu-btn { display: flex; }
        @media (min-width: 1024px) {
          #mobile-menu-btn { display: none !important; }
          #collapse-btn { display: flex !important; }
        }

        /* Profile trigger */
        .a-profile-trigger {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.25rem 0.5rem 0.25rem 0.25rem;
          border-radius: 2rem;
          border: 1px solid var(--a-line);
          background: transparent;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .a-profile-trigger:hover {
          background: var(--a-canvas-subtle);
          border-color: var(--a-line-strong);
        }
        .a-profile-info {
          display: flex; flex-direction: column; text-align: left; line-height: 1.2;
        }
        .a-profile-name {
          font-size: 0.8125rem; font-weight: 600; color: var(--a-content);
          white-space: nowrap;
        }
        .a-profile-role {
          font-size: 0.6875rem; color: var(--a-muted); white-space: nowrap;
          text-transform: capitalize;
        }
        .a-profile-chevron {
          color: var(--a-muted); flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .a-profile-chevron.open { transform: rotate(180deg); }

        /* Dropdown */
        .a-profile-dropdown {
          position: absolute; top: calc(100% + 0.5rem); right: 0;
          width: 14rem;
          background: var(--a-elevated);
          border: 1px solid var(--a-line);
          border-radius: 0.75rem;
          box-shadow: var(--a-shadow-pop);
          z-index: 50;
          overflow: hidden;
          padding: 0.375rem 0;
        }
        .a-pd-header {
          display: flex; align-items: center; gap: 0.625rem;
          padding: 0.75rem 1rem;
        }
        .a-pd-name {
          font-size: 0.875rem; font-weight: 700; color: var(--a-content);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .a-pd-role {
          font-size: 0.6875rem; color: var(--a-muted); text-transform: capitalize;
        }
        .a-pd-divider {
          height: 1px; background: var(--a-line); margin: 0.125rem 0;
        }
        .a-pd-email {
          padding: 0.5rem 1rem;
          font-size: 0.75rem; color: var(--a-muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .a-pd-item {
          display: flex; align-items: center; gap: 0.625rem;
          width: 100%; padding: 0.625rem 1rem;
          border: none; background: transparent;
          font-size: 0.875rem; font-weight: 500; color: var(--a-content);
          cursor: pointer; text-align: left;
          transition: background 0.12s;
          font-family: inherit;
        }
        .a-pd-item:hover { background: var(--a-canvas-subtle); }
        .a-pd-item.danger { color: var(--a-bad); }
        .a-pd-item.danger:hover { background: var(--a-bad-soft); }
      `}</style>
    </header>
  );
}
