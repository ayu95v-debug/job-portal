import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./Dashboard.css";

const API = "http://localhost:5000";
const STATUS_COLORS = {
  Selected: "#0f766e",
  Rejected: "#dc2626",
  Pending: "#d97706",
};

const emptyJobForm = {
  title: "",
  company: "",
  description: "",
  location: "",
  type: "",
  experience: "",
};

function getStatus(applicant) {
  return applicant.status || "Pending";
}

function getResumeUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API}${url}`;
}

function escapeCsv(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

export default function HRDashboard() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const hrId = storedUser?.id;
  const role = (storedUser?.role || "").toLowerCase();

  const [active, setActive] = useState("dashboard");
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [processingIds, setProcessingIds] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [resumePreview, setResumePreview] = useState(null);
  const [showPostJob, setShowPostJob] = useState(false);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!hrId) return;

    setLoading(true);
    setError("");
    try {
      const [jobsRes, appRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/api/hr/jobs/${hrId}`),
        axios.get(`${API}/api/hr/applicants/${hrId}`),
        axios.get(`${API}/api/hr/analytics/${hrId}`),
      ]);

      setJobs(jobsRes.data || []);
      setApplicants(appRes.data || []);
      setAnalytics(analyticsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Dashboard data load nahi ho paya.");
    } finally {
      setLoading(false);
    }
  }, [hrId]);

  useEffect(() => {
    if (!storedUser || !["employer", "hr"].includes(role)) {
      navigate("/login", { replace: true });
      return;
    }

    loadData();
  }, [storedUser, role, navigate, loadData]);

  const statusCounts = useMemo(() => {
    return applicants.reduce(
      (acc, applicant) => {
        const status = getStatus(applicant);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { Pending: 0, Selected: 0, Rejected: 0 }
    );
  }, [applicants]);

  const chartData = useMemo(() => {
    const fallback = jobs.map((job) => ({
      name: job.title || "Untitled",
      applications: 0,
    }));

    return analytics.length
      ? analytics.map((row) => ({
          name: row.title || "Untitled",
          applications: row.total_applications || 0,
        }))
      : fallback;
  }, [analytics, jobs]);

  const pieData = useMemo(
    () =>
      Object.entries(statusCounts)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value })),
    [statusCounts]
  );

  const topJob = useMemo(() => {
    return [...chartData].sort((a, b) => b.applications - a.applications)[0];
  }, [chartData]);

  const recruiterInsights = useMemo(() => {
    const openJobs = jobs.length;
    const totalApplicants = applicants.length;
    const pending = statusCounts.Pending || 0;
    const selected = statusCounts.Selected || 0;
    const rejected = statusCounts.Rejected || 0;
    const avgApplicants = openJobs ? (totalApplicants / openJobs).toFixed(1) : "0.0";
    const decisionRate = totalApplicants
      ? Math.round(((selected + rejected) / totalApplicants) * 100)
      : 0;

    return [
      { label: "Avg per role", value: avgApplicants },
      { label: "Decision rate", value: `${decisionRate}%` },
      { label: "Pending review", value: pending },
      { label: "Top role", value: topJob?.name || "No role yet" },
    ];
  }, [applicants.length, jobs.length, statusCounts.Pending, statusCounts.Rejected, statusCounts.Selected, topJob]);

  const filteredApplicants = useMemo(() => {
    const search = query.trim().toLowerCase();

    return applicants.filter((applicant) => {
      const status = getStatus(applicant);
      const matchesStatus = statusFilter === "All" || status === statusFilter;
      const matchesJob = jobFilter === "All" || applicant.title === jobFilter;
      const matchesSearch =
        !search ||
        [applicant.name, applicant.email, applicant.title, applicant.qualifications]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(search));

      return matchesStatus && matchesJob && matchesSearch;
    });
  }, [applicants, jobFilter, query, statusFilter]);

  const isProcessing = (id) => processingIds.includes(id);

  const updateStatus = async (id, status) => {
    setProcessingIds((prev) => [...prev, id]);
    try {
      await axios.put(`${API}/api/applications/status`, { appId: id, status });
      setApplicants((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch (err) {
      alert(`Status update failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessingIds((prev) => prev.filter((pid) => pid !== id));
    }
  };

  const rejectApplication = async (id) => {
    setProcessingIds((prev) => [...prev, id]);
    try {
      await axios.put(`${API}/api/applications/status`, { appId: id, status: "Rejected" });
      setApplicants((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Rejected" } : item)));
    } catch (err) {
      alert(`Reject failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessingIds((prev) => prev.filter((pid) => pid !== id));
    }
  };

  const postJob = async (event) => {
    event.preventDefault();

    if (!jobForm.title || !jobForm.company || !jobForm.description) {
      setError("Title, company aur description required hai.");
      return;
    }

    try {
      await axios.post(`${API}/api/hr/create-job`, {
        ...jobForm,
        created_by: hrId,
      });
      setJobForm(emptyJobForm);
      setShowPostJob(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Job post nahi ho paya.");
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm("Delete this job?")) return;

    try {
      await axios.delete(`${API}/api/hr/delete-job/${jobId}`, { data: { hrId } });
      await loadData();
    } catch (err) {
      alert(`Delete failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const exportApplicants = () => {
    const rows = [
      ["Name", "Email", "Job", "Status", "Qualifications"],
      ...filteredApplicants.map((item) => [
        item.name,
        item.email,
        item.title,
        getStatus(item),
        item.qualifications,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hr-applicants.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      alert("Email copied");
    } catch {
      alert(email);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const navItems = [
    ["dashboard", "Overview"],
    ["jobs", "Jobs"],
    ["applicants", "Applicants"],
    ["profile", "Profile"],
  ];

  return (
    <div className="hr-dashboard-v2">
      <aside className="hr-sidebar">
        <div>
          <p className="hr-kicker">Recruiter Workspace</p>
          <h2>HR Dashboard</h2>
          <p className="hr-sidebar-copy">{storedUser?.email}</p>
        </div>

        <nav className="hr-nav">
          {navItems.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={active === key ? "active" : ""}
              onClick={() => setActive(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="hr-sidebar-actions">
          <button type="button" className="hr-primary-btn" onClick={() => setShowPostJob(true)}>
            Post Job
          </button>
          <button type="button" className="hr-ghost-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="hr-main">
        <header className="hr-topbar">
          <div>
            <p className="hr-kicker">Hiring Command Center</p>
            <h1>{active === "dashboard" ? "Overview" : active[0].toUpperCase() + active.slice(1)}</h1>
          </div>
          <div className="hr-insight-strip" aria-label="Recruiter insights">
            {recruiterInsights.map((item) => (
              <span key={item.label}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </span>
            ))}
          </div>
          <div className="hr-topbar-actions">
            <button type="button" className="hr-ghost-btn light" onClick={loadData}>
              Refresh
            </button>
            <button type="button" className="hr-primary-btn" onClick={() => setShowPostJob(true)}>
              New Job
            </button>
          </div>
        </header>

        {error && <div className="hr-alert">{error}</div>}
        {loading && <div className="hr-alert muted">Loading dashboard...</div>}

        {active === "dashboard" && (
          <>
            <section className="hr-metrics">
              <button type="button" className="hr-stat-card" onClick={() => setActive("jobs")}>
                <span>Total Jobs</span>
                <strong>{jobs.length}</strong>
                <small>{topJob?.name ? `Top: ${topJob.name}` : "Start by posting a job"}</small>
              </button>
              <button type="button" className="hr-stat-card" onClick={() => setActive("applicants")}>
                <span>Total Applicants</span>
                <strong>{applicants.length}</strong>
                <small>{filteredApplicants.length} visible with current filters</small>
              </button>
              <div className="hr-stat-card">
                <span>Selected</span>
                <strong>{statusCounts.Selected || 0}</strong>
                <small>{statusCounts.Pending || 0} pending decisions</small>
              </div>
              <div className="hr-stat-card">
                <span>Conversion</span>
                <strong>{applicants.length ? Math.round(((statusCounts.Selected || 0) / applicants.length) * 100) : 0}%</strong>
                <small>Selected from all applicants</small>
              </div>
            </section>

            <section className="hr-dashboard-grid">
              <div className="hr-panel wide">
                <div className="hr-panel-head">
                  <div>
                    <h2>Applications By Job</h2>
                    <p>See which roles are getting traction.</p>
                  </div>
                </div>
                <div className="hr-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="applications" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="hr-panel">
                <div className="hr-panel-head">
                  <div>
                    <h2>Pipeline</h2>
                    <p>Status split for your candidates.</p>
                  </div>
                </div>
                <div className="hr-chart compact">
                  {pieData.length ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92}>
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#64748b"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="hr-empty">No applicants yet.</div>
                  )}
                </div>
                <div className="hr-pipeline-list">
                  {["Pending", "Selected", "Rejected"].map((status) => (
                    <span key={status}>
                      <i style={{ background: STATUS_COLORS[status] }} />
                      {status}: {statusCounts[status] || 0}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <h2>Recent Applicants</h2>
                  <p>Latest people waiting for action.</p>
                </div>
                <button type="button" className="hr-ghost-btn light" onClick={() => setActive("applicants")}>
                  View All
                </button>
              </div>
              <ApplicantTable
                applicants={applicants.slice(0, 5)}
                isProcessing={isProcessing}
                onSelect={(item) => updateStatus(item.id, "Selected")}
                onReject={(item) => rejectApplication(item.id)}
                onDetails={setSelectedApplicant}
                onCopyEmail={copyEmail}
                onResumePreview={setResumePreview}
              />
            </section>
          </>
        )}

        {active === "jobs" && (
          <section className="hr-panel">
            <div className="hr-panel-head">
              <div>
                <h2>Your Jobs</h2>
                <p>Manage open roles and quickly post new ones.</p>
              </div>
              <button type="button" className="hr-primary-btn" onClick={() => setShowPostJob(true)}>
                Post Job
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="hr-empty">No jobs posted yet.</div>
            ) : (
              <div className="hr-job-grid">
                {jobs.map((job) => (
                  <article key={job.id} className="hr-job-card">
                    <div className="hr-job-card-head">
                      <div>
                        <h3>{job.title}</h3>
                        <p>{job.company}</p>
                      </div>
                      <span>{analytics.find((item) => item.title === job.title)?.total_applications || 0} apps</span>
                    </div>
                    <p className="hr-job-desc">{job.description}</p>
                    <div className="hr-tags">
                      {job.location && <span>{job.location}</span>}
                      {job.type && <span>{job.type}</span>}
                      {job.experience && <span>{job.experience}</span>}
                    </div>
                    <div className="hr-card-actions">
                      <button type="button" className="hr-ghost-btn light" onClick={() => setActive("applicants")}>
                        View Applicants
                      </button>
                      <button type="button" className="hr-danger-btn" onClick={() => deleteJob(job.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {active === "applicants" && (
          <section className="hr-panel">
            <div className="hr-panel-head">
              <div>
                <h2>Applicants</h2>
                <p>Search, filter, shortlist, reject and export candidates.</p>
              </div>
              <button type="button" className="hr-ghost-btn light" onClick={exportApplicants}>
                Export CSV
              </button>
            </div>

            <div className="hr-filters">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email, job or skills"
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>All</option>
                <option>Pending</option>
                <option>Selected</option>
                <option>Rejected</option>
              </select>
              <select value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                <option>All</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.title}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>

            <ApplicantTable
              applicants={filteredApplicants}
              isProcessing={isProcessing}
              onSelect={(item) => updateStatus(item.id, "Selected")}
              onReject={(item) => rejectApplication(item.id)}
              onDetails={setSelectedApplicant}
              onCopyEmail={copyEmail}
              onResumePreview={setResumePreview}
            />
          </section>
        )}

        {active === "profile" && (
          <section className="hr-profile-grid">
            <div className="hr-panel">
              <h2>Profile</h2>
              <div className="hr-profile-row">
                <span>Name</span>
                <strong>{storedUser?.name || "HR User"}</strong>
              </div>
              <div className="hr-profile-row">
                <span>Email</span>
                <strong>{storedUser?.email}</strong>
              </div>
              <div className="hr-profile-row">
                <span>Role</span>
                <strong>{role === "hr" ? "HR" : "Employer"}</strong>
              </div>
            </div>
            <div className="hr-panel">
              <h2>Quick Actions</h2>
              <div className="hr-action-list">
                <button type="button" onClick={() => setShowPostJob(true)}>Post a new role</button>
                <button type="button" onClick={() => setActive("applicants")}>Review applicants</button>
                <button type="button" onClick={exportApplicants}>Download applicant CSV</button>
              </div>
            </div>
          </section>
        )}
      </main>

      {selectedApplicant && (
        <ApplicantModal
          applicant={selectedApplicant}
          onClose={() => setSelectedApplicant(null)}
          onSelect={() => updateStatus(selectedApplicant.id, "Selected")}
          onReject={() => rejectApplication(selectedApplicant.id)}
          onResumePreview={setResumePreview}
        />
      )}

      {resumePreview && (
        <ResumePreviewModal applicant={resumePreview} onClose={() => setResumePreview(null)} />
      )}

      {showPostJob && (
        <PostJobModal
          form={jobForm}
          setForm={setJobForm}
          onClose={() => setShowPostJob(false)}
          onSubmit={postJob}
        />
      )}
    </div>
  );
}

function ApplicantTable({ applicants, isProcessing, onSelect, onReject, onDetails, onCopyEmail, onResumePreview }) {
  if (!applicants.length) {
    return <div className="hr-empty">No applicants found.</div>;
  }

  return (
    <div className="hr-table-wrap">
      <table className="hr-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Job</th>
            <th>Status</th>
            <th>Resume</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applicants.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.name}</strong>
                <button type="button" className="hr-link-btn" onClick={() => onCopyEmail(item.email)}>
                  {item.email}
                </button>
              </td>
              <td>
                <strong>{item.title}</strong>
                <span>{item.company || "Company not listed"}</span>
              </td>
              <td>
                <span className={`hr-status ${getStatus(item).toLowerCase()}`}>{getStatus(item)}</span>
              </td>
              <td>
                {item.resume_url ? (
                  <button type="button" className="hr-link-btn" onClick={() => onResumePreview(item)}>
                    Preview
                  </button>
                ) : (
                  <span className="hr-muted">Missing</span>
                )}
              </td>
              <td>
                <div className="hr-row-actions">
                  <button type="button" className="hr-success-btn" disabled={isProcessing(item.id)} onClick={() => onSelect(item)}>
                    Select
                  </button>
                  <button type="button" className="hr-danger-btn" disabled={isProcessing(item.id)} onClick={() => onReject(item)}>
                    Reject
                  </button>
                  <button type="button" className="hr-ghost-btn light" onClick={() => onDetails(item)}>
                    Details
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApplicantModal({ applicant, onClose, onSelect, onReject, onResumePreview }) {
  return (
    <div className="hr-modal-backdrop" onMouseDown={onClose}>
      <div className="hr-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="hr-modal-head">
          <div>
            <p className="hr-kicker">Candidate Details</p>
            <h2>{applicant.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="hr-detail-grid">
          <div><span>Email</span><strong>{applicant.email}</strong></div>
          <div><span>Applied For</span><strong>{applicant.title}</strong></div>
          <div><span>Status</span><strong>{getStatus(applicant)}</strong></div>
          <div><span>Company</span><strong>{applicant.company || "-"}</strong></div>
        </div>
        <div className="hr-detail-block">
          <span>Qualifications</span>
          <p>{applicant.qualifications || "Not provided"}</p>
        </div>
        {applicant.resume_url && (
          <div className="hr-detail-block resume">
            <span>Resume</span>
            <div className="hr-resume-mini">
              <iframe src={getResumeUrl(applicant.resume_url)} title={`${applicant.name} resume preview`} />
            </div>
          </div>
        )}
        <div className="hr-card-actions">
          {applicant.resume_url && (
            <button type="button" className="hr-primary-btn" onClick={() => onResumePreview(applicant)}>
              Full Preview
            </button>
          )}
          <button type="button" className="hr-success-btn" onClick={onSelect}>Select</button>
          <button type="button" className="hr-danger-btn" onClick={onReject}>Reject</button>
        </div>
      </div>
    </div>
  );
}

function ResumePreviewModal({ applicant, onClose }) {
  const resumeUrl = getResumeUrl(applicant.resume_url);

  return (
    <div className="hr-modal-backdrop" onMouseDown={onClose}>
      <div className="hr-modal resume-preview" onMouseDown={(event) => event.stopPropagation()}>
        <div className="hr-modal-head">
          <div>
            <p className="hr-kicker">Resume Preview</p>
            <h2>{applicant.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="hr-resume-frame">
          <iframe src={resumeUrl} title={`${applicant.name} resume`} />
        </div>
        <div className="hr-card-actions">
          <a className="hr-ghost-btn light as-link" href={resumeUrl} target="_blank" rel="noreferrer">
            Open full screen
          </a>
          <button type="button" className="hr-primary-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function PostJobModal({ form, setForm, onClose, onSubmit }) {
  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="hr-modal-backdrop" onMouseDown={onClose}>
      <form className="hr-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={onSubmit}>
        <div className="hr-modal-head">
          <div>
            <p className="hr-kicker">New Opening</p>
            <h2>Post Job</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="hr-form-grid">
          <input name="title" value={form.title} onChange={updateField} placeholder="Job title" required />
          <input name="company" value={form.company} onChange={updateField} placeholder="Company" required />
          <input name="location" value={form.location} onChange={updateField} placeholder="Location" />
          <input name="type" value={form.type} onChange={updateField} placeholder="Full-time, Internship, Remote" />
          <input name="experience" value={form.experience} onChange={updateField} placeholder="Experience required" />
          <textarea name="description" value={form.description} onChange={updateField} placeholder="Job description" required />
        </div>
        <button type="submit" className="hr-primary-btn full">Post Job</button>
      </form>
    </div>
  );
}
