/**
 * Row-Level Security Helper
 * Filters an array of data based on the authenticated user's role and identity.
 */
const filterByAccess = (documents, user, collectionType = "bookings") => {
  if (!user) return [];
  const role = (user.role || "").toLowerCase().replace(/\s+/g, '');
  
  // Admins see everything
  if (role === 'superadmin' || role === 'admin' || user.email === 'admin@multimarg.com') {
    return documents;
  }

  return documents.filter(doc => {
    if (collectionType === "bookings") {
      if (role === 'employee') {
        const mappedName = String(user.name || "").toLowerCase();
        return (
          doc.createdBy_id === user.id ||
          String(doc.clerk_name || "").toLowerCase() === mappedName ||
          String(doc.createdBy || "").toLowerCase() === mappedName
        );
      }
      
      if (role === 'client') {
        // Client sees bookings where they are the mapped client, consignor, or consignee
        // Assume user.employeeId holds the mapped Client Name or ID from IAM
        const mappedId = String(user.employeeId || "").toLowerCase();
        const mappedName = String(user.name || "").toLowerCase();
        
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
        // Vendor sees bookings assigned to them (via trips or specifically assigned)
        const mappedId = String(user.employeeId || "").toLowerCase();
        const mappedName = String(user.name || "").toLowerCase();
        return (
          (mappedId && String(doc.vendor || "").toLowerCase().includes(mappedId)) ||
          (mappedName && String(doc.vendor || "").toLowerCase().includes(mappedName))
        );
      }
    }

    // Default deny for unknown roles/collections
    return false;
  });
};

module.exports = { filterByAccess };
