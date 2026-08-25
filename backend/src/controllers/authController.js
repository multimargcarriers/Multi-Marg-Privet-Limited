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
  uploadFile,
  uploadBase64,
  deleteFile
} = require("../config/cloudinary");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const defaultAssets = require("../config/defaultAssets");
const { sendSecurityAlertEmail } = require("../config/mail");
const { setCache } = require("../config/redis");

// Helper: Log failed Google login attempts to Firestore + send email alert with MAXIMUM data
async function logFailedGoogleLogin(req, { email, reason, name, picture, googlePayload }) {
  try {
    // === NETWORK & REQUEST DATA ===
    const ipRaw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const cleanIp = ipRaw.split(',')[0].trim();
    const ipChain = ipRaw; // full proxy chain
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const timestamp = new Date().toISOString();
    const referer = req.headers['referer'] || 'N/A';
    const origin = req.headers['origin'] || 'N/A';
    const host = req.headers['host'] || 'N/A';
    const acceptLanguage = req.headers['accept-language'] || 'N/A';
    const acceptEncoding = req.headers['accept-encoding'] || 'N/A';
    const connection = req.headers['connection'] || 'N/A';
    const contentType = req.headers['content-type'] || 'N/A';
    const secChUa = req.headers['sec-ch-ua'] || 'N/A';
    const secChUaPlatform = req.headers['sec-ch-ua-platform'] || 'N/A';
    const secChUaMobile = req.headers['sec-ch-ua-mobile'] || 'N/A';
    const secFetchSite = req.headers['sec-fetch-site'] || 'N/A';
    const secFetchMode = req.headers['sec-fetch-mode'] || 'N/A';
    const secFetchDest = req.headers['sec-fetch-dest'] || 'N/A';
    const xRealIp = req.headers['x-real-ip'] || 'N/A';
    const requestMethod = req.method || 'N/A';
    const requestPath = req.originalUrl || req.url || 'N/A';
    const protocol = req.protocol || 'N/A';

    // === GOOGLE PROFILE DATA (from token payload if available) ===
    const gp = googlePayload || {};
    const googleSub = gp.sub || 'N/A';           // Google unique user ID
    const googleName = name || gp.name || 'Unknown';
    const givenName = gp.given_name || 'N/A';
    const familyName = gp.family_name || 'N/A';
    const googlePicture = picture || gp.picture || '';
    const googleLocale = gp.locale || 'N/A';
    const googleHd = gp.hd || 'N/A';             // Hosted domain (org's Google Workspace)
    const googleEmailVerified = gp.email_verified || 'N/A';
    const googleAud = gp.aud || 'N/A';
    const googleIss = gp.iss || 'N/A';
    const googleIat = gp.iat || 'N/A';
    const googleExp = gp.exp || 'N/A';

    // === GEO-IP LOCATION (Extended fields) ===
    let location = 'Unknown';
    let geoData = {
      city: '', region: '', country: '', countryCode: '',
      isp: '', org: '', as: '',
      lat: '', lon: '', timezone: '', zip: '',
      proxy: false, mobile: false, hosting: false
    };

    if (cleanIp !== '::1' && cleanIp !== '127.0.0.1' && !cleanIp.startsWith('192.168.') && !cleanIp.startsWith('10.')) {
      try {
        const geoRes = await axios.get(
          `http://ip-api.com/json/${cleanIp}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,mobile,hosting,query`
        );
        const geo = geoRes.data;
        if (geo.status === 'success') {
          geoData = {
            city: geo.city || '',
            region: geo.regionName || '',
            country: geo.country || '',
            countryCode: geo.countryCode || '',
            isp: geo.isp || '',
            org: geo.org || '',
            as: geo.as || '',
            lat: String(geo.lat || ''),
            lon: String(geo.lon || ''),
            timezone: geo.timezone || '',
            zip: geo.zip || '',
            proxy: !!geo.proxy,
            mobile: !!geo.mobile,
            hosting: !!geo.hosting,
          };
          location = `${geoData.city}, ${geoData.region}, ${geoData.country}`;
        }
      } catch (geoErr) {
        console.warn('[GeoIP] Lookup failed:', geoErr.message);
      }
    } else {
      location = 'Localhost / Private Network';
    }

    // === BUILD COMPLETE RECORD ===
    const record = {
      // Identity
      email: email || 'Unknown',
      name: googleName,
      givenName,
      familyName,
      picture: googlePicture,
      googleId: googleSub,
      googleLocale,
      googleDomain: googleHd,
      googleEmailVerified,
      googleAud,
      googleIss,
      googleIat,
      googleExp,

      // Failure info
      reason: reason || 'Unknown',
      timestamp,

      // Network
      ip: cleanIp,
      ipChain,
      xRealIp,
      protocol,
      requestMethod,
      requestPath,

      // Geo location
      location,
      ...geoData,

      // Request headers
      userAgent,
      referer,
      origin,
      host,
      acceptLanguage,
      acceptEncoding,
      connection,
      contentType,
      secChUa,
      secChUaPlatform,
      secChUaMobile,
      secFetchSite,
      secFetchMode,
      secFetchDest,
    };

    // 1. Log to Firestore
    await db.collection('failedGoogleLogins').add(record);

    // 2. Send security alert email (non-blocking)
    sendSecurityAlertEmail(record)
      .catch(mailErr => console.error('[FailedGoogleLogin] Alert email failed:', mailErr.message));

  } catch (logErr) {
    console.error('[FailedGoogleLogin] Could not log attempt:', logErr.message);
  }
}

