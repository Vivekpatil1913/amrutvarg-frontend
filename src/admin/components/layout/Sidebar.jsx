import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Megaphone, BookOpen, Users, Settings,
  FileText, Image, ChevronRight, LogOut, Sparkles, LayoutTemplate,
  Landmark, Map, MapPin, MapPinned, Milestone, Info, Activity, Clock, Quote,
  ClipboardList, Contact2, Link2, Clapperboard, Mic, Building2,
  MessageSquareWarning, PartyPopper, UserCog, ScrollText, School, GraduationCap,
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { avatarSrc } from "../../avatar.js";
import { isStateRole, roleLabel } from "../../lib/roles.js";

// `staff: true` marks what division and district managers may open; every
// other item is state level only. The CMS enforces the same split, so this is
// about not offering screens that would only answer "access denied".
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard", staff: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/grievances", icon: MessageSquareWarning, label: "Grievances", staff: true },
      { to: "/admin/melawa", icon: PartyPopper, label: "Melawa Announcements", staff: true },
      { to: "/admin/vargs", icon: School, label: "Amrut Vargs", staff: true, managersOnly: true },
      { to: "/admin/register-student", icon: GraduationCap, label: "Register Student", staff: true },
      { to: "/admin/submissions", icon: FileText, label: "Form Submissions", staff: true },
    ],
  },
  {
    label: "Website",
    items: [
      { to: "/admin/hero", icon: LayoutTemplate, label: "Amrut Varg Hero" },
      { to: "/admin/about", icon: Info, label: "About Section" },
      { to: "/admin/activities", icon: Activity, label: "Activities Section" },
      { to: "/admin/session", icon: Clock, label: "Session Section" },
      { to: "/admin/join", icon: ClipboardList, label: "Join Section" },
      { to: "/admin/directory", icon: Contact2, label: "Directory Page" },
      { to: "/admin/yashogatha", icon: BookOpen, label: "Yashogatha" },
      { to: "/admin/vargs", icon: MapPin, label: "Amrut Varg Section" },
      // Forms is hidden from the menu; /admin/forms still resolves if opened directly.
    ],
  },
  {
    label: "Master Management",
    items: [
      { to: "/admin/masters/states", icon: Landmark, label: "State Master" },
      { to: "/admin/masters/vibhags", icon: Map, label: "Vibhag Master" },
      { to: "/admin/masters/districts", icon: MapPinned, label: "District Master" },
      { to: "/admin/masters/talukas", icon: Milestone, label: "Taluka Master" },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/announcements", icon: Megaphone, label: "Announcements" },
      { to: "/admin/footer", icon: Link2, label: "Footer Links & Socials" },
      // Yashogatha Stories is reached through Website > Yashogatha; /admin/stories still resolves.
      // Amrut Vargs is hidden from the menu; /admin/vargs still resolves directly.
      { to: "/admin/videos", icon: Clapperboard, label: "Videos & Reels" },
      { to: "/admin/podcasts", icon: Mic, label: "Podcasts" },
      { to: "/admin/contacts", icon: Users, label: "District Contacts" },
      { to: "/admin/offices", icon: Building2, label: "District Offices" },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "/admin/users", icon: UserCog, label: "Users & Roles" },
      { to: "/admin/audit-logs", icon: ScrollText, label: "Audit Log" },
      { to: "/admin/settings", icon: Settings, label: "Website Settings" },
    ],
  },
];

// The groups this user should see. A state administrator already reaches the
// vargs through Website > Amrut Varg Section, so the Operations shortcut is
// for managers only.
function groupsFor(role) {
  const state = isStateRole(role);
  return NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (state ? !item.managersOnly : item.staff)),
    }))
    .filter((group) => group.items.length);
}

function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A";
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  const { user, logout } = useAdminAuth();
  const location = useLocation();
  const avatar = avatarSrc(user?.avatarUrl);
  const groups = groupsFor(user?.role);

  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div className="a-scrim visible" onClick={onMobileClose} />
      )}

      <aside className={`a-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Brand */}
        <div className="a-sidebar-brand">
          <div className="a-sidebar-logo">
            <Sparkles size={16} />
          </div>
          {!collapsed && (
            <div>
              <div className="a-sidebar-title">Amrutvarg</div>
              <div className="a-sidebar-subtitle">CMS Admin</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="a-sidebar-nav">
          {groups.map((group) => (
            <div key={group.label} className="a-nav-group">
              {!collapsed && (
                <div className="a-nav-group-label">{group.label}</div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to ||
                  (item.to !== "/admin/dashboard" && location.pathname.startsWith(item.to));
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`a-nav-item ${isActive ? "active" : ""}`}
                    onClick={onMobileClose}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="a-nav-item-icon" size={18} />
                    {!collapsed && <span className="a-nav-item-label">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="a-sidebar-footer">
          <div className="a-sidebar-user">
            <div className="a-avatar">
              {avatar ? <img src={avatar} alt="" /> : initials(user?.name)}
            </div>
            {!collapsed && (
              <div className="a-sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--a-nav-fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {roleLabel(user?.role)}
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className="a-action-btn muted"
              title="Sign out"
              style={{ flexShrink: 0, color: "var(--a-nav-fg-muted)" }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
