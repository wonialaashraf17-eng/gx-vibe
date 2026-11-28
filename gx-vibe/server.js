require("dotenv").config();
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});
const app = express();
app.set("trust proxy", 1);
const port = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      mediaSrc: ["'self'", "https://res.cloudinary.com", "blob:"]
    }
  }
}));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "GX Vibe server is running"
  });
});

const allowedTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const maxUploadBytes = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 250)) * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadBytes,
    files: 1
  },
  fileFilter: (_req, file, cb) =>
    cb(null, allowedTypes.has(file.mimetype))
});

function makeToken(user) {
  return jwt.sign({ sub: String(user.id), username: user.username }, secret, { expiresIn: "7d" });
}
function setAuthCookie(res, token) {
  res.cookie("gxv_session", token, {
    httpOnly: true, secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000, path: "/"
  });
}
async function auth(req, res, next) {
  try {
    const token = req.cookies.gxv_session;

    if (!token) {
      return res.status(401).json({ error: "Please sign in." });
    }

    const payload = jwt.verify(token, secret);

    const result = await pool.query(
      "SELECT id, username, display_name, bio, is_admin FROM users WHERE id=$1",
      [payload.sub]
    );

    if (!result.rowCount) {
      return res.status(401).json({
        error: "Session is no longer valid."
      });
    }

    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({
      error: "Please sign in again."
    });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies.gxv_session;

    if (!token) {
      req.user = null;
      return next();
    }

    const payload = jwt.verify(token, secret);

    const result = await pool.query(
      "SELECT id, username, display_name, is_admin FROM users WHERE id=$1",
      [payload.sub]
    );

    req.user = result.rowCount ? result.rows[0] : null;
    next();
  } catch {
    req.user = null;
    next();
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.is_admin !== true) {
    return res.status(403).json({
      error: "Administrator access required."
    });
  }

  next();
}
    const token = req.cookies.gxv_session;
    if (!token) return res.status(401).json({ error: "Please sign in." });
    const payload = jwt.verify(token, secret);
    const result = await pool.query(
      "SELECT id, username, display_name, bio FROM users WHERE id=$1", [payload.sub]
    );
    if (!result.rowCount) return res.status(401).json({ error: "Session is no longer valid." });
    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ error: "Please sign in again." });
  }
}
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies.gxv_session;

    if (!token) {
      req.user = null;
      return next();
    }

    const payload = jwt.verify(token, secret);

    const result = await pool.query(
      "SELECT id, username, display_name FROM users WHERE id=$1",
      [payload.sub]
    );

    req.user = result.rowCount ? result.rows[0] : null;
    next();
  } catch {
    req.user = null;
    next();
  }
}
function cleanText(value, max) {
  return String(value || "").trim().slice(0, max);
}
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again later."
  }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many registration attempts. Please try again later."
  }
});
app.get("/api/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true, service: "GX Vibe" }); }
  catch { res.status(503).json({ ok: false, error: "Database unavailable" }); }
});
app.post("/api/auth/register", registerLimiter, async (req, res) => {
  try {
    const username = cleanText(req.body.username, 24).toLowerCase();
    const email = cleanText(req.body.email, 255).toLowerCase();
    const displayName = cleanText(req.body.displayName || username, 60);
    const password = String(req.body.password || "");
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return res.status(400).json({ error: "Username must be 3–24 letters, numbers or underscores." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 10) return res.status(400).json({ error: "Use a password with at least 10 characters." });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users(username,email,password_hash,display_name) VALUES($1,$2,$3,$4) RETURNING id,username,display_name,bio",
      [username, email, hash, displayName]
    );
    setAuthCookie(res, makeToken(result.rows[0]));
    res.status(201).json({ user: result.rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "That username or email is already registered." });
    console.error(e); res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const login = cleanText(req.body.login, 255).toLowerCase();
    const result = await pool.query(
      "SELECT id,username,display_name,bio,password_hash FROM users WHERE username=$1 OR email=$1", [login]
    );
    if (!result.rowCount || !(await bcrypt.compare(String(req.body.password || ""), result.rows[0].password_hash))) {
      return res.status(401).json({ error: "Incorrect username/email or password." });
    }
    const user = result.rows[0];
    setAuthCookie(res, makeToken(user));
    delete user.password_hash;
    res.json({ user });
  } catch (e) { console.error(e); res.status(500).json({ error: "Could not sign in." }); }
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("gxv_session", { httpOnly: true, secure: process.env.COOKIE_SECURE === "true", sameSite: "lax", path: "/" });
  res.json({ ok: true });
});
app.get("/api/me", auth, (req, res) => res.json({ user: req.user }));

