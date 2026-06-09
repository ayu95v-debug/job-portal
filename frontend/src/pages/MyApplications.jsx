import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import NotificationsPanel from "../components/NotificationsPanel";
import "./AppPages.css";

function MyApplications() {
  const [apps, setApps] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    axios
      .get(`http://localhost:5000/api/my-applications/${userId}`)
      .then((res) => setApps(res.data || []))
      .catch(() => alert("Failed to load applications"));
  }, [navigate, userId]);

  const acceptedApps = apps.filter((a) => a.status === "Selected");
  const otherApps = apps.filter((a) => a.status !== "Selected");

  return (
    <>
      <Navbar />
      <div className="app-page">
        <div className="app-shell">
          <div className="app-hero">
            <div>
              <span className="app-eyebrow">Application tracking</span>
              <h1>My Applications</h1>
              <p>Track selected, pending, and rejected applications in one clean place.</p>
            </div>
            <button className="app-btn secondary" onClick={() => navigate("/jobs")}>Browse Jobs</button>
          </div>
          <NotificationsPanel userId={userId} />

          {acceptedApps.length > 0 && (
            <>
              <h2>Accepted Offers</h2>
              <div className="app-grid">
                {acceptedApps.map((a, i) => (
                  <article key={`accepted-${i}`} className="app-card">
                    <span className="app-tag green">Selected</span>
                    <h3>{a.title}</h3>
                    <p className="app-muted">{a.company}</p>
                  </article>
                ))}
              </div>
            </>
          )}

          <h2 style={{ marginTop: 30 }}>Application Status</h2>
          {otherApps.length === 0 ? (
            <div className="app-empty">No pending or rejected applications.</div>
          ) : (
            <div className="app-grid">
              {otherApps.map((a, i) => (
                <article key={`status-${i}`} className="app-card">
                  <span className="app-tag blue">{a.status || "Pending"}</span>
                  <h3>{a.title}</h3>
                  <p className="app-muted">{a.company}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default MyApplications;
