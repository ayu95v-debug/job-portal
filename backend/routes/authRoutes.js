const express = require("express");
const router = express.Router();

const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const pdfParse = require("pdf-parse");

const db = require("../db");

/* =====================================================
                    CONSTANTS
===================================================== */

const OTP_TTL = 10 * 60 * 1000;

/* =====================================================
                    MULTER
===================================================== */

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads"));
    },

    filename: (req, file, cb) => {

        cb(
            null,

            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            path.extname(file.originalname)
        );

    }

});

const upload = multer({ storage });

/* =====================================================
                    MAIL
===================================================== */

const transporter = nodemailer.createTransport({

    service: "gmail",

    auth: {

        user: process.env.EMAIL_USER,

        pass: process.env.EMAIL_PASS

    }

});

/* =====================================================
                    JWT
===================================================== */

function createToken(user){

    return jwt.sign(

        {

            id:user.id,

            role:user.role

        },

        process.env.JWT_SECRET,

        {

            expiresIn:"7d"

        }

    );

}

/* =====================================================
                    OTP
===================================================== */

function generateOTP(){

    return Math.floor(

        100000+

        Math.random()*900000

    ).toString();

}

async function hashOTP(otp){

    return bcrypt.hash(otp,10);

}

async function verifyOTP(

    otp,

    hash,

    expiry

){

    if(!otp || !hash || !expiry){

        return false;

    }

    if(

        new Date(expiry)<

        new Date()

    ){

        return false;

    }

    return bcrypt.compare(

        otp,

        hash

    );

}

/* =====================================================
                SEND EMAIL
===================================================== */

async function sendOTP(

    email,

    subject,

    otp

){

    await transporter.sendMail({

        from:process.env.EMAIL_USER,

        to:email,

        subject,

        html:`

        <h2>AI Job Portal</h2>

        <p>Your OTP is</p>

        <h1>${otp}</h1>

        <p>Valid for 10 minutes.</p>

        `

    });

}

/* =====================================================
            REMOVE SENSITIVE DATA
===================================================== */

function sanitizeUser(user){

    const {

        password,

        reset_otp_hash,

        reset_otp_expires,

        login_otp_hash,

        login_otp_expires,

        email_verification_otp_hash,

        email_verification_otp_expires,

        ...safe

    }=user;

    return safe;

}

/* =====================================================
                PDF READER
===================================================== */

async function readResume(filePath){

    try{

        if(!fs.existsSync(filePath))

            return "";

        const buffer=

        fs.readFileSync(filePath);

        const pdf=

        await pdfParse(buffer);

        return pdf.text || "";

    }

    catch(err){

        console.log(err);

        return "";

    }

}

/* =====================================================
                CACHE
===================================================== */

const cache={

    jobs:null,

    timestamp:0,

    duration:5*60*1000,

    get(){

        if(

            this.jobs &&

            Date.now()-this.timestamp<

            this.duration

        ){

            return this.jobs;

        }

        return null;

    },

    set(data){

        this.jobs=data;

        this.timestamp=Date.now();

    },

    clear(){

        this.jobs=null;

        this.timestamp=0;

    }

};

/* =====================================================
                STOP WORDS
===================================================== */

const stopWords=new Set([

"the",

"and",

"for",

"with",

"from",

"your",

"this",

"that",

"have",

"will",

"job",

"resume",

"candidate",

"skills",

"experience"

]);

/* =====================================================
            SKILL ALIASES
===================================================== */

const skillAliases={

python:["python","py"],

java:["java"],

javascript:["javascript","js"],

react:["react","reactjs"],

nodejs:["node","nodejs"],

express:["express"],

mysql:["mysql"],

postgresql:["postgresql","postgres"],

mongodb:["mongodb"],

docker:["docker"],

git:["git"],

aws:["aws"],

ai:["ai"],

ml:["machine learning","ml"],

sql:["sql"]

};
/* =====================================================
                    SIGNUP
===================================================== */

