const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { success, error, created } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { authenticateToken } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

// Initialize mock users if needed
if (!mockData.users) {
  mockData.users = [
    {
      id: "mock_user_1",
      name: "Praveen",
      email: "praveen.pr105@gmail.com",
      role: "SuperAdmin",
      permissions: ["all"],
      password: "123456",
      createdAt: new Date().toISOString()
    }
  ];
}

// Middleware to ensure user is SuperAdmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "SuperAdmin") {
    next();
  } else {
    return error(res, { message: "Forbidden: SuperAdmin access required", statusCode: 403 });
  }
};

// Protect all user routes
router.use(authenticateToken);
router.use(requireSuperAdmin);

// GET all users
router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (useMockDB) {
      const safeUsers = mockData.users.map(({ password, ...u }) => u);
      return success(res, { message: "Users fetched successfully", data: safeUsers });
    }
    
    const snapshot = await db.collection("users").get();
    const users = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      delete data.password;
      users.push({ id: doc.id, ...data });
    });
    return success(res, { message: "Users fetched successfully", data: users });
  })
);

// POST create new user (Admin)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email, password, role, permissions } = req.body;
    
    if (!name || !email || !password || !role) {
      return error(res, { message: "Name, email, password, and role are required", statusCode: 400 });
    }

    const newUser = {
      id: uuidv4(),
      name,
      email,
      password,
      role,
      permissions: permissions || [],
      createdAt: new Date().toISOString()
    };

    if (useMockDB) {
      const exists = mockData.users.find(u => u.email === email);
      if (exists) return error(res, { message: "Email already exists", statusCode: 400 });
      mockData.users.push(newUser);
    } else {
      const snapshot = await db.collection("users").where("email", "==", email).get();
      if (!snapshot.empty) return error(res, { message: "Email already exists", statusCode: 400 });
      await db.collection("users").doc(newUser.id).set(newUser);
    }

    const { password: _, ...safeUser } = newUser;
    return created(res, { message: "User created successfully", data: safeUser });
  })
);

// PUT update user permissions/role
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, role, permissions, password } = req.body;

    const updates = { name, email, role, permissions };
    if (password) updates.password = password; // Only update if provided

    if (useMockDB) {
      const idx = mockData.users.findIndex(u => u.id === id);
      if (idx === -1) return error(res, { message: "User not found", statusCode: 404 });
      mockData.users[idx] = { ...mockData.users[idx], ...updates };
      const { password: _, ...safeUser } = mockData.users[idx];
      return success(res, { message: "User updated successfully", data: safeUser });
    }

    const docRef = db.collection("users").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return error(res, { message: "User not found", statusCode: 404 });
    
    await docRef.update(updates);
    return success(res, { message: "User updated successfully", data: { id, ...updates } });
  })
);

// DELETE user
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (req.user.id === id) {
       return error(res, { message: "Cannot delete yourself", statusCode: 400 });
    }

    if (useMockDB) {
      const idx = mockData.users.findIndex(u => u.id === id);
      if (idx === -1) return error(res, { message: "User not found", statusCode: 404 });
      mockData.users.splice(idx, 1);
      return success(res, { message: "User deleted successfully" });
    }

    const docRef = db.collection("users").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return error(res, { message: "User not found", statusCode: 404 });
    
    await docRef.delete();
    return success(res, { message: "User deleted successfully" });
  })
);

module.exports = router;
