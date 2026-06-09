// const express = require("express");
// const router = express.Router();
// const db = require("../db");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// /* ================= SIGNUP ================= */


// router.post("/signup", async (req, res) => {
//   const { name, email, password, role } = req.body;

//   if(!name || !email|| !password || !role ){
//     return res.status(400).json({msg : "all fied are required "});
//   }

//   const hashedPassword = await bcrypt.hash(password, 10);
//   const sql = "INSERT INTO users (name, email, Password, role) VALUES (?, ?, ?, ?)";

//   // const hashed = await bcrypt.hash(password, 10);

//   db.query(sql,[name, email, hashedPassword, role], (err, result)=>{

//     // "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
//     // [name, email, hashed, role || "user"],

//       if (err){
//         console.log(err);
//         return res.status(500).json({ msg: "Error inserting user"})
//       }
//       res.json({ msg: "User registered" });
//     });
  
//   }
// );

// /* ================= LOGIN ================= */
// router.post("/login", (req, res) => {
//   const { email, password } = req.body;

//   db.query(
//     "SELECT * FROM users WHERE email = ?",
//     [email],
//     async (err, result) => {
//       if (err) return res.status(500).json(err);

//       if (result.length === 0)
//         return res.status(400).json({ msg: "User not found" });

//       const user = result[0];

//       const match = await bcrypt.compare(password, user.password);
//       if (!match) return res.status(400).json({ msg: "Wrong password" });

//       const token = jwt.sign(
//         { id: user.id, role: user.role },
//         process.env.JWT_SECRET,
//         { expiresIn: "1d" }
//       );

//       res.json({ token, user });
//     }
//   );
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const OTP_TTL_MS = 10 * 60 * 1000;

function toMysqlDate(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sanitizeUser(user) {
  const {
    password,
    email_verification_otp_hash,
    login_otp_hash,
    reset_otp_hash,
    ...safeUser
  } = user;
  return safeUser;
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOtp(otp, hash, expiresAt) {
  if (!otp || !hash || !expiresAt) return false;
  if (new Date(expiresAt).getTime() < Date.now()) return false;
  return bcrypt.compare(String(otp), hash);
}

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendOtpEmail(email, subject, otp, purpose) {
  const transporter = createTransporter();
  const text = `Your Job Portal ${purpose} OTP is ${otp}. It expires in 10 minutes.`;

  if (!transporter) {
    console.log(`[DEV OTP] ${purpose} for ${email}: ${otp}`);
    return { sent: false, devOtp: process.env.NODE_ENV === "production" ? undefined : otp };
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject,
    text,
  });

  return { sent: true };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "secret123",
    { expiresIn: "1d" }
  );
}

// ⚡ Simple caching layer for better performance
const cache = {
  jobs: null,
  jobsTimestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  getJobs() {
    const now = Date.now();
    if (this.jobs && (now - this.jobsTimestamp) < this.CACHE_DURATION) {
      console.log("✅ Using cached jobs");
      return this.jobs;
    }
    return null;
  },
  
  setJobs(jobs) {
    this.jobs = jobs;
    this.jobsTimestamp = Date.now();
    console.log("💾 Jobs cached for next 5 minutes");
  },
  
  clearJobs() {
    this.jobs = null;
    this.jobsTimestamp = 0;
  }
};

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const stopWords = new Set([
  "and","the","for","with","this","that","from","your","you","are","have","has","will","our","their","they","them","which","those","where","when","what","who","how","why","is","in","on","at","by","to","of","a","an","or","as","it","job","jobs","resume","candidate","experience","skills","years","year","month","months","working","worked","work","strong","good","excellent"
]);

