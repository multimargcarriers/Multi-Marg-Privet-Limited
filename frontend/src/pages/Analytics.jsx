import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { DollarSign, FileText, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import { DashboardSkeleton } from '../components/SkeletonLoader';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const StatCard = ({ title, value, icon, subtitle }) => (
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
    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
      {subtitle}
    </div>
  </div>
);

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/analytics`);
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Failed to load analytics data. Ensure your backend server is running and restarted.</div>;
  }

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>Deep Analytics</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Automated aggregation based on your financial reports.</p>
        </div>
        <div style={{ padding: '0.5rem 1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
          <Activity size={18} color="#6366f1" /> Reports Synced
        </div>
      </div>

      {/* Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard 
          title="Outstanding Receivables" 
          value={`₹ ${(data.outstandingReceivables || 0).toLocaleString('en-IN')}`} 
          icon={<AlertCircle size={24} color="#ef4444" />} 
          subtitle="Unpaid Generated Bills" 
        />
        <StatCard 
          title="Unbilled Revenue" 
          value={`₹ ${(data.unbilledRevenue || 0).toLocaleString('en-IN')}`} 
          icon={<FileText size={24} />} 
          subtitle="Bookings not yet billed" 
        />
        <StatCard 
          title="Total Paid (Realized)" 
          value={`₹ ${(data.paidAmount || 0).toLocaleString('en-IN')}`} 
          icon={<DollarSign size={24} color="#10b981" />} 
          subtitle="Cleared Invoices" 
        />
        <StatCard 
          title="Total Tax Liability" 
          value={`₹ ${(data.taxLiability || 0).toLocaleString('en-IN')}`} 
          icon={<TrendingUp size={24} color="#f59e0b" />} 
          subtitle="Total GST Collected" 
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid-auto-large">
        
        {/* Sales by Client Pie Chart */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>Top 5 Clients by Revenue</h4>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.salesByClient}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.salesByClient.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹ ${value.toLocaleString('en-IN')}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Status Bar Chart */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>Realized vs Outstanding</h4>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.financialStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `₹${Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(val)}`} 
                />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value) => `₹ ${value.toLocaleString('en-IN')}`} />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={50}>
                  {data.financialStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Paid' ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Flow Timeline */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
          <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>Cash Flow Over Time (Cash In vs Cash Out)</h4>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `₹${Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(val)}`} 
                />
                <Tooltip formatter={(value) => `₹ ${value.toLocaleString('en-IN')}`} />
                <Legend />
                <Line type="monotone" dataKey="In" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Out" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
