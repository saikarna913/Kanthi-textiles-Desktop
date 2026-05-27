import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, Search, Download, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Trash2, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Input, PageHeader } from '../../components/ui/index';

const fmtCur = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNum = v => Number(v || 0).toLocaleString('en-IN');

const CATEGORIES = [
  'KALAMKARI SAREES', 'KALAMKARI UNSTITCHED', 'READYMADES - MENS',
  'WOMEN TOPS/KURTHIS', 'BAGS', 'BEDSHEETS', 'TOWELS',
  'KALAMKARI DUPATTAS', 'LEISURE WARE', 'CARPETS', 'HANKIES',
  'SAREES', 'DRESS SETS', 'HOME ACCESSORIES',
];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' }, { value: '04', label: 'April' },
  { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' },
  { value: '09', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];
const YEARS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

// ── Column definitions ────────────────────────────────────────────────────────
const TX_COLUMNS = [
  { key: 'date', header: 'Date', w: 110 },
  { key: 'invoice_no', header: 'Invoice', w: 120, render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{v || '—'}</span> },
  { key: 'customer_name', header: 'Customer', w: 160 },
  { key: 'product_name', header: 'Product', w: 200 },
  { key: 'category', header: 'Category', w: 160, render: v => <Badge variant="accent" size="xs">{v}</Badge> },
  { key: 'quantity', header: 'Qty', w: 60, render: v => <span style={{ fontFamily: 'monospace' }}>{fmtNum(v)}</span> },
  { key: 'unit_price', header: 'Rate', w: 90, render: v => <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{fmtCur(v)}</span> },
  { key: 'total_amount', header: 'Amount', w: 110, render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>{fmtCur(v)}</span> },
  { key: 'profit', header: 'Profit', w: 100, render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: v >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtCur(v)}</span> },
  { key: 'payment_mode', header: 'Payment', w: 100, render: v => <Badge variant="info" size="xs">{v}</Badge> },
  { key: 'region', header: 'Region', w: 90 },
];

const MB_COLUMNS = [
  {
    key: 'date', header: 'Month', w: 160,
    render: v => {
      if (!v) return '—';
      const d = new Date(v + 'T00:00:00');
      return isNaN(d) ? v : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    },
  },
  { key: 'category', header: 'Category', w: 200, render: v => v ? <Badge variant="gold" size="xs">{v}</Badge> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
  { key: 'product_name', header: 'Item / Stock Item', w: 380 },
  {
    key: 'quantity', header: 'Total (Units Sold)', w: 150,
    render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold)', fontSize: 13 }}>{fmtNum(v)}</span>,
  },
];

const selSt = {
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', borderRadius: 8, padding: '6px 10px',
  fontSize: 12, outline: 'none', fontFamily: 'inherit',
};

// ── Tab button ────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children, color = 'var(--accent)' }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '9px 20px', border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
      transition: 'all .15s',
      borderBottom: `2px solid ${active ? color : 'transparent'}`,
      background: 'none',
      color: active ? color : 'var(--text-secondary)',
    }}>
      {children}
    </button>
  );
}

