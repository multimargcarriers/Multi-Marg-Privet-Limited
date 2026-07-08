const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache, invalidatePattern } = require("../config/redis");
const { body, param, validationResult } = require("express-validator");

const CACHE_KEY = "branches";

// Extend mockData with branches
if (!mockData.branches) {
  mockData.branches = [
    {
      id: "b1",
      codeInitial: "MCPL",
      code: "BR001",
      branch: "Delhi Main",
      name: "Delhi Contact",
      address: "123, Main Road, Delhi",
      phno: "9876543210",
      email: "delhi@multimarg.com",
    },
    {
      id: "b2",
      codeInitial: "MCPL",
      code: "BR002",
      branch: "Mumbai West",
      name: "Mumbai Contact",
      address: "456, Link Road, Mumbai",
      phno: "9876543211",
      email: "mumbai@multimarg.com",
    },
  ];
}

// Get all branches
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {
        if (useMockDB) return mockData.branches;
        const snapshot = await db.collection("branches").get();
        const branches = [];
        snapshot.forEach((doc) => branches.push({ id: doc.id, ...doc.data() }));
        return branches;
      },
      300,
    );
    return success(res, { message: "Branches fetched successfully", data });
  }),
);

// Create branch
router.post(
  "/",
  [
    body("branch").notEmpty().withMessage("Branch name is required"),
    body("name").notEmpty().withMessage("Contact person is required"),
    body("address").notEmpty().withMessage("Address is required"),
    body("phno").notEmpty().withMessage("Phone number is required"),
    body("email").notEmpty().isEmail().withMessage("Valid email is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, { message: "Validation failed", statusCode: 400, details: errors.array() });

    const newBranch = req.body;
    newBranch.createdAt = new Date().toISOString();
    if (useMockDB) {
      newBranch.id = uuidv4();
      mockData.branches.push(newBranch);
      await delCache(CACHE_KEY);
      return created(res, { message: "Branch created successfully", data: newBranch });
    }
    const docRef = await db.collection("branches").add(newBranch);
    await delCache(CACHE_KEY);
    return created(res, { message: "Branch created successfully", data: { id: docRef.id, ...newBranch } });
  }),
);

// Update branch
router.put(
  "/:id",
  [param("id").notEmpty().withMessage("Branch ID is required")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, { message: "Validation failed", statusCode: 400, details: errors.array() });

    const { id } = req.params;
    if (useMockDB) {
      const idx = mockData.branches.findIndex((b) => b.id === id);
      if (idx === -1) return error(res, { message: "Branch not found", statusCode: 404 });
      mockData.branches[idx] = { ...mockData.branches[idx], ...req.body };
      await delCache(CACHE_KEY);
      return success(res, { message: "Branch updated successfully", data: mockData.branches[idx] });
    }
    const doc = await db.collection("branches").doc(id).get();
    if (!doc.exists) return error(res, { message: "Branch not found", statusCode: 404 });
    await db.collection("branches").doc(id).update(req.body);
    await delCache(CACHE_KEY);
    return success(res, { message: "Branch updated successfully", data: { id, ...req.body } });
  }),
);

// Delete branch
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (useMockDB) {
      const idx = mockData.branches.findIndex((b) => b.id === id);
      if (idx === -1) return error(res, { message: "Branch not found", statusCode: 404 });
      mockData.branches = mockData.branches.filter((b) => b.id !== id);
      await delCache(CACHE_KEY);
      return success(res, { message: "Branch deleted successfully" });
    }
    const doc = await db.collection("branches").doc(id).get();
    if (!doc.exists) return error(res, { message: "Branch not found", statusCode: 404 });
    await db.collection("branches").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, { message: "Branch deleted successfully" });
  }),
);

module.exports = router;
