import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GuideChatbot.css";

const quickQuestions = [
  "How do I find matching jobs?",
  "How do I upload resume?",
  "How can HR post a job?",
  "Where can I check application status?",
  "What course should I do for future jobs?",
  "Which sector is good after studying data science?",
];

function getCoursePrediction(text) {
  if (text.includes("data science") || text.includes("machine learning") || text.includes("ml")) {
    return {
      answer:
        "A data science course can open doors to analytics, business intelligence, machine learning, and AI-related jobs in finance, healthcare, and tech. Build Python, SQL, and project experience to stand out.",
      route: "/jobs",
      routeLabel: "Explore Data Jobs",
    };
  }

  if (text.includes("web development") || text.includes("frontend") || text.includes("react") || text.includes("javascript") || text.includes("html") || text.includes("css")) {
    return {
      answer:
        "Studying web development can lead to frontend, backend, and full-stack roles in startups, agencies, and product companies. Focus on practical projects with React, Node, and responsive UI skills.",
      route: "/jobs",
      routeLabel: "Explore Web Jobs",
    };
  }

  if (text.includes("backend") || text.includes("server") || text.includes("node") || text.includes("python") || text.includes("java")) {
    return {
      answer:
        "Backend development courses can prepare you for software engineering, API development, and cloud infrastructure roles. Employers value strong problem solving, database knowledge, and clean code.",
      route: "/jobs",
      routeLabel: "Explore Backend Jobs",
    };
  }

  if (text.includes("ui") || text.includes("ux") || text.includes("design") || text.includes("graphic")) {
    return {
      answer:
        "UI/UX design training is great for product teams and digital services. You can aim for roles like UX designer, UI designer, or product design specialist by building a strong portfolio.",
      route: "/jobs",
      routeLabel: "Explore Design Jobs",
    };
  }

  if (text.includes("marketing") || text.includes("digital marketing") || text.includes("seo") || text.includes("social media")) {
    return {
      answer:
        "Marketing courses can lead to career paths in digital marketing, content strategy, social media, and brand growth. Practical experience with real campaigns is especially valuable.",
      route: "/jobs",
      routeLabel: "Explore Marketing Jobs",
    };
  }

  if (text.includes("hr") || text.includes("human resources") || text.includes("recruit")) {
    return {
      answer:
        "HR or people management courses can lead to roles like recruiter, HR executive, or talent manager. These jobs are common in companies that hire and grow teams regularly.",
      route: "/hr-dashboard",
      routeLabel: "Open HR Dashboard",
    };
  }

  if (text.includes("finance") || text.includes("accounting") || text.includes("mba")) {
    return {
      answer:
        "Courses in finance, accounting or business can prepare you for analyst, accountant, or business operations roles. Strong numerical and communication skills help you succeed.",
      route: "/jobs",
      routeLabel: "Explore Finance Jobs",
    };
  }

  return null;
}

function getBotReply(message) {
  const text = message.toLowerCase();
  const prediction = getCoursePrediction(text);

  if (prediction) {
    return prediction;
  }

  if (
    (text.includes("future") || text.includes("predict") || text.includes("prediction") || text.includes("sector")) &&
    (text.includes("course") || text.includes("study") || text.includes("learn") || text.includes("job"))
  ) {
    return {
      answer:
        "If you choose a course that matches your interest, you can move into jobs in that sector. For example, data science and AI are strong growth areas, web development supports many tech teams, and digital marketing works well for online brands.",
      route: "/profile",
      routeLabel: "Update Profile",
    };
  }

  if (text.includes("resume") || text.includes("cv")) {
    return {
      answer: "Upload your resume from the public home page or your profile. If you upload before login, the resume is saved after you login as a candidate.",
      route: "/profile",
      routeLabel: "Open Profile",
    };
  }

  if (text.includes("match") || text.includes("recommend") || text.includes("matching")) {
    return {
      answer: "For matching jobs, upload your resume and complete your qualifications/about section in profile. The candidate dashboard will show recommended jobs based on your profile.",
      route: "/dashboard",
      routeLabel: "Open Dashboard",
    };
  }

  if (text.includes("apply") || text.includes("application")) {
    return {
      answer: "Open Available Jobs, choose a role, then click Apply Now. You can track submitted applications from My Applications or Status.",
      route: "/jobs",
      routeLabel: "Browse Jobs",
    };
  }

  if (text.includes("status") || text.includes("selected") || text.includes("rejected")) {
    return {
      answer: "Application status is shown on the My Applications and Status pages. Selected means HR accepted your application.",
      route: "/my-applications",
      routeLabel: "View Applications",
    };
  }

  if (text.includes("hr") || text.includes("employer") || text.includes("post job") || text.includes("hire")) {
    return {
      answer: "HR users should signup as HR / Employer, login, and open the HR Dashboard. From there you can post jobs, view applicants, and accept or reject candidates.",
      route: "/hr-dashboard",
      routeLabel: "Open HR Dashboard",
    };
  }

  if (text.includes("signup") || text.includes("register") || text.includes("account")) {
    return {
      answer: "Use Signup to create either a Candidate account or HR / Employer account. Candidate accounts apply for jobs; HR accounts manage hiring.",
      route: "/signup",
      routeLabel: "Go to Signup",
    };
  }

  if (text.includes("login") || text.includes("log in")) {
    return {
      answer: "Use Login with your registered email and password. Candidates go to the candidate dashboard; HR users go to the HR dashboard.",
      route: "/login",
      routeLabel: "Go to Login",
    };
  }

  if (text.includes("profile")) {
    return {
      answer: "Your profile stores name, resume, LinkedIn, qualifications, and about details. Better profile details improve job recommendations.",
      route: "/profile",
      routeLabel: "Open Profile",
    };
  }

  return {
    answer: "I can guide you with resume upload, matching jobs, applying, application status, candidate profile, HR login, posting jobs, and career prediction based on course or sector.",
  };
}

export default function GuideChatbot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi, I am your job portal guide. Ask me how to apply, upload resume, find matches, or use HR dashboard.",
    },
  ]);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const sendMessage = (text = input) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    const reply = getBotReply(cleanText);
    setMessages((prev) => [
      ...prev,
      { from: "user", text: cleanText },
      { from: "bot", text: reply.answer, route: reply.route, routeLabel: reply.routeLabel },
    ]);
    setInput("");
  };

  return (
    <div className="guide-chatbot">
      {open && (
        <section className="chat-window">
          <div className="chat-header">
            <div>
              <strong>Portal Guide</strong>
              <span>{user?.role ? `${user.role} mode` : "Guest mode"}</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chatbot">x</button>
          </div>

          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`chat-bubble ${message.from}`}>
                <p>{message.text}</p>
                {message.route && (
                  <button
                    className="chat-link"
                    onClick={() => {
                      navigate(message.route);
                      setOpen(false);
                    }}
                  >
                    {message.routeLabel}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="quick-questions">
            {quickQuestions.map((question) => (
              <button key={question} onClick={() => sendMessage(question)}>
                {question}
              </button>
            ))}
          </div>

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for help..."
            />
            <button type="submit">Send</button>
          </form>
        </section>
      )}

      <button className="chat-launcher" onClick={() => setOpen((value) => !value)}>
        {open ? "Close" : "Help"}
      </button>
    </div>
  );
}
