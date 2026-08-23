const { db } = require("../config/database");
const { success, error, created } = require("../utils/response");
const { v4: uuidv4 } = require("uuid");
const { encrypt, decrypt } = require("../services/mailCrypto");
const webmailService = require("../services/webmailService");

/**
 * Default Corporate Info Mailbox for Super Admins
 */
const getDefaultInfoAccount = () => {
  const email = process.env.SMTP_USER || "info@multimarg.com";
  const password = process.env.SMTP_PASS || "Multi@marg!105";
  return {
    id: "default-superadmin-info",
    email,
    displayName: "Multimarg Corporate Info",
    encryptedPassword: encrypt(password),
    imapHost: process.env.IMAP_HOST || "imap.hostinger.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: process.env.SMTP_HOST || "smtp.hostinger.com",
    smtpPort: parseInt(process.env.SMTP_PORT || "465", 10),
    smtpSecure: true,
    isDefault: true,
    isSystemDefault: true,
    userId: "system"
  };
};

/**
 * Check if the user is a Super Admin
 */
const isUserSuperAdmin = (user) => {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  const email = (user.email || "").toLowerCase();
  return role.includes("super") || role === "owner" || email === "admin@multimarg.com" || email === "praveen.pr105@gmail.com";
};

/**
 * Check if the authenticated user has permission to access the specified mail account
 */
const verifyAccountAccess = async (user, accountId) => {
  const isSuper = isUserSuperAdmin(user);

  // Default corporate info account is accessible ONLY to Super Admins
  if (accountId === "default-superadmin-info") {
    if (isSuper) {
      return { authorized: true, account: getDefaultInfoAccount() };
    }
    return { authorized: false, error: "Forbidden: Corporate Info Mailbox is reserved for Super Admins", status: 403 };
  }

  const doc = await db.collection("mailAccounts").doc(accountId).get();
  if (!doc.exists) {
    return { authorized: false, error: "Mail account not found", status: 404 };
  }

  const account = { id: doc.id, ...doc.data() };

  if (isSuper) {
    return { authorized: true, account };
  }

  // Regular user check: Account email must match user's registered email or be owned by user
  const userEmail = (user.email || "").toLowerCase().trim();
  const accEmail = (account.email || "").toLowerCase().trim();

  const isOwner = account.userId === user.id || accEmail === userEmail;
  const isAssigned = Array.isArray(account.assignedUserIds) && account.assignedUserIds.includes(user.id);

  if (isOwner || isAssigned) {
    return { authorized: true, account };
  }

  return { authorized: false, error: "Access denied to this mailbox", status: 403 };
};

/**
 * GET /api/webmail/accounts
 * Retrieve accessible mail accounts for the current logged in user
 */
