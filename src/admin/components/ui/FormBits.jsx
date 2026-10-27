// The panel and field wrappers the admin forms use, for the screens added with
// the operations modules. Same markup as the ones local to AnnouncementForm.

export function Section({ title, desc, children }) {
  return (
    <section className="a-card a-panel">
      <header className="a-panel-head">
        <h2 className="a-panel-title">{title}</h2>
        {desc && <p className="a-panel-desc">{desc}</p>}
      </header>
      <div className="a-panel-body">{children}</div>
    </section>
  );
}

// Shows its error once `show` is true (touched or a save attempted).
export function Field({ label, required, error, show = true, hint, children }) {
  const visible = show ? error : null;
  return (
    <div className={`a-field ${visible ? "has-error" : ""}`}>
      <label className={`a-label ${required ? "a-label-required" : ""}`}>{label}</label>
      {children}
      {visible
        ? <span className="a-field-error">{visible}</span>
        : hint ? <span className="a-field-help">{hint}</span> : null}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="a-spinner">
      <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Loading…
    </div>
  );
}

// API validation details as { field: message }.
export const fieldErrors = (err) =>
  Object.fromEntries((err?.details || []).filter((d) => d.field).map((d) => [d.field, d.message]));