app.get("/api/videos", optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20));

    const result = await pool.query(
      `SELECT
          v.id,
          v.title,
          v.description,
          v.storage_url,
          v.mime_type,
          v.size_bytes,
          v.created_at,
          u.username,
          u.display_name,
          (SELECT COUNT(*)
           FROM video_likes vl
           WHERE vl.video_id = v.id) AS like_count,
          EXISTS (
            SELECT 1
            FROM video_likes vl
            WHERE vl.video_id = v.id
              AND vl.user_id = $2
          ) AS liked
       FROM videos v
       JOIN users u ON u.id = v.user_id
       ORDER BY v.created_at DESC
       LIMIT $1`,
      [limit, req.user?.id || null]
    );

    res.json({ videos: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load videos." });
  }
});
app.get("/api/videos/:id/comments", optionalAuth, async (req, res) => {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isSafeInteger(videoId) || videoId < 1) {
      return res.status(400).json({ error: "Invalid video." });
    }

    const result = await pool.query(
      `SELECT
          c.id,
          c.user_id,
          c.content,
          c.created_at,
          u.username,
          u.display_name,
          (c.user_id = $2) AS is_mine
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.video_id = $1
       ORDER BY c.created_at ASC
       LIMIT 100`,
      [videoId, req.user?.id || null]
    );

    res.json({ comments: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not load comments." });
  }
});

