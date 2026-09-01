const express = require("express");
const router = express.Router();
const db = require("../db");

/* =====================================================
                    HR JOBS
===================================================== */

router.get("/jobs/:hrId", async (req, res) => {
    try {

        const { hrId } = req.params;

        const result = await db.query(
            `
            SELECT

                id,
                title,
                company,
                location,
                type,
                experience,
                salary,
                description,
                created_at

            FROM jobs

            WHERE created_by = $1

            ORDER BY created_at DESC
            `,
            [hrId]
        );

        res.json({
            success: true,
            jobs: result.rows
        });

    } catch (err) {

        console.error("HR Jobs Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }
});


/* =====================================================
                HR APPLICANTS
===================================================== */

router.get("/applicants/:hrId", async (req, res) => {

    try {

        const { hrId } = req.params;

        const result = await db.query(
            `
            SELECT

                applications.id,

                applications.status,

                applications.created_at,

                users.id AS user_id,
                users.name,
                users.email,
                users.linkedin,
                users.about,
                users.qualifications,
                users.resume_url,

                jobs.id AS job_id,
                jobs.title,
                jobs.company

            FROM applications

            INNER JOIN users
                ON users.id = applications.user_id

            INNER JOIN jobs
                ON jobs.id = applications.job_id

            WHERE jobs.created_by = $1

            ORDER BY applications.created_at DESC
            `,
            [hrId]
        );

        res.json({
            success: true,
            applicants: result.rows
        });

    } catch (err) {

        console.error("Applicants Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


/* =====================================================
                HR ANALYTICS
===================================================== */

router.get("/analytics/:hrId", async (req, res) => {

    try {

        const { hrId } = req.params;

        const result = await db.query(
            `
            SELECT

                jobs.id,

                jobs.title,

                COALESCE(
                    COUNT(applications.id),
                    0
                )::INT AS total_applications

            FROM jobs

            LEFT JOIN applications

                ON applications.job_id = jobs.id

            WHERE jobs.created_by = $1

            GROUP BY jobs.id

            ORDER BY jobs.created_at DESC
            `,
            [hrId]
        );

        res.json({
            success: true,
            analytics: result.rows
        });

    } catch (err) {

        console.error("Analytics Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});
/* =====================================================
                    CREATE JOB
===================================================== */

router.post("/create-job", async (req, res) => {

    try {

        const {
            title,
            company,
            salary,
            description,
            location,
            type,
            experience,
            created_by
        } = req.body;

        if (!title || !company || !description || !created_by) {
            return res.status(400).json({
                success: false,
                error: "Title, Company, Description and HR Id are required."
            });
        }

        const result = await db.query(
            `
            INSERT INTO jobs
            (
                title,
                company,
                salary,
                description,
                location,
                type,
                experience,
                created_by
            )

            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8
            )

            RETURNING id
            `,
            [
                title,
                company,
                salary || "",
                description,
                location || "",
                type || "",
                experience || "",
                created_by
            ]
        );

        res.status(201).json({
            success: true,
            message: "Job Created Successfully",
            jobId: result.rows[0].id
        });

    } catch (err) {

        console.error("Create Job Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


/* =====================================================
                    UPDATE JOB
===================================================== */

router.put("/update-job/:jobId", async (req, res) => {

    try {

        const { jobId } = req.params;

        const {
            title,
            company,
            salary,
            description,
            location,
            type,
            experience
        } = req.body;

        await db.query(
            `
            UPDATE jobs

            SET

                title = $1,
                company = $2,
                salary = $3,
                description = $4,
                location = $5,
                type = $6,
                experience = $7

            WHERE id = $8
            `,
            [
                title,
                company,
                salary,
                description,
                location,
                type,
                experience,
                jobId
            ]
        );

        res.json({
            success: true,
            message: "Job Updated Successfully"
        });

    } catch (err) {

        console.error("Update Job Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


/* =====================================================
                    DELETE JOB
===================================================== */

router.delete("/delete-job/:jobId", async (req, res) => {

    try {

        const { jobId } = req.params;
        const { hrId } = req.body;

        const verify = await db.query(
            `
            SELECT id

            FROM jobs

            WHERE id = $1

            AND created_by = $2
            `,
            [
                jobId,
                hrId
            ]
        );

        if (verify.rows.length === 0) {

            return res.status(403).json({
                success: false,
                error: "Unauthorized"
            });

        }

        // Delete related applications first
        await db.query(
            `
            DELETE FROM applications

            WHERE job_id = $1
            `,
            [jobId]
        );

        // Delete job
        await db.query(
            `
            DELETE FROM jobs

            WHERE id = $1
            `,
            [jobId]
        );

        res.json({
            success: true,
            message: "Job Deleted Successfully"
        });

    } catch (err) {

        console.error("Delete Job Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


/* =====================================================
                    HEALTH CHECK
===================================================== */

router.get("/ping", (req, res) => {

    res.json({

        success: true,

        message: "HR Routes Working Successfully 🚀"

    });

});


/* =====================================================
                    EXPORT
===================================================== */

module.exports = router;