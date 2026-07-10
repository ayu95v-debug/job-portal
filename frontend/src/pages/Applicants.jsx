import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../api";
import "./AppPages.css";

function Applicants() {
  const { jobId } = useParams();
  const [apps, setApps] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const load = () => {
    axios
         .get(`${API}/api/jobs/${jobId}/applicants`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setApps(res.data || []))
      .catch(() => alert("Failed to load applicants"));
  };

  useEffect(load, [jobId, token]);

  const update = async (appId, status) => {
    await axios.put(
      `${API}/api/applications/status`,
      { appId, status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    load();
  };

  return (
    <>
      <Navbar />
      <div className="app-page">
        <div className="app-shell">
          <div className="app-hero">
            <div>
              <span className="app-eyebrow">Hiring pipeline</span>
              <h1>Applicants</h1>
              <p>Review candidate details and update their application status.</p>
            </div>
            <button className="app-btn secondary" onClick={() => navigate("/jobs")}>Back</button>
          </div>

          {apps.length === 0 ? (
            <div className="app-empty">No applicants found for this job.</div>
          ) : (
            <div className="app-grid">
              {apps.map((a) => (
                <article key={a.appId} className="app-card">
                  <span className="app-tag blue">{a.status}</span>
                  <h3>{a.name}</h3>
                  <p className="app-muted">{a.email}</p>
                  <div className="app-actions">
                    <button className="app-btn success" onClick={() => update(a.appId, "Selected")}>Select</button>
                    <button className="app-btn danger" onClick={() => update(a.appId, "Rejected")}>Reject</button>
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

export default Applicants;
