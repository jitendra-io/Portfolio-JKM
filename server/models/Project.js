const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Short description is required'],
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    longDescription: {
      type: String,
      trim: true,
    },
    tech: {
      type: [String],
      required: [true, 'Tech stack is required'],
    },
    githubUrl: {
      type: String,
      trim: true,
      default: '',
    },
    liveUrl: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ['fullstack', 'frontend', 'backend', 'other'],
      default: 'fullstack',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', ProjectSchema);
