import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, AlertCircle, TrendingUp, Calendar, Filter, Truck, RefreshCw, User, Briefcase, FileText
} from 'lucide-react';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import RupeeIcon from '../components/RupeeIcon';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const MODE_COLORS = { 'AIR': '#3b82f6', 'FLIGHT': '#3b82f6', 'TRAIN': '#a21caf', 'ROAD': '#10b981', 'UNKNOWN': '#64748b' };

const StatCard = ({ title, value, icon, subtitle }) => (
  <div className="analytics-stat-card">
    <div className="stat-card-header">
      <div>
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
      </div>
      <div className="stat-icon-wrapper">
        {icon}
      </div>
    </div>
    <div className="stat-subtitle">{subtitle}</div>
  </div>
);

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('financials');
  const { token } = useAuth();
  
  // Filters
  const [dateRange, setDateRange] = useState("all_time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("month"); 
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");

  const { addToast } = useToast();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedClientSearch(clientSearch);
    }, 500);
    return () => clearTimeout(handler);
  }, [clientSearch]);

  const handleDateRangeChange = (e) => {
    const val = e.target.value;
    setDateRange(val);
    
    const today = new Date();
    let start = "";
    let end = today.toISOString();
    let group = "day";

    if (val === "today") {
      const d = new Date();
      d.setHours(0,0,0,0);
      start = d.toISOString();
      group = "day";
    } else if (val === "last_7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString();
      group = "day";
    } else if (val === "this_month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      start = d.toISOString();
      group = "day";
    } else if (val === "this_year") {
      const d = new Date(today.getFullYear(), 0, 1);
      start = d.toISOString();
      group = "month";
    } else if (val === "all_time") {
      start = "";
      end = "";
      group = "month";
    }

    if (val !== "custom") {
      setStartDate(start ? start.split('T')[0] : "");
      setEndDate(end ? end.split('T')[0] : "");
      setGroupBy(group);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let query = `?groupBy=${groupBy}`;
      if (startDate) query += `&startDate=${startDate}T00:00:00.000Z`;
      if (endDate) query += `&endDate=${endDate}T23:59:59.999Z`;
      if (debouncedClientSearch) query += `&client=${encodeURIComponent(debouncedClientSearch)}`;

      const authToken = token || localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/analytics/advanced${query}`,
        { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
      );
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      addToast('Failed to load advanced analytics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line
  }, [startDate, endDate, groupBy, dateRange, debouncedClientSearch]);

  const renderTooltipFormatter = (value, name) => {
    if (name.toLowerCase().includes('revenue') || name.toLowerCase().includes('expense') || name.toLowerCase().includes('cash') || name.toLowerCase().includes('value') || name === 'In' || name === 'Out' || name.toLowerCase().includes('paid') || name.toLowerCase().includes('outstanding')) {
      return [`₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, name];
    }
    return [value, name];
  };

  const truncate = (str, n) => (str.length > n) ? str.substr(0, n-1) + '...' : str;

  return (
    <div className="analytics-page">
      {/* Header & Filter Toolbar */}
      <div className="analytics-header">
        <div>
          <h2 className="analytics-title">Analytics Center</h2>
          <p className="analytics-subtitle">Professional dashboard for business intelligence.</p>
        </div>
        
        <div className="analytics-filters">
          <div className="filter-group">
            <User size={18} color="#64748b"/>
            <input 
              type="text" 
              placeholder="Search Client..." 
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="analytics-search-input"
            />
          </div>

          <div className="filter-group">
            <Calendar size={18} color="#64748b"/>
            <select value={dateRange} onChange={handleDateRangeChange} className="analytics-select">
              <option value="today">Today</option>
              <option value="last_7">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === "custom" && (
            <>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="analytics-date-input" />
              <span style={{color: '#94a3b8'}}>-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="analytics-date-input" />
            </>
          )}

          <div className="filter-group">
            <Filter size={18} color="#64748b"/>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="analytics-select">
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>

          <button onClick={fetchAnalytics} className="analytics-refresh-btn" title="Refresh Data">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs">
        <button className={`tab-btn ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')}>
          <DollarSign size={18}/> Financials
        </button>
        <button className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`} onClick={() => setActiveTab('operations')}>
          <Truck size={18}/> Operations
        </button>
        <button className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')}>
          <Briefcase size={18}/> Clients & Vendors
        </button>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : !data ? (
        <div className="analytics-empty">Failed to load analytics data.</div>
      ) : (
        <>
          {activeTab === 'financials' && (
            <>
              <div className="analytics-kpi-grid">
                <StatCard 
                  title="Total Sales" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{(data.financial?.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>} 
                  icon={<TrendingUp size={24} color="#10b981" />} 
                  subtitle="Total value of bills generated" 
                />
                <StatCard 
                  title="Total Expenses" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{(data.financial?.totalExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>} 
                  icon={<DollarSign size={24} color="#ef4444" />} 
                  subtitle="Total purchase bills amount" 
                />
                <StatCard 
                  title="Money Received" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{(data.financial?.paidAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>} 
                  icon={<DollarSign size={24} color="#4f46e5" />} 
                  subtitle="Actual cash received against bills" 
                />
                <StatCard 
                  title="Money Pending" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{(data.financial?.outstandingReceivables || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>} 
                  icon={<AlertCircle size={24} color="#f59e0b" />} 
                  subtitle="Unpaid amount pending" 
                />
              </div>

              <div className="analytics-charts-grid">
                <div className="chart-card full-width">
                  <h4 className="chart-title">Sales vs Expenses</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.financialTrendData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} stroke="#94a3b8" />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹ ${Intl.NumberFormat('en-IN', { notation: 'compact' }).format(val)}`} stroke="#94a3b8" />
                        <Tooltip formatter={renderTooltipFormatter} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" name="Sales" fill="#10b981" stroke="#10b981" fillOpacity={0.1} />
                        <Bar dataKey="expense" name="Expenses" fill="#ef4444" barSize={20} radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card full-width">
                  <h4 className="chart-title">Cash Flow Trend</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.cashFlowData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} stroke="#94a3b8" />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹ ${Intl.NumberFormat('en-IN', { notation: 'compact' }).format(val)}`} stroke="#94a3b8" />
                        <Tooltip formatter={renderTooltipFormatter} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Line type="monotone" dataKey="In" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Out" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'operations' && (
            <>
              <div className="analytics-kpi-grid">
                <StatCard 
                  title="Total Trips" 
                  value={data.totalBookings || 0} 
                  icon={<Truck size={24} color="#3b82f6" />} 
                  subtitle="Number of trips recorded" 
                />
                <StatCard 
                  title="Unbilled Trips Money" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{(data.unbilledRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>} 
                  icon={<FileText size={24} color="#f59e0b" />} 
                  subtitle="Trips not yet billed" 
                />
              </div>

              <div className="analytics-charts-grid">
                <div className="chart-card full-width">
                  <h4 className="chart-title">Trips Volume Over Time</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.bookingsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} stroke="#94a3b8" />
                        <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f1f5f9'}} />
                        <Bar dataKey="trips" name="Trips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card half-width">
                  <h4 className="chart-title">Mode of Transport</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.modeDistribution}
                          cx="50%" cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          labelLine={false}
                          label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        >
                          {data.modeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={MODE_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card half-width">
                  <h4 className="chart-title">Top Routes (Origin to Destination)</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.routeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tickFormatter={(val) => truncate(val, 15)} style={{fontSize: '0.8rem'}} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="trips" name="Trips" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'clients' && (
            <div className="analytics-charts-grid">
              <div className="chart-card full-width">
                <h4 className="chart-title">Top Clients: Money Received vs Pending</h4>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.salesByClient} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} stroke="#94a3b8" tickFormatter={(val) => truncate(val, 10)} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹ ${Intl.NumberFormat('en-IN', { notation: 'compact' }).format(val)}`} stroke="#94a3b8" />
                      <Tooltip formatter={renderTooltipFormatter} cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="paid" name="Received" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} maxBarSize={60} />
                      <Bar dataKey="outstanding" name="Pending" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card full-width">
                <h4 className="chart-title">Top Clients by Sales</h4>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.salesByClient}
                        cx="50%" cy="50%"
                        innerRadius={80} outerRadius={120}
                        paddingAngle={2}
                        dataKey="revenue"
                        labelLine={false}
                        label={({ percent }) => percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : ''}
                      >
                        {data.salesByClient.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={renderTooltipFormatter} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        formatter={(value) => truncate(value, 25)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
