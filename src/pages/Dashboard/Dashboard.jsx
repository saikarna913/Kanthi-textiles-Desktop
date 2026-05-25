import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { LayoutDashboard, RefreshCw, IndianRupee, ShoppingCart, TrendingUp, Users, Package, AlertTriangle } from 'lucide-react';
import { StatCard, Card, Badge, ProgressBar, PageHeader, Button, ChartTooltip, Select } from '../../components/ui/index';

const COLORS = ['#14B8A6','#F59E0B','#3B82F6','#8B5CF6','#EF4444','#10B981','#EC4899'];
const fmtShort = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${Number(v).toFixed(0)}`;
const IMPORT_TYPES = [
  { value:'', label:'All Import Types' },
  { value:'sales', label:'Sales Transaction Data' },
  { value:'sales_by_month', label:'Sales by Month' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [monthly, setMonthly] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statsSales, setStatsSales] = useState({});
  const [statsByMonth, setStatsByMonth] = useState({});
  const [salesType, setSalesType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m, tp, cat, sSales, sByMonth] = await Promise.all([
        window.electron.db.getDashboardStats({ salesType }),
        window.electron.db.getMonthlySales({ months:12, salesType }),
        window.electron.db.getTopProducts({ limit:8, salesType }),
        window.electron.db.getCategoryAnalysis({ salesType }),
        window.electron.db.getDashboardStats({ salesType:'sales' }),
        window.electron.db.getDashboardStats({ salesType:'sales_by_month' }),
      ]);
      setStats(s || {});
      setMonthly(Array.isArray(m) ? m : []);
      setTopProducts(Array.isArray(tp) ? tp : []);
      setCategories(Array.isArray(cat) ? cat.slice(0, 7) : []);
      setStatsSales(sSales || {});
      setStatsByMonth(sByMonth || {});
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [salesType]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:12}}>
      <div style={{width:36,height:36,border:'3px solid var(--accent)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{color:'var(--text-muted)',fontSize:12}}>Loading dashboard...</p>
    </div>
  );

  const maxSales = Math.max(...topProducts.map(p => p.total_sales), 1);

  return (
    <div style={{height:'100%',overflowY:'auto',padding:24}} className="scroll-area">
      <PageHeader title="Dashboard"
        subtitle={new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
        icon={LayoutDashboard}
        actions={
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <Select
              value={salesType}
              onChange={e => setSalesType(e.target.value)}
              options={IMPORT_TYPES}
              placeholder="All import types"
              style={{width:220}}
            />
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>
          </div>
        }/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:14}} className="stagger">
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div>
              <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>Sales Transaction Analysis</h3>
              <p style={{fontSize:11,color:'var(--text-muted)'}}>Standard sales excel / transaction data</p>
            </div>
            <Badge variant="accent">Transactions</Badge>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>Total revenue</div>
            <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700}}>{statsSales?.totalSales||0}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>Total orders</div>
            <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700}}>{statsSales?.totalOrders||0}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>Unique customers</div>
            <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700}}>{statsSales?.uniqueCustomers||0}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>This month</div>
            <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700}}>{statsSales?.thisMonthSales||0}</div>
          </div>
        </Card>

        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div>
              <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>Monthly Sales Analysis</h3>
              <p style={{fontSize:11,color:'var(--text-muted)'}}>S.NO / STOCK ITEMS / TOTAL format</p>
            </div>
            <Badge variant="gold">Monthly</Badge>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>Total revenue</div>
            <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700}}>{statsByMonth?.totalSales||0}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>Total entries</div>
            <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700}}>{statsByMonth?.totalOrders||0}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>Unique customers</div>
            <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700}}>{statsByMonth?.uniqueCustomers||0}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>This month</div>
            <div style={{fontSize:11,fontFamily:'monospace',fontWeight:700}}>{statsByMonth?.thisMonthSales||0}</div>
          </div>
        </Card>
      </div>

      {/* KPI Row 1 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:14}} className="stagger">
        <StatCard label="Total Revenue" value={stats?.totalSales||0} format="currency" icon={IndianRupee} trend="up" trendValue={`${stats?.monthGrowth?.toFixed(1)}% MoM`} subValue="All time" delay={0}/>
        <StatCard label="Total Orders" value={stats?.totalOrders||0} format="number" icon={ShoppingCart} trend="up" trendValue="this month" subValue={`Avg ${fmtShort(stats?.avgOrderValue||0)}/order`} delay={60}/>
        <StatCard label="Total Profit" value={stats?.totalProfit||0} format="currency" icon={TrendingUp} subValue="Net earnings" delay={120}/>
        <StatCard label="Customers" value={stats?.uniqueCustomers||0} format="number" icon={Users} subValue="Unique buyers" delay={180}/>
      </div>

      {/* KPI Row 2 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}} className="stagger">
        <StatCard label="This Month" value={stats?.thisMonthSales||0} format="currency" icon={IndianRupee} iconBg="var(--gold-bg)" trend={stats?.monthGrowth>=0?'up':'down'} trendValue={`${Math.abs(stats?.monthGrowth||0).toFixed(1)}% vs last`} delay={0}/>
        <StatCard label="Last Month" value={stats?.lastMonthSales||0} format="currency" icon={IndianRupee} subValue="Comparison baseline" delay={60}/>
        <StatCard label="Inventory Value" value={stats?.totalInventoryValue||0} format="currency" icon={Package} subValue="At cost price" delay={120}/>
        <StatCard label="Low Stock Alerts" value={stats?.lowStockItems||0} format="number" icon={AlertTriangle} iconBg="var(--danger-bg)" subValue="Items need restock" delay={180}/>
      </div>

      {/* Charts Row */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
        {/* Monthly Trend */}
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div>
              <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>Revenue & Profit Trend</h3>
              <p style={{fontSize:11,color:'var(--text-muted)'}}>Last 12 months</p>
            </div>
            <Badge variant="accent">Monthly</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{top:5,right:5,bottom:0,left:0}}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/>
              <XAxis dataKey="label" tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} interval={1}/>
              <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmtShort} width={55}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Area type="monotone" dataKey="sales" name="Sales" stroke="var(--accent)" strokeWidth={2} fill="url(#sg)"/>
              <Area type="monotone" dataKey="profit" name="Profit" stroke="var(--gold)" strokeWidth={2} fill="url(#pg)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Pie */}
        <Card>
          <div style={{marginBottom:12}}>
            <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>Category Mix</h3>
            <p style={{fontSize:11,color:'var(--text-muted)'}}>By revenue share</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={categories} dataKey="total_sales" nameKey="category" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2}>
                {categories.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={v=>fmtShort(v)} contentStyle={{background:'var(--chart-tooltip-bg)',border:'1px solid var(--border)',borderRadius:10,fontSize:11}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:6}}>
            {categories.slice(0,4).map((cat,i) => (
              <div key={cat.category} style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:COLORS[i],flexShrink:0}}/>
                <span style={{fontSize:11,color:'var(--text-secondary)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cat.category}</span>
                <span style={{fontSize:11,fontFamily:'monospace',color:'var(--text-primary)',fontWeight:700,flexShrink:0}}>{fmtShort(cat.total_sales)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {/* Top Products */}
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>Top Products</h3>
            <Badge variant="info">By Sales</Badge>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {topProducts.slice(0,6).map((prod,i) => (
              <div key={prod.product_name} style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:10,fontFamily:'monospace',color:'var(--text-muted)',width:18,flexShrink:0}}>#{i+1}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:11,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70%'}}>{prod.product_name}</span>
                    <span style={{fontSize:11,fontFamily:'monospace',color:'var(--accent)',fontWeight:700,flexShrink:0}}>{fmtShort(prod.total_sales)}</span>
                  </div>
                  <ProgressBar value={prod.total_sales} max={maxSales} color={i===0?'accent':i===1?'gold':'success'}/>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Orders Bar */}
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>Monthly Orders</h3>
            <Badge variant="success">Count</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{top:5,right:5,bottom:0,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/>
              <XAxis dataKey="label" tick={{fill:'var(--text-muted)',fontSize:9}} tickLine={false} axisLine={false} interval={1}/>
              <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false} width={35}/>
              <Tooltip contentStyle={{background:'var(--chart-tooltip-bg)',border:'1px solid var(--border)',borderRadius:10,fontSize:11}} labelStyle={{color:'var(--text-secondary)'}} itemStyle={{color:'var(--text-primary)'}}/>
              <Bar dataKey="orders" name="Orders" fill="#3B82F6" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
