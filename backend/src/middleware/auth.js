/**
 * Authentication Middleware
 * Verifies JWT tokens for protected routes
 */

const jwt = require("jsonwebtoken");
const { getCache } = require("../config/redis");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables. Refusing to start.");
  process.exit(1);
}

/**
 * Middleware to verify JWT token from Authorization header
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check for temporary ban (Force Logout)
    try {
      const isBanned = await getCache(`banned:${decoded.id}`);
      if (isBanned) {
        return res.status(403).json({
          success: false,
          message: "Your session has been terminated and account temporarily locked for 3 minutes by Supreme Admin."
        });
      }
    } catch (cacheErr) {
      console.error("[Auth] Redis ban check error:", cacheErr.message);
    }

    req.user = decoded;
    next();
    } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
}

/**
 * Optional auth - attaches user if token present, but doesn't block
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token invalid, continue without user
    }
  }
  next();
}

/**
 * Generate JWT token
 * @param {object} payload - Data to encode in token
 * @returns {string} JWT token
 */
function generateToken(payload) {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = { authenticateToken, optionalAuth, generateToken };
