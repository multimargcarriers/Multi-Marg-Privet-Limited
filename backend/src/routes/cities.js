const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, param, validationResult } = require("express-validator");

const CACHE_KEY = "cities";


router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {

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
    const doc = await db.collection("cities").doc(id).get();
    if (!doc.exists) return error(res, { message: "City not found", statusCode: 404 });
    await db.collection("cities").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, { message: "City deleted successfully" });
  }),
);

module.exports = router;
