require('dotenv').config();
const app = require('./server/app');
const connectDB = require('./server/config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Portfolio Server running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  MongoDB connected`);
    console.log(`\n📌 API Endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/projects`);
    console.log(`   GET  /api/skills`);
    console.log(`   POST /api/auth/login\n`);
  });
});
