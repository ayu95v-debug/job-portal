import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./AppPages.css";

function ViewStatus() {
  const [data, setData] = useState([]);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await axios.get(`${API}/api/my-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(res.data || []);
  };

  return (
    <>
      <Navbar />
      <div className="app-page">
        <div className="app-shell">
          <div className="app-hero">
            <div>
              <span className="app-eyebrow">Application status</span>
              <h1>Status</h1>
              <p>Review the latest state of your job applications.</p>
            </div>
            <button className="app-btn secondary" onClick={() => navigate("/jobs")}>Back to Jobs</button>
          </div>

          {data.length === 0 ? (
            <div className="app-empty">No status records found.</div>
          ) : (
            <div className="app-grid">
              {data.map((j, i) => (
                <article key={i} className="app-card">
                  <span className="app-tag blue">{j.status}</span>
                  <h3>{j.title}</h3>
                  <p className="app-muted">{j.company}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ViewStatus;
