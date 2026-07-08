const express = require("express");
const router = express.Router();
const { useMockDB, db } = require("../config/firebase");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { generateToken } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, { message: "Validation failed", statusCode: 400, details: errors.array() });

    const { email, password } = req.body;

    if (useMockDB) {
      const mockUser = require("../config/firebase").mockData.users?.find(
        (u) => u.email === email && u.password === password
      );

      if (mockUser) {
        const { password: _, ...userData } = mockUser;
        const token = generateToken(userData);
        return success(res, { message: "Login successful", data: { user: userData, token } });
      }
      return error(res, { message: "Invalid Email or Password", statusCode: 401 });
    }

    // Real Firebase Authentication
    const usersRef = db.collection("users");
    const snapshot = await usersRef
      .where("email", "==", email)
      .where("password", "==", password)
      .get();

    if (snapshot.empty) {
      return error(res, { message: "Invalid Email or Password", statusCode: 401 });
    }

    let userData;
    snapshot.forEach((doc) => {
      userData = { id: doc.id, ...doc.data() };
    });

    delete userData.password;
    
    // Fallback if no role/permissions are set in DB for existing users
    if (!userData.role) userData.role = "SuperAdmin";
    if (!userData.permissions) userData.permissions = ["all"];

    const token = generateToken(userData);
    return success(res, { message: "Login successful", data: { user: userData, token } });
  }),
);

module.exports = router;
