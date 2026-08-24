const { error } = require("../utils/response");

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if the authenticated user has the required permission module.
 * 
 * @param {string} requiredPermission - The permission string to check (e.g., 'operations', 'masters')
 */
const PERMISSION_PARENTS = {
  // Masters
  'clients': 'masters',
  'clients_data': 'masters',
  'branches': 'masters',
  'branches_data': 'masters',
  'cities': 'masters',
  'cities_data': 'masters',
  'vendors': 'masters',
  'vendors_data': 'masters',
  
  // Rates
  'client_rates': 'rates',
  'client_rates_data': 'rates',
  
  // Operations
  'bookings': 'operations',
  'create_booking': 'operations',
  'trips': 'operations',
  'tripmis': 'operations',
  'vendormis': 'operations',
  'track_shipment': 'operations',
  'update_tracking': 'operations',
  'pod': 'operations',
  
  // Billing
  'all_bills': 'billing',
  'generate_bills': 'billing',
  'misc_bill': 'billing',
  'update_bill': 'billing',
  
  // Accounts
  'cash_sheet': 'accounts',
  'purchases': 'accounts',
  
  // Reports
  'analytics': 'reports',
  'gst_reports': 'reports',
  'mis_reports': 'reports',
  'unbilled_reports': 'reports',
  'sales_reports': 'reports',
  'purchase_reports': 'reports',
  'cashsheet_reports': 'reports',
  'client_trip_reports': 'reports',
  
  // Uploads
  'upload_box': 'uploads',
  'upload_vouchers': 'uploads'
};

const requirePermission = (requiredPermissions) => {
  // Ensure requiredPermissions is an array
  const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req, res, next) => {
    if (!req.user) {
      return error(res, { message: "Unauthorized", statusCode: 401 });
    }

    const role = (req.user.role || "").toLowerCase().replace(/\s+/g, '');
    if (role === 'superadmin' || req.user.email === 'admin@multimarg.com') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    
    // Check if user has 'all' or ANY of the required permissions (or their parents)
    const hasAccess = userPermissions.includes('all') || perms.some(p => {
      if (userPermissions.includes(p)) return true;
      const parent = PERMISSION_PARENTS[p];
      if (parent && userPermissions.includes(parent)) return true;
      return false;
    });
    
    if (hasAccess) {
      return next();
    }

    console.warn(`[RBAC Blocked] User ${req.user.email} (Role: ${req.user.role}) lacks permissions. Required one of: ${perms.join(', ')}. User has: ${userPermissions.join(', ')}`);

    return error(res, { 
      message: `Forbidden: You do not have the required permissions (${perms.join(' or ')}).`, 
      statusCode: 403 
    });
  };
};

module.exports = { requirePermission };