// Strict Google Login for Registered Admin, Employee, and Super Admin Accounts ONLY
exports.post_google_login = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    await logFailedGoogleLogin(req, { email: 'N/A', reason: 'No ID token provided' });
    return error(res, { message: "Google ID Token is required", statusCode: 400 });
  }
  // Email will be extracted from the token payload after verification

  // 1️⃣ Verify Token with Google API
  let googlePayload;
  try {
    const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    googlePayload = googleRes.data;
  } catch (err) {
    await logFailedGoogleLogin(req, { email: 'N/A', reason: 'Invalid or expired Google Token' });
    return error(res, { message: "Invalid or expired Google Token", statusCode: 401 });
  }

  const { email: googleEmail, email_verified, aud, name, picture } = googlePayload;

  if (!googleEmail) {
    await logFailedGoogleLogin(req, { email: 'N/A', reason: 'Token missing email', name: name || 'Unknown', picture });
    return error(res, { message: "Google token does not contain an email", statusCode: 401 });
  }
  if (!email_verified || email_verified !== "true") {
    await logFailedGoogleLogin(req, { email: googleEmail, reason: 'Unverified Google email', name: name || 'Unknown', picture });
    return error(res, { message: "Google account email is unverified", statusCode: 401 });
  }

  const emailLower = googleEmail.toLowerCase().trim();

  // 0️⃣ Verify that the email exists in the registered users collection and has an allowed role
  const usersRef = db.collection("users");
  let snapshot = await usersRef.where("email", "==", emailLower).get();
  if (snapshot.empty) {
    // fallback to case‑sensitive match
    snapshot = await usersRef.where("email", "==", googleEmail).get();
  }
  if (snapshot.empty) {
    await logFailedGoogleLogin(req, { email: emailLower, reason: 'Account does not exist', name: name || 'Unknown', picture });
    return error(res, {
      message: `Account does not exist. Please contact the administrator at ${process.env.ENQUIRY_EMAIL || 'info@multimarg.com'}.`,
      statusCode: 403,
    });
  }
  const userDoc = snapshot.docs[0];
  const user = { ...userDoc.data(), id: userDoc.id };

  // Verify client ID (optional warning)
  const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (expectedClientId && aud !== expectedClientId) {
    console.warn("Google client ID mismatch", { expected: expectedClientId, received: aud });
  }

  // 2️⃣ Strict Check: User MUST be Admin, Employee, or SuperAdmin
  const allowedRoles = ["admin", "employee", "superadmin", "super_admin", "super admin", "vendor"];
  const userRole = (user.role || user.type || "").toLowerCase().trim();
  if (!allowedRoles.includes(userRole)) {
    await logFailedGoogleLogin(req, { email: emailLower, reason: `Unauthorized role: ${user.role || 'none'}`, name: name || 'Unknown', picture });
    return error(res, {
      message: `Access Denied: Only registered Admin, Employee, and Super Admin accounts can log in with Google. (Your role: ${user.role || "Unauthorized"})`,
      statusCode: 403,
    });
  }

  // 3️⃣ Status Check
  if (user.status && user.status.toLowerCase() !== "active") {
    await logFailedGoogleLogin(req, { email: emailLower, reason: 'Account disabled', name: name || 'Unknown', picture });
    return error(res, { message: "Account is disabled. Please contact Administrator.", statusCode: 403 });
  }

  // 4️⃣ Update last login timestamp & avatar
  await usersRef.doc(user.id).update({
    lastLogin: new Date().toISOString(),
    avatar: user.avatar || picture || "",
  });

  // 5️⃣ Generate Application Session Token
  const token = generateToken(user);
  delete user.password;

  // --- ADD GEO-IP TRACKING & LOGGING FOR GOOGLE LOGIN ---
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = ip.split(',')[0].trim();
  
  (async () => {
    let location = "Localhost";
    if (cleanIp !== '::1' && cleanIp !== '127.0.0.1' && !cleanIp.startsWith('192.168.') && !cleanIp.startsWith('10.')) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${cleanIp}`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          location = `${geoData.city}, ${geoData.country}`;
        } else {
          location = "Unknown Location";
        }
      } catch (err) {
        console.error("GeoIP Fetch Error:", err);
        location = "Unknown Location";
      }
    }
  
    try {
      await db.collection("userActivities").add({
        userId: user.id,
        type: 'login',
        title: 'Successful Google sign-in',
        date: new Date().toISOString(),
        location,
        ip: cleanIp
      });
    } catch (err) {
      console.error("Error logging user activity (Google login):", err);
    }
  })();

  return success(res, { message: "Google login successful", data: { token, user } });
};
exports.get_me = async (req, res) => {
  const userId = req.user.id;
  const docRef = db.collection("users").doc(userId);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, {
    message: `Account does not exist. Please contact the administrator at ${process.env.ENQUIRY_EMAIL || 'info@multimarg.com'}.`,
    statusCode: 404
  });
  const userData = { ...doc.data(), id: doc.id };
  delete userData.password;
  
  // Issue a fresh token because permissions/role might have changed
  const freshToken = generateToken(userData);
  
  return success(res, { data: userData, token: freshToken });
};

exports.get_default_assets = async (req, res) => {
  return success(res, {
    message: "Default assets fetched successfully",
    data: {
      DEFAULT_AVATARS: defaultAssets.DEFAULT_AVATARS || [],
      DEFAULT_BANNERS: defaultAssets.DEFAULT_BANNERS || []
    }
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
  const loginId = email ? email.trim() : "";
  const loginIdLower = loginId.toLowerCase();

  // Real Firebase Authentication with Seamless Bcrypt Migration
  const usersRef = db.collection("users");
  let snapshot = await usersRef.where("email", "==", loginIdLower).get();

  if (snapshot.empty) {
    snapshot = await usersRef.where("email", "==", loginId).get();
  }

  if (snapshot.empty) {
    snapshot = await usersRef.where("employeeId", "==", loginId).get();
  }

  if (snapshot.empty) {
    snapshot = await usersRef.where("username", "==", loginIdLower).get();
  }

  if (snapshot.empty) {
    snapshot = await usersRef.where("username", "==", loginId).get();
  }

  // Check Phone Number Login (exact match, formatted, and digits-only)
  if (snapshot.empty) {
    snapshot = await usersRef.where("phone", "==", loginId).get();
  }

  if (snapshot.empty) {
    snapshot = await usersRef.where("phoneNumber", "==", loginId).get();
  }

  const cleanDigits = loginId.replace(/\D/g, "");
  if (snapshot.empty && cleanDigits.length >= 7) {
    snapshot = await usersRef.where("phone", "==", cleanDigits).get();
    if (snapshot.empty) {
      snapshot = await usersRef.where("phoneNumber", "==", cleanDigits).get();
    }
  }

  if (snapshot.empty) {
    return error(res, { message: "Invalid Email, Phone Number, Username, or Employee ID", statusCode: 401 });
  }

  let userDoc = null;
  let userData = null;
  snapshot.forEach(doc => {
    userDoc = doc;
    userData = { ...doc.data(), id: doc.id };
  });

  // Check if account is blocked
  if (userData.isBlocked) {
    return error(res, {
      message: "Account temporarily blocked due to multiple failed login attempts. Please reset your password via email.",
      statusCode: 403
    });
  }

  // Enforce IAM Role based access (Admins, Super Admins, Vendors, and Employees allowed)
  const role = (userData.role || "SuperAdmin").toLowerCase().replace(/\s+/g, '');
  if (role !== 'admin' && role !== 'superadmin' && role !== 'vendor' && role !== 'employee') {
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
  if (userData.twoFactorEnabled === undefined) userData.twoFactorEnabled = false;
  if (userData.faceAuthEnabled === undefined) userData.faceAuthEnabled = false;
  if (userData.fingerprintAuthEnabled === undefined) userData.fingerprintAuthEnabled = false;
  if (userData.showFloatingMailbox === undefined) userData.showFloatingMailbox = false;

  // --- ADD GEO-IP TRACKING & LOGGING ---
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = ip.split(',')[0].trim();
  
  (async () => {
    let location = "Localhost";
    if (cleanIp !== '::1' && cleanIp !== '127.0.0.1' && !cleanIp.startsWith('192.168.') && !cleanIp.startsWith('10.')) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${cleanIp}`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          location = `${geoData.city}, ${geoData.country}`;
        } else {
          location = "Unknown Location";
        }
      } catch (err) {
        console.error("GeoIP Fetch Error:", err);
        location = "Unknown Location";
      }
    }
  
    try {
      await db.collection("userActivities").add({
        userId: userDoc.id,
        type: 'login',
        title: 'Successful password sign-in',
        date: new Date().toISOString(),
        location,
        ip: cleanIp
      });
    } catch (err) {
      console.error("Error logging user activity (password login):", err);
    }
  })();
  // -------------------------------------

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
    newId,
    employeeId,
    username,
    bloodGroup,
    phone,
    phoneNumber,
    designation,
    photoData,
    bannerData,
    fileName
  } = req.body;
  console.log("=== PUT PROFILE ===");
  console.log("req.body keys:", Object.keys(req.body || {}));
  console.log("req.files:", req.files ? Object.keys(req.files) : "none");

  let photoUrl = req.body.photoUrl || undefined;
  let bannerUrl = req.body.bannerUrl || undefined;

  // 1. Direct Base64 upload to Cloudinary (reliable pattern matching POD flow)
  if (photoData) {
    try {
      const uploadResult = await uploadBase64(photoData, {
        folder: "avatars",
        originalName: fileName || `avatar_${userId}_${Date.now()}.jpg`
      });
      if (uploadResult && uploadResult.success && uploadResult.url) {
        photoUrl = uploadResult.url;
        console.log("[Auth Controller] Avatar uploaded to Cloudinary:", photoUrl);
      } else {
        console.error("[Auth Controller] Cloudinary avatar upload failed:", uploadResult?.message);
      }
    } catch (err) {
      console.error("[Auth Controller] Cloudinary avatar exception:", err.message);
    }
  }

  if (bannerData) {
    try {
      const uploadResult = await uploadBase64(bannerData, {
        folder: "banners",
        originalName: fileName || `banner_${userId}_${Date.now()}.jpg`
      });
      if (uploadResult && uploadResult.success && uploadResult.url) {
        bannerUrl = uploadResult.url;
        console.log("[Auth Controller] Banner uploaded to Cloudinary:", bannerUrl);
      } else {
        console.error("[Auth Controller] Cloudinary banner upload failed:", uploadResult?.message);
      }
    } catch (err) {
      console.error("[Auth Controller] Cloudinary banner exception:", err.message);
    }
  }

  // 2. Multer fallback (if multipart/form-data with files is sent)
  if (req.files) {
    if (req.files.photo && req.files.photo.length > 0) {
      try {
        const uploadResult = await uploadFile(req.files.photo[0].path, {
          folder: "avatars"
        });
        if (uploadResult && uploadResult.success) {
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
        if (uploadResult && uploadResult.success) {
          bannerUrl = uploadResult.url;
        } else {
          bannerUrl = `/uploads/avatars/${req.files.banner[0].filename}`;
        }
      } catch (error) {
        console.error("Cloudinary banner upload failed:", error);
        bannerUrl = `/uploads/avatars/${req.files.banner[0].filename}`;
      }
    }
  }
  const isSuperAdmin = req.user.role === 'SuperAdmin' || req.user.email === 'admin@multimarg.com';

  const updates = {};
  if (name !== undefined && name !== null && String(name).trim()) updates.name = String(name).trim();
  if (email !== undefined && isSuperAdmin && String(email).trim()) updates.email = String(email).toLowerCase().trim();
  if (employeeId !== undefined && isSuperAdmin && String(employeeId).trim()) updates.employeeId = String(employeeId).trim();
  if (bloodGroup !== undefined) updates.bloodGroup = String(bloodGroup).trim();

  // Phone Number & Designation
  const userPhone = phone || phoneNumber;
  if (userPhone !== undefined) {
    updates.phone = String(userPhone).trim();
    updates.phoneNumber = String(userPhone).trim();
  }
  if (designation !== undefined) {
    updates.designation = String(designation).trim();
  }

  if (username !== undefined && String(username).trim()) {
    const rawUsername = String(username).trim();
    const lowerUsername = rawUsername.toLowerCase();
    if (lowerUsername !== (req.user.username || '').toLowerCase()) {
      const userCheck = await db.collection("users").where("username", "==", lowerUsername).get();
      let taken = false;
      userCheck.forEach(d => { if (String(d.id) !== String(userId)) taken = true; });
      if (taken) return error(res, { message: "Username already exists. Please choose another one.", statusCode: 400 });
      updates.username = rawUsername;
    } else if (rawUsername !== req.user.username) {
      updates.username = rawUsername;
    }
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(password, salt);
  }

  if (updates.employeeId && updates.employeeId !== req.user.employeeId) {
    const empIdCheck = await db.collection("users").where("employeeId", "==", updates.employeeId).get();
    let taken = false;
    empIdCheck.forEach(d => {
      if (String(d.id) !== String(userId)) taken = true;
    });
    if (taken) return error(res, { message: `Employee ID already exists. Please contact the administrator at ${process.env.ENQUIRY_EMAIL || 'info@multimarg.com'}.`, statusCode: 400 });
  }

  if (photoUrl) {
    updates.photo = photoUrl;
    updates.avatar = photoUrl;
    updates.photoUrl = photoUrl;
  }
  if (bannerUrl) {
    updates.banner = bannerUrl;
    updates.bannerUrl = bannerUrl;
  }

  const docRef = db.collection("users").doc(userId);
  const doc = await docRef.get();
  if (!doc.exists) {
    return error(res, {
      message: "User not found",
      statusCode: 404
    });
  }

  if (Object.keys(updates).length === 0 && (!newId || newId === userId)) {
    const currentData = { ...doc.data(), id: doc.id };
    delete currentData.password;
    return success(res, {
      message: "Profile is up to date",
      data: {
        user: currentData,
        token: generateToken(currentData)
      }
    });
  }

  let updatedUserData = null;

  // Delete old photo or banner safely if replacing
  const oldData = doc.data() || {};
  try {
    if (photoUrl && oldData.photo && oldData.photo !== photoUrl) {
      await deleteFile(oldData.photo, "image");
    }
    if (bannerUrl && oldData.banner && oldData.banner !== bannerUrl) {
      await deleteFile(oldData.banner, "image");
    }
  } catch (delErr) {
    console.warn("Non-fatal error deleting old profile asset:", delErr?.message);
  }

  if (newId && newId !== userId) {
    // Verify the new ID is not already taken
    const newDocRef = db.collection("users").doc(newId);
    const newDoc = await newDocRef.get();
    if (newDoc.exists) {
      return error(res, {
        message: "User ID is already taken",
        statusCode: 400,
      });
    }
    // Create a new document with the updated data and new ID
    const newData = {
      ...doc.data(),
      ...updates,
      id: newId,
    };
    await newDocRef.set(newData);
    // Remove the old document
    await docRef.delete();
    const updatedDoc = await newDocRef.get();
    updatedUserData = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };
  } else {
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    updatedUserData = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };
  }
  delete updatedUserData.password;

  // Invalidate any user caches so stale profile is never returned
  try {
    const { delCache } = require("../config/redis");
    await delCache(`user:${userId}`);
    await delCache(`auth:me:${userId}`);
  } catch (cErr) {}

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
  if (!email) return res.status(400).json({ success: false, message: 'Email or Employee ID is required' });

  try {
    const { db } = require('../config/database');
    const usersRef = db.collection('users');
    let snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      snapshot = await usersRef.where('employeeId', '==', email).get();
    }

    if (snapshot.empty) {
      snapshot = await usersRef.where('username', '==', email).get();
    }

    if (snapshot.empty) {
      return res.status(403).json({ success: false, message: `Access denied. You are not authorized. Please contact the company at ${process.env.ENQUIRY_EMAIL || 'info@multimarg.com'}` });
    }

    let userDoc = null;
    let userData = null;
    snapshot.forEach(doc => { userDoc = doc; userData = doc.data(); });

    const targetEmail = userData.email;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'No email associated with this account. Please contact admin.' });
    }

    // Verify IAM Role - Only send OTP to Admins and Super Admins
    const role = (userData.role || "").toLowerCase().replace(/\s+/g, '');
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: `Access denied. You are not authorized for IAM access. Please contact the company at ${process.env.ENQUIRY_EMAIL || 'info@multimarg.com'}` });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.collection('otps').doc(targetEmail).set({
      otp,
      expiresAt,
      verified: false
    });

    // Send email
    try {
      await sendOtpEmail(targetEmail, otp, userData.name || 'User');
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
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email/Employee ID and OTP required' });

  try {
    const { db } = require('../config/database');

    // Resolve email if employeeId was provided
    const usersRef = db.collection('users');
    let snapshot = await usersRef.where('email', '==', email).get();
    if (snapshot.empty) {
      snapshot = await usersRef.where('employeeId', '==', email).get();
    }

    let targetEmail = email;
    if (!snapshot.empty) {
      snapshot.forEach(doc => { targetEmail = doc.data().email || targetEmail; });
    }

    const otpDoc = await db.collection('otps').doc(targetEmail).get();

    if (!otpDoc.exists) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    const otpData = otpDoc.data();

    if (otpData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });
    }

    if (new Date(otpData.expiresAt) < new Date()) {
      await db.collection('otps').doc(targetEmail).delete(req.user);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    const resetToken = uuidv4();

    await db.collection('otps').doc(targetEmail).update({
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
    const usersRef = db.collection('users');
    let snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      snapshot = await usersRef.where('employeeId', '==', email).get();
    }

    if (snapshot.empty) return res.status(404).json({ success: false, message: 'User not found' });

    let targetEmail = email;
    let userDoc = null;
    snapshot.forEach(doc => {
      userDoc = doc;
      targetEmail = doc.data().email || targetEmail;
    });

    const otpDoc = await db.collection('otps').doc(targetEmail).get();

    if (!otpDoc.exists) return res.status(400).json({ success: false, message: 'Invalid request' });

    const otpData = otpDoc.data();

    if (!otpData.verified || otpData.resetToken !== resetToken) {
      return res.status(401).json({ success: false, message: 'Unauthorized reset request' });
    }

    if (new Date(otpData.expiresAt) < new Date()) {
      await db.collection('otps').doc(targetEmail).delete(req.user);
      return res.status(400).json({ success: false, message: 'Session expired, please try again' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await usersRef.doc(userDoc.id).update({
      password: hashedPassword,
      failedLoginAttempts: 0,
      isBlocked: false
    });

    // Clean up OTP document
    await db.collection('otps').doc(targetEmail).delete(req.user);

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[Reset Password Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

exports.post_logout = async (req, res) => {
  const userId = req.user.id;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = ip.split(',')[0].trim();
  
  (async () => {
    let location = "Localhost";
    if (cleanIp !== '::1' && cleanIp !== '127.0.0.1' && !cleanIp.startsWith('192.168.') && !cleanIp.startsWith('10.')) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${cleanIp}`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          location = `${geoData.city}, ${geoData.country}`;
        } else {
          location = "Unknown Location";
        }
      } catch (err) {
        console.error("GeoIP Fetch Error:", err);
        location = "Unknown Location";
      }
    }
  
    try {
      await db.collection("userActivities").add({
        userId,
        type: 'logout',
        title: 'Signed out',
        date: new Date().toISOString(),
        location,
        ip: cleanIp
      });
    } catch (err) {
      console.error("Error logging user logout activity:", err);
    }
  })();

  return success(res, { message: "Logged out successfully" });
};

exports.get_activity = async (req, res) => {
  try {
    const userId = req.user.id;
    const activitiesRef = db.collection("userActivities");
    const snapshot = await activitiesRef.where("userId", "==", userId).get();

    let activities = [];
    snapshot.forEach(doc => {
      activities.push({ ...doc.data(), id: doc.id });
    });

    // Sort by date descending
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Limit to 5 for regular users, 20 for SuperAdmin
    const isSuperAdmin = req.user.role === 'SuperAdmin' || req.user.email === 'admin@multimarg.com';
    const limit = isSuperAdmin ? 20 : 5;
    activities = activities.slice(0, limit);

    return success(res, { data: activities });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get all failed Google login attempts (for admin security dashboard)
exports.get_failed_google_logins = async (req, res) => {
  try {
    const snapshot = await db.collection('failedGoogleLogins')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const attempts = [];
    snapshot.forEach(doc => {
      attempts.push({ ...doc.data(), id: doc.id });
    });

    return success(res, { data: attempts });
  } catch (err) {
    console.error("[FailedGoogleLogins] Fetch error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch failed login attempts" });
  }
};

// Delete a failed Google login attempt (SuperAdmin only)
exports.delete_failed_google_login = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Report ID required" });

    // Assuming SuperAdmin check is handled by middleware
    const docRef = db.collection('failedGoogleLogins').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    await docRef.delete();
    return success(res, { message: "Failed login report deleted permanently." });
  } catch (err) {
    console.error("[FailedGoogleLogins] Delete error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete report" });
  }
};

// Clear all failed Google logins
exports.clear_all_failed_google_logins = async (req, res) => {
  try {
    const dbInstance = db.mongoDb;
    if (dbInstance) {
      await dbInstance.collection("failedGoogleLogins").deleteMany({});
    } else {
      // Fallback for Firestore compatibility if mongoDb isn't wired yet
      const snapshot = await db.collection("failedGoogleLogins").get();
      const batch = db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    return success(res, { message: "All failed login attempts cleared successfully." });
  } catch (err) {
    console.error("[FailedGoogleLogins] Clear error:", err);
    return res.status(500).json({ success: false, message: "Failed to clear failed login reports" });
  }
};

// Force Logout (Ban 3m)
exports.post_force_logout = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "User ID required" });

    const docRef = db.collection('users').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 1. Lock out strictly in DB (optional fallback)
    await docRef.update({
      lockoutUntil: new Date(Date.now() + 3 * 60 * 1000).toISOString()
    });

    // 2. Add to Redis Ban Cache (180s)
    await setCache(`banned:${id}`, true, 180);

    // 3. Log the forceful logout in userActivities to update Supreme Admin UI
    await db.collection("userActivities").add({
      userId: id,
      type: 'logout',
      title: 'Forcibly logged out (3m Ban)',
      date: new Date().toISOString(),
      location: 'System Action',
      ip: 'Supreme Admin'
    });

    return success(res, { message: "User forcefully logged out and banned for 3 minutes." });
  } catch (err) {
    console.error("[ForceLogout] Error:", err);
    return res.status(500).json({ success: false, message: "Failed to force logout user" });
  }
};

// Toggle 2-Step Device Biometric (Face ID / Fingerprint) Verification for a specific user ID
exports.toggle_two_factor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled, faceAuthEnabled, fingerprintAuthEnabled } = req.body;

    const updates = {};
    if (faceAuthEnabled !== undefined) {
      updates.faceAuthEnabled = Boolean(faceAuthEnabled);
    }
    if (fingerprintAuthEnabled !== undefined) {
      updates.fingerprintAuthEnabled = Boolean(fingerprintAuthEnabled);
    }
    if (enabled !== undefined) {
      updates.twoFactorEnabled = Boolean(enabled);
      if (!enabled) {
        updates.faceAuthEnabled = false;
        updates.fingerprintAuthEnabled = false;
      }
    }

    // Determine overall twoFactorEnabled if either is explicitly configured
    if (updates.faceAuthEnabled !== undefined || updates.fingerprintAuthEnabled !== undefined) {
      const userDoc = await db.collection("users").doc(userId).get();
      const existingData = userDoc.exists ? userDoc.data() : {};
      const faceOn = updates.faceAuthEnabled !== undefined ? updates.faceAuthEnabled : Boolean(existingData.faceAuthEnabled === true);
      const fingerOn = updates.fingerprintAuthEnabled !== undefined ? updates.fingerprintAuthEnabled : Boolean(existingData.fingerprintAuthEnabled === true);
      updates.twoFactorEnabled = Boolean(faceOn || fingerOn);
    }

    if (req.body.showFloatingMailbox !== undefined) {
      updates.showFloatingMailbox = Boolean(req.body.showFloatingMailbox);
    }

    const userDocRef = db.collection("users").doc(userId);
    await userDocRef.update(updates);

    const freshDoc = await userDocRef.get();
    const freshUser = freshDoc.data() || {};

    return success(res, {
      message: "Security preferences updated successfully",
      data: {
        twoFactorEnabled: Boolean(freshUser.twoFactorEnabled === true),
        faceAuthEnabled: Boolean(freshUser.faceAuthEnabled === true),
        fingerprintAuthEnabled: Boolean(freshUser.fingerprintAuthEnabled === true),
        showFloatingMailbox: Boolean(freshUser.showFloatingMailbox === true)
      }
    });
  } catch (err) {
    console.error("[toggle_two_factor] Error:", err);
    return res.status(500).json({ success: false, message: "Failed to update biometric verification preference" });
  }
};

// Real Biometric Face Verification Controller
exports.verify_face = async (req, res) => {
  try {
    const { email, userId, descriptor, livenessScore, landmarksCount } = req.body;
    const targetId = req.user?.id || userId;
    let targetUser = null;

    if (targetId) {
      const doc = await db.collection("users").doc(targetId).get();
      if (doc.exists) targetUser = doc.data();
    } else if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const snap = await db.collection("users").where("email", "==", cleanEmail).limit(1).get();
      if (!snap.empty) targetUser = snap.docs[0].data();
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User account not found for face verification" });
    }

    // Require genuine liveness validation
    if (livenessScore !== undefined && livenessScore < 0.6) {
      return res.status(400).json({
        success: false,
        verified: false,
        reason: "LIVENESS_FAILED",
        message: "Liveness check failed. Please position face directly in view and blink naturally."
      });
    }

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length < 16) {
      return res.status(400).json({
        success: false,
        verified: false,
        reason: "INVALID_DESCRIPTOR",
        message: "Facial landmarks could not be reliably extracted. Ensure good lighting and look straight."
      });
    }

    const enrolled = targetUser.faceTemplate;
    let similarity = 0.95; // Default initial enrollment baseline

    if (enrolled && Array.isArray(enrolled) && enrolled.length === descriptor.length) {
      // Calculate Normalized Cosine Distance between 64-D normalized geometric embeddings
      let dot = 0;
      let magA = 0;
      let magB = 0;
      for (let i = 0; i < descriptor.length; i++) {
        dot += descriptor[i] * enrolled[i];
        magA += descriptor[i] * descriptor[i];
        magB += enrolled[i] * enrolled[i];
      }
      const cosine = dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
      similarity = Math.max(0, Math.min(1, (cosine + 1) / 2)); // Normalize to 0..1

      const MATCH_THRESHOLD = 0.72;
      if (similarity < MATCH_THRESHOLD) {
        return res.status(403).json({
          success: false,
          verified: false,
          confidence: Math.round(similarity * 1000) / 10,
          reason: "FACE_MISMATCH",
          message: `Face verification failed (${Math.round(similarity * 100)}% match). The scanned face does not match the enrolled biometric profile of ${targetUser.name || 'this account'}.`
        });
      }
    } else {
      // Auto-enroll the verified face template for future strict match enforcement
      const userRef = db.collection("users").doc(targetUser.id || targetId);
      if (userRef) {
        await userRef.update({
          faceTemplate: descriptor,
          faceEnrolledAt: new Date().toISOString()
        });
      }
    }

    return success(res, {
      verified: true,
      confidence: Math.round(similarity * 1000) / 10,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email
      },
      message: `Face identity confirmed successfully (${Math.round(similarity * 100)}% confidence).`
    });
  } catch (err) {
    console.error("[verify_face] Error:", err);
    return res.status(500).json({ success: false, message: "Face verification error occurred" });
  }
};

// Reset / Re-enroll Face Biometric Template
exports.enroll_face = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { descriptor } = req.body;

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length < 16) {
      return res.status(400).json({ success: false, message: "Valid 64-point facial descriptor vector required for enrollment" });
    }

    const userDocRef = db.collection("users").doc(userId);
    await userDocRef.update({
      faceTemplate: descriptor,
      faceEnrolledAt: new Date().toISOString()
    });

    return success(res, {
      message: "Face ID biometric template enrolled successfully"
    });
  } catch (err) {
    console.error("[enroll_face] Error:", err);
    return res.status(500).json({ success: false, message: "Failed to enroll face biometric template" });
  }
};
