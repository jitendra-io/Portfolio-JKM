require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Project = require('./models/Project');
const Skill = require('./models/Skill');

const projects = [
  {
    title: 'Banking System API',
    description: 'Secure RESTful banking system with JWT auth, account management, and transaction handling.',
    longDescription: 'A full-featured banking system backend built with Node.js and Express. Features include user registration/login with JWT authentication, account management (savings, checking), fund transfers between accounts, transaction history with pagination, and secure password hashing with bcryptjs.',
    tech: ['Node.js', 'Express.js', 'MongoDB', 'JWT', 'bcryptjs', 'Mongoose'],
    githubUrl: 'https://github.com/jitendrakumarmishraa/banking-system',
    liveUrl: '',
    imageUrl: '',
    featured: true,
    category: 'backend',
    order: 1,
  },
  {
    title: 'Portfolio Website',
    description: 'Personal full-stack portfolio with dynamic project management via REST API and MongoDB.',
    longDescription: 'This very portfolio — built with Node.js/Express backend, MongoDB for dynamic data storage, and a stunning glassmorphism UI. Features an admin panel for adding/editing projects and skills without touching code.',
    tech: ['Node.js', 'Express.js', 'MongoDB', 'HTML', 'CSS', 'JavaScript'],
    githubUrl: 'https://github.com/jitendrakumarmishraa/portfolio-2026',
    liveUrl: '',
    imageUrl: '',
    featured: true,
    category: 'fullstack',
    order: 2,
  },
  {
    title: 'E-Commerce REST API',
    description: 'Scalable e-commerce backend with product catalog, cart, orders, and payment integration.',
    longDescription: 'A production-ready e-commerce API featuring user authentication, product CRUD with image uploads, shopping cart management, order processing, and Stripe payment integration. Built with clean architecture and comprehensive error handling.',
    tech: ['Node.js', 'Express.js', 'MongoDB', 'Stripe', 'Cloudinary', 'JWT'],
    githubUrl: 'https://github.com/jitendrakumarmishraa',
    liveUrl: '',
    imageUrl: '',
    featured: true,
    category: 'backend',
    order: 3,
  },
  {
    title: 'Task Manager App',
    description: 'A real-time task management app with drag-and-drop, priorities, and team collaboration.',
    longDescription: 'A full-stack task management application inspired by Trello. Features include Kanban board with drag-and-drop, task priorities and deadlines, team workspaces, real-time updates with Socket.io, and email notifications.',
    tech: ['React.js', 'Node.js', 'Socket.io', 'MongoDB', 'Express.js'],
    githubUrl: 'https://github.com/jitendrakumarmishraa',
    liveUrl: '',
    imageUrl: '',
    featured: false,
    category: 'fullstack',
    order: 4,
  },
];

const skills = [
  // Backend
  { name: 'Node.js', level: 90, category: 'backend', icon: 'devicon-nodejs-plain', order: 1 },
  { name: 'Express.js', level: 88, category: 'backend', icon: 'devicon-express-original', order: 2 },
  { name: 'REST API Design', level: 85, category: 'backend', icon: 'devicon-fastapi-plain', order: 3 },
  { name: 'JWT & Auth', level: 82, category: 'backend', icon: 'devicon-nodejs-plain', order: 4 },

  // Database
  { name: 'MongoDB', level: 88, category: 'database', icon: 'devicon-mongodb-plain', order: 1 },
  { name: 'Mongoose ODM', level: 85, category: 'database', icon: 'devicon-mongodb-plain', order: 2 },
  { name: 'MySQL', level: 70, category: 'database', icon: 'devicon-mysql-plain', order: 3 },

  // Frontend
  { name: 'HTML5', level: 92, category: 'frontend', icon: 'devicon-html5-plain', order: 1 },
  { name: 'CSS3', level: 85, category: 'frontend', icon: 'devicon-css3-plain', order: 2 },
  { name: 'JavaScript', level: 88, category: 'frontend', icon: 'devicon-javascript-plain', order: 3 },
  { name: 'React.js', level: 75, category: 'frontend', icon: 'devicon-react-original', order: 4 },

  // Tools
  { name: 'Git & GitHub', level: 88, category: 'tools', icon: 'devicon-git-plain', order: 1 },
  { name: 'Postman', level: 85, category: 'tools', icon: 'devicon-postman-plain', order: 2 },
  { name: 'VS Code', level: 95, category: 'tools', icon: 'devicon-vscode-plain', order: 3 },
  { name: 'Docker', level: 60, category: 'tools', icon: 'devicon-docker-plain', order: 4 },
];

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding database...\n');

    // Clear existing data
    await Project.deleteMany({});
    await Skill.deleteMany({});
    console.log('✅ Cleared existing projects and skills');

    // Insert new data
    const createdProjects = await Project.insertMany(projects);
    const createdSkills = await Skill.insertMany(skills);

    console.log(`✅ Inserted ${createdProjects.length} projects`);
    console.log(`✅ Inserted ${createdSkills.length} skills`);
    console.log('\n🎉 Database seeded successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seed();
