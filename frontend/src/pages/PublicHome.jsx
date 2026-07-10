import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API from "../api";
import Navbar from "../components/Navbar";
import "./PublicHome.css";

export default function PublicHome() {
  const [jobs, setJobs] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const fetchAllJobs = async () => {
    try {
      setJobsLoading(true);
      const response = await axios.get(`${API}/api/jobs`);
      setJobs(response.data || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setMessage("Failed to load jobs. Please check backend server.");
    } finally {
      setJobsLoading(false);
    }
  };

  const analyzeResumeFile = (file) => {
    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    const value = `${name} ${type}`;

    const sections = {
      summary:
        "Your resume is ready for review. Upload it to get matching job suggestions and personalized career guidance.",
      recommendation:
        "After login, complete your profile details and revisit the candidate dashboard to see the strongest opportunities.",
      sectors: ["Career fit", "Job matching"],
    };

    if (value.includes("data science") || value.includes("machine learning") || value.includes("ml")) {
      return {
        summary:
          "This resume appears aligned with data science, analytics, or AI roles.",
        recommendation:
          "Focus on Python, SQL, and project work to improve matches in analytics and AI careers.",
        sectors: ["Data Science", "Analytics", "AI"],
      };
    }

    if (value.includes("developer") || value.includes("engineer") || value.includes("fullstack") || value.includes("frontend") || value.includes("backend") || value.includes("react") || value.includes("node")) {
      return {
        summary: "This resume looks like a software development profile.",
        recommendation:
          "Highlight technical projects, coding skills, and problem-solving examples for best matching roles.",
        sectors: ["Software Development", "Web Development", "IT"],
      };
    }

    if (value.includes("marketing") || value.includes("seo") || value.includes("social media") || value.includes("content")) {
      return {
        summary: "This resume seems suited to marketing and communications roles.",
        recommendation:
          "Showcase campaign, content, or social media work to target digital marketing positions.",
        sectors: ["Digital Marketing", "Brand", "Communications"],
      };
    }

    if (value.includes("finance") || value.includes("accounting") || value.includes("mba") || value.includes("audit") || value.includes("analyst")) {
      return {
        summary: "This resume is likely a fit for finance or analyst roles.",
        recommendation:
          "Emphasize numeric skills, reporting experience, and business knowledge when applying to finance roles.",
        sectors: ["Finance", "Accounting", "Business Analysis"],
      };
    }

    if (value.includes("hr") || value.includes("human resources") || value.includes("recruit")) {
      return {
        summary: "This resume appears focused on HR and people operations.",
        recommendation:
          "Highlight recruitment, onboarding, or employee relations experience for HR opportunities.",
        sectors: ["HR", "Recruitment", "People Operations"],
      };
    }

    return sections;
  };

  useEffect(() => {
    fetchAllJobs();
  }, []);

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setMessage("Please select your resume first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem("pendingResumeDataUrl", reader.result);
      sessionStorage.setItem("pendingResumeFileName", resumeFile.name);
      sessionStorage.setItem("pendingResumeFileType", resumeFile.type || "application/octet-stream");

      if (user?.id) {
        uploadResume(user.id);
        return;
      }

      setMessage("Resume ready. Redirecting to login...");
      setTimeout(() => {
        navigate("/login", { state: { pendingResume: true } });
      }, 650);
    };
    reader.readAsDataURL(resumeFile);
  };

  const uploadResume = async (userId) => {
    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      setLoading(true);
      const res = await axios.post(
        `${API}/api/auth/upload-resume/${userId}`,
        formData
      );
      setMessage("Resume uploaded successfully.");
      setResumeFile(null);

      const updatedUser = { ...user, resume_url: res.data.resume_url };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setTimeout(() => {
        navigate("/home");
      }, 800);
    } catch (err) {
      console.error("Upload error:", err);
      setMessage("Resume upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const shortJobs = jobs.slice(0, 6);

  return (
    <>
      <Navbar />
      <main className="public-home">
        <section className="public-hero">
          <div className="hero-copy">
            <span className="eyebrow">AI job matching for candidates</span>
            <h1>Find jobs that actually fit your resume.</h1>
            <p>
              Browse open roles, upload your resume, and get redirected to login.
              After login, your resume is saved to your candidate profile.
            </p>

            <div className="hero-actions">
              <button className="primary-btn" onClick={() => document.getElementById("resume-upload")?.click()}>
                Upload Resume
              </button>
              <button className="secondary-btn" onClick={() => navigate("/jobs")}>
                Explore Jobs
              </button>
            </div>

            <div className="hero-stats">
              <div>
                <strong>{jobs.length || "0"}</strong>
                <span>active jobs</span>
              </div>
              <div>
                <strong>Fast</strong>
                <span>resume handoff</span>
              </div>
              <div>
                <strong>Smart</strong>
                <span>matching flow</span>
              </div>
            </div>
          </div>

          <aside className="resume-panel">
            <div className="panel-topline">
              <span>Resume Matcher</span>
              <b>Step 1</b>
            </div>

            <h2>Upload your resume</h2>
            <p className="panel-subtitle">PDF, DOC, and DOCX files are supported.</p>

            {message && (
              <div className={`status-message ${message.includes("success") || message.includes("ready") ? "success" : "error"}`}>
                {message}
              </div>
            )}

            <label className={`upload-dropzone ${resumeFile ? "has-file" : ""}`} htmlFor="resume-upload">
              <input
                id="resume-upload"
                type="file"
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  setResumeFile(selected);
                  if (selected) {
                    setResumeAnalysis(analyzeResumeFile(selected));
                  } else {
                    setResumeAnalysis(null);
                  }
                  setMessage("");
                }}
              />
              <span className="upload-icon">+</span>
              {resumeFile ? (
                <div>
                  <strong>{resumeFile.name}</strong>
                  <small>{(resumeFile.size / 1024).toFixed(1)} KB selected</small>
                </div>
              ) : (
                <div>
                  <strong>Choose resume file</strong>
                  <small>Click here to attach your latest resume</small>
                </div>
              )}
            </label>

            <button
              className="match-btn"
              onClick={handleResumeUpload}
              disabled={loading || !resumeFile}
            >
              {loading ? "Processing..." : "Find Matching Jobs"}
            </button>

            {resumeAnalysis && (
              <div className="resume-analysis">
                <div className="analysis-title">Resume analysis</div>
                <p>{resumeAnalysis.summary}</p>
                <div className="analysis-tags">
                  {resumeAnalysis.sectors.map((sector) => (
                    <span key={sector}>{sector}</span>
                  ))}
                </div>
                <p className="analysis-recommendation">
                  {resumeAnalysis.recommendation}
                </p>
              </div>
            )}

            <p className="privacy-note">Your resume will be added to profile after login.</p>
          </aside>
        </section>

        <section className="jobs-preview">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Open opportunities</span>
              <h2>Latest jobs</h2>
            </div>
            <button className="ghost-btn" onClick={() => navigate("/jobs")}>View all</button>
          </div>

          {jobsLoading ? (
            <div className="jobs-state">Loading jobs...</div>
          ) : shortJobs.length === 0 ? (
            <div className="jobs-state">No jobs available right now.</div>
          ) : (
            <div className="job-card-grid">
              {shortJobs.map((job) => (
                <article key={job.id} className="public-job-card">
                  <div className="job-card-head">
                    <span className="job-type">{job.type || "Full-time"}</span>
                    {job.location && <span className="job-location">{job.location}</span>}
                  </div>
                  <h3>{job.title}</h3>
                  <p className="company-name">{job.company}</p>
                  <p className="job-summary">
                    {(job.description || "Role details will be shared by the employer.").slice(0, 140)}
                    {(job.description || "").length > 140 ? "..." : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {!user && (
          <section className="signup-choice">
            <div className="signup-card candidate">
              <span className="signup-label">For candidates</span>
              <h2>Create candidate account</h2>
              <p>Upload resume, get recommended jobs, and track applications from one profile.</p>
              <button className="primary-btn" onClick={() => navigate("/signup?role=candidate")}>
                Candidate Signup
              </button>
            </div>

            <div className="signup-card hr">
              <span className="signup-label">For HR</span>
              <h2>Hire better talent</h2>
              <p>Post jobs, view applicants, manage status, and open your HR dashboard after login.</p>
              <button className="primary-btn" onClick={() => navigate("/signup?role=employer")}>
                HR Signup
              </button>
            </div>
          </section>
        )}

        {!user && (
          <section className="login-strip">
            <div>
              <h2>Already registered?</h2>
              <p>Candidate and HR both can login from here.</p>
            </div>
            <button className="primary-btn" onClick={() => navigate("/login")}>Login Now</button>
          </section>
        )}
      </main>
    </>
  );
}
