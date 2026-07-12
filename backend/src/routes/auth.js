const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { generateToken, authenticateToken } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const { createUploadMiddleware, handleMulterError } = require("../middleware/upload");
const { uploadFile } = require("../config/cloudinary");

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
      const mockUser = mockData.users?.find(
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

// Profile Update Route
router.put(
  "/profile",
  authenticateToken,
  createUploadMiddleware("avatars").single("photo"),
  handleMulterError,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, email, password, newId } = req.body;
    let photoUrl = undefined;

    if (req.file) {
      try {
        const uploadResult = await uploadFile(req.file.path, { folder: "avatars" });
        if (uploadResult.success) {
          photoUrl = uploadResult.secure_url;
        } else {
          // Fallback to local storage if Cloudinary is disabled or fails
          photoUrl = `/uploads/avatars/${req.file.filename}`;
        }
      } catch (error) {
        console.error("Cloudinary upload failed:", error);
        photoUrl = `/uploads/avatars/${req.file.filename}`;
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (password) updates.password = password;
    if (photoUrl) updates.photo = photoUrl;

    if (Object.keys(updates).length === 0 && (!newId || newId === userId)) {
      return error(res, { message: "No fields to update", statusCode: 400 });
    }

    let updatedUserData = null;

    console.log("=== DEBUG PROFILE UPDATE ===");
    console.log("userId from token:", userId);
    console.log("newId requested:", newId);
    console.log("Mock Users available IDs:", mockData.users?.map(u => u.id));

    if (useMockDB) {
      if (newId && newId !== userId) {
        const idExists = mockData.users?.find((u) => u.id === newId);
        if (idExists) {
          console.log("Error: newId already taken");
          return error(res, { message: "User ID is already taken", statusCode: 400 });
        }
      }

      const idx = mockData.users?.findIndex((u) => u.id === userId);
      console.log("Found user at index:", idx);
      if (idx !== undefined && idx !== -1) {
        mockData.users[idx] = { ...mockData.users[idx], ...updates };
        if (newId && newId !== userId) {
          mockData.users[idx].id = newId;
        }
        const { password: _, ...userData } = mockData.users[idx];
        updatedUserData = userData;
      } else {
        console.log("Error: User not found in mockData");
        return error(res, { message: "User not found", statusCode: 404 });
      }
    } else {
      const docRef = db.collection("users").doc(userId);
      const doc = await docRef.get();
      if (!doc.exists) {
        return error(res, { message: "User not found", statusCode: 404 });
      }

      if (newId && newId !== userId) {
        const newDocRef = db.collection("users").doc(newId);
        const newDoc = await newDocRef.get();
        if (newDoc.exists) {
          return error(res, { message: "User ID is already taken", statusCode: 400 });
        }

        const newData = { ...doc.data(), ...updates, id: newId };
        await newDocRef.set(newData);
        await docRef.delete();
        
        const updatedDoc = await newDocRef.get();
        updatedUserData = { id: updatedDoc.id, ...updatedDoc.data() };
      } else {
        await docRef.update(updates);
        const updatedDoc = await docRef.get();
        updatedUserData = { id: updatedDoc.id, ...updatedDoc.data() };
      }
      
      delete updatedUserData.password;
    }

    // Generate new token with updated user data
    const token = generateToken(updatedUserData);

    return success(res, { 
      message: "Profile updated successfully", 
      data: { user: updatedUserData, token } 
    });
  })
);

module.exports = router;
