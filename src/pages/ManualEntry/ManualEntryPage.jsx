import React, { useState } from 'react';
import { PenLine, ShoppingCart, Users, Package, Check, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Badge, Button, PageHeader, Tabs } from '../../components/ui/index';

const inputSt = {
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', borderRadius: 8, padding: '8px 11px',
  fontSize: 13, width: '100%', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color .15s',
};
const labelEl = (t, required) => (
  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
    {t}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
  </label>
);

// ── Sale Form ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['KALAMKARI SAREES', 'KALAMKARI UNSTITCHED', 'READYMADES - MENS', 'WOMEN TOPS/KURTHIS', 'BAGS', 'BEDSHEETS', 'TOWELS', 'KALAMKARI DUPATTAS', 'LEISURE WARE', 'CARPETS', 'HANKIES', 'SAREES', 'DRESS SETS', 'HOME ACCESSORIES'];
const PAYMENTS = ['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Cheque', 'NEFT/RTGS'];

function SaleForm() {
  const empty = { invoice_no: '', date: new Date().toISOString().split('T')[0], customer_name: '', customer_type: 'Retail', region: '', city: '', product_name: '', category: '', quantity: 1, unit_price: 0, discount: 0, total_amount: 0, cost_price: 0, profit: 0, payment_mode: 'Cash', notes: '' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => {
    setForm(f => {
      const nf = { ...f, [k]: v };
      // auto-calc totals
      if (['unit_price', 'discount', 'quantity', 'cost_price'].includes(k)) {
        const qty = +nf.quantity || 1;
        const up = +nf.unit_price || 0;
        const disc = +nf.discount || 0;
        const cp = +nf.cost_price || 0;
        nf.total_amount = ((up - disc) * qty).toFixed(2);
        nf.profit = ((up - disc - cp) * qty).toFixed(2);
      }
      return nf;
    });
  };

  const handleSubmit = async () => {
    if (!form.product_name.trim()) { toast.error('Product name required'); return; }
    if (!form.date) { toast.error('Date required'); return; }
    setSaving(true);
    const r = await window.electron.db.insertSale(form);
    setSaving(false);
    if (r.success) {
      toast.success(`Sale #${r.id} recorded!`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setForm({ ...empty, date: form.date, customer_name: form.customer_name, customer_type: form.customer_type, payment_mode: form.payment_mode });
    } else {
      toast.error(r.error || 'Failed to save');
    }
  };

  const Row = ({ children, cols = '1fr 1fr' }) => (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, marginBottom: 12 }}>{children}</div>
  );

  const FInput = ({ label, fieldKey, type = 'text', placeholder, required }) => (
    <div>
      {labelEl(label, required)}
      <input type={type} value={form[fieldKey]} onChange={e => set(fieldKey, e.target.value)} placeholder={placeholder}
        style={inputSt}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
    </div>
  );

  return (
    <div>
      <Row cols="1fr 1fr 1fr">
        <FInput label="Invoice No" fieldKey="invoice_no" placeholder="KT-2024-001" />
        <FInput label="Date" fieldKey="date" type="date" required />
        <div>{labelEl('Payment Mode')}<select value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)} style={inputSt}>{PAYMENTS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
      </Row>
      <Row cols="1fr 1fr 1fr">
        <FInput label="Customer Name" fieldKey="customer_name" placeholder="Priya Collections" />
        <div>{labelEl('Customer Type')}<select value={form.customer_type} onChange={e => set('customer_type', e.target.value)} style={inputSt}><option value="Retail">Retail</option><option value="Wholesale">Wholesale</option></select></div>
        <FInput label="City" fieldKey="city" placeholder="Hyderabad" />
      </Row>
      <Row cols="1fr 1fr">
        <FInput label="Product Name" fieldKey="product_name" placeholder="MALMAL SAREE (S.P)" required />
        <div>{labelEl('Category')}<select value={form.category} onChange={e => set('category', e.target.value)} style={inputSt}><option value="">Select Category</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
      </Row>
      <Row cols="repeat(4,1fr)">
        <FInput label="Quantity" fieldKey="quantity" type="number" placeholder="1" />
        <FInput label="Unit Price (₹)" fieldKey="unit_price" type="number" placeholder="500" />
        <FInput label="Discount (₹)" fieldKey="discount" type="number" placeholder="0" />
        <FInput label="Cost Price (₹)" fieldKey="cost_price" type="number" placeholder="300" />
      </Row>

      {/* Calculated row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Amount (₹)', value: form.total_amount, color: 'var(--accent)' },
          { label: 'Profit (₹)', value: form.profit, color: +form.profit >= 0 ? 'var(--success)' : 'var(--danger)' },
          { label: 'Margin %', value: form.total_amount > 0 ? ((form.profit / form.total_amount) * 100).toFixed(1) + '%' : '—', color: 'var(--gold)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        {labelEl('Notes')}
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any additional notes..." style={{ ...inputSt, resize: 'vertical' }} />
      </div>

      <Button onClick={handleSubmit} disabled={saving} icon={saved ? Check : ShoppingCart}>
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Record Sale'}
      </Button>
    </div>
  );
}

// ── Customer Form ─────────────────────────────────────────────────────────────
function CustomerForm() {
  const empty = { name: '', customer_type: 'Retail', phone: '', email: '', address: '', region: '', city: '', gstin: '', credit_limit: 0, credit_days: 0, notes: '' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Customer name required'); return; }
    setSaving(true);
    const r = await window.electron.db.upsertCustomer(form);
    setSaving(false);
    if (r.success) { toast.success(r.updated ? 'Customer updated' : 'Customer added!'); setForm(empty); }
    else toast.error(r.error || 'Failed');
  };

  const FI = ({ label, k, type = 'text', ph, req }) => <div>{labelEl(label, req)}<input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={inputSt} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} /></div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ gridColumn: '1/-1' }}><FI label="Customer Name" k="name" ph="e.g. Priya Collections" req /></div>
        <div>{labelEl('Type')}<select value={form.customer_type} onChange={e => set('customer_type', e.target.value)} style={inputSt}><option value="Retail">Retail</option><option value="Wholesale">Wholesale</option><option value="Distributor">Distributor</option></select></div>
        <FI label="Phone" k="phone" ph="+91 98765 43210" />
        <FI label="Email" k="email" ph="email@example.com" />
        <FI label="City" k="city" ph="Hyderabad" />
        <div>{labelEl('Region')}<select value={form.region} onChange={e => set('region', e.target.value)} style={inputSt}><option value="">Select</option>{['North', 'South', 'East', 'West', 'Central'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        <FI label="GSTIN" k="gstin" ph="27AAPFU0939F1ZV" />
        <FI label="Credit Limit (₹)" k="credit_limit" type="number" ph="0" />
        <div style={{ gridColumn: '1/-1' }}>{labelEl('Address')}<textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="Full delivery address..." style={{ ...inputSt, resize: 'vertical' }} /></div>
        <div style={{ gridColumn: '1/-1' }}>{labelEl('Notes')}<textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical' }} /></div>
      </div>
      <Button onClick={handleSave} disabled={saving} icon={Users}>{saving ? 'Saving...' : 'Save Customer'}</Button>
    </div>
  );
}

// ── Inventory Form ────────────────────────────────────────────────────────────
function InventoryForm() {
  const empty = { sku: '', product_name: '', category: '', sub_category: '', unit: 'pcs', current_stock: 0, min_stock: 5, max_stock: 500, unit_cost: 0, unit_price: 0, supplier: '', supplier_contact: '', lead_time_days: 7, next_expected_delivery: '', location: '', barcode: '' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.product_name.trim()) { toast.error('Product name required'); return; }
    setSaving(true);
    const r = await window.electron.db.upsertInventoryItem(form);
    setSaving(false);
    if (r.success) { toast.success('Inventory item saved!'); setForm(empty); }
    else toast.error(r.error || 'Failed');
  };

  const FI = ({ label, k, type = 'text', ph }) => <div>{labelEl(label)}<input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={inputSt} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} /></div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FI label="SKU" k="sku" ph="KT-0001 (auto if blank)" />
        <div style={{ gridColumn: '2' }}>{labelEl('Category')}<select value={form.category} onChange={e => set('category', e.target.value)} style={inputSt}><option value="">Select</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div style={{ gridColumn: '1/-1' }}><FI label="Product Name" k="product_name" ph="MALMAL SAREE (S.P)" /></div>
        <FI label="Sub Category" k="sub_category" ph="e.g. Silk, Cotton" />
        <div>{labelEl('Unit')}<select value={form.unit} onChange={e => set('unit', e.target.value)} style={inputSt}><option value="pcs">pcs</option><option value="mtrs">mtrs</option><option value="sets">sets</option><option value="pairs">pairs</option><option value="kgs">kgs</option></select></div>
        <FI label="Current Stock" k="current_stock" type="number" ph="0" />
        <FI label="Min Stock (Reorder)" k="min_stock" type="number" ph="5" />
        <FI label="Max Stock" k="max_stock" type="number" ph="500" />
        <FI label="Cost Price (₹)" k="unit_cost" type="number" ph="0" />
        <FI label="Selling Price (₹)" k="unit_price" type="number" ph="0" />
        <FI label="Supplier Name" k="supplier" ph="Surat Mills" />
        <FI label="Supplier Contact" k="supplier_contact" ph="+91 98765 43210" />
        <FI label="Lead Time (days)" k="lead_time_days" type="number" ph="7" />
        <FI label="Next Expected Delivery" k="next_expected_delivery" type="date" />
        <FI label="Storage Location" k="location" ph="Shelf A-3" />
        <FI label="Barcode" k="barcode" ph="Scan or enter barcode" />
      </div>
      <Button onClick={handleSave} disabled={saving} icon={Package}>{saving ? 'Saving...' : 'Save Item'}</Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'sale', label: 'Record Sale', icon: ShoppingCart },
  { id: 'customer', label: 'Add Customer', icon: Users },
  { id: 'inventory', label: 'Add Inventory', icon: Package },
];

export default function ManualEntryPage() {
  const [tab, setTab] = useState('sale');

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <PageHeader title="Add / Edit Data" subtitle="Manually record sales, customers, and inventory items" icon={PenLine} iconColor="var(--gold)" />
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
        <div style={{ maxWidth: 720 }}>
          <Card>
            <div className="animate-fade-in" key={tab}>
              {tab === 'sale' && <SaleForm />}
              {tab === 'customer' && <CustomerForm />}
              {tab === 'inventory' && <InventoryForm />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