// ── Shared table component ────────────────────────────────────────────────────
function DataTable({ columns, data, loading, selectedIds, onToggleSelect, onToggleAll, onDelete, sortBy, sortDir, onSort, page, totalPages, total, limit, onPageChange }) {
  const selectAll = data.length > 0 && selectedIds.size === data.length;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 800, width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 12px', width: 36 }}>
                <input type="checkbox" checked={selectAll} onChange={onToggleAll} />
              </th>
              {columns.map(col => (
                <th key={col.key} onClick={() => onSort(col.key)}
                  style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', width: col.w }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.header}
                    {sortBy === col.key && (sortDir === 'ASC' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </div>
                </th>
              ))}
              <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, width: 50 }}>Del</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array(10).fill(0).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}><div className="skeleton" style={{ height: 12, width: 14 }} /></td>
                {columns.map(c => <td key={c.key} style={{ padding: '10px 12px' }}><div className="skeleton" style={{ height: 12 }} /></td>)}
                <td style={{ padding: '10px 12px' }}><div className="skeleton" style={{ height: 12, width: 22 }} /></td>
              </tr>
            )) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} style={{ textAlign: 'center', padding: 52, color: 'var(--text-muted)', fontSize: 13 }}>
                  No records found
                </td>
              </tr>
            ) : data.map(row => (
              <tr key={row.id}
                style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '9px 12px' }}>
                  <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => onToggleSelect(row.id)} />
                </td>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '9px 12px', color: 'var(--text-primary)', maxWidth: col.w, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {col.render ? col.render(row[col.key]) : (row[col.key] || '—')}
                  </td>
                ))}
                <td style={{ padding: '9px 12px' }}>
                  <button onClick={() => onDelete(row.id)}
                    style={{ background: 'var(--danger-bg)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--danger)', padding: '3px 7px', fontSize: 10 }}>
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {total === 0 ? 'No records'
            : `${((page - 1) * limit) + 1}–${Math.min(page * limit, total)} of ${total.toLocaleString()}`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => onPageChange(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '4px 8px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', opacity: page === 1 ? .4 : 1, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-primary)', padding: '0 4px' }}>
            {page} / {Math.max(1, totalPages)}
          </span>
          <button onClick={() => onPageChange(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: '4px 8px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', opacity: page >= totalPages ? .4 : 1, display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Transaction tab ───────────────────────────────────────────────────────────
function TransactionTab() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('DESC');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const limit = 50;
  const timer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.electron.db.getSalesData({
        page, limit, search, category, region, salesType: 'sales',
        sortBy, sortDir, dateFrom, dateTo, customerName: customerName.trim(),
      }) || {};
      setData(r.rows || []);
      setTotal(r.total || 0);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, [page, limit, search, category, region, sortBy, sortDir, dateFrom, dateTo, customerName]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = v => { clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 350); };
  const handleSort = col => { if (sortBy === col) setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC'); else { setSortBy(col); setSortDir('DESC'); } setPage(1); };
  const handleDelete = async id => { if (!window.confirm('Delete?')) return; await window.electron.db.deleteSale(id); toast.success('Deleted'); load(); };
  const handleDeleteSelected = async () => {
    if (!selectedIds.size || !window.confirm(`Delete ${selectedIds.size} rows?`)) return;
    const r = await window.electron.db.deleteSalesByIds([...selectedIds]);
    if (r?.success) { toast.success(`Deleted ${r.deleted}`); setSelectedIds(new Set()); load(); }
    else toast.error(r?.error || 'Failed');
  };
  const handleExport = async () => {
    toast.loading('Preparing...', { id: 'exp' });
    const all = await window.electron.db.getSalesData({ page: 1, limit: 99999, search, category, region, salesType: 'sales', sortBy, sortDir, dateFrom, dateTo }) || {};
    toast.dismiss('exp');
    const cols = TX_COLUMNS.map(c => ({ key: c.key, header: c.header, width: Math.round((c.w || 100) / 7) }));
    const r = await window.electron.excel.exportData({ data: all.rows || [], columns: cols, filename: `kanthi_transactions_${new Date().toISOString().split('T')[0]}.xlsx` });
    if (r?.success) toast.success(`Exported ${r.rows} records`);
  };

  const toggleSelect = id => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(data.length > 0 && selectedIds.size === data.length ? new Set() : new Set(data.map(r => r.id)));
  const totalPages = Math.ceil(total / limit);
  const hasFilter = !!(search || customerName || category || region || dateFrom || dateTo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Filters */}
      <div style={{ padding: '12px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <Input placeholder="Search customer, product, invoice…" onChange={e => handleSearch(e.target.value)} icon={Search} style={{ width: 280 }} />
          <Input placeholder="Filter by customer name…" onChange={e => { setCustomerName(e.target.value); setPage(1); }} style={{ width: 200 }} />
          <select defaultValue="" onChange={e => { setCategory(e.target.value); setPage(1); }} style={selSt}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select defaultValue="" onChange={e => { setRegion(e.target.value); setPage(1); }} style={selSt}>
            <option value="">All Regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={selSt} title="From date" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={selSt} title="To date" />
          {hasFilter && (
            <button onClick={() => { setSearch(''); setCustomerName(''); setCategory(''); setRegion(''); setDateFrom(''); setDateTo(''); setPage(1); }}
              style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              ✕ Clear
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant="primary" size="sm" icon={Download} onClick={handleExport}>Export Excel</Button>
          {selectedIds.size > 0 && (
            <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
              Delete {selectedIds.size} selected
            </Button>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
            {total.toLocaleString()} transactions
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 16px' }}>
        <DataTable
          columns={TX_COLUMNS} data={data} loading={loading}
          selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleAll={toggleAll}
          onDelete={handleDelete} sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
          page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// ── Monthly Sales tab ─────────────────────────────────────────────────────────
function MonthlySalesTab() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('DESC');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const limit = 100;
  const timer = useRef(null);

  // Derived date range from month+year picker
  const dateFrom = month && year ? `${year}-${month}-01` : '';
  const dateTo = month && year
    ? `${year}-${month}-${new Date(Number(year), Number(month), 0).getDate().toString().padStart(2, '0')}`
    : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.electron.db.getSalesData({
        page, limit, search, category, salesType: 'sales_by_month',
        sortBy, sortDir, dateFrom, dateTo,
      }) || {};
      setData(r.rows || []);
      setTotal(r.total || 0);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, [page, limit, search, category, sortBy, sortDir, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = v => { clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v); setPage(1); }, 350); };
  const handleSort = col => { if (sortBy === col) setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC'); else { setSortBy(col); setSortDir('DESC'); } setPage(1); };
  const handleDelete = async id => { if (!window.confirm('Delete?')) return; await window.electron.db.deleteSale(id); toast.success('Deleted'); load(); };
  const handleDeleteSelected = async () => {
    if (!selectedIds.size || !window.confirm(`Delete ${selectedIds.size} rows?`)) return;
    const r = await window.electron.db.deleteSalesByIds([...selectedIds]);
    if (r?.success) { toast.success(`Deleted ${r.deleted}`); setSelectedIds(new Set()); load(); }
    else toast.error(r?.error || 'Failed');
  };
  const handleExport = async () => {
    toast.loading('Preparing...', { id: 'exp' });
    const all = await window.electron.db.getSalesData({ page: 1, limit: 99999, salesType: 'sales_by_month', category, search, dateFrom, dateTo }) || {};
    toast.dismiss('exp');
    const cols = MB_COLUMNS.map(c => ({ key: c.key, header: c.header, width: Math.round((c.w || 120) / 7) }));
    const r = await window.electron.excel.exportData({ data: all.rows || [], columns: cols, filename: `kanthi_monthly_sales_${new Date().toISOString().split('T')[0]}.xlsx` });
    if (r?.success) toast.success(`Exported ${r.rows} records`);
  };

  const toggleSelect = id => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(data.length > 0 && selectedIds.size === data.length ? new Set() : new Set(data.map(r => r.id)));
  const totalPages = Math.ceil(total / limit);

  // Summary stats for visible data
  const totalUnits = data.reduce((s, r) => s + (r.quantity || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Info banner */}
      <div style={{ margin: '0 24px 10px', background: 'var(--gold-bg)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 10, padding: '9px 14px', fontSize: 12, flexShrink: 0 }}>
        <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Monthly Sales Format</span>
        <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
          S.NO / STOCK ITEMS / TOTAL — the <b>TOTAL</b> column shows <b>units sold</b> that month (not rupees). Filter by month and year to see a specific period.
        </span>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 24px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <Input placeholder="Search product or item name…" onChange={e => handleSearch(e.target.value)} icon={Search} style={{ width: 260 }} />
          <select defaultValue="" onChange={e => { setCategory(e.target.value); setPage(1); }} style={selSt}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Month + Year pickers */}
          <select value={month} onChange={e => { setMonth(e.target.value); setPage(1); }} style={selSt}>
            <option value="">All Months</option>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={year} onChange={e => { setYear(e.target.value); setPage(1); }} style={selSt}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {(search || category || month || year) && (
            <button onClick={() => { setSearch(''); setCategory(''); setMonth(''); setYear(''); setPage(1); }}
              style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              ✕ Clear
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" icon={Download} onClick={handleExport}>Export Excel</Button>
          {selectedIds.size > 0 && (
            <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
              Delete {selectedIds.size} selected
            </Button>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {total.toLocaleString()} line items
          </span>
          {totalUnits > 0 && (
            <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, fontFamily: 'monospace' }}>
              · {totalUnits.toLocaleString()} total units (this page)
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 16px' }}>
        <DataTable
          columns={MB_COLUMNS} data={data} loading={loading}
          selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleAll={toggleAll}
          onDelete={handleDelete} sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
          page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// ── Main Sales Page ───────────────────────────────────────────────────────────
export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('transactions');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <PageHeader
          title="Sales Records"
          subtitle="All sales data — transaction records and monthly summaries"
          icon={ShoppingCart}
          iconColor="var(--info)"
        />

        {/* Tab row */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 0 }}>
          <TabBtn
            active={activeTab === 'transactions'}
            onClick={() => setActiveTab('transactions')}
            color="var(--accent)"
          >
            <ShoppingCart size={14} />
            Sales Transactions
          </TabBtn>
          <TabBtn
            active={activeTab === 'monthly'}
            onClick={() => setActiveTab('monthly')}
            color="var(--gold)"
          >
            <Layers size={14} />
            Monthly Sales Data
          </TabBtn>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }} key={activeTab} className="animate-fade-in">
        {activeTab === 'transactions' ? <TransactionTab /> : <MonthlySalesTab />}
      </div>
    </div>
  );
}0