/**
 * Root Server Entry Point for Hostinger Node.js Web App Deployment
 * With Comprehensive Startup Logging & Global Error Handlers
 */
const path = require('path');

console.log('====================================================');
console.log('[Hostinger Boot] Starting Node.js Root Entrypoint...');
console.log(`[Hostinger Boot] Node Version: ${process.version}`);
console.log(`[Hostinger Boot] Current Directory: ${__dirname}`);
console.log(`[Hostinger Boot] Target Backend Directory: ${path.join(__dirname, 'backend')}`);
console.log('====================================================');

// Global Uncaught Exception & Promise Rejection Handlers
process.on('uncaughtException', (err) => {
  console.error('[FATAL UNCAUGHT EXCEPTION]:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL UNHANDLED REJECTION]:', reason && reason.stack ? reason.stack : reason);
});

try {
  const backendDir = path.join(__dirname, 'backend');
  const backendServerPath = path.join(backendDir, 'server.js');
  
  console.log(`[Hostinger Boot] Changing process directory to: ${backendDir}`);
  process.chdir(backendDir);
  
  console.log(`[Hostinger Boot] Requiring backend server from: ${backendServerPath}`);
  require(backendServerPath);
  console.log('[Hostinger Boot] Backend server module loaded successfully.');
} catch (bootErr) {
  console.error('[CRITICAL BOOT ERROR] Failed to start backend from root server.js:');
  console.error(bootErr && bootErr.stack ? bootErr.stack : bootErr);
}
