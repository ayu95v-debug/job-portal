import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./AppPages.css";

function PostJob() {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  const submitJob = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:5000/api/jobs",
        { title, company, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Job posted successfully");
      navigate("/hr-dashboard");
    } catch (err) {
      alert(err.response?.data?.msg || "Error posting job");
    }
  };

  return (
    <>
      <Navbar />
      <div className="app-page">
        <div className="app-shell">
          <div className="app-hero">
            <div>
              <span className="app-eyebrow">Hiring</span>
              <h1>Post New Job</h1>
              <p>Create a new opening for candidates to discover and apply.</p>
            </div>
          </div>

          <form className="app-card app-form" onSubmit={submitJob}>
            <label>Job Title</label>
            <input className="app-input" value={title} onChange={(e) => setTitle(e.target.value)} required />

            <label>Company</label>
            <input className="app-input" value={company} onChange={(e) => setCompany(e.target.value)} required />

            <label>Job Description</label>
            <textarea className="app-textarea" value={description} onChange={(e) => setDescription(e.target.value)} required />

            <button className="app-btn" type="submit">Post Job</button>
          </form>
        </div>
      </div>
    </>
  );
}

export default PostJob;
