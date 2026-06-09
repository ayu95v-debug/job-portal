import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

export default function NotificationsPanel({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${API}/api/notifications/${userId}`);
        setNotifications(res.data || []);
      } catch (err) {
        setError("Could not load notifications.");
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [userId]);

  const unreadNotifications = notifications.filter((notification) => notification.is_read === 0);

  const markNotificationRead = async (notificationId) => {
    try {
      await axios.put(`${API}/api/notifications/read/${notificationId}`);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: 1 } : notification
        )
      );
    } catch (err) {
      console.log("Could not mark notification read", err);
    }
  };

  const markAllRead = async () => {
    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          axios.put(`${API}/api/notifications/read/${notification.id}`)
        )
      );
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: 1 })));
    } catch (err) {
      console.log("Could not mark all notifications read", err);
    }
  };

  if (!userId) return null;

  return (
    <section className="app-notification-panel">
      <div className="app-notification-header">
        <div>
          <span className="app-eyebrow">Notifications</span>
          <h2>Latest updates</h2>
          <p className="app-muted">HR decisions and alerts appear here.</p>
        </div>
        {unreadNotifications.length > 0 && (
          <button className="app-btn secondary" type="button" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="app-empty">Loading notifications...</div>
      ) : error ? (
        <div className="app-empty">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="app-empty">No notifications yet. Check back after HR reviews your application.</div>
      ) : (
        <div className="app-grid">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`app-card ${notification.is_read ? "read" : "unread"}`}
            >
              <div className="app-card-head">
                <span className={`app-tag ${notification.is_read ? "blue" : "green"}`}>
                  {notification.is_read ? "Read" : "New"}
                </span>
                <small>{new Date(notification.created_at).toLocaleString()}</small>
              </div>
              <p>{notification.message}</p>
              {!notification.is_read && (
                <button
                  type="button"
                  className="app-btn secondary"
                  onClick={() => markNotificationRead(notification.id)}
                >
                  Mark read
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
