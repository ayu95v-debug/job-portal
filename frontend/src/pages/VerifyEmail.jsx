import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./AppPages.css";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState(searchParams.get("devOtp") || "");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("https://job-portal-omfp.onrender.com/api/auth/verify-email", { email, otp });
      alert(res.data.msg);
      navigate("/login");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setMessage("");
    setDevOtp("");

    try {
      const res = await axios.post("https://job-portal-omfp.onrender.com/api/auth/resend-verification", { email });
      setMessage(res.data.msg);
      setDevOtp(res.data.devOtp || "");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card app-form" onSubmit={handleVerify}>
        <h2>Verify Email</h2>
        <p className="auth-subtitle">Gmail/email par aaya 6 digit OTP enter karo.</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="app-input"
          required
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength="6"
          placeholder="Verification OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          className="app-input"
          required
        />

        {message && <p className="auth-message">{message}</p>}
        {devOtp && <p className="auth-message">Dev OTP: {devOtp}</p>}

        <button type="submit" className="app-btn" disabled={loading}>
          {loading ? "Please wait..." : "Verify Email"}
        </button>
        <button type="button" className="app-btn secondary" onClick={handleResend} disabled={loading || !email}>
          Resend OTP
        </button>
      </form>
    </div>
  );
}
