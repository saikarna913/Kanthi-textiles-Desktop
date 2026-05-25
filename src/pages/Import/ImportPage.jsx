import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, X, RefreshCw, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Badge, Button, PageHeader } from '../../components/ui/index';

const EXPECTED = [
  { key:'date', label:'Date', required:true, desc:'YYYY-MM-DD or DD/MM/YYYY' },
  { key:'customer_name', label:'Customer Name', required:false, desc:'Buyer name' },
  { key:'product_name', label:'Product Name / Stock Items', required:true, desc:'Item sold or in stock' },
  { key:'category', label:'Category', required:false, desc:'Product group' },
  { key:'total', label:'Total / TOTAL', required:true, desc:'Quantity or sales amount' },
  { key:'quantity', label:'Quantity / Qty', required:false, desc:'Units sold' },
  { key:'unit_price', label:'Unit Price / Rate', required:false, desc:'Price per unit' },
  { key:'total_amount', label:'Total Amount', required:false, desc:'Final sale value' },
  { key:'payment_mode', label:'Payment Mode', required:false, desc:'Cash / UPI / etc.' },
];

const STEPS = ['Upload File', 'Choose Import Type', 'Preview & Validate', 'Import'];
const IMPORT_LABELS = {
  sales: 'Sales Transaction Data',
  sales_by_month: 'Sales by Month',
};

