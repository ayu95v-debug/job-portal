import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./AppPages.css";

export default function HRHome() {
  const [applicants, setApplicants] = useState([]);
  const [jobsCount, setJobsCount] = useState(0);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get("https://job-portal-omfp.onrender.com/api/hr/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setApplicants(res.data || []);
      setJobsCount(new Set((res.data || []).map((a) => a.title)).size);
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (appId, status) => {
    await axios.put(
      "https://job-portal-omfp.onrender.com/api/applications/status",
      { appId, status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchDashboard();
  };

  return (
    <>
      <Navbar />
      <div className="app-page">
        <div className="app-shell">
          <div className="app-hero">
            <div>
              <span className="app-eyebrow">HR workspace</span>
              <h1>{user.company || "HR"} Dashboard</h1>
              <p>Quickly review your hiring activity and candidate pipeline.</p>
            </div>
            <button className="app-btn" onClick={() => navigate("/hr-dashboard")}>Open Full Dashboard</button>
          </div>

          <div className="app-grid">
            <div className="app-card">
              <span className="app-tag green">Jobs</span>
              <h2>{jobsCount}</h2>
              <p className="app-muted">Total jobs</p>
            </div>
            <div className="app-card">
              <span className="app-tag blue">Applicants</span>
              <h2>{applicants.length}</h2>
              <p className="app-muted">Total applicants</p>
            </div>
            <div className="app-card">
              <span className="app-tag">Action</span>
              <h2>Post Job</h2>
              <button className="app-btn" onClick={() => navigate("/hr-dashboard")}>Create Opening</button>
            </div>
          </div>

          <h2 style={{ marginTop: 30 }}>Applicants</h2>
          {applicants.length === 0 ? (
            <div className="app-empty">No applicants yet.</div>
          ) : (
            <div className="app-grid">
              {applicants.map((app) => (
                <article key={app.id} className="app-card">
                  <span className="app-tag blue">{app.status}</span>
                  <h3>{app.name}</h3>
                  <p className="app-muted">{app.email}</p>
                  <p className="app-muted"><strong>Job:</strong> {app.title}</p>
                  <div className="app-actions">
                    <button className="app-btn success" onClick={() => updateStatus(app.id, "Selected")}>Approve</button>
                    <button className="app-btn danger" onClick={() => updateStatus(app.id, "Rejected")}>Reject</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