exports.getAccounts = async (req, res) => {
  const isSuper = isUserSuperAdmin(req.user);
  const userEmail = (req.user.email || "").toLowerCase().trim();

  const snapshot = await db.collection("mailAccounts").get();
  const accounts = [];

  // If Super Admin, automatically inject the pre-configured default Corporate Info Mailbox
  if (isSuper) {
    const defaultAcc = getDefaultInfoAccount();
    accounts.push({
      id: defaultAcc.id,
      email: defaultAcc.email,
      displayName: defaultAcc.displayName,
      imapHost: defaultAcc.imapHost,
      imapPort: defaultAcc.imapPort,
      smtpHost: defaultAcc.smtpHost,
      smtpPort: defaultAcc.smtpPort,
      isDefault: true,
      isSystemDefault: true,
      userId: "system"
    });
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    const accEmail = (data.email || "").toLowerCase().trim();
    const isOwner = data.userId === req.user.id || accEmail === userEmail;
    const isAssigned = Array.isArray(data.assignedUserIds) && data.assignedUserIds.includes(req.user.id);

    if (isSuper || isOwner || isAssigned) {
      accounts.push({
        id: doc.id,
        email: data.email,
        displayName: data.displayName || data.email,
        imapHost: data.imapHost || "imap.hostinger.com",
        imapPort: data.imapPort || 993,
        smtpHost: data.smtpHost || "smtp.hostinger.com",
        smtpPort: data.smtpPort || 465,
        userId: data.userId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    }
  });

  const maxAllowed = isSuper ? 6 : 1;
  const canAddMore = accounts.length < maxAllowed;

  return success(res, {
    message: "Mail accounts retrieved successfully",
    data: accounts,
    meta: {
      isSuperAdmin: isSuper,
      maxAllowed,
      currentCount: accounts.length,
      canAddMore
    }
  });
};

/**
 * POST /api/webmail/accounts
 * Connect and save a new Hostinger/custom mail account with strict role limits
 */
exports.addAccount = async (req, res) => {
  const {
    email,
    password,
    displayName,
    imapHost = "imap.hostinger.com",
    imapPort = 993,
    imapSecure = true,
    smtpHost = "smtp.hostinger.com",
    smtpPort = 465,
    smtpSecure = true
  } = req.body;

  if (!email || !password) {
    return error(res, { message: "Email and password are required", statusCode: 400 });
  }

  const isSuper = isUserSuperAdmin(req.user);
  const userEmail = (req.user.email || "").toLowerCase().trim();
  const targetEmail = email.toLowerCase().trim();

  // Enforce Account Limits
  const userSnapshot = await db.collection("mailAccounts").where("userId", "==", req.user.id).get();
  const existingCount = userSnapshot.size;

  if (!isSuper) {
    // Regular users (employee, vendor, client, driver, admin) are strictly limited to 1 mailbox
    if (existingCount >= 1) {
      return error(res, {
        message: "Account Limit Reached: Employees, Admins, Clients, and Vendors are allowed 1 personal mailbox. Contact Super Admin to manage your accounts.",
        statusCode: 403
      });
    }

    // Must match their registered IAM email
    if (targetEmail !== userEmail) {
      return error(res, {
        message: `Forbidden: You can only connect your registered IAM business email (${userEmail})`,
        statusCode: 403
      });
    }
  } else {
    // Super Admin is limited to 5 custom accounts (plus 1 default Info Mail = 6 total)
    if (existingCount >= 5) {
      return error(res, {
        message: "Super Admin Limit Reached: You have reached the maximum allowed of 5 custom mailboxes (+1 corporate default info mailbox).",
        statusCode: 403
      });
    }
  }

  // Verify credentials with IMAP & SMTP server
  const testAccount = {
    email: targetEmail,
    password,
    imapHost,
    imapPort: parseInt(imapPort, 10),
    imapSecure,
    smtpHost,
    smtpPort: parseInt(smtpPort, 10),
    smtpSecure
  };

  try {
    await webmailService.testConnection(testAccount);
  } catch (connErr) {
    return error(res, {
      message: `Mail server connection failed: ${connErr.message}. Please check your Hostinger email ID and password.`,
      statusCode: 400
    });
  }

  // Encrypt password for safe storage
  const encryptedPassword = encrypt(password);

  // Check if account already exists
  const existingSnapshot = await db.collection("mailAccounts").where("email", "==", targetEmail).get();
  let accountId = uuidv4();
  
  if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];
    accountId = existingDoc.id;
  }

  const accountRecord = {
    id: accountId,
    email: targetEmail,
    displayName: displayName || targetEmail.split("@")[0],
    encryptedPassword,
    imapHost,
    imapPort: parseInt(imapPort, 10),
    imapSecure,
    smtpHost,
    smtpPort: parseInt(smtpPort, 10),
    smtpSecure,
    userId: req.user.id,
    updatedAt: new Date().toISOString()
  };

  if (existingSnapshot.empty) {
    accountRecord.createdAt = new Date().toISOString();
  }

  await db.collection("mailAccounts").doc(accountId).set(accountRecord, { merge: true });

  return created(res, {
    message: "Mail account connected and authenticated successfully",
    data: {
      id: accountId,
      email: targetEmail,
      displayName: accountRecord.displayName,
      imapHost,
      smtpHost
    }
  });
};

/**
 * DELETE /api/webmail/accounts/:id
 * Disconnect a mail account
 */
exports.removeAccount = async (req, res) => {
  const { id } = req.params;
  const access = await verifyAccountAccess(req.user, id);
  if (!access.authorized) {
    return error(res, { message: access.error, statusCode: access.status });
  }

  await db.collection("mailAccounts").doc(id).delete();

  return success(res, {
    message: "Mail account disconnected successfully"
  });
};

