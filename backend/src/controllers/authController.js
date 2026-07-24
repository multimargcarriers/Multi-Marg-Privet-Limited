const {
  db
} = require("../config/database");
const {
  success,
  error
} = require("../utils/response");
const {
  asyncHandler
} = require("../middleware/errorHandler");
const {
  generateToken,
  authenticateToken
} = require("../middleware/auth");
const {
  body,
  validationResult
} = require("express-validator");
const {
  createUploadMiddleware,
  handleMulterError
} = require("../middleware/upload");
const {
  uploadFile
} = require("../config/cloudinary");
const bcrypt = require("bcryptjs");
const defaultAssets = require("../config/defaultAssets");

exports.get_default_assets = async (req, res) => {
  return success(res, {
    message: "Default assets fetched successfully",
    data: defaultAssets
  });
};

exports.post_login_1 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, {
    message: "Validation failed",
    statusCode: 400,
    details: errors.array()
  });
  const { email, password } = req.body;

  // Real Firebase Authentication with Seamless Bcrypt Migration
  const usersRef = db.collection("users");
  const snapshot = await usersRef.where("email", "==", email).get();
  
  if (snapshot.empty) {
    return error(res, { message: "Invalid Email or Password", statusCode: 401 });
  }
  
  let userDoc = null;
  let userData = null;
  snapshot.forEach(doc => {
    userDoc = doc;
    userData = { id: doc.id, ...doc.data() };
  });

  // Check if account is blocked
  if (userData.isBlocked) {
    return error(res, {
      message: "Account temporarily blocked due to multiple failed login attempts. Please reset your password via email.",
      statusCode: 403
    });
  }

  // Enforce IAM Role based access (Only Admins and Super Admins allowed)
  const role = (userData.role || "SuperAdmin").toLowerCase().replace(/\s+/g, '');
  if (role !== 'admin' && role !== 'superadmin') {
    return error(res, {
      message: "Access Denied: Your account does not have sufficient IAM permissions to access this portal.",
      statusCode: 403
    });
  }

  const storedPassword = userData.password;
  let passwordMatch = false;

  if (storedPassword && (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$"))) {
    passwordMatch = await bcrypt.compare(password, storedPassword);
  } else if (storedPassword === password) {
    passwordMatch = true;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await usersRef.doc(userDoc.id).update({ password: hashedPassword });
  }

  if (!passwordMatch) {
    // Increment failed login attempts
    const currentAttempts = (userData.failedLoginAttempts || 0) + 1;
    const updates = { failedLoginAttempts: currentAttempts };
    
    if (currentAttempts >= 3) {
      updates.isBlocked = true;
    }
    
    await usersRef.doc(userDoc.id).update(updates);

    return error(res, {
      message: currentAttempts >= 3 
        ? "Account temporarily blocked due to multiple failed login attempts. Please reset your password via email." 
        : `Invalid Email or Password. (${3 - currentAttempts} attempts remaining)`,
      statusCode: 401
    });
  }

  // Reset failed login attempts on successful login
  if (userData.failedLoginAttempts > 0 || userData.isBlocked) {
    await usersRef.doc(userDoc.id).update({ 
      failedLoginAttempts: 0,
      isBlocked: false 
    });
  }

  delete userData.password;

  // Fallback if no role/permissions are set in DB for existing users
  if (!userData.role) userData.role = "SuperAdmin";
  if (!userData.permissions) userData.permissions = ["all"];
  
  const token = generateToken(userData);
  return success(res, {
    message: "Login successful",
    data: { user: userData, token }
  });
};

exports.put_profile_2 = async (req, res) => {
  const userId = req.user.id;
  const {
    name,
    email,
    password,
    newId
  } = req.body;
  console.log("=== PUT PROFILE ===");
  console.log("req.body:", req.body);
  console.log("req.files:", req.files ? Object.keys(req.files) : "none");

  let photoUrl = req.body.photoUrl || undefined;
  let bannerUrl = req.body.bannerUrl || undefined;
  
  if (req.files) {
    if (req.files.photo && req.files.photo.length > 0) {
      try {
        const uploadResult = await uploadFile(req.files.photo[0].path, {
          folder: "avatars"
        });
        if (uploadResult.success) {
          photoUrl = uploadResult.url;
        } else {
          photoUrl = `/uploads/avatars/${req.files.photo[0].filename}`;
        }
      } catch (error) {
        console.error("Cloudinary avatar upload failed:", error);
        photoUrl = `/uploads/avatars/${req.files.photo[0].filename}`;
      }
    }
    
    if (req.files.banner && req.files.banner.length > 0) {
      try {
        const uploadResult = await uploadFile(req.files.banner[0].path, {
          folder: "banners"
        });
        if (uploadResult.success) {
          bannerUrl = uploadResult.url;
        } else {
          bannerUrl = `/uploads/banners/${req.files.banner[0].filename}`;
        }
      } catch (error) {
        console.error("Cloudinary banner upload failed:", error);
        bannerUrl = `/uploads/banners/${req.files.banner[0].filename}`;
      }
    }
  }
  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(password, salt);
  }
  if (photoUrl) updates.photo = photoUrl;
  if (bannerUrl) updates.banner = bannerUrl;
  if (Object.keys(updates).length === 0 && (!newId || newId === userId)) {
    return error(res, {
      message: "No fields to update",
      statusCode: 400
    });
  }
  let updatedUserData = null;
  console.log("=== DEBUG PROFILE UPDATE ===");
  console.log("userId from token:", userId);
  console.log("newId requested:", newId);
  const docRef = db.collection("users").doc(userId);
  const doc = await docRef.get();
  if (!doc.exists) {
    return error(res, {
      message: "User not found",
      statusCode: 404
    });
  }
  if (newId && newId !== userId) {
    const newDocRef = db.collection("users").doc(newId);
    const newDoc = await newDocRef.get();
    if (newDoc.exists) {
      return error(res, {
        message: "User ID is already taken",
        statusCode: 400
      });
    }
    const newData = {
      ...doc.data(),
      ...updates,
      id: newId
    };
    await newDocRef.set(newData);
    await docRef.delete();
    const updatedDoc = await newDocRef.get();
    updatedUserData = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };
  } else {
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    updatedUserData = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };
  }
  delete updatedUserData.password;

  // Generate new token with updated user data
  const token = generateToken(updatedUserData);
  return success(res, {
    message: "Profile updated successfully",
    data: {
      user: updatedUserData,
      token
    }
  });
};



const { sendOtpEmail } = require('../config/mail');
const { v4: uuidv4 } = require('uuid');

exports.forgot_password = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    const { db } = require('../config/database');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (snapshot.empty) {
      // For security, we don't reveal if the email exists or not
      return res.status(200).json({ success: true, message: 'If that email is registered with IAM permissions, an OTP has been sent.' });
    }
    
    let userDoc = null;
    let userData = null;
    snapshot.forEach(doc => { userDoc = doc; userData = doc.data(); });
    
    // Verify IAM Role - Only send OTP to Admins and Super Admins
    const role = (userData.role || "SuperAdmin").toLowerCase().replace(/\s+/g, '');
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(200).json({ success: true, message: 'If that email is registered with IAM permissions, an OTP has been sent.' });
    }
    
    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await db.collection('otps').doc(email).set({
      otp,
      expiresAt,
      verified: false
    });
    
    // Send email
    try {
      await sendOtpEmail(email, otp, userData.name || 'User');
    } catch (mailErr) {
      console.error('[Mail Warning] Could not send email. (OTP: ' + otp + ')', mailErr.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
      }
    }
    
    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to process request' });
  }
};

exports.verify_otp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });
  
  try {
    const { db } = require('../config/database');
    const otpDoc = await db.collection('otps').doc(email).get();
    
    if (!otpDoc.exists) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    
    const otpData = otpDoc.data();
    
    if (otpData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });
    }
    
    if (new Date(otpData.expiresAt) < new Date()) {
      await db.collection('otps').doc(email).delete();
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    
    const resetToken = uuidv4();
    
    await db.collection('otps').doc(email).update({
      verified: true,
      resetToken
    });
    
    return res.status(200).json({ success: true, message: 'OTP verified', data: { resetToken } });
  } catch (err) {
    console.error('[Verify OTP Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
};

exports.reset_password = async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  
  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  try {
    const { db } = require('../config/database');
    const otpDoc = await db.collection('otps').doc(email).get();
    
    if (!otpDoc.exists) return res.status(400).json({ success: false, message: 'Invalid request' });
    
    const otpData = otpDoc.data();
    
    if (!otpData.verified || otpData.resetToken !== resetToken) {
      return res.status(401).json({ success: false, message: 'Unauthorized reset request' });
    }
    
    if (new Date(otpData.expiresAt) < new Date()) {
      await db.collection('otps').doc(email).delete();
      return res.status(400).json({ success: false, message: 'Session expired, please try again' });
    }
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (snapshot.empty) return res.status(404).json({ success: false, message: 'User not found' });
    
    let userDoc = null;
    snapshot.forEach(doc => { userDoc = doc; });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await usersRef.doc(userDoc.id).update({ 
      password: hashedPassword,
      failedLoginAttempts: 0,
      isBlocked: false
    });
    
    // Clean up OTP document
    await db.collection('otps').doc(email).delete();
    
    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[Reset Password Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};
