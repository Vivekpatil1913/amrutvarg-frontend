// Shared by the Amrut Varg Activities list and the dashboard's export card.

export const FREQUENCY = {
  DAILY: { label: "Daily", tone: "ok" },
  WEEKLY: { label: "Weekly", tone: "info" },
  MONTHLY: { label: "Monthly", tone: "accent" },
};

// The server names the file too, but Content-Disposition is not readable
// across origins, so the browser is given the same name directly.
export const exportFileName = () => `amrut-varg-activities-${new Date().toISOString().slice(0, 10)}.csv`;