/**
 * GET /api/webmail/folders
 * Get folder tree and unread counters
 */
exports.getFolders = async (req, res) => {
  const { accountId } = req.query;
  if (!accountId) {
    return error(res, { message: "accountId query parameter is required", statusCode: 400 });
  }

  const access = await verifyAccountAccess(req.user, accountId);
  if (!access.authorized) {
    return error(res, { message: access.error, statusCode: access.status });
  }

  try {
    const folders = await webmailService.getFolders(access.account);
    return success(res, {
      message: "Folders fetched successfully",
      data: folders
    });
  } catch (err) {
    console.error("[Webmail Controller] getFolders error:", err);
    return error(res, { message: `Failed to fetch folders: ${err.message}`, statusCode: 500 });
  }
};

/**
 * GET /api/webmail/messages
 * Get message headers list in folder
 */
exports.getMessages = async (req, res) => {
  const { accountId, folder = "INBOX", page = 1, limit = 30, search = "", filter = "all" } = req.query;
  if (!accountId) {
    return error(res, { message: "accountId is required", statusCode: 400 });
  }

  const access = await verifyAccountAccess(req.user, accountId);
  if (!access.authorized) {
    return error(res, { message: access.error, statusCode: access.status });
  }

  try {
    const result = await webmailService.getMessages(access.account, {
      folder,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 30,
      search,
      filter
    });

    return success(res, {
      message: "Messages fetched successfully",
      data: result.messages,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      }
    });
  } catch (err) {
    console.error("[Webmail Controller] getMessages error:", err);
    return error(res, { message: `Failed to load messages: ${err.message}`, statusCode: 500 });
  }
};

/**
 * GET /api/webmail/messages/:uid
 * Get full email body and attachment info
 */
exports.getMessageDetail = async (req, res) => {
  const { uid } = req.params;
  const { accountId, folder = "INBOX" } = req.query;

  if (!accountId || !uid) {
    return error(res, { message: "accountId and message UID are required", statusCode: 400 });
  }

  const access = await verifyAccountAccess(req.user, accountId);
  if (!access.authorized) {
    return error(res, { message: access.error, statusCode: access.status });
  }

  try {
    const detail = await webmailService.getMessageDetail(access.account, {
      folder,
      uid
    });

    return success(res, {
      message: "Message detail loaded successfully",
      data: detail
    });
  } catch (err) {
    console.error("[Webmail Controller] getMessageDetail error:", err);
    return error(res, { message: `Failed to load email: ${err.message}`, statusCode: 500 });
  }
};

/**
 * GET /api/webmail/messages/:uid/attachment/:attachmentId
 * Download specific email attachment
 */
exports.downloadAttachment = async (req, res) => {
  const { uid, attachmentId } = req.params;
  const { accountId, folder = "INBOX" } = req.query;

  if (!accountId || !uid || attachmentId === undefined) {
    return error(res, { message: "accountId, uid, and attachmentId are required", statusCode: 400 });
  }

  const access = await verifyAccountAccess(req.user, accountId);
  if (!access.authorized) {
    return error(res, { message: access.error, statusCode: access.status });
  }

  try {
    const file = await webmailService.getAttachment(access.account, {
      folder,
      uid,
      attachmentId
    });

    const isPdf = file.contentType === "application/pdf" || (file.filename && file.filename.toLowerCase().endsWith(".pdf"));
    const disposition = isPdf ? "inline" : "attachment";
    res.setHeader("Content-Type", file.contentType || (isPdf ? "application/pdf" : "application/octet-stream"));
    res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(file.filename)}"`);
    if (file.size) {
      res.setHeader("Content-Length", file.size);
    }

    return res.send(file.content);
  } catch (err) {
    console.error("[Webmail Controller] downloadAttachment error:", err);
    return error(res, { message: `Failed to download attachment: ${err.message}`, statusCode: 500 });
  }
};

/**
 * POST /api/webmail/send
 * Compose and send an email with optional attachments
 */
