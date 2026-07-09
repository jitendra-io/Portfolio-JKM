const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
    },
    level: {
      type: Number,
      required: [true, 'Proficiency level is required'],
      min: [0, 'Level must be at least 0'],
      max: [100, 'Level cannot exceed 100'],
    },
    category: {
      type: String,
      enum: ['frontend', 'backend', 'database', 'tools', 'other'],
      default: 'other',
    },
    icon: {
      type: String,
      default: 'devicon-nodejs-plain',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Skill', SkillSchema);
