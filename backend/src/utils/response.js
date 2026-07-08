/**
 * Standardized API Response Helpers
 * Ensures consistent response format across all endpoints
 */

/**
 * Send a success response
 * @param {object} res - Express response object
 * @param {object} options
 * @param {number} options.statusCode - HTTP status code (default: 200)
 * @param {string} options.message - Success message
 * @param {*} options.data - Response data
 * @param {object} options.meta - Additional metadata (pagination, etc.)
 */
function success(res, optionsOrMessage, dataParam = null, metaParam = null) {
  let options = {};
  if (typeof optionsOrMessage === "string") {
    options = { message: optionsOrMessage, data: dataParam, meta: metaParam };
  } else {
    options = optionsOrMessage || {};
  }
  const { statusCode = 200, message = "Success", data = null, meta = null } = options;

  const response = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) response.data = data;
  if (meta !== null && meta !== undefined) response.meta = meta;

  return res.status(statusCode).json(response);
}

/**
 * Send a created (201) response
 * @param {object} res - Express response object
 * @param {object} options
 * @param {string} options.message - Success message
 * @param {*} options.data - Created resource data
 */
function created(res, optionsOrMessage, dataParam = null) {
  let options = {};
  if (typeof optionsOrMessage === "string") {
    options = { message: optionsOrMessage, data: dataParam };
  } else {
    options = optionsOrMessage || {};
  }
  options.statusCode = 201;
  return success(res, options);
}

/**
 * Send a paginated response
 * @param {object} res - Express response object
 * @param {object} options
 * @param {Array} options.data - Array of items
 * @param {number} options.total - Total number of items
 * @param {number} options.page - Current page number
 * @param {number} options.limit - Items per page
 */
function paginated(res, { data = [], total = 0, page = 1, limit = 50 } = {}) {
  const totalPages = Math.ceil(total / limit) || 1;

  return success(res, {
    message: "Success",
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {object} options
 * @param {number} options.statusCode - HTTP status code (default: 500)
 * @param {string} options.message - Error message
 * @param {*} options.details - Error details
 */
function error(res, optionsOrMessage, statusCodeParam, detailsParam = null) {
  let options = {};
  if (typeof optionsOrMessage === "string") {
    options = { 
      message: optionsOrMessage, 
      statusCode: statusCodeParam || 500, 
      details: detailsParam 
    };
  } else {
    options = optionsOrMessage || {};
  }
  const { statusCode = 500, message = "Internal server error", details = null } = options;

  const response = {
    success: false,
    message,
  };

  if (details !== null && details !== undefined) response.details = details;

  return res.status(statusCode).json(response);
}

module.exports = { success, created, paginated, error };
