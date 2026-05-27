import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  ComposedChart, Cell, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import {
  BarChart2, Activity, Target, AlertTriangle, Globe2, Users,
  TrendingUp, Package, Layers
} from 'lucide-react';
import { Card, Badge, PageHeader, ChartTooltip } from '../../components/ui/index';

const COLORS = ['#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#EC4899', '#06B6D4'];
const fmtCur = v => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${Number(v || 0).toFixed(0)}`;
const fmtFull = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNum = v => Number(v || 0).toLocaleString('en-IN');
const selSt = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', fontFamily: 'inherit' };

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION ANALYTICS TABS
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
  const growingUp = data.length > 1 && data[data.length - 1]?.value > data[0]?.value;

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
        <Badge variant="accent">{data.length} data points</Badge>
      </div>
      <Card>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Time Series with 7-Period Moving Average</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Smoothed trend line removes noise to reveal underlying direction</p>
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
              <Area type="monotone" dataKey="value" name="Actual" stroke="var(--accent)" strokeWidth={1.5} fill="url(#tsG)" />
              <Line type="monotone" dataKey="movingAvg" name="7-Period MA" stroke="var(--gold)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Peak Period', value: peak.period, sub: 'Highest value', color: 'var(--accent)' },
          { label: 'Average', value: fmtCur(avg), sub: 'Mean per period', color: 'var(--gold)' },
          { label: 'Trend', value: growingUp ? '↑ Growing' : '↓ Declining', sub: 'Overall direction', color: growingUp ? 'var(--success)' : 'var(--danger)' },
        ].map(s => (
          <Card key={s.label}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
          </Card>
        ))}
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
                  label={{ value: 'Today', fill: 'var(--gold)', fontSize: 10 }} />
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
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>About Z-Score Detection</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Days where sales deviate more than 2 standard deviations from the mean are flagged. Spikes may indicate festivals or bulk orders. Drops may indicate closures or disruptions.
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
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Performance Radar</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={data.slice(0, 6).map(d => ({ category: d.category?.substring(0, 10), revenue: d.total_sales, profit: d.total_profit }))}>
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
                {['Category', 'Txns', 'Revenue', 'Profit', 'Margin'].map(h =>
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
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
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
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
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
              <div key={label} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
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
              <Tooltip formatter={fmtCur} contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
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
// MONTHLY SALES ANALYTICS TABS
// ─────────────────────────────────────────────────────────────────────────────

function VolumeTrendTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getTimeSeries({ granularity: 'monthly', metric: 'orders', months: 24, salesType: 'sales_by_month' })
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, []);

  const peak = data.reduce((mx, d) => d.value > mx.value ? d : mx, { value: 0, period: '—' });
  const avg = data.length ? data.reduce((s, d) => s + d.value, 0) / data.length : 0;
  const growingUp = data.length > 1 && data[data.length - 1]?.value > data[0]?.value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Total Units Sold per Month + 7-Period Moving Average</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quantity trend across all imported monthly sales files</p>
        </div>
        {loading ? <div className="skeleton" style={{ height: 260, borderRadius: 10 }} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="period" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} formatter={(v, n) => [fmtNum(v), n]} />
              <Area type="monotone" dataKey="value" name="Units Sold" stroke="var(--gold)" strokeWidth={2} fill="url(#volGrad)" />
              <Line type="monotone" dataKey="movingAvg" name="7-Period MA" stroke="#8B5CF6" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Peak Month', value: peak.period, sub: 'Highest units sold', color: 'var(--gold)' },
          { label: 'Monthly Average', value: fmtNum(Math.round(avg)), sub: 'Mean units per month', color: '#8B5CF6' },
          { label: 'Volume Trend', value: growingUp ? '↑ Growing' : '↓ Declining', sub: 'Direction', color: growingUp ? 'var(--success)' : 'var(--danger)' },
        ].map(s => (
          <Card key={s.label}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProductVolumeTrendsTab() {
  const [data, setData] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      window.electron.db.getTopProducts({ limit: 30, salesType: 'sales_by_month' }),
      window.electron.db.getMonthlySales({ months: 12, salesType: 'sales_by_month' }),
    ]).then(([top, mo]) => {
      setData(Array.isArray(top) ? top : []);
      setMonthly(Array.isArray(mo) ? mo : []);
      if (top?.length) setSelected(top[0].product_name);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, []);

  const filtered = data.filter(p => !search || p.product_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Products by Units Sold</h3>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product..."
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 7, padding: '5px 9px', fontSize: 11, width: '100%', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 320 }}>
            {loading ? Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: 12 }} />
              </div>
            )) : filtered.map((p, i) => (
              <div key={p.product_name}
                onClick={() => setSelected(p.product_name)}
                style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected === p.product_name ? 'var(--accent-bg)' : '', borderLeft: selected === p.product_name ? '3px solid var(--accent)' : '3px solid transparent', transition: 'all .1s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: selected === p.product_name ? 700 : 500, color: selected === p.product_name ? 'var(--accent)' : 'var(--text-primary)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold)' }}>{fmtNum(p.total_qty)}</span>
                </div>
                {p.category && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.category}</span>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {selected || 'Select a product'}
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Units sold per month</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} formatter={(v, n) => [fmtNum(v), n]} />
              <Bar dataKey="orders" name="Line items" radius={[4, 4, 0, 0]}>
                {monthly.map((_, i) => <Cell key={i} fill={i === monthly.length - 1 ? 'var(--gold)' : '#8B5CF6'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
            ⓘ Chart shows overall monthly line items. Product-level monthly breakdown requires per-product time series query.
          </p>
        </Card>
      </div>
    </div>
  );
}

function CategoryVolumeMixTab() {
  const [data, setData] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      window.electron.db.getCategoryAnalysis({ salesType: 'sales_by_month' }),
      window.electron.db.getMonthlySales({ months: 12, salesType: 'sales_by_month' }),
    ]).then(([cat, mo]) => {
      setData(Array.isArray(cat) ? cat : []);
      setMonthly(Array.isArray(mo) ? mo : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Units Sold by Category</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} width={95} />
                <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} formatter={(v, n) => [fmtNum(v), n]} />
                <Bar dataKey="total_qty" name="Units Sold" radius={[0, 4, 4, 0]}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Category Distribution</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 10 }} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data} dataKey="total_qty" nameKey="category" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [fmtNum(v), n]} contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {data.slice(0, 4).map((d, i) => (
              <div key={d.category} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.category}</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{fmtNum(d.total_qty)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      {!loading && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Full Category Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Category', 'Line Items', 'Total Units', 'Share %'].map(h =>
                  <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totalUnits = data.reduce((s, d) => s + (d.total_qty || 0), 0);
                return data.map((d, i) => (
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
                      <Badge variant="gold" size="xs">{totalUnits > 0 ? ((d.total_qty / totalUnits) * 100).toFixed(1) : 0}%</Badge>
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

function TopMoversTab() {
  const [data, setData] = useState([]);
  const [prev, setPrev] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      window.electron.db.getMonthlySales({ months: 1, salesType: 'sales_by_month' }),
      window.electron.db.getMonthlySales({ months: 2, salesType: 'sales_by_month' }),
      window.electron.db.getTopProducts({ limit: 50, salesType: 'sales_by_month' }),
    ]).then(([curr, prevMo, top]) => {
      setData(Array.isArray(top) ? top : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Sort top products by qty for gainers/losers
  const sorted = [...data].sort((a, b) => (b.total_qty || 0) - (a.total_qty || 0));
  const topGainers = sorted.slice(0, 8);
  const topLow = [...data].sort((a, b) => (a.total_qty || 0) - (b.total_qty || 0)).slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '10px 14px', fontSize: 12 }}>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>ⓘ </span>
        <span style={{ color: 'var(--text-secondary)' }}>Top movers ranked by total units sold across all imported months. Import multiple months to see trends.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={15} style={{ color: 'var(--success)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Top Volume Products</h3>
            <Badge variant="success" size="xs">High qty</Badge>
          </div>
          {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 10 }} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topGainers.map((p, i) => (
                <div key={p.product_name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{p.product_name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.category}</span>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--success)', flexShrink: 0 }}>{fmtNum(p.total_qty)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={15} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Lowest Volume Products</h3>
            <Badge variant="warning" size="xs">Low qty</Badge>
          </div>
          {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 10 }} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topLow.map((p, i) => (
                <div key={p.product_name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{p.product_name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.category}</span>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--warning)', flexShrink: 0 }}>{fmtNum(p.total_qty)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ANALYTICS PAGE
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
  { id: 'volume-trend', label: 'Volume Trend', icon: Activity },
  { id: 'product-trends', label: 'Product Trends', icon: TrendingUp },
  { id: 'category-mix', label: 'Category Mix', icon: Layers },
  { id: 'top-movers', label: 'Top Movers', icon: Package },
];

export default function AnalyticsPage() {
  const [dataMode, setDataMode] = useState('sales'); // 'sales' | 'sales_by_month'
  const [txTab, setTxTab] = useState('timeseries');
  const [mbTab, setMbTab] = useState('volume-trend');

  const TX_CONTENT = {
    timeseries: <TimeSeriesTab />,
    forecast: <ForecastTab />,
    anomaly: <AnomalyTab />,
    category: <CategoryRevenueTab />,
    region: <RegionTab />,
    customers: <CustomerAnalyticsTab />,
  };

  const MB_CONTENT = {
    'volume-trend': <VolumeTrendTab />,
    'product-trends': <ProductVolumeTrendsTab />,
    'category-mix': <CategoryVolumeMixTab />,
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
            { id: 'sales', label: 'Sales Transactions', color: 'var(--accent)' },
            { id: 'sales_by_month', label: 'Monthly Sales Data', color: 'var(--gold)' },
          ].map(({ id, label, color }) => (
            <button key={id} onClick={() => setDataMode(id)} style={{
              padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 600, transition: 'all .15s',
              background: dataMode === id ? color + '18' : 'transparent',
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