router.post("/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            role,
            linkedin,
            qualifications,
            about
        } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                msg: "All fields are required"
            });
        }

        // Check duplicate email
        const existingUser = await db.query(
            `
            SELECT id
            FROM users
            WHERE email = $1
            `,
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                msg: "Email already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await db.query(
            `
            INSERT INTO users
            (
                name,
                email,
                password,
                role,
                linkedin,
                qualifications,
                about
            )

            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7
            )

            RETURNING
            id,
            name,
            email,
            role,
            linkedin,
            qualifications,
            about,
            resume_url
            `,
            [
                name,
                email,
                hashedPassword,
                role,
                linkedin || "",
                qualifications || "",
                about || ""
            ]
        );

        const user = result.rows[0];

        const token = createToken(user);

        res.status(201).json({
            success: true,
            token,
            user: sanitizeUser(user)
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            msg: err.message
        });

    }

});


/* =====================================================
                    LOGIN
===================================================== */

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                msg: "Email and password are required"
            });
        }

        // Find user
        const result = await db.query(
            `
            SELECT *
            FROM users
            WHERE email = $1
            `,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                msg: "User not found"
            });
        }

        const user = result.rows[0];

        // Verify password
        const match = await bcrypt.compare(
            password,
            user.password
        );

        if (!match) {
            return res.status(400).json({
                success: false,
                msg: "Invalid password"
            });
        }

        const token = createToken(user);

        res.json({
            success: true,
            token,
            user: sanitizeUser(user)
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            msg: err.message
        });

    }

});
/* =====================================================
                FORGOT PASSWORD
===================================================== */

router.post("/forgot-password", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                msg: "Email is required"
            });
        }

        const result = await db.query(
            `
            SELECT id,email
            FROM users
            WHERE email = $1
            `,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        const otp = generateOTP();

        const otpHash = await hashOTP(otp);

        const expiry = new Date(Date.now() + OTP_TTL);

        await db.query(
            `
            UPDATE users
            SET
                reset_otp_hash = $1,
                reset_otp_expires = $2
            WHERE email = $3
            `,
            [
                otpHash,
                expiry,
                email
            ]
        );

        await sendOTP(
            email,
            "Password Reset OTP",
            otp
        );

        res.json({
            success: true,
            msg: "OTP sent successfully"
        });

    }

    catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            msg:err.message

        });

    }

});


/* =====================================================
                VERIFY LOGIN OTP
===================================================== */

router.post("/verify-login", async (req,res)=>{

    try{

        const{

            email,

            otp

        }=req.body;

        if(!email || !otp){

            return res.status(400).json({

                success:false,

                msg:"Email and OTP required"

            });

        }

        const result=

        await db.query(

            `
            SELECT *

            FROM users

            WHERE email=$1
            `,

            [

                email

            ]

        );

        if(result.rows.length===0){

            return res.status(404).json({

                success:false,

                msg:"User not found"

            });

        }

        const user=result.rows[0];

        const valid=

        await verifyOTP(

            otp,

            user.login_otp_hash,

            user.login_otp_expires

        );

        if(!valid){

            return res.status(400).json({

                success:false,

                msg:"Invalid OTP"

            });

        }

        await db.query(

            `
            UPDATE users

            SET

            login_otp_hash=NULL,

            login_otp_expires=NULL

            WHERE id=$1
            `,

            [

                user.id

            ]

        );

        const token=

        createToken(user);

        res.json({

            success:true,

            token,

            user:sanitizeUser(user)

        });

    }

    catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            msg:err.message

        });

    }

});


/* =====================================================
                RESET PASSWORD
===================================================== */

