import { useState } from "react";
import { Download, FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, X, ImagePlus } from "lucide-react";
import { Modal } from "./ui/Modal.jsx";
import { Badge } from "./ui/Badge.jsx";
import { useToast } from "./ui/Toast.jsx";
import { api } from "../api/client.js";
import { errorMessage } from "../lib/errors.js";
import { IMPORT, IMPORT_COLUMNS, columnLabel, importErrorReport, saveText } from "../lib/vargActivities.js";

// Bulk import of Amrut Varg activity records from an Excel sheet, in three
// steps:
//   choose  download the template, pick the filled sheet
//   review  the server's check of every row — nothing is written yet
//   done    what was imported, and what was skipped and why
//
// The sheet is uploaded again to import and checked again there, so the
// result never rests on a check made earlier. Imported records arrive hidden
// with "Photo pending": a spreadsheet cannot carry the form's photographs.

const NUMBER = new Intl.NumberFormat("en-IN");
const ENDPOINT = "/admin/varg-activities/import";

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const reportName = (file) => `${file.replace(/\.xlsx$/i, "")}-errors.csv`;

function sheetProblem(file) {
  if (!file.name.toLowerCase().endsWith(IMPORT.ext)) {
    return /\.(xls|csv)$/i.test(file.name)
      ? "Old .xls and .csv files cannot be imported. Open the file in Excel and use Save As → Excel Workbook (.xlsx)."
      : "Choose an Excel workbook (.xlsx).";
  }
  if (file.size > IMPORT.maxBytes) return `That file is ${mb(file.size)} — the limit is ${mb(IMPORT.maxBytes)}. Split it into smaller files.`;
  if (!file.size) return "That file is empty.";
  return "";
}

// A row's problems, one per line, named by column.
function RowErrors({ errors }) {
  return (
    <ul className="av-import-errors">
      {errors.map((e) => (
        <li key={e.field + e.message}><strong>{columnLabel(e.field)}:</strong> {e.message}</li>
      ))}
    </ul>
  );
}

