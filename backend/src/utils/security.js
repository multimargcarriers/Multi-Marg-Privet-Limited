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

      // Person who created the booking ALWAYS sees it permanently
      if (isCreator) return true;

      // If global booking window is enabled, others see it if booking was within windowDays
      if (isWindowEnabled) {
        const bookingDateVal = doc.date || doc.createdAt || doc.dispatch_date;
        if (bookingDateVal) {
          const bTime = new Date(bookingDateVal).getTime();
          if (!isNaN(bTime) && (now - bTime) <= windowMs) {
            return true;
          }
        }
      }

      if (role === 'client') {
        // Client sees bookings where they are the mapped client, consignor, or consignee
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
        // Vendor sees bookings assigned to them
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

module.exports = { filterByAccess };
