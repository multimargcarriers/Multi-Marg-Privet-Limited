const parseDateSecurely = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  const dateStr = String(dateVal).trim();
  if (!dateStr) return null;

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  return null;
};

const filterByAccess = (documents, user, collectionType = "bookings", settings = null) => {
  if (!user) return [];
  const role = (user.role || "").toLowerCase().replace(/\s+/g, '');

  // SuperAdmins & Admins see everything permanently
  if (role === 'superadmin' || role === 'admin' || user.email === 'admin@multimarg.com') {
    return documents;
  }

  const isWindowEnabled = settings?.integrations?.enableGlobalBookingWindow !== false;
  const windowDays = Math.max(1, Number(settings?.integrations?.globalBookingWindowDays) || 10);
  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  return documents.filter(doc => {
    if (collectionType === "bookings") {
      const mappedName = String(user.name || "").toLowerCase().trim();
      const mappedEmail = String(user.email || "").toLowerCase().trim();

      const isCreator = (
        doc.createdBy_id === user.id ||
        String(doc.clerk_name || "").toLowerCase().trim() === mappedName ||
        String(doc.createdBy || "").toLowerCase().trim() === mappedName ||
        String(doc.createdBy_email || "").toLowerCase().trim() === mappedEmail ||
        doc.userId === user.id
      );

      // 1. Creator always sees their own bookings permanently (except for employees, who are strictly limited to the visibility window)
      if (isCreator && role !== 'employee') return true;

      // 2. Determine if the booking date falls within the active visibility window
      // If the global booking window is disabled, bookings are always considered "within window" (visible permanently)
      let withinWindow = true;
      if (isWindowEnabled) {
        const bookingDateVal = doc.date || doc.createdAt || doc.dispatch_date;
        const parsedDate = parseDateSecurely(bookingDateVal);
        if (parsedDate) {
          const bTime = parsedDate.getTime();
          withinWindow = (now - bTime) <= windowMs;
        } else {
          withinWindow = false;
        }
      }

      // 3. Apply role-specific visibility rules
      if (role === 'employee') {
        // Employees see all bookings within the active visibility window
        return withinWindow;
      }

      if (role === 'client') {
        // Clients see bookings within the visibility window where they are mapped as client, consignor, or consignee
        if (!withinWindow) return false;
        const mappedId = String(user.employeeId || "").toLowerCase();
        return (
          (mappedId && String(doc.clientName || "").toLowerCase().includes(mappedId)) ||
          (mappedName && String(doc.clientName || "").toLowerCase().includes(mappedName)) ||
          (mappedId && String(doc.client || "").toLowerCase().includes(mappedId)) ||
          (mappedId && String(doc.consignor || "").toLowerCase().includes(mappedId)) ||
          (mappedId && String(doc.consignee || "").toLowerCase().includes(mappedId)) ||
          (mappedName && String(doc.consignor || "").toLowerCase().includes(mappedName)) ||
          (mappedName && String(doc.consignee || "").toLowerCase().includes(mappedName))
        );
      }

      if (role === 'vendor') {
        // Vendors see bookings within the visibility window where they are mapped
        if (!withinWindow) return false;
        const mappedId = String(user.employeeId || "").toLowerCase();
        return (
          (mappedId && String(doc.vendor || "").toLowerCase().includes(mappedId)) ||
          (mappedName && String(doc.vendor || "").toLowerCase().includes(mappedName))
        );
      }

      return false;
    }

    // Default deny for unknown roles/collections
    return false;
  });
};

const isSuperAdminOrAdmin = (user) => {
  if (!user) return false;
  const role = (user.role || "").toLowerCase().replace(/\s+/g, '');
  return role === 'superadmin' || role === 'admin' || user.email === 'admin@multimarg.com';
};

const isBookingCreator = (doc, user) => {
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

  // 2. Name / Clerk / Username match
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

const canModifyBooking = (doc, user) => {
  if (!user) return false;
  if (isSuperAdminOrAdmin(user)) return true;
  return isBookingCreator(doc, user);
};

module.exports = {
  filterByAccess,
  isSuperAdminOrAdmin,
  isBookingCreator,
  canModifyBooking
};
