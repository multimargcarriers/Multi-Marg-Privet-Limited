import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {  DollarSign, FileText, Globe,  TrendingUp, Activity,  CreditCard, RefreshCw, Clock, Truck, ShoppingCart,  Receipt } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { formatDate } from '../utils/formatters';
import RupeeIcon from '../components/RupeeIcon';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const StatCard = ({ title, value, icon, _subtitle, _trend }) => (
  <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500', margin: 0 }}>{title}</p>
        <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0.25rem 0 0 0' }}>{value}</h3>
      </div>
      <div style={{ backgroundColor: '#f1f5f9', padding: '0.75rem', borderRadius: '50%', color: '#6366f1' }}>
        {icon}
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
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/dashboard/stats`);
      if (response.data.success) {
        setStats(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/analytics/sync`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error syncing stats:', error);
      addToast('Failed to sync analytics. Please try again.', "error");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="header-flex">
        <div>
          <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>Overview Dashboard</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Here's what's happening with your operations today.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Last Updated: {stats?.lastUpdated ? formatDate(stats.lastUpdated) : 'Never'}
          </span>
          <button 
            onClick={handleSync}
            disabled={syncing}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: syncing ? '#94a3b8' : '#6366f1', 
              color: 'white', 
              borderRadius: '8px', 
              border: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontSize: '0.9rem', 
              fontWeight: '500', 
              cursor: syncing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={16} className={syncing ? "spin-animation" : ""} />
            {syncing ? 'Syncing...' : 'Sync Analytics'}
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1.1rem' }}>Sales Overview</h4>
      <div className="stats-panel-grid">
        <StatCard title="Taxable Amount" value={<span style={{ display: 'flex', alignItems: 'center' }}><RupeeIcon size={28} /> {((stats?.totalBillsAmount || 0) - (stats?.taxLiability || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<FileText size={24} />} trend="+Net" subtitle="Pre-tax revenue" />
        <StatCard title="Total GST (Tax)" value={<span style={{ display: 'flex', alignItems: 'center' }}><RupeeIcon size={28} /> {(stats?.taxLiability || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<FileText size={24} />} trend="+Active" subtitle="GST on all bills" />
        <StatCard title="Total Sales" value={<span style={{ display: 'flex', alignItems: 'center' }}><RupeeIcon size={28} /> {(stats?.totalBillsAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<DollarSign size={24} />} trend="+Active" subtitle="Total generated bills" />
        <StatCard title="Outstanding Amount" value={<span style={{ display: 'flex', alignItems: 'center', color: '#ef4444' }}><RupeeIcon size={28} /> {(stats?.outstandingReceivables || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<Activity size={24} />} trend="-Due" subtitle="Unpaid bills" />
      </div>

      {/* Operational & Cash KPIs */}
      <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1.1rem' }}>Purchase Overview</h4>
      <div className="stats-panel-grid">
        <StatCard title="Taxable Amount" value={<span style={{ display: 'flex', alignItems: 'center' }}><RupeeIcon size={28} /> {((stats?.totalPurchaseValue || 0) - (stats?.totalPurchaseGst || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<FileText size={24} />} trend="+Net" subtitle="Pre-tax purchases" />
        <StatCard title="Total GST (Tax)" value={<span style={{ display: 'flex', alignItems: 'center' }}><RupeeIcon size={28} /> {(stats?.totalPurchaseGst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<Receipt size={24} />} trend="+Active" subtitle="GST on purchases" />
        <StatCard title="Total Purchases" value={<span style={{ display: 'flex', alignItems: 'center' }}><RupeeIcon size={28} /> {(stats?.totalPurchaseValue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<ShoppingCart size={24} />} trend="+Spend" subtitle="Total generated bills" />
        <StatCard title="Outstanding Amount" value={<span style={{ display: 'flex', alignItems: 'center', color: '#ef4444' }}><RupeeIcon size={28} /> {(stats?.outstandingPurchases || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<Activity size={24} />} trend="-Due" subtitle="Unpaid vendor bills" />
      </div>

      {/* Financial Overview */}
      <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1.1rem' }}>Financial Overview</h4>
      <div className="stats-panel-grid">
        <StatCard title="Total Booking AWB" value={stats?.totalBookings || 0} icon={<Truck size={24} />} trend="+Logistics" subtitle="Dispatched total" />
        <StatCard title="Total Unbilled AWB" value={<span style={{ display: 'flex', alignItems: 'center' }}> {stats?.unbilledAwbCount || 0}</span>} icon={<Clock size={24} />} trend="+Pending" subtitle="Bookings not billed" />
        <StatCard title="Cash In" value={<span style={{ display: 'flex', alignItems: 'center', color: '#10b981' }}><RupeeIcon size={28} /> {(stats?.totalCashIn || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<TrendingUp size={24} />} trend="+Income" subtitle="Recorded Cash In" />
        <StatCard title="Cash Out" value={<span style={{ display: 'flex', alignItems: 'center', color: '#f59e0b' }}><RupeeIcon size={28} /> {(stats?.totalCashOut || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>} icon={<CreditCard size={24} />} trend="-Expense" subtitle="Recorded Cash Out" />
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem' }}>
        
      {/* Top Leaders Table */}
      <div>
        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: '#0f172a' }}>Top Leaders & Management</h4>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Employee</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Designation</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Branch</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Contact</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topLeaders?.length > 0 ? (
                stats.topLeaders.map((item, index) => (
                  <tr key={index} style={{ borderBottom: index === stats.topLeaders.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src={`https://ui-avatars.com/api/?name=${item.name.replace(' ', '+')}&background=6366f1&color=fff`} alt={item.name} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                        <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>{item.role || 'Manager'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>
                        {item.branch || 'HO'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>{item.phone || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No leaders assigned.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
      
      {/* Recent Activity Feed */}
      <div>
        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: '#0f172a' }}>Recent Dispatches & Activity</h4>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          {stats?.recentActivity?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.recentActivity.map((activity, index) => (
                <div key={activity.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: index !== stats.recentActivity.length - 1 ? '1rem' : 0, borderBottom: index !== stats.recentActivity.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: activity.type === 'booking' ? '#eff6ff' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {activity.type === 'booking' ? <FileText size={20} color="#3b82f6" /> : <Truck size={20} color="#f97316" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <h5 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: '600' }}>{activity.title}</h5>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> {formatDate(activity.timestamp?.seconds ? activity.timestamp.seconds * 1000 : activity.timestamp)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.subtitle}</p>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: activity.status === 'Active' ? '#ecfdf5' : '#f1f5f9', color: activity.status === 'Active' ? '#10b981' : '#64748b' }}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <Activity size={48} opacity={0.2} style={{ margin: '0 auto 1rem auto' }} />
              <p>No recent activity found.</p>
            </div>
          )}
        </div>
      </div>
      
      </div>
    </div>
  );
};

export default Dashboard;
