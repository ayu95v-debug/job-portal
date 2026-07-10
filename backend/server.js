const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const db = require("./db");
const hrRoutes = require("./routes/hrRoutes");
const jobRoutes = require("./routes/jobRoutes");

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ✅ Ensure profile columns exist in users table
const profileColumns = [
  "linkedin VARCHAR(255)",
  "qualifications TEXT",
  "about TEXT",
  "resume_url VARCHAR(255)",
  "is_email_verified TINYINT(1) DEFAULT 1",
  "email_verification_otp_hash VARCHAR(255)",
  "email_verification_otp_expires DATETIME",
  "login_otp_hash VARCHAR(255)",
  "login_otp_expires DATETIME",
  "reset_otp_hash VARCHAR(255)",
  "reset_otp_expires DATETIME"
];
profileColumns.forEach((column) => {
  const sql = `ALTER TABLE users ADD COLUMN ${column}`;
  db.query(sql, (err) => {
    if (err && err.errno !== 1060) {
      console.log("Could not add user column:", column, err.message);
    }
  });
});

db.query(
  `UPDATE users
   SET is_email_verified = 1,
       email_verification_otp_hash = NULL,
       email_verification_otp_expires = NULL
   WHERE is_email_verified IS NULL
      OR is_email_verified = 0
      OR email_verification_otp_hash IS NOT NULL
      OR email_verification_otp_expires IS NOT NULL`,
  (err) => {
    if (err) {
      console.log("Could not disable pending email verification:", err.message);
    }
  }
);

// ✅ Middleware FIRST
app.use(cors());
app.use(express.json());

// ✅ Serve uploads with proper content-type headers
app.use("/uploads", (req, res, next) => {
  const file = req.path.toLowerCase();
  if (file.endsWith(".pdf")) {
    res.type("application/pdf");
  } else if (file.endsWith(".doc")) {
    res.type("application/msword");
  } else if (file.endsWith(".docx")) {
    res.type("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  }
  next();
}, express.static(path.join(__dirname, "uploads")));

// ✅ Ensure job columns exist in jobs table
const jobColumns = [
  "location VARCHAR(255)",
  "type VARCHAR(100)",
  "experience VARCHAR(255)"
];
jobColumns.forEach((column) => {
  const sql = `ALTER TABLE jobs ADD COLUMN ${column}`;
  db.query(sql, (err) => {
    if (err && err.errno !== 1060) {
      console.log("Could not add job column:", column, err.message);
    }
  });
});

// ✅ Ensure notifications table exists for candidate alerts
const notificationsSql = `
  CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    application_id INT,
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_application_id (application_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
db.query(notificationsSql, (err) => {
  if (err) {
    console.log("Could not create notifications table:", err.message);
  }
});

// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api", jobRoutes);
app.use("/api/hr", hrRoutes);

// ✅ FALLBACK: GET ALL JOBS (for when recommendations fail)
app.get("/api/jobs-list", (req, res) => {
  const sql = "SELECT * FROM jobs LIMIT 20";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Jobs list error:", err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results || []);
  });
});

// ✅ UPDATE APPLICATION STATUS
app.put("/api/applications/status", (req, res) => {
  const { appId, status } = req.body;
  console.log("Update status request:", { appId, status });

  if (!appId || !status) {
    return res.status(400).json({ error: "appId and status are required" });
  }

  const lookupSql = `
    SELECT a.user_id, j.title
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ?
  `;

  db.query(lookupSql, [appId], (lookupErr, rows) => {
    if (lookupErr) {
      console.log("Lookup error:", lookupErr);
      return res.status(500).json({ error: "Server error" });
    }
    if (!rows.length) {
      return res.status(404).json({ error: "Application not found" });
    }

    const { user_id: userId, title } = rows[0];
    const sql = "UPDATE applications SET status = ? WHERE id = ?";

    db.query(sql, [status, appId], (err, result) => {
      if (err) {
        console.log("Update error:", err);
        return res.status(500).json({ error: "Server error" });
      }

      const shouldNotify = status === "Selected" || status === "Rejected";
      if (!shouldNotify) {
        return res.json({ message: "Status updated successfully" });
      }

      const notificationMessage =
        status === "Selected"
          ? `Congratulations! Your application for \"${title}\" has been selected by HR.`
          : `Update: Your application for \"${title}\" has been marked as ${status}.`;

      const notifySql = "INSERT INTO notifications (user_id, application_id, message) VALUES (?, ?, ?)";
      db.query(notifySql, [userId, appId, notificationMessage], (notifyErr) => {
        if (notifyErr) {
          console.log("Notification error:", notifyErr);
          return res.status(500).json({ error: "Status updated, but failed to create notification" });
        }

        console.log("Status updated and notification saved");
        res.json({ message: "Status updated and notification created" });
      });
    });
  });
});

// ✅ DELETE APPLICATION ON REJECT
app.delete("/api/applications/:id", (req, res) => {
  const applicationId = req.params.id;
  console.log("Delete application request:", applicationId);

  if (!applicationId) {
    return res.status(400).json({ error: "Application id is required" });
  }

  const sql = "DELETE FROM applications WHERE id = ?";
  db.query(sql, [applicationId], (err, result) => {
    if (err) {
      console.log("Delete error:", err);
      return res.status(500).json({ error: "Server error" });
    }
    console.log("Application deleted successfully");
    res.json({ message: "Application deleted successfully" });
  });
});

// app.use("/api/ai", require("./routes/aiMatch"));


// ✅ Test route
app.get("/", (req, res) => {
  res.send("Job Portal API Running 🚀");
});

app.get("/api/notifications/:userId", (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT id, application_id, message, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.log("Notifications fetch error:", err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});

app.put("/api/notifications/read/:id", (req, res) => {
  const notificationId = req.params.id;
  if (!notificationId) {
    return res.status(400).json({ error: "Notification id is required" });
  }

  const sql = "UPDATE notifications SET is_read = 1 WHERE id = ?";
  db.query(sql, [notificationId], (err) => {
    if (err) {
      console.log("Notification read update error:", err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json({ message: "Notification marked as read" });
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


