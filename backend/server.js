const express = require("express");
const cors = require("cors");
const path = require("path");
const dns = require('dns');
const dotenv = require("dotenv");

// Fix ISP DNS and IPv6 routing issues causing MongoDB and Redis connection timeouts
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

console.log("====================================================");
console.log(`[Hostinger Backend Init] Node.js Version: ${process.version}`);
console.log(`[Hostinger Backend Init] Environment: ${NODE_ENV}`);
console.log(`[Hostinger Backend Init] Configured Port: ${PORT}`);
console.log(`[Hostinger Backend Init] Working Dir: ${process.cwd()}`);
console.log(`[Hostinger Backend Init] MONGODB_URI: ${process.env.MONGODB_URI ? "EXISTS (Length: " + process.env.MONGODB_URI.length + ")" : "MISSING / NOT SET!"}`);
console.log(`[Hostinger Backend Init] JWT_SECRET: ${process.env.JWT_SECRET ? "EXISTS" : "MISSING / NOT SET!"}`);
console.log(`[Hostinger Backend Init] REDIS: ${process.env.USE_REDIS === "true" ? "ENABLED" : "DISABLED"}`);
console.log("====================================================");

// Import configs
const { logger } = require("./src/config/logger");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");
const { initAnalyticsCron } = require("./src/jobs/analyticsJob");
const { initCloudinaryCleanupCron } = require("./src/jobs/cloudinaryCleanupJob");
const { initPdfCleanupCron } = require("./src/jobs/pdfCleanupJob");
const socketUtil = require("./src/utils/socket");

// Import services (initialized on demand)
let redisClient = null;
let cloudinaryConfigured = false;

const app = express();
app.set("trust proxy", 1);

// Real-Time Request Logging for Hostinger Runtime Logs
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[Hostinger Request] ${new Date().toISOString()} | ${req.method} ${req.originalUrl || req.url} | IP: ${req.ip}`);
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[Hostinger Response] ${req.method} ${req.originalUrl || req.url} -> HTTP ${res.statusCode} (${duration}ms)`);
  });
  next();
});



// ============================================================
// Security Middleware
// ============================================================

// Helmet - secure HTTP headers (ClickJacking, CSP, HSTS, MIME Sniffing, XSS)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://maps.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://ui-avatars.com", "https://*"],
        connectSrc: ["'self'", "http://localhost:*", "https://*"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: 'sameorigin' }
  }),
);

// CORS Configuration for Production & Localhost
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
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

// ============================================================
// Global String Casing Normalization Middleware
// ============================================================
const formatValue = (key, val) => {
  if (typeof val !== "string") return val;
  const k = String(key || "").toLowerCase().trim();
  const v = val.trim();

  // 1. Skip system config, permissions, roles, URLs, signatures, credentials, user names, and login IDs
  const keysToSkip = ["permission", "permissions", "role", "roles", "scope", "scopes", "password", "token", "secret", "hash", "photo", "avatar", "banner", "signature", "stamp", "url", "username", "createdBy", "creatorName", "name", "user", "login", "pdf", "base64"];
  if (keysToSkip.some(skipKey => k.includes(skipKey)) || v.startsWith("data:image") || v.startsWith("data:application") || (v.startsWith("http") && v.includes("res.cloudinary.com")) || v.includes("/uploads/")) {
    return val;
  }

  // 2. Store all other text data in lowercase (small case) in the Database
  return v.toLowerCase();
};

const formatBody = (obj) => {
  if (!obj || typeof obj !== "object") return;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === "string") {
        obj[key] = formatValue(key, val);
      } else if (Array.isArray(val)) {
        val.forEach(item => {
          if (item && typeof item === "object") {
            formatBody(item);
          }
        });
      } else if (typeof val === "object") {
        formatBody(val);
      }
    }
  }
};

app.use((req, res, next) => {
  if (req.body && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
    // Skip formatting for raw file buffers or other non-JSON POST requests
    const contentType = String(req.headers["content-type"] || "").toLowerCase();
    if (contentType.includes("application/json") || contentType.includes("application/x-www-form-urlencoded")) {
      formatBody(req.body);
    }
  }
  next();
});