// Common skills and aliases for better matching. Users and HRs write the same
// skill in many ways, e.g. "Node.js", "node js", "nodejs", or "MERN".
const skillAliases = {
  javascript: ["javascript", "java script", "js", "ecmascript"],
  typescript: ["typescript", "type script", "ts"],
  python: ["python", "py"],
  java: ["java"],
  csharp: ["c#", "c sharp", "csharp"],
  cpp: ["c++", "cpp", "c plus plus"],
  golang: ["go", "golang"],
  rust: ["rust"],
  kotlin: ["kotlin"],
  swift: ["swift"],
  php: ["php"],
  ruby: ["ruby"],
  html: ["html", "html5"],
  css: ["css", "css3"],
  sql: ["sql"],
  react: ["react", "reactjs", "react.js"],
  angular: ["angular", "angularjs"],
  vue: ["vue", "vuejs", "vue.js"],
  nodejs: ["node", "nodejs", "node.js", "node js"],
  express: ["express", "expressjs", "express.js"],
  django: ["django"],
  flask: ["flask"],
  spring: ["spring", "spring boot"],
  dotnet: [".net", "dotnet", "asp.net", "aspnet"],
  laravel: ["laravel"],
  rails: ["rails", "ruby on rails"],
  nextjs: ["next", "nextjs", "next.js"],
  mongodb: ["mongodb", "mongo db", "mongo"],
  mysql: ["mysql", "my sql"],
  postgresql: ["postgresql", "postgres", "postgre sql"],
  firebase: ["firebase"],
  redis: ["redis"],
  elasticsearch: ["elasticsearch", "elastic search"],
  cassandra: ["cassandra"],
  dynamodb: ["dynamodb", "dynamo db"],
  aws: ["aws", "amazon web services"],
  azure: ["azure"],
  gcp: ["gcp", "google cloud"],
  docker: ["docker"],
  kubernetes: ["kubernetes", "k8s"],
  git: ["git"],
  jenkins: ["jenkins"],
  gitlab: ["gitlab", "git lab"],
  github: ["github", "git hub"],
  jira: ["jira"],
  figma: ["figma"],
  slack: ["slack"],
  rest: ["rest", "rest api", "restful"],
  api: ["api", "apis"],
  microservices: ["microservices", "micro services"],
  devops: ["devops", "dev ops"],
  cicd: ["ci/cd", "ci cd", "cicd"],
  agile: ["agile"],
  scrum: ["scrum"],
  testing: ["testing", "qa", "quality assurance"],
  tdd: ["tdd"],
  cloud: ["cloud"],
  ml: ["ml", "machine learning"],
  ai: ["ai", "artificial intelligence"],
  mern: ["mern", "mern stack"],
  mean: ["mean", "mean stack"],
  frontend: ["frontend", "front end", "front-end"],
  backend: ["backend", "back end", "back-end"],
  fullstack: ["fullstack", "full stack", "full-stack"],
  uiux: ["ui/ux", "ui ux", "ux", "ui"],
  accounting: ["accounting", "accounts", "accountant", "tally", "gst"],
  sales: ["sales", "business development", "bd"],
  marketing: ["marketing", "digital marketing", "seo", "sem"],
  hr: ["hr", "human resources", "recruitment", "recruiter"],
  finance: ["finance", "financial", "banking"],
  operations: ["operations", "operation"],
};

const stackExpansions = {
  mern: ["mongodb", "express", "react", "nodejs"],
  mean: ["mongodb", "express", "angular", "nodejs"],
  fullstack: ["frontend", "backend"],
};

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
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function hasPhrase(normalizedText, phrase) {
  const normalizedPhrase = normalizeText(phrase).trim();
  return Boolean(normalizedPhrase) && normalizedText.includes(` ${normalizedPhrase} `);
}

function extractSkills(text) {
  if (!text) return [];
  
  const normalizedText = normalizeText(text);
  let skills = new Set();
  
  // Check for known skills and aliases
  Object.entries(skillAliases).forEach(([skill, aliases]) => {
    if (aliases.some((alias) => hasPhrase(normalizedText, alias))) {
      skills.add(skill);
      (stackExpansions[skill] || []).forEach((expandedSkill) => skills.add(expandedSkill));
    }
  });
  
  console.log("🔎 Tech skills found:", skills.length > 0 ? skills : "none");
  
  // If no tech skills found, extract general keywords
  if (skills.size === 0) {
    skills = [...new Set(
      normalizedText
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word))
    )].slice(0, 30);
    console.log("📌 Fallback keywords:", skills);
  }
  
  return [...new Set(skills)];
}

