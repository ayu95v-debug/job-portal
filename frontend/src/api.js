const defaultLocalApi = "http://localhost:5000";
const renderBackendUrl = "https://job-portal-backend.onrender.com";

const API =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")
    ? renderBackendUrl
    : defaultLocalApi);

export default API;