app.post("/api/videos/:id/comments", auth, async (req, res) => {
  try {
    const videoId = Number(req.params.id);
    const content = cleanText(req.body.content, 1000);

    if (!Number.isSafeInteger(videoId) || videoId < 1) {
      return res.status(400).json({ error: "Invalid video." });
    }

    if (!content) {
      return res.status(400).json({ error: "Comment cannot be empty." });
    }

    const video = await pool.query(
      "SELECT id FROM videos WHERE id=$1",
      [videoId]
    );

    if (!video.rowCount) {
      return res.status(404).json({ error: "Video not found." });
    }

    const result = await pool.query(
      `INSERT INTO comments (user_id, video_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [req.user.id, videoId, content]
    );

    res.status(201).json({ comment: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not post comment." });
  }
});
app.delete("/api/comments/:commentId", auth, async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);

    if (!Number.isSafeInteger(commentId) || commentId < 1) {
      return res.status(400).json({ error: "Invalid comment." });
    }

    const result = await pool.query(
      `DELETE FROM comments
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [commentId, req.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: "Comment not found or you cannot delete it."
      });
    }

    res.json({ deleted: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not delete comment." });
  }
});
app.post("/api/comments/:commentId/report", auth, async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);

    if (!Number.isSafeInteger(commentId) || commentId < 1) {
      return res.status(400).json({ error: "Invalid comment." });
    }

    const reason = cleanText(req.body.reason, 100);

    const allowedReasons = [
      "Spam",
      "Harassment or bullying",
      "Inappropriate content",
      "Other"
    ];

    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({ error: "Invalid report reason." });
    }

    const comment = await pool.query(
      "SELECT id FROM comments WHERE id=$1",
      [commentId]
    );

    if (!comment.rowCount) {
      return res.status(404).json({ error: "Comment not found." });
    }

    const result = await pool.query(
      `INSERT INTO comment_reports (comment_id, reporter_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (comment_id, reporter_id) DO NOTHING
       RETURNING id`,
      [commentId, req.user.id, reason]
    );

    if (!result.rowCount) {
      return res.status(409).json({
        error: "You have already reported this comment."
      });
    }

    res.status(201).json({ reported: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not report comment." });
  }
});
app.get("/api/admin/comment-reports", auth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          cr.id AS report_id,
          cr.reason,
          cr.status,
          cr.created_at AS report_created_at,
          cr.reviewed_at,
          c.id AS comment_id,
          c.content AS comment_content,
          c.created_at AS comment_created_at,
          comment_user.username AS comment_author,
          reporter.username AS reporter_username
       FROM comment_reports cr
       JOIN comments c ON c.id = cr.comment_id
       JOIN users comment_user ON comment_user.id = c.user_id
       JOIN users reporter ON reporter.id = cr.reporter_id
       ORDER BY cr.created_at DESC
       LIMIT 100`
    );

    res.json({ reports: result.rows });
  } catch (e) {
    console.error("Admin reports error:", e);
    res.status(500).json({
      error: "Could not load moderation reports."
    });
  }
});
app.post("/api/videos/:id/like",
  (req, res, next) => {
    console.log("LIKE REQUEST RECEIVED", req.params.id);
    next();
  },
  auth,
  async (req, res) => {
    try {
      const videoId = Number(req.params.id);

      if (!Number.isSafeInteger(videoId) || videoId < 1) {
        return res.status(400).json({ error: "Invalid video." });
      }

      const result = await pool.query(
        `INSERT INTO video_likes (user_id, video_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, video_id) DO NOTHING
         RETURNING id`,
        [req.user.id, videoId]
      );

      if (result.rowCount) {
        return res.json({ liked: true });
      }

      await pool.query(
        "DELETE FROM video_likes WHERE user_id=$1 AND video_id=$2",
        [req.user.id, videoId]
      );

      res.json({ liked: false });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Could not update like." });
    }
  }
);

app.post("/api/videos", auth, (req, res, next) => {
  upload.single("video")(req, res, (err) => {
console.log("LIKE ROUTE REACHED", req.params.id, req.user?.id);
    if (err) {
      return res.status(400).json({
        error: err.code === "LIMIT_FILE_SIZE"
          ? "Video exceeds the configured upload size."
          : "Upload failed. Use MP4, WebM or MOV."
      });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Choose a supported video file."
    });
  }

  try {
    const title = cleanText(req.body.title, 120);
    const description = cleanText(req.body.description, 500);

    if (!title) {
      return res.status(400).json({
        error: "Add a video title."
      });
    }

    const cloudResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "gx-vibe/videos"
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    const url = cloudResult.secure_url;

    const result = await pool.query(
      `INSERT INTO videos
      (user_id,title,description,storage_url,
       original_filename,mime_type,size_bytes)
      VALUES($1,$2,$3,$4,$5,$6,$7)
      RETURNING id,title,description,storage_url,
      mime_type,size_bytes,created_at`,
      [
        req.user.id,
        title,
        description,
        url,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      ]
    );

    res.status(201).json({ video: result.rows[0] });

  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "Could not upload or save video."
    });
  }
});

app.post("/api/videos/:id/report", auth, async (req, res) => {
  try {
    const videoId = Number(req.params.id);
    if (!Number.isSafeInteger(videoId) || videoId < 1) return res.status(400).json({ error: "Invalid video." });
    const reason = cleanText(req.body.reason, 80);
    if (!["spam","harassment","unsafe","copyright","other"].includes(reason)) return res.status(400).json({ error: "Choose a report reason." });
    await pool.query(
      "INSERT INTO reports(reporter_id,video_id,reason,details) VALUES($1,$2,$3,$4)",
      [req.user.id, videoId, reason, cleanText(req.body.details, 500)]
    );
    res.status(201).json({ ok: true, message: "Report received for review." });
  } catch (e) { console.error(e); res.status(500).json({ error: "Could not submit report." }); }
});

app.get("/api/ai/status", (_req, res) => {
  res.json({ available: false, message: "AI services are not connected yet. The Creative Studio interface is a planned integration." });
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(port, () => console.log(`GX Vibe running on port ${port}`));
