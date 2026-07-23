import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, DollarSign, FileText, Globe, ArrowUpRight, TrendingUp, Activity, ArrowDownRight, CreditCard, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import RupeeIcon from '../components/RupeeIcon';

const StatCard = ({ title, value, icon, subtitle, trend }) => (
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
      <span style={{ color: trend.startsWith('-') ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', fontWeight: '600' }}>
        {trend.startsWith('-') ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />} {trend}
      </span>
      <span style={{ color: '#94a3b8' }}>{subtitle}</span>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
      alert('Failed to sync analytics. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Header */}
      <div className="header-flex">
        <div>
          <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>Overview Dashboard</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Here's what's happening with your operations today.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Last Updated: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard title="Total Clients" value={stats?.totalClients || 0} icon={<Users size={24} />} trend="+Active" subtitle="Registered clients" />
        <StatCard title="Total Revenue" value={<span style={{ display: 'flex', alignItems: 'center' }}><RupeeIcon size={28} /> {((stats?.totalCashIn || 0) + (stats?.totalBillsAmount || 0)).toLocaleString()}</span>} icon={<DollarSign size={24} />} trend="+Gross" subtitle="Cash In & Bills" />
        <StatCard title="Total Cash Out" value={<span style={{ display: 'flex', alignItems: 'center' }}><RupeeIcon size={28} /> {(stats?.totalCashOut || 0).toLocaleString()}</span>} icon={<CreditCard size={24} />} trend="-Expense" subtitle="Recorded Cash Out" />
        <StatCard title="Total Bookings" value={stats?.totalBookings || 0} icon={<FileText size={24} />} trend="+Logistics" subtitle="Dispatched total" />
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

      {/* Top Leaders Table */}
      <div>
        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: '#0f172a' }}>Top Leaders & Management</h4>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
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
                      <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600' }}>
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
    </div>
  );
};

export default Dashboard;
