const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, param, validationResult } = require("express-validator");

const CACHE_KEY = "cities";

if (!mockData.cities) {
  mockData.cities = [
    { id: "ct1", city: "Delhi", short: "DL", state: "Delhi", stateCode: "07" },
    { id: "ct2", city: "Mumbai", short: "MU", state: "Maharashtra", stateCode: "27" },
    { id: "ct3", city: "Kolkata", short: "KL", state: "West Bengal", stateCode: "19" },
    { id: "ct4", city: "Chennai", short: "CH", state: "Tamil Nadu", stateCode: "33" },
    { id: "ct5", city: "Bangalore", short: "BL", state: "Karnataka", stateCode: "29" },
  ];
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {
        if (useMockDB) return mockData.cities;
        const snapshot = await db.collection("cities").get();
        const cities = [];
        snapshot.forEach((doc) => cities.push({ id: doc.id, ...doc.data() }));
        return cities;
      },
      300,
    );
    return success(res, { message: "Cities fetched successfully", data });
  }),
);

router.post(
  "/",
  [
    body("city").notEmpty().withMessage("City name is required"),
    body("short")
      .optional()
      .isLength({ max: 10 })
      .withMessage("Short code too long"),
    body("state").optional().isString(),
    body("stateCode").optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, { message: "Validation failed", statusCode: 400, details: errors.array() });

    const newCity = req.body;
    newCity.createdAt = new Date().toISOString();
    if (useMockDB) {
      newCity.id = uuidv4();
      mockData.cities.push(newCity);
      await delCache(CACHE_KEY);
      return created(res, { message: "City created successfully", data: newCity });
    }
    const docRef = await db.collection("cities").add(newCity);
    await delCache(CACHE_KEY);
    return created(res, { message: "City created successfully", data: {
      id: docRef.id,
      ...newCity,
    } });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (useMockDB) {
      const idx = mockData.cities.findIndex((c) => c.id === id);
      if (idx === -1) return error(res, { message: "City not found", statusCode: 404 });
      mockData.cities[idx] = { ...mockData.cities[idx], ...req.body };
      await delCache(CACHE_KEY);
      return success(res, { message: "City updated successfully", data: mockData.cities[idx] });
    }
    const doc = await db.collection("cities").doc(id).get();
    if (!doc.exists) return error(res, { message: "City not found", statusCode: 404 });
    await db.collection("cities").doc(id).update(req.body);
    await delCache(CACHE_KEY);
    return success(res, { message: "City updated successfully", data: { id, ...req.body } });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (useMockDB) {
      const idx = mockData.cities.findIndex((c) => c.id === id);
      if (idx === -1) return error(res, { message: "City not found", statusCode: 404 });
      mockData.cities = mockData.cities.filter((c) => c.id !== id);
      await delCache(CACHE_KEY);
      return success(res, { message: "City deleted successfully" });
    }
    const doc = await db.collection("cities").doc(id).get();
    if (!doc.exists) return error(res, { message: "City not found", statusCode: 404 });
    await db.collection("cities").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, { message: "City deleted successfully" });
  }),
);

module.exports = router;
