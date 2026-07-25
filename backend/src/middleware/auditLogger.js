const { logger } = require("../config/logger");

/**
 * Audit Logging Middleware
 * Intercepts mutating requests (POST, PUT, PATCH, DELETE) and logs the action
 * along with the identity of the user performing it.
 */
const auditLogger = (req, res, next) => {
  // Only track mutating requests to avoid spamming the log with GET reads
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    
    // Wait for the response to finish so that any downstream auth middleware
    // (like authenticateToken) has time to populate req.user
    res.on('finish', () => {
      // Only log if the user was successfully authenticated
      if (req.user) {
        const empCode = req.user.employeeCode || req.user.id || 'Unknown';
        const name = req.user.name || 'Unknown User';
        
        // Determine logical action
        let action = req.method;
        if (req.method === 'POST') action = 'Created';
        if (req.method === 'PUT' || req.method === 'PATCH') action = 'Updated';
        if (req.method === 'DELETE') action = 'Deleted';

        // Attempt to extract the entity name from the URL path
        // e.g., /api/bookings -> booking, /api/auth/profile/update -> auth profile
        const segments = req.originalUrl.split('?')[0].split('/').filter(Boolean);
        // Typically segments are: ['api', 'bookings', ...]
        let entity = 'record';
        if (segments.length >= 2 && segments[0] === 'api') {
          entity = segments.slice(1, 3).join(' ');
        }

        // Format and dispatch the log
        const message = `[AUDIT] User ${name} (${empCode}) ${action} a ${entity} via ${req.method} ${req.originalUrl}`;
        
        // Log as INFO with audit tag so it gets pushed to db
        logger.info(message, { type: 'audit', user: empCode, action: req.method });
      }
    });
  }
  
  next();
};

module.exports = auditLogger;
