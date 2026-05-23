import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Search, Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Input, PageHeader } from '../../components/ui/index';
import clsx from 'clsx';

const fmt = v => `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const CATEGORIES = ['KALAMKARI SAREES','KALAMKARI UNSTITCHED','READYMADES - MENS','WOMEN TOPS/KURTHIS','BAGS','BEDSHEETS','TOWELS','KALAMKARI DUPATTAS','LEISURE WARE','CARPETS','HANKIES','SAREES','DRESS SETS','HOME ACCESSORIES'];
const REGIONS = ['North','South','East','West','Central'];

const COLUMNS = [
  { key:'date', header:'Date', w:110 },
  { key:'invoice_no', header:'Invoice', w:120, render: v => <span style={{fontFamily:'monospace',fontSize:11,color:'var(--text-muted)'}}>{v||'—'}</span> },
  { key:'customer_name', header:'Customer', w:160 },
  { key:'product_name', header:'Product', w:200 },
  { key:'category', header:'Category', w:170, render: v => <Badge variant="accent" size="xs">{v}</Badge> },
  { key:'quantity', header:'Qty', w:60, render: v => <span style={{fontFamily:'monospace'}}>{v}</span> },
  { key:'total_amount', header:'Amount', w:110, render: v => <span style={{fontFamily:'monospace',fontWeight:700,color:'var(--accent)'}}>{fmt(v)}</span> },
  { key:'profit', header:'Profit', w:100, render: v => <span style={{fontFamily:'monospace',fontWeight:600,color:v>=0?'var(--success)':'var(--danger)'}}>{fmt(v)}</span> },
  { key:'payment_mode', header:'Payment', w:100, render: v => <Badge variant="info" size="xs">{v}</Badge> },
  { key:'region', header:'Region', w:90 },
];

export default function SalesPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('DESC');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 50;
  const searchTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.electron.db.getSalesData({ page, limit, search, category, region, sortBy, sortDir, dateFrom, dateTo }) || {};
      setData(r.rows || []);
      setTotal(r.total || 0);
    } catch(e) { toast.error('Failed to load'); }
    setLoading(false);
  }, [page, limit, search, category, region, sortBy, sortDir, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 350);
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

  const handleExport = async () => {
    toast.loading('Preparing export...', {id:'exp'});
    const all = await window.electron.db.getSalesData({ page:1, limit:99999, search, category, region, sortBy, sortDir, dateFrom, dateTo }) || {};
    toast.dismiss('exp');
    const cols = COLUMNS.map(c=>({key:c.key,header:c.header,width:Math.round(c.w/7)}));
    const r = await window.electron.excel.exportData({ data: all.rows || [], columns: cols, filename:`kanthi_sales_${new Date().toISOString().split('T')[0]}.xlsx` });
    if (r?.success) toast.success(`Exported ${r.rows ?? 0} records`);
    else if (r) toast.error('Export failed');
  };

  const totalPages = Math.ceil(total/limit);

  const selSt = { background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-primary)', borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none', fontFamily:'inherit' };

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'20px 24px 12px',flexShrink:0}}>
        <PageHeader title="Sales Records" subtitle={`${total.toLocaleString()} transactions`} icon={ShoppingCart} iconColor="var(--info)"
          actions={<Button variant="primary" size="sm" icon={Download} onClick={handleExport}>Export Excel</Button>}/>

        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <Input placeholder="Search customer, product, invoice..." onChange={e=>handleSearch(e.target.value)} icon={Search} style={{width:280}}/>
          <select defaultValue="" onChange={e=>{setCategory(e.target.value);setPage(1);}} style={selSt}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select defaultValue="" onChange={e=>{setRegion(e.target.value);setPage(1);}} style={selSt}>
            <option value="">All Regions</option>
            {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(1);}} style={selSt} title="From date"/>
          <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(1);}} style={selSt} title="To date"/>
          {(search||category||region||dateFrom||dateTo) && (
            <button onClick={()=>{setSearch('');setCategory('');setRegion('');setDateFrom('');setDateTo('');setPage(1);}} style={{fontSize:11,color:'var(--danger)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>✕ Clear</button>
          )}
        </div>
      </div>

      <div style={{flex:1,overflow:'hidden',padding:'0 24px 16px'}}>
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{flex:1,overflowY:'auto',overflowX:'auto'}}>
            <table style={{borderCollapse:'collapse',fontSize:12,minWidth:900}}>
              <thead style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-card)'}}>
                <tr style={{borderBottom:'1px solid var(--border)'}}>
                  {COLUMNS.map(col => (
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
                    {COLUMNS.map(c=><td key={c.key} style={{padding:'10px 12px'}}><div className="skeleton" style={{height:12}}/></td>)}
                    <td style={{padding:'10px 12px'}}><div className="skeleton" style={{height:12,width:24}}/></td>
                  </tr>
                )) : data.length===0 ? (
                  <tr><td colSpan={COLUMNS.length+1} style={{textAlign:'center',padding:48,color:'var(--text-muted)'}}>No records found</td></tr>
                ) : data.map(row => (
                  <tr key={row.id} style={{borderBottom:'1px solid var(--border)',transition:'background .1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    {COLUMNS.map(col => (
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