// Data Sanitization against NoSQL query injection
// app.use(mongoSanitize()); // Disabled: Incompatible with Express 5 (req.query is read-only)

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
  max: NODE_ENV === "development" ? 1000 : 100, // 100 failed attempts per 15 minutes
  skipSuccessfulRequests: true, // Successful logins never count against the limit
  message: {
    success: false,
    message: "Too many failed login attempts, please try again after 15 minutes.",
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
const openingBalanceRoutes = require("./src/routes/openingBalances");
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
const webmailRoutes = require("./src/routes/webmail");

// Public Routes
const publicTrackingRoutes = require("./src/routes/public/tracking");
const publicBranchRoutes = require("./src/routes/public/branch");
const publicPincodeRoutes = require("./src/routes/public/pincode");
const publicQuoteRoutes = require("./src/routes/public/quote");
const publicContactRoutes = require("./src/routes/public/contact");
const publicCmsRoutes = require("./src/routes/public/cms");
const publicApplicationsRoutes = require("./src/routes/public/applications");
const publicChatbotRoutes = require("./src/routes/public/chatbot");

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
app.use("/api/public/chatbot", publicChatbotRoutes);

// Public Puppeteer PDF Generation Route (Must be mounted before authenticateToken)
const { generatePDF } = require("./src/utils/pdfGenerator");
app.post("/api/print/generate-pdf", async (req, res) => {
  try {
    const { html, filename = "document.pdf", landscape = false } = req.body;
    if (!html) return res.status(400).json({ success: false, message: "HTML content is required" });

    const pdfBuffer = await generatePDF(html, { landscape });
    res.type("application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error("Puppeteer PDF Error:", err);
    res.status(500).json({ success: false, message: "Failed to generate PDF", error: err.message });
  }
});

// Public Route to view/stream uploaded PDFs inline (generates on-the-fly if not cached)
app.get("/api/print/view-pdf/:filename", async (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, "uploads/downloaded_pdfs", filename);

    // If PDF does not exist in cache, generate it automatically!
    if (!fs.existsSync(filePath)) {
      let bookingId = filename;
      if (filename.startsWith("LR_")) {
        bookingId = filename.substring(3);
      }
      if (bookingId.endsWith(".pdf")) {
        bookingId = bookingId.substring(0, bookingId.length - 4);
      }

      // Fetch booking from DB
      const { db } = require("./src/config/database");
      const doc = await db.collection("bookings").doc(bookingId).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      const booking = { id: doc.id, ...doc.data() };
      const lrNumber = booking.lrNumber || booking.awb || bookingId;
      const date = booking.date ? new Date(booking.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
      
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LR - ${lrNumber}</title><style>body { font-family: Arial, sans-serif; margin: 20px; } .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; } .header h1 { margin: 0; font-size: 24px; } .header p { margin: 2px 0; font-size: 12px; } .title { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; text-decoration: underline; } table { width: 100%; border-collapse: collapse; margin: 10px 0; } td, th { border: 1px solid #000; padding: 6px 8px; font-size: 12px; } th { background: #f0f0f0; text-align: left; } .label { font-weight: bold; width: 30%; } .footer { margin-top: 30px; display: flex; justify-content: space-between; } .footer div { text-align: center; width: 30%; } .footer .line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-size: 11px; }</style></head><body><div class="header"><h1>MULTIMARG CARRIERS</h1><p>Transport & Logistics Services</p><p>GST: 08ABCDE1234F1Z5 | PAN: ABCDE1234F</p></div><div class="title">LORRY RECEIPT (LR)</div><table><tr><td class="label">LR No:</td><td><strong>${lrNumber}</strong></td><td class="label">Date:</td><td>${date}</td></tr><tr><td class="label">Consignor:</td><td>${booking.consignor || "-"}</td><td class="label">Consignee:</td><td>${booking.consignee || "-"}</td></tr><tr><td class="label">Origin:</td><td>${booking.origin || "-"}</td><td class="label">Destination:</td><td>${booking.destination || "-"}</td></tr><tr><td class="label">Mode:</td><td>${booking.mode || "Road"}</td><td class="label">Client:</td><td>${booking.client || "-"}</td></tr><tr><td class="label">No of Boxes:</td><td>${booking.box || 0}</td><td class="label">Actual Weight:</td><td>${booking.actual_wt || booking.weight || 0} kg</td></tr><tr><td class="label">Chargeable Weight:</td><td>${booking.charge_wt || booking.weight || 0} kg</td><td class="label">Type of Delivery:</td><td>${booking.type_of_delivery || booking.tob || "-"}</td></tr><tr><td class="label">Insured:</td><td>${booking.insured || "No"}</td><td class="label">E-Way Bill:</td><td>${booking.eway_bill || booking.eway || "-"}</td></tr></table><h3 style="font-size:14px; margin:10px 0;">Charge Details</h3><table><tr><th>Particulars</th><th>Amount (Rs.)</th></tr><tr><td>Freight Charge</td><td>${parseFloat(booking.freight_charge || booking.frieght || booking.freight || 0).toFixed(2)}</td></tr><tr><td>AWB Charge</td><td>${parseFloat(booking.awb_charge || 0).toFixed(2)}</td></tr><tr><td>Pickup Charge</td><td>${parseFloat(booking.pickup_charge || 0).toFixed(2)}</td></tr><tr><td>Delivery Charge</td><td>${parseFloat(booking.delivery_charge || 0).toFixed(2)}</td></tr><tr><td>Packaging Charge</td><td>${parseFloat(booking.packaging_charge || 0).toFixed(2)}</td></tr><tr><td>Handling Charge</td><td>${parseFloat(booking.handling_charge || 0).toFixed(2)}</td></tr><tr style="font-weight:bold;"><td>Total</td><td>${(parseFloat(booking.freight_charge || booking.frieght || booking.freight || 0) + parseFloat(booking.awb_charge || 0) + parseFloat(booking.pickup_charge || 0) + parseFloat(booking.delivery_charge || 0) + parseFloat(booking.packaging_charge || 0) + parseFloat(booking.handling_charge || 0)).toFixed(2)}</td></tr></table><div class="footer"><div><div class="line">Consignor Signature</div></div><div><div class="line">Consignee Signature</div></div><div><div class="line">Authorised Signatory</div></div></div></body></html>`;

      const { generatePDF } = require("./src/utils/pdfGenerator");
      const pdfBuffer = await generatePDF(html);

      fs.writeFileSync(filePath, pdfBuffer);
      console.log(`[On-The-Fly PDF] Generated and cached PDF for booking: ${bookingId}`);
    }

    if (req.query.raw === "true") {
      res.type("application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      res.type("text/html");
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>${filename.split('_').slice(0, 2).join(' ') || "Lorry Receipt PDF"}</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #525659; }
    iframe { border: none; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <iframe id="pdf-frame" src="/api/print/view-pdf/${filename}?raw=true"></iframe>
  <script>
    const iframe = document.getElementById('pdf-frame');
    iframe.onload = () => {
      // Delay to ensure the Chrome PDF plugin is initialized
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.warn("Direct iframe print failed, falling back to window print:", e);
          window.print();
        }
      }, 850);
    };
  </script>
</body>
</html>
      `);
    }
  } catch (err) {
    console.error("View PDF Error:", err);
    res.status(500).json({ success: false, message: "Failed to open PDF", error: err.message });
  }
});

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
app.use("/api/opening-balances", openingBalanceRoutes);
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
app.use("/api/webmail", webmailRoutes);

const suggestionsRoutes = require("./src/routes/suggestions");
app.use("/api/suggestions", suggestionsRoutes);

// Local SQL to MongoDB AWB Sync Studio Route
const sqlSyncRoutes = require("./src/routes/sqlSync");
app.use("/api/sql-sync", sqlSyncRoutes);


const quotesRoutes = require("./src/routes/quotes");
app.use("/api/quotes", quotesRoutes);

// ============================================================
// Serve Frontend Static Assets (Full-stack Deployment)
// ============================================================
const fs = require("fs");
const candidateDistPaths = [
  path.join(__dirname, "../frontend/dist"),
  path.join(__dirname, "dist"),
  path.join(__dirname, "public")
];

let activeDistPath = null;
for (const distPath of candidateDistPaths) {
  if (fs.existsSync(path.join(distPath, "index.html"))) {
    activeDistPath = distPath;
    break;
  }
}

if (activeDistPath) {
  app.use(express.static(activeDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(activeDistPath, "index.html"));
  });
}

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
}

async function initializeBackgroundServices() {
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
  // Start listening synchronously FIRST (guarantees calling listen() in <50ms for Hostinger)
  const server = app.listen(PORT, async () => {
    // Initialize Socket.IO
    socketUtil.init(server);

    logger.info(`========================================`);
    logger.info(`  Multimarg Carriers Transport System`);
    logger.info(`  Environment: ${NODE_ENV}`);
    logger.info(`  Server: http://localhost:${PORT}`);
    logger.info(`  API: http://localhost:${PORT}/api`);
    logger.info(`========================================`);

    // Initialize database & background services asynchronously
    try {
      await initializeServices();
      await initializeBackgroundServices();
      initAnalyticsCron();
      initCloudinaryCleanupCron();
      initPdfCleanupCron();

      // Ensure uploads/downloaded_pdfs directory exists
      const downloadedPdfsDir = path.join(__dirname, "uploads/downloaded_pdfs");
      if (!fs.existsSync(downloadedPdfsDir)) {
        fs.mkdirSync(downloadedPdfsDir, { recursive: true });
      }
    } catch (svcErr) {
      logger.error("Background services initialization error:", svcErr);
    }
  });


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

// Global safety handlers for background lock errors (e.g. Windows EBUSY temp unlinks)
process.on('unhandledRejection', (reason) => {
  if (reason && (reason.code === 'EBUSY' || (reason.message && reason.message.includes('EBUSY')))) {
    logger.warn(`[System] Suppressed background EBUSY lock warning: ${reason.message || reason}`);
    return;
  }
  logger.error('[System] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  if (err && (err.code === 'EBUSY' || (err.message && err.message.includes('EBUSY')))) {
    logger.warn(`[System] Suppressed background EBUSY lock error: ${err.message}`);
    return;
  }
  logger.error('[System] Uncaught Exception:', err);
});

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
