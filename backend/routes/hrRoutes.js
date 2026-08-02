const express = require("express");
const router = express.Router();
const db = require("../db");

/* ==========================
        HR JOBS
========================== */

router.get("/jobs/:hrId", async (req, res) => {

  try {

    const { hrId } = req.params;

    const result = await db.query(

      `
      SELECT *
      FROM jobs
      WHERE created_by=$1
      ORDER BY id DESC
      `,

      [hrId]

    );

    res.json(result.rows);

  }

  catch(err){

    console.log(err);

    res.status(500).json({

      error:"Server Error"

    });

  }

});


/* ==========================
      HR APPLICANTS
========================== */

router.get("/applicants/:hrId", async (req, res) => {

  try {

    const { hrId } = req.params;

    const result = await db.query(

      `
      SELECT

      applications.id,

      users.name,

      users.email,

      users.qualifications,

      users.resume_url,

      jobs.title,

      jobs.company,

      applications.status

      FROM applications

      INNER JOIN users

      ON users.id=applications.user_id

      INNER JOIN jobs

      ON jobs.id=applications.job_id

      WHERE jobs.created_by=$1

      ORDER BY applications.id DESC
      `,

      [hrId]

    );

    res.json(result.rows);

  }

  catch(err){

    console.log(err);

    res.status(500).json({

      error:"Server Error"

    });

  }

});


/* ==========================
        HR ANALYTICS
========================== */

router.get("/analytics/:hrId", async (req, res) => {

  try {

    const { hrId } = req.params;

    const result = await db.query(

      `
      SELECT

      jobs.title,

      COUNT(applications.id)::int
      AS total_applications

      FROM jobs

      LEFT JOIN applications

      ON applications.job_id=jobs.id

      WHERE jobs.created_by=$1

      GROUP BY jobs.id

      ORDER BY jobs.id DESC
      `,

      [hrId]

    );

    res.json(result.rows);

  }

  catch(err){

    console.log(err);

    res.status(500).json({

      error:"Server Error"

    });

  }

});


/* ==========================
        CREATE JOB
========================== */

router.post("/create-job", async (req, res) => {

  try {

    const {

      title,

      company,

      description,

      location,

      type,

      experience,

      created_by

    } = req.body;

    if (

      !title ||

      !company ||

      !description ||

      !created_by

    ) {

      return res.status(400).json({

        error:"Missing Required Fields"

      });

    }

    const result = await db.query(

      `
      INSERT INTO jobs

      (

      title,

      company,

      description,

      location,

      type,

      experience,

      created_by

      )

      VALUES

      (

      $1,$2,$3,$4,$5,$6,$7

      )

      RETURNING id
      `,

      [

        title,

        company,

        description,

        location || "",

        type || "",

        experience || "",

        created_by

      ]

    );

    res.json({

      message:"Job Created Successfully",

      jobId:result.rows[0].id

    });

  }

  catch(err){

    console.log(err);

    res.status(500).json({

      error:"Database Error"

    });

  }

});


/* ==========================
        DELETE JOB
========================== */

router.delete("/delete-job/:jobId", async (req, res) => {

  try {

    const { jobId } = req.params;

    const { hrId } = req.body;

    const verify = await db.query(

      `
      SELECT id

      FROM jobs

      WHERE id=$1

      AND created_by=$2
      `,

      [

        jobId,

        hrId

      ]

    );

    if(verify.rows.length===0){

      return res.status(403).json({

        error:"Unauthorized"

      });

    }

    await db.query(

      `
      DELETE FROM jobs

      WHERE id=$1
      `,

      [

        jobId

      ]

    );

    res.json({

      message:"Job Deleted Successfully"

    });

  }

  catch(err){

    console.log(err);

    res.status(500).json({

      error:"Server Error"

    });

  }

});

module.exports = router;