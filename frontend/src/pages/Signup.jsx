import { useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./AppPages.css";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") === "employer" ? "employer" : "candidate";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: initialRole,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("http://localhost:5000/api/auth/signup", form);
      setMessage(res.data.msg);
      navigate(
        `/verify-email?email=${encodeURIComponent(form.email)}${res.data.devOtp ? `&devOtp=${res.data.devOtp}` : ""}`
      );
    } catch (err) {
      setMessage(err.response?.data?.msg || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card app-form" onSubmit={handleSignup}>
        <h2>Signup</h2>
        <p className="auth-subtitle">Account create karo, phir email OTP se verify karo.</p>

        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="app-input"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="app-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          className="app-input"
        />

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="app-select"
        >
          <option value="candidate">Candidate</option>
          <option value="employer">HR / Employer</option>
        </select>

        {message && <p className="auth-message">{message}</p>}

        <button type="submit" className="app-btn" disabled={loading}>
          {loading ? "Please wait..." : "Signup & Send OTP"}
        </button>

        <div className="auth-links">
          <button type="button" onClick={() => navigate("/login")}>
            Already verified? Login
          </button>
        </div>
      </form>
    </div>
  );
}
