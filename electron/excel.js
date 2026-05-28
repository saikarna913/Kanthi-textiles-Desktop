const XLSX = require('xlsx');
const path = require('path');

// Robust number parser: strip currency symbols, thousands separators, handle
// parentheses for negatives and non-breaking spaces. Returns NaN when unparsable.
function parseNumber(v) {
  if (v === undefined || v === null || v === '') return NaN;
  let s = String(v).trim();
  // handle (1,234.56) as negative
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.replace(/^\(|\)$/g, ''); }
  // normalize common separators and symbols
  s = s.replace(/[,\s\u00A0]/g, ''); // remove commas and spaces (including NBSP)
  s = s.replace(/₹|Rs\.?|INR/ig, '');
  // remove any non-digit except dot and minus
  s = s.replace(/[^0-9.\-]/g, '');
  // if multiple dots, collapse extras (keep last as decimal)
  const dots = (s.match(/\./g) || []).length;
  if (dots > 1) {
    const parts = s.split('.');
    const dec = parts.pop();
    s = parts.join('') + '.' + dec;
  }
  const n = parseFloat(s);
  if (isNaN(n)) return NaN;
  return neg ? -Math.abs(n) : n;
}
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
        if (out[f] !== undefined) {
          // preserve raw value and parse to number robustly
          out[`raw_${f}`] = out[f];
          const parsed = parseNumber(out[f]);
          out[f] = isNaN(parsed) ? 0 : parsed;
        }
      });
      if (!out.total_amount && out.unit_price && out.quantity) out.total_amount = (out.unit_price-(out.discount||0))*out.quantity;
      return out;
    });
    return { success:true, records, headers:Object.keys(raw[0]), totalRows:records.length, preview:records.slice(0,5), warnings:[] };
  } catch(e) { return { success:false, error:e.message }; }
}

// Parse your exact sales-by-month workbook format: each sheet is a month, each sheet has Month header, S.NO, STOCK ITEMS, TOTAL
function parseSalesByMonth(filePath) {
  try {
    const wb = XLSX.readFile(filePath, { raw:true });
    const sheetSummaries = [];
    const records = [];

    const monthNameMap = {
      JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11,
      JANUARY:0,FEBRUARY:1,MARCH:2,APRIL:3,MAY:4,JUNE:5,JULY:6,AUGUST:7,SEPTEMBER:8,OCTOBER:9,NOVEMBER:10,DECEMBER:11,
    };

    const normalizeMonthYear = (text) => {
      if (!text) return null;
      const trimmed = String(text||'').trim().toUpperCase().replace(/\s+/g,' ');
      const direct = trimmed.replace('–','-').replace('\u2013','-').replace('\u2014','-');
      const parts = direct.split(/[- ]+/).filter(Boolean);
      if (parts.length >= 2) {
        const year = parts[parts.length-1];
        const monthPart = parts.slice(0, parts.length-1).join(' ');
        const monthKey = monthPart.substring(0, 3);
        const month = monthNameMap[monthPart] ?? monthNameMap[monthKey];
        if (month !== undefined && /^\d{2,4}$/.test(year)) {
          const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
          return `${monthPart.charAt(0)+monthPart.slice(1).toLowerCase()}-${fullYear}`;
        }
      }
      const compactMatch = direct.match(/^([A-Z]{3,9})(\d{2,4})$/);
      if (compactMatch) {
        const monthPart = compactMatch[1];
        const year = compactMatch[2];
        const monthKey = monthPart.substring(0, 3);
        const month = monthNameMap[monthPart] ?? monthNameMap[monthKey];
        if (month !== undefined) {
          const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
          const monthText = monthPart.charAt(0)+monthPart.slice(1).toLowerCase();
          return `${monthText}-${fullYear}`;
        }
      }
      if (monthNameMap[trimmed] !== undefined) {
        return `${trimmed.charAt(0)+trimmed.slice(1).toLowerCase()}-${new Date().getFullYear()}`;
      }
      return null;
    };

    const parseSheet = (sheetName) => {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header:1, raw:true, defval:'' });
      let monthYear = normalizeMonthYear(sheetName);
      let currentCategory = '';
      const sheetRecords = [];
      const warnings = [];

      const headerPatterns = [/^S\.?NO$/i, /^STOCK\s*ITEMS$/i, /^TOTAL$/i, /^MONTH$/i, /^CATALOGUE$/i];
      const isHeaderRow = (cols) => {
        const normalized = cols.map(c => String(c||'').trim().toUpperCase());
        return normalized.some(v => headerPatterns.some(rx => rx.test(v))) && normalized.filter(Boolean).length >= 2;
      };

      for (const row of rows) {
        const cols = row.map(c => String(c||'').trim());
        if (!monthYear && cols[0] && /^[A-Z][A-Z ]+[ -–—]?[0-9]{2,4}$/.test(cols[0].toUpperCase())) {
          monthYear = normalizeMonthYear(cols[0]);
          continue;
        }

        if (isHeaderRow(cols)) {
          continue;
        }

        const sno = cols[0];
        const itemName = cols[1] || cols[0];
        const total = cols[2] !== undefined ? cols[2] : '';
        const totalValue = parseNumber(total);
        if (!sno && itemName && (total === '' || isNaN(totalValue))) {
          currentCategory = itemName.trim();
          continue;
        }

        if (sno && !isNaN(parseInt(sno, 10)) && itemName) {
          if (!isNaN(totalValue) || String(total).trim() === '0') {
            let saleDate = new Date();
            if (monthYear) {
              const parts = monthYear.split('-');
              const monthKey = parts[0].substring(0, 3).toUpperCase();
              const month = monthNameMap[monthKey] ?? 0;
              const year = parseInt(parts[1], 10) || new Date().getFullYear();
              saleDate = new Date(year, month, 1);
            }
            const mappedValue = isNaN(totalValue) ? 0 : totalValue;
            sheetRecords.push({
              date: saleDate.toISOString().split('T')[0],
              product_name: itemName.trim(),
              category: currentCategory,
              total_amount: mappedValue,
              quantity: mappedValue,
              raw_total: cols[2],
              customer_name: '',
              payment_mode: 'Cash',
            });
          }
          continue;
        }
      }

      if (!sheetRecords.length) {
        warnings.push(`Sheet '${sheetName}' contained no sales rows.`);
      }

      sheetSummaries.push({ sheetName, monthYear: monthYear || sheetName, rows: sheetRecords.length });
      records.push(...sheetRecords);
      return warnings;
    };

    const allWarnings = [];
    wb.SheetNames.forEach(sheetName => {
      const warnings = parseSheet(sheetName);
      allWarnings.push(...warnings);
    });

    const monthYear = sheetSummaries.map(s => s.monthYear).filter(Boolean).join(', ');
    return {
      success:true,
      records,
      monthYear,
      totalRows: records.length,
      preview: records.slice(0, 10),
      warnings: allWarnings,
      sheetSummaries,
    };
  } catch(e) { return { success:false, error:e.message }; }
}

function exportToExcel(data, columns, filePath, sheetName = 'Data') {
  try {
    const headers = columns.map(c => c.header||c.key);
    const rows = data.map(row => columns.map(c => row[c.key]??''));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = columns.map(c => ({ wch: Math.max(c.width||15, (c.header||c.key).length+2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
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

module.exports = { parseFile, parseStockRegister: parseSalesByMonth, parseSalesByMonth, exportToExcel };