function scoreJob(job, skills) {
  if (!skills || skills.length === 0) return { score: 0, matchedSkills: [] };
  
  const descriptionText = [
    job.title || "",
    job.company || "",
    job.description || "",
    job.location || "",
    job.type || "",
    job.experience || ""
  ]
    .join(" ");
  const titleText = normalizeText(job.title || "");
  const jobText = `${titleText}${normalizeText(descriptionText)}`;
  
  let score = 0;
  let matchedSkills = [];
  
  // Title matches get highest weight
  skills.forEach(skill => {
    const aliases = skillAliases[skill] || [skill];
    const matchesTitle = aliases.some((alias) => hasPhrase(titleText, alias));
    const matchesDescription = aliases.some((alias) => hasPhrase(jobText, alias));

    if (matchesTitle) {
      score += 4;
      matchedSkills.push({ skill, type: "title", weight: 4 });
    } else if (matchesDescription) {
      score += 2;
      matchedSkills.push({ skill, type: "description", weight: 2 });
    }
  });
  
  // Bonus for experience level matching
  if (job.experience) {
    const exp = normalizeText(job.experience);
    if (hasPhrase(exp, "senior") || hasPhrase(exp, "lead")) score += 1;
    if (hasPhrase(exp, "junior") || hasPhrase(exp, "entry")) score -= 1;
  }
  
  // Remove duplicates and limit to top 5 matches
  matchedSkills = [...new Map(matchedSkills.map(m => [m.skill, m])).values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  
  return { score: Math.max(score, 0), matchedSkills };
}

/* ================= VERIFIED AUTH FLOW ================= */
router.post("/signup", async (req, res) => {
  const { name, email, password, role, linkedin, qualifications, about } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (result.length > 0) return res.status(400).json({ msg: "Email already exists" });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = createOtp();
      const otpHash = await hashOtp(otp);
      const otpExpires = toMysqlDate(new Date(Date.now() + OTP_TTL_MS));

      db.query(
        `INSERT INTO users
          (name, email, password, role, linkedin, qualifications, about, is_email_verified, email_verification_otp_hash, email_verification_otp_expires)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [name, email, hashedPassword, role, linkedin || "", qualifications || "", about || "", otpHash, otpExpires],
        async (insertErr) => {
          if (insertErr) return res.status(500).json({ msg: insertErr.message });

          try {
            const emailResult = await sendOtpEmail(
              email,
              "Verify your Job Portal account",
              otp,
              "email verification"
            );

            res.json({
              msg: emailResult.sent
                ? "Signup successful. Verification OTP sent to your email."
                : "Signup successful. Email config missing, dev OTP logged in backend console.",
              requiresVerification: true,
              devOtp: emailResult.devOtp,
            });
          } catch (mailErr) {
            console.log("MAIL ERROR:", mailErr);
            res.status(500).json({ msg: "Signup saved, but verification email could not be sent" });
          }
        }
      );
    } catch (error) {
      console.log("SIGNUP ERROR:", error);
      res.status(500).json({ msg: "Server error" });
    }
  });
});

router.post("/verify-email", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ msg: "Email and OTP are required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (result.length === 0) return res.status(404).json({ msg: "User not found" });

    const user = result[0];
    const valid = await verifyOtp(
      otp,
      user.email_verification_otp_hash,
      user.email_verification_otp_expires
    );

    if (!valid) return res.status(400).json({ msg: "Invalid or expired verification OTP" });

    db.query(
      `UPDATE users
       SET is_email_verified = 1,
           email_verification_otp_hash = NULL,
           email_verification_otp_expires = NULL
       WHERE id = ?`,
      [user.id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ msg: updateErr.message });
        res.json({ msg: "Email verified successfully. You can login now." });
      }
    );
  });
});

router.post("/resend-verification", (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ msg: "Email is required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (result.length === 0) return res.status(404).json({ msg: "User not found" });
    if (Number(result[0].is_email_verified) === 1) {
      return res.status(400).json({ msg: "Email is already verified" });
    }

    const otp = createOtp();
    const otpHash = await hashOtp(otp);
    const otpExpires = toMysqlDate(new Date(Date.now() + OTP_TTL_MS));

    db.query(
      "UPDATE users SET email_verification_otp_hash = ?, email_verification_otp_expires = ? WHERE email = ?",
      [otpHash, otpExpires, email],
      async (updateErr) => {
        if (updateErr) return res.status(500).json({ msg: updateErr.message });

        try {
          const emailResult = await sendOtpEmail(
            email,
            "Your new Job Portal verification OTP",
            otp,
            "email verification"
          );
          res.json({
            msg: emailResult.sent ? "Verification OTP sent again." : "Email config missing, dev OTP logged in backend console.",
            devOtp: emailResult.devOtp,
          });
        } catch (mailErr) {
          res.status(500).json({ msg: "Could not send verification email" });
        }
      }
    );
  });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (result.length === 0) return res.status(400).json({ msg: "User not found" });

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    const hasPendingSignupVerification = Boolean(user.email_verification_otp_hash);
    if (Number(user.is_email_verified) !== 1 && hasPendingSignupVerification) {
      return res.status(403).json({
        msg: "Please verify your email before login",
        requiresVerification: true,
      });
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  });
});

router.post("/verify-login", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ msg: "Email and OTP are required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (result.length === 0) return res.status(404).json({ msg: "User not found" });

    const user = result[0];
    const valid = await verifyOtp(otp, user.login_otp_hash, user.login_otp_expires);
    if (!valid) return res.status(400).json({ msg: "Invalid or expired login OTP" });

    db.query(
      "UPDATE users SET login_otp_hash = NULL, login_otp_expires = NULL WHERE id = ?",
      [user.id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ msg: updateErr.message });

        const token = signToken(user);
        res.json({ token, user: sanitizeUser(user) });
      }
    );
  });
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ msg: "Email is required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (result.length === 0) return res.status(404).json({ msg: "User not found" });

    const otp = createOtp();
    const otpHash = await hashOtp(otp);
    const otpExpires = toMysqlDate(new Date(Date.now() + OTP_TTL_MS));

    db.query(
      "UPDATE users SET reset_otp_hash = ?, reset_otp_expires = ? WHERE email = ?",
      [otpHash, otpExpires, email],
      async (updateErr) => {
        if (updateErr) return res.status(500).json({ msg: updateErr.message });

        try {
          const emailResult = await sendOtpEmail(
            email,
            "Reset your Job Portal password",
            otp,
            "password reset"
          );
          res.json({
            msg: emailResult.sent ? "Password reset OTP sent to your email." : "Email config missing, dev OTP logged in backend console.",
            devOtp: emailResult.devOtp,
          });
        } catch (mailErr) {
          res.status(500).json({ msg: "Could not send reset OTP" });
        }
      }
    );
  });
});

router.post("/reset-password", (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ msg: "Email, OTP and new password are required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (result.length === 0) return res.status(404).json({ msg: "User not found" });

    const user = result[0];
    const valid = await verifyOtp(otp, user.reset_otp_hash, user.reset_otp_expires);
    if (!valid) return res.status(400).json({ msg: "Invalid or expired reset OTP" });

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      `UPDATE users
       SET password = ?,
           reset_otp_hash = NULL,
           reset_otp_expires = NULL,
           login_otp_hash = NULL,
           login_otp_expires = NULL
       WHERE id = ?`,
      [hashedPassword, user.id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ msg: updateErr.message });
        res.json({ msg: "Password reset successful. Please login again." });
      }
    );
  });
});

/* ================= SIGNUP ================= */
router.post("/signup", async (req, res) => {
  const { name, email, password, role, linkedin, qualifications, about } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  // ✅ CHECK DUPLICATE EMAIL
  const checkSql = "SELECT * FROM users WHERE email = ?";
  db.query(checkSql, [email], async (err, result) => {
    if (err) {
      console.log("CHECK ERROR:", err);
      return res.status(500).json({ msg: err.message });
    }

    if (result.length > 0) {
      return res.status(400).json({ msg: "Email already exists ❌" });
    }

    try {
      // ✅ HASH PASSWORD
      const hashedPassword = await bcrypt.hash(password, 10);

      const insertSql =
        "INSERT INTO users (name, email, password, role, linkedin, qualifications, about) VALUES (?, ?, ?, ?, ?, ?, ?)";

      db.query(
        insertSql,
        [name, email, hashedPassword, role, linkedin || "", qualifications || "", about || ""],
        (err, result) => {
          if (err) {
            console.log("INSERT ERROR:", err);
            return res.status(500).json({ msg: err.message });
          }

          res.json({ msg: "Signup successful ✅" });
        }
      );
    } catch (error) {
      console.log("HASH ERROR:", error);
      res.status(500).json({ msg: "Server error" });
    }
  });
});

/* ================= LOGIN ================= */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ msg: err.message });
      }

      if (result.length === 0) {
        return res.status(400).json({ msg: "User not found ❌" });
      }

      const user = result[0];

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).json({ msg: "Wrong password ❌" });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || "secret123",
        { expiresIn: "1d" }
      );

      res.json({ token, user });
    }
  );
});

router.get("/profile/:userId", (req, res) => {
  const userId = req.params.userId;
  const sql = "SELECT id, name, email, role, linkedin, qualifications, about, resume_url FROM users WHERE id = ?";

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ msg: "User not found" });
    res.json(result[0]);
  });
});

router.put("/profile/:userId", (req, res) => {
  const userId = req.params.userId;
  const { name, linkedin, qualifications, about } = req.body;

  if (!name) {
    return res.status(400).json({ msg: "Name is required" });
  }

  const sql = "UPDATE users SET name = ?, linkedin = ?, qualifications = ?, about = ? WHERE id = ?";
  db.query(
    sql,
    [name, linkedin || "", qualifications || "", about || "", userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ msg: "Profile updated successfully" });
    }
  );
});

router.post("/upload-resume/:userId", upload.single("resume"), (req, res) => {
  const userId = req.params.userId;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ msg: "Resume file is required" });
  }

  const resumeUrl = `/uploads/${file.filename}`;
  const sql = "UPDATE users SET resume_url = ? WHERE id = ?";

  db.query(sql, [resumeUrl, userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ msg: "Resume uploaded successfully", resume_url: resumeUrl });
  });
});

router.get("/recommend-jobs/:userId", (req, res) => {
  const userId = req.params.userId;
  console.log("\n=== 🔍 RECOMMEND JOBS ENDPOINT ===");
  console.log("Recommend jobs called for userId:", userId);
  
  const profileSql = "SELECT qualifications, about, linkedin FROM users WHERE id = ?";

  db.query(profileSql, [userId], (err, users) => {
    if (err) {
      console.error("❌ Profile fetch error:", err);
      return res.status(500).json({ msg: "Error fetching profile", error: err.message });
    }
    if (users.length === 0) {
      console.error("❌ User not found:", userId);
      return res.status(404).json({ msg: "User not found" });
    }

    const user = users[0];
    console.log("✅ User profile found");
    console.log("   Qualifications:", user.qualifications?.substring(0, 60) || "EMPTY");
    console.log("   About:", user.about?.substring(0, 60) || "EMPTY");
    console.log("   LinkedIn:", user.linkedin?.substring(0, 60) || "EMPTY");
    
    const profileText = [user.qualifications, user.about, user.linkedin]
      .filter(Boolean)
      .join(" ");

    console.log("📄 Profile text length:", profileText.length);
    const skills = extractSkills(profileText);
    console.log("📝 Final extracted skills:", skills.length, "skills -", skills.slice(0, 8));
    
    const analysis = skills.length
      ? `Found ${skills.length} relevant skills in your profile. Searching for best matches...`
      : "Update your profile with skills for better job recommendations.";

    // 🚀 Try to use cached jobs first
    let jobs = null;
    
    if (jobs) {
      // Use cached jobs - process recommendations immediately
      processRecommendations(jobs);
    } else {
      // Fetch from database if cache is empty
      const jobSql = "SELECT * FROM jobs";
      db.query(jobSql, (jobErr, dbJobs) => {
        if (jobErr) {
          console.error("❌ Jobs fetch error:", jobErr);
          return res.status(500).json({ msg: "Error fetching jobs", error: jobErr.message });
        }
        // Cache the jobs for next requests
        cache.setJobs(dbJobs);
        processRecommendations(dbJobs);
      });
    }
    
    function processRecommendations(jobs) {
      console.log("📊 Total jobs in database:", jobs.length);

      if (jobs.length === 0) {
        console.log("⚠️ No jobs available");
        return res.json({
          recommendedJobs: [],
          skills: [],
          analysis: "No jobs available right now.",
        });
      }

      // Score all jobs
      const scoredJobs = jobs
        .map((job) => {
          const { score, matchedSkills } = scoreJob(job, skills);
          if (score > 0) {
            console.log(`   ✅ ${job.title} - Score: ${score} - Matches: ${matchedSkills.map(m => m.skill).join(", ")}`);
          }
          return { ...job, score, matchedSkills };
        })
        .sort((a, b) => b.score - a.score);

      const zeroScoreCount = scoredJobs.filter(j => j.score === 0).length;
      console.log(`📊 Jobs with score 0: ${zeroScoreCount}`);
      console.log("🎯 Top 5 jobs by score:", scoredJobs.slice(0, 5).map(j => ({ title: j.title, score: j.score })));

      // Filter: Only show jobs with score > 0 (at least 1 skill match)
      const relevantJobs = scoredJobs.filter((job) => job.score > 0);
      console.log(`🔥 Relevant jobs found: ${relevantJobs.length}`);
      
      // If no relevant jobs, show top scored anyway
      const results = relevantJobs.length > 0 
        ? relevantJobs.slice(0, 8) 
        : scoredJobs.slice(0, 5);

      console.log("✨ Returning", results.length, "recommended jobs");
      console.log("=== END RECOMMEND JOBS ===\n");
      
      res.json({
        recommendedJobs: results,
        skills,
        analysis,
      });
    }
  });
});

router.get("/my-applications/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT jobs.title, jobs.company, applications.status
    FROM applications
    JOIN jobs ON jobs.id = applications.job_id
    WHERE applications.user_id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

module.exports = router;
