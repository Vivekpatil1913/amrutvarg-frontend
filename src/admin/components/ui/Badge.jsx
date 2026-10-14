export function Badge({ tone = "neutral", children }) {
  const toneMap = {
    ok: "a-badge-ok",
    warn: "a-badge-warn",
    bad: "a-badge-bad",
    danger: "a-badge-bad",
    info: "a-badge-info",
    accent: "a-badge-accent",
    neutral: "a-badge-neutral",
  };
  return <span className={`a-badge ${toneMap[tone] || "a-badge-neutral"}`}>{children}</span>;
}

export function Switch({ on, onToggle, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`a-switch-track ${on ? "on" : ""}`}
      onClick={onToggle}
      disabled={disabled}
      title={on ? "Active — click to deactivate" : "Inactive — click to activate"}
    >
      <span className="a-switch-thumb" />
    </button>
  );
}
