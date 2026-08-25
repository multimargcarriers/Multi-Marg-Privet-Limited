const { db } = require("../config/database");

// In-memory cache for IP Geolocation to avoid excessive external HTTP requests
const geoCache = new Map();

/**
 * Helper to parse client IP reliably
 */
const getClientIp = (req) => {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const parts = forwarded.split(',');
    return parts[0].trim().replace(/^::ffff:/, '');
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp.trim().replace(/^::ffff:/, '');
  const remote = req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
  return remote.replace(/^::ffff:/, '');
};

/**
 * Helper to parse user agent into readable device & browser string
 */
const parseDevice = (userAgent = '') => {
  if (!userAgent) return 'Web Browser';
  const ua = userAgent.toLowerCase();
  let browser = 'Browser';
  let os = 'Unknown OS';

  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/')) browser = 'Chrome';
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';

  return `${browser} on ${os}`;
};

/**
 * Non-blocking GeoIP Resolver with caching
 */
const resolveLocation = async (ip) => {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
    return 'Localhost / Internal Network';
  }

  if (geoCache.has(ip)) {
    return geoCache.get(ip);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data.status === 'success') {
      const loc = [data.city, data.regionName, data.country].filter(Boolean).join(', ');
      geoCache.set(ip, loc);
      return loc;
    }
  } catch (err) {
    // Silently fallback on timeout or error
  }

  const fallback = 'Unknown Location';
  geoCache.set(ip, fallback);
  return fallback;
};

/**
 * Central Activity Logger for User / Employee Actions
 * @param {Object} req - Express Request
 * @param {Object} options - { userId, userName, userEmail, role, type, title, details, status }
 */
const logUserActivity = (req, { userId, userName, userEmail, role, type = 'activity', title, details = {}, status = 'success' } = {}) => {
  // Fire and forget asynchronously without blocking main thread
  (async () => {
    try {
      const effectiveUser = req?.user || {};
      const finalUserId = userId || effectiveUser.id || effectiveUser._id?.toString() || 'system';
      const finalUserName = userName || effectiveUser.name || 'System';
      const finalUserEmail = userEmail || effectiveUser.email || '';
      const finalRole = role || effectiveUser.role || 'Employee';

      const ip = getClientIp(req);
      const device = parseDevice(req?.headers?.['user-agent']);
      const location = await resolveLocation(ip);

      const activityDoc = {
        userId: finalUserId,
        userName: finalUserName,
        userEmail: finalUserEmail,
        role: finalRole,
        type,
        title: title || `${type.toUpperCase()} performed by ${finalUserName}`,
        details: typeof details === 'object' ? details : { raw: details },
        location,
        ip,
        device,
        status,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await db.collection("userActivities").add(activityDoc);
    } catch (err) {
      console.error("[ActivityLogger] Error logging user activity:", err.message);
    }
  })();
};

module.exports = {
  logUserActivity,
  getClientIp,
  parseDevice,
  resolveLocation
};
