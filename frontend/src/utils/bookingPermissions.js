export const isSuperAdminOrAdmin = (user) => {
  if (!user) return false;
  const role = (user.role || "").toLowerCase().replace(/\s+/g, '');
  return role === 'superadmin' || role === 'admin' || user.email === 'admin@multimarg.com';
};

export const isBookingCreator = (doc, user) => {
  if (!doc || !user) return false;

  const userId = String(user.id || user._id || "").trim();
  const userName = String(user.name || "").toLowerCase().trim();
  const userUsername = String(user.username || "").toLowerCase().trim();
  const userEmail = String(user.email || "").toLowerCase().trim();
  const userEmpId = String(user.employeeId || "").toLowerCase().trim();

  // 1. Direct ID match
  if (userId) {
    if (doc.createdBy_id && String(doc.createdBy_id).trim() === userId) return true;
    if (doc.userId && String(doc.userId).trim() === userId) return true;
    if (doc.createdById && String(doc.createdById).trim() === userId) return true;
  }

  // 2. Name / Clerk / Username / Email match
  const docClerk = String(doc.clerk_name || doc.clerkName || "").toLowerCase().trim();
  const docCreatedBy = String(doc.createdBy || doc.created_by || "").toLowerCase().trim();
  const docEmail = String(doc.createdBy_email || doc.email || "").toLowerCase().trim();

  if (userName) {
    if (docClerk && (docClerk === userName || docClerk.includes(userName) || userName.includes(docClerk))) return true;
    if (docCreatedBy && (docCreatedBy === userName || docCreatedBy.includes(userName) || userName.includes(docCreatedBy))) return true;
  }

  if (userUsername) {
    if (docClerk && (docClerk === userUsername || docClerk.includes(userUsername) || userUsername.includes(docClerk))) return true;
    if (docCreatedBy && (docCreatedBy === userUsername || docCreatedBy.includes(userUsername) || userUsername.includes(docCreatedBy))) return true;
  }

  if (userEmail) {
    if (docEmail && docEmail === userEmail) return true;
    if (docClerk && docClerk === userEmail) return true;
    if (docCreatedBy && docCreatedBy === userEmail) return true;
  }

  if (userEmpId) {
    if (docClerk && docClerk === userEmpId) return true;
    if (docCreatedBy && docCreatedBy === userEmpId) return true;
  }

  return false;
};

export const canModifyBooking = (doc, user) => {
  if (!user) return false;
  if (isSuperAdminOrAdmin(user)) return true;
  return isBookingCreator(doc, user);
};
