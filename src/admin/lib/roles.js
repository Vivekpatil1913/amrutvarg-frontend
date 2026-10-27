// The three administrative tiers, mirroring the CMS's src/lib/scope.js.
// The server enforces every boundary; this only decides what the panel offers.

export const STATE_ROLES = ["superadmin", "admin", "state_coordinator"];

export const ROLE_LABELS = {
  superadmin: "Super Admin",
  admin: "Admin",
  state_coordinator: "State Coordinator",
  division_manager: "Divisional Manager",
  district_manager: "District Manager",
};

export const ASSIGNABLE_ROLES = ["state_coordinator", "division_manager", "district_manager", "admin", "superadmin"];

export const isStateRole = (role) => STATE_ROLES.includes(role);

export const roleLabel = (role) => ROLE_LABELS[role] || role || "Admin";

// Grievance and SLA presentation shared by the list, the detail page and the
// dashboard.
export const GRIEVANCE_STATUS = {
  NEW: { label: "New", tone: "info" },
  ACKNOWLEDGED: { label: "Acknowledged", tone: "accent" },
  IN_PROGRESS: { label: "In progress", tone: "warn" },
  RESOLVED: { label: "Resolved", tone: "ok" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const SLA_BADGE = {
  OK: { label: "On track", tone: "ok" },
  AMBER: { label: "Approaching SLA", tone: "warn" },
  RED: { label: "Overdue", tone: "bad" },
  MET: { label: "Done", tone: "neutral" },
};

export const fmtStamp = (v) => (v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
