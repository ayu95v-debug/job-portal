import { useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./AppPages.css";

const API = window.location.hostname === 
 "https://job-portal-omfp.onrender.com";

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
      let authData = {};
      const signupRes = await axios.post(`${API}/api/auth/signup`, form);

      if (signupRes.data.token && signupRes.data.user) {
        authData = signupRes.data;
      } else {
        const loginRes = await axios.post(`${API}/api/auth/login`, {
          email: form.email,
          password: form.password,
        });
        authData = loginRes.data;
      }

      const user = authData.user;
      const userRole = (user.role || "").toLowerCase();
      const updatedUser = { ...user, role: userRole };

      localStorage.setItem("token", authData.token);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("email", user.email);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("role", updatedUser.role);

      if (updatedUser.role === "employer" || updatedUser.role === "hr") {
        navigate("/hr-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setMessage(
        err.response?.data?.msg ||
          (err.request ? "Backend is not running or not reachable. Please restart backend." : "Signup failed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card app-form" onSubmit={handleSignup}>
        <h2>Signup</h2>
        <p className="auth-subtitle">Account create karo, phir login karo.</p>

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
          {loading ? "Please wait..." : "Signup"}
        </button>

        <div className="auth-links">
          <button type="button" onClick={() => navigate("/login")}>
            Already have an account? Login
          </button>
        </div>
      </form>
    </div>
  );
}