router.post("/reset-password",async(req,res)=>{

    try{

        const{

            email,

            otp,

            password

        }=req.body;

        const result=

        await db.query(

            `
            SELECT

            id,

            reset_otp_hash,

            reset_otp_expires

            FROM users

            WHERE email=$1
            `,

            [

                email

            ]

        );

        if(result.rows.length===0){

            return res.status(404).json({

                success:false,

                msg:"User not found"

            });

        }

        const user=result.rows[0];

        const valid=

        await verifyOTP(

            otp,

            user.reset_otp_hash,

            user.reset_otp_expires

        );

        if(!valid){

            return res.status(400).json({

                success:false,

                msg:"Invalid or Expired OTP"

            });

        }

        const hashedPassword=

        await bcrypt.hash(

            password,

            10

        );

        await db.query(

            `
            UPDATE users

            SET

            password=$1,

            reset_otp_hash=NULL,

            reset_otp_expires=NULL

            WHERE id=$2
            `,

            [

                hashedPassword,

                user.id

            ]

        );

        res.json({

            success:true,

            msg:"Password updated successfully"

        });

    }

    catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            msg:err.message

        });

    }

});
/* =====================================================
                    GET PROFILE
===================================================== */

router.get("/profile/:userId", async (req, res) => {

    try {

        const { userId } = req.params;

        const result = await db.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                linkedin,
                qualifications,
                about,
                resume_url
            FROM users
            WHERE id = $1
            `,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            msg: err.message
        });

    }

});


/* =====================================================
                UPDATE PROFILE
===================================================== */

router.put("/profile/:userId", async (req, res) => {

    try {

        const { userId } = req.params;

        const {
            name,
            linkedin,
            qualifications,
            about
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                msg: "Name is required"
            });
        }

        await db.query(
            `
            UPDATE users
            SET
                name = $1,
                linkedin = $2,
                qualifications = $3,
                about = $4
            WHERE id = $5
            `,
            [
                name,
                linkedin || "",
                qualifications || "",
                about || "",
                userId
            ]
        );

        const updated = await db.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                linkedin,
                qualifications,
                about,
                resume_url
            FROM users
            WHERE id = $1
            `,
            [userId]
        );

        res.json({
            success: true,
            msg: "Profile updated successfully",
            user: updated.rows[0]
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            msg: err.message
        });

    }

});


/* =====================================================
                UPLOAD RESUME
===================================================== */

router.post(
    "/upload-resume/:userId",
    upload.single("resume"),
    async (req, res) => {

        try {

            const { userId } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    msg: "Resume file is required"
                });
            }

            const resumeUrl = `/uploads/${req.file.filename}`;

            await db.query(
                `
                UPDATE users
                SET resume_url = $1
                WHERE id = $2
                `,
                [
                    resumeUrl,
                    userId
                ]
            );

            res.json({
                success: true,
                msg: "Resume uploaded successfully",
                resume_url: resumeUrl
            });

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false,
                msg: err.message
            });

        }

    }
);


/* =====================================================
                    GET RESUME
===================================================== */

