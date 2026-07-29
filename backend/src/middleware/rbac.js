const { error } = require("../utils/response");

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if the authenticated user has the required permission module.
 * 
 * @param {string} requiredPermission - The permission string to check (e.g., 'operations', 'masters')
 */
const requirePermission = (requiredPermissions) => {
  // Ensure requiredPermissions is an array
  const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req, res, next) => {
    if (!req.user) {
      return error(res, { message: "Unauthorized", statusCode: 401 });
    }

    const role = (req.user.role || "").toLowerCase().replace(/\s+/g, '');
    if (role === 'superadmin' || req.user.email === 'admin@multimargcarriers.co.in') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    
    // Check if user has 'all' or ANY of the required permissions
    const hasAccess = userPermissions.includes('all') || perms.some(p => userPermissions.includes(p));
    
    if (hasAccess) {
      return next();
    }

    return error(res, { 
      message: `Forbidden: You do not have the required permissions (${perms.join(' or ')}).`, 
      statusCode: 403 
    });
  };
};

module.exports = { requirePermission };
