const express = require('express');
const router  = express.Router();
const { getResume, uploadResume, deleteResume } = require('../controllers/resume.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/',    getResume);
router.post('/',   authMiddleware, uploadResume);
router.delete('/', authMiddleware, deleteResume);

module.exports = router;
