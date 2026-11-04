// Shared by the Amrut Varg Activities list, its Excel import and photo
// dialogs, and the dashboard's export card.

export const FREQUENCY = {
  DAILY: { label: "Daily", tone: "ok" },
  WEEKLY: { label: "Weekly", tone: "info" },
  MONTHLY: { label: "Monthly", tone: "accent" },
};

// The server names the file too, but Content-Disposition is not readable
// across origins, so the browser is given the same name directly.
export const exportFileName = () => `amrut-varg-activities-${new Date().toISOString().slice(0, 10)}.csv`;

// ── Excel import ────────────────────────────────────────────────────────────
// The server is the judge of every row; these limits only spare an upload
// that would certainly be refused.

export const IMPORT = {
  maxBytes: 5 * 1024 * 1024,
  maxRows: 1000,
  ext: ".xlsx",
  templateName: "amrut-varg-activities-import-template.xlsx",
};

// The sheet's columns as the preview and the error report name them, in the
// sheet's order. `required` mirrors the public form.
export const IMPORT_COLUMNS = [
  { key: "division", label: "Division", required: true },
  { key: "district", label: "District", required: true },
  { key: "taluka", label: "Taluka", required: true },
  { key: "institution_name", label: "School / Institution", required: true },
  { key: "incharge_name", label: "Pramukh (In-charge)", required: true },
  { key: "incharge_mobile", label: "Contact number", required: false },
  { key: "participant_count", label: "Students", required: true },
  { key: "frequency", label: "Frequency", required: true },
  { key: "description", label: "Description", required: false },
];

export const columnLabel = (key) => IMPORT_COLUMNS.find((c) => c.key === key)?.label ?? key;

// One CSV cell, quoted where needed and never readable as a formula — the
// same rule as the server's export.
function csvCell(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

// The rows that failed, with their reasons, as a CSV to correct the sheet
// from. A BOM leads so Excel reads the Marathi names.
export function importErrorReport(rows) {
  const header = ["Sheet row", ...IMPORT_COLUMNS.map((c) => c.label), "Problems"];
  const body = rows
    .filter((r) => r.errors.length)
    .map((r) => [
      r.row,
      ...IMPORT_COLUMNS.map((c) => r.values[c.key]),
      r.errors.map((e) => `${columnLabel(e.field)}: ${e.message}`).join(" | "),
    ]);
  return `﻿${[header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function saveText(text, name, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
