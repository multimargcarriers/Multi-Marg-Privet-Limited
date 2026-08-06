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
const { getOrSet } = require("../config/redis");

const CACHE_KEY = "dashboard_stats";

exports.get_stats_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const doc = await db.collection("analytics").doc("summary").get();
    let analyticsData = doc.exists ? doc.data() : null;

    // If it doesn't exist yet, run it once
    if (!analyticsData) {
      analyticsData = await runAnalyticsAggregation();
    }
    
    // Fetch recent activity in parallel
    const [recentBookingsSnapshot, recentTripsSnapshot] = await Promise.all([
      db.collection("bookings").orderBy("createdAt", "desc").limit(10).get(),
      db.collection("trips").orderBy("createdAt", "desc").limit(10).get()
    ]);
    
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
    
    analyticsData.recentActivity = recentActivity.slice(0, 7);
    return analyticsData;
  }, 120);

  return success(res, "Dashboard stats fetched successfully", data);
};
