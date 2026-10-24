import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

// Admin-wide toast notifications.
//
//   const toast = useToast();
//   toast.success("Announcement created");
//   toast.error(errorMessage(err, "Could not save"));
//   toast.show("Saved", "ok");            // older call style, still supported
//
// Toasts dismiss themselves after a few seconds (errors stay a little longer so
// they can be read), pause while hovered or focused, and can be closed by hand.
// Only the newest MAX_VISIBLE are kept so a burst of actions cannot bury the page.

const ToastCtx = createContext(null);

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = { ok: 3500, info: 4000, warn: 5000, bad: 6000 };
const TONE_ALIASES = { success: "ok", error: "bad", danger: "bad", warning: "warn" };

const ICONS = {
  ok: CheckCircle,
  bad: XCircle,
  warn: AlertTriangle,
  info: Info,
};

const TITLES = { ok: "Success", bad: "Error", warn: "Warning", info: "Notice" };

let nextId = 0;

function ToastItem({ toast, onDismiss }) {
  const { id, tone, message, title, duration } = toast;
  const [paused, setPaused] = useState(false);
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused) return undefined;
    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss(id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, id, onDismiss]);

  const Icon = ICONS[tone] || Info;

  return (
    <div
      className={`a-toast a-toast-${tone}`}
      role={tone === "bad" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon size={18} className="a-toast-icon" aria-hidden="true" />
      <div className="a-toast-content">
        <p className="a-toast-title">{title || TITLES[tone]}</p>
        <p className="a-toast-msg">{message}</p>
      </div>
      <button type="button" className="a-toast-close" onClick={() => onDismiss(id)} aria-label="Dismiss notification">
        <X size={14} />
      </button>
      <span
        className="a-toast-progress"
        style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? "paused" : "running" }}
        aria-hidden="true"
      />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, tone = "ok", duration) => {
    const opts = typeof duration === "object" && duration !== null ? duration : { duration };
    const t = TONE_ALIASES[tone] || tone;
    const resolved = ICONS[t] ? t : "info";
    const id = ++nextId;
    const text = message == null || message === "" ? "Something went wrong" : String(message);
    setToasts((list) => {
      // Collapse an identical toast that is still on screen instead of stacking a copy.
      const rest = list.filter((x) => !(x.message === text && x.tone === resolved));
      return [
        ...rest,
        {
          id,
          message: text,
          tone: resolved,
          title: opts.title,
          duration: opts.duration || DEFAULT_DURATION[resolved],
        },
      ].slice(-MAX_VISIBLE);
    });
    return id;
  }, []);

  const value = useMemo(() => ({
    show,
    dismiss,
    success: (message, opts) => show(message, "ok", opts),
    error: (message, opts) => show(message, "bad", opts),
    warning: (message, opts) => show(message, "warn", opts),
    info: (message, opts) => show(message, "info", opts),
  }), [show, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="a-toast-container" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
