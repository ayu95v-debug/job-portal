import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import NotificationsPanel from "../components/NotificationsPanel";
import "./AppPages.css";

export default function MyStatus() {
  const [applications, setApplications] = useState([]);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const loadStatus = async () => {
      try {
        const res = await axios.get(`https://job-portal-omfp.onrender.com/api/my-applications/${userId}`);
        setApplications(res.data || []);
      } catch (err) {
        console.log(err);
      }
    };
    loadStatus();
  }, [userId]);

  return (
    <>
      <Navbar />
      <div className="app-page">
        <div className="app-shell">
          <div className="app-hero">
            <div>
              <span className="app-eyebrow">Status center</span>
              <h1>My Application Status</h1>
              <p>See where every application currently stands.</p>
            </div>
          </div>
          <NotificationsPanel userId={user?.id} />

          {applications.length === 0 ? (
            <div className="app-empty">No applications found.</div>
          ) : (
            <div className="app-grid">
              {applications.map((app, index) => (
                <article key={index} className="app-card">
                  <span className={`app-tag ${app.status === "Selected" ? "green" : "blue"}`}>
                    {app.status || "Pending"}
                  </span>
                  <h3>{app.title}</h3>
                  <p className="app-muted"><strong>Company:</strong> {app.company}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
