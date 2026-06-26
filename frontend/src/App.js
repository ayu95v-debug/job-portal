import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import PublicHome from "./pages/PublicHome";
import Jobs from "./pages/Jobs";
import Applicants from "./pages/Applicants";
import MyApplications from "./pages/MyApplications";
import Profile from "./pages/Profile";
// import HRDashboard from "./pages/HRDashboard";
import HRDashboard from "./pages/HRDashboard";
import PrivateRoute from "./components/PrivateRoute";
// import HRHome from "./pages/HRHome";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import MyStatus from "./pages/MyStatus";
import AppliedJobs from "./pages/AppliedJobs"; 
import CareerGuidance from "./pages/CareerGuidance";
import GuideChatbot from "./components/GuideChatbot";




function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/home" element={<Home />} />      
        <Route path="/login" element={<Login />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/my-applications" element={<MyApplications />} />
        <Route path="/applicants/:jobId" element={<Applicants />} />
      <Route path="/profile" element={<Profile />} />
        <Route path="/job" element={<Jobs />} />
        {/* <Route path="/home" element={<Home />} /> */}
               {/* <Route path="/HRDashboard" element={<HRDashboard />} />  */}

      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/status" element={<MyStatus />} />
      <Route path="/applied" element={<AppliedJobs />} />
    
    <Route path = "/dashboard" element={<Home/>} />
    <Route path="/career-guidance" element={<CareerGuidance />} />
    <Route 
    path = "/hr-dashboard" 
    element={
      <PrivateRoute>
        <HRDashboard/>
      </PrivateRoute>
    }
    />  

      </Routes>
      <GuideChatbot />
    </BrowserRouter>
  );
}

export default App;
