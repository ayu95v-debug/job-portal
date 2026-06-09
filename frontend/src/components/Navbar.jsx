import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Navbar.css";

const API = "http://localhost:5000";

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) {
        setUnreadCount(0);
        return;
      }
      try {
        const res = await axios.get(`${API}/api/notifications/${user.id}`);
        const unread = (res.data || []).filter((item) => item.is_read === 0).length;
        setUnreadCount(unread);
      } catch (err) {
        setUnreadCount(0);
      }
    };

    loadNotifications();
  }, [user?.id]);

  const logout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <nav className="navbar">
      <h2 className="logo" onClick={() => navigate("/")}>
        ⚡ AI Job Matcher
      </h2>

      <div className="nav-actions">
        {user ? (
          <>
            <button
              type="button"
              className="nav-btn nav-notification-btn"
              onClick={() => navigate("/status")}
            >
              Notifications
              {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
            </button>

            <span 
              className="user-chip" 
              onClick={() => navigate("/profile")}
              style={{ cursor: "pointer" }}
            >
              👤 {user.name || user.email}
            </span>

            <button className="nav-btn" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              className="nav-btn"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
            <button
              className="nav-btn"
              onClick={() => navigate("/signup")}
            >
              Signup
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
