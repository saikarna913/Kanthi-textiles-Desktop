import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Plus, TrendingUp, ShoppingCart, Calendar, ChevronLeft, ChevronRight, X, Save, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Badge, Button, Input, PageHeader, ProgressBar, ChartTooltip } from '../../components/ui/index';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const inputSt = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '7px 10px', fontSize: 12, width: '100%', outline: 'none', fontFamily: 'inherit' };
const labelEl = (t) => <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t}</label>;

function CustomerModal({ customer, onClose, onSave }) {
  const [form, setForm] = useState(customer || {
    name: '', customer_type: 'Retail', phone: '', email: '',
    address: '', region: '', city: '', gstin: '',
    credit_limit: 0, credit_days: 0, notes: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Customer name required'); return; }
    const r = await window.electron.db.upsertCustomer(form);
    if (r.success) { toast.success(r.updated ? 'Customer updated' : 'Customer added'); onSave(); onClose(); }
    else toast.error(r.error || 'Failed to save');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}>{labelEl('Customer Name *')}<input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Priya Collections" style={inputSt} /></div>
          <div>{labelEl('Type')}<select value={form.customer_type} onChange={e => set('customer_type', e.target.value)} style={inputSt}><option value="Retail">Retail</option><option value="Wholesale">Wholesale</option><option value="Distributor">Distributor</option></select></div>
          <div>{labelEl('Phone')}<input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" style={inputSt} /></div>
          <div>{labelEl('Email')}<input value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" style={inputSt} /></div>
          <div>{labelEl('City')}<input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Hyderabad" style={inputSt} /></div>
          <div>{labelEl('Region')}<select value={form.region} onChange={e => set('region', e.target.value)} style={inputSt}><option value="">Select</option>{['North', 'South', 'East', 'West', 'Central'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          <div>{labelEl('GSTIN')}<input value={form.gstin} onChange={e => set('gstin', e.target.value)} placeholder="27AAPFU0939F1ZV" style={inputSt} /></div>
          <div>{labelEl('Credit Limit (₹)')}<input type="number" value={form.credit_limit} onChange={e => set('credit_limit', +e.target.value)} style={inputSt} /></div>
          <div>{labelEl('Credit Days')}<input type="number" value={form.credit_days} onChange={e => set('credit_days', +e.target.value)} style={inputSt} /></div>
          <div style={{ gridColumn: '1/-1' }}>{labelEl('Address')}<textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="Full delivery address..." style={{ ...inputSt, resize: 'vertical' }} /></div>
          <div style={{ gridColumn: '1/-1' }}>{labelEl('Notes')}<textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Save} onClick={handleSave}>Save Customer</Button>
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({ customerId, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    window.electron.db.getCustomerById(customerId).then(setData);
  }, [customerId]);

  if (!data) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 40 }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: 'auto' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{data.name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Badge variant={data.customer_type === 'Wholesale' ? 'accent' : 'gold'}>{data.customer_type}</Badge>
              {data.city && <Badge variant="default">{data.city}{data.region ? ` · ${data.region}` : ''}</Badge>}
              {data.phone && <Badge variant="default">📞 {data.phone}</Badge>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total Spent', value: fmt(data.total_purchases), color: 'var(--accent)' },
              { label: 'Orders', value: (data.purchase_count || 0).toLocaleString(), color: 'var(--info)' },
              { label: 'Avg Order', value: fmt(data.purchase_count > 0 ? data.total_purchases / data.purchase_count : 0), color: 'var(--gold)' },
              { label: 'Last Purchase', value: data.last_purchase || '—', color: 'var(--success)' },
            ].map(({ label, value, color }, i) => (
              <div key={i} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          {data.monthlySpend?.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Monthly Purchase Trend</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data.monthlySpend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="var(--accent)" strokeWidth={2} fill="url(#cg)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Top products */}
          {data.topProducts?.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Top Products Purchased</p>
              {data.topProducts.slice(0, 6).map((p, i) => (
                <div key={p.product_name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', width: 18 }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{p.product_name}</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{fmt(p.total_spent)}</span>
                    </div>
                    <ProgressBar value={p.total_spent} max={data.topProducts[0]?.total_spent || 1} color="accent" />
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Recent transactions */}
          {data.recentSales?.length > 0 && (
            <Card>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Recent Transactions</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Product', 'Category', 'Qty', 'Amount', 'Payment'].map(h =>
                        <th key={h} style={{ textAlign: 'left', padding: '4px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSales.slice(0, 12).map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{s.date}</td>
                        <td style={{ padding: '6px 10px', color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.product_name}</td>
                        <td style={{ padding: '6px 10px' }}><Badge variant="accent" size="xs">{s.category}</Badge></td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{s.quantity}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{fmt(s.total_amount)}</td>
                        <td style={{ padding: '6px 10px' }}><Badge variant="info" size="xs">{s.payment_mode}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | customer object
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await window.electron.db.getCustomers({ page, limit: 50, search, type });
    setCustomers(r.rows || []);
    setTotal(r.total || 0);
    setLoading(false);
  }, [page, search, type]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete customer "${name}"? Their sales history will be kept.`)) return;
    await window.electron.db.deleteCustomer(id);
    toast.success('Customer deleted');
    load();
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {modal && <CustomerModal customer={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={load} />}
      {detailId && <CustomerDetail customerId={detailId} onClose={() => setDetailId(null)} />}

      <div style={{ padding: '20px 24px 12px', flexShrink: 0 }}>
        <PageHeader title="Customers" subtitle={`${total.toLocaleString()} accounts`} icon={Users}
          actions={<Button icon={Plus} onClick={() => setModal('new')}>Add Customer</Button>} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Input placeholder="Search name, phone, city..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} icon={Search} style={{ width: 280 }} />
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '6px 12px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
            <option value="">All Types</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Retail">Retail</option>
            <option value="Distributor">Distributor</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 16px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Customer', 'Type', 'City / Region', 'Orders', 'Total Spent', 'Avg Order', 'Last Purchase', 'Actions'].map(h =>
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? Array(10).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    {Array(8).fill(0).map((_, j) => <td key={j} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 12 }} /></td>)}
                  </tr>
                )) : customers.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>No customers found. Add one or import sales data.</td></tr>
                ) : customers.map(c => (
                  <tr key={c.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={() => setDetailId(c.id)}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                      {c.phone && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{c.phone}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}><Badge variant={c.customer_type === 'Wholesale' ? 'accent' : 'gold'} size="xs">{c.customer_type}</Badge></td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 11 }}>{[c.city, c.region].filter(Boolean).join(' · ') || '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{(c.purchase_count || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{fmt(c.total_purchases)}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{fmt(c.purchase_count > 0 ? c.total_purchases / c.purchase_count : 0)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 11 }}>{c.last_purchase || '—'}</td>
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setDetailId(c.id)} title="View detail"
                          style={{ padding: '4px 8px', background: 'var(--info-bg)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--info)', fontFamily: 'inherit', fontSize: 10 }}>View</button>
                        <button onClick={() => setModal(c)}
                          style={{ padding: '4px 8px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit', fontSize: 10 }}>Edit</button>
                        <button onClick={() => handleDelete(c.id, c.name)}
                          style={{ padding: '4px 8px', background: 'var(--danger-bg)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--danger)', fontFamily: 'inherit', fontSize: 10 }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{total.toLocaleString()} customers total</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '3px 8px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', opacity: page === 1 ? .4 : 1 }}>
                <ChevronLeft size={12} />
              </button>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{page} / {Math.max(1, totalPages)}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                style={{ padding: '3px 8px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', opacity: page >= totalPages ? .4 : 1 }}>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
