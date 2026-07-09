const express = require('express');
const router = express.Router();
const { login, verifyToken } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/login', login);
router.get('/verify', authMiddleware, verifyToken);

module.exports = router;
