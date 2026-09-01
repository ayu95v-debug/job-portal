import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../api";
import "./Dashboard.css";

export default function Home() {
  const [recommendations, setRecommendations] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(true);

  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);

  const fetchRecommendations = useCallback(async () => {
    if (!user?.id) return;
    try {
      setRecommendLoading(true);
      console.log("Fetching recommendations for user:", user.id);
      const response = await axios.get(`${API}/api/auth/recommend-jobs/${user.id}`);
      console.log("Recommendations response:", response.data);

      if (!response.data) {
        throw new Error("Empty response from server");
      }

      setRecommendations(response.data.recommendedJobs || []);
      setAnalysisText(response.data.analysis || "No analysis available.");
    } catch (err) {
      console.error("Recommendation error:", err);
      console.error("Error details:", err.response?.data || err.message);

      try {
        const fallbackRes = await axios.get(`${API}/api/jobs`);
        setRecommendations(fallbackRes.data || []);
        setAnalysisText("Showing all available jobs. Update your profile for personalized recommendations.");
      } catch (fallbackErr) {
        setRecommendations([]);
        setAnalysisText(`❌ Error: ${err.response?.data?.msg || err.message || "Cannot connect to server. Make sure backend is running."}`);
      }
    } finally {
      setRecommendLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.role !== "candidate") {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.id) {
      fetchRecommendations();
      if (user?.resume_url) {
        setShowUploadForm(false);
      }
    }
  }, [fetchRecommendations, user?.id, user?.resume_url]);

  const handleResumeUpload = async () => {
    if (!user?.id) {
      setMessage("Please log in first.");
      return;
    }
    if (!resumeFile) {
      setMessage("Please select a resume file.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      setLoading(true);
      const res = await axios.post(
        `${API}/api/auth/upload-resume/${user.id}`,
        formData
      );
      setMessage("✅ Resume uploaded successfully!");
      setResumeFile(null);
      const updatedUser = { ...user, resume_url: res.data.resume_url };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setShowUploadForm(false);
      setTimeout(() => fetchRecommendations(), 500);
    } catch (err) {
      console.error(err);
      setMessage(`❌ ${err.response?.data?.msg || "Resume upload failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="candidate-dashboard" style={styles.container}>
        {/* HERO SECTION */}
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>🚀 Find Your Perfect Job</h1>
          <p style={styles.heroText}>Upload your resume and let AI match you with the best opportunities</p>
        </div>

        {showUploadForm && (
        <div style={styles.uploadSection}>
          <div className="dashboard-panel" style={styles.uploadCard}>
            <div style={styles.uploadHeader}>
              <h2 style={styles.uploadTitle}>📄 Upload Your Resume</h2>
              <p style={styles.uploadDesc}>Get instant AI-powered job recommendations tailored to your profile</p>
            </div>

            {message && (
              <div style={{
                ...styles.message,
                background: message.includes("✅") ? "#dcfce7" : "#fee2e2",
                color: message.includes("✅") ? "#166534" : "#991b1b"
              }}>
                {message}
              </div>
            )}

            <div style={styles.uploadBoxContainer}>
              <div style={styles.uploadBox}>
                <div style={styles.uploadIcon}>📎</div>
                
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    setResumeFile(e.target.files[0]);
                    setMessage("");
                  }}
                  style={styles.fileInput}
                />

                {resumeFile ? (
                  <div style={styles.fileSelected}>
                    <p style={styles.fileName}>✓ {resumeFile.name}</p>
                    <p style={styles.fileSize}>Size: {(resumeFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div style={styles.uploadPlaceholder}>
                    <p>Click to select or drag and drop your resume</p>
                    <p style={styles.supportedFormats}>(PDF, max 5 MB)</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleResumeUpload}
              disabled={loading || !resumeFile}
              style={{
                ...styles.uploadButton,
                opacity: loading || !resumeFile ? 0.6 : 1,
                cursor: loading || !resumeFile ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "⏳ Uploading..." : "🚀 Upload & Get Recommendations"}
            </button>
            
           <button
           onClick={() => navigate("/jobs")}
           style={{
           ...styles.uploadButton,
           marginTop: "15px",
           background: "#2563eb",
           }}
>
  🔍 Get All Jobs
</button>

            <p style={styles.tipText}>💡 Tip: Include your skills, experience, and qualifications for better matches</p>
          </div>
        </div>
        )}

        {!showUploadForm && (
          <div style={styles.recommendSection}>
            <div style={styles.recommendHeader}>
              <h2 style={styles.recommendTitle}>✨ Jobs Recommended For You</h2>
              {analysisText && <p style={styles.analysisText}>{analysisText}</p>}
            </div>

            {recommendLoading ? (
              <div style={styles.loadingContainer}>
                <p style={styles.loadingText}>🔍 Analyzing your resume and finding matches...</p>
                <div style={styles.loadingBar}></div>
              </div>
            ) : recommendations.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.noJobs}>No matching jobs found yet.</p>
                <p style={styles.helpTip}>💡 Tip: Complete your profile with skills and qualifications for better recommendations.</p>
                <button
                  onClick={() => navigate("/profile")}
                  style={styles.completeProfileBtn}
                >
                  Complete Your Profile
                </button>
              </div>
            ) : (
              <div style={styles.jobsGrid}>
                {recommendations.map((job) => {
                  const matchPercentage = job.matchPercentage ?? 0;
                  const matchColor = matchPercentage >= 80 ? "#10b981" : matchPercentage >= 60 ? "#f59e0b" : "#ef4444";
                  
                  return (
                    <div key={job.id} className="dashboard-card" style={styles.jobCard}>
                      <div style={styles.matchBadge}>
                        <button
                          type="button"
                          title="Open guidance for this match"
                          onClick={() => navigate("/career-guidance", { state: { job, matchPercentage } })}
                          style={{ ...styles.matchScore, ...styles.matchBadgeBtn, color: matchColor }}
                        >
                          {matchPercentage}%
                        </button>
                      </div>
                      
                      <div style={styles.jobContent}>
                        <h3 style={styles.jobTitle}>{job.title}</h3>
                        <p style={styles.jobCompany}>🏢 {job.company}</p>
                        {job.location && <p style={styles.jobMeta}>📍 {job.location}</p>}
                        {job.type && <p style={styles.jobMeta}>⏰ {job.type}</p>}
                        
                        {/* Matched Skills */}
                        {job.matchedSkills && job.matchedSkills.length > 0 && (
                          <div style={styles.skillsContainer}>
                            <p style={styles.skillsLabel}>✓ Your Skills:</p>
                            <div style={styles.skillsBadges}>
                              {job.matchedSkills.map((match, idx) => (
                                <span key={idx} style={styles.skillBadge}>
                                  {match.skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <p style={styles.jobDesc}>{job.description || "Job description will be shared by the employer."}</p>
                        <p style={styles.guidanceHint}>Click the score above for course guidance to improve your match.</p>
                      </div>
                      
                      <button
                        onClick={async () => {
                          try {
                            await axios.post(`${API}/api/apply`, {
                              jobId: job.id,
                              userId: user.id,
                            });
                            setMessage("✅ Application submitted!");
                          } catch (err) {
                            setMessage(
                              err.response?.data?.error === "Already applied"
                                ? "⚠️ Already applied to this job"
                                : "❌ Error applying"
                            );
                          }
                        }}
                        style={styles.applyBtn}
                      >
                        Apply Now
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={styles.actions}>
              <button
                onClick={() => setShowUploadForm(true)}
                style={styles.changeResumeBtn}
              >
                📄 Upload Different Resume
              </button>
              <button
                onClick={() => navigate("/jobs")}
                style={styles.exploreBtn}
              >
                🔎 Explore All Jobs
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 8% 8%, rgba(20, 184, 166, 0.16), transparent 30%), radial-gradient(circle at 90% 0%, rgba(99, 102, 241, 0.14), transparent 28%), #f6f8fb",
    paddingBottom: 60,
  },
  hero: {
    background: "transparent",
    color: "#0f172a",
    padding: "64px 20px 76px",
    textAlign: "center",
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: 900,
    margin: "0 0 16px",
    letterSpacing: 0,
  },
  heroText: {
    fontSize: 18,
    color: "#475569",
    margin: 0,
  },
  uploadSection: {
    maxWidth: 800,
    margin: "-40px auto 40px",
    padding: "0 20px",
  },
  uploadCard: {
    background: "white",
    borderRadius: 14,
    padding: 40,
    border: "1px solid #e2e8f0",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.13)",
  },
  uploadHeader: {
    marginBottom: 24,
  },
  uploadTitle: {
    fontSize: 28,
    color: "#1f2937",
    marginBottom: 8,
    margin: "0 0 8px",
  },
  uploadDesc: {
    color: "#6b7280",
    marginBottom: 24,
    fontSize: 16,
    margin: "0 0 24px",
  },
  message: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    textAlign: "center",
    fontWeight: 500,
  },
  uploadBoxContainer: {
    marginBottom: 20,
  },
  uploadBox: {
    border: "2px dashed #cbd5e1",
    borderRadius: 12,
    padding: 32,
    textAlign: "center",
    background: "#f8fafc",
    transition: "0.3s",
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  fileInput: {
    fontSize: 14,
    cursor: "pointer",
    display: "block",
    margin: "0 auto 16px",
  },
  fileSelected: {
    background: "#dcfce7",
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  fileName: {
    color: "#166534",
    margin: 0,
    fontWeight: 600,
    fontSize: 15,
  },
  fileSize: {
    color: "#16a34a",
    margin: "4px 0 0",
    fontSize: 13,
  },
  uploadPlaceholder: {
    color: "#6b7280",
  },
  supportedFormats: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 8,
  },
  tipText: {
    color: "#f59e0b",
    fontSize: 14,
    marginTop: 16,
    fontWeight: 500,
    textAlign: "center",
  },
  uploadButton: {
    display: "block",
    margin: "20px auto 0",
    padding: "16px 40px",
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    transition: "0.3s",
    width: "100%",
    maxWidth: 400,
  },
  recommendSection: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 20px",
  },
  recommendHeader: {
    textAlign: "center",
    marginBottom: 32,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 28,
    boxShadow: "0 14px 38px rgba(15, 23, 42, 0.08)",
  },
  recommendTitle: {
    fontSize: 32,
    color: "#1f2937",
    margin: "0 0 12px",
  },
  analysisText: {
    color: "#0f766e",
    fontSize: 16,
    fontStyle: "italic",
    margin: 0,
  },
  loadingContainer: {
    textAlign: "center",
    padding: "40px 20px",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 18,
    marginBottom: 20,
  },
  loadingBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    background: "linear-gradient(90deg, #667eea, #764ba2, #667eea)",
    backgroundSize: "200% 100%",
    animation: "loading 1.5s infinite",
  },
  noJobs: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 18,
    padding: "40px 20px",
    background: "white",
    borderRadius: 12,
  },
  emptyState: {
    textAlign: "center",
    background: "white",
    borderRadius: 12,
    padding: "40px 20px",
  },
  helpTip: {
    color: "#f59e0b",
    fontSize: 16,
    margin: "16px 0",
    fontWeight: 600,
  },
  completeProfileBtn: {
    marginTop: 16,
    padding: "12px 24px",
    background: "#667eea",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  jobsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: 24,
    marginBottom: 40,
  },
  jobCard: {
    background: "white",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 12px 34px rgba(15, 23, 42, 0.07)",
    display: "flex",
    flexDirection: "column",
    transition: "0.3s ease",
    position: "relative",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  matchBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    background: "white",
    borderRadius: "50%",
    width: 50,
    height: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    border: "3px solid #ccfbf1",
  },
  matchBadgeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  matchScore: {
    fontSize: 18,
    fontWeight: "bold",
  },
  guidanceHint: {
    marginTop: 12,
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  jobContent: {
    flex: 1,
    marginBottom: 16,
    paddingRight: 50,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1f2937",
    margin: "0 0 8px",
  },
  jobCompany: {
    color: "#667eea",
    fontWeight: 600,
    margin: "4px 0",
  },
  jobMeta: {
    color: "#6b7280",
    fontSize: 14,
    margin: "4px 0",
  },
  skillsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #e5e7eb",
  },
  skillsLabel: {
    color: "#10b981",
    fontSize: 13,
    fontWeight: 600,
    margin: "0 0 8px",
  },
  skillsBadges: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  skillBadge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1e40af",
    padding: "4px 10px",
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 500,
  },
  jobDesc: {
    color: "#4b5563",
    lineHeight: 1.6,
    marginTop: 12,
    fontSize: 14,
  },
  applyBtn: {
    width: "100%",
    padding: "12px 16px",
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    transition: "0.3s",
  },
  actions: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  changeResumeBtn: {
    padding: "12px 24px",
    background: "white",
    color: "#111827",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.3s",
  },
  exploreBtn: {
    padding: "12px 24px",
    background: "#0f766e",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.3s",
  },
};
