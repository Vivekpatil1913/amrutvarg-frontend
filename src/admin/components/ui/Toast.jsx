import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, tone = "ok", duration = 3500) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="a-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`a-toast a-toast-${t.tone}`}>
            {t.tone === "ok" && <CheckCircle size={16} style={{ color: "var(--a-ok)", flexShrink: 0 }} />}
            {t.tone === "bad" && <XCircle size={16} style={{ color: "var(--a-bad)", flexShrink: 0 }} />}
            {t.tone === "info" && <Info size={16} style={{ color: "var(--a-info)", flexShrink: 0 }} />}
            <span>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--a-muted)", display: "flex", padding: "0" }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
