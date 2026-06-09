const express = require("express");
const router = express.Router();
const db = require("../db");


// GET HR JOBS
router.get("/jobs/:hrId", (req, res) => {

const hrId = req.params.hrId;

const sql = "SELECT * FROM jobs WHERE created_by = ?";

db.query(sql,[hrId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json(err);
}

res.json(result);

});

});



// GET HR APPLICANTS
router.get("/applicants/:hrId",(req,res)=>{

const hrId = req.params.hrId;

const sql = `
SELECT applications.id,
users.name,
users.email,
users.qualifications,
users.resume_url,
jobs.title,
jobs.company,
applications.status
FROM applications
JOIN users ON users.id = applications.user_id
JOIN jobs ON jobs.id = applications.job_id
WHERE jobs.created_by = ?
`;

db.query(sql,[hrId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json(err);
}

res.json(result);

});

});

router.get("/analytics/:hrId",(req,res)=>{

const hrId = req.params.hrId;   
const sql =`
select jobs.title,
         COUNT(applications.id) AS total_applications
FROM jobs
LEFT JOIN applications ON applications.job_id = jobs.id
WHERE jobs.created_by = ?
GROUP BY jobs.id
`;

db.query(sql,[hrId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json(err);
}

res.json(result);

});

});

// CREATE JOB
router.post("/create-job", (req, res) => {
  const { title, company, description, location, type, experience, created_by } = req.body;

  if (!title || !company || !description || !created_by) {
    return res.status(400).json({ error: "Missing required fields: title, company, description, created_by" });
  }

  const sql = "INSERT INTO jobs (title, company, description, location, type, experience, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [title, company, description, location || "", type || "", experience || "", created_by], (err, result) => {
    if (err) {
      console.log("Create job error:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }
    res.json({ message: "Job created successfully", jobId: result.insertId });
  });
});

// DELETE JOB
router.delete("/delete-job/:jobId", (req, res) => {
  const { jobId } = req.params;
  const { hrId } = req.body;

  if (!jobId || !hrId) {
    return res.status(400).json({ error: "jobId and hrId are required" });
  }

  const verifySql = "SELECT id FROM jobs WHERE id = ? AND created_by = ?";
  db.query(verifySql, [jobId, hrId], (err, results) => {
    if (err) {
      console.log("Verify job error:", err);
      return res.status(500).json({ error: "Server error" });
    }
    if (results.length === 0) {
      return res.status(403).json({ error: "Unauthorized or job not found" });
    }

    const deleteSql = "DELETE FROM jobs WHERE id = ?";
    db.query(deleteSql, [jobId], (deleteErr) => {
      if (deleteErr) {
        console.log("Delete job error:", deleteErr);
        return res.status(500).json({ error: "Failed to delete job" });
      }
      res.json({ message: "Job deleted successfully" });
    });
  });
});

module.exports = router;
