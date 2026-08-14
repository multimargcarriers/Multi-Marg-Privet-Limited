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
const { getOrSet } = require("../config/redis");

// Get all incomplete entities

exports.get_incomplete_1 = async (req, res) => {
  try {
    const data = await getOrSet("notifications:incomplete", async () => {
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
      
      const promises = collections.map(async col => {
        const snapshot = await db.collection(col.name).where("isIncomplete", "==", true).get();
        const items = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          items.push({
            id: doc.id,
            type: col.type,
            name: col.type === "city" ? data.city : data.name || data.client || data.branch || "Unknown",
            ...data
          });
        });
        return items;
      });
      
      const results = await Promise.all(promises);
      results.forEach(items => {
        incompleteItems.push(...items);
        total += items.length;
      });

      return {
        total,
        items: incompleteItems
      };
    }, 60);

    // Sort by creation time if available, or just return as is
    return success(res, {
      message: "Incomplete items fetched successfully",
      data
    });
  } catch (err) {
    console.error("Error fetching incomplete notifications:", err);
    return error(res, 500, "Failed to fetch incomplete notifications", err.message);
  }
};

