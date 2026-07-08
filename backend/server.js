const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

// Load environment variables
dotenv.config();

// Import configs
const { logger } = require("./src/config/logger");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");

// Import services (initialized on demand)
let redisClient = null;
let cloudinaryConfigured = false;

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ============================================================
// Security Middleware
// ============================================================

// Helmet - secure HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: NODE_ENV === "production" ? undefined : false,
  }),
);

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
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

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: NODE_ENV === "development" ? 10000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100),
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Prevent browser caching for all API routes
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// ============================================================
// Request Parsing
// ============================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================================
// Import Routes
// ============================================================

const authRoutes = require("./src/routes/auth");
const dashboardRoutes = require("./src/routes/dashboard");
const clientsRoutes = require("./src/routes/clients");
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
const emailRoutes = require("./src/routes/email");
const printRoutes = require("./src/routes/print");
const unbilledRoutes = require("./src/routes/unbilled");
const salesRoutes = require("./src/routes/sales");
const purchaseReportRoutes = require("./src/routes/purchase-report");
const usersRoutes = require("./src/routes/users");
const logsRoutes = require("./src/routes/logs");

// ============================================================
// Mount Routes
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
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
app.use("/api/email", emailRoutes);
app.use("/api/print", printRoutes);
app.use("/api/unbilled", unbilledRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/purchase-report", purchaseReportRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/logs", logsRoutes);

// ============================================================
// Health Check & Status
// ============================================================

app.get("/", (req, res) => {
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

async function initializeServices() {
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

  const server = app.listen(PORT, () => {
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
      `  Firebase: ${process.env.USE_FIREBASE === "true" ? "Enabled" : "Mock DB"}`,
    );
    logger.info(`========================================`);
  });

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
