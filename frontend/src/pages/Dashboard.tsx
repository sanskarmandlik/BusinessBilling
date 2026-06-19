import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowDownRight, Wallet, ShoppingBag, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '../config';

interface DashboardProps {
  token: string;
  currency: string;
  onNavigate: (page: string) => void;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface Stats {
  totalSales: number;
  salesCount: number;
  totalExpenses: number;
  totalSaved: number;
  cashSales: number;
  onlineSales: number;
  cashExpenses: number;
  onlineExpenses: number;
  cashSaved: number;
  onlineSaved: number;
  dailySalesAmount: number;
  dailySalesCount: number;
}

interface Activity {
  id: number;
  type: 'sale' | 'expense';
  amount: number;
  customer_name?: string;
  description?: string;
  items_summary?: string;
  payment_method: string;
  created_at: string;
}

interface ChartItem {
  date: string;
  sales: number;
  expenses: number;
}

interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
}

export default function Dashboard({ token, currency, onNavigate, addAlert }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    salesCount: 0,
    totalExpenses: 0,
    totalSaved: 0,
    cashSales: 0,
    onlineSales: 0,
    cashExpenses: 0,
    onlineExpenses: 0,
    cashSaved: 0,
    onlineSaved: 0,
    dailySalesAmount: 0,
    dailySalesCount: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; sales: number; expenses: number } | null>(null);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }
      setStats(data.stats);
      setActivities(data.recentActivities);
      setChartData(data.chartData);
      setLowStock(data.lowStock);
    } catch (error: any) {
      addAlert(error.message || 'Error connecting to database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const formatCurrency = (amount: number | undefined | null) => {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
    const value = amount || 0;
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-cyan)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading business stats...</p>
      </div>
    );
  }

  // Calculate coordinates for custom SVG chart
  const renderSVGChart = () => {
    if (chartData.length === 0) return null;

    const width = 600;
    const height = 200;
    const paddingX = 40;
    const paddingY = 20;

    const maxVal = Math.max(
      ...chartData.map(d => Math.max(d.sales, d.expenses)),
      100 // fallback min value to scale cleanly
    ) * 1.1; // 10% breathing room

    const pointsCount = chartData.length;
    const stepX = (width - paddingX * 2) / (pointsCount - 1);
    
    // Map data values to screen coords
    const getCoords = (val: number, idx: number) => {
      const x = paddingX + idx * stepX;
      // Invert Y axis for screen space
      const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
      return { x, y };
    };

    // Construct path strings
    let salesPath = '';
    let expensesPath = '';
    let salesAreaPath = '';
    let expensesAreaPath = '';

    chartData.forEach((d, idx) => {
      const salesCoords = getCoords(d.sales, idx);
      const expCoords = getCoords(d.expenses, idx);

      if (idx === 0) {
        salesPath = `M ${salesCoords.x} ${salesCoords.y}`;
        expensesPath = `M ${expCoords.x} ${expCoords.y}`;
        salesAreaPath = `M ${salesCoords.x} ${height - paddingY} L ${salesCoords.x} ${salesCoords.y}`;
        expensesAreaPath = `M ${expCoords.x} ${height - paddingY} L ${expCoords.x} ${expCoords.y}`;
      } else {
        salesPath += ` L ${salesCoords.x} ${salesCoords.y}`;
        expensesPath += ` L ${expCoords.x} ${expCoords.y}`;
        salesAreaPath += ` L ${salesCoords.x} ${salesCoords.y}`;
        expensesAreaPath += ` L ${expCoords.x} ${expCoords.y}`;
      }

      if (idx === pointsCount - 1) {
        salesAreaPath += ` L ${salesCoords.x} ${height - paddingY} Z`;
        expensesAreaPath += ` L ${expCoords.x} ${height - paddingY} Z`;
      }
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
        <defs>
          <linearGradient id="sales-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="expenses-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-red)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-red)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = paddingY + ratio * (height - paddingY * 2);
          const gridVal = maxVal * (1 - ratio);
          return (
            <g key={index}>
              <line 
                x1={paddingX} 
                y1={y} 
                x2={width - paddingX} 
                y2={y} 
                className="chart-grid-line" 
              />
              <text 
                x={paddingX - 8} 
                y={y + 3} 
                textAnchor="end" 
                className="chart-text"
              >
                {gridVal > 1000 ? `${(gridVal/1000).toFixed(1)}k` : Math.round(gridVal)}
              </text>
            </g>
          );
        })}

        {/* Fill Areas first (so lines render on top) */}
        {salesAreaPath && <path d={salesAreaPath} className="chart-area-sales" />}
        {expensesAreaPath && <path d={expensesAreaPath} className="chart-area-expenses" />}

        {/* Lines */}
        {salesPath && <path d={salesPath} className="chart-line-sales" />}
        {expensesPath && <path d={expensesPath} className="chart-line-expenses" />}

        {/* Data points and labels */}
        {chartData.map((d, idx) => {
          const salesCoords = getCoords(d.sales, idx);
          const expCoords = getCoords(d.expenses, idx);

          return (
            <g key={idx}>
              {/* Sales Dots */}
              <circle
                cx={salesCoords.x}
                cy={salesCoords.y}
                r={4}
                className="chart-dot sales"
                onMouseEnter={() => setHoveredPoint({ day: d.date, sales: d.sales, expenses: d.expenses })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {/* Expense Dots */}
              <circle
                cx={expCoords.x}
                cy={expCoords.y}
                r={4}
                className="chart-dot expenses"
                onMouseEnter={() => setHoveredPoint({ day: d.date, sales: d.sales, expenses: d.expenses })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {/* X Axis Labels */}
              <text
                x={salesCoords.x}
                y={height - 4}
                textAnchor="middle"
                className="chart-text"
                style={{ fontWeight: 500 }}
              >
                {d.date.split(',')[0] /* show only weekday */}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="page-content">
      {/* Greeting Header */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Business Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time cash flow and inventory monitor</p>
        </div>
        <div className="dashboard-header-buttons">
          <button className="btn btn-secondary" onClick={() => onNavigate('expense')}>
            Log Withdrawal
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('billing')}>
            New Sale (POS)
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="stats-grid">
        {/* Cash Savings Box */}
        <div className="glass-card stat-card" style={{ animationDelay: '0.05s' }}>
          <div className="stat-icon-wrapper cyan">
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-title">Cash Savings</span>
            <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{formatCurrency(stats.cashSaved)}</span>
          </div>
        </div>

        {/* Online Savings Box */}
        <div className="glass-card stat-card" style={{ animationDelay: '0.1s' }}>
          <div className="stat-icon-wrapper purple">
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-title">Online Savings</span>
            <span className="stat-value" style={{ color: 'var(--accent-purple)' }}>{formatCurrency(stats.onlineSaved)}</span>
          </div>
        </div>

        {/* Daily Sales Box */}
        <div className="glass-card stat-card" style={{ animationDelay: '0.15s' }}>
          <div className="stat-icon-wrapper green">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-title">Sales Today</span>
            <span className="stat-value">{formatCurrency(stats.dailySalesAmount)}</span>
          </div>
        </div>

        {/* Personal Withdrawals Box */}
        <div className="glass-card stat-card" style={{ animationDelay: '0.2s' }}>
          <div className="stat-icon-wrapper red">
            <ArrowDownRight size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-title">Personal Expense</span>
            <span className="stat-value" style={{ color: 'var(--accent-red)' }}>{formatCurrency(stats.totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStock.length > 0 && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-red)', padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle style={{ color: 'var(--accent-red)' }} />
            <div>
              <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Inventory Warning</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                There are {lowStock.length} items running extremely low on stock (less than 5 units left).
              </p>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => onNavigate('products')}
          >
            Manage Catalog <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Dashboard Layout Grid */}
      <div className="dashboard-grid">
        {/* Sales Graph Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Weekly Cash Flow Summary</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Comparison of Daily Sales and Owner Withdrawals</p>
            </div>
            {hoveredPoint ? (
              <div className="glass-card" style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.75rem', border: '1px solid var(--border-color)', margin: 0 }}>
                <strong>{hoveredPoint.day}</strong>: Sales:{' '}
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{formatCurrency(hoveredPoint.sales)}</span> | Exp:{' '}
                <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{formatCurrency(hoveredPoint.expenses)}</span>
              </div>
            ) : (
              <div className="legend">
                <div className="legend-item">
                  <span className="legend-color sales"></span> Sales
                </div>
                <div className="legend-item">
                  <span className="legend-color expenses"></span> Withdrawals
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '1rem 0' }}>
            {chartData.length > 0 ? (
              renderSVGChart()
            ) : (
              <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Not enough sales data recorded to populate the graph chart.
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities Log */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Recent Log History</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Latest transactions & withdrawals</p>
          
          <div className="activity-list">
            {activities.length > 0 ? (
              activities.map((act) => (
                <div key={`${act.type}-${act.id}`} className="activity-item">
                  <div className="activity-info">
                    <span className={`activity-indicator ${act.type}`}></span>
                    <div>
                      {act.type === 'sale' ? (
                        <div>
                          <span className="activity-name">{act.customer_name || 'Walk-in Customer'}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {' '}purchased {act.items_summary} and given {formatCurrency(act.amount)} {act.payment_method === 'Online' ? 'online' : 'cash'}
                          </span>
                        </div>
                      ) : (
                        <span className="activity-name">{act.description}</span>
                      )}
                      <div className="activity-time">
                        {act.type === 'sale' ? 'Sale' : 'Withdrawal'} • {act.payment_method === 'Online' ? '💳 Online' : '💵 Cash'} • {new Date(act.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`activity-amount ${act.type}`}>
                    {act.type === 'sale' ? '+' : '-'}{formatCurrency(act.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No recent activity logged.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
