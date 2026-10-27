import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { api } from "../../api/client.js";

// The in-app notification bell. New grievances, SLA reminders, escalations and
// self-published vargs land here for the officers responsible.
//
// Polls every 30 seconds while the tab is visible, and immediately when the
// tab comes back into view, so an alert is never more than half a minute old
// without holding a connection open for every signed-in officer.

const POLL_MS = 30_000;

function ago(stamp) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(stamp).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/admin/notifications?limit=15");
      setItems(res.data.items);
      setUnread(res.data.unread);
    } catch {
      /* the bell is a convenience — a failed poll just keeps the last state */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function openItem(item) {
    setOpen(false);
    if (!item.read_at) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnread((u) => Math.max(0, u - 1));
      api.post(`/admin/notifications/${item.id}/read`).catch(() => {});
    }
    if (item.link) navigate(item.link);
  }

  async function readAll() {
    await api.post("/admin/notifications/read-all").catch(() => {});
    setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnread(0);
  }

  const Icon = unread ? BellRing : Bell;

  return (
    <div ref={ref} className="a-bell">
      <button
        className={`a-action-btn a-bell-btn${unread ? " has-unread" : ""}`}
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        title="Notifications"
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
      >
        <Icon size={18} />
        {unread ? <span className="a-bell-count">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {open && (
        <div className="a-bell-panel" role="dialog" aria-label="Notifications">
          <div className="a-bell-head">
            <strong>Notifications</strong>
            {unread ? (
              <button className="a-btn a-btn-ghost a-btn-sm" onClick={readAll}><CheckCheck size={14} /> Mark all read</button>
            ) : null}
          </div>
          <ul className="a-bell-list">
            {items.length ? items.map((item) => (
              <li key={item.id}>
                <button className={`a-bell-item${item.read_at ? "" : " unread"}${item.priority === "HIGH" ? " high" : ""}`} onClick={() => openItem(item)}>
                  <span className="a-bell-title">{item.title}</span>
                  {item.body ? <span className="a-bell-body">{item.body}</span> : null}
                  <span className="a-bell-time">{ago(item.created_at)}</span>
                </button>
              </li>
            )) : <li className="a-bell-empty">You're all caught up.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
