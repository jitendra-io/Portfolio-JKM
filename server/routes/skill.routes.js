const express = require('express');
const router = express.Router();
const {
  getAllSkills,
  createSkill,
  updateSkill,
  deleteSkill,
} = require('../controllers/skill.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', getAllSkills);
router.post('/', authMiddleware, createSkill);
router.put('/:id', authMiddleware, updateSkill);
router.delete('/:id', authMiddleware, deleteSkill);

module.exports = router;
