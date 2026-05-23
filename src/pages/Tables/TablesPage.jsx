import React, { useState, useEffect, useCallback } from 'react';
import { Table2, Plus, Trash2, X, ChevronRight, Database, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Badge, Button, Input, PageHeader, EmptyState } from '../../components/ui/index';

const inputSt = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '7px 10px', fontSize: 12, width: '100%', outline: 'none', fontFamily: 'inherit' };

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text' }, { value: 'REAL', label: 'Number (decimal)' },
  { value: 'INTEGER', label: 'Number (integer)' }, { value: 'TEXT', label: 'Date (TEXT)' },
];

// ── Create Table Wizard ────────────────────────────────────────────────────────
function CreateTableModal({ onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [tableName, setTableName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState([
    { name: 'date', type: 'TEXT', default: '' },
    { name: 'item_name', type: 'TEXT', default: '' },
    { name: 'quantity', type: 'REAL', default: '0' },
  ]);

  const addCol = () => setColumns(c => [...c, { name: '', type: 'TEXT', default: '' }]);
  const removeCol = (i) => setColumns(c => c.filter((_, j) => j !== i));
  const setCol = (i, k, v) => setColumns(c => c.map((col, j) => j === i ? { ...col, [k]: v } : col));

  const handleCreate = async () => {
    if (!tableName.trim()) { toast.error('Table name required'); return; }
    if (!displayName.trim()) { toast.error('Display name required'); return; }
    const validCols = columns.filter(c => c.name.trim());
    if (!validCols.length) { toast.error('At least one column required'); return; }
    const r = await window.electron.db.createDynamicTable(tableName.trim(), displayName.trim(), validCols, description);
    if (r.success) { toast.success(`Table "${displayName}" created!`); onCreated(); onClose(); }
    else toast.error(r.error || 'Failed to create table');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Create Custom Table</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Display Name *</label>
          <input value={displayName} onChange={e => { setDisplayName(e.target.value); setTableName(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')); }} placeholder="e.g. November 2024 Stock" style={inputSt} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Table Key (auto-generated)</label>
          <input value={tableName} onChange={e => setTableName(e.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder="auto_name" style={{ ...inputSt, fontFamily: 'monospace', color: 'var(--text-muted)' }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this table for?" style={inputSt} />
        </div>

        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Columns</span>
          <button onClick={addCol} style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>+ Add Column</button>
        </div>

        <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
          {columns.map((col, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 30px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={col.name} onChange={e => setCol(i, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder={`column_${i + 1}`} style={{ ...inputSt, fontFamily: 'monospace', fontSize: 11 }} />
              <select value={col.type} onChange={e => setCol(i, 'type', e.target.value)} style={{ ...inputSt, fontSize: 11 }}>
                <option value="TEXT">Text</option>
                <option value="REAL">Decimal</option>
                <option value="INTEGER">Integer</option>
              </select>
              <button onClick={() => removeCol(i)} disabled={columns.length <= 1} style={{ background: 'var(--danger-bg)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--danger)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: columns.length <= 1 ? .3 : 1 }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            💡 Use this for monthly stock registers, custom tracking sheets, or any data that doesn't fit the standard sales format. Each table gets its own view and can be imported from Excel.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Database} onClick={handleCreate}>Create Table</Button>
        </div>
      </div>
    </div>
  );
}

// ── Table Viewer ───────────────────────────────────────────────────────────────
function TableViewer({ table, onBack }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const r = await window.electron.db.getDynamicTableData(table.table_name, { page, limit: 100, search }) || {};
    setRows(r.rows || []);
    setTotal(r.total || 0);
    setLoading(false);
  }, [table.table_name, page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (addingRow) { const def = {}; table.columns.forEach(c => def[c.name] = ''); setNewRow(def); } }, [addingRow, table.columns]);

  const handleAddRow = async () => {
    const r = await window.electron.db.insertDynamicRow(table.table_name, newRow);
    if (r.success) { toast.success('Row added'); setAddingRow(false); load(); }
    else toast.error('Failed to add row');
  };

  const handleDelete = async (id) => {
    await window.electron.db.deleteDynamicRow(table.table_name, id);
    toast.success('Row deleted');
    load();
  };

  const handleExport = async () => {
    const allData = await window.electron.db.getDynamicTableData(table.table_name, { page: 1, limit: 9999 }) || {};
    const cols = [...((allData.columns || table.columns) || []).map(c => ({ key: c.name, header: c.name.replace(/_/g, ' ').toUpperCase(), width: 18 }))];
    await window.electron.excel.exportData({ data: allData.rows || [], columns: cols, filename: `${table.display_name}_${new Date().toISOString().split('T')[0]}.xlsx` });
    toast.success('Exported!');
  };

  const handleImport = async () => {
    const path = await window.electron.excel.openFileDialog();
    if (!path) return;
    const result = await window.electron.excel.parseFile(path);
    if (!result.success) { toast.error(result.error); return; }
    let imported = 0;
    for (const rec of result.records) {
      const mapped = {};
      table.columns.forEach(c => { mapped[c.name] = rec[c.name] || rec[c.name.replace(/_/g, ' ')] || ''; });
      const r = await window.electron.db.insertDynamicRow(table.table_name, mapped);
      if (r.success) imported++;
    }
    toast.success(`Imported ${imported} rows`);
    load();
  };

  const cols = table.columns || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            ← Back
          </button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{table.display_name}</h2>
          <Badge variant="accent" size="xs">{total} rows</Badge>
          {table.description && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{table.description}</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inputSt, width: 220 }} />
          <Button size="sm" icon={Plus} onClick={() => setAddingRow(true)}>Add Row</Button>
          <Button size="sm" variant="secondary" icon={Upload} onClick={handleImport}>Import Excel</Button>
          <Button size="sm" variant="secondary" icon={Download} onClick={handleExport}>Export</Button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 16px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {cols.map(c => <th key={c.name} style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.name.replace(/_/g, ' ').toUpperCase()}</th>)}
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Del</th>
                </tr>
              </thead>
              <tbody>
                {/* Add row inline */}
                {addingRow && (
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-bg)' }}>
                    {cols.map(c => (
                      <td key={c.name} style={{ padding: '6px 8px' }}>
                        <input value={newRow[c.name] || ''} onChange={e => setNewRow(r => ({ ...r, [c.name]: e.target.value }))}
                          style={{ ...inputSt, padding: '5px 8px', fontSize: 11 }} />
                      </td>
                    ))}
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={handleAddRow} style={{ padding: '4px 8px', background: 'var(--success-bg)', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'var(--success)', fontSize: 10 }}>✓</button>
                        <button onClick={() => setAddingRow(false)} style={{ padding: '4px 8px', background: 'var(--danger-bg)', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'var(--danger)', fontSize: 10 }}>✕</button>
                      </div>
                    </td>
                  </tr>
                )}
                {loading ? Array(8).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    {cols.map((_, j) => <td key={j} style={{ padding: '10px 12px' }}><div className="skeleton" style={{ height: 12 }} /></td>)}
                    <td style={{ padding: '10px 12px' }}><div className="skeleton" style={{ height: 12, width: 24 }} /></td>
                  </tr>
                )) : rows.length === 0 && !addingRow ? (
                  <tr><td colSpan={cols.length + 1} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No rows yet. Click "Add Row" or import from Excel.</td></tr>
                ) : rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    {cols.map(c => (
                      <td key={c.name} style={{ padding: '8px 12px', color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row[c.name] !== undefined ? String(row[c.name]) : '—'}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px' }}>
                      <button onClick={() => handleDelete(row.id)} style={{ background: 'var(--danger-bg)', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'var(--danger)', padding: '3px 7px', fontSize: 10 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Tables Page ───────────────────────────────────────────────────────────
export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTable, setActiveTable] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await window.electron.db.getDynamicTables();
    setTables(r || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeleteTable = async (name, displayName) => {
    if (!window.confirm(`Delete table "${displayName}" and ALL its data? This cannot be undone.`)) return;
    await window.electron.db.deleteDynamicTable(name);
    toast.success('Table deleted');
    setActiveTable(null);
    load();
  };

  if (activeTable) return <TableViewer table={activeTable} onBack={() => { setActiveTable(null); load(); }} />;

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {showCreate && <CreateTableModal onClose={() => setShowCreate(false)} onCreated={load} />}

      <div style={{ padding: '20px 24px 16px', flexShrink: 0 }}>
        <PageHeader title="Custom Tables" subtitle="Create tables for stock registers, custom formats, or any data" icon={Table2} iconColor="var(--info)"
          actions={<Button icon={Plus} onClick={() => setShowCreate(true)}>New Table</Button>} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {/* Built-in tables note */}
        <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>Built-in Tables</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Sales, Inventory, and Customers are managed in their dedicated pages. Use Custom Tables for monthly stock registers (like your October-24 format), seasonal data, or any other tracking needs.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}
          </div>
        ) : tables.length === 0 ? (
          <Card>
            <EmptyState icon={Table2} title="No custom tables yet"
              description="Create a custom table to store stock registers, monthly data, or any custom format. You can import Excel files into these tables."
              action={<Button icon={Plus} onClick={() => setShowCreate(true)}>Create First Table</Button>} />
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {tables.map(t => (
              <div key={t.table_name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, background: 'var(--info-bg)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={16} style={{ color: 'var(--info)' }} />
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDeleteTable(t.table_name, t.display_name); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t.display_name}</h3>
                {t.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{t.description}</p>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {t.columns.slice(0, 4).map(c => <Badge key={c.name} variant="default" size="xs">{c.name}</Badge>)}
                  {t.columns.length > 4 && <Badge variant="default" size="xs">+{t.columns.length - 4} more</Badge>}
                </div>
                <button onClick={() => setActiveTable(t)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
                  Open Table <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
