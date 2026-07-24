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
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");

exports.get_stats_1 = async (req, res) => {
  const doc = await db.collection("analytics").doc("summary").get();
  let data = doc.exists ? doc.data() : null;

  // If it doesn't exist yet, run it once
  if (!data) {
    data = await runAnalyticsAggregation();
  }
  
  // Fetch recent activity
  const recentBookingsSnapshot = await db.collection("bookings").orderBy("createdAt", "desc").limit(3).get();
  const recentTripsSnapshot = await db.collection("trips").orderBy("createdAt", "desc").limit(3).get();
  
  const recentActivity = [];
  
  recentBookingsSnapshot.forEach(d => {
    const bk = d.data();
    recentActivity.push({
      id: d.id,
      type: 'booking',
      title: `LR Generated: ${bk.lrNo || d.id.substring(0, 8)}`,
      subtitle: `${bk.consignor?.name || 'Unknown'} → ${bk.consignee?.name || 'Unknown'}`,
      timestamp: bk.createdAt,
      status: bk.status || 'Pending'
    });
  });
  
  recentTripsSnapshot.forEach(d => {
    const tp = d.data();
    recentActivity.push({
      id: d.id,
      type: 'trip',
      title: `Trip Created: ${tp.vehicleNo || 'Vehicle'}`,
      subtitle: `${tp.origin || 'Unknown'} → ${tp.destination || 'Unknown'}`,
      timestamp: tp.createdAt,
      status: tp.status || 'Active'
    });
  });
  
  // Sort combined activity by timestamp desc
  recentActivity.sort((a, b) => {
    const dateA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
    const dateB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
    return dateB - dateA;
  });
  
  data.recentActivity = recentActivity.slice(0, 5);

  return success(res, "Dashboard stats fetched successfully", data);
};

