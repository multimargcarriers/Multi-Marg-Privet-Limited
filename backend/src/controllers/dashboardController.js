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
    // Dynamically compute fresh, live aggregation metrics from real database collections
    const analyticsData = await runAnalyticsAggregation();
    
    // Fetch recent activity in parallel with real fields
    const [recentBookingsSnapshot, recentTripsSnapshot] = await Promise.all([
      db.mongoDb.collection("bookings").find().sort({ createdAt: -1, date: -1 }).limit(10).toArray(),
      db.mongoDb.collection("trips").find().sort({ createdAt: -1, date: -1 }).limit(10).toArray()
    ]);
    
    const recentActivity = [];
    
    recentBookingsSnapshot.forEach(bk => {
      const lrNumber = bk.awb || bk.consignment || bk.lrNumber || bk.lrNo || (bk._id ? String(bk._id).substring(0, 8) : 'N/A');
      const consignorName = typeof bk.consignor === 'string' ? bk.consignor : (bk.consignor?.name || bk.consignor_name || '');
      const consigneeName = typeof bk.consignee === 'string' ? bk.consignee : (bk.consignee?.name || bk.consignee_name || '');
      const originCity = bk.origin || bk.from || bk.originCity || '';
      const destCity = bk.destination || bk.to || bk.destCity || '';

      const route = originCity && destCity ? `${originCity.toUpperCase()} → ${destCity.toUpperCase()}` : (originCity || destCity || 'General Dispatch');
      const party = consignorName && consigneeName ? `${consignorName.toUpperCase()} to ${consigneeName.toUpperCase()}` : (consignorName || consigneeName || '');

      recentActivity.push({
        id: bk._id || bk.id,
        type: 'booking',
        title: `AWB #${lrNumber}`,
        subtitle: party ? `${route} • ${party}` : route,
        origin: originCity,
        destination: destCity,
        party: party,
        timestamp: bk.createdAt || bk.date,
        status: bk.status || 'UNBILLED'
      });
    });
    
    recentTripsSnapshot.forEach(tp => {
      const vehicle = tp.vehicleNo && tp.vehicleNo !== 'na' ? tp.vehicleNo.toUpperCase() : 'LINE-HAUL';
      const vendorName = tp.vendor ? `(${tp.vendor.toUpperCase()})` : '';
      const originCity = tp.origin || tp.from || '';
      const destCity = tp.destination || tp.to || '';
      const route = originCity && destCity ? `${originCity.toUpperCase()} → ${destCity.toUpperCase()}` : (originCity || destCity || 'Transit Route');

      recentActivity.push({
        id: tp._id || tp.id,
        type: 'trip',
        title: `Trip Manifest: ${vehicle} ${vendorName}`.trim(),
        subtitle: route,
        origin: originCity,
        destination: destCity,
        timestamp: tp.createdAt || tp.date,
        status: tp.status || 'Active'
      });
    });
    
    // Sort combined activity by timestamp desc
    recentActivity.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return dateB - dateA;
    });
    
    analyticsData.recentActivity = recentActivity.slice(0, 8);
    return analyticsData;
  }, 120);

  return success(res, "Dashboard stats fetched successfully", data);
};
