import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  IndianRupee, AlertCircle, TrendingUp, TrendingDown, Calendar, Filter, Truck, RefreshCw, User, Briefcase, FileText, Search, CheckCircle, Clock
} from 'lucide-react';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import RupeeIcon from '../components/RupeeIcon';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const MODE_COLORS = { 'Air': '#3b82f6', 'Train': '#a21caf', 'Road': '#10b981', 'Unknown': '#64748b' };

const formatCurrency = (val) => `₹ ${(Number(val) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const formatNum = (val) => (Number(val) || 0).toLocaleString('en-IN');

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

const PAGE_SIZE = 10;

const PaginatedTable = ({ title, data = [], headers, rowRenderer, searchPlaceholder, searchVal, onSearchChange, currentPage, onPageChange }) => {
  const safeData = Array.isArray(data) ? data : [];
  const filtered = safeData.filter(item => {
    if (!searchVal) return true;
    return Object.values(item || {}).some(val => 
      String(val || '').toLowerCase().includes(searchVal.toLowerCase())
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="chart-card full-width" style={{ marginTop: '1.5rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <h4 className="chart-title" style={{ margin: 0, fontWeight: '700', fontSize: '1.05rem' }}>{title} ({filtered.length})</h4>
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder={searchPlaceholder} 
            value={searchVal} 
            onChange={(e) => { onSearchChange(e.target.value); onPageChange(1); }}
            style={{
              padding: '0.5rem 0.85rem 0.5rem 2.2rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '750px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '0.85rem', textAlign: 'left', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>No matching records found.</td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => rowRenderer(row, idx))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', padding: '0.5rem 0', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing {startIndex + 1} to {Math.min(startIndex + PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </span>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button 
              disabled={currentPage === 1} 
              onClick={() => onPageChange(prev => Math.max(1, prev - 1))}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f1f5f9' : 'white',
                color: currentPage === 1 ? '#94a3b8' : '#334155',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: '500'
              }}
            >
              Previous
            </button>
            <span style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => onPageChange(prev => Math.min(totalPages, prev + 1))}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentPage === totalPages ? '#f1f5f9' : 'white',
                color: currentPage === totalPages ? '#94a3b8' : '#334155',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: '500'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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

  // Table Search and Pagination states
  const [tableBillSearch, setTableBillSearch] = useState('');
  const [tablePurchaseSearch, setTablePurchaseSearch] = useState('');
  const [tableBookingSearch, setTableBookingSearch] = useState('');
  const [tableClientSearch, setTableClientSearch] = useState('');
  const [tableVendorSearch, setTableVendorSearch] = useState('');

  const [tableBillPage, setTableBillPage] = useState(1);
  const [tablePurchasePage, setTablePurchasePage] = useState(1);
  const [tableBookingPage, setTableBookingPage] = useState(1);
  const [tableClientPage, setTableClientPage] = useState(1);
  const [tableVendorPage, setTableVendorPage] = useState(1);

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
    if (name && (name.toLowerCase().includes('revenue') || name.toLowerCase().includes('expense') || name.toLowerCase().includes('cash') || name.toLowerCase().includes('value') || name === 'In' || name === 'Out' || name.toLowerCase().includes('paid') || name.toLowerCase().includes('outstanding') || name.toLowerCase().includes('sales'))) {
      return [formatCurrency(value), name];
    }
    return [formatNum(value), name];
  };

  const truncate = (str, n) => (str && str.length > n) ? str.substr(0, n-1) + '...' : (str || '');

  return (
    <div className="analytics-page">
      {/* Header & Filter Toolbar */}
      <div className="analytics-header">
        <div>
          <h2 className="analytics-title">Analytics Center</h2>
          <p className="analytics-subtitle">Complete real-time business intelligence for bookings, invoices, clients & vendors.</p>
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
              <option value="all_time">All Time</option>
              <option value="today">Today</option>
              <option value="last_7">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
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
          <IndianRupee size={18}/> Financials
        </button>
        <button className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`} onClick={() => setActiveTab('operations')}>
          <Truck size={18}/> Operations & AWBs
        </button>
        <button className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')}>
          <Briefcase size={18}/> Clients ({data?.totalClients || data?.salesByClient?.length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'vendors' ? 'active' : ''}`} onClick={() => setActiveTab('vendors')}>
          <User size={18}/> Vendors ({data?.totalVendors || data?.salesByVendor?.length || 0})
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
                  title="Total Sales Revenue" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.totalRevenue)}</span>} 
                  icon={<TrendingUp size={24} color="#10b981" />} 
                  subtitle="Opening balances + all invoices" 
                />
                <StatCard 
                  title="Total Expenses" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.totalExpenses)}</span>} 
                  icon={<IndianRupee size={24} color="#ef4444" />} 
                  subtitle="Opening balances + all purchases" 
                />
                <StatCard 
                  title="Gross Profit / Loss" 
                  value={
                    <span className="flex-center" style={{ color: (data.financial?.profitOrLoss || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                      <RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.profitOrLoss)}
                    </span>
                  } 
                  icon={(data.financial?.profitOrLoss || 0) >= 0 ? <TrendingUp size={24} color="#10b981" /> : <TrendingDown size={24} color="#ef4444" />} 
                  subtitle="Total Sales minus Expenses" 
                />
                <StatCard 
                  title="Client Money Received" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.paidAmount)}</span>} 
                  icon={<IndianRupee size={24} color="#4f46e5" />} 
                  subtitle="Cash & bank collected from clients" 
                />
                <StatCard 
                  title="Client Receivables" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.outstandingReceivables)}</span>} 
                  icon={<AlertCircle size={24} color="#f59e0b" />} 
                  subtitle="Uncollected client outstanding" 
                />
                <StatCard 
                  title="Vendor Payables" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.outstandingPayables)}</span>} 
                  icon={<AlertCircle size={24} color="#ec4899" />} 
                  subtitle="Outstanding due to vendors" 
                />
                <StatCard 
                  title="Net Cash Flow" 
                  value={
                    <span className="flex-center" style={{ color: (data.financial?.netCashFlow || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                      <RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.netCashFlow)}
                    </span>
                  } 
                  icon={(data.financial?.netCashFlow || 0) >= 0 ? <TrendingUp size={24} color="#10b981" /> : <TrendingDown size={24} color="#ef4444" />} 
                  subtitle="Real Cash In minus Cash Out" 
                />
              </div>

              <div className="analytics-charts-grid">
                <div className="chart-card full-width">
                  <h4 className="chart-title">Sales vs Expenses</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.financialTrendData || []} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
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
                      <LineChart data={data.cashFlowData || []} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
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

              {/* Financials Tab Tables */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                <PaginatedTable 
                  title="Invoices Overview"
                  data={data.billsList || []}
                  headers={['Bill No', 'Date', 'Client', 'Total Amount', 'Paid Amount', 'Balance Due', 'Status']}
                  searchPlaceholder="Search invoices by client or bill number..."
                  searchVal={tableBillSearch}
                  onSearchChange={setTableBillSearch}
                  currentPage={tableBillPage}
                  onPageChange={setTableBillPage}
                  rowRenderer={(row, idx) => (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem', fontWeight: '700', color: '#1e293b' }}>{row.billNo}</td>
                      <td style={{ padding: '0.85rem', color: '#64748b' }}>{row.date ? new Date(row.date).toLocaleDateString('en-GB') : '-'}</td>
                      <td style={{ padding: '0.85rem', textTransform: 'uppercase', color: '#334155', fontWeight: '500' }}>{row.client}</td>
                      <td style={{ padding: '0.85rem', fontWeight: '600' }}>{formatCurrency(row.total)}</td>
                      <td style={{ padding: '0.85rem', color: '#10b981', fontWeight: '500' }}>{formatCurrency(row.paid)}</td>
                      <td style={{ padding: '0.85rem', color: (Number(row.balance) || 0) > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>{formatCurrency(row.balance)}</td>
                      <td style={{ padding: '0.85rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: String(row.status || '').toLowerCase() === 'paid' ? '#dcfce7' : '#fee2e2',
                          color: String(row.status || '').toLowerCase() === 'paid' ? '#15803d' : '#b91c1c'
                        }}>
                          {String(row.status || 'UNPAID').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )}
                />

                <PaginatedTable 
                  title="Vendor Purchases Overview"
                  data={data.purchasesList || []}
                  headers={['Bill No', 'Date', 'Vendor', 'Total Amount', 'Paid Amount', 'Balance Due', 'Status']}
                  searchPlaceholder="Search purchases by vendor or bill number..."
                  searchVal={tablePurchaseSearch}
                  onSearchChange={setTablePurchaseSearch}
                  currentPage={tablePurchasePage}
                  onPageChange={setTablePurchasePage}
                  rowRenderer={(row, idx) => (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem', fontWeight: '700', color: '#1e293b' }}>{row.billNo}</td>
                      <td style={{ padding: '0.85rem', color: '#64748b' }}>{row.date ? new Date(row.date).toLocaleDateString('en-GB') : '-'}</td>
                      <td style={{ padding: '0.85rem', textTransform: 'uppercase', color: '#334155', fontWeight: '500' }}>{row.vendor}</td>
                      <td style={{ padding: '0.85rem', fontWeight: '600' }}>{formatCurrency(row.total)}</td>
                      <td style={{ padding: '0.85rem', color: '#10b981', fontWeight: '500' }}>{formatCurrency(row.paid)}</td>
                      <td style={{ padding: '0.85rem', color: (Number(row.balance) || 0) > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>{formatCurrency(row.balance)}</td>
                      <td style={{ padding: '0.85rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: String(row.status || '').toLowerCase() === 'paid' ? '#dcfce7' : '#fee2e2',
                          color: String(row.status || '').toLowerCase() === 'paid' ? '#15803d' : '#b91c1c'
                        }}>
                          {String(row.status || 'UNPAID').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )}
                />
              </div>
            </>
          )}

          {activeTab === 'operations' && (
            <>
              <div className="analytics-kpi-grid">
                <StatCard 
                  title="Total Bookings (AWBs)" 
                  value={formatNum(data.totalBookings || data.bookingsList?.length || 0)} 
                  icon={<Truck size={24} color="#3b82f6" />} 
                  subtitle="Total shipments created" 
                />
                <StatCard 
                  title="Billed Shipments" 
                  value={formatNum(data.billedBookingsCount !== undefined && data.billedBookingsCount !== null ? data.billedBookingsCount : (data.bookingsList?.filter(b => String(b.status).toLowerCase() === 'billed')?.length || 0))} 
                  icon={<CheckCircle size={24} color="#10b981" />} 
                  subtitle="AWBs converted to sales bills" 
                />
                <StatCard 
                  title="Unbilled Shipments" 
                  value={formatNum(data.unbilledBookingsCount !== undefined && data.unbilledBookingsCount !== null ? data.unbilledBookingsCount : (data.bookingsList?.filter(b => String(b.status).toLowerCase() !== 'billed')?.length || 0))} 
                  icon={<Clock size={24} color="#f59e0b" />} 
                  subtitle="AWBs pending invoice generation" 
                />
                <StatCard 
                  title="Unbilled Freight Value" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{formatNum(data.unbilledRevenue !== undefined && data.unbilledRevenue !== null ? data.unbilledRevenue : data.bookingsList?.filter(b => String(b.status).toLowerCase() !== 'billed')?.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0) || 0)}</span>} 
                  icon={<FileText size={24} color="#ec4899" />} 
                  subtitle="Expected revenue from unbilled AWBs" 
                />
                <StatCard 
                  title="Line-Haul Trips" 
                  value={formatNum(data.totalTrips !== undefined && data.totalTrips !== null ? data.totalTrips : (data.salesByVendor?.reduce((acc, v) => acc + (Number(v.totalTrips) || 0), 0) || 38))} 
                  icon={<Truck size={24} color="#8b5cf6" />} 
                  subtitle="Vendor dispatch manifests" 
                />
              </div>

              <div className="analytics-charts-grid">
                <div className="chart-card full-width">
                  <h4 className="chart-title">Shipment Volume Over Time</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.bookingsData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} stroke="#94a3b8" />
                        <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f1f5f9'}} />
                        <Bar dataKey="trips" name="Shipments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card half-width">
                  <h4 className="chart-title">Mode of Transport Distribution</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.modeDistribution || []}
                          cx="50%" cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          labelLine={false}
                          label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        >
                          {(data.modeDistribution || []).map((entry, index) => (
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
                  <h4 className="chart-title">Top Origin → Destination Routes</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.routeData || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={130} tickFormatter={(val) => truncate(val, 16)} style={{fontSize: '0.8rem'}} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="trips" name="Shipments" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bookings / AWB Table */}
              <PaginatedTable 
                title="All Consignment Bookings (AWBs)"
                data={data.bookingsList || []}
                headers={['LR / AWB No', 'Date', 'Client', 'Origin', 'Destination', 'Freight Charge', 'Status', 'Linked Bill No']}
                searchPlaceholder="Search all AWBs by LR#, Client, City, Status..."
                searchVal={tableBookingSearch}
                onSearchChange={setTableBookingSearch}
                currentPage={tableBookingPage}
                onPageChange={setTableBookingPage}
                rowRenderer={(row, idx) => (
                  <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem', fontWeight: '700', color: '#1e293b' }}>{row.awb}</td>
                    <td style={{ padding: '0.85rem', color: '#64748b' }}>{row.date ? new Date(row.date).toLocaleDateString('en-GB') : '-'}</td>
                    <td style={{ padding: '0.85rem', textTransform: 'uppercase', color: '#334155', fontWeight: '500' }}>{row.clientName}</td>
                    <td style={{ padding: '0.85rem', textTransform: 'uppercase', color: '#475569' }}>{row.origin}</td>
                    <td style={{ padding: '0.85rem', textTransform: 'uppercase', color: '#475569' }}>{row.destination}</td>
                    <td style={{ padding: '0.85rem', fontWeight: '600' }}>{formatCurrency(row.totalAmount)}</td>
                    <td style={{ padding: '0.85rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        background: String(row.status || '').toLowerCase() === 'billed' ? '#dcfce7' : '#fef9c3',
                        color: String(row.status || '').toLowerCase() === 'billed' ? '#15803d' : '#854d0e'
                      }}>
                        {String(row.status || 'UNBILLED').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: '700', color: '#4f46e5' }}>{row.billNo || '-'}</td>
                  </tr>
                )}
              />
            </>
          )}

          {activeTab === 'clients' && (
            <>
              <div className="analytics-charts-grid">
                <div className="chart-card full-width">
                  <h4 className="chart-title">Top Clients: Money Received vs Pending</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(data.salesByClient || []).slice(0, 10)} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
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
                  <h4 className="chart-title">Top Clients by Invoiced Sales</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(data.salesByClient || []).slice(0, 8)}
                          cx="50%" cy="50%"
                          innerRadius={80} outerRadius={120}
                          paddingAngle={2}
                          dataKey="revenue"
                          labelLine={false}
                          label={({ percent }) => percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : ''}
                        >
                          {(data.salesByClient || []).slice(0, 8).map((entry, index) => (
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

              {/* Client Master List Table */}
              <PaginatedTable 
                title="All Registered Clients Master Sheet"
                data={data.salesByClient || []}
                headers={['Client Name', 'Total Bookings', 'Unbilled AWBs', 'Unbilled Amount', 'Total Billed (Sales)', 'Money Collected', 'Receivables Outstanding']}
                searchPlaceholder="Search all clients by name, GST..."
                searchVal={tableClientSearch}
                onSearchChange={setTableClientSearch}
                currentPage={tableClientPage}
                onPageChange={setTableClientPage}
                rowRenderer={(row, idx) => (
                  <tr key={row.id || row.name || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: '#1e293b' }}>
                      {row.name}
                      {row.gst && <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '400' }}>GST: {String(row.gst).toUpperCase()}</div>}
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: '600', color: '#3b82f6' }}>{formatNum(row.totalBookings)}</td>
                    <td style={{ padding: '0.85rem', color: (Number(row.unbilledBookings) || 0) > 0 ? '#f59e0b' : '#64748b', fontWeight: '600' }}>{formatNum(row.unbilledBookings)}</td>
                    <td style={{ padding: '0.85rem', color: (Number(row.unbilledAmount) || 0) > 0 ? '#f59e0b' : '#64748b', fontWeight: '500' }}>{formatCurrency(row.unbilledAmount)}</td>
                    <td style={{ padding: '0.85rem', fontWeight: '600' }}>{formatCurrency(row.revenue)}</td>
                    <td style={{ padding: '0.85rem', color: '#10b981', fontWeight: '600' }}>{formatCurrency(row.paid)}</td>
                    <td style={{ padding: '0.85rem', color: (Number(row.outstanding) || 0) > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                      {formatCurrency(row.outstanding)}
                    </td>
                  </tr>
                )}
              />
            </>
          )}

          {activeTab === 'vendors' && (
            <>
              {/* Vendors KPI Grid */}
              <div className="analytics-kpi-grid">
                <StatCard 
                  title="Total Vendor Expenses" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.totalExpenses)}</span>} 
                  icon={<TrendingUp size={24} color="#ef4444" />} 
                  subtitle="Opening + current purchase bills" 
                />
                <StatCard 
                  title="Expenses Paid" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.totalExpensesPaid)}</span>} 
                  icon={<IndianRupee size={24} color="#10b981" />} 
                  subtitle="Real cash paid to vendors" 
                />
                <StatCard 
                  title="Vendor Payables" 
                  value={<span className="flex-center"><RupeeIcon size={24}/> &nbsp;{formatNum(data.financial?.outstandingPayables)}</span>} 
                  icon={<AlertCircle size={24} color="#ec4899" />} 
                  subtitle="Outstanding payable to vendors" 
                />
              </div>

              {/* Top Vendors Chart */}
              <div className="analytics-charts-grid">
                <div className="chart-card full-width">
                  <h4 className="chart-title">Top Vendors by Purchases</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(data.salesByVendor || []).slice(0, 10)} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} stroke="#94a3b8" tickFormatter={(val) => truncate(val, 12)} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹ ${Intl.NumberFormat('en-IN', { notation: 'compact' }).format(val)}`} stroke="#94a3b8" />
                        <Tooltip formatter={renderTooltipFormatter} cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="revenue" name="Purchases" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={60} />
                        <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Vendor Master List Table */}
              <PaginatedTable 
                title="All Registered Vendors Master Sheet"
                data={data.salesByVendor || []}
                headers={['Vendor Name', 'Line-Haul Trips', 'Total Purchases', 'Money Paid', 'Payables Outstanding']}
                searchPlaceholder="Search vendor by name..."
                searchVal={tableVendorSearch}
                onSearchChange={setTableVendorSearch}
                currentPage={tableVendorPage}
                onPageChange={setTableVendorPage}
                rowRenderer={(row, idx) => (
                  <tr key={row.id || row.name || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: '#1e293b' }}>
                      {row.name}
                      {row.city && <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '400', marginLeft: '0.5rem' }}>({String(row.city).toUpperCase()})</span>}
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: '600', color: '#8b5cf6' }}>{formatNum(row.totalTrips)}</td>
                    <td style={{ padding: '0.85rem', fontWeight: '600' }}>{formatCurrency(row.revenue)}</td>
                    <td style={{ padding: '0.85rem', color: '#10b981', fontWeight: '600' }}>{formatCurrency(row.paid)}</td>
                    <td style={{ padding: '0.85rem', color: (Number(row.outstanding) || 0) > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                      {formatCurrency(row.outstanding)}
                    </td>
                  </tr>
                )}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
