const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

const db = require("./db");

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const hrRoutes = require("./routes/hrRoutes");

/* ===========================================
            CREATE UPLOADS FOLDER
=========================================== */

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {
    recursive: true,
  });
}

/* ===========================================
                DATABASE CHECK
=========================================== */

(async () => {
  try {
    await db.query("SELECT NOW()");
    console.log("✅ PostgreSQL Connected Successfully");
  } catch (err) {
    console.log("❌ Database Connection Failed");
    console.log(err.message);
  }
})();

/* ===========================================
                MIDDLEWARE
=========================================== */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

/* ===========================================
            STATIC UPLOADS
=========================================== */

app.use(
  "/uploads",
  (req, res, next) => {
    const file = req.path.toLowerCase();

    if (file.endsWith(".pdf")) {
      res.type("application/pdf");
    } else if (file.endsWith(".doc")) {
      res.type("application/msword");
    } else if (file.endsWith(".docx")) {
      res.type(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    }

    next();
  },

  express.static(path.join(__dirname, "uploads"))
);

/* ===========================================
                ROUTES
=========================================== */

app.use("/api/auth", authRoutes);

app.use("/api", jobRoutes);

app.use("/api/hr", hrRoutes);

/* ===========================================
            FALLBACK JOB LIST
=========================================== */

app.get("/api/jobs-list", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *

      FROM jobs

      ORDER BY id DESC

      LIMIT 20
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Server Error",
    });
  }
});
/* ===========================================
        UPDATE APPLICATION STATUS
=========================================== */

app.put("/api/applications/status", async (req, res) => {

  try {

    const { appId, status } = req.body;

    if (!appId || !status) {
      return res.status(400).json({
        error: "appId and status are required"
      });
    }

    const lookup = await db.query(

      `
      SELECT

      a.user_id,

      j.title

      FROM applications a

      INNER JOIN jobs j

      ON j.id = a.job_id

      WHERE a.id = $1
      `,

      [appId]

    );

    if (lookup.rows.length === 0) {
      return res.status(404).json({
        error: "Application not found"
      });
    }

    const { user_id, title } = lookup.rows[0];

    await db.query(

      `
      UPDATE applications

      SET status = $1

      WHERE id = $2
      `,

      [status, appId]

    );

    if (status === "Selected" || status === "Rejected") {

      const message =
        status === "Selected"
          ? `Congratulations! Your application for "${title}" has been selected by HR.`
          : `Update: Your application for "${title}" has been marked as ${status}.`;

      await db.query(

        `
        INSERT INTO notifications
        (
          user_id,
          application_id,
          message
        )

        VALUES
        (
          $1,$2,$3
        )
        `,

        [
          user_id,
          appId,
          message
        ]

      );

    }

    res.json({
      message: "Status Updated Successfully"
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Server Error"
    });

  }

});


/* ===========================================
        DELETE APPLICATION
=========================================== */

app.delete("/api/applications/:id", async (req, res) => {

  try {

    const { id } = req.params;

    await db.query(

      `
      DELETE FROM applications

      WHERE id = $1
      `,

      [id]

    );

    res.json({

      message: "Application Deleted Successfully"

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      error: "Server Error"

    });

  }

});


/* ===========================================
        GET NOTIFICATIONS
=========================================== */

app.get("/api/notifications/:userId", async (req, res) => {

  try {

    const { userId } = req.params;

    const result = await db.query(

      `
      SELECT

      id,

      application_id,

      message,

      is_read,

      created_at

      FROM notifications

      WHERE user_id = $1

      ORDER BY created_at DESC

      LIMIT 20
      `,

      [userId]

    );

    res.json(result.rows);

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      error: "Server Error"

    });

  }

});


/* ===========================================
      MARK NOTIFICATION AS READ
=========================================== */

app.put("/api/notifications/read/:id", async (req, res) => {

  try {

    const { id } = req.params;

    await db.query(

      `
      UPDATE notifications

      SET is_read = TRUE

      WHERE id = $1
      `,

      [id]

    );

    res.json({

      message: "Notification marked as read"

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      error: "Server Error"

    });

  }

});
/* ===========================================
                HOME ROUTE
=========================================== */

app.get("/", (req, res) => {

  res.json({

    success: true,

    message: "AI Job Portal Backend Running 🚀"

  });

});


/* ===========================================
            HEALTH CHECK
=========================================== */

app.get("/health", async (req, res) => {

  try {

    await db.query("SELECT NOW()");

    res.json({

      success: true,

      database: "Connected",

      server: "Running"

    });

  }

  catch (err) {

    res.status(500).json({

      success: false,

      database: "Disconnected",

      error: err.message

    });

  }

});


/* ===========================================
            404 HANDLER
=========================================== */

app.use((req, res) => {

  res.status(404).json({

    success: false,

    message: "Route Not Found"

  });

});


/* ===========================================
        GLOBAL ERROR HANDLER
=========================================== */

app.use((err, req, res, next) => {

  console.error(err);

  if (err.code === "LIMIT_FILE_SIZE" || err.message === "Only PDF resumes are supported for resume matching.") {
    return res.status(400).json({
      success: false,
      msg: err.code === "LIMIT_FILE_SIZE"
        ? "Resume must be 5 MB or smaller."
        : err.message,
    });
  }

  res.status(500).json({

    success: false,

    message: "Internal Server Error"

  });

});


/* ===========================================
            START SERVER
=========================================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(`
==========================================
🚀 AI JOB PORTAL SERVER STARTED
==========================================
Server : http://localhost:${PORT}
Database : PostgreSQL (Supabase)
Environment : ${process.env.NODE_ENV || "development"}
==========================================
`);

});
