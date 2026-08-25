const express = require("express");
const router = express.Router();
const sqlSyncService = require("../services/sqlSyncService");
const { authenticateToken } = require("../middleware/auth");

/**
 * Test connections to MySQL and MongoDB
 * GET /api/sql-sync/test
 */
router.get("/test", async (req, res) => {
  try {
    const result = await sqlSyncService.testConnections();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Tally AWBs between SQL and MongoDB from a given date
 * POST /api/sql-sync/tally
 * Body: { fromDate: 'YYYY-MM-DD', toDate?: 'YYYY-MM-DD' }
 */
router.post("/tally", async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const tallyResult = await sqlSyncService.tallyAwbs({ fromDate, toDate });
    res.json(tallyResult);
  } catch (err) {
    console.error("[SQL Sync Error /tally]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Synchronize AWBs from SQL to MongoDB
 * POST /api/sql-sync/sync
 * Body: { fromDate, toDate, selectedAwbs, syncMode }
 */
router.post("/sync", async (req, res) => {
  try {
    const { fromDate, toDate, selectedAwbs, syncMode } = req.body;
    const syncResult = await sqlSyncService.syncAwbs({
      fromDate,
      toDate,
      selectedAwbs,
      syncMode: syncMode || "missing_only"
    });
    res.json(syncResult);
  } catch (err) {
    console.error("[SQL Sync Error /sync]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Tally Bills between SQL and MongoDB from a given date
 * POST /api/sql-sync/tally-bills
 * Body: { fromDate: 'YYYY-MM-DD', toDate?: 'YYYY-MM-DD' }
 */
router.post("/tally-bills", async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const tallyResult = await sqlSyncService.tallyBills({ fromDate, toDate });
    res.json(tallyResult);
  } catch (err) {
    console.error("[SQL Sync Error /tally-bills]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Synchronize Bills from SQL to MongoDB
 * POST /api/sql-sync/sync-bills
 * Body: { fromDate, toDate, selectedBills, syncMode }
 */
router.post("/sync-bills", async (req, res) => {
  try {
    const { fromDate, toDate, selectedBills, syncMode } = req.body;
    const syncResult = await sqlSyncService.syncBills({
      fromDate,
      toDate,
      selectedBills,
      syncMode: syncMode || "missing_only"
    });
    res.json(syncResult);
  } catch (err) {
    console.error("[SQL Sync Error /sync-bills]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Tally Vendor Purchase Bills between SQL and MongoDB
 * POST /api/sql-sync/tally-purchases
 * Body: { fromDate?: 'YYYY-MM-DD', toDate?: 'YYYY-MM-DD' }
 */
router.post("/tally-purchases", async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const tallyResult = await sqlSyncService.tallyPurchases({ fromDate, toDate });
    res.json(tallyResult);
  } catch (err) {
    console.error("[SQL Sync Error /tally-purchases]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Synchronize Vendor Purchase Bills from SQL to MongoDB
 * POST /api/sql-sync/sync-purchases
 * Body: { fromDate, toDate, selectedPurchases, syncMode }
 */
router.post("/sync-purchases", async (req, res) => {
  try {
    const { fromDate, toDate, selectedPurchases, syncMode } = req.body;
    const syncResult = await sqlSyncService.syncPurchases({
      fromDate,
      toDate,
      selectedPurchases,
      syncMode: syncMode || "missing_only"
    });
    res.json(syncResult);
  } catch (err) {
    console.error("[SQL Sync Error /sync-purchases]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Tally Vendor Payments between SQL and MongoDB
 * POST /api/sql-sync/tally-vendor-payments
 * Body: { fromDate?: 'YYYY-MM-DD', toDate?: 'YYYY-MM-DD' }
 */
router.post("/tally-vendor-payments", async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const tallyResult = await sqlSyncService.tallyVendorPayments({ fromDate, toDate });
    res.json(tallyResult);
  } catch (err) {
    console.error("[SQL Sync Error /tally-vendor-payments]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Synchronize Vendor Payments from SQL to MongoDB
 * POST /api/sql-sync/sync-vendor-payments
 * Body: { fromDate, toDate, selectedPayments }
 */
router.post("/sync-vendor-payments", async (req, res) => {
  try {
    const { fromDate, toDate, selectedPayments } = req.body;
    const syncResult = await sqlSyncService.syncVendorPayments({
      fromDate,
      toDate,
      selectedPayments
    });
    res.json(syncResult);
  } catch (err) {
    console.error("[SQL Sync Error /sync-vendor-payments]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Tally Client Payments between SQL and MongoDB
 * POST /api/sql-sync/tally-client-payments
 * Body: { fromDate?: 'YYYY-MM-DD', toDate?: 'YYYY-MM-DD' }
 */
router.post("/tally-client-payments", async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const tallyResult = await sqlSyncService.tallyClientPayments({ fromDate, toDate });
    res.json(tallyResult);
  } catch (err) {
    console.error("[SQL Sync Error /tally-client-payments]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Synchronize Client Payments from SQL to MongoDB
 * POST /api/sql-sync/sync-client-payments
 * Body: { fromDate, toDate, selectedPayments }
 */
router.post("/sync-client-payments", async (req, res) => {
  try {
    const { fromDate, toDate, selectedPayments } = req.body;
    const syncResult = await sqlSyncService.syncClientPayments({
      fromDate,
      toDate,
      selectedPayments
    });
    res.json(syncResult);
  } catch (err) {
    console.error("[SQL Sync Error /sync-client-payments]:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Synchronize unbilled status globally across all bookings
 * POST /api/sql-sync/sync-unbilled
 */
router.post("/sync-unbilled", async (req, res) => {
  try {
    const syncResult = await sqlSyncService.syncAllBookingsBillingStatusFromSql();
    res.json(syncResult);
  } catch (err) {
    console.error("[SQL Sync Error /sync-unbilled]:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