router.get("/resume/:userId", async (req, res) => {

    try {

        const { userId } = req.params;

        const result = await db.query(
            `
            SELECT resume_url
            FROM users
            WHERE id = $1
            `,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        res.json({
            success: true,
            resume_url: result.rows[0].resume_url
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            msg: err.message
        });

    }

});
/* =====================================================
            AI JOB RECOMMENDATION (PART 1)
===================================================== */

router.get("/recommend-jobs/:userId", async (req, res) => {

    try {

        const { userId } = req.params;

        console.log("===== AI RECOMMENDATION =====");
        console.log("User:", userId);

        /* ---------------- USER PROFILE ---------------- */

        const profile = await db.query(

            `
            SELECT

            qualifications,
            about,
            linkedin,
            resume_url

            FROM users

            WHERE id = $1
            `,

            [userId]

        );

        if (profile.rows.length === 0) {

            return res.status(404).json({

                success:false,

                msg:"User not found"

            });

        }

        const user = profile.rows[0];

        /* ---------------- RESUME ---------------- */

        let resumeText = "";

        if (user.resume_url) {

            const resumePath = path.join(

                __dirname,

                "..",

                "uploads",

                path.basename(user.resume_url)

            );

            resumeText = await readResume(resumePath);

        }

        /* ---------------- PROFILE TEXT ---------------- */

        const profileText = [

            user.qualifications,

            user.about,

            user.linkedin,

            resumeText

        ]

        .filter(Boolean)

        .join(" ");

        console.log("Profile Length:",profileText.length);

        /* ---------------- SKILLS ---------------- */

        const skills = extractSkills(profileText);

        console.log("Skills:",skills);

        /* ---------------- JOB CACHE ---------------- */

        let jobs = cache.get();

        if(!jobs){

            const result=

            await db.query(

                `
                SELECT *

                FROM jobs

                ORDER BY created_at DESC
                `
            );

            jobs=result.rows;

            cache.set(jobs);

        }

        console.log(

            "Jobs:",

            jobs.length

        );

        /* ---------------- NEXT PART ---------------- */
        /* ---------------- SCORE ALL JOBS ---------------- */

        const scoredJobs = jobs
            .map((job) => {

                const { score, matchedSkills } = scoreJob(job, skills);

                return {

                    ...job,

                    score,

                    matchedSkills

                };

            })

            .sort((a, b) => b.score - a.score);

        /* ---------------- FILTER JOBS ---------------- */

        const matchedJobs = scoredJobs.filter(

            (job) => job.score > 0

        );

        let recommendedJobs = [];

        let analysis = "";

        if (matchedJobs.length > 0) {

            recommendedJobs = matchedJobs.slice(0, 8);

            analysis =
                `Found ${matchedJobs.length} matching jobs based on your resume and profile.`;

        }

        else if (skills.length === 0) {

            recommendedJobs = scoredJobs.slice(0, 10);

            analysis =
                "Complete your profile and upload your resume to receive personalized recommendations.";

        }

        else {

            recommendedJobs = scoredJobs.slice(0, 5);

            analysis =
                "No exact skill matches found. Showing the closest available jobs.";

        }

        /* ---------------- MATCH PERCENTAGE ---------------- */

        recommendedJobs = recommendedJobs.map((job) => {

            let percent = 0;

            if (skills.length > 0) {

                percent = Math.round(

                    (job.matchedSkills.length / skills.length) * 100

                );

            }

            return {

                ...job,

                matchPercentage: Math.min(percent, 100)

            };

        });

        console.log("Recommended:", recommendedJobs.length);

        /* ---------------- RESPONSE ---------------- */

        res.json({

            success: true,

            analysis,

            skills,

            recommendedJobs

        });

    }

    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            msg: err.message

        });

    }

});
/* =====================================================
                MY APPLICATIONS
===================================================== */

router.get("/my-applications/:userId", async (req, res) => {

    try {

        const { userId } = req.params;

        const result = await db.query(

            `
            SELECT

                jobs.id,

                jobs.title,

                jobs.company,

                jobs.location,

                jobs.type,

                jobs.experience,

                jobs.salary,

                applications.id AS application_id,

                applications.status,

                applications.applied_at

            FROM applications

            INNER JOIN jobs

                ON jobs.id = applications.job_id

            WHERE applications.user_id = $1

            ORDER BY applications.applied_at DESC
            `,

            [userId]

        );

        res.json({

            success: true,

            applications: result.rows

        });

    }

    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            msg: err.message

        });

    }

});


/* =====================================================
                HEALTH CHECK
===================================================== */

router.get("/ping", (req, res) => {

    res.json({

        success: true,

        message: "Auth Routes Working Successfully 🚀"

    });

});


/* =====================================================
                CLEAR CACHE
===================================================== */

router.delete("/clear-cache", (req, res) => {

    cache.clear();

    res.json({

        success: true,

        message: "Job recommendation cache cleared."

    });

});


/* =====================================================
                EXPORT ROUTER
===================================================== */

module.exports = router;