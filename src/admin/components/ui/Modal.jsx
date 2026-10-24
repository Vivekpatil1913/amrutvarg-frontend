import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X, Trash2, AlertTriangle, Power, Info } from "lucide-react";
import { useToast } from "./Toast.jsx";
import { errorMessage } from "../../lib/errors.js";

export function Modal({ open, onClose, title, children, footer, size = "" }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="a-modal-overlay">
      <div className="a-modal-backdrop" onClick={onClose} />
      <div className={`a-modal ${size === "lg" ? "a-modal-lg" : size === "xl" ? "a-modal-xl" : ""}`}
           role="dialog" aria-modal="true">
        <div className="a-modal-band">
          <span className="a-modal-title">{title}</span>
          <button className="a-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="a-modal-body">{children}</div>
        {footer && <div className="a-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// tone decides the icon and the confirm button colour:
//   danger  – delete / discard (red)
//   warning – deactivate / unpublish (amber)
//   primary – activate / publish (accent)
const TONES = {
  danger:  { icon: Trash2,        btn: "a-btn-danger",  confirm: "Delete",  busy: "Deleting…" },
  warning: { icon: AlertTriangle, btn: "a-btn-warning", confirm: "Confirm", busy: "Working…" },
  primary: { icon: Power,         btn: "a-btn-primary", confirm: "Confirm", busy: "Working…" },
  info:    { icon: Info,          btn: "a-btn-primary", confirm: "Confirm", busy: "Working…" },
};

const SOFT_DELETE_NOTE = "This record will be moved to the trash and can be restored later.";

export function ConfirmModal({
  open, onClose, onConfirm, title, message, subMessage, loading,
  tone = "danger", confirmLabel, loadingLabel,
}) {
  const t = TONES[tone] || TONES.danger;
  const Icon = t.icon;
  const confirmRef = useRef(null);

  // Put focus on the confirm button so Enter confirms and Esc cancels.
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  // Never let the dialog close mid-request: the outcome would go unseen.
  const close = useCallback(() => { if (!loading) onClose(); }, [loading, onClose]);

  const sub = subMessage === undefined ? (tone === "danger" ? SOFT_DELETE_NOTE : null) : subMessage;

  return (
    <Modal
      open={open}
      onClose={close}
      title={title || "Confirm Action"}
      footer={
        <>
          <button className="a-btn a-btn-ghost" onClick={close} disabled={loading}>Cancel</button>
          <button ref={confirmRef} className={`a-btn ${t.btn}`} onClick={onConfirm} disabled={loading}>
            {loading && (
              <svg className="a-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {loading ? (loadingLabel || t.busy) : (confirmLabel || t.confirm)}
          </button>
        </>
      }
    >
      <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
        <div className={`a-confirm-icon a-confirm-icon-${tone}`}>
          <Icon size={22} />
        </div>
        <p className="a-confirm-msg">{message || "Are you sure you want to delete this record?"}</p>
        {sub && <p className="a-confirm-sub">{sub}</p>}
      </div>
    </Modal>
  );
}

// ── Promise-style confirmation ──────────────────────────────────────────────
//
//   const confirm = useConfirm();
//   confirm({
//     title: "Deactivate announcement",
//     message: "Hide this announcement from the website?",
//     tone: "warning",
//     confirmLabel: "Deactivate",
//     onConfirm: async () => { await api.put(...); toast.success("Deactivated"); },
//     errorText: "Could not change the status",
//   });
//
// While onConfirm runs the dialog shows a spinner and cannot be dismissed. If it
// throws, the dialog closes and the error is shown as a toast, so callers only
// handle the success path. Resolves true when the action completed, false when
// cancelled or failed.

const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
  const toast = useToast();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    // A second request while one is open replaces it; settle the first as cancelled.
    resolver.current?.(false);
    resolver.current = resolve;
    setState(opts);
  }), []);

  const finish = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
    setBusy(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!state || busy) return;
    if (!state.onConfirm) { finish(true); return; }
    setBusy(true);
    try {
      await state.onConfirm();
      finish(true);
    } catch (err) {
      toast.error(errorMessage(err, state.errorText));
      finish(false);
    }
  }, [state, busy, finish, toast]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <ConfirmModal
        open={!!state}
        onClose={() => finish(false)}
        onConfirm={handleConfirm}
        loading={busy}
        title={state?.title}
        message={state?.message}
        subMessage={state?.subMessage}
        tone={state?.tone}
        confirmLabel={state?.confirmLabel}
        loadingLabel={state?.loadingLabel}
      />
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
