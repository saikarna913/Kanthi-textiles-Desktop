import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import {
  LayoutDashboard, RefreshCw, IndianRupee, ShoppingCart,
  TrendingUp, TrendingDown, Users, Package, AlertTriangle,
  BarChart2, Calendar, Layers
} from 'lucide-react';
import { Card, Badge, PageHeader, Button, ChartTooltip, ProgressBar } from '../../components/ui/index';

const COLORS = ['#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#EC4899', '#06B6D4'];
const fmtCur = v => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${Number(v || 0).toFixed(0)}`;
const fmtNum = v => Number(v || 0).toLocaleString('en-IN');

// ── KPI mini card ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'var(--accent)', icon: Icon, trend, trendVal, delay = 0 }) {
  const up = trend === 'up';
  return (
    <div className="animate-fade-in-up"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, animationDelay: `${delay}ms`, animationFillMode: 'forwards', opacity: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, border: `1px solid ${color}30` }}>
          {Icon && <Icon size={16} style={{ color }} />}
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: up ? 'var(--success-bg)' : 'var(--danger-bg)', color: up ? 'var(--success)' : 'var(--danger)' }}>
            {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />} {trendVal}
          </div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, badge, badgeVariant = 'accent' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
    </div>
  );
}

// ── Divider between sections ──────────────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 20px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 99 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// ── Sparkline mini chart ──────────────────────────────────────────────────────
function Sparkline({ data, dataKey, color }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#', '')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  // Sales transactions data
  const [txStats, setTxStats] = useState({});
  const [txMonthly, setTxMonthly] = useState([]);
  const [txTopProducts, setTxTopProducts] = useState([]);
  const [txCategories, setTxCategories] = useState([]);
  const [txCustomers, setTxCustomers] = useState([]);

  // Monthly sales (S.NO / STOCK ITEMS / TOTAL) data
  const [mbStats, setMbStats] = useState({});
  const [mbMonthly, setMbMonthly] = useState([]);
  const [mbTopProducts, setMbTopProducts] = useState([]);
  const [mbCategories, setMbCategories] = useState([]);

  // Shared
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        _txStats, _txMonthly, _txTop, _txCat, _txCust,
        _mbStats, _mbMonthly, _mbTop, _mbCat,
      ] = await Promise.all([
        window.electron.db.getDashboardStats({ salesType: 'sales' }),
        window.electron.db.getMonthlySales({ months: 12, salesType: 'sales' }),
        window.electron.db.getTopProducts({ limit: 8, salesType: 'sales' }),
        window.electron.db.getCategoryAnalysis({ salesType: 'sales' }),
        window.electron.db.getCustomerAnalytics({ salesType: 'sales' }),
        window.electron.db.getDashboardStats({ salesType: 'sales_by_month' }),
        window.electron.db.getMonthlySales({ months: 12, salesType: 'sales_by_month' }),
        window.electron.db.getTopProducts({ limit: 8, salesType: 'sales_by_month' }),
        window.electron.db.getCategoryAnalysis({ salesType: 'sales_by_month' }),
      ]);

      setTxStats(_txStats || {});
      setTxMonthly(Array.isArray(_txMonthly) ? _txMonthly : []);
      setTxTopProducts(Array.isArray(_txTop) ? _txTop : []);
      setTxCategories(Array.isArray(_txCat) ? _txCat.slice(0, 7) : []);
      setTxCustomers(Array.isArray(_txCust) ? _txCust.slice(0, 5) : []);

      setMbStats(_mbStats || {});
      setMbMonthly(Array.isArray(_mbMonthly) ? _mbMonthly : []);
      setMbTopProducts(Array.isArray(_mbTop) ? _mbTop : []);
      setMbCategories(Array.isArray(_mbCat) ? _mbCat.slice(0, 7) : []);

      setLastRefresh(new Date());
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const txGrowthUp = (txStats.monthGrowth || 0) >= 0;
  const txMaxSales = Math.max(...txTopProducts.map(p => p.total_sales || 0), 1);
  const mbMaxQty = Math.max(...mbTopProducts.map(p => p.total_qty || 0), 1);
  const txTotalQtySold = txMonthly.reduce((s, m) => s + (m.orders || 0), 0);
  const mbTotalUnitsSold = mbMonthly.reduce((s, m) => s + (m.orders || 0), 0);

  // MoM change for monthly sales qty
  const mbLastTwo = mbMonthly.slice(-2);
  const mbMomChange = mbLastTwo.length === 2 && mbLastTwo[0].sales > 0
    ? ((mbLastTwo[1].sales - mbLastTwo[0].sales) / mbLastTwo[0].sales) * 100
    : 0;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading dashboard...</p>
    </div>
  );

  const hasTransactions = (txStats.totalOrders || 0) > 0;
  const hasMonthlySales = (mbStats.totalOrders || 0) > 0;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 32px' }} className="scroll-area">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <PageHeader
        title="Dashboard"
        subtitle={`Last updated ${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
        icon={LayoutDashboard}
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>}
      />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 1 — SALES TRANSACTIONS                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 28, background: 'var(--accent)', borderRadius: 99 }} />
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Sales Transactions</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Customer · Product · Amount · Date — from your sales excel files</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Badge variant={hasTransactions ? 'success' : 'default'}>
              {hasTransactions ? `${fmtNum(txStats.totalOrders)} records` : 'No data yet'}
            </Badge>
          </div>
        </div>

        {!hasTransactions ? (
          <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
            <ShoppingCart size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>No transaction data yet</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Import a sales Excel file (Date / Customer / Product / Amount format) to see analytics here</p>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }} className="stagger">
              <KpiCard label="Total Revenue" value={fmtCur(txStats.totalSales)} sub="All time" icon={IndianRupee} color="var(--accent)"
                trend={txGrowthUp ? 'up' : 'down'} trendVal={`${Math.abs(txStats.monthGrowth || 0).toFixed(1)}% MoM`} delay={0} />
              <KpiCard label="Total Orders" value={fmtNum(txStats.totalOrders)} sub={`Avg ${fmtCur(txStats.avgOrderValue)}/order`}
                icon={ShoppingCart} color="var(--info)" delay={60} />
              <KpiCard label="Total Profit" value={fmtCur(txStats.totalProfit)} sub="Net earnings"
                icon={TrendingUp} color="var(--success)" delay={120} />
              <KpiCard label="Customers" value={fmtNum(txStats.uniqueCustomers)} sub="Unique buyers"
                icon={Users} color="#8B5CF6" delay={180} />
            </div>

            {/* This month vs last month */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }} className="stagger">
              <KpiCard label="This Month" value={fmtCur(txStats.thisMonthSales)}
                icon={Calendar} color="var(--gold)"
                trend={txGrowthUp ? 'up' : 'down'}
                trendVal={`vs ₹${fmtCur(txStats.lastMonthSales)} last mo`} delay={0} />
              <KpiCard label="Avg Order Value" value={fmtCur(txStats.avgOrderValue)}
                icon={IndianRupee} color="var(--accent)" delay={60} />
              <KpiCard label="Inventory Value" value={fmtCur(txStats.totalInventoryValue)}
                sub="At cost price" icon={Package} color="var(--text-secondary)" delay={120} />
              <KpiCard label="Low Stock Alerts" value={fmtNum(txStats.lowStockItems)}
                sub="Items need restock" icon={AlertTriangle} color="var(--danger)" delay={180} />
            </div>

            {/* Revenue trend + Category mix */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
              <Card>
                <SectionHeader title="Revenue & Profit Trend" subtitle="Last 12 months" badge="Monthly" />
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={txMonthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="profit-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtCur} width={52} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="sales" name="Revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#rev-grad)" />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="var(--gold)" strokeWidth={1.5} fill="url(#profit-grad)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionHeader title="Category Mix" subtitle="Revenue share" />
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={txCategories} dataKey="total_sales" nameKey="category"
                      cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2}>
                      {txCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmtCur(v)}
                      contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                  {txCategories.slice(0, 4).map((cat, i) => (
                    <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.category}</span>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{fmtCur(cat.total_sales)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Top products + Top customers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Card>
                <SectionHeader title="Top Products by Revenue" badge="By ₹" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {txTopProducts.slice(0, 6).map((p, i) => (
                    <div key={p.product_name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>#{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{p.product_name}</span>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{fmtCur(p.total_sales)}</span>
                        </div>
                        <ProgressBar value={p.total_sales} max={txMaxSales} color={i === 0 ? 'accent' : i === 1 ? 'gold' : 'success'} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionHeader title="Top Customers" badge="By spend" badgeVariant="info" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {txCustomers.map((c, i) => (
                    <div key={c.customer_name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < txCustomers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length], flexShrink: 0 }}>
                        {c.customer_name?.[0] || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.customer_name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.purchase_count} orders · {c.customer_type}</div>
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{fmtCur(c.total_spent)}</div>
                    </div>
                  ))}
                </div>

                {/* Wholesale vs retail mini summary */}
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Wholesale', value: fmtCur(txCustomers.filter(c => c.customer_type === 'Wholesale').reduce((s, c) => s + c.total_spent, 0)), color: 'var(--accent)' },
                    { label: 'Retail', value: fmtCur(txCustomers.filter(c => c.customer_type === 'Retail').reduce((s, c) => s + c.total_spent, 0)), color: 'var(--gold)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  SECTION DIVIDER                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionDivider label="Monthly Sales Data" />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  SECTION 2 — MONTHLY SALES (S.NO / STOCK ITEMS / TOTAL)              */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 28, background: 'var(--gold)', borderRadius: 99 }} />
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Monthly Sales Summary</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>S.NO · STOCK ITEMS · TOTAL — from your monthly sales register files</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Badge variant={hasMonthlySales ? 'gold' : 'default'}>
              {hasMonthlySales ? `${fmtNum(mbStats.totalOrders)} line items` : 'No data yet'}
            </Badge>
          </div>
        </div>

        {!hasMonthlySales ? (
          <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
            <Layers size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>No monthly sales data yet</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Import a monthly sales file (S.NO / STOCK ITEMS / TOTAL format) to see analytics here</p>
          </div>
        ) : (
          <>
            {/* KPI row — quantity based, no rupees */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }} className="stagger">
              <KpiCard label="Total Units Sold" value={fmtNum(mbStats.totalSales)} sub="Across all months imported"
                icon={Package} color="var(--gold)" delay={0} />
              <KpiCard label="Total Line Items" value={fmtNum(mbStats.totalOrders)} sub="Product-month combinations"
                icon={BarChart2} color="#8B5CF6" delay={60} />
              <KpiCard label="This Month Units" value={fmtNum(mbStats.thisMonthSales)}
                icon={Calendar} color="var(--info)"
                trend={mbMomChange >= 0 ? 'up' : 'down'}
                trendVal={`${Math.abs(mbMomChange).toFixed(1)}% vs last`} delay={120} />
              <KpiCard label="Categories Tracked" value={fmtNum(mbCategories.length)}
                sub="Product groups" icon={Layers} color="var(--success)" delay={180} />
            </div>

            {/* Volume trend + Category breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
              <Card>
                <SectionHeader title="Units Sold Per Month" subtitle="Quantity trend across imported monthly files" badge="Volume" badgeVariant="gold" />
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={mbMonthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="mb-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip
                      contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}
                      formatter={(v, n) => [fmtNum(v), n]}
                    />
                    <Area type="monotone" dataKey="sales" name="Units Sold" stroke="var(--gold)" strokeWidth={2} fill="url(#mb-grad)" />
                    <Line type="monotone" dataKey="orders" name="Line Items" stroke="#8B5CF6" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionHeader title="Category Share" subtitle="Units sold by category" />
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={mbCategories} dataKey="total_sales" nameKey="category"
                      cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2}>
                      {mbCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [fmtNum(v), 'Units']}
                      contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                  {mbCategories.slice(0, 4).map((cat, i) => (
                    <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.category}</span>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{fmtNum(cat.total_sales)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Top products by quantity + Monthly bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Card>
                <SectionHeader title="Top Products by Units Sold" badge="By Qty" badgeVariant="gold" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {mbTopProducts.slice(0, 6).map((p, i) => (
                    <div key={p.product_name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>#{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{p.product_name}</span>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>{fmtNum(p.total_qty)} units</span>
                        </div>
                        <ProgressBar value={p.total_qty} max={mbMaxQty} color="gold" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionHeader title="Monthly Orders Count" badge="Count" badgeVariant="info" />
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={mbMonthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} interval={1} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                    />
                    <Bar dataKey="orders" name="Line Items" radius={[4, 4, 0, 0]}>
                      {mbMonthly.map((_, i) => (
                        <Cell key={i} fill={i === mbMonthly.length - 1 ? 'var(--gold)' : '#8B5CF6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}