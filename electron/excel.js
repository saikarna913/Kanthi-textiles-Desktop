const XLSX = require('xlsx');
const path = require('path');

function parseFile(filePath) {
  try {
    const wb = XLSX.readFile(filePath, { dateNF:'YYYY-MM-DD', cellDates:true, raw:false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { raw:false, defval:'' });
    if (!raw.length) return { success:false, error:'No data' };
    const CMAP = {
      'invoice no':'invoice_no','invoice_no':'invoice_no','date':'date','order date':'date','sale date':'date',
      'customer name':'customer_name','customer':'customer_name','customer type':'customer_type',
      'region':'region','state':'state','city':'city','product name':'product_name','item':'product_name',
      'stock items':'product_name','category':'category','sub category':'sub_category','sku':'sku',
      'quantity':'quantity','qty':'quantity','total':'total_amount','total amount':'total_amount',
      'amount':'total_amount','sales':'total_amount','unit price':'unit_price','price':'unit_price',
      'rate':'unit_price','discount':'discount','cost price':'cost_price','profit':'profit',
      'payment mode':'payment_mode','payment':'payment_mode','sales rep':'sales_rep','notes':'notes',
    };
    const records = raw.map(row => {
      const out = {};
      for (const [k,v] of Object.entries(row)) {
        const mk = CMAP[k.toLowerCase().trim()] || k.toLowerCase().trim().replace(/\s+/g,'_');
        out[mk] = v;
      }
      if (out.date) { const d = new Date(out.date); if (!isNaN(d)) out.date = d.toISOString().split('T')[0]; }
      ['quantity','unit_price','discount','total_amount','cost_price','profit'].forEach(f => {
        if (out[f] !== undefined) out[f] = parseFloat(String(out[f]).replace(/[₹,\s]/g,''))||0;
      });
      if (!out.total_amount && out.unit_price && out.quantity) out.total_amount = (out.unit_price-(out.discount||0))*out.quantity;
      return out;
    });
    return { success:true, records, headers:Object.keys(raw[0]), totalRows:records.length, preview:records.slice(0,5), warnings:[] };
  } catch(e) { return { success:false, error:e.message }; }
}

// Parse your exact stock register format (Month header, S.NO, STOCK ITEMS, TOTAL)
function parseStockRegister(filePath) {
  try {
    const wb = XLSX.readFile(filePath, { raw:true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header:1, raw:true, defval:'' });

    let monthYear = '';
    let currentCategory = '';
    const records = [];

    for (const row of rows) {
      const cols = row.map(c => String(c||'').trim());
      // Detect month header line like "OCTOBER-24"
      if (cols[0] && /^[A-Z]+[-–][0-9]{2,4}$/.test(cols[0].toUpperCase())) {
        monthYear = cols[0];
        continue;
      }
      // Detect category line (S.NO empty, no TOTAL number, bold text in col 1)
      const sno = cols[0];
      const itemName = cols[1] || cols[0];
      const total = cols[2] !== undefined ? cols[2] : '';

      if (!sno && itemName && (total === '' || isNaN(parseFloat(total)))) {
        currentCategory = itemName.trim();
        continue;
      }
      if (sno && !isNaN(parseInt(sno)) && itemName) {
        const qty = parseFloat(String(total).replace(/[,\s]/g,''));
        if (!isNaN(qty) || total === '0') {
          records.push({
            product_name: itemName.trim(),
            category: currentCategory,
            current_stock: isNaN(qty) ? 0 : qty,
            unit: 'pcs',
          });
        }
      }
    }
    return { success:true, records, monthYear, totalRows:records.length, preview:records.slice(0,10) };
  } catch(e) { return { success:false, error:e.message }; }
}

function exportToExcel(data, columns, filePath) {
  try {
    const headers = columns.map(c => c.header||c.key);
    const rows = data.map(row => columns.map(c => row[c.key]??''));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = columns.map(c => ({ wch: Math.max(c.width||15, (c.header||c.key).length+2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const sumSheet = XLSX.utils.aoa_to_sheet([
      ['Kanthi Textiles Export'],['Generated:', new Date().toLocaleString()],
      ['Records:', data.length],
      ['Total Sales:', data.reduce((s,r)=>s+(parseFloat(r.total_amount)||0),0).toFixed(2)],
    ]);
    XLSX.utils.book_append_sheet(wb, sumSheet, 'Summary');
    XLSX.writeFile(wb, filePath);
    return { success:true, path:filePath, rows:data.length };
  } catch(e) { return { success:false, error:e.message }; }
}

module.exports = { parseFile, parseStockRegister, exportToExcel };
