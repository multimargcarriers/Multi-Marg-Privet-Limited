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

// Get all incomplete entities

exports.get_incomplete_1 = async (req, res) => {
  try {
    const incompleteItems = [];
    let total = 0;
    const collections = [{
      name: "cities",
      type: "city"
    }, {
      name: "clients",
      type: "client"
    }, {
      name: "vendors",
      type: "vendor"
    }, {
      name: "branches",
      type: "branch"
    }];
    for (const col of collections) {
      const snapshot = await db.collection(col.name).where("isIncomplete", "==", true).get();
      snapshot.forEach(doc => {
        const data = doc.data();
        incompleteItems.push({
          id: doc.id,
          type: col.type,
          name: col.type === "city" ? data.city : data.name || data.client || data.branch || "Unknown",
          ...data
        });
        total++;
      });
    }

    // Sort by creation time if available, or just return as is
    return success(res, {
      message: "Incomplete items fetched successfully",
      data: {
        total,
        items: incompleteItems
      }
    });
  } catch (err) {
    console.error("Error fetching incomplete notifications:", err);
    return error(res, 500, "Failed to fetch incomplete notifications", err.message);
  }
};

