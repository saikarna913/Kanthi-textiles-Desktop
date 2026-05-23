import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  ComposedChart, Cell, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import { BarChart2, Activity, Target, AlertTriangle, Globe2, Users } from 'lucide-react';
import { Card, Badge, Select, PageHeader, ChartTooltip } from '../../components/ui/index';
import clsx from 'clsx';

const COLORS = ['#14B8A6','#F59E0B','#3B82F6','#8B5CF6','#EF4444','#10B981','#EC4899'];
const fmtShort = v => v>=100000?`₹${(v/100000).toFixed(1)}L`:v>=1000?`₹${(v/1000).toFixed(0)}k`:`₹${Number(v).toFixed(0)}`;
const fmt = v => `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;

const selSt = { background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-primary)', borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none', fontFamily:'inherit' };

// ── Time Series ────────────────────────────────────────────────────────────────
function TimeSeriesTab() {
  const [data, setData] = useState([]);
  const [granularity, setGranularity] = useState('monthly');
  const [metric, setMetric] = useState('sales');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.electron.db.getTimeSeries({ granularity, metric, months:24 })
      .then(d=>{ setData(d); setLoading(false); });
  }, [granularity, metric]);

  const peak = data.reduce((mx,d)=>d.value>mx.value?d:mx, {value:0,period:'—'});
  const avg = data.length ? data.reduce((s,d)=>s+d.value,0)/data.length : 0;
  const trend = data.length>1 && data[data.length-1]?.value > data[0]?.value ? '↑ Growing' : '↓ Declining';
  const trendColor = data.length>1 && data[data.length-1]?.value > data[0]?.value ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <select value={granularity} onChange={e=>setGranularity(e.target.value)} style={selSt}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <select value={metric} onChange={e=>setMetric(e.target.value)} style={selSt}>
          <option value="sales">Revenue</option>
          <option value="profit">Profit</option>
          <option value="orders">Orders</option>
        </select>
        <Badge variant="accent">{data.length} data points</Badge>
      </div>

      <Card>
        <div style={{marginBottom:12}}>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>Time Series with 7-Period Moving Average</h3>
          <p style={{fontSize:11,color:'var(--text-muted)'}}>Smoothed trend line removes noise to reveal underlying pattern</p>
        </div>
        {loading ? <div className="skeleton" style={{height:260,borderRadius:10}}/> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{top:5,right:10,bottom:0,left:0}}>
              <defs>
                <linearGradient id="tsG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/>
              <XAxis dataKey="period" tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
              <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmtShort} width={55}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Area type="monotone" dataKey="value" name="Actual" stroke="var(--accent)" strokeWidth={1.5} fill="url(#tsG)"/>
              <Line type="monotone" dataKey="movingAvg" name="7-Period MA" stroke="var(--gold)" strokeWidth={2} dot={false} strokeDasharray="5 3"/>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
        {[
          {label:'Peak Period', value:peak.period, sub:'Highest sales period', color:'var(--accent)'},
          {label:'Average', value:fmtShort(avg), sub:'Mean per period', color:'var(--gold)'},
          {label:'Overall Trend', value:trend, sub:'Direction of growth', color:trendColor},
        ].map(s=>(
          <Card key={s.label}>
            <div style={{fontSize:16,fontWeight:700,fontFamily:'monospace',color:s.color,marginBottom:4}}>{s.value}</div>
            <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{s.label}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{s.sub}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Forecast ───────────────────────────────────────────────────────────────────
function ForecastTab() {
  const [data, setData] = useState(null);
  const [periods, setPeriods] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.electron.db.getForecasts({periods}).then(d=>{ setData(d); setLoading(false); });
  }, [periods]);

  const combined = data ? [
    ...data.historical.map(d=>({...d,type:'historical'})),
    ...data.forecast.map(d=>({...d,sales:d.predicted,type:'forecast'})),
  ] : [];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <select value={periods} onChange={e=>setPeriods(+e.target.value)} style={selSt}>
          {[3,6,9,12].map(v=><option key={v} value={v}>{v} months ahead</option>)}
        </select>
        {data && <Badge variant={data.r2>0.7?'success':data.r2>0.4?'warning':'danger'}>R² = {data.r2} — {data.r2>0.7?'Strong':data.r2>0.4?'Moderate':'Weak'} fit</Badge>}
      </div>

      <Card>
        <div style={{marginBottom:12}}>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>Sales Forecast — Linear Regression</h3>
          <p style={{fontSize:11,color:'var(--text-muted)'}}>Historical trend extrapolated with ±15% confidence interval (shaded)</p>
        </div>
        {loading ? <div className="skeleton" style={{height:260,borderRadius:10}}/> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={combined} margin={{top:5,right:10,bottom:0,left:0}}>
              <defs>
                <linearGradient id="ciG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--info)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--info)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/>
              <XAxis dataKey="month" tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
              <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmtShort} width={55}/>
              <Tooltip content={<ChartTooltip/>}/>
              {data?.historical?.length && <ReferenceLine x={data.historical[data.historical.length-1]?.month} stroke="var(--gold)" strokeDasharray="4 4" label={{value:'Today',fill:'var(--gold)',fontSize:10}}/>}
              <Area type="monotone" dataKey="upper" name="Upper CI" stroke="none" fill="url(#ciG)"/>
              <Line type="monotone" dataKey="sales" name="Historical" stroke="var(--accent)" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="predicted" name="Forecast" stroke="var(--info)" strokeWidth={2} strokeDasharray="6 3" dot={{fill:'var(--info)',r:4}}/>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      {data?.forecast?.length > 0 && (
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Forecast Table</h3>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Month','Forecast','Lower Bound','Upper Bound','Range'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 12px',color:'var(--text-muted)',fontWeight:600}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.forecast.map(f=>(
                  <tr key={f.month} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{padding:'8px 12px',color:'var(--text-primary)',fontWeight:600}}>{f.month}</td>
                    <td style={{padding:'8px 12px',fontFamily:'monospace',color:'var(--accent)',fontWeight:700}}>{fmt(f.predicted)}</td>
                    <td style={{padding:'8px 12px',fontFamily:'monospace',color:'var(--text-secondary)'}}>{fmt(f.lower)}</td>
                    <td style={{padding:'8px 12px',fontFamily:'monospace',color:'var(--text-secondary)'}}>{fmt(f.upper)}</td>
                    <td style={{padding:'8px 12px',fontFamily:'monospace',color:'var(--gold)'}}>{fmt(f.upper-f.lower)}</td>
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

// ── Anomaly ────────────────────────────────────────────────────────────────────
function AnomalyTab() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getAnomalies().then(d=>{ setAnomalies(d); setLoading(false); });
  }, []);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <Badge variant={anomalies.length>5?'danger':'warning'}>{anomalies.length} anomalies detected</Badge>
        <Badge variant="info">Z-score threshold: |z| &gt; 2.0</Badge>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:8}}>About Z-Score Detection</h3>
          <p style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.6}}>
            Days where sales deviate more than 2 standard deviations from the mean are flagged. High |z| scores indicate unusual spikes or drops worth investigating.
          </p>
          <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:11}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'var(--danger)',flexShrink:0}}/>
              <span style={{color:'var(--text-secondary)'}}>Z &gt; +2.0 → Unusually high sales (event, festival, bulk order)</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:11}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'var(--info)',flexShrink:0}}/>
              <span style={{color:'var(--text-secondary)'}}>Z &lt; −2.0 → Unusually low sales (holiday, disruption)</span>
            </div>
          </div>
        </Card>
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:10}}>Summary</h3>
          {loading ? <div className="skeleton" style={{height:60}}/> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                {label:'High outliers (z > 2)', value:anomalies.filter(a=>a.zScore>0).length, color:'var(--danger)'},
                {label:'Low outliers (z < −2)', value:anomalies.filter(a=>a.zScore<0).length, color:'var(--info)'},
                {label:'Max |z-score|', value:Math.max(...anomalies.map(a=>Math.abs(a.zScore)),0).toFixed(2), color:'var(--gold)'},
              ].map(s=>(
                <div key={s.label} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-secondary)'}}>{s.label}</span>
                  <span style={{fontFamily:'monospace',fontWeight:700,color:s.color}}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {!loading && anomalies.length > 0 && (
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Detected Anomalies</h3>
          <div style={{overflowY:'auto',maxHeight:320}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead style={{position:'sticky',top:0,background:'var(--bg-card)'}}>
                <tr style={{borderBottom:'1px solid var(--border)'}}>
                  {['Date','Sales','Orders','Z-Score','Type'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 12px',color:'var(--text-muted)',fontWeight:600}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {anomalies.map(a=>(
                  <tr key={a.day} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{padding:'8px 12px',color:'var(--text-primary)'}}>{a.day}</td>
                    <td style={{padding:'8px 12px',fontFamily:'monospace',color:'var(--text-primary)',fontWeight:600}}>{fmt(a.sales)}</td>
                    <td style={{padding:'8px 12px',fontFamily:'monospace',color:'var(--text-secondary)'}}>{a.orders}</td>
                    <td style={{padding:'8px 12px',fontFamily:'monospace',fontWeight:700,color:a.zScore>0?'var(--danger)':'var(--info)'}}>{a.zScore.toFixed(2)}</td>
                    <td style={{padding:'8px 12px'}}><Badge variant={a.zScore>0?'danger':'info'} size="xs">{a.zScore>0?'High Spike':'Low Drop'}</Badge></td>
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

// ── Category ───────────────────────────────────────────────────────────────────
function CategoryTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getCategoryAnalysis().then(d=>{ setData(d); setLoading(false); });
  }, []);

  const radarData = data.slice(0,6).map(d=>({
    category: d.category?.substring(0,10),
    revenue: d.total_sales,
    profit: d.total_profit,
    volume: d.total_qty,
  }));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Revenue by Category</h3>
          {loading?<div className="skeleton" style={{height:220,borderRadius:10}}/> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} layout="vertical" margin={{top:0,right:10,bottom:0,left:100}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false}/>
                <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmtShort}/>
                <YAxis type="category" dataKey="category" tick={{fill:'var(--text-secondary)',fontSize:10}} tickLine={false} axisLine={false} width={95}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="total_sales" name="Revenue" radius={[0,4,4,0]}>
                  {data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Performance Radar</h3>
          {loading?<div className="skeleton" style={{height:220,borderRadius:10}}/> : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--chart-grid)"/>
                <PolarAngleAxis dataKey="category" tick={{fill:'var(--text-muted)',fontSize:10}}/>
                <PolarRadiusAxis tick={{fill:'var(--text-muted)',fontSize:9}}/>
                <Radar name="Revenue" dataKey="revenue" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2}/>
                <Radar name="Profit" dataKey="profit" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15}/>
                <Tooltip content={<ChartTooltip/>}/>
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      {!loading && (
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Category Breakdown</h3>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
              {['Category','Transactions','Revenue','Profit','Margin %'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 12px',color:'var(--text-muted)',fontWeight:600}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {data.map((d,i)=>(
                <tr key={d.category} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'8px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:COLORS[i%COLORS.length],flexShrink:0}}/>
                      <span style={{fontWeight:600,color:'var(--text-primary)'}}>{d.category}</span>
                    </div>
                  </td>
                  <td style={{padding:'8px 12px',fontFamily:'monospace',color:'var(--text-secondary)'}}>{d.transactions?.toLocaleString()}</td>
                  <td style={{padding:'8px 12px',fontFamily:'monospace',color:'var(--accent)',fontWeight:700}}>{fmt(d.total_sales)}</td>
                  <td style={{padding:'8px 12px',fontFamily:'monospace',color:'var(--success)'}}>{fmt(d.total_profit)}</td>
                  <td style={{padding:'8px 12px'}}><Badge variant={d.margin_pct>30?'success':d.margin_pct>20?'warning':'danger'} size="xs">{d.margin_pct}%</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── Region ─────────────────────────────────────────────────────────────────────
function RegionTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getRegionAnalysis().then(d=>{ setData(d); setLoading(false); });
  }, []);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Revenue by Region</h3>
          {loading?<div className="skeleton" style={{height:220,borderRadius:10}}/> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{top:5,right:10,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/>
                <XAxis dataKey="region" tick={{fill:'var(--text-secondary)',fontSize:11}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmtShort} width={55}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="total_sales" name="Sales" radius={[4,4,0,0]}>
                  {data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Customers vs Revenue</h3>
          {loading?<div className="skeleton" style={{height:220,borderRadius:10}}/> : (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{top:5,right:10,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/>
                <XAxis dataKey="customers" name="Customers" type="number" tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} label={{value:'Customers',fill:'var(--text-muted)',fontSize:10,position:'insideBottom',offset:-5}}/>
                <YAxis dataKey="total_sales" name="Sales" type="number" tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmtShort} width={55}/>
                <Tooltip cursor={{strokeDasharray:'3 3'}} content={<ChartTooltip/>}/>
                <Scatter data={data} fill="var(--accent)"/>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {!loading && data.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
          {data.map((r,i)=>(
            <Card key={r.region} style={{textAlign:'center',padding:16}}>
              <div style={{width:40,height:40,borderRadius:'50%',margin:'0 auto 10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,background:`${COLORS[i%COLORS.length]}20`,color:COLORS[i%COLORS.length]}}>
                {r.region?.[0]}
              </div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:4}}>{r.region}</div>
              <div style={{fontSize:13,fontFamily:'monospace',fontWeight:700,color:'var(--accent)',marginBottom:2}}>{fmtShort(r.total_sales)}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.customers} customers</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.transactions} orders</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Customer Analytics ─────────────────────────────────────────────────────────
function CustomerAnalyticsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.db.getCustomerAnalytics().then(d=>{ setData(d); setLoading(false); });
  }, []);

  const top = data.slice(0,10);
  const wholesale = data.filter(c=>c.customer_type==='Wholesale').reduce((s,c)=>s+c.total_spent,0);
  const retail = data.filter(c=>c.customer_type==='Retail').reduce((s,c)=>s+c.total_spent,0);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Top 10 Customers by Revenue</h3>
          {loading?<div className="skeleton" style={{height:220,borderRadius:10}}/> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top} layout="vertical" margin={{top:0,right:10,bottom:0,left:110}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false}/>
                <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmtShort}/>
                <YAxis type="category" dataKey="customer_name" tick={{fill:'var(--text-secondary)',fontSize:9}} tickLine={false} axisLine={false} width={105}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="total_spent" name="Revenue" fill="#8B5CF6" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Wholesale vs Retail</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <div style={{background:'var(--accent-bg)',border:'1px solid var(--accent-border)',borderRadius:10,padding:'10px 14px',textAlign:'center'}}>
              <div style={{fontSize:14,fontWeight:700,fontFamily:'monospace',color:'var(--accent)',marginBottom:2}}>{fmtShort(wholesale)}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>Wholesale</div>
            </div>
            <div style={{background:'var(--gold-bg)',border:'1px solid rgba(245,158,11,.2)',borderRadius:10,padding:'10px 14px',textAlign:'center'}}>
              <div style={{fontSize:14,fontWeight:700,fontFamily:'monospace',color:'var(--gold)',marginBottom:2}}>{fmtShort(retail)}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>Retail</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={[{name:'Wholesale',value:wholesale},{name:'Retail',value:retail}]} dataKey="value" cx="50%" cy="50%" outerRadius={55} paddingAngle={3}>
                <Cell fill="var(--accent)"/><Cell fill="var(--gold)"/>
              </Pie>
              <Tooltip formatter={fmtShort} contentStyle={{background:'var(--chart-tooltip-bg)',border:'1px solid var(--border)',borderRadius:10,fontSize:11}}/>
              <Legend iconType="circle" iconSize={8} formatter={v=><span style={{color:'var(--text-secondary)',fontSize:11}}>{v}</span>}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {!loading && data.length > 0 && (
        <Card>
          <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)',marginBottom:12}}>Customer Details</h3>
          <div style={{overflowY:'auto',maxHeight:320}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead style={{position:'sticky',top:0,background:'var(--bg-card)'}}>
                <tr style={{borderBottom:'1px solid var(--border)'}}>
                  {['Customer','Type','Orders','Total Spent','Avg Order','Categories','Last Purchase'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 12px',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.slice(0,30).map(c=>(
                  <tr key={c.customer_name} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{padding:'7px 12px',fontWeight:600,color:'var(--text-primary)'}}>{c.customer_name}</td>
                    <td style={{padding:'7px 12px'}}><Badge variant={c.customer_type==='Wholesale'?'accent':'gold'} size="xs">{c.customer_type}</Badge></td>
                    <td style={{padding:'7px 12px',fontFamily:'monospace',color:'var(--text-secondary)'}}>{c.purchase_count}</td>
                    <td style={{padding:'7px 12px',fontFamily:'monospace',color:'var(--accent)',fontWeight:700}}>{fmt(c.total_spent)}</td>
                    <td style={{padding:'7px 12px',fontFamily:'monospace',color:'var(--text-secondary)'}}>{fmt(c.avg_order)}</td>
                    <td style={{padding:'7px 12px',fontFamily:'monospace',color:'var(--text-secondary)'}}>{c.categories_bought}</td>
                    <td style={{padding:'7px 12px',color:'var(--text-muted)',fontSize:11}}>{c.last_purchase}</td>
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

// ── Main ────────────────────────────────────────────────────────────────────────
const TABS = [
  { id:'timeseries', label:'Time Series', icon:Activity },
  { id:'forecast',   label:'Forecast',    icon:Target },
  { id:'anomaly',    label:'Anomalies',   icon:AlertTriangle },
  { id:'category',   label:'Category',    icon:BarChart2 },
  { id:'region',     label:'Region',      icon:Globe2 },
  { id:'customers',  label:'Customers',   icon:Users },
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState('timeseries');

  const CONTENT = {
    timeseries: <TimeSeriesTab/>,
    forecast:   <ForecastTab/>,
    anomaly:    <AnomalyTab/>,
    category:   <CategoryTab/>,
    region:     <RegionTab/>,
    customers:  <CustomerAnalyticsTab/>,
  };

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'20px 24px 0',flexShrink:0}}>
        <PageHeader title="Analytics" subtitle="Advanced statistical analysis & business intelligence" icon={BarChart2} iconColor="var(--info)"/>
        <div style={{display:'flex',borderBottom:'1px solid var(--border)',overflowX:'auto'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,whiteSpace:'nowrap',transition:'all .15s',borderBottom:`2px solid ${tab===t.id?'var(--accent)':'transparent'}`,color:tab===t.id?'var(--accent)':'var(--text-secondary)'}}>
              <t.icon size={13}/>{t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'20px 24px 24px'}} className="scroll-area">
        <div key={tab} className="animate-fade-in">
          {CONTENT[tab]}
        </div>
      </div>
    </div>
  );
}
