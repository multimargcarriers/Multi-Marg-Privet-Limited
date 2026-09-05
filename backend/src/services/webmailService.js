const fs = require("fs");
const path = require("path");
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const nodemailer = require("nodemailer");
const { decrypt } = require("./mailCrypto");

/**
 * Helper to build ImapFlow client instance
 */
const getImapClient = (account) => {
  const host = account.imapHost || "imap.hostinger.com";
  const port = parseInt(account.imapPort || "993", 10);
  const secure = account.imapSecure !== undefined ? account.imapSecure : port === 993;
  const password = account.decryptedPassword || (account.encryptedPassword ? decrypt(account.encryptedPassword) : account.password);

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: {
      user: account.email,
      pass: password
    },
    logger: false,
    tls: {
      rejectUnauthorized: false
    }
  });

  return client;
};

/**
 * Helper to build Nodemailer Transporter instance
 */
const getSmtpTransporter = (account) => {
  const host = account.smtpHost || "smtp.hostinger.com";
  const port = parseInt(account.smtpPort || "465", 10);
  const secure = account.smtpSecure !== undefined ? account.smtpSecure : port === 465;
  const password = account.decryptedPassword || (account.encryptedPassword ? decrypt(account.encryptedPassword) : account.password);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: account.email,
      pass: password
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Test IMAP & SMTP connection credentials
 */
const testConnection = async (account) => {
  let imapSuccess = false;
  let smtpSuccess = false;
  let imapError = null;
  let smtpError = null;

  // 1. Test IMAP
  const client = getImapClient(account);
  try {
    await client.connect();
    imapSuccess = true;
    await client.logout();
  } catch (err) {
    imapError = err.message || "Failed to authenticate with IMAP server";
  }

  // 2. Test SMTP
  const transporter = getSmtpTransporter(account);
  try {
    await transporter.verify();
    smtpSuccess = true;
  } catch (err) {
    smtpError = err.message || "Failed to authenticate with SMTP server";
  }

  if (!imapSuccess || !smtpSuccess) {
    const errorMsg = [
      !imapSuccess ? `IMAP: ${imapError}` : null,
      !smtpSuccess ? `SMTP: ${smtpError}` : null
    ].filter(Boolean).join("; ");
    throw new Error(errorMsg || "Connection verification failed");
  }

  return { success: true, message: "Credentials verified successfully" };
};

/**
 * List folders with unread counts
 */
const getFolders = async (account) => {
  const client = getImapClient(account);
  await client.connect();
  const folders = [];

  try {
    const list = await client.list();
    for (const item of list) {
      let status = { messages: 0, unseen: 0 };
      try {
        status = await client.status(item.path, { messages: true, unseen: true });
      } catch (_e) {
        // Status check can be optional per folder
      }

      // Categorize special-use folders
      let role = "custom";
      const p = item.path.toUpperCase();
      if (item.specialUse) {
        role = item.specialUse.replace("\\", "").toLowerCase();
      } else if (p === "INBOX") {
        role = "inbox";
      } else if (p.includes("SENT")) {
        role = "sent";
      } else if (p.includes("DRAFT")) {
        role = "drafts";
      } else if (p.includes("TRASH") || p.includes("BIN")) {
        role = "trash";
      } else if (p.includes("SPAM") || p.includes("JUNK")) {
        role = "spam";
      } else if (p.includes("ARCHIVE")) {
        role = "archive";
      }

      folders.push({
        path: item.path,
        name: item.name,
        delimiter: item.delimiter,
        flags: Array.from(item.flags || []),
        role,
        total: status.messages || 0,
        unseen: status.unseen || 0
      });
    }
  } finally {
    await client.logout();
  }

  return folders;
};

/**
 * Smart Mailbox Path Resolver
 * Resolves case-sensitivity and IMAP prefix variations (e.g. SENT -> INBOX.Sent, Trash -> INBOX.Trash)
 */
const resolveMailbox = async (client, requestedFolder = "INBOX") => {
  if (!requestedFolder) return "INBOX";

  try {
    const list = await client.list();
    if (!list || list.length === 0) return requestedFolder;

    // 1. Exact match
    const exact = list.find(f => f.path === requestedFolder);
    if (exact) return exact.path;

    // 2. Case-insensitive path match
    const caseMatch = list.find(f => f.path.toLowerCase() === requestedFolder.toLowerCase());
    if (caseMatch) return caseMatch.path;

    // 3. Name match
    const nameMatch = list.find(f => f.name && f.name.toLowerCase() === requestedFolder.toLowerCase());
    if (nameMatch) return nameMatch.path;

    // 4. Role / Special-Use match
    const reqLower = requestedFolder.toLowerCase();
    const roleMatch = list.find(f => {
      const specialUse = (f.specialUse || "").replace("\\", "").toLowerCase();
      if (specialUse && specialUse === reqLower) return true;
      if (reqLower === "sent" && (f.path.toUpperCase().includes("SENT") || specialUse === "sent")) return true;
      if ((reqLower === "drafts" || reqLower === "draft") && (f.path.toUpperCase().includes("DRAFT") || specialUse === "drafts")) return true;
      if ((reqLower === "trash" || reqLower === "bin") && (f.path.toUpperCase().includes("TRASH") || f.path.toUpperCase().includes("BIN") || specialUse === "trash")) return true;
      if ((reqLower === "spam" || reqLower === "junk") && (f.path.toUpperCase().includes("SPAM") || f.path.toUpperCase().includes("JUNK") || specialUse === "junk")) return true;
      if (reqLower === "archive" && (f.path.toUpperCase().includes("ARCHIVE") || specialUse === "archive")) return true;
      if (reqLower === "inbox" && (f.path.toUpperCase() === "INBOX" || f.path.toUpperCase().endsWith(".INBOX"))) return true;
      return false;
    });
    if (roleMatch) return roleMatch.path;

    // 5. Partial substring match
    const partialMatch = list.find(f => f.path.toLowerCase().includes(reqLower));
    if (partialMatch) return partialMatch.path;

    return requestedFolder;
  } catch (err) {
    console.error("Error resolving mailbox:", err);
    return requestedFolder;
  }
};

/**
 * Fetch list of messages in folder
 */
const getMessages = async (account, { folder = "INBOX", page = 1, limit = 30, search = "", filter = "all" }) => {
  const client = getImapClient(account);
  await client.connect();

  const messages = [];
  let totalCount = 0;

  try {
    const resolvedFolder = await resolveMailbox(client, folder);
    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      totalCount = client.mailbox.exists || 0;
      if (totalCount === 0) {
        return { messages: [], total: 0, page: 1, totalPages: 1 };
      }

      // Formulate search criteria
      let searchQuery = { all: true };
      if (filter === "unseen") {
        searchQuery = { unseen: true };
      } else if (filter === "flagged") {
        searchQuery = { flagged: true };
      }

      if (search && search.trim()) {
        const queryText = search.trim();
        searchQuery = {
          ...searchQuery,
          or: [
            { from: queryText },
            { to: queryText },
            { subject: queryText },
            { body: queryText }
          ]
        };
      }

      // Fetch message sequence numbers or UIDs
      let uids = [];
      try {
        uids = await client.search(searchQuery, { uid: true });
      } catch (_err) {
        // Fallback to fetch all sequence if search query syntax fails
        uids = await client.search({ all: true }, { uid: true });
      }

      if (!uids || uids.length === 0) {
        return { messages: [], total: 0, page, totalPages: 1 };
      }

      // Sort newest first (highest UID first)
      uids.sort((a, b) => b - a);

      totalCount = uids.length;
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const currentPage = Math.max(1, Math.min(page, totalPages));
      const startIndex = (currentPage - 1) * limit;
      const targetUids = uids.slice(startIndex, startIndex + limit);

      if (targetUids.length > 0) {
        try {
          for await (const msg of client.fetch(targetUids, {
            uid: true,
            flags: true,
            envelope: true,
            bodyStructure: true,
            size: true
          }, { uid: true })) {
            const from = msg.envelope?.from?.[0] ? {
              name: msg.envelope.from[0].name || "",
              address: msg.envelope.from[0].address || ""
            } : { name: "", address: "Unknown" };

            const to = (msg.envelope?.to || []).map(t => ({
              name: t.name || "",
              address: t.address || ""
            }));

            const cc = (msg.envelope?.cc || []).map(c => ({
              name: c.name || "",
              address: c.address || ""
            }));

            const flags = Array.from(msg.flags || []);
            const isSeen = flags.includes("\\Seen");
            const isFlagged = flags.includes("\\Flagged");
            const isAnswered = flags.includes("\\Answered");

            // Check if message has attachments
            let hasAttachments = false;
            if (msg.bodyStructure) {
              const checkAttachments = (struct) => {
                if (!struct) return false;
                if (struct.disposition === "attachment" || (struct.type && !struct.type.startsWith("text/") && !struct.type.startsWith("multipart/"))) {
                  return true;
                }
                if (struct.childNodes && Array.isArray(struct.childNodes)) {
                  return struct.childNodes.some(checkAttachments);
                }
                return false;
              };
              hasAttachments = checkAttachments(msg.bodyStructure);
            }

            messages.push({
              uid: msg.uid,
              seq: msg.seq,
              subject: msg.envelope?.subject || "(No Subject)",
              from,
              to,
              cc,
              date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : new Date().toISOString(),
              messageId: msg.envelope?.messageId || "",
              isSeen,
              isFlagged,
              isAnswered,
              hasAttachments,
              size: msg.size || 0
            });
          }
        } catch (fetchErr) {
          console.warn("[Webmail Service] Batch UID fetch error, attempting single-message fallback:", fetchErr.message);
          for (const singleUid of targetUids) {
            try {
              for await (const msg of client.fetch(singleUid, {
                uid: true,
                flags: true,
                envelope: true,
                bodyStructure: true,
                size: true
              }, { uid: true })) {
                const from = msg.envelope?.from?.[0] ? {
                  name: msg.envelope.from[0].name || "",
                  address: msg.envelope.from[0].address || ""
                } : { name: "", address: "Unknown" };

                messages.push({
                  uid: msg.uid,
                  seq: msg.seq,
                  subject: msg.envelope?.subject || "(No Subject)",
                  from,
                  to: (msg.envelope?.to || []).map(t => ({ name: t.name || "", address: t.address || "" })),
                  cc: (msg.envelope?.cc || []).map(c => ({ name: c.name || "", address: c.address || "" })),
                  date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : new Date().toISOString(),
                  messageId: msg.envelope?.messageId || "",
                  isSeen: Array.from(msg.flags || []).includes("\\Seen"),
                  isFlagged: Array.from(msg.flags || []).includes("\\Flagged"),
                  isAnswered: Array.from(msg.flags || []).includes("\\Answered"),
                  hasAttachments: false,
                  size: msg.size || 0
                });
              }
            } catch (_singleErr) {
              // skip unreadable deleted message
            }
          }
        }
      }

      // Sort messages descending by UID / Date
      messages.sort((a, b) => b.uid - a.uid);

      return {
        messages,
        total: totalCount,
        page: currentPage,
        totalPages
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
};

/**
 * Fetch complete message details (body, HTML, text, attachments)
 */
const getMessageDetail = async (account, { folder = "INBOX", uid }) => {
  const client = getImapClient(account);
  await client.connect();

  try {
    const resolvedFolder = await resolveMailbox(client, folder);
    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      const parsedUid = parseInt(uid, 10);
      const download = await client.download(parsedUid, undefined, { uid: true });
      if (!download || !download.content) {
        throw new Error("Message stream not available");
      }

      // Parse RFC822 email buffer/stream using mailparser
      const parsed = await simpleParser(download.content);

      // Extract attachments metadata without huge binary payload
      const attachments = (parsed.attachments || []).map((att, idx) => ({
        id: idx,
        filename: att.filename || `attachment-${idx + 1}`,
        contentType: att.contentType,
        size: att.size,
        contentId: att.contentId,
        related: att.related
      }));

      // Mark message as seen
      try {
        await client.messageFlagsAdd(parsedUid, ["\\Seen"], { uid: true });
      } catch (_e) {
        // non-blocking
      }

      // Search for connected conversation thread messages across both INBOX and SENT
      let connectedMessages = [];
      const cleanSubj = (parsed.subject || "").replace(/^(re|fwd|fw|aw|sv|vs):\s*/ig, "").trim();

      try {
        if (cleanSubj && cleanSubj.length > 2) {
          // 1. Search in current folder
          const threadUids = await client.search({
            header: ["subject", cleanSubj]
          }, { uid: true });

          const otherUids = (threadUids || []).filter(u => u !== parsedUid);
          for (const tUid of (otherUids || []).slice(-4)) {
            try {
              const tDownload = await client.download(tUid, undefined, { uid: true });
              if (tDownload && tDownload.content) {
                const tParsed = await simpleParser(tDownload.content);
                connectedMessages.push({
                  uid: tUid,
                  subject: tParsed.subject || "(No Subject)",
                  from: tParsed.from?.value?.[0] ? {
                    name: tParsed.from.value[0].name || "",
                    address: tParsed.from.value[0].address || ""
                  } : { name: "", address: "Unknown" },
                  to: (tParsed.to?.value || []).map(t => ({ name: t.name || "", address: t.address || "" })),
                  date: tParsed.date ? new Date(tParsed.date).toISOString() : new Date().toISOString(),
                  html: tParsed.html || tParsed.textAsHtml || false,
                  text: tParsed.text || "",
                  attachments: (tParsed.attachments || []).map((att, idx) => ({
                    id: idx,
                    filename: att.filename || `attachment-${idx + 1}`,
                    size: att.size
                  }))
                });
              }
            } catch (_tErr) {
              // non-blocking
            }
          }
        }
      } catch (_threadErr) {
        // non-blocking
      }

      lock.release();

      // 2. Search in counterpart folder (if in INBOX, search SENT; if in SENT, search INBOX)
      try {
        const isSentFolder = resolvedFolder.toUpperCase().includes("SENT") || folder.toUpperCase().includes("SENT");
        const counterpartTarget = isSentFolder ? "INBOX" : "SENT";
        const counterpartFolder = await resolveMailbox(client, counterpartTarget);

        if (counterpartFolder && cleanSubj && cleanSubj.length > 2) {
          const counterpartLock = await client.getMailboxLock(counterpartFolder);
          try {
            const counterpartUids = await client.search({
              header: ["subject", cleanSubj]
            }, { uid: true });

            for (const cUid of (counterpartUids || []).slice(-4)) {
              try {
                const cDownload = await client.download(cUid, undefined, { uid: true });
                if (cDownload && cDownload.content) {
                  const cParsed = await simpleParser(cDownload.content);
                  connectedMessages.push({
                    uid: `cp-${cUid}`,
                    subject: cParsed.subject || "(No Subject)",
                    from: cParsed.from?.value?.[0] ? {
                      name: cParsed.from.value[0].name || "",
                      address: cParsed.from.value[0].address || ""
                    } : { name: "", address: "Unknown" },
                    to: (cParsed.to?.value || []).map(t => ({ name: t.name || "", address: t.address || "" })),
                    date: cParsed.date ? new Date(cParsed.date).toISOString() : new Date().toISOString(),
                    html: cParsed.html || cParsed.textAsHtml || false,
                    text: cParsed.text || "",
                    attachments: (cParsed.attachments || []).map((att, idx) => ({
                      id: idx,
                      filename: att.filename || `attachment-${idx + 1}`,
                      size: att.size
                    }))
                  });
                }
              } catch (_cErr) {
                // non-blocking
              }
            }
          } finally {
            counterpartLock.release();
          }
        }
      } catch (_counterpartErr) {
        // non-blocking
      }

      // Chronological conversation thread with deduplication
      const allThreadRaw = [
        ...connectedMessages,
        {
          uid: parsedUid,
          isCurrent: true,
          subject: parsed.subject || "(No Subject)",
          from: parsed.from?.value?.[0] ? {
            name: parsed.from.value[0].name || "",
            address: parsed.from.value[0].address || ""
          } : { name: "", address: "Unknown" },
          to: (parsed.to?.value || []).map(t => ({ name: t.name || "", address: t.address || "" })),
          date: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
          html: parsed.html || parsed.textAsHtml || false,
          text: parsed.text || "",
          attachments
        }
      ];

      // Deduplicate by timestamp and sender
      const seenThreadKeys = new Set();
      const thread = [];
      for (const m of allThreadRaw) {
        const key = `${m.date}_${m.from?.address}`;
        if (!seenThreadKeys.has(key)) {
          seenThreadKeys.add(key);
          thread.push(m);
        }
      }
      thread.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Convert embedded inline CID images to inline base64 data URIs so they render in high-res
      let processedHtml = parsed.html || parsed.textAsHtml || false;
      if (processedHtml && typeof processedHtml === "string") {
        if (parsed.attachments && parsed.attachments.length > 0) {
          for (const att of parsed.attachments) {
            if (att.content && (att.contentId || att.cid || att.filename)) {
              const rawCid = (att.contentId || att.cid || "").replace(/[<>]/g, "");
              const base64Data = `data:${att.contentType || "image/png"};base64,${att.content.toString("base64")}`;
              if (rawCid) {
                processedHtml = processedHtml.replace(new RegExp(`cid:${rawCid}`, "gi"), base64Data);
              }
              if (att.filename) {
                processedHtml = processedHtml.replace(new RegExp(`cid:${att.filename}`, "gi"), base64Data);
              }
            }
          }
        }
      }

      return {
        uid: parsedUid,
        subject: parsed.subject || "(No Subject)",
        from: parsed.from?.value?.[0] ? {
          name: parsed.from.value[0].name || "",
          address: parsed.from.value[0].address || ""
        } : { name: "", address: "Unknown" },
        to: (parsed.to?.value || []).map(t => ({ name: t.name || "", address: t.address || "" })),
        cc: (parsed.cc?.value || []).map(c => ({ name: c.name || "", address: c.address || "" })),
        bcc: (parsed.bcc?.value || []).map(b => ({ name: b.name || "", address: b.address || "" })),
        replyTo: parsed.replyTo?.value?.[0]?.address || "",
        date: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
        messageId: parsed.messageId || "",
        inReplyTo: parsed.inReplyTo || "",
        references: parsed.references || [],
        html: processedHtml,
        text: parsed.text || "",
        textAsHtml: parsed.textAsHtml || "",
        attachments,
        thread
      };
    } finally {
      // already safely handled
    }
  } finally {
    await client.logout();
  }
};

/**
 * Download specific attachment from a message
 */
const getAttachment = async (account, { folder = "INBOX", uid, attachmentId }) => {
  const client = getImapClient(account);
  await client.connect();

  try {
    const resolvedFolder = await resolveMailbox(client, folder);
    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      const parsedUid = parseInt(uid, 10);
      const download = await client.download(parsedUid, undefined, { uid: true });
      if (!download || !download.content) {
        throw new Error("Message stream not available");
      }

      const parsed = await simpleParser(download.content);
      const attIndex = parseInt(attachmentId, 10);
      const att = parsed.attachments?.[attIndex];

      if (!att) {
        throw new Error("Attachment not found");
      }

      return {
        filename: att.filename || "attachment",
        contentType: att.contentType || "application/octet-stream",
        content: att.content, // Buffer
        size: att.size
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
};

/**
 * Ultra-Modern Enterprise Company Email Signature (AWS / Google / MS Style)
 */
const buildCompanySignature = (account, customOptions = {}) => {
  let senderName = (customOptions.senderName || account.displayName || (account.email ? account.email.split("@")[0] : "Multimarg Team")).trim();
  
  // If senderName is in ALL CAPS (e.g. "PRAVEEN"), convert to natural written case ("Praveen")
  if (senderName && senderName === senderName.toUpperCase() && /[A-Z]/.test(senderName) && senderName.length > 1) {
    senderName = senderName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }

  // Format "Accounts" with capital first letter
  if (senderName.toLowerCase() === "accounts") {
    senderName = "Accounts";
  } else if (senderName.toLowerCase().startsWith("accounts")) {
    senderName = senderName.replace(/accounts/gi, "Accounts");
  }

  let senderDesignation = (customOptions.senderDesignation || customOptions.designation || "").trim();
  if (senderDesignation && senderDesignation === senderDesignation.toUpperCase() && /[A-Z]/.test(senderDesignation) && senderDesignation.length > 2) {
    senderDesignation = senderDesignation.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }

  const senderPhone = (customOptions.senderPhone || customOptions.phone || "").trim();
  const senderEmail = account.email || "info@multimarg.com";

  const htmlSignature = `
<br/><br/>
<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; border-top: 2px solid #2563eb; padding-top: 18px; margin-top: 26px; max-width: 620px; width: 100%;">
  <tr>
    <!-- Company Logo & Brand Badge -->
    <td valign="top" style="padding-right: 18px; border-right: 2px solid #e2e8f0; width: 76px; text-align: center; vertical-align: top;">
      <a href="https://multimarg.com" target="_blank" style="text-decoration: none; display: inline-block;">
        <img src="cid:multimarglogo" alt="Multimarg Carriers Logo" width="64" height="64" style="display: block; border-radius: 50%; object-fit: contain; background: #ffffff; padding: 2px; border: 1.5px solid #cbd5e1; box-shadow: 0 2px 6px rgba(0,0,0,0.08);" />
      </a>
      <div style="font-size: 9px; font-weight: 800; color: #2563eb; letter-spacing: 1px; text-transform: uppercase; margin-top: 6px;">
        VERIFIED
      </div>
    </td>

    <!-- Details Section -->
    <td valign="top" style="padding-left: 18px; vertical-align: top;">
      <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; margin-bottom: 2px;">
        ${senderName}
      </div>
      ${senderDesignation ? `<div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 2px;">${senderDesignation}</div>` : ""}
      <div style="font-size: 13px; font-weight: 800; color: #1d4ed8; letter-spacing: 0.2px; margin-bottom: 3px;">
        Multimarg Carriers Private Limited
      </div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; font-weight: 500;">
        <strong>Registered Address:</strong> LIG-194, Near National Public School, Avas Vikas, Rudrapur, Uttarakhand - 263153, India
      </div>

      <!-- Contact Links & Phones -->
      <div style="margin-bottom: 10px; font-size: 11.5px; line-height: 1.8;">
        <span style="color: #475569;">
          <strong>Email:</strong> <a href="mailto:${senderEmail}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${senderEmail}</a>
        </span>
        <span style="color: #cbd5e1; margin: 0 6px;">&bull;</span>
        <span style="color: #475569;">
          <strong>Website:</strong> <a href="https://multimarg.com" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 600;">multimarg.com</a>
        </span>
        <br/>
        <span style="color: #475569;">
          <strong>Phone NO.:</strong> <a href="tel:+915944324033" style="color: #2563eb; text-decoration: none; font-weight: 600;">+91 5944-324033</a>
        </span>
        ${senderPhone ? `
        <span style="color: #cbd5e1; margin: 0 6px;">&bull;</span>
        <span style="color: #475569;">
          <strong>Direct:</strong> <a href="tel:${senderPhone.replace(/\s+/g, '')}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${senderPhone}</a>
        </span>` : ""}
      </div>

      <!-- Clean Professional Disclaimer Note -->
      <div style="font-size: 10.5px; color: #64748b; line-height: 1.45; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px;">
        <em><strong>Disclaimer:</strong> This message and any attachments are confidential and intended solely for the recipient. If received in error, please notify the sender and delete this message.</em>
      </div>
    </td>
  </tr>
</table>
`;

  const textSignature = `\n\n---\n${senderName}${senderDesignation ? `\n${senderDesignation}` : ""}\nMultimarg Carriers Private Limited\nRegistered Address: LIG-194, Near National Public School, Avas Vikas, Rudrapur, Uttarakhand - 263153, India\nEmail: ${senderEmail} | Website: https://multimarg.com\nPhone NO.: +91 5944-324033${senderPhone ? ` | Direct: ${senderPhone}` : ""}\n`;

  return { htmlSignature, textSignature };
};

/**
 * Send email via SMTP
 */
const sendMail = async (account, { to, cc, bcc, subject, text, html, attachments = [], inReplyTo, references, senderName, senderDesignation, senderPhone }) => {
  const transporter = getSmtpTransporter(account);
  const { htmlSignature, textSignature } = buildCompanySignature(account, { senderName, senderDesignation, senderPhone });

  // Wrap final HTML with clean message body and bottom signature (no top banner)
  const finalHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 640px; text-transform: none;">
  <div style="padding: 4px 0 16px 0; font-size: 14px; color: #1e293b; text-transform: none;">
    ${html || (text ? `<p style="white-space: pre-wrap; margin: 0; text-transform: none;">${text}</p>` : "")}
  </div>
  ${htmlSignature}
</div>`;

  const finalText = (text || "") + textSignature;

  // Professional official sender display name without personal name (clean: "Multimarg Carriers")
  const fromDisplayName = "Multimarg Carriers";

  // Attachments list + inline CID logo
  const mailAttachments = attachments.map(att => ({
    filename: att.originalname || att.filename,
    content: att.buffer || att.content,
    contentType: att.mimetype || att.contentType
  }));

  const logoFile = path.resolve(__dirname, "../../public/circle_crop_logo.png");
  if (fs.existsSync(logoFile)) {
    mailAttachments.push({
      filename: "logo.png",
      path: logoFile,
      cid: "multimarglogo"
    });
  }

  const mailOptions = {
    from: `"${fromDisplayName}" <${account.email}>`,
    to,
    subject: subject || "(No Subject)",
    text: finalText,
    html: finalHtml,
    attachments: mailAttachments
  };

  if (cc) mailOptions.cc = cc;
  if (bcc) mailOptions.bcc = bcc;
  if (inReplyTo) mailOptions.inReplyTo = inReplyTo;
  if (references) mailOptions.references = references;

  const info = await transporter.sendMail(mailOptions);

  // Optional: Append to Sent folder via IMAP
  try {
    const client = getImapClient(account);
    await client.connect();
    try {
      const folders = await client.list();
      const sentFolder = folders.find(f => 
        (f.specialUse && f.specialUse.toLowerCase().includes("sent")) || 
        f.path.toUpperCase().includes("SENT")
      );
      if (sentFolder) {
        const rawContent = `From: ${mailOptions.from}\r\nTo: ${Array.isArray(to) ? to.join(", ") : to}\r\nSubject: ${subject}\r\nDate: ${new Date().toUTCString()}\r\n\r\n${text || ""}`;
        await client.append(sentFolder.path, Buffer.from(rawContent), ["\\Seen"]);
      }
    } catch (_appendErr) {
      // Append failure is non-fatal for sending
    } finally {
      await client.logout();
    }
  } catch (_e) {
    // ignore IMAP append error
  }

  return {
    success: true,
    messageId: info.messageId
  };
};

/**
 * Update flags (Seen, Flagged) for message(s)
 */
const updateFlags = async (account, { folder = "INBOX", uids, addFlags = [], removeFlags = [] }) => {
  const client = getImapClient(account);
  await client.connect();

  try {
    const resolvedFolder = await resolveMailbox(client, folder);
    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      const uidList = Array.isArray(uids) ? uids.map(Number) : [Number(uids)];
      if (addFlags.length > 0) {
        await client.messageFlagsAdd(uidList, addFlags, { uid: true });
      }
      if (removeFlags.length > 0) {
        await client.messageFlagsRemove(uidList, removeFlags, { uid: true });
      }
      return { success: true };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
};

/**
 * Move messages to another folder (e.g. Trash, Archive)
 */
const moveMessages = async (account, { sourceFolder = "INBOX", destinationFolder, uids }) => {
  const client = getImapClient(account);
  await client.connect();

  try {
    const resolvedSource = await resolveMailbox(client, sourceFolder);
    const resolvedDest = await resolveMailbox(client, destinationFolder);
    const lock = await client.getMailboxLock(resolvedSource);
    try {
      const uidList = Array.isArray(uids) ? uids.map(Number) : [Number(uids)];
      await client.messageMove(uidList, resolvedDest, { uid: true });
      return { success: true };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
};

/**
 * Permanently delete messages
 */
const deleteMessages = async (account, { folder = "INBOX", uids }) => {
  const client = getImapClient(account);
  await client.connect();

  try {
    const resolvedFolder = await resolveMailbox(client, folder);
    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      const uidList = Array.isArray(uids) ? uids.map(Number) : [Number(uids)];
      await client.messageDelete(uidList, { uid: true });
      return { success: true };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
};

module.exports = {
  testConnection,
  getFolders,
  getMessages,
  getMessageDetail,
  getAttachment,
  sendMail,
  updateFlags,
  moveMessages,
  deleteMessages
};
