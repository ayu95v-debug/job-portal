import { useEffect, useState } from "react";
import axios from "axios";
import API from "../api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./AppPages.css";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoreMap, setScoreMap] = useState({});
  const [matchedSkillsMap, setMatchedSkillsMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "candidate") {
      navigate("/login");
      return;
    }
    fetchJobs();
    fetchRecommendations(user.id);
  }, [navigate]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/jobs`);
      setJobs(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (userId) => {
    try {
      const res = await axios.get(`${API}/api/auth/recommend-jobs/${userId}`);
      const recommendations = res.data?.recommendedJobs || [];
      const scores = {};
      const skills = {};
      recommendations.forEach((job) => {
        scores[job.id] = job.score || 0;
        skills[job.id] = job.matchedSkills || [];
      });
      setScoreMap(scores);
      setMatchedSkillsMap(skills);
    } catch (err) {
      console.log("Recommendation fetch failed:", err);
      setScoreMap({});
      setMatchedSkillsMap({});
    }
  };

  const applyJob = async (jobId) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) {
        alert("Please login first");
        navigate("/login");
        return;
      }

      const res = await axios.post(`${API}/api/apply`, {
        jobId,
        userId: user.id,
      });

      alert(res.data.message || "Applied successfully");
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not apply");
    }
  };

  return (
    <>
      <Navbar />
      <div className="app-page">
        <div className="app-shell">
          <div className="app-hero">
            <div>
              <span className="app-eyebrow">Candidate jobs</span>
              <h1>Available Jobs</h1>
              <p>Browse active openings and apply to roles that match your profile.</p>
            </div>
            <button className="app-btn secondary" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
          </div>

          {loading ? (
            <div className="app-empty">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="app-empty">No jobs available right now.</div>
          ) : (
            <div className="app-grid">
              {jobs.map((job) => (
                <article key={job.id} className="app-card">
                  <span className="app-tag green">{job.type || "Full-time"}</span>
                  <h2>{job.title}</h2>
                  <p className="app-muted"><strong>{job.company}</strong></p>
                  <div className="app-tag-row">
                    {job.location && <span className="app-tag">{job.location}</span>}
                    {job.experience && <span className="app-tag blue">{job.experience}</span>}
                  </div>
                  <p className="app-muted">
                    {(job.description || "").slice(0, 150)}
                    {(job.description || "").length > 150 ? "..." : ""}
                  </p>
                  <div className="app-score-row">
                    <span className="app-score">Match: {Math.min(Math.round(((scoreMap[job.id] || 0) / 20) * 100), 100)}%</span>
                    <button
                      className="app-btn secondary"
                      onClick={() =>
                        navigate("/career-guidance", {
                          state: {
                            job: { ...job, matchedSkills: matchedSkillsMap[job.id] || [] },
                            matchPercentage: Math.min(Math.round(((scoreMap[job.id] || 0) / 20) * 100), 100),
                          },
                        })
                      }
                    >
                      Guidance
                    </button>
                  </div>
                  <button className="app-btn success" onClick={() => applyJob(job.id)}>
                    Apply Now
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
