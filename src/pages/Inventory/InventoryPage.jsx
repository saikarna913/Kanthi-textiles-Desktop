import React, { useState, useEffect, useCallback } from 'react';
import { Package, Search, Plus, AlertTriangle, Truck, X, Check, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Input, PageHeader, EmptyState } from '../../components/ui/index';

const fmt = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const inputSt = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '7px 10px', fontSize: 12, width: '100%', outline: 'none', fontFamily: 'inherit' };
const CATEGORIES = ['KALAMKARI SAREES','KALAMKARI UNSTITCHED','READYMADES - MENS','WOMEN TOPS/KURTHIS','BAGS','BEDSHEETS','TOWELS','KALAMKARI DUPATTAS','LEISURE WARE','CARPETS','HANKIES','SAREES','DRESS SETS','HOME ACCESSORIES'];

function stockStatus(row) {
  if (row.current_stock <= 0) return { label: 'Out of Stock', variant: 'danger' };
  if (row.current_stock <= row.min_stock) return { label: 'Low Stock', variant: 'warning' };
  if (row.current_stock >= row.max_stock * 0.9) return { label: 'Overstocked', variant: 'info' };
  return { label: 'In Stock', variant: 'success' };
}

function TransactionModal({ item, onClose, onDone }) {
  const [txType, setTxType] = useState('received');
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState(item.unit_cost || 0);
  const [supplier, setSupplier] = useState(item.supplier || '');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => { window.electron.db.getInventoryTransactions(item.id).then(setHistory); }, [item.id]);

  const handleSave = async () => {
    if (!qty || isNaN(+qty) || +qty <= 0) { toast.error('Enter a valid quantity'); return; }
    setSaving(true);
    const r = await window.electron.db.addInventoryTransaction({ inventory_id: item.id, transaction_type: txType, quantity: +qty, unit_cost: +unitCost, supplier, notes, transaction_date: deliveryDate });
    setSaving(false);
    if (r.success) { toast.success(`Stock updated → ${r.newStock} ${item.unit}`); onDone(); onClose(); }
    else toast.error(r.error || 'Failed');
  };

  const TX_TYPES = [
    { id: 'received', label: 'Received', color: 'var(--success)' },
    { id: 'sold', label: 'Sold/Used', color: 'var(--danger)' },
    { id: 'adjusted', label: 'Set Exact', color: 'var(--gold)' },
    { id: 'returned', label: 'Returned', color: 'var(--info)' },
  ];

  const previewStock = qty && !isNaN(+qty) ? (
    txType === 'received' || txType === 'returned' ? item.current_stock + +qty
    : txType === 'sold' ? Math.max(0, item.current_stock - +qty)
    : +qty
  ) : null;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20}}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:18,padding:24,width:500,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:'var(--text-primary)'}}>{item.product_name}</h2>
            <p style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Current: <b style={{color:'var(--accent)',fontFamily:'monospace'}}>{item.current_stock} {item.unit}</b></p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={18}/></button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
          {TX_TYPES.map(({id,label,color}) => (
            <button key={id} onClick={() => setTxType(id)} style={{padding:'9px 4px',borderRadius:10,cursor:'pointer',textAlign:'center',border:`1px solid ${txType===id?color:'var(--border)'}`,background:txType===id?`${color}18`:'var(--bg-hover)',color:txType===id?color:'var(--text-muted)',fontFamily:'inherit',fontSize:11,fontWeight:600,transition:'all .15s'}}>
              {label}
            </button>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div><label style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:4}}>{txType==='adjusted'?'Set stock to':'Quantity'} ({item.unit})*</label><input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="e.g. 50" style={inputSt} autoFocus/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:4}}>Date</label><input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} style={inputSt}/></div>
          {txType==='received' && <>
            <div><label style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:4}}>Cost Price (₹)</label><input type="number" value={unitCost} onChange={e=>setUnitCost(e.target.value)} style={inputSt}/></div>
            <div><label style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:4}}>Supplier</label><input value={supplier} onChange={e=>setSupplier(e.target.value)} placeholder="Supplier name" style={inputSt}/></div>
          </>}
          <div style={{gridColumn:'1/-1'}}><label style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:4}}>Notes</label><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Received from Surat" style={inputSt}/></div>
        </div>

        {previewStock !== null && (
          <div style={{background:'var(--bg-hover)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',marginBottom:14}}>
            <span style={{fontSize:12,color:'var(--text-muted)'}}>New balance: </span>
            <span style={{fontSize:15,fontWeight:700,fontFamily:'monospace',color:'var(--accent)'}}>{previewStock} {item.unit}</span>
          </div>
        )}

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginBottom: history.length>0?16:0}}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Check} onClick={handleSave} disabled={saving}>{saving?'Saving...':'Update Stock'}</Button>
        </div>

        {history.length > 0 && (
          <div style={{borderTop:'1px solid var(--border)',paddingTop:14}}>
            <p style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:8}}>Recent Transactions</p>
            <div style={{maxHeight:160,overflowY:'auto'}}>
              {history.map(h => (
                <div key={h.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)',fontSize:11}}>
                  <span><b style={{color:h.transaction_type==='received'||h.transaction_type==='returned'?'var(--success)':'var(--danger)'}}>{h.transaction_type}</b> <span style={{color:'var(--text-muted)'}}>{h.transaction_date}</span> {h.notes&&<span style={{color:'var(--text-muted)'}}> — {h.notes}</span>}</span>
                  <span style={{fontFamily:'monospace',color:'var(--text-primary)',fontWeight:600}}>{h.transaction_type==='sold'?'-':'+'}qty:{h.quantity} → {h.balance_after}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditItemModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({...item});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    const r = await window.electron.db.upsertInventoryItem(form);
    if (r.success) { toast.success('Item updated'); onSave(); onClose(); }
    else toast.error(r.error||'Failed');
  };

  const FI = ({label,k,type='text',ph}) => <div>
    <label style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:4}}>{label}</label>
    <input type={type} value={form[k]||''} onChange={e=>set(k,type==='number'?+e.target.value:e.target.value)} placeholder={ph} style={inputSt}/>
  </div>;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20}}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:18,padding:24,width:520,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
          <h2 style={{fontSize:15,fontWeight:700,color:'var(--text-primary)'}}>Edit Item</h2>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={18}/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{gridColumn:'1/-1'}}><FI label="Product Name" k="product_name"/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:4}}>Category</label>
            <select value={form.category||''} onChange={e=>set('category',e.target.value)} style={inputSt}><option value="">Select</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <FI label="SKU" k="sku" ph="KT-0001"/>
          <FI label="Min Stock" k="min_stock" type="number"/>
          <FI label="Max Stock" k="max_stock" type="number"/>
          <FI label="Unit Cost (₹)" k="unit_cost" type="number"/>
          <FI label="Sell Price (₹)" k="unit_price" type="number"/>
          <FI label="Supplier" k="supplier" ph="Supplier name"/>
          <FI label="Lead Time (days)" k="lead_time_days" type="number"/>
          <FI label="Next Delivery Date" k="next_expected_delivery" type="date"/>
          <FI label="Storage Location" k="location" ph="Shelf A-3"/>
        </div>
        <div style={{display:'flex',gap:10,marginTop:16,justifyContent:'flex-end'}}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Check} onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

