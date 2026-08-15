const express = require("express");
const cors = require("cors");
const path = require("path");
const dns = require('dns');
const dotenv = require("dotenv");

// Fix ISP DNS and IPv6 routing issues causing MongoDB and Redis connection timeouts
// dns.setDefaultResultOrder('ipv4first');
// dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

// Load environment variables
dotenv.config();

// Import configs
const { logger } = require("./src/config/logger");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");
const { initAnalyticsCron } = require("./src/jobs/analyticsJob");
const { initCloudinaryCleanupCron } = require("./src/jobs/cloudinaryCleanupJob");
const socketUtil = require("./src/utils/socket");

// Import services (initialized on demand)
let redisClient = null;
let cloudinaryConfigured = false;

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Initialize Crons
initAnalyticsCron();
initCloudinaryCleanupCron();

// ============================================================
// Security Middleware
// ============================================================

// Helmet - secure HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: NODE_ENV === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://ui-avatars.com"],
        connectSrc: ["'self'", "http://localhost:*", "https://*"]
      }
    } : false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    xssFilter: true,
    frameguard: { action: 'deny' }
  }),
);

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://multimarg.vercel.app",
      "https://publicmultimarg.vercel.app",
      "https://multimargcarriers.co.in",
      "https://www.multimargcarriers.co.in",
      "https://multimarg.com",
      "https://www.multimarg.com",
      "https://app.multimarg.com",
      process.env.FRONTEND_ORIGIN,
      process.env.PUBLIC_FRONTEND_ORIGIN
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ============================================================
// Performance Middleware
// ============================================================

// Compression
app.use(compression());

// ============================================================
// Request Parsing
// ============================================================

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Data Sanitization against NoSQL query injection
// app.use(mongoSanitize()); // Disabled: Incompatible with Express 5 (req.query is read-only)

// Data Sanitization against XSS
// app.use(xss()); // Disabled: Incompatible with Express 5 (req.query is read-only)

// Prevent Parameter Pollution
app.use(hpp());

// Global Data Sanitization Middleware
// Ensures empty numeric fields default to 0 and empty/invalid date fields default to today
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
    const sanitizeObj = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
          sanitizeObj(obj[key]);
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach(item => {
            if (typeof item === "object" && item !== null) sanitizeObj(item);
          });
        } else {
          // Normalize amounts
          const numericKeys = ["amount", "charge", "rate", "weight", "box", "quantity", "value"];
          if (numericKeys.some(k => key.toLowerCase().includes(k))) {
            if (obj[key] === "" || obj[key] === null || obj[key] === undefined) {
              obj[key] = 0;
            } else if (typeof obj[key] === "string" && !isNaN(obj[key])) {
              obj[key] = Number(obj[key]);
            }
          }
          // Normalize dates
          if (key.toLowerCase().includes("date")) {
            const today = new Date().toISOString().split("T")[0];
            if (!obj[key] || obj[key] === "") {
              obj[key] = today;
            } else {
              // Ensure date is between 1947 and 2200
              const year = new Date(obj[key]).getFullYear();
              if (isNaN(year) || year < 1947 || year > 2200) {
                 obj[key] = today;
              }
            }
          }
        }
      }
    };
    sanitizeObj(req.body);
  }
  next();
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: NODE_ENV === "development" ? 10000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500),
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Strict Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);

