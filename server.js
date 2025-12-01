// server.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// --------- Basic config ---------
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "site-content.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const ADMIN_KEY = process.env.ADMIN_KEY || "change-me";

// Ensure folders exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// --------- Initial default content ---------
const defaultContent = {
  about: {
    tagline: "Professional tagline",
    headline: "Bold, unapologetic and unforgettable.",
    intro:
      "Use this area for a concise intro blurb. Explain who you are, what you offer, and why clients should want to work with you.",
    paragraphs: [
      "Use this section to tell your story in a little more depth.",
      "Mention your personality, boundaries, strengths, and how you want clients to feel.",
    ],
    meta: {
      baseCity: "Your City, ST",
      bookingStyle: "Pre-booked only",
      sessionLength: "1–4 hours (longer by request)",
      note: "Screening required for new clients",
    },
    tags: ["Blunt but kind", "Low drama", "Straightforward", "Respect is non-negotiable"],
  },
  services: [
    {
      id: "standard",
      name: "Standard session",
      duration: "60 minutes",
      rate: "$XXX",
      description:
        "Brief description of what’s included in a standard session: your energy, boundaries, and expectations.",
    },
    {
      id: "extended",
      name: "Extended session",
      duration: "90–120 minutes",
      rate: "$XXX–$XXX",
      description:
        "Longer time together, slower pace, and space to actually relax.",
    },
    {
      id: "evening",
      name: "Evening / long-form booking",
      duration: "3+ hours",
      rate: "Custom",
      description:
        "Dinner, events, or longer experiences. Outline your minimum, typical structure, and any special considerations.",
    },
  ],
  availability: {
    weekly: [
      { label: "Mon – Thu", time: "Evenings only", status: "limited" },
      { label: "Fri – Sat", time: "Afternoon & evening", status: "open" },
      { label: "Sunday", time: "By special request", status: "unavailable" },
    ],
    note:
      "This is just a visual guide. Confirmed times are always shared privately after screening.",
    instructions:
      "Example: For safety and boundaries, I do not meet same-day requests from new clients.",
  },
  photos: [
    // will be filled with uploaded photo objects: { id, url, label, position }
  ],
  contact: {
    email: "youremail@example.com",
    preferredFirstContact:
      "Email with basic screening info. No explicit or graphic messages.",
    responseTime: "Within 24–48 hours for respectful, complete inquiries.",
  },
};

// --------- Helpers for reading/writing content JSON ---------
function readContent() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultContent, null, 2));
    return defaultContent;
  }
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error parsing content JSON, resetting to default:", e);
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultContent, null, 2));
    return defaultContent;
  }
}

function writeContent(content) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(content, null, 2));
}

// --------- Middleware ---------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, "public")));

// Simple admin auth middleware
function requireAdminKey(req, res, next) {
  const key =
    req.headers["x-admin-key"] ||
    req.query.adminKey ||
    req.body.adminKey;

  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized: invalid admin key" });
  }
  next();
}

// --------- Multer config for uploads ---------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, "_");
    const unique = Date.now();
    cb(null, `${base}_${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// --------- API ROUTES ---------

// Get all content (public)
app.get("/api/content", (req, res) => {
  const content = readContent();
  res.json(content);
});

// Get one section (public)
app.get("/api/content/:section", (req, res) => {
  const content = readContent();
  const section = content[req.params.section];
  if (!section) {
    return res.status(404).json({ error: "Section not found" });
  }
  res.json(section);
});

// Update full section (admin)
app.put("/api/content/:section", requireAdminKey, (req, res) => {
  const content = readContent();
  const section = req.params.section;
  if (!Object.prototype.hasOwnProperty.call(content, section)) {
    return res.status(404).json({ error: "Section not found" });
  }

  content[section] = req.body;
  writeContent(content);
  res.json({ status: "ok", section: content[section] });
});

// Photos list (public)
app.get("/api/photos", (req, res) => {
  const content = readContent();
  res.json(content.photos || []);
});

// Upload photo (admin)
app.post(
  "/api/photos",
  requireAdminKey,
  upload.single("photo"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const label = req.body.label || "Photo";
    const content = readContent();

    const id = req.file.filename;
    const url = `/uploads/${req.file.filename}`;

    const photoObj = {
      id,
      url,
      label,
      position: parseInt(req.body.position || "0", 10),
    };

    if (!Array.isArray(content.photos)) content.photos = [];
    content.photos.push(photoObj);
    // sort by position so you can control order
    content.photos.sort((a, b) => (a.position || 0) - (b.position || 0));

    writeContent(content);

    res.json({ status: "ok", photo: photoObj });
  }
);

// Delete photo (admin)
app.delete("/api/photos/:id", requireAdminKey, (req, res) => {
  const content = readContent();
  const id = req.params.id;

  const index = content.photos.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Photo not found" });
  }

  // delete file
  const filePath = path.join(UPLOADS_DIR, content.photos[index].id);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  content.photos.splice(index, 1);
  writeContent(content);

  res.json({ status: "ok" });
});

// Simple health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Fallback: serve index.html for root if you want single-page feel
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------- Start server ---------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Admin key:", ADMIN_KEY === "change-me" ? "(default – CHANGE THIS!)" : "(from .env)");
});