function InventoryRow({ row, onTx, onEdit, onDelete }) {
  const status = stockStatus(row);
  const margin = row.unit_price > 0 ? ((row.unit_price - row.unit_cost) / row.unit_price * 100).toFixed(1) : 0;
  return (
    <tr style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
      <td style={{padding:'7px 12px',color:'var(--text-primary)',fontWeight:500,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.product_name}</td>
      <td style={{padding:'7px 12px'}}><span style={{fontFamily:'monospace',fontWeight:700,color:row.current_stock<=row.min_stock?'var(--warning)':row.current_stock<=0?'var(--danger)':'var(--text-primary)'}}>{row.current_stock}</span><span style={{color:'var(--text-muted)',fontSize:10,marginLeft:3}}>{row.unit}</span></td>
      <td style={{padding:'7px 12px',color:'var(--text-muted)',fontFamily:'monospace'}}>{row.min_stock}</td>
      <td style={{padding:'7px 12px'}}><Badge variant={status.variant} size="xs">{status.label}</Badge></td>
      <td style={{padding:'7px 12px',fontFamily:'monospace',color:'var(--text-secondary)'}}>{fmt(row.unit_cost)}</td>
      <td style={{padding:'7px 12px',fontFamily:'monospace',color:'var(--accent)',fontWeight:700}}>{fmt(row.unit_price)}</td>
      <td style={{padding:'7px 12px'}}><Badge variant={margin>35?'success':margin>20?'warning':'danger'} size="xs">{margin}%</Badge></td>
      <td style={{padding:'7px 12px',color:'var(--text-muted)',fontSize:11,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.supplier||'—'}</td>
      <td style={{padding:'7px 12px'}}>
        {row.next_expected_delivery?<span style={{fontSize:10,color:'var(--success)',display:'flex',alignItems:'center',gap:3}}><Truck size={10}/>  {row.next_expected_delivery}</span>:<span style={{color:'var(--text-muted)',fontSize:10}}>—</span>}
      </td>
      <td style={{padding:'7px 12px'}}>
        <div style={{display:'flex',gap:4}}>
          <button onClick={onTx} style={{padding:'3px 7px',background:'var(--accent-bg)',border:'none',borderRadius:5,cursor:'pointer',color:'var(--accent)',fontSize:10,fontFamily:'inherit'}}>Stock</button>
          <button onClick={onEdit} style={{padding:'3px 7px',background:'var(--bg-hover)',border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',color:'var(--text-secondary)',fontSize:10,fontFamily:'inherit'}}>Edit</button>
          <button onClick={onDelete} style={{padding:'3px 7px',background:'var(--danger-bg)',border:'none',borderRadius:5,cursor:'pointer',color:'var(--danger)',fontSize:10}}>✕</button>
        </div>
      </td>
    </tr>
  );
}

export default function InventoryPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [txItem, setTxItem] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await window.electron.db.getInventory({ search, category, lowStock: lowStockOnly, page:1, limit:500 }) || {};
    setData(r.rows || []);
    setTotal(r.total || 0);
    setLoading(false);
  }, [search, category, lowStockOnly]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await window.electron.db.deleteInventoryItem(id); toast.success('Deleted'); load();
  };

  const handleExport = async () => {
    const cols = [{key:'product_name',header:'Product',width:28},{key:'category',header:'Category',width:20},{key:'current_stock',header:'Stock',width:10},{key:'unit',header:'Unit',width:8},{key:'min_stock',header:'Min',width:8},{key:'unit_cost',header:'Cost',width:12},{key:'unit_price',header:'Price',width:12},{key:'supplier',header:'Supplier',width:20},{key:'next_expected_delivery',header:'Next Delivery',width:16}];
    await window.electron.excel.exportData({ data, columns:cols, filename:`inventory_${new Date().toISOString().split('T')[0]}.xlsx` });
    toast.success('Exported!');
  };

  const lowCount = data.filter(d=>d.current_stock<=d.min_stock&&d.current_stock>0).length;
  const outCount = data.filter(d=>d.current_stock<=0).length;
  const totalValue = data.reduce((s,d)=>s+(d.current_stock*d.unit_cost),0);

  // Group by category
  const grouped = CATEGORIES.map(cat=>({ category:cat, items:data.filter(d=>d.category===cat) })).filter(g=>g.items.length>0);
  // Items with no matched category
  const uncategorized = data.filter(d=>!CATEGORIES.includes(d.category));
  if (uncategorized.length) grouped.push({ category:'Other', items:uncategorized });

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {txItem && <TransactionModal item={txItem} onClose={()=>setTxItem(null)} onDone={load}/>}
      {editItem && <EditItemModal item={editItem} onClose={()=>setEditItem(null)} onSave={load}/>}

      <div style={{padding:'20px 24px 12px',flexShrink:0}}>
        <PageHeader title="Inventory" subtitle={`${total.toLocaleString()} SKUs · grouped by category`} icon={Package} iconColor="var(--gold)"
          actions={<div style={{display:'flex',gap:8}}>
            <Button size="sm" variant="secondary" icon={Download} onClick={handleExport}>Export</Button>
          </div>}/>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
          {[{label:'Total SKUs',value:total,c:'var(--accent)'},{label:'Low Stock',value:lowCount,c:'var(--warning)'},{label:'Out of Stock',value:outCount,c:'var(--danger)'},{label:'Inventory Value',value:fmt(totalValue),c:'var(--success)'}].map(({label,value,c})=>(
            <div key={label} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 16px'}}>
              <div style={{fontSize:16,fontWeight:700,fontFamily:'monospace',color:c,marginBottom:3}}>{typeof value==='number'?value.toLocaleString():value}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <Input placeholder="Search product, SKU..." value={search} onChange={e=>setSearch(e.target.value)} icon={Search} style={{width:240}}/>
          <select value={category} onChange={e=>setCategory(e.target.value)} style={{background:'var(--bg-input)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:8,padding:'6px 12px',fontSize:12,outline:'none',fontFamily:'inherit'}}>
            <option value="">All Categories</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={()=>setLowStockOnly(!lowStockOnly)} style={{padding:'6px 12px',borderRadius:8,cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'inherit',transition:'all .15s',background:lowStockOnly?'var(--warning-bg)':'var(--bg-hover)',border:`1px solid ${lowStockOnly?'rgba(245,158,11,.3)':'var(--border)'}`,color:lowStockOnly?'var(--warning)':'var(--text-secondary)'}}>
            ⚠ Low Stock Only
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 24px 16px'}}>
        {loading ? (
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14}}>
            {Array(8).fill(0).map((_,i)=><div key={i} style={{borderBottom:'1px solid var(--border)',padding:'12px 16px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>{Array(5).fill(0).map((_,j)=><div key={j} className="skeleton" style={{height:12}}/>)}</div>)}
          </div>
        ) : (search||category||lowStockOnly) ? (
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead style={{position:'sticky',top:0,background:'var(--bg-card)',zIndex:5}}>
                <tr style={{borderBottom:'1px solid var(--border)'}}>
                  {['Product','Stock','Min','Status','Cost','Price','Margin','Supplier','Next Delivery','Actions'].map(h=><th key={h} style={{textAlign:'left',padding:'9px 12px',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap',fontSize:11}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No items found</td></tr>
                :data.map(row=><InventoryRow key={row.id} row={row} onTx={()=>setTxItem(row)} onEdit={()=>setEditItem(row)} onDelete={()=>handleDelete(row.id,row.product_name)}/>)}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {grouped.map(grp=>(
              <div key={grp.category} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
                <div style={{padding:'9px 16px',background:'var(--bg-hover)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--text-primary)'}}>{grp.category}</span>
                  <div style={{display:'flex',gap:8}}>
                    <Badge variant="accent" size="xs">{grp.items.length} items</Badge>
                    {grp.items.filter(i=>i.current_stock<=i.min_stock).length>0&&<Badge variant="warning" size="xs">⚠ {grp.items.filter(i=>i.current_stock<=i.min_stock).length} low</Badge>}
                  </div>
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                    {['Product','Stock','Min','Status','Cost','Price','Margin','Supplier','Next Delivery','Actions'].map(h=><th key={h} style={{textAlign:'left',padding:'7px 12px',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {grp.items.map(row=><InventoryRow key={row.id} row={row} onTx={()=>setTxItem(row)} onEdit={()=>setEditItem(row)} onDelete={()=>handleDelete(row.id,row.product_name)}/>)}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
