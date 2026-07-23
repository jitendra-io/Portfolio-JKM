const express = require('express');
const router  = express.Router();
const {
  createMessage,
  getAllMessages,
  markAsRead,
  deleteMessage,
  replyToMessage,
} = require('../controllers/message.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public
router.post('/', createMessage);

// Protected (admin only)
router.get('/',              authMiddleware, getAllMessages);
router.patch('/:id/read',   authMiddleware, markAsRead);
router.post('/:id/reply',   authMiddleware, replyToMessage);
router.delete('/:id',       authMiddleware, deleteMessage);

module.exports = router;

