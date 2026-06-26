import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AppPages.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("email");
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const sendResetOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setDevOtp("");

    try {
      const res = await axios.post("https://job-portal-omfp.onrender.com/api/auth/forgot-password", { email });
      setStep("reset");
      setMessage(res.data.msg);
      setDevOtp(res.data.devOtp || "");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Could not send reset OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("https://job-portal-omfp.onrender.com/api/auth/reset-password", {
        email,
        otp,
        password,
      });
      alert(res.data.msg);
      navigate("/login");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card app-form" onSubmit={step === "email" ? sendResetOtp : resetPassword}>
        <h2>Reset Password</h2>
        <p className="auth-subtitle">
          {step === "email" ? "Email daalo, reset OTP bhej denge." : "OTP verify karke new password set karo."}
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="app-input"
          disabled={step === "reset"}
          required
        />

        {step === "reset" && (
          <>
            <input
              type="text"
              inputMode="numeric"
              maxLength="6"
              placeholder="Reset OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="app-input"
              required
            />
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="app-input"
              required
            />
          </>
        )}

        {message && <p className="auth-message">{message}</p>}
        {devOtp && <p className="auth-message">Dev OTP: {devOtp}</p>}

        <button type="submit" className="app-btn" disabled={loading}>
          {loading ? "Please wait..." : step === "email" ? "Send Reset OTP" : "Reset Password"}
        </button>

        <div className="auth-links">
          <button type="button" onClick={() => navigate("/login")}>
            Back to login
          </button>
        </div>
      </form>
    </div>
  );
}
