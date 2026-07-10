import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const skillTerms = [
  "c",
  "c language",
  "c programming",
  "cpp",
  "c++",
  "python",
  "sql",
  "aws",
  "docker",
  "kubernetes",
  "react",
  "node",
  "javascript",
  "java",
  "typescript",
  "csharp",
  "html",
  "css",
  "excel",
  "tableau",
  "power bi",
  "seo",
  "content",
  "social media",
  "marketing",
  "analytics",
  "data science",
  "machine learning",
  "ai",
  "product",
  "project management",
  "finance",
  "accounting",
  "recruitment",
  "human resources",
  "communication",
  "leadership",
  "design",
  "ui/ux",
];

function normalizeText(text) {
  return ` ${String(text || "")
    .toLowerCase()
    .replace(/c\+\+/g, " cpp ")
    .replace(/c#/g, " csharp ")
    .replace(/\.net/g, " dotnet ")
    .replace(/ci\/cd/g, " cicd ")
    .replace(/ui\/ux/g, " uiux ")
    .replace(/node\.js/g, " nodejs ")
    .replace(/react\.js/g, " reactjs ")
    .replace(/next\.js/g, " nextjs ")
    .replace(/vue\.js/g, " vuejs ")
    .replace(/express\.js/g, " expressjs ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function hasTerm(text, term) {
  const normalizedTerm = normalizeText(term).trim();
  return normalizedTerm && text.includes(` ${normalizedTerm} `);
}

function extractTerms(text) {
  const normalizedText = normalizeText(text);
  return skillTerms.filter((term) => hasTerm(normalizedText, term));
}

function mapCoursesForSkills(skills) {
  const courses = new Set();

  skills.forEach((skill) => {
    if (["c", "c language", "c programming", "cpp", "c++"].includes(skill)) {
      courses.add("C Programming Fundamentals");
      courses.add("Low-Level Programming and Memory Management");
    }
    if (["python", "sql", "data science", "machine learning", "ai", "analytics"].includes(skill)) {
      courses.add("Python and SQL for Data Roles");
      courses.add("Intro to Machine Learning");
    }
    if (["react", "node", "javascript", "typescript"].includes(skill)) {
      courses.add("Modern Web Development with React");
      courses.add("Backend APIs with Node.js");
    }
    if (["html", "css"].includes(skill)) {
      courses.add("HTML5 and CSS3 Fundamentals");
      courses.add("Responsive Web Design");
    }
    if (["aws", "docker", "kubernetes", "devops"].includes(skill)) {
      courses.add("Cloud and DevOps Foundations");
      courses.add("Docker / Kubernetes Essentials");
    }
    if (["seo", "content", "social media", "marketing"].includes(skill)) {
      courses.add("Digital Marketing and SEO");
      courses.add("Content Strategy for Brands");
    }
    if (["finance", "accounting", "excel"].includes(skill)) {
      courses.add("Financial Analysis and Reporting");
      courses.add("Excel for Business");
    }
    if (["recruitment", "human resources", "leadership", "communication"].includes(skill)) {
      courses.add("People Operations and Recruitment");
      courses.add("Communication and Leadership Skills");
    }
    if (["design", "ui/ux"].includes(skill)) {
      courses.add("UI/UX Design Fundamentals");
      courses.add("Design Thinking for Products");
    }
  });

  return Array.from(courses).slice(0, 6);
}

function getBaseGuidance(job) {
  if (!job) {
    return {
      header: "Improve your match score",
      description:
        "Click the match score on any recommended job to see targeted course guidance that can help increase your fit.",
      courses: [
        "Fill your profile with key skills and achievements",
        "Add certifications or projects relevant to your target role",
        "Complete training in resume-related technologies or tools",
      ],
      focus: ["Profile completion", "Skills alignment", "Practical experience"],
    };
  }

  const details = `${job.title || ""} ${job.description || ""} ${job.matchedSkills?.map((skill) => skill.skill).join(" ") || ""}`.toLowerCase();

  if (details.match(/data science|machine learning|ml|ai|analytics|python|sql/)) {
    return {
      header: "Target data science and analytics growth",
      description:
        "Your current match is with data and analytics roles. Improve your score by adding more data science projects and analytics tools.",
      courses: [
        "Python for Data Science",
        "SQL and Database Fundamentals",
        "Machine Learning Basics",
        "Data Visualization with Power BI or Tableau",
      ],
      focus: ["Python", "SQL", "Machine Learning", "Projects"],
    };
  }

  if (details.match(/developer|engineer|fullstack|frontend|backend|react|node|javascript|java|python/)) {
    return {
      header: "Boost your software development fit",
      description:
        "This role fits software engineering and web development. Improve your match by strengthening practical coding and project experience.",
      courses: [
        "Full-Stack Web Development",
        "React or Angular Frontend Development",
        "Node.js / Express Backend Development",
        "API Design and Database Integration",
      ],
      focus: ["Projects", "Code Samples", "Frameworks", "APIs"],
    };
  }

  if (details.match(/marketing|seo|social media|content|brand|campaign/)) {
    return {
      header: "Grow your digital marketing profile",
      description:
        "This role leans toward marketing and communications. Improve your score by showcasing campaign work and digital marketing experience.",
      courses: [
        "Digital Marketing Fundamentals",
        "SEO and Content Strategy",
        "Social Media Campaign Planning",
        "Brand Communications and Copywriting",
      ],
      focus: ["Campaigns", "Content", "SEO", "Social Media"],
    };
  }

  if (details.match(/finance|accounting|audit|analyst|mba|business/)) {
    return {
      header: "Strengthen your finance and analyst profile",
      description:
        "This role fits finance and business analysis. Improve your score by adding financial tools, reporting, and analytical experience.",
      courses: [
        "Financial Analysis and Reporting",
        "Excel / Google Sheets for Finance",
        "Business Analytics",
        "Accounting Principles",
      ],
      focus: ["Reporting", "Numbers", "Tools", "Analysis"],
    };
  }

  if (details.match(/hr|human resources|recruit|talent|people/)) {
    return {
      header: "Advance your HR and people operations fit",
      description:
        "This role targets HR and recruitment. Improve your score by highlighting hiring, onboarding, and employee support experience.",
      courses: [
        "HR Fundamentals",
        "Talent Acquisition and Recruitment",
        "Employee Relations",
        "Performance Management",
      ],
      focus: ["Recruitment", "Onboarding", "Employee Experience", "HR Tools"],
    };
  }

  return {
    header: "Improve your match with relevant skills",
    description:
      "This guidance page shows general course advice to help increase your fit for the selected role.",
    courses: [
      "Complete your profile with more skills",
      "Add role-specific projects",
      "Take online training for the target sector",
    ],
    focus: ["Skills", "Projects", "Certifications"],
  };
}

function getGuidance(job, matchPercentage, profileText) {
  const base = getBaseGuidance(job);
  const profileTerms = extractTerms(profileText);
  const jobTerms = job ? extractTerms(`${job.title || ""} ${job.description || ""}`) : [];
  const matchedSkills = job?.matchedSkills?.map((item) => item.skill) || [];
  const missingSkills = jobTerms
    .filter((term) => !profileTerms.includes(term) && !matchedSkills.includes(term))
    .slice(0, 6);

  const missingHelp = missingSkills.length
    ? `Add ${missingSkills.join(", ")} to your profile or resume to improve this match.`
    : "Your profile already aligns well with this role. Keep improving practical projects and certifications to increase your score further.";

  const projectedScore = job
    ? Math.min(matchPercentage + missingSkills.length * 8, 100)
    : 0;

  const courseSuggestions = [...base.courses, ...mapCoursesForSkills(missingSkills)].slice(0, 6);

  return {
    ...base,
    header: base.header,
    description: `${base.description} ${missingHelp}`,
    courses: courseSuggestions,
    focus: base.focus,
    matchedSkills,
    missingSkills,
    projectedScore,
  };
}

export default function CareerGuidance() {
  const location = useLocation();
  const navigate = useNavigate();
  const job = location.state?.job;
  const matchPercentage = location.state?.matchPercentage || 0;
  const user = JSON.parse(localStorage.getItem("user") || "{}") || {};
  const profileText = [user.qualifications, user.about, user.linkedin].filter(Boolean).join(" ");
  const guidance = getGuidance(job, matchPercentage, profileText);

  return (
    <>
      <Navbar />
      <main style={styles.page}>
        <div style={styles.card}>
          <button type="button" onClick={() => navigate(-1)} style={styles.backButton}>
            ← Back
          </button>

          <div style={styles.header}>
            <div>
              <p style={styles.superTitle}>Career Guidance</p>
              <h1 style={styles.title}>{job ? job.title : "Improve your job match"}</h1>
            </div>
            <div style={styles.badge}>
              <span style={styles.badgeLabel}>Match score</span>
              <strong style={styles.badgeValue}>{matchPercentage}%</strong>
            </div>
          </div>

          <p style={styles.description}>{guidance.description}</p>

          {job && guidance.matchedSkills.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Matched skills from your profile</h2>
              <div style={styles.skillChips}>
                {guidance.matchedSkills.map((skill) => (
                  <span key={skill} style={styles.skillChip}>
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {job && guidance.missingSkills.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Keywords to add</h2>
              <p style={styles.helpText}>
                These role-specific terms were found in the job requirements but not yet reflected in your profile.
              </p>
              <div style={styles.missingChips}>
                {guidance.missingSkills.map((skill) => (
                  <span key={skill} style={styles.missingChip}>
                    {skill}
                  </span>
                ))}
              </div>
              <p style={styles.projectedScore}>
                Estimated score if you add these keywords: <strong>{guidance.projectedScore}%</strong>
              </p>
            </section>
          )}

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Courses to boost your score</h2>
            <ul style={styles.courseList}>
              {guidance.courses.map((course) => (
                <li key={course} style={styles.courseItem}>
                  {course}
                </li>
              ))}
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>What to focus on</h2>
            <div style={styles.focusChips}>
              {guidance.focus.map((focus) => (
                <span key={focus} style={styles.focusChip}>
                  {focus}
                </span>
              ))}
            </div>
          </section>

          {job && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>How this helps</h2>
              <p style={styles.helpText}>
                Improving these skills and course experiences makes your profile more relevant for this role.
                The platform can then match you to higher scoring jobs with similar requirements.
              </p>
            </section>
          )}

          <div style={styles.actions}>
            <button type="button" onClick={() => navigate("/profile")} style={styles.primaryButton}>
              Update Profile
            </button>
            <button type="button" onClick={() => navigate("/jobs")} style={styles.secondaryButton}>
              Explore Related Jobs
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 8% 8%, rgba(20, 184, 166, 0.16), transparent 30%), radial-gradient(circle at 90% 0%, rgba(99, 102, 241, 0.14), transparent 28%), #f6f8fb",
    padding: "40px 20px 80px",
  },
  card: {
    maxWidth: 980,
    margin: "0 auto",
    padding: 32,
    borderRadius: 20,
    background: "white",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
    border: "1px solid #e2e8f0",
  },
  backButton: {
    border: "none",
    background: "transparent",
    color: "#111827",
    cursor: "pointer",
    fontSize: 14,
    marginBottom: 16,
    fontWeight: 700,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap",
  },
  superTitle: {
    margin: 0,
    color: "#10b981",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontSize: 13,
  },
  title: {
    margin: "10px 0 0",
    fontSize: 38,
    color: "#0f172a",
    lineHeight: 1.05,
  },
  badge: {
    minWidth: 140,
    borderRadius: 18,
    border: "1px solid #dbe3ef",
    padding: "14px 18px",
    textAlign: "center",
    background: "#f8fafc",
  },
  badgeLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 13,
    marginBottom: 6,
  },
  badgeValue: {
    fontSize: 32,
    fontWeight: 900,
    color: "#111827",
  },
  description: {
    marginTop: 28,
    color: "#334155",
    fontSize: 17,
    lineHeight: 1.8,
    maxWidth: 780,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 22,
    color: "#111827",
    fontWeight: 800,
  },
  courseList: {
    marginTop: 16,
    paddingLeft: 20,
    color: "#334155",
    lineHeight: 1.8,
  },
  courseItem: {
    marginBottom: 12,
    fontSize: 16,
  },
  focusChips: {
    marginTop: 16,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  focusChip: {
    background: "#eef2ff",
    color: "#4338ca",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
  },
  helpText: {
    marginTop: 12,
    color: "#475569",
    lineHeight: 1.8,
    fontSize: 15,
  },
  skillChips: {
    marginTop: 16,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  skillChip: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
  },
  missingChips: {
    marginTop: 16,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  missingChip: {
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
  },
  projectedScore: {
    marginTop: 14,
    fontSize: 15,
    color: "#111827",
    fontWeight: 600,
  },
  actions: {
    marginTop: 34,
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
  },
  primaryButton: {
    padding: "14px 24px",
    border: "none",
    borderRadius: 10,
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
  },
  secondaryButton: {
    padding: "14px 24px",
    border: "1px solid #dbe3ef",
    borderRadius: 10,
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
  },
};
