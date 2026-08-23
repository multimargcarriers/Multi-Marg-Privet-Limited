/**
 * Root Server Entry Point for Hostinger Node.js Web App Deployment
 * This delegates execution to the backend/server.js Express application.
 */
const path = require('path');

// Change working directory to backend so relative paths and dotenv work seamlessly
process.chdir(path.join(__dirname, 'backend'));

// Execute the backend server
require('./backend/server.js');
