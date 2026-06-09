import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import NotificationsPanel from "../components/NotificationsPanel";
import "./AppPages.css";

export default function AppliedJobs() {
  const [jobs, setJobs] = useState([]);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const loadAppliedJobs = async () => {
      const res = await axios.get(`http://localhost:5000/api/applied/${userId}`);
      setJobs(res.data || []);
    };
    loadAppliedJobs();
  }, [userId]);

  const acceptedJobs = jobs.filter((job) => job.status === "Selected");
  const statusJobs = jobs.filter((job) => job.status !== "Selected");

  return (
    <>
      <Navbar />
      <div className="app-page">
        <div className="app-shell">
          <div className="app-hero">
            <div>
              <span className="app-eyebrow">Applied roles</span>
              <h1>Applied Jobs</h1>
              <p>Your application history with clear offer and status sections.</p>
            </div>
          </div>
          <NotificationsPanel userId={userId} />

          {acceptedJobs.length > 0 && (
            <>
              <h2>Accepted Offers</h2>
              <div className="app-grid">
                {acceptedJobs.map((job, index) => (
                  <article key={`accepted-${index}`} className="app-card">
                    <span className="app-tag green">Selected</span>
                    <h3>{job.title}</h3>
                    <p className="app-muted">{job.company}</p>
                  </article>
                ))}
              </div>
            </>
          )}

          <h2 style={{ marginTop: 30 }}>Application Status</h2>
          {statusJobs.length === 0 ? (
            <div className="app-empty">No pending or rejected applications.</div>
          ) : (
            <div className="app-grid">
              {statusJobs.map((job, index) => (
                <article key={`status-${index}`} className="app-card">
                  <span className="app-tag blue">{job.status || "Pending"}</span>
                  <h3>{job.title}</h3>
                  <p className="app-muted">{job.company}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
