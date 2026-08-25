const {
  db
} = require("../config/database");
const {
  success,
  error,
  created
} = require("../utils/response");
const {
  asyncHandler
} = require("../middleware/errorHandler");
const {
  authenticateToken
} = require("../middleware/auth");
const {
  v4: uuidv4
} = require("uuid");
const bcrypt = require("bcryptjs");
const defaultAssets = require("../config/defaultAssets");
const { sendWelcomeEmail } = require("../config/mail");

// Initialize mock users if needed

// Middleware to ensure user is SuperAdmin

exports.getRoot_1 = async (req, res) => {
  const snapshot = await db.collection("users").get();
  const users = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    delete data.password;
    users.push({
      ...data,
      id: doc.id
    });
  });
  return success(res, {
    message: "Users fetched successfully",
    data: users
  });
};

exports.postRoot_2 = async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    permissions,
    employeeId,
    username,
    bloodGroup,
    phone,
    phoneNumber,
    designation
  } = req.body;
  if (!name || !email || !password || !role || !employeeId) {
    return error(res, {
      message: "Name, email, password, role, and Employee ID are required",
      statusCode: 400
    });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const emailLower = email ? email.toLowerCase().trim() : "";
  const usernameLower = username ? username.toLowerCase().trim() : "";
  const userPhone = String(phone || phoneNumber || "").trim();
  const userDesignation = String(designation || "").trim();

  // Check Employee ID uniqueness
  const empIdSnapshot = await db.collection("users").where("employeeId", "==", employeeId).get();
  if (!empIdSnapshot.empty) return error(res, {
    message: "Employee ID already exists",
    statusCode: 400
  });

  if (usernameLower) {
    const usernameCheck = await db.collection("users").where("username", "==", usernameLower).get();
    if (!usernameCheck.empty) return error(res, { message: "Username already exists", statusCode: 400 });
  }

  const randomAvatar = defaultAssets.DEFAULT_AVATARS[Math.floor(Math.random() * defaultAssets.DEFAULT_AVATARS.length)] || null;
  const randomBanner = defaultAssets.DEFAULT_BANNERS[Math.floor(Math.random() * defaultAssets.DEFAULT_BANNERS.length)] || null;

  const newUser = {
    id: uuidv4(),
    employeeId,
    name,
    email: emailLower,
    username: usernameLower,
    phone: userPhone,
    phoneNumber: userPhone,
    designation: userDesignation,
    password: hashedPassword,
    role,
    permissions: permissions || [],
    bloodGroup: bloodGroup || "",
    photo: randomAvatar,
    banner: randomBanner,
    twoFactorEnabled: false,
    faceAuthEnabled: false,
    fingerprintAuthEnabled: false,
    showFloatingMailbox: false,
    createdAt: new Date().toISOString()
  };
  const snapshot = await db.collection("users").where("email", "==", email).get();
  if (!snapshot.empty) return error(res, {
    message: "Email already exists",
    statusCode: 400
  });
  await db.collection("users").doc(newUser.id).set(newUser);
  
  // Send welcome email with credentials
  sendWelcomeEmail(email, password, name, role, employeeId).catch(err => {
    console.error("[Mail] Failed to send welcome email to", email, err);
  });

  const {
    password: _,
    ...safeUser
  } = newUser;
  return created(res, {
    message: "User created successfully",
    data: safeUser
  });
};

exports.put_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const {
    name,
    email,
    role,
    permissions,
    password,
    employeeId,
    username,
    phone,
    phoneNumber,
    designation
  } = req.body;
  const updates = {
    name,
    role,
    permissions
  };
  if (email) updates.email = email.toLowerCase().trim();
  if (employeeId) updates.employeeId = employeeId;
  const bloodGroup = req.body.bloodGroup;
  if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
  if (username !== undefined) {
    updates.username = username ? username.toLowerCase().trim() : "";
  }
  const rawPhone = phone || phoneNumber;
  if (rawPhone !== undefined) {
    updates.phone = String(rawPhone).trim();
    updates.phoneNumber = String(rawPhone).trim();
  }
  if (designation !== undefined) {
    updates.designation = String(designation).trim();
  }
  
  if (password) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(password, salt);
  }

  // Check Employee ID uniqueness for updates
  if (employeeId) {
    const empIdCheck = await db.collection("users").where("employeeId", "==", employeeId).get();
    let taken = false;
    empIdCheck.forEach(d => {
      if (String(d.id) !== String(id)) taken = true;
    });
    if (taken) return error(res, { message: "Employee ID already exists", statusCode: 400 });
  }

  if (updates.username) {
    const userCheck = await db.collection("users").where("username", "==", updates.username).get();
    let taken = false;
    userCheck.forEach(d => { if (String(d.id) !== String(id)) taken = true; });
    if (taken) return error(res, { message: "Username already exists", statusCode: 400 });
  }

  const docRef = db.collection("users").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, {
    message: "User not found",
    statusCode: 404
  });
  await docRef.update(updates);
  return success(res, {
    message: "User updated successfully",
    data: {
      id,
      ...updates
    }
  });
};

