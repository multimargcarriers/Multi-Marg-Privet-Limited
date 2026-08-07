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
      id: doc.id,
      ...data
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
    username
  } = req.body;
  if (!name || !email || !password || !role || !employeeId) {
    return error(res, {
      message: "Name, email, password, role, and Employee ID are required",
      statusCode: 400
    });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Check Employee ID uniqueness
  const empIdSnapshot = await db.collection("users").where("employeeId", "==", employeeId).get();
  if (!empIdSnapshot.empty) return error(res, {
    message: "Employee ID already exists",
    statusCode: 400
  });

  if (username) {
    const usernameCheck = await db.collection("users").where("username", "==", username).get();
    if (!usernameCheck.empty) return error(res, { message: "Username already exists", statusCode: 400 });
  }

  const randomAvatar = defaultAssets.DEFAULT_AVATARS[Math.floor(Math.random() * defaultAssets.DEFAULT_AVATARS.length)] || null;
  const randomBanner = defaultAssets.DEFAULT_BANNERS[Math.floor(Math.random() * defaultAssets.DEFAULT_BANNERS.length)] || null;

  const newUser = {
    id: uuidv4(),
    employeeId,
    name,
    email,
    username: username || "",
    password: hashedPassword,
    role,
    permissions: permissions || [],
    photo: randomAvatar,
    banner: randomBanner,
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
    username
  } = req.body;
  const updates = {
    name,
    email,
    role,
    permissions
  };
  if (employeeId) updates.employeeId = employeeId;
  if (username) updates.username = username;
  
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

  if (username) {
    const userCheck = await db.collection("users").where("username", "==", username).get();
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

exports.clearUserActivity = async (req, res) => {
  const { id } = req.params; // The ID of the employee
  
  if (!id) {
    return error(res, { message: "User ID is required", statusCode: 400 });
  }

  const snapshot = await db.collection("userActivities").where("userId", "==", id).get();
  
  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();

  return success(res, {
    message: "Login history cleared successfully for the employee"
  });
};
