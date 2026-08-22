import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { IndianRupee, FileText, Globe, TrendingUp, Activity, CreditCard, RefreshCw, Clock, Truck, ShoppingCart, ReceiptText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { formatDate } from '../utils/formatters';
import RupeeIcon from '../components/RupeeIcon';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// High-precision formatted Currency Value with non-wrapping superscript decimals
const FormatCurrency = ({ amount, color = undefined }) => {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [intPart, decPart] = formatted.split('.');
  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'baseline', 
      whiteSpace: 'nowrap', 
      fontVariantNumeric: 'tabular-nums',
      color: color || '#0f172a',
      letterSpacing: '-0.02em',
      fontWeight: 700,
      lineHeight: 1.15
    }}>
      <RupeeIcon size={14} style={{ marginRight: '1px', alignSelf: 'center', opacity: 0.85 }} />
      <span>{intPart}</span>
      <span style={{ fontSize: '0.78em', opacity: 0.8, fontWeight: 600 }}>.{decPart}</span>
    </span>
  );
};

const StatCard = ({ title, value, icon, accentColor = "#3b82f6" }) => (
  <div
    className="premium-stat-card"
    style={{
      backgroundColor: '#ffffff',
      padding: '0.75rem 0.85rem',
      paddingRight: '38px',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: '68px',
      position: 'relative',
      overflow: 'hidden',
      userSelect: 'none',
      minWidth: 0,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
    }}
  >
    {/* Fixed Top-Right Icon Badge */}
    <div 
      style={{ 
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: `${accentColor}14`, 
        color: accentColor, 
        width: '26px', 
        height: '26px', 
        borderRadius: '6px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0 
      }}
    >
      {React.cloneElement(icon, { size: 14 })}
    </div>

    {/* Card Label / Title (Reduced text size to prevent wrapping icon) */}
    <div 
      style={{ 
        color: '#64748b', 
        fontSize: '0.68rem', 
        fontWeight: '700', 
        textTransform: 'uppercase', 
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginBottom: '0.25rem',
        lineHeight: 1.2
      }}
      title={title}
    >
      {title}
    </div>

    {/* Card Value (Amount size kept full and prominent) */}
    <div style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
      <div style={{ 
        fontSize: 'clamp(1.05rem, 2.8vw, 1.3rem)', 
        color: '#0f172a', 
        margin: 0, 
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis',
        lineHeight: 1.2 
      }}>
        {value}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { _user } = useAuth();
  const { addToast } = useToast();

  const fetchStats = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiUrl}/api/dashboard/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { _t: Date.now() }
      });
      if (response.data && response.data.success) {
        setStats(response.data.data || {});
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Auto-refresh when window regains focus or cache is invalidated
    const onFocus = () => fetchStats();
    window.addEventListener('focus', onFocus);
    window.addEventListener('cache-refreshed', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('cache-refreshed', onFocus);
    };
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let response;
      try {
        response = await axios.post(`${apiUrl}/api/dashboard/sync`, {}, { headers });
      } catch (_e) {
        response = await axios.post(`${apiUrl}/api/analytics/sync`, {}, { headers });
      }
      if (response.data?.success) {
        addToast('Dashboard analytics synchronized with database', 'success');
        if (response.data.data) {
          setStats(prev => ({ ...prev, ...response.data.data }));
        }
        await fetchStats();
      }
    } catch (error) {
      console.error('Error syncing dashboard stats:', error);
      addToast('Failed to sync dashboard stats', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-content" style={{ padding: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
      {/* Top Header Card */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '12px', 
        padding: '0.85rem 1.15rem', 
        marginBottom: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        <div>
          <h3 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)', color: '#0f172a', margin: '0 0 0.15rem 0', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Overview Dashboard
          </h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.82rem' }}>
            Real-time operations & financial metrics
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            Updated: {stats?.lastUpdated ? formatDate(stats.lastUpdated) : 'Live'}
          </span>
          <button 
            onClick={handleSync}
            disabled={syncing}
            style={{ 
              padding: '0 0.85rem', 
              height: '34px',
              backgroundColor: syncing ? '#94a3b8' : '#2563eb', 
              color: 'white', 
              borderRadius: '6px', 
              border: 'none', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              fontSize: '0.82rem', 
              fontWeight: '600', 
              cursor: syncing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={14} className={syncing ? "spin-animation" : ""} />
            {syncing ? 'Syncing...' : 'Sync Analytics'}
          </button>
        </div>
      </div>

      {/* Financial KPIs - Sales */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.65rem 0' }}>
        <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sales Overview</h4>
      </div>
      <div className="stats-panel-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard
          title="Taxable Sales"
          value={<FormatCurrency amount={(stats?.totalBillsAmount || 0) - (stats?.taxLiability || 0)} />}
          icon={<FileText />}
          accentColor="#3b82f6"
        />
        <StatCard
          title="Total GST (Tax)"
          value={<FormatCurrency amount={stats?.taxLiability || 0} />}
          icon={<ReceiptText />}
          accentColor="#8b5cf6"
        />
        <StatCard
          title="Total Sales"
          value={<FormatCurrency amount={stats?.totalCustomerInvoiced || stats?.totalClientInvoiced || stats?.totalBillsAmount || 0} />}
          icon={<IndianRupee />}
          accentColor="#10b981"
        />
        <StatCard
          title="Outstanding Amount"
          value={<FormatCurrency amount={stats?.outstandingReceivables || 0} color="#ef4444" />}
          icon={<Activity />}
          accentColor="#ef4444"
        />
      </div>

      {/* Operational & Cash KPIs - Purchase */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.65rem 0' }}>
        <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Purchase Overview</h4>
      </div>
      <div className="stats-panel-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard
          title="Taxable Purchases"
          value={<FormatCurrency amount={(stats?.totalPurchaseValue || 0) - (stats?.totalPurchaseGst || 0)} />}
          icon={<FileText />}
          accentColor="#3b82f6"
        />
        <StatCard
          title="Total GST (Tax)"
          value={<FormatCurrency amount={stats?.totalPurchaseGst || 0} />}
          icon={<ReceiptText />}
          accentColor="#8b5cf6"
        />
        <StatCard
          title="Total Purchases"
          value={<FormatCurrency amount={stats?.totalVendorInvoiced || stats?.totalPurchaseValue || 0} />}
          icon={<ShoppingCart />}
          accentColor="#f59e0b"
        />
        <StatCard
          title="Outstanding Amount"
          value={<FormatCurrency amount={stats?.outstandingPurchases || 0} color="#ef4444" />}
          icon={<Activity />}
          accentColor="#ef4444"
        />
      </div>

      {/* Financial Overview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.65rem 0' }}>
        <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Financial Overview</h4>
      </div>
      <div className="stats-panel-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Total Bookings"
          value={<span style={{ fontWeight: 700 }}>{stats?.totalBookings || 0}</span>}
          icon={<Truck />}
          accentColor="#0ea5e9"
        />
        <StatCard
          title="Unbilled Bookings"
          value={<span style={{ fontWeight: 700 }}>{stats?.unbilledAwbCount || 0}</span>}
          icon={<Clock />}
          accentColor="#f97316"
        />
        <StatCard
          title="Cash In"
          value={<FormatCurrency amount={stats?.totalCashIn || 0} color="#16a34a" />}
          icon={<TrendingUp />}
          accentColor="#16a34a"
        />
        <StatCard
          title="Cash Out"
          value={<FormatCurrency amount={stats?.totalCashOut || 0} color="#ea580c" />}
          icon={<CreditCard />}
          accentColor="#ea580c"
        />
      </div>

      {/* Charts Section */}
      <div className="dashboard-charts">
        {/* Revenue Trend Area Chart */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={20} color="#6366f1" />
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Revenue Trends (YTD)</h4>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: 'white' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings by Branch Bar Chart */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Globe size={20} color="#10b981" />
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Bookings by Region</h4>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.bookingsData || []} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: 'white' }}
                />
                <Bar dataKey="bookings" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Leaders & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
        
        {/* Top Leaders & Team */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.15rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f1f5f9' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Leadership & Key Personnel
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, background: '#f8fafc', padding: '2px 8px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              Management
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats?.topLeaders?.length > 0 ? (
              stats.topLeaders.map((item, index) => {
                const initials = (item.name || 'MM').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                      <div style={{ 
                        width: '34px', 
                        height: '34px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                        color: '#ffffff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#4f46e5', background: '#e0e7ff', padding: '1px 6px', borderRadius: '4px' }}>
                            {item.role || 'SuperAdmin'}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#475569', background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
                            {item.branch || 'HO'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {item.phone && item.phone !== '-' && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, flexShrink: 0 }}>
                        {item.phone}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No leadership records available.
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Dispatches & Real Activity Feed */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.15rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f1f5f9' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recent Dispatches & Activity
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600, background: '#ecfdf5', padding: '2px 8px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
              ● Live Feed
            </span>
          </div>

          {stats?.recentActivity?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.recentActivity.map((activity, index) => {
                const isBooking = activity.type === 'booking';
                const statusUpper = String(activity.status || '').toUpperCase();
                const statusColor = statusUpper === 'BILLED' || statusUpper === 'ACTIVE' 
                  ? { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }
                  : statusUpper === 'UNBILLED'
                  ? { bg: '#fffbeb', text: '#b45309', border: '#fde68a' }
                  : { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };

                return (
                  <div key={activity.id || index} style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    alignItems: 'flex-start', 
                    padding: '0.65rem 0.75rem', 
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9'
                  }}>
                    <div style={{ 
                      width: '34px', 
                      height: '34px', 
                      borderRadius: '8px', 
                      backgroundColor: isBooking ? '#eff6ff' : '#fff7ed', 
                      color: isBooking ? '#2563eb' : '#ea580c',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {isBooking ? <FileText size={17} /> : <Truck size={17} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
                        <h5 style={{ margin: 0, fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, letterSpacing: '-0.01em' }}>
                          {activity.title}
                        </h5>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                          <Clock size={11} /> {formatDate(activity.timestamp)}
                        </span>
                      </div>

                      {/* Route & Subtitle */}
                      <p style={{ margin: '0.2rem 0 0.35rem 0', fontSize: '0.78rem', color: '#475569', lineHeight: '1.3' }}>
                        {activity.subtitle}
                      </p>

                      {/* Status Badge */}
                      <span style={{ 
                        fontSize: '0.66rem', 
                        fontWeight: 700, 
                        padding: '1px 6px', 
                        borderRadius: '4px', 
                        backgroundColor: statusColor.bg, 
                        color: statusColor.text,
                        border: `1px solid ${statusColor.border}`,
                        textTransform: 'uppercase',
                        display: 'inline-block'
                      }}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
              <Activity size={36} opacity={0.3} style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No recent dispatch activity recorded.</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;
