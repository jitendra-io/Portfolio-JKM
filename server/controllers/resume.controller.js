const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const Resume  = require('../models/Resume');

// ── Uploads directory (served as static) ─────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'client', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Multer config ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const safeName = `resume_${Date.now()}.pdf`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed.'));
  },
});

// ── GET /api/resume — public ──────────────────────────────────────────
exports.getResume = async (_req, res) => {
  try {
    const resume = await Resume.findOne().sort({ uploadedAt: -1 });
    if (!resume) return res.json({ success: true, data: null });
    res.json({
      success: true,
      data: {
        url:          `/uploads/${resume.filename}`,
        originalName: resume.originalName,
        uploadedAt:   resume.uploadedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/resume — protected ─────────────────────────────────────
exports.uploadResume = [
  upload.single('resume'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

      // Remove old resume files from disk
      const oldResumes = await Resume.find();
      for (const old of oldResumes) {
        const oldPath = path.join(UPLOADS_DIR, old.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      await Resume.deleteMany({});

      const resume = await Resume.create({
        filename:     req.file.filename,
        originalName: req.file.originalname,
      });

      res.json({
        success: true,
        message: 'Resume uploaded successfully.',
        data: {
          url:          `/uploads/${resume.filename}`,
          originalName: resume.originalName,
          uploadedAt:   resume.uploadedAt,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
];

// ── DELETE /api/resume — protected ───────────────────────────────────
exports.deleteResume = async (_req, res) => {
  try {
    const resumes = await Resume.find();
    for (const r of resumes) {
      const filePath = path.join(UPLOADS_DIR, r.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await Resume.deleteMany({});
    res.json({ success: true, message: 'Resume deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