exports.sendMessage = async (req, res) => {
  const {
    accountId,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    inReplyTo,
    references,
    senderName,
    senderDesignation,
    senderPhone
  } = req.body || {};

  console.log(`[Webmail Send] Request received from user ${req.user?.email} for accountId: ${accountId}, recipient: ${to}`);

  if (!accountId || !to) {
    console.warn(`[Webmail Send Failed] Missing parameters: accountId=${accountId}, to=${to}`);
    return error(res, { message: "Account ID and recipient (to) are required", statusCode: 400 });
  }

  const access = await verifyAccountAccess(req.user, accountId);
  if (!access.authorized) {
    console.warn(`[Webmail Send Failed] verifyAccountAccess denied: ${access.error}`);
    return error(res, { message: access.error, statusCode: access.status });
  }

  // Parse recipients (comma separated or JSON array string)
  const parseRecipients = (val) => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (_e) {}
    return String(val).split(",").map(e => e.trim()).filter(Boolean);
  };

  const parsedTo = parseRecipients(to);
  const parsedCc = parseRecipients(cc);
  const parsedBcc = parseRecipients(bcc);

  const attachments = req.files || [];

  try {
    const sendResult = await webmailService.sendMail(access.account, {
      to: parsedTo,
      cc: parsedCc,
      bcc: parsedBcc,
      subject,
      text,
      html,
      attachments,
      inReplyTo,
      references,
      senderName,
      senderDesignation,
      senderPhone
    });

    return success(res, {
      message: "Email sent successfully",
      data: sendResult
    });
  } catch (err) {
    console.error("[Webmail Controller] sendMessage error:", err);
    return error(res, { message: `Failed to send email: ${err.message}`, statusCode: 500 });
  }
};

/**
 * POST /api/webmail/flags
 * Update read/unread/starred flag
 */
exports.updateFlags = async (req, res) => {
  const { accountId, folder = "INBOX", uids, addFlags = [], removeFlags = [] } = req.body;

  if (!accountId || !uids) {
    return error(res, { message: "accountId and uids are required", statusCode: 400 });
  }

  const access = await verifyAccountAccess(req.user, accountId);
  if (!access.authorized) {
    return error(res, { message: access.error, statusCode: access.status });
  }

  try {
    await webmailService.updateFlags(access.account, {
      folder,
      uids,
      addFlags,
      removeFlags
    });

    return success(res, { message: "Message flags updated successfully" });
  } catch (err) {
    console.error("[Webmail Controller] updateFlags error:", err);
    return error(res, { message: `Failed to update flags: ${err.message}`, statusCode: 500 });
  }
};

/**
 * POST /api/webmail/move
 * Move messages to another folder (e.g. Trash)
 */
exports.moveMessages = async (req, res) => {
  const { accountId, sourceFolder = "INBOX", destinationFolder, uids } = req.body;

  if (!accountId || !destinationFolder || !uids) {
    return error(res, { message: "accountId, destinationFolder, and uids are required", statusCode: 400 });
  }

  const access = await verifyAccountAccess(req.user, accountId);
  if (!access.authorized) {
    return error(res, { message: access.error, statusCode: access.status });
  }

  try {
    await webmailService.moveMessages(access.account, {
      sourceFolder,
      destinationFolder,
      uids
    });

    return success(res, { message: "Messages moved successfully" });
  } catch (err) {
    console.error("[Webmail Controller] moveMessages error:", err);
    return error(res, { message: `Failed to move messages: ${err.message}`, statusCode: 500 });
  }
};

/**
 * DELETE /api/webmail/messages
 * Delete messages permanently
 */
exports.deleteMessages = async (req, res) => {
  const { accountId, folder = "INBOX", uids } = req.body;

  if (!accountId || !uids) {
    return error(res, { message: "accountId and uids are required", statusCode: 400 });
  }

  const access = await verifyAccountAccess(req.user, accountId);
  if (!access.authorized) {
    return error(res, { message: access.error, statusCode: access.status });
  }

  try {
    await webmailService.deleteMessages(access.account, {
      folder,
      uids
    });

    return success(res, { message: "Messages deleted successfully" });
  } catch (err) {
    console.error("[Webmail Controller] deleteMessages error:", err);
    return error(res, { message: `Failed to delete messages: ${err.message}`, statusCode: 500 });
  }
};
