const path = require('path');

// Load environment variables before anything else
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { testConnection } = require('./config/db');

const { startScheduler } = require('./jobs/notificationScheduler');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Test database connection
  await testConnection();

  // Start notification scheduler
  startScheduler();

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`[Server] Server is running on port ${PORT}`);
    console.log(`[Server] Health check available at: http://localhost:${PORT}/api/health`);
  });
};

startServer();
