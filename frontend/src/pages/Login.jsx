import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AppPages.css";

function pendingResumeToFile() {
  const dataUrl = sessionStorage.getItem("pendingResumeDataUrl");
  const fileName = sessionStorage.getItem("pendingResumeFileName") || "resume.pdf";
  const fileType = sessionStorage.getItem("pendingResumeFileType") || "application/octet-stream";

  if (!dataUrl) return null;

  const [, base64] = dataUrl.split(",");
  if (!base64) return null;

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], fileName, { type: fileType });
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const finishLogin = async (data) => {
    const user = data.user;
    const userRole = (user.role || "").toLowerCase();
    let updatedUser = { ...user, role: userRole };
    const pendingResume = pendingResumeToFile();
    let resumeUploaded = false;

    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", user.id);
    localStorage.setItem("email", user.email);

    if (userRole === "candidate" && pendingResume) {
      const formData = new FormData();
      formData.append("resume", pendingResume);

      const uploadRes = await axios.post(
        `http://localhost:5000/api/auth/upload-resume/${user.id}`,
        formData
      );

      updatedUser = { ...updatedUser, resume_url: uploadRes.data.resume_url };
      sessionStorage.removeItem("pendingResumeDataUrl");
      sessionStorage.removeItem("pendingResumeFileName");
      sessionStorage.removeItem("pendingResumeFileType");
      resumeUploaded = true;
    }

    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("role", updatedUser.role);
    alert(resumeUploaded ? "Login successful. Resume added to profile." : "Login successful");

    if (updatedUser.role === "employer" || updatedUser.role === "hr") {
      navigate("/hr-dashboard", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
      await finishLogin(res.data);
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setMessage(data?.msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card app-form" onSubmit={handleLogin}>
        <h2>Login</h2>
        {/* <p className="auth-subtitle">Purane users password se login kar sakte hain. New users pehle email verify karenge.</p> */}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="app-input"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="app-input"
          required
        />

        {message && <p className="auth-message">{message}</p>}

        <button type="submit" className="app-btn" disabled={loading}>
          {loading ? "Please wait..." : "Login"}
        </button>

        <div className="auth-links">
          <button type="button" onClick={() => navigate("/forgot-password")}>
            Forgot password?
          </button>
          <button type="button" onClick={() => navigate("/signup")}>
            Signup
          </button>
        </div>
      </form>
    </div>
  );
}
