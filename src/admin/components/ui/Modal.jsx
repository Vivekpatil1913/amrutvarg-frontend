import { useEffect } from "react";
import { X } from "lucide-react";

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

export function ConfirmModal({ open, onClose, onConfirm, title, message, subMessage, loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || "Confirm Action"}
      footer={
        <>
          <button className="a-btn a-btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="a-btn a-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </button>
        </>
      }
    >
      <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
        <div className="a-confirm-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </div>
        <p className="a-confirm-msg">{message || "Are you sure you want to delete this record?"}</p>
        {subMessage && <p className="a-confirm-sub">{subMessage}</p>}
        {!subMessage && (
          <p className="a-confirm-sub">This record will be moved to the trash and can be restored later.</p>
        )}
      </div>
    </Modal>
  );
}
