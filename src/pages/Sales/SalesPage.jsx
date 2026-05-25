import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Search, Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Input, PageHeader } from '../../components/ui/index';
import clsx from 'clsx';

const fmt = v => `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const formatMonthDisplay = v => {
  const d = new Date(v);
  if (isNaN(d)) return String(v||'—');
  return d.toLocaleDateString('en-IN', { month:'long', year:'numeric' });
};
const CATEGORIES = ['KALAMKARI SAREES','KALAMKARI UNSTITCHED','READYMADES - MENS','WOMEN TOPS/KURTHIS','BAGS','BEDSHEETS','TOWELS','KALAMKARI DUPATTAS','LEISURE WARE','CARPETS','HANKIES','SAREES','DRESS SETS','HOME ACCESSORIES'];
const REGIONS = ['North','South','East','West','Central'];
const MONTHS = [
  { value:'01', label:'Jan' }, { value:'02', label:'Feb' }, { value:'03', label:'Mar' },
  { value:'04', label:'Apr' }, { value:'05', label:'May' }, { value:'06', label:'Jun' },
  { value:'07', label:'Jul' }, { value:'08', label:'Aug' }, { value:'09', label:'Sep' },
  { value:'10', label:'Oct' }, { value:'11', label:'Nov' }, { value:'12', label:'Dec' },
];
const YEARS = Array.from({length:6},(_,i)=>String(new Date().getFullYear() - i));

const TRANSACTION_COLUMNS = [
  { key:'date', header:'Date', w:110 },
  { key:'invoice_no', header:'Invoice', w:120, render: v => <span style={{fontFamily:'monospace',fontSize:11,color:'var(--text-muted)'}}>{v||'—'}</span> },
  { key:'customer_name', header:'Customer', w:160 },
  { key:'product_name', header:'Product', w:200 },
  { key:'category', header:'Category', w:170, render: v => <Badge variant="accent" size="xs">{v}</Badge> },
  { key:'sales_type', header:'Source', w:130, render: v => <Badge variant={v==='sales_by_month'?'gold':'accent'} size="xs">{v==='sales_by_month'?'Sales by Month':'Sales Transaction'}</Badge> },
  { key:'quantity', header:'Qty', w:60, render: v => <span style={{fontFamily:'monospace'}}>{v}</span> },
  { key:'unit_price', header:'Rate', w:90, render: v => <span style={{fontFamily:'monospace',fontWeight:700,color:'var(--text-primary)'}}>{fmt(v)}</span> },
  { key:'total_amount', header:'Amount', w:110, render: v => <span style={{fontFamily:'monospace',fontWeight:700,color:'var(--accent)'}}>{fmt(v)}</span> },
  { key:'profit', header:'Profit', w:100, render: v => <span style={{fontFamily:'monospace',fontWeight:600,color:v>=0?'var(--success)':'var(--danger)'}}>{fmt(v)}</span> },
  { key:'payment_mode', header:'Payment', w:100, render: v => <Badge variant="info" size="xs">{v}</Badge> },
  { key:'region', header:'Region', w:90 },
];
const MONTHLY_COLUMNS = [
  { key:'date', header:'Month', w:180, render: v => formatMonthDisplay(v) },
  { key:'product_name', header:'Item / Stock Item', w:450 },
  { key:'quantity', header:'Total', w:140, render: v => <span style={{fontFamily:'monospace',fontWeight:700,color:'var(--accent)'}}>{v}</span> },
];
const ALL_COLUMNS = TRANSACTION_COLUMNS;

export default function SalesPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [salesType, setSalesType] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('DESC');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const limit = 50;
  const searchTimer = useRef(null);
  const columns = salesType === 'sales_by_month' ? MONTHLY_COLUMNS : TRANSACTION_COLUMNS;
  const selectAll = data.length > 0 && selectedIds.size === data.length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const selectedDateFrom = salesType === 'sales_by_month' && month && year
        ? `${year}-${month}-01`
        : dateFrom;
      const selectedDateTo = salesType === 'sales_by_month' && month && year
        ? `${year}-${month}-${new Date(Number(year), Number(month), 0).getDate().toString().padStart(2, '0')}`
        : dateTo;
      const r = await window.electron.db.getSalesData({
        page, limit, search, category, region, salesType, sortBy, sortDir,
        dateFrom: selectedDateFrom, dateTo: selectedDateTo, customerName: customerName.trim()
      }) || {};
      setData(r.rows || []);
      setTotal(r.total || 0);
    } catch(e) { toast.error('Failed to load'); }
    setLoading(false);
  }, [page, limit, search, category, region, salesType, sortBy, sortDir, dateFrom, dateTo, customerName, month, year]);

  useEffect(() => {
    setSelectedIds(prev => new Set(data.filter(row => prev.has(row.id)).map(row => row.id)));
  }, [data]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 350);
  };

  const handleCustomerFilter = (val) => {
    setCustomerName(val);
    setPage(1);
  };

  const handleSort = (col) => {
    if (sortBy===col) setSortDir(d=>d==='ASC'?'DESC':'ASC');
    else { setSortBy(col); setSortDir('DESC'); }
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await window.electron.db.deleteSale(id);
    toast.success('Record deleted'); load();
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(row => row.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected row${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    const r = await window.electron.db.deleteSalesByIds([...selectedIds]);
    if (r?.success) {
      toast.success(`Deleted ${r.deleted||selectedIds.size} rows`);
      setSelectedIds(new Set());
      load();
    } else {
      toast.error(r?.error || 'Delete failed');
    }
  };

  const handleDeleteFiltered = async () => {
    if (!window.confirm('Delete all rows matching current filters? This cannot be undone.')) return;
    const r = await window.electron.db.deleteSalesByFilter({ search, category, region, salesType, dateFrom, dateTo });
    if (r?.success) {
      toast.success(`Deleted ${r.deleted||0} filtered rows`);
      setSelectedIds(new Set());
      setPage(1);
      load();
    } else {
      toast.error(r?.error || 'Filtered delete failed');
    }
  };

  const handleExport = async () => {
    toast.loading('Preparing export...', {id:'exp'});
    const all = await window.electron.db.getSalesData({ page:1, limit:99999, search, category, region, salesType, sortBy, sortDir, dateFrom, dateTo }) || {};
    toast.dismiss('exp');
    const cols = columns.map(c=>({key:c.key,header:c.header,width:Math.round(c.w/7)}));
    const r = await window.electron.excel.exportData({ data: all.rows || [], columns: cols, filename:`kanthi_sales_${new Date().toISOString().split('T')[0]}.xlsx` });
    if (r?.success) toast.success(`Exported ${r.rows ?? 0} records`);
    else if (r) toast.error('Export failed');
  };

  const totalPages = Math.ceil(total/limit);

  const selSt = { background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-primary)', borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none', fontFamily:'inherit' };

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'20px 24px 12px',flexShrink:0}}>
        <PageHeader title="Sales Records" subtitle={`${total.toLocaleString()} ${salesType==='sales_by_month'?'monthly entries':'transactions'}`} icon={ShoppingCart} iconColor="var(--info)"
          actions={
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              <Button variant="secondary" size="sm" onClick={handleDeleteSelected} disabled={!selectedIds.size}>Delete Selected</Button>
              <Button variant="secondary" size="sm" onClick={handleDeleteFiltered} disabled={!search && !customerName && !category && !region && !dateFrom && !dateTo && !month && !year && !salesType}>Delete Filtered</Button>
              <Button variant="primary" size="sm" icon={Download} onClick={handleExport}>Export Excel</Button>
            </div>
          } />

        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <Input placeholder="Search customer, product, invoice..." onChange={e=>handleSearch(e.target.value)} icon={Search} style={{width:280}}/>
          <Input placeholder="Filter by customer" onChange={e=>handleCustomerFilter(e.target.value)} style={{width:220}}/>
          <select defaultValue="" onChange={e=>{setCategory(e.target.value);setPage(1);}} style={selSt}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select defaultValue="" onChange={e=>{setRegion(e.target.value);setPage(1);}} style={selSt}>
            <option value="">All Regions</option>
            {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <select defaultValue="" onChange={e=>{setSalesType(e.target.value);setMonth('');setYear('');setDateFrom('');setDateTo('');setPage(1);}} style={selSt}>
            <option value="">All Import Types</option>
            <option value="sales">Sales Transaction Data</option>
            <option value="sales_by_month">Sales by Month</option>
          </select>
          {salesType === 'sales_by_month' ? (
            <>
              <select value={month} onChange={e=>{setMonth(e.target.value);setPage(1);}} style={selSt}>
                <option value="">Month</option>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select value={year} onChange={e=>{setYear(e.target.value);setPage(1);}} style={selSt}>
                <option value="">Year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          ) : (
            <>
              <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(1);}} style={selSt} title="From date"/>
              <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(1);}} style={selSt} title="To date"/>
            </>
          )}
          {(search||customerName||category||region||dateFrom||dateTo||month||year) && (
            <button onClick={()=>{setSearch('');setCustomerName('');setCategory('');setRegion('');setDateFrom('');setDateTo('');setMonth('');setYear('');setPage(1);}} style={{fontSize:11,color:'var(--danger)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>✕ Clear</button>
          )}
        </div>
      </div>

      <div style={{flex:1,overflow:'hidden',padding:'0 24px 16px'}}>
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{flex:1,overflowY:'auto',overflowX:'auto'}}>
            <table style={{borderCollapse:'collapse',fontSize:12,minWidth:900}}>
              <thead style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-card)'}}>
                <tr style={{borderBottom:'1px solid var(--border)'}}>
                  <th style={{padding:'10px 12px',color:'var(--text-muted)',fontWeight:600,width:42}}>
                    <input type="checkbox" checked={selectAll} onChange={handleToggleSelectAll} />
                  </th>
                  {columns.map(col => (
                    <th key={col.key} onClick={()=>handleSort(col.key)} style={{textAlign:'left',padding:'10px 12px',color:'var(--text-muted)',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',userSelect:'none',width:col.w}}>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        {col.header}
                        {sortBy===col.key && (sortDir==='ASC'?<ChevronUp size={11}/>:<ChevronDown size={11}/>)}
                      </div>
                    </th>
                  ))}
                  <th style={{padding:'10px 12px',color:'var(--text-muted)',fontWeight:600,width:60}}>Del</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array(10).fill(0).map((_,i) => (
                  <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'10px 12px'}}><div className="skeleton" style={{height:12,width:16}}/></td>
                    {columns.map(c=><td key={c.key} style={{padding:'10px 12px'}}><div className="skeleton" style={{height:12}}/></td>)}
                    <td style={{padding:'10px 12px'}}><div className="skeleton" style={{height:12,width:24}}/></td>
                  </tr>
                )) : data.length===0 ? (
                  <tr><td colSpan={columns.length+2} style={{textAlign:'center',padding:48,color:'var(--text-muted)'}}>No records found</td></tr>
                ) : data.map(row => (
                  <tr key={row.id} style={{borderBottom:'1px solid var(--border)',transition:'background .1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{padding:'9px 12px'}}>
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => handleToggleSelect(row.id)} />
                    </td>
                    {columns.map(col => (
                      <td key={col.key} style={{padding:'9px 12px',color:'var(--text-primary)',maxWidth:col.w,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {col.render ? col.render(row[col.key]) : (row[col.key]||'—')}
                      </td>
                    ))}
                    <td style={{padding:'9px 12px'}}>
                      <button onClick={()=>handleDelete(row.id)} style={{background:'var(--danger-bg)',border:'none',borderRadius:6,cursor:'pointer',color:'var(--danger)',padding:'3px 7px',fontSize:10}}>
                        <Trash2 size={11}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 14px',borderTop:'1px solid var(--border)',flexShrink:0}}>
            <span style={{fontSize:11,color:'var(--text-muted)'}}>
              {total===0?'No records':page===1?`1–${Math.min(limit,total)} of ${total.toLocaleString()}`:`${(page-1)*limit+1}–${Math.min(page*limit,total)} of ${total.toLocaleString()}`}
            </span>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{padding:'4px 8px',background:'var(--bg-hover)',border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',color:'var(--text-secondary)',opacity:page===1?.4:1,display:'flex',alignItems:'center'}}>
                <ChevronLeft size={13}/>
              </button>
              <span style={{fontSize:11,fontFamily:'monospace',color:'var(--text-primary)',padding:'0 4px'}}>{page} / {Math.max(1,totalPages)}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}
                style={{padding:'4px 8px',background:'var(--bg-hover)',border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',color:'var(--text-secondary)',opacity:page>=totalPages?.4:1,display:'flex',alignItems:'center'}}>
                <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