// Smart Cache Headers per HTTP Method
app.use("/api", (req, res, next) => {
  if (req.method === "GET") {
    // Allow brief browser caching for GET requests to prevent duplicate fetches
    res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  } else {
    // No caching for mutations
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

// (Request parsing already configured above)

// ============================================================
// Logging
// ============================================================

app.use(
  morgan(NODE_ENV === "production" ? "combined" : "dev", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

// ============================================================
// Static Files
// ============================================================

app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

// ============================================================
// Import Routes
// ============================================================

const auditLogger = require("./src/middleware/auditLogger");
const { authenticateToken } = require("./src/middleware/auth");

const authRoutes = require("./src/routes/auth");
const dashboardRoutes = require("./src/routes/dashboard");
const clientsRoutes = require("./src/routes/clients");
const notificationsRoutes = require("./src/routes/notifications");
const vendorsRoutes = require("./src/routes/vendors");
const bookingsRoutes = require("./src/routes/bookings");
const branchesRoutes = require("./src/routes/branches");
const citiesRoutes = require("./src/routes/cities");
const ratesRoutes = require("./src/routes/rates");
const tripsRoutes = require("./src/routes/trips");
const billsRoutes = require("./src/routes/bills");
const cashRoutes = require("./src/routes/cash");
const reportsRoutes = require("./src/routes/reports");
const podRoutes = require("./src/routes/pod");
const purchasesRoutes = require("./src/routes/purchases");
const boxRoutes = require("./src/routes/box");
const vouchersRoutes = require("./src/routes/vouchers");
const trackingRoutes = require("./src/routes/tracking");
const outstandingRoutes = require("./src/routes/outstanding");
const vendorOutstandingRoutes = require("./src/routes/vendor-outstanding");
const misRoutes = require("./src/routes/mis");
const exportsRoutes = require("./src/routes/exports");
const csvRoutes = require("./src/routes/csvRoutes");
const emailRoutes = require("./src/routes/email");
const printRoutes = require("./src/routes/print");
const unbilledRoutes = require("./src/routes/unbilled");
const salesRoutes = require("./src/routes/sales");
const purchaseReportRoutes = require("./src/routes/purchase-report");
const usersRoutes = require("./src/routes/users");
const logsRoutes = require("./src/routes/logs");
const analyticsRoutes = require("./src/routes/analytics");
const searchRoutes = require("./src/routes/search");
const settingsRoutes = require("./src/routes/settings");
const tripMisRoutes = require("./src/routes/trip-mis");
const vendorMisRoutes = require("./src/routes/vendor-mis");
const trashRoutes = require("./src/routes/trash");
const contactsRoutes = require("./src/routes/contacts");
const cmsRoutes = require("./src/routes/cms");
const applicationsRoutes = require("./src/routes/applications");

// Public Routes
const publicTrackingRoutes = require("./src/routes/public/tracking");
const publicBranchRoutes = require("./src/routes/public/branch");
const publicPincodeRoutes = require("./src/routes/public/pincode");
const publicQuoteRoutes = require("./src/routes/public/quote");
const publicContactRoutes = require("./src/routes/public/contact");
const publicCmsRoutes = require("./src/routes/public/cms");
const publicApplicationsRoutes = require("./src/routes/public/applications");

// ============================================================
// Mount Public Routes
// ============================================================

// Health Check & Status
app.get(["/", "/api"], (req, res) => {
  res.json({
    success: true,
    message: "Multimarg Carriers Transport API",
    version: "2.0.0",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    services: {
      redis: redisClient ? "connected" : "disabled",
      cloudinary: cloudinaryConfigured ? "configured" : "disabled",
    },
  });
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

// Auth
app.use("/api/auth", authRoutes);

// ============================================================
// Public APIs (No Auth Required)
// ============================================================
app.use("/api/public/tracking", publicTrackingRoutes);
app.use("/api/public/branch", publicBranchRoutes);
app.use("/api/public/pincode", publicPincodeRoutes);
app.use("/api/public/quote", publicQuoteRoutes);
app.use("/api/public/contact", publicContactRoutes);
app.use("/api/public/cms", publicCmsRoutes);
app.use("/api/public/applications", publicApplicationsRoutes);

// ============================================================
// Global Authentication & Auditing Lockdown
// ============================================================
app.use("/api", authenticateToken);
app.use("/api", auditLogger);

// ============================================================
// Mount Protected Routes
// ============================================================
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/vendors", vendorsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/branches", branchesRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/rates", ratesRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/bills", billsRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/pod", podRoutes);
app.use("/api/purchases", purchasesRoutes);
app.use("/api/box", boxRoutes);
app.use("/api/vouchers", vouchersRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/outstanding", outstandingRoutes);
app.use("/api/vendor-outstanding", vendorOutstandingRoutes);
app.use("/api/mis", misRoutes);
app.use("/api/exports", exportsRoutes);
app.use("/api/csv", csvRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/print", printRoutes);
app.use("/api/unbilled", unbilledRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/purchase-report", purchaseReportRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/trip-mis", tripMisRoutes);
app.use("/api/vendor-mis", vendorMisRoutes);
app.use("/api/trash", trashRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/applications", applicationsRoutes);

const quotesRoutes = require("./src/routes/quotes");
app.use("/api/quotes", quotesRoutes);

// ============================================================
// Error Handling
// ============================================================

// 404 handler - must be after all routes
app.use(notFound);

// Global error handler - must be last
app.use(errorHandler);

// ============================================================
// Initialize Services & Start Server
// ============================================================

const { initMongo, db } = require("./src/config/database");

async function initializeServices() {
  try {
    await initMongo();
  } catch (err) {
    logger.warn("MongoDB initialization failed (continuing without DB):", err.message);
  }
  
  if (process.env.USE_REDIS === "true") {
    try {
      const redisModule = require("./src/config/redis");
      const result = await redisModule.initRedis();
      redisClient = result;
      logger.info("Redis initialized successfully.");
    } catch (err) {
      logger.warn("Redis initialization skipped:", err.message);
    }
  }

  if (process.env.USE_CLOUDINARY === "true") {
    try {
      const cloudinaryModule = require("./src/config/cloudinary");
      cloudinaryModule.initCloudinary();
      cloudinaryConfigured = true;
      logger.info("Cloudinary initialized successfully.");
    } catch (err) {
      logger.warn("Cloudinary initialization skipped:", err.message);
    }
  }
}

async function startServer() {
  await initializeServices();
  initAnalyticsCron();
  initCloudinaryCleanupCron();

  const server = app.listen(PORT, () => {
    // Initialize Socket.IO
    socketUtil.init(server);

    logger.info(`========================================`);
    logger.info(`  Multimarg Carriers Transport System`);
    logger.info(`  Environment: ${NODE_ENV}`);
    logger.info(`  Server: http://localhost:${PORT}`);
    logger.info(`  API: http://localhost:${PORT}/api`);
    logger.info(
      `  Redis: ${process.env.USE_REDIS === "true" ? "Enabled" : "Disabled"}`,
    );
    logger.info(
      `  Cloudinary: ${process.env.USE_CLOUDINARY === "true" ? "Enabled" : "Disabled"}`,
    );
    logger.info(
      `  Database: MongoDB`,
    );
    logger.info(`========================================`);
  });

  // Keep-alive self-ping to bypass Render 15-minute inactivity sleep
  // Render requires external traffic to keep the instance awake. Pinging localhost won't work.
  const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL;
  if (KEEP_ALIVE_URL) {
    setInterval(() => {
      const https = require("https");
      https.get(KEEP_ALIVE_URL, (res) => {
      if (res.statusCode === 200) {
        logger.info(`[Keep-Alive] Self-ping successful: ${res.statusCode}`);
      } else {
        logger.warn(`[Keep-Alive] Self-ping status code: ${res.statusCode}`);
      }
    }).on('error', (err) => {
        logger.error(`[Keep-Alive] Self-ping error: ${err.message}`);
      });
    }, 14 * 60 * 1000); // Every 14 minutes
  }

  // Daily cleanup of expired trash items
  setInterval(async () => {
    try {
      if (db && db.mongoDb) {
        const result = await db.mongoDb.collection('trash').deleteMany({ expiresAt: { $lt: new Date() } });
        if (result.deletedCount > 0) {
          logger.info(`[Trash Cleanup] Removed ${result.deletedCount} expired items.`);
        }
      }
    } catch (err) {
      logger.error(`[Trash Cleanup Error]: ${err.message}`);
    }
  }, 24 * 60 * 60 * 1000); // Every 24 hours

  // Graceful Shutdown
  process.on("SIGTERM", () => gracefulShutdown(server));
  process.on("SIGINT", () => gracefulShutdown(server));
}

function gracefulShutdown(server) {
  logger.info("Shutting down gracefully...");
  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

startServer();