exports.delete_id_4 = async (req, res) => {
  const {
    id
  } = req.params;
  if (req.user.id === id) {
    return error(res, {
      message: "Cannot delete yourself",
      statusCode: 400
    });
  }
  const docRef = db.collection("users").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, {
    message: "User not found",
    statusCode: 404
  });
  const userData = doc.data() || {};
  if (userData.photo) {
    const { deleteFile } = require("../config/cloudinary");
    await deleteFile(userData.photo, "image");
  }
  if (userData.banner) {
    const { deleteFile } = require("../config/cloudinary");
    await deleteFile(userData.banner, "image");
  }
  await docRef.delete();
  return success(res, {
    message: "User deleted successfully"
  });
};

exports.getAllUserActivities = async (req, res) => {
  const snapshot = await db.collection("userActivities").orderBy("date", "desc").get();
  const activities = [];
  snapshot.forEach(doc => {
    activities.push({
      id: doc.id,
      ...doc.data()
    });
  });
  return success(res, {
    message: "All user activities fetched successfully",
    data: activities
  });
};

/**
 * Delete a single activity log entry by its Document ID
 */
exports.deleteSingleUserActivity = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return error(res, { message: "Activity ID is required", statusCode: 400 });
  }

  const docRef = db.collection("userActivities").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return error(res, { message: "Activity log not found", statusCode: 404 });
  }

  await docRef.delete();
  return success(res, { message: "Activity log deleted successfully" });
};

/**
 * Bulk delete user activities by list of IDs or filter
 */
exports.bulkDeleteUserActivities = async (req, res) => {
  const { ids, all, userId, type, startDate, endDate } = req.body;

  if (all === true) {
    const result = await db.mongoDb.collection("userActivities").deleteMany({});
    return success(res, {
      message: `Successfully cleared all ${result.deletedCount || 0} activity logs`
    });
  }

  if (Array.isArray(ids) && ids.length > 0) {
    const result = await db.mongoDb.collection("userActivities").deleteMany({
      $or: [
        { _id: { $in: ids } },
        { id: { $in: ids } }
      ]
    });
    return success(res, {
      message: `Successfully deleted ${result.deletedCount || ids.length} selected activity log(s)`
    });
  }

  const filter = {};
  if (userId) filter.userId = userId;
  if (type && type !== 'ALL') filter.type = type.toLowerCase();
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate).toISOString();
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end.toISOString();
    }
  }

  const result = await db.mongoDb.collection("userActivities").deleteMany(filter);
  return success(res, {
    message: `Successfully deleted ${result.deletedCount || 0} activity log(s)`
  });
};

/**
 * Clear all user activity logs completely
 */
exports.clearAllUserActivities = async (req, res) => {
  const result = await db.mongoDb.collection("userActivities").deleteMany({});
  return success(res, {
    message: `All ${result.deletedCount || 0} user activity logs cleared successfully`
  });
};

/**
 * Clear all sessions and login history for a specific employee
 */
exports.clearUserSessions = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return error(res, { message: "User ID is required", statusCode: 400 });
  }

  const result = await db.mongoDb.collection("userActivities").deleteMany({ userId: id });
  return success(res, {
    message: `Session details and login history cleared successfully (${result.deletedCount || 0} records removed)`
  });
};

exports.clearUserActivity = exports.clearUserSessions;

/**
 * Directly change an employee/user password by Super Admin
 * No OTP or old password required
 */
exports.changeEmployeePassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || String(newPassword).trim().length < 4) {
    return error(res, { message: "Password must be at least 4 characters long", statusCode: 400 });
  }

  const docRef = db.collection("users").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return error(res, { message: "Employee / User not found", statusCode: 404 });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(String(newPassword).trim(), salt);

  await docRef.update({
    password: hashedPassword,
    updatedAt: new Date().toISOString(),
    passwordChangedByAdmin: true,
    passwordChangedAt: new Date().toISOString()
  });

  const userData = doc.data() || {};
  return success(res, {
    message: `Password for ${userData.name || 'employee'} has been updated successfully`,
    data: { id, name: userData.name, employeeId: userData.employeeId, email: userData.email }
  });
};

