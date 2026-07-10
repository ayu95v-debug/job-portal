// import Navbar from "../components/Navbar";

// export default function Profile() {
//   const user = JSON.parse(localStorage.getItem("user")||"{}");

//   return (
//     <>
//       <Navbar />

//       <div style={{ padding: 30 }}>
//         <h2>👤 My Profile</h2>

//         <div style={{
//           maxWidth: 400,
//           padding: 20,
//           border: "1px solid #ddd",
//           borderRadius: 8
//         }}>
//           <p><b>Name:</b> {user?.name || "Not provided"}</p>
//           <p><b>Email:</b> {user?.email || "Not provided"}</p>
//           <p><b>Role:</b> {user?.role || "Not provided"}</p>
//         </div>
//       </div>
//     </>
//   );
// }


import { useEffect, useState } from "react";
import axios from "axios";
import API from "../api";
import Navbar from "../components/Navbar";
import "./AppPages.css";

export default function Profile() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = storedUser?.id || storedUser?.userId || localStorage.getItem("userId");

  const [profile, setProfile] = useState({
    name: storedUser?.name || "",
    email: storedUser?.email || "",
    role: storedUser?.role || "",
    linkedin: storedUser?.linkedin || "",
    qualifications: storedUser?.qualifications || "",
    about: storedUser?.about || "",
    resume_url: storedUser?.resume_url || "",
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState("");

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    axios
      .get(`${API}/api/auth/profile/${userId}`)
      .then((res) => {
        setProfile(res.data);
        localStorage.setItem("user", JSON.stringify({ ...storedUser, ...res.data }));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId || profile.role !== "candidate") return;
    fetchRecommendations();
  }, [userId, profile.role, profile.qualifications, profile.resume_url]);

  const fetchRecommendations = async () => {
    if (!userId) return;

    try {
      setRecommendLoading(true);
      const res = await axios.get(`${API}/api/auth/recommend-jobs/${userId}`);
      setRecommendations(res.data.recommendedJobs || []);
      setAnalysisText(res.data.analysis || "");
    } catch (err) {
      console.error(err);
      setRecommendations([]);
      setAnalysisText("Could not fetch recommendations right now.");
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!userId) {
      setMessage("Please log in first to save your profile.");
      return;
    }

    console.log("Saving profile", userId, profile);
    try {
      setLoading(true);
      const res = await axios.put(
        `${API}/api/auth/profile/${userId}`,
        {
          name: profile.name,
          linkedin: profile.linkedin,
          qualifications: profile.qualifications,
          about: profile.about,
        }
      );
      setMessage(res.data.msg || "Profile saved successfully");
      localStorage.setItem("user", JSON.stringify({ ...storedUser, ...profile }));
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.msg || "Could not save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!userId) {
      setMessage("Please log in first to upload your resume.");
      return;
    }
    if (!resumeFile) {
      setMessage("Please choose a resume file first.");
      return;
    }

    console.log("Uploading resume", userId, resumeFile);
    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      setLoading(true);
      const res = await axios.post(
        `${API}/api/auth/upload-resume/${userId}`,
        formData
      );
      const updatedProfile = { ...profile, resume_url: res.data.resume_url };
      setProfile(updatedProfile);
      setMessage("Resume uploaded successfully");
      localStorage.setItem(
        "user",
        JSON.stringify({ ...storedUser, ...updatedProfile })
      );
      fetchRecommendations();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.msg || "Resume upload failed");
    } finally {
      setLoading(false);
    }
  };

  const resumeLink = profile.resume_url
    ? `${API}${profile.resume_url}`
    : null;

  return (
    <>
      <Navbar />
      <div className="app-page" style={styles.page}>
        <div className="app-shell">
        <div className="app-card" style={styles.card}>
          <span className="app-eyebrow">Profile center</span>
          <h2>My Profile</h2>
          <p className="app-muted">Keep your profile, resume, and recommendations up to date.</p>
          {loading && <p style={styles.info}>Loading...</p>}
          {message && <p style={styles.info}>{message}</p>}

          <div style={styles.form}>
            <label style={styles.label}>Name</label>
            <input
              name="name"
              type="text"
              value={profile.name}
              onChange={handleChange}
              required
              className="app-input"
            />

            <label style={styles.label}>Email</label>
            <input
              name="email"
              type="email"
              value={profile.email}
              disabled
              className="app-input"
              style={{ background: "#f5f7fb" }}
            />

            <label style={styles.label}>Role</label>
            <input
              name="role"
              value={profile.role}
              disabled
              className="app-input"
              style={{ background: "#f5f7fb" }}
            />

            <label style={styles.label}>LinkedIn Profile</label>
            <input
              name="linkedin"
              type="text"
              placeholder="https://www.linkedin.com/in/your-profile"
              value={profile.linkedin || ""}
              onChange={handleChange}
              className="app-input"
            />

            <label style={styles.label}>Qualifications</label>
            <textarea
              name="qualifications"
              placeholder="Education, certifications, skills"
              value={profile.qualifications || ""}
              onChange={handleChange}
              className="app-textarea"
            />

            <label style={styles.label}>About / Profile Summary</label>
            <textarea
              name="about"
              placeholder="A short professional summary"
              value={profile.about || ""}
              onChange={handleChange}
              className="app-textarea"
            />

            <button type="button" onClick={handleSave} className="app-btn" disabled={loading}>
              Save Profile
            </button>
          </div>

          <div style={styles.resumeBox}>
            <h3>Resume</h3>
            {resumeLink ? (
              <a href={resumeLink} target="_blank" rel="noreferrer" style={styles.resumeLink}>
                View uploaded resume
              </a>
            ) : (
              <p style={styles.helpText}>No resume uploaded yet.</p>
            )}
            <div style={styles.uploadForm}>
              <input
                name="resume"
                type="file"
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setResumeFile(e.target.files[0])}
                className="app-input"
              />
              <button type="button" onClick={handleResumeUpload} className="app-btn success" disabled={loading || !resumeFile}>
                Upload Resume
              </button>
            </div>
          </div>

          <div style={styles.recommendationBox}>
            <h3>Recommended Jobs</h3>
            {recommendLoading ? (
              <p style={styles.helpText}>Analyzing your resume and matching jobs...</p>
            ) : (
              <>
                {analysisText && <p style={styles.analysisText}>{analysisText}</p>}
                {recommendations.length === 0 ? (
                  <p style={styles.helpText}>
                    Upload your resume or add more qualifications to get job recommendations.
                  </p>
                ) : (
                  <div style={styles.recommendationList}>
                    {recommendations.map((job) => (
                      <div key={job.id} className="app-card" style={styles.jobCard}>
                        <div>
                          <h4 style={styles.jobTitle}>{job.title}</h4>
                          <p style={styles.jobMeta}>{job.company}</p>
                          {job.location && <p style={styles.jobMeta}>{job.location}</p>}
                          <p style={styles.jobDescription}>{job.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const currentUser = JSON.parse(localStorage.getItem("user"));
                              if (!currentUser?.id) {
                                setMessage("Please login first to apply.");
                                return;
                              }
                              await axios.post(`${API}/api/apply`, {
                                jobId: job.id,
                                userId: currentUser.id,
                              });
                              setMessage("Application submitted successfully.");
                            } catch (applyErr) {
                              console.error(applyErr);
                              setMessage(
                                applyErr.response?.data?.error === "Already applied"
                                  ? "You already applied to this job."
                                  : "Could not apply to this job."
                              );
                            }
                          }}
                          className="app-btn success"
                        >
                          Apply Now
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    padding: "42px 20px 64px",
    display: "block",
    minHeight: "100vh",
  },
  card: {
    width: "100%",
    maxWidth: 860,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 14,
    padding: 30,
    border: "1px solid #e2e8f0",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.13)",
  },
  form: {
    display: "grid",
    gap: "16px",
    marginTop: 12,
  },
  label: {
    fontWeight: 600,
    marginBottom: 6,
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: "100px",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    outline: "none",
    resize: "vertical",
  },
  button: {
    marginTop: 8,
    padding: "12px 16px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  resumeBox: {
    marginTop: 28,
    padding: 20,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#f8fafc",
  },
  resumeLink: {
    display: "inline-block",
    marginBottom: 12,
    color: "#1d4ed8",
    textDecoration: "none",
    fontWeight: 600,
  },
  helpText: {
    marginBottom: 12,
    color: "#475569",
  },
  uploadForm: {
    display: "grid",
    gap: "12px",
  },
  fileInput: {
    padding: "8px",
  },
  uploadButton: {
    padding: "12px 16px",
    borderRadius: 10,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    cursor: "pointer",
  },
  recommendationBox: {
    marginTop: 28,
    padding: 20,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#f8fafc",
  },
  recommendationList: {
    display: "grid",
    gap: 16,
    marginTop: 12,
  },
  jobCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    padding: 18,
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    background: "#fff",
  },
  jobTitle: {
    margin: 0,
    fontSize: 18,
    color: "#1f2937",
  },
  jobMeta: {
    margin: "4px 0",
    color: "#475569",
    fontSize: 14,
  },
  jobDescription: {
    margin: "10px 0 0",
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.5,
  },
  applyButton: {
    alignSelf: "flex-start",
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  analysisText: {
    marginBottom: 12,
    color: "#0f766e",
    fontStyle: "italic",
  },
  info: {
    margin: "10px 0",
    color: "#0f766e",
  },
};