function RowsTable({ rows }) {
  return (
    <div className="av-import-table">
      <table className="a-table">
        <thead>
          <tr>
            <th>Row</th>
            <th>School / Institution</th>
            <th>Location</th>
            <th>Pramukh</th>
            <th>Students</th>
            <th>Frequency</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.row} className={r.errors.length ? "is-invalid" : ""}>
              <td className="td-muted" data-label="Sheet row">{r.row}</td>
              <td className="td-bold av-import-school">{r.values.institution_name || "—"}</td>
              <td className="a-text-sm" data-label="Location">{[r.values.taluka, r.values.district, r.values.division].filter(Boolean).join(", ") || "—"}</td>
              <td data-label="Pramukh"><span className="av-pramukh-name">{r.values.incharge_name || "—"}</span></td>
              <td data-label="Students">{r.values.participant_count || "—"}</td>
              <td data-label="Frequency">{r.values.frequency || "—"}</td>
              <td className="av-import-status">{r.errors.length ? <RowErrors errors={r.errors} /> : <Badge tone="ok">Ready</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VargActivityImport({ open, onClose, onImported, onShowPending }) {
  const toast = useToast();
  const [step, setStep] = useState("choose");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(""); // template | check | import
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [onlyErrors, setOnlyErrors] = useState(false);

  const working = busy === "check" || busy === "import";

  function reset() {
    setStep("choose");
    setFile(null);
    setFileError("");
    setPreview(null);
    setResult(null);
    setOnlyErrors(false);
  }

  // Never closed mid-request: the outcome would go unseen.
  function close() {
    if (working) return;
    reset();
    onClose();
  }

  function choose(picked) {
    if (!picked) return;
    const problem = sheetProblem(picked);
    setFileError(problem);
    setFile(problem ? null : picked);
  }

  async function downloadTemplate() {
    setBusy("template");
    try {
      await api.download(`${ENDPOINT}/template.xlsx`, IMPORT.templateName);
    } catch (err) {
      toast.error(errorMessage(err, "Could not download the template"));
    } finally {
      setBusy("");
    }
  }

  async function send(path) {
    const form = new FormData();
    form.append("file", file);
    return (await api.post(path, form)).data;
  }

  // A problem with the file as a whole goes back to the first step, beside
  // the file it is about; anything else is a toast.
  function failed(err, fallback) {
    const fileIssue = err.details?.find((d) => d.field === "file")?.message
      || (err.status === 413 ? `The file is larger than the server accepts (${mb(IMPORT.maxBytes)}).` : "");
    if (fileIssue) {
      setStep("choose");
      setFileError(fileIssue);
      setFile(null);
    } else {
      toast.error(errorMessage(err, fallback));
    }
  }

  async function check() {
    if (!file) return;
    setBusy("check");
    try {
      setPreview(await send(`${ENDPOINT}/preview`));
      setOnlyErrors(false);
      setStep("review");
    } catch (err) {
      failed(err, "Could not check the file");
    } finally {
      setBusy("");
    }
  }

  async function runImport() {
    setBusy("import");
    try {
      const data = await send(ENDPOINT);
      setResult(data);
      setStep("done");
      if (data.imported) {
        toast.success(`${NUMBER.format(data.imported)} record${data.imported === 1 ? "" : "s"} imported`);
        onImported?.();
      }
    } catch (err) {
      failed(err, "The import failed. Nothing was saved — please try again.");
    } finally {
      setBusy("");
    }
  }

  const spinner = (
    <svg className="a-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );

  // ── Step 1: choose ────────────────────────────────────────────────────────
  const chooseBody = (
    <div className="av-import">
      <ol className="av-import-steps">
        <li>
          <div>
            <strong>Download the template</strong>
            <p className="a-text-muted a-text-sm">
              Its dropdowns list the divisions and districts in your jurisdiction. The Instructions sheet explains every column.
            </p>
          </div>
          <button type="button" className="a-btn a-btn-secondary a-btn-sm" onClick={downloadTemplate} disabled={busy === "template"}>
            {busy === "template" ? spinner : <Download size={14} />} Template (.xlsx)
          </button>
        </li>
        <li>
          <div>
            <strong>Fill one row per school</strong>
            <p className="a-text-muted a-text-sm">
              Required: {IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.label).join(", ")}.
              Optional: {IMPORT_COLUMNS.filter((c) => !c.required).map((c) => c.label).join(", ")}.
            </p>
          </div>
        </li>
        <li>
          <div>
            <strong>Upload it and check the preview</strong>
            <p className="a-text-muted a-text-sm">Nothing is saved until you confirm the import.</p>
          </div>
        </li>
      </ol>

      <label
        className={`av-dropzone${dragging ? " is-dragging" : ""}${fileError ? " is-invalid" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
      >
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }}
          disabled={working}
        />
        {file ? (
          <span className="av-dropzone-file">
            <FileSpreadsheet size={22} aria-hidden="true" />
            <span>
              <strong>{file.name}</strong>
              <span className="a-text-muted a-text-xs">{mb(file.size)}</span>
            </span>
            <button
              type="button"
              className="a-action-btn"
              onClick={(e) => { e.preventDefault(); setFile(null); }}
              aria-label="Remove file"
              disabled={working}
            >
              <X size={15} />
            </button>
          </span>
        ) : (
          <>
            <UploadCloud size={26} aria-hidden="true" />
            <strong className="av-on-pointer">Drop the Excel file here, or click to choose</strong>
            <strong className="av-on-touch">Tap to choose the Excel file</strong>
            <span className="a-text-muted a-text-xs">
              .xlsx only · up to {mb(IMPORT.maxBytes)} · up to {NUMBER.format(IMPORT.maxRows)} rows
            </span>
          </>
        )}
      </label>
      {fileError ? <p className="av-import-file-error" role="alert"><AlertTriangle size={14} /> {fileError}</p> : null}

      <div className="a-notice a-notice-info">
        <ImagePlus size={18} aria-hidden="true" />
        <div className="a-notice-body">
          <p className="a-notice-title">Photographs are added after the import</p>
          <p>A spreadsheet cannot carry photos, so imported records are saved hidden with “Photo pending”. Add 1–3 photos to each from the list to publish it.</p>
        </div>
      </div>
    </div>
  );

  // ── Step 2: review ────────────────────────────────────────────────────────
  const shown = preview ? (onlyErrors ? preview.rows.filter((r) => r.errors.length) : preview.rows) : [];
  const reviewBody = preview && (
    <div className="av-import">
      <div className="av-import-summary">
        <span className="av-import-file"><FileSpreadsheet size={16} aria-hidden="true" /> {preview.file} · sheet “{preview.sheet}”</span>
        <span className="av-import-chips">
          <Badge tone="neutral">{NUMBER.format(preview.summary.total)} rows</Badge>
          <Badge tone="ok">{NUMBER.format(preview.summary.valid)} ready</Badge>
          {preview.summary.invalid ? <Badge tone="bad">{NUMBER.format(preview.summary.invalid)} with errors</Badge> : null}
        </span>
      </div>

      {preview.summary.invalid ? (
        <div className="a-notice a-notice-warn">
          <AlertTriangle size={18} aria-hidden="true" />
          <div className="a-notice-body">
            <p className="a-notice-title">
              {preview.summary.valid
                ? `${NUMBER.format(preview.summary.invalid)} row${preview.summary.invalid === 1 ? "" : "s"} will be skipped`
                : "No row can be imported yet"}
            </p>
            <p>Fix them in the sheet and upload it again, or import the ready rows now and the rest in a later file.</p>
            <button type="button" className="a-btn a-btn-ghost a-btn-sm av-import-report" onClick={() => saveText(importErrorReport(preview.rows), reportName(preview.file))}>
              <Download size={14} /> Download error report (.csv)
            </button>
          </div>
        </div>
      ) : (
        <div className="a-notice a-notice-ok">
          <CheckCircle2 size={18} aria-hidden="true" />
          <div className="a-notice-body">
            <p className="a-notice-title">Every row is ready to import</p>
          </div>
        </div>
      )}

      {preview.summary.invalid && preview.summary.valid ? (
        <label className="a-checkbox-label">
          <input type="checkbox" className="a-checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
          Show only rows with errors
        </label>
      ) : null}
      <RowsTable rows={shown} />
    </div>
  );

  // ── Step 3: done ──────────────────────────────────────────────────────────
  const skippedRows = result ? result.rows.filter((r) => r.errors.length) : [];
  const doneBody = result && (
    <div className="av-import">
      {result.imported ? (
        <div className="a-notice a-notice-ok">
          <CheckCircle2 size={18} aria-hidden="true" />
          <div className="a-notice-body">
            <p className="a-notice-title">{NUMBER.format(result.imported)} record{result.imported === 1 ? "" : "s"} imported</p>
            <p>They are hidden from the public site until a photograph is added. Use “Add photos” on each record in the list.</p>
          </div>
        </div>
      ) : (
        <div className="a-notice a-notice-bad">
          <AlertTriangle size={18} aria-hidden="true" />
          <div className="a-notice-body">
            <p className="a-notice-title">Nothing was imported</p>
            <p>No row passed the checks — the sheet may have changed, or the schools were recorded meanwhile.</p>
          </div>
        </div>
      )}
      {skippedRows.length ? (
        <>
          <div className="av-import-summary">
            <strong>{NUMBER.format(skippedRows.length)} row{skippedRows.length === 1 ? "" : "s"} skipped</strong>
            <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => saveText(importErrorReport(result.rows), reportName(result.file))}>
              <Download size={14} /> Error report (.csv)
            </button>
          </div>
          <RowsTable rows={skippedRows} />
        </>
      ) : null}
    </div>
  );

  const footer =
    step === "choose" ? (
      <>
        <button type="button" className="a-btn a-btn-ghost" onClick={close} disabled={working}>Cancel</button>
        <button type="button" className="a-btn a-btn-primary" onClick={check} disabled={!file || working}>
          {busy === "check" ? <>{spinner} Checking…</> : "Check file"}
        </button>
      </>
    ) : step === "review" ? (
      <>
        <button type="button" className="a-btn a-btn-ghost av-import-back" onClick={reset} disabled={working}>Choose another file</button>
        <button type="button" className="a-btn a-btn-ghost" onClick={close} disabled={working}>Cancel</button>
        <button type="button" className="a-btn a-btn-primary" onClick={runImport} disabled={!preview?.summary.valid || working}>
          {busy === "import"
            ? <>{spinner} Importing…</>
            : `Import ${NUMBER.format(preview?.summary.valid ?? 0)} record${preview?.summary.valid === 1 ? "" : "s"}`}
        </button>
      </>
    ) : (
      <>
        <button type="button" className="a-btn a-btn-ghost av-import-back" onClick={reset}>Import another file</button>
        {result?.imported ? (
          <button type="button" className="a-btn a-btn-secondary" onClick={() => { reset(); onShowPending?.(); }}>
            Show photo-pending records
          </button>
        ) : null}
        <button type="button" className="a-btn a-btn-primary" onClick={close}>Done</button>
      </>
    );

  return (
    <Modal open={open} onClose={close} title="Import activities from Excel" size={step === "choose" ? "lg" : "xl"} className="av-sheet" footer={footer}>
      {step === "choose" ? chooseBody : step === "review" ? reviewBody : doneBody}
    </Modal>
  );
}
