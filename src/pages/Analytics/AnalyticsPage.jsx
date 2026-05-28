import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  ComposedChart, Cell, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend, ScatterChart, Scatter,
} from 'recharts';
import {
  BarChart2, Activity, Target, AlertTriangle, Globe2, Users,
  TrendingUp, Package, Layers, TrendingDown, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Card, Badge, PageHeader, ChartTooltip } from '../../components/ui/index';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = ['#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#EC4899', '#06B6D4', '#F97316', '#84CC16'];
const fmtCur = v => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${Number(v || 0).toFixed(0)}`;
const fmtFull = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNum = v => Number(v || 0).toLocaleString('en-IN');
const selSt = {
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', borderRadius: 8, padding: '6px 10px',
  fontSize: 12, outline: 'none', fontFamily: 'inherit',
};

function StatCard({ label, value, sub, color = 'var(--accent)', change }) {
  const isPos = change > 0;
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color, marginBottom: 4 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {change != null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: isPos ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 2 }}>
            {isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(change).toFixed(1)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</span>}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

function TimeSeriesTab() {
  const [data, setData] = useState([]);
  const [granularity, setGranularity] = useState('monthly');
  const [metric, setMetric] = useState('sales');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.electron.db.getTimeSeries({ granularity, metric, months: 24, salesType: 'sales' })
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [granularity, metric]);

  const peak = data.reduce((mx, d) => d.value > mx.value ? d : mx, { value: 0, period: '—' });
  const avg = data.length ? data.reduce((s, d) => s + d.value, 0) / data.length : 0;
  const first = data[0]?.value || 0;
  const last = data[data.length - 1]?.value || 0;
  const growingUp = last > first;
  const overallChange = first > 0 ? ((last - first) / first) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={granularity} onChange={e => setGranularity(e.target.value)} style={selSt}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <select value={metric} onChange={e => setMetric(e.target.value)} style={selSt}>
          <option value="sales">Revenue</option>
          <option value="profit">Profit</option>
          <option value="orders">Orders</option>
        </select>
        <Badge variant="accent">{data.length} periods</Badge>
      </div>

      <Card>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Revenue Time Series — 7-Period Moving Average</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Smoothed trend line removes noise to show underlying direction</p>
        </div>
        {loading ? <div className="skeleton" style={{ height: 260, borderRadius: 10 }} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="tsG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="period" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtCur} width={55} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" name="Actual" stroke="var(--accent)" strokeWidth={2} fill="url(#tsG)" />
              <Line type="monotone" dataKey="movingAvg" name="7-Period MA" stroke="var(--gold)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard label="Peak Period" value={peak.period} sub="Highest value" color="var(--accent)" />
        <StatCard label="Period Average" value={fmtCur(avg)} sub="Mean per period" color="var(--gold)" />
        <StatCard label="Overall Trend" value={growingUp ? '↑ Growing' : '↓ Declining'} sub="First → Last period" color={growingUp ? 'var(--success)' : 'var(--danger)'} change={overallChange} />
      </div>
    </div>
  );
}

function ForecastTab() {
  const [data, setData] = useState({ historical: [], forecast: [], r2: 0 });
  const [periods, setPeriods] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.electron.db.getForecasts({ periods, salesType: 'sales' })
      .then(d => {
        setData({
          historical: Array.isArray(d?.historical) ? d.historical : [],
          forecast: Array.isArray(d?.forecast) ? d.forecast : [],
          r2: typeof d?.r2 === 'number' ? d.r2 : 0,
        });
        setLoading(false);
      })
      .catch(() => { setData({ historical: [], forecast: [], r2: 0 }); setLoading(false); });
  }, [periods]);

  const combined = [
    ...data.historical.map(d => ({ ...d, type: 'historical' })),
    ...data.forecast.map(d => ({ ...d, sales: d.predicted, type: 'forecast' })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={periods} onChange={e => setPeriods(+e.target.value)} style={selSt}>
          {[3, 6, 9, 12].map(v => <option key={v} value={v}>{v} months ahead</option>)}
        </select>
        <Badge variant={data.r2 > 0.7 ? 'success' : data.r2 > 0.4 ? 'warning' : 'danger'}>
          R² = {data.r2} — {data.r2 > 0.7 ? 'Strong' : data.r2 > 0.4 ? 'Moderate' : 'Weak'} fit
        </Badge>
      </div>
      <Card>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Revenue Forecast — Linear Regression</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Historical trend extrapolated with ±15% confidence band</p>
        </div>
        {loading ? <div className="skeleton" style={{ height: 260, borderRadius: 10 }} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={combined} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="ciG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--info)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--info)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtCur} width={55} />
              <Tooltip content={<ChartTooltip />} />
              {data.historical.length > 0 && (
                <ReferenceLine x={data.historical[data.historical.length - 1]?.month}
                  stroke="var(--gold)" strokeDasharray="4 4"
                  label={{ value: 'Now', fill: 'var(--gold)', fontSize: 10 }} />
              )}
              <Area type="monotone" dataKey="upper" name="Upper CI" stroke="none" fill="url(#ciG)" />
              <Line type="monotone" dataKey="sales" name="Historical" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="predicted" name="Forecast" stroke="var(--info)" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: 'var(--info)', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>
      {data.forecast.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Forecast Table</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Month', 'Forecast', 'Lower', 'Upper', 'Range'].map(h =>
                    <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.forecast.map(f => (
                  <tr key={f.month} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.month}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{fmtFull(f.predicted)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{fmtFull(f.lower)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{fmtFull(f.upper)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--gold)' }}>{fmtFull(f.upper - f.lower)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AnomalyTab() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getAnomalies({ salesType: 'sales' })
      .then(d => { setAnomalies(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setAnomalies([]); setLoading(false); });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Badge variant={anomalies.length > 5 ? 'danger' : 'warning'}>{anomalies.length} anomalies detected</Badge>
        <Badge variant="info">Z-score threshold: |z| &gt; 2.0</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>How Z-Score Detection Works</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Days where sales deviate more than 2 standard deviations from the mean are flagged.
            Positive spikes may indicate festivals or bulk orders. Drops may indicate closures or disruptions.
          </p>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { color: 'var(--danger)', text: 'Z > +2.0 → Unusually high sales day' },
              { color: 'var(--info)', text: 'Z < −2.0 → Unusually low sales day' },
            ].map(({ color, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Summary</h3>
          {loading ? <div className="skeleton" style={{ height: 60 }} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'High outliers (z > 2)', value: anomalies.filter(a => a.zScore > 0).length, color: 'var(--danger)' },
                { label: 'Low outliers (z < −2)', value: anomalies.filter(a => a.zScore < 0).length, color: 'var(--info)' },
                { label: 'Max |z-score|', value: Math.max(...anomalies.map(a => Math.abs(a.zScore)), 0).toFixed(2), color: 'var(--gold)' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      {!loading && anomalies.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Detected Anomalies</h3>
          <div style={{ overflowY: 'auto', maxHeight: 300 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Sales', 'Orders', 'Z-Score', 'Type'].map(h =>
                    <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {anomalies.map(a => (
                  <tr key={a.day} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '7px 12px', color: 'var(--text-primary)' }}>{a.day}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{fmtFull(a.sales)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{a.orders}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 700, color: a.zScore > 0 ? 'var(--danger)' : 'var(--info)' }}>{a.zScore.toFixed(2)}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <Badge variant={a.zScore > 0 ? 'danger' : 'info'} size="xs">{a.zScore > 0 ? 'High' : 'Low'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function CategoryRevenueTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getCategoryAnalysis({ salesType: 'sales' })
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Revenue by Category</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtCur} />
                <YAxis type="category" dataKey="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} width={95} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total_sales" name="Revenue" radius={[0, 4, 4, 0]}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Revenue vs Profit Radar</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={data.slice(0, 6).map(d => ({ category: d.category?.substring(0, 12), revenue: d.total_sales, profit: d.total_profit }))}>
                <PolarGrid stroke="var(--chart-grid)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                <Radar name="Revenue" dataKey="revenue" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} />
                <Radar name="Profit" dataKey="profit" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15} />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      {!loading && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Category Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Category', 'Txns', 'Revenue', 'Profit', 'Margin %'].map(h =>
                  <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={d.category} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.category}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{fmtNum(d.transactions)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{fmtFull(d.total_sales)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--success)' }}>{fmtFull(d.total_profit)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant={d.margin_pct > 30 ? 'success' : d.margin_pct > 20 ? 'warning' : 'danger'} size="xs">{d.margin_pct}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function RegionTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getRegionAnalysis({ salesType: 'sales' })
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Revenue by Region</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="region" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtCur} width={55} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total_sales" name="Sales" radius={[4, 4, 0, 0]}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Customers vs Revenue</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>No region data — tag transactions with regions to see this chart</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="customers" type="number" name="Customers" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="total_sales" type="number" name="Sales" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtCur} width={55} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltip />} />
                <Scatter data={data} fill="var(--accent)" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      {!loading && data.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {data.map((r, i) => (
            <Card key={r.region} style={{ textAlign: 'center', padding: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, background: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length] }}>{r.region?.[0]}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{r.region}</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>{fmtCur(r.total_sales)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.customers} customers</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerAnalyticsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getCustomerAnalytics({ salesType: 'sales' })
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, []);

  const top = data.slice(0, 10);
  const wholesale = data.filter(c => c.customer_type === 'Wholesale').reduce((s, c) => s + c.total_spent, 0);
  const retail = data.filter(c => c.customer_type === 'Retail').reduce((s, c) => s + c.total_spent, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Top 10 Customers by Revenue</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : top.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>No customer data — import transaction sales to see this</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtCur} />
                <YAxis type="category" dataKey="customer_name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} tickLine={false} axisLine={false} width={105} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total_spent" name="Revenue" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Wholesale vs Retail</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[{ label: 'Wholesale', value: fmtCur(wholesale), color: 'var(--accent)' }, { label: 'Retail', value: fmtCur(retail), color: 'var(--gold)' }].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color, marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={[{ name: 'Wholesale', value: wholesale }, { name: 'Retail', value: retail }]} dataKey="value" cx="50%" cy="50%" outerRadius={50} paddingAngle={3}>
                <Cell fill="var(--accent)" /><Cell fill="var(--gold)" />
              </Pie>
              <Tooltip formatter={v => fmtFull(v)} contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {!loading && data.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Customer Table</h3>
          <div style={{ overflowY: 'auto', maxHeight: 300 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Customer', 'Type', 'Orders', 'Total Spent', 'Avg Order', 'Last Purchase'].map(h =>
                    <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 30).map(c => (
                  <tr key={c.customer_name} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.customer_name}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <Badge variant={c.customer_type === 'Wholesale' ? 'accent' : 'gold'} size="xs">{c.customer_type}</Badge>
                    </td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{c.purchase_count}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{fmtFull(c.total_spent)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{fmtFull(c.avg_order)}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{c.last_purchase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY SALES ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/** Helper: parse "YYYY-MM-01" → "Month YYYY" without UTC shift */
function formatMonthLabel(dateStr) {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('-');
  if (parts.length < 2) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  if (isNaN(year) || isNaN(month)) return dateStr;
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Month-over-Month comparison — main overview tab */
function MoMComparisonTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getMonthOverMonth({ salesType: 'sales_by_month', months: 12 })
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, []);

  const totalUnits = data.reduce((s, d) => s + (d.value || 0), 0);
  const avgUnits = data.length ? Math.round(totalUnits / data.length) : 0;
  const bestMonth = data.reduce((mx, d) => d.value > (mx.value || 0) ? d : mx, {});
  const lastTwo = data.slice(-2);
  const latestChange = lastTwo.length === 2 ? lastTwo[1].change : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Total Units (period)" value={fmtNum(totalUnits)} sub="All months combined" color="var(--gold)" />
        <StatCard label="Monthly Average" value={fmtNum(avgUnits)} sub="Mean units per month" color="#8B5CF6" />
        <StatCard label="Best Month" value={bestMonth.label || '—'} sub={bestMonth.value ? `${fmtNum(bestMonth.value)} units` : ''} color="var(--success)" />
        <StatCard label="Latest MoM Change" value={latestChange != null ? `${latestChange > 0 ? '+' : ''}${latestChange.toFixed(1)}%` : '—'} sub="vs prior month" color={latestChange > 0 ? 'var(--success)' : 'var(--danger)'} change={latestChange} />
      </div>

      {/* MoM bar chart */}
      <Card>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Units Sold — Month-over-Month</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>TOTAL column from each monthly sheet = units sold that month</p>
        </div>
        {loading ? <div className="skeleton" style={{ height: 260, borderRadius: 10 }} /> : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
            No monthly data yet — import a Sales by Month file to see this
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="momGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={45} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={50} tickFormatter={v => fmtNum(v)} />
              <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} formatter={(v, n) => [fmtNum(v), n]} />
              <Bar dataKey="value" name="Units Sold" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {data.map((d, i) => <Cell key={i} fill={d.change != null && d.change < 0 ? 'var(--danger)' : 'var(--gold)'} />)}
              </Bar>
              <Line type="monotone" dataKey="value" name="Trend" stroke="#8B5CF6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* MoM table */}
      {!loading && data.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Month-over-Month Detail</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Month', 'Units Sold', 'Prior Month', 'Change', 'Products'].map(h =>
                  <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map(d => (
                <tr key={d.month} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>{d.label}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--gold)', fontWeight: 700 }}>{fmtNum(d.value)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{d.prevValue != null ? fmtNum(d.prevValue) : '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {d.change != null
                      ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: d.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {d.change >= 0 ? '+' : ''}{d.change.toFixed(1)}%
                        </span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{d.products}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/** Per-product volume time series */
function ProductTimeTrendTab() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState('');
  const [productData, setProductData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    window.electron.db.getTopProducts({ limit: 60, salesType: 'sales_by_month' })
      .then(d => {
        const arr = Array.isArray(d) ? d : [];
        setProducts(arr);
        if (arr.length) setSelected(arr[0].product_name);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setChartLoading(true);
    window.electron.db.getProductMonthlySales({ productName: selected, months: 12, salesType: 'sales_by_month' })
      .then(d => { setProductData(Array.isArray(d) ? d : []); setChartLoading(false); })
      .catch(() => { setProductData([]); setChartLoading(false); });
  }, [selected]);

  const filtered = products.filter(p => !search || p.product_name.toLowerCase().includes(search.toLowerCase()));
  const maxQty = Math.max(...productData.map(d => d.qty), 0);
  const minQty = Math.min(...productData.map(d => d.qty), Infinity);
  const totalQty = productData.reduce((s, d) => s + (d.qty || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 14 }}>
        {/* Product list */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Products by Total Units</h3>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 7, padding: '5px 9px', fontSize: 11, width: '100%', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 400 }}>
            {loading ? Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: 12 }} />
              </div>
            )) : filtered.map(p => (
              <div key={p.product_name} onClick={() => setSelected(p.product_name)}
                style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'all .1s',
                  background: selected === p.product_name ? 'var(--accent-bg)' : '',
                  borderLeft: selected === p.product_name ? '3px solid var(--accent)' : '3px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: selected === p.product_name ? 700 : 500,
                    color: selected === p.product_name ? 'var(--accent)' : 'var(--text-primary)',
                    maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.product_name}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold)' }}>{fmtNum(p.total_qty)}</span>
                </div>
                {p.category && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.category}</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* Chart for selected product */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
              {selected || 'Select a product'}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Units sold per month (from your imported monthly sheets)</p>
            {chartLoading ? <div className="skeleton" style={{ height: 200, borderRadius: 10 }} /> :
              productData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>No monthly data for this product</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={productData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                    <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} formatter={(v, n) => [fmtNum(v), n]} />
                    <Bar dataKey="qty" name="Units Sold" radius={[4, 4, 0, 0]}>
                      {productData.map((d, i) => <Cell key={i} fill={i === productData.length - 1 ? 'var(--gold)' : '#8B5CF6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
          </Card>
          {productData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <StatCard label="Total Units" value={fmtNum(totalQty)} sub="All months" color="var(--gold)" />
              <StatCard label="Peak Month" value={fmtNum(maxQty)} sub="Best month" color="var(--success)" />
              <StatCard label="Lowest Month" value={fmtNum(minQty === Infinity ? 0 : minQty)} sub="Slowest month" color="var(--warning)" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Category breakdown by month (stacked view) */
function CategoryMonthlyTab() {
  const [catData, setCatData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      window.electron.db.getCategoryAnalysis({ salesType: 'sales_by_month' }),
      window.electron.db.getCategoryMonthly({ salesType: 'sales_by_month', months }),
    ]).then(([cat, monthly]) => {
      setCatData(Array.isArray(cat) ? cat : []);

      // Pivot monthly into { month, label, CAT1: qty, CAT2: qty, ... }
      const pivotMap = {};
      const labelMap = {};
      if (Array.isArray(monthly)) {
        monthly.forEach(row => {
          if (!pivotMap[row.month]) { pivotMap[row.month] = { month: row.month }; labelMap[row.month] = row.label; }
          pivotMap[row.month][row.category] = row.value;
          pivotMap[row.month].label = row.label;
        });
      }
      setMonthData(Object.values(pivotMap).sort((a, b) => a.month.localeCompare(b.month)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [months]);

  useEffect(() => { load(); }, [load]);

  const topCats = catData.slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <select value={months} onChange={e => setMonths(+e.target.value)} style={selSt}>
          {[3, 6, 9, 12].map(v => <option key={v} value={v}>Last {v} months</option>)}
        </select>
      </div>

      {/* Stacked bar by month */}
      <Card>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Category Mix by Month — Stacked Units</h3>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>How the unit volume of each category changes month to month</p>
        {loading ? <div className="skeleton" style={{ height: 260, borderRadius: 10 }} /> : monthData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No monthly data — import Sales by Month files</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={50} tickFormatter={v => fmtNum(v)} />
              <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} formatter={(v, n) => [fmtNum(v), n]} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{v}</span>} />
              {topCats.map((cat, i) => (
                <Bar key={cat.category} dataKey={cat.category} stackId="a" name={cat.category} fill={COLORS[i % COLORS.length]} radius={i === topCats.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Category summary table */}
      {!loading && catData.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Category Summary — All-Time Units</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Category', 'Line Items', 'Total Units', 'Share %'].map(h =>
                  <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totalUnits = catData.reduce((s, d) => s + (d.total_qty || 0), 0);
                return catData.map((d, i) => (
                  <tr key={d.category} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.category}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{fmtNum(d.transactions)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--gold)', fontWeight: 700 }}>{fmtNum(d.total_qty)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 6, borderRadius: 3, background: COLORS[i % COLORS.length], width: `${totalUnits > 0 ? (d.total_qty / totalUnits) * 120 : 0}px`, flexShrink: 0 }} />
                        <Badge variant="gold" size="xs">{totalUnits > 0 ? ((d.total_qty / totalUnits) * 100).toFixed(1) : 0}%</Badge>
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/** Top / bottom movers by cumulative units */
function TopMoversTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getTopProducts({ limit: 60, salesType: 'sales_by_month' })
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...data].sort((a, b) => (b.total_qty || 0) - (a.total_qty || 0));
  const topGainers = sorted.slice(0, 10);
  const topLow = sorted.slice(-10).reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '10px 14px', fontSize: 12 }}>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>ⓘ </span>
        <span style={{ color: 'var(--text-secondary)' }}>Ranked by total units sold across all imported months. Low-volume items may need restocking review or may be discontinued.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Top chart */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={15} style={{ color: 'var(--success)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Top 10 by Units Sold</h3>
            <Badge variant="success" size="xs">High volume</Badge>
          </div>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topGainers} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 120 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmtNum(v)} />
                <YAxis type="category" dataKey="product_name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} tickLine={false} axisLine={false} width={115} />
                <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} formatter={(v, n) => [fmtNum(v), n]} />
                <Bar dataKey="total_qty" name="Units" fill="var(--success)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Bottom chart */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingDown size={15} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Bottom 10 by Units Sold</h3>
            <Badge variant="warning" size="xs">Low volume</Badge>
          </div>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topLow} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 120 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmtNum(v)} />
                <YAxis type="category" dataKey="product_name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} tickLine={false} axisLine={false} width={115} />
                <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} formatter={(v, n) => [fmtNum(v), n]} />
                <Bar dataKey="total_qty" name="Units" fill="var(--warning)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Full ranked table */}
      {!loading && sorted.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>All Products Ranked by Units Sold</h3>
          <div style={{ overflowY: 'auto', maxHeight: 340 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Product', 'Category', 'Total Units', 'Months Seen'].map(h =>
                    <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr key={p.product_name} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 11 }}>#{i + 1}</td>
                    <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</td>
                    <td style={{ padding: '7px 12px' }}>
                      {p.category ? <Badge variant="gold" size="xs">{p.category}</Badge> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold)' }}>{fmtNum(p.total_qty)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.months_appeared || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TX_TABS = [
  { id: 'timeseries', label: 'Time Series', icon: Activity },
  { id: 'forecast', label: 'Forecast', icon: Target },
  { id: 'anomaly', label: 'Anomalies', icon: AlertTriangle },
  { id: 'category', label: 'Category Revenue', icon: BarChart2 },
  { id: 'region', label: 'Region', icon: Globe2 },
  { id: 'customers', label: 'Customers', icon: Users },
];

const MB_TABS = [
  { id: 'mom', label: 'Month-over-Month', icon: Activity },
  { id: 'product-trend', label: 'Product Trends', icon: TrendingUp },
  { id: 'category-monthly', label: 'Category by Month', icon: Layers },
  { id: 'top-movers', label: 'Top / Low Movers', icon: Package },
];

export default function AnalyticsPage() {
  const [dataMode, setDataMode] = useState('sales');
  const [txTab, setTxTab] = useState('timeseries');
  const [mbTab, setMbTab] = useState('mom');

  const TX_CONTENT = {
    timeseries: <TimeSeriesTab />,
    forecast: <ForecastTab />,
    anomaly: <AnomalyTab />,
    category: <CategoryRevenueTab />,
    region: <RegionTab />,
    customers: <CustomerAnalyticsTab />,
  };

  const MB_CONTENT = {
    mom: <MoMComparisonTab />,
    'product-trend': <ProductTimeTrendTab />,
    'category-monthly': <CategoryMonthlyTab />,
    'top-movers': <TopMoversTab />,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <PageHeader
          title="Analytics"
          subtitle="Advanced statistical analysis & business intelligence"
          icon={BarChart2}
          iconColor="var(--info)"
        />

        {/* Data mode toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {[
            { id: 'sales', label: '📋 Sales Transactions', color: 'var(--accent)' },
            { id: 'sales_by_month', label: '📊 Monthly Sales Data', color: 'var(--gold)' },
          ].map(({ id, label, color }) => (
            <button key={id} onClick={() => setDataMode(id)} style={{
              padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 600, transition: 'all .15s',
              background: dataMode === id ? `${color}18` : 'transparent',
              color: dataMode === id ? color : 'var(--text-secondary)',
              outline: dataMode === id ? `1px solid ${color}40` : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {(dataMode === 'sales' ? TX_TABS : MB_TABS).map(t => {
            const active = dataMode === 'sales' ? txTab === t.id : mbTab === t.id;
            const accentColor = dataMode === 'sales' ? 'var(--accent)' : 'var(--gold)';
            return (
              <button key={t.id}
                onClick={() => dataMode === 'sales' ? setTxTab(t.id) : setMbTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all .15s',
                  borderBottom: `2px solid ${active ? accentColor : 'transparent'}`,
                  color: active ? accentColor : 'var(--text-secondary)',
                }}>
                <t.icon size={13} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }} className="scroll-area">
        <div key={`${dataMode}-${dataMode === 'sales' ? txTab : mbTab}`} className="animate-fade-in">
          {dataMode === 'sales' ? TX_CONTENT[txTab] : MB_CONTENT[mbTab]}
        </div>
      </div>
    </div>
  );
}