export default function ImportPage() {
  const [step, setStep] = useState(0);
  const [filePath, setFilePath] = useState('');
  const [fileName, setFileName] = useState('');
  const [importType, setImportType] = useState(''); // 'sales' | 'stock'
  const [parseResult, setParseResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [electronReady, setElectronReady] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron) {
      console.log('✓ Electron API available');
      // Test the connection
      if (window.electron.excel?.test) {
        window.electron.excel.test().then(r => {
          console.log('✓ Test handler response:', r);
          setElectronReady(r?.success ?? true);
        }).catch(e => {
          console.error('✗ Test handler failed:', e);
          setElectronReady(false);
        });
      } else {
        setElectronReady(true);
      }
    } else {
      console.error('✗ Electron API not available!');
      toast.error('Electron API not loaded');
      setElectronReady(false);
    }
  }, []);

  const processFile = async (path, fname) => {
    setFilePath(path); setFileName(fname);
    setStep(1);
  };

  const handleFileSelect = async () => {
    try {
      console.log('[FRONTEND] Click: Browse File button');
      if (!window.electron?.excel?.openFileDialog) {
        console.error('[FRONTEND] ✗ openFileDialog not available!');
        toast.error('File dialog not available');
        return;
      }
      console.log('[FRONTEND] ✓ Calling openFileDialog...');
      const path = await window.electron.excel.openFileDialog();
      console.log('[FRONTEND] ✓ Dialog returned:', path ? 'FILE SELECTED' : 'NO FILE');
      
      if (!path) {
        console.log('[FRONTEND] User cancelled or no file selected');
        return;
      }
      
      const name = path.split('\\').pop().split('/').pop();
      console.log('[FRONTEND] ✓ File selected:', name, 'Full path:', path);
      processFile(path, name);
      toast.success(`File selected: ${name}`);
    } catch(e) {
      console.error('[FRONTEND] ✗ Error:', e.message);
      console.error('[FRONTEND] Stack:', e.stack);
      toast.error(`Failed to open file dialog: ${e.message}`);
    }
  };

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) return;

    const file = files[0];
    if (file?.path) {
      processFile(file.path, file.name);
      toast.success(`File selected: ${file.name}`);
    } else {
      toast.error('Drop a file from the OS file explorer');
    }
  }, []);

  const handleParse = async () => {
    toast.loading('Parsing file...', { id:'parse' });
    try {
      console.log(`Parsing ${importType} file: ${filePath}`);
      let result;
      if (importType === 'sales_by_month') {
        result = await window.electron.excel.parseSalesByMonth(filePath);
      } else {
        result = await window.electron.excel.parseFile(filePath);
      }
      console.log('Parse result:', result);
      toast.dismiss('parse');
      if (!result.success) {
        toast.error(result.error || 'Failed to parse file');
        return;
      }
      if (Array.isArray(result.records)) {
        result.records = result.records.map(r => ({ ...r, sales_type: importType }));
        result.preview = result.preview?.map(r => ({ ...r, sales_type: importType }));
      }
      setParseResult(result);
      setStep(2);
      toast.success(`Parsed ${result.totalRows} rows`);
    } catch(e) {
      console.error('Parse error:', e);
      toast.dismiss('parse');
      toast.error('Parse error: ' + e.message);
    }
  };

  const handleImport = async () => {
    if (!parseResult?.records?.length) {
      toast.error('No records to import');
      return;
    }
    setImporting(true);
    try {
      console.log(`Importing ${parseResult.records.length} ${importType} records...`);
      let result;
      result = await window.electron.db.insertSales(parseResult.records);
      console.log('Import result:', result);
      if (!result?.success && result?.error) {
        toast.error(`Import failed: ${result.error}`);
        setImporting(false);
        return;
      }
      setImportResult(result);
      setStep(3);
      const imported = result?.inserted || result?.upserted || parseResult.records.length;
      toast.success(`${imported} ${importType==='stock'?'items':'records'} imported successfully!`);
    } catch(e) {
      console.error('Import error:', e);
      toast.error(`Import failed: ${e.message}`);
    }
    setImporting(false);
  };

  const reset = () => { setStep(0); setFilePath(''); setFileName(''); setImportType(''); setParseResult(null); setImportResult(null); };

  const downloadTemplate = async (type) => {
    const isMonthly = type === 'sales_by_month';
    const templateData = isMonthly ? [
      { 'S.NO': 1, 'STOCK ITEMS': 'Sample Item', 'TOTAL': 1200 }
    ] : [
      { date:'2024-10-01', customer_name:'Sample Customer', product_name:'MALMAL KALAMKARI SAREE', category:'KALAMKARI SAREES', quantity:2, unit_price:500, total_amount:1000, profit:300, payment_mode:'Cash' }
    ];
    const columns = isMonthly ? [
      { key:'S.NO', header:'S.NO', width:8 },
      { key:'STOCK ITEMS', header:'STOCK ITEMS', width:26 },
      { key:'TOTAL', header:'TOTAL', width:14 },
    ] : [
      { key:'date', header:'Date', width:14 },
      { key:'customer_name', header:'Customer Name', width:22 },
      { key:'product_name', header:'Product Name', width:28 },
      { key:'category', header:'Category', width:20 },
      { key:'quantity', header:'Quantity', width:10 },
      { key:'unit_price', header:'Unit Price', width:12 },
      { key:'total_amount', header:'Total Amount', width:14 },
      { key:'profit', header:'Profit', width:12 },
      { key:'payment_mode', header:'Payment Mode', width:14 },
    ];
    await window.electron.excel.exportData({
      data: templateData,
      columns,
      filename: `kanthi_import_template_${type}.xlsx`,
      sheetName: type,
    });
  };

  const dropSt = {
    border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border)'}`,
    background: dragActive ? 'var(--accent-bg)' : 'var(--bg-hover)',
    borderRadius: 16,
    padding: '36px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all .2s',
  };

  return (
    <div style={{height:'100%',overflowY:'auto',padding:24}} className="scroll-area">
      <PageHeader title="Import Data" subtitle="Upload Excel or CSV files — supports your stock register format" icon={Upload} iconColor="var(--success)"
        actions={step>0 && <Button variant="ghost" size="sm" icon={RefreshCw} onClick={reset}>Start Over</Button>}/>

      {/* Step indicator */}
      <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:28,maxWidth:560}}>
        {STEPS.map((s,i)=>(
          <React.Fragment key={s}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,transition:'all .2s',background:i<step?'var(--accent)':i===step?'var(--accent-bg)':'var(--bg-hover)',border:i===step?'1px solid var(--accent-border)':'1px solid var(--border)',color:i<step?'white':i===step?'var(--accent)':'var(--text-muted)'}}>
                {i<step?'✓':i+1}
              </div>
              <span style={{fontSize:12,fontWeight:600,color:i===step?'var(--text-primary)':'var(--text-muted)'}}>{s}</span>
            </div>
            {i<STEPS.length-1 && <div style={{flex:1,height:1,background:i<step?'var(--accent)':'var(--border)',margin:'0 12px'}}/>}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step===0 && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,maxWidth:820}}>
          <div>
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={dropSt}>
              <div style={{width:56,height:56,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                <FileSpreadsheet size={26} style={{color:'var(--success)'}}/>
              </div>
              <p style={{fontSize:14,fontWeight:700,color:'var(--text-primary)',marginBottom:4}}>
                {dragActive ? 'Drop file here...' : 'Drag & drop Excel or CSV file'}
              </p>
              <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:16}}>Supports .xlsx, .xls, .csv</p>
            </div>
            <button type="button" onClick={handleFileSelect} disabled={!electronReady} style={{marginTop:16,background:electronReady?'var(--accent)':'var(--text-muted)',color:'white',border:'none',borderRadius:10,padding:'8px 20px',fontSize:13,fontWeight:600,cursor:electronReady?'pointer':'not-allowed',fontFamily:'inherit',opacity:electronReady?1:0.6}}>
              {electronReady ? 'Browse File' : 'Electron not ready'}
            </button>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Card style={{padding:16}}>
              <h3 style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',marginBottom:10}}>Supported Formats</h3>
              {[
                {icon:'📊', title:'Standard Sales Excel', desc:'invoice, date, customer, product, amount columns'},
              {icon:'📋', title:'Sales by Month', desc:'S.NO / STOCK ITEMS / TOTAL format (February-25 style)'},
                {icon:'📄', title:'Custom Format', desc:'We auto-detect and map common column names'},
              ].map(f=>(
                <div key={f.title} style={{display:'flex',gap:10,marginBottom:10}}>
                  <span style={{fontSize:16}}>{f.icon}</span>
                  <div><p style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{f.title}</p><p style={{fontSize:11,color:'var(--text-muted)'}}>{f.desc}</p></div>
                </div>
              ))}
            </Card>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={() => downloadTemplate('sales')} style={{background:'var(--bg-hover)',border:'1px solid var(--border)',borderRadius:10,padding:'10px',fontSize:12,color:'var(--text-secondary)',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}>
                ⬇ Download Sales Transaction Template
              </button>
              <button onClick={() => downloadTemplate('sales_by_month')} style={{background:'var(--bg-hover)',border:'1px solid var(--border)',borderRadius:10,padding:'10px',fontSize:12,color:'var(--text-secondary)',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}>
                ⬇ Download Sales by Month Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Choose type */}
      {step===1 && (
        <div style={{maxWidth:600}}>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
            <FileSpreadsheet size={18} style={{color:'var(--success)'}}/>
            <div>
              <p style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{fileName}</p>
            </div>
          </div>
          <h3 style={{fontSize:14,fontWeight:700,color:'var(--text-primary)',marginBottom:14}}>What type of data is this file?</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
            {[
              {id:'sales',icon:'🛒',title:'Sales Transaction Data',desc:'Records with customer, product, amount, date — adds to your sales history'},
              {id:'sales_by_month',icon:'📊',title:'Sales by Month',desc:'Monthly format: S.NO / STOCK ITEMS / TOTAL — parsed as sales records'},
            ].map(t=>(
              <button key={t.id} onClick={()=>setImportType(t.id)} style={{padding:18,background:importType===t.id?'var(--accent-bg)':'var(--bg-card)',border:`1px solid ${importType===t.id?'var(--accent-border)':'var(--border)'}`,borderRadius:14,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all .15s'}}>
                <div style={{fontSize:24,marginBottom:8}}>{t.icon}</div>
                <p style={{fontSize:13,fontWeight:700,color:importType===t.id?'var(--accent)':'var(--text-primary)',marginBottom:4}}>{t.title}</p>
                <p style={{fontSize:11,color:'var(--text-muted)'}}>{t.desc}</p>
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:10}}>
            <Button variant="ghost" onClick={()=>setStep(0)}>← Back</Button>
            <Button icon={ArrowRight} onClick={handleParse} disabled={!importType}>Parse File</Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step===2 && parseResult && (
        <div style={{maxWidth:860,display:'flex',flexDirection:'column',gap:16}}>
          {parseResult.warnings?.length > 0 && (
            <div style={{background:'var(--warning-bg)',border:'1px solid rgba(245,158,11,.2)',borderRadius:12,padding:'12px 16px'}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                <AlertCircle size={14} style={{color:'var(--warning)'}}/>
                <span style={{fontSize:12,fontWeight:700,color:'var(--warning)'}}>Warnings</span>
              </div>
              {parseResult.warnings.map((w,i)=><p key={i} style={{fontSize:11,color:'var(--text-secondary)'}}>{w}</p>)}
            </div>
          )}

          <Card>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>Data Preview (first 5 rows)</h3>
              <Badge variant="success">{parseResult.totalRows} rows ready</Badge>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)',background:'var(--bg-hover)'}}>
                    {parseResult.preview?.[0] && Object.keys(parseResult.preview[0]).slice(0,8).map(h=><th key={h} style={{textAlign:'left',padding:'6px 10px',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.preview?.map((row,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                      {Object.values(row).slice(0,8).map((v,j)=><td key={j} style={{padding:'7px 10px',color:'var(--text-primary)',whiteSpace:'nowrap',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}>{String(v||'')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {importType === 'sales_by_month' && parseResult.monthYear && (
            <div style={{background:'var(--accent-bg)',border:'1px solid var(--accent-border)',borderRadius:12,padding:'10px 14px',fontSize:12}}>
              <span style={{color:'var(--text-muted)'}}>Detected month: </span>
              <span style={{color:'var(--accent)',fontWeight:700}}>{parseResult.monthYear}</span>
              <span style={{color:'var(--text-muted)'}}> — {parseResult.totalRows} sales records will be added</span>
            </div>
          )}

          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <Button icon={importing?null:ArrowRight} onClick={handleImport} disabled={importing}>
              {importing?'Importing...': `Import ${parseResult.totalRows} Records`}
            </Button>
            <Button variant="ghost" onClick={()=>setStep(1)}>← Back</Button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step===3 && importResult && (
        <div style={{maxWidth:480}}>
          <Card style={{textAlign:'center',padding:40}}>
            <div style={{width:72,height:72,background:'var(--success-bg)',border:'1px solid rgba(16,185,129,.2)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <CheckCircle2 size={32} style={{color:'var(--success)'}}/>
            </div>
            <h2 style={{fontSize:20,fontWeight:700,color:'var(--text-primary)',marginBottom:8}}>Import Successful!</h2>
            <p style={{color:'var(--text-secondary)',marginBottom:6}}>
              <span style={{fontSize:24,fontFamily:'monospace',fontWeight:700,color:'var(--accent)'}}>{(importResult.inserted||importResult.upserted||0).toLocaleString()}</span>
            </p>
            <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:24}}>
              sales records added to database
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <Button icon={Upload} onClick={reset}>Import Another File</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
