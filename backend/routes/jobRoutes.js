const express = require("express");
const router = express.Router();
const db = require("../db");

// ⚡ Simple caching for jobs list
const jobCache = {
  data: null,
  timestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000,
  
  get() {
    if (this.data && (Date.now() - this.timestamp) < this.CACHE_DURATION) {
      console.log("✅ Using cached jobs list");
      return this.data;
    }
    return null;
  },
  
  set(data) {
    this.data = data;
    this.timestamp = Date.now();
  },
  
  clear() {
    this.data = null;
  }
};

// GET ALL JOBS
router.get("/jobs", (req, res) => {
  console.log("GET /jobs called");
  
  // Try cache first
  const cached = jobCache.get();
  if (cached) {
    return res.json(cached);
  }
  
  const sql = "SELECT * FROM jobs";
  db.query(sql, (err, results) => {
    if (err) {
      console.log("GET /jobs error:", err);
      return res.status(500).json({ error: "Server error" });
    }
    console.log("Returning " + results.length + " jobs");
    jobCache.set(results);
    res.json(results);
  });
});

// APPLY JOB
router.post("/apply", (req, res) => {
  const { jobId, userId } = req.body;
  console.log("Apply request:", { jobId, userId });

  if (!jobId || !userId) {
    console.log("Missing jobId or userId");
    return res.status(400).json({ error: "jobId and userId are required" });
  }

  const checkSql = "SELECT * FROM applications WHERE job_id = ? AND user_id = ?";
  db.query(checkSql, [jobId, userId], (err, rows) => {
    if (err) {
      console.log("Check error:", err);
      return res.status(500).json({ error: "Server error" });
    }

    if (rows.length > 0) {
      console.log("Already applied");
      return res.status(400).json({ error: "Already applied" });
    }

    const insertSql = "INSERT INTO applications (job_id, user_id, status) VALUES (?, ?, ?)";
    db.query(insertSql, [jobId, userId, "Applied"], (insertErr) => {
      if (insertErr) {
        console.log("Insert error:", insertErr);
        return res.status(500).json({ error: "Server error" });
      }
      console.log("Applied successfully");
      res.json({ message: "Applied successfully" });
    });
  });
});

// GET APPLIED JOBS FOR CANDIDATE
router.get("/applied/:userId", (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT j.title, j.company, j.description, a.status
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.log("Applied jobs error:", err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});

// GET APPLICATION STATUS FOR CANDIDATE
router.get("/my-applications/:userId", (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT a.id AS application_id, j.title, j.company, a.status
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.log("My applications error:", err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});

module.exports = router;
