const express = require("express");
const router = express.Router();
const db = require("../db");

/* ==========================
        JOB CACHE
========================== */

const jobCache = {
  data: null,
  timestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000,

  get() {
    if (
      this.data &&
      Date.now() - this.timestamp < this.CACHE_DURATION
    ) {
      console.log("✅ Using Cached Jobs");
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
    this.timestamp = 0;
  },
};

/* ==========================
        GET ALL JOBS
========================== */

router.get("/jobs", async (req, res) => {
  try {
    const cached = jobCache.get();

    if (cached) {
      return res.json(cached);
    }

    const result = await db.query(`
      SELECT *
      FROM jobs
      ORDER BY id DESC
    `);

    jobCache.set(result.rows);

    res.json(result.rows);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

/* ==========================
          APPLY JOB
========================== */

router.post("/apply", async (req, res) => {
  try {
    const { jobId, userId } = req.body;

    if (!jobId || !userId) {
      return res.status(400).json({
        success: false,
        error: "jobId and userId are required",
      });
    }

    const check = await db.query(
      `
      SELECT id
      FROM applications
      WHERE job_id=$1
      AND user_id=$2
      `,
      [jobId, userId]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Already Applied",
      });
    }

    await db.query(
      `
      INSERT INTO applications
      (
        job_id,
        user_id,
        status
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      `,
      [jobId, userId, "Applied"]
    );

    jobCache.clear();

    res.json({
      success: true,
      message: "Applied Successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

/* ==========================
      APPLIED JOBS
========================== */

router.get("/applied/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `
      SELECT

      j.id,
      j.title,
      j.company,
      j.description,
      j.location,
      j.type,
      j.experience,

      a.status,
      a.applied_at

      FROM applications a

      INNER JOIN jobs j

      ON a.job_id=j.id

      WHERE a.user_id=$1

      ORDER BY a.applied_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

/* ==========================
      MY APPLICATIONS
========================== */

router.get("/my-applications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `
      SELECT

      a.id AS application_id,

      j.id AS job_id,

      j.title,

      j.company,

      j.location,

      j.type,

      a.status,

      a.applied_at

      FROM applications a

      INNER JOIN jobs j

      ON a.job_id=j.id

      WHERE a.user_id=$1

      ORDER BY a.applied_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
});

module.exports = router;