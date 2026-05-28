const XLSX = require('xlsx');

function normalizeExcelDate(value) {
  if (!value) return null;

  // Excel serial date
  if (typeof value === 'number') {
    const utc_days = Math.floor(value - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const year = date_info.getUTCFullYear();
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // String dates
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parts = trimmed.split(/[\/\-]/);
    if (parts.length === 3) {
      let d = parts[0];
      let m = parts[1];
      let y = parts[2];
      if (y.length === 2) y = `20${y}`;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed)) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function clean(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function num(v) {
  if (v === undefined || v === null || v === '') return 0;
  return parseFloat(String(v).replace(/,/g, '')) || 0;
}

// ── Canonical category names — match these exactly with what the UI filters use ──
// The section header text in the Excel file is mapped to a canonical name.
const CATEGORY_MAP = {
  'KALAMKARI SAREES': 'KALAMKARI SAREES',
  'KALAMKARI UNSTITCHED': 'KALAMKARI UNSTITCHED',
  'READYMADES': 'READYMADES',
  "MEN'S": "READYMADES - MEN'S",
  "WOMEN'S TOPS/KURTHIS": "READYMADES - WOMEN'S TOPS/KURTHIS",
  "WOMEN'S TOPS": "READYMADES - WOMEN'S TOPS/KURTHIS",
  'BAGS': 'BAGS',
  'BEDSHEETS': 'BEDSHEETS',
  'HOME ACCESSORIES': 'HOME ACCESSORIES',
  'TOWELS': 'TOWELS',
  'KALAMKARI DUPATTAS': 'KALAMKARI DUPATTAS',
  'LEISURE WARE': 'LEISURE WARE',
  'CARPETS': 'CARPETS',
  'POCHAMPALLI MATS': 'POCHAMPALLI MATS',
  'POCHAMPALI MATS': 'POCHAMPALLI MATS',
  'HANKIES': 'HANKIES',
  'SAREES': 'SAREES',
  'DRESS SETS': 'DRESS SETS',
};

/**
 * Determine if a row is a category section header.
 * Section headers in the Kanthi monthly sheet:
 *   - Column B contains the category name in all-caps (or near)
 *   - Column A is empty (or has the header text itself spread across merged cells)
 *   - Column C (TOTAL) is empty or zero
 *
 * We detect them by checking if the trimmed text matches known category names
 * OR if col A is blank and col C is blank/zero and col B is non-numeric.
 */
function detectCategory(rowCells) {
  // rowCells: [colA, colB, colC, ...]
  const a = clean(rowCells[0]).toUpperCase();
  const b = clean(rowCells[1]).toUpperCase();
  const c = clean(rowCells[2]);

  const cNum = num(rowCells[2]);

  // Direct match against known categories (col B)
  for (const key of Object.keys(CATEGORY_MAP)) {
    if (b === key.toUpperCase()) return CATEGORY_MAP[key];
  }

  // Also check if the joined row text matches (handles merged cells where text lands in col A)
  for (const key of Object.keys(CATEGORY_MAP)) {
    if (a === key.toUpperCase()) return CATEGORY_MAP[key];
  }

  // Heuristic: col A is empty, col C is empty or zero, col B is not a number
  // and col B is not an S.NO style number
  if (!a && b && cNum === 0 && isNaN(Number(rowCells[1]))) {
    // Check it doesn't look like a sub-range line e.g. "RANGE (500-600)"
    if (!b.includes('RANGE') && !b.includes('TOTAL') && b.length > 3) {
      // Try partial match
      for (const key of Object.keys(CATEGORY_MAP)) {
        if (b.includes(key.toUpperCase()) || key.toUpperCase().includes(b)) {
          return CATEGORY_MAP[key];
        }
      }
      // Return the raw text capitalised as a fallback category
      return clean(rowCells[1]).toUpperCase();
    }
  }

  return null;
}

function parseFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const records = [];

    for (const row of raw) {
      const quantity = num(row.quantity || row.Quantity || row.QTY);
      const totalAmount = num(
        row.total_amount || row.amount || row.Amount || row.Total
      );

      records.push({
        invoice_no: clean(row.invoice_no || row.Invoice || row['Invoice No']),
        date: normalizeExcelDate(row.date || row.Date),
        customer_name: clean(row.customer_name || row.Customer || row['Customer Name']),
        product_name: clean(row.product_name || row.Product || row.Item),
        category: clean(row.category),
        quantity,
        unit_price: num(row.unit_price || row['Unit Price']),
        total_amount: totalAmount,
        profit: num(row.profit),
        payment_mode: clean(row.payment_mode || row.Payment),
        sales_type: 'sales',
      });
    }

    return {
      success: true,
      records,
      totalRows: records.length,
      preview: records.slice(0, 10),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * parseSalesByMonth — parses the Kanthi monthly stock sheet format:
 *
 *   Row 1:  "MARCH-25" (month/year title — may be in col A or B)
 *   Row 2:  S.NO  |  STOCK ITEMS  |  TOTAL
 *   Row 3:  (empty A) | KALAMKARI SAREES | (empty C)  ← category header
 *   Row 4:  1  |  MALMAL SAREE (S.P)  |  573          ← product row
 *   ...
 *
 * Key rules:
 *   - Category headers: col A empty, col C empty/zero, col B is category name
 *   - Product rows: col A is a number (S.NO), col B is product name, col C is quantity
 *   - Sub-range rows: col B contains "RANGE" — skip
 *   - Summary/total rows: col B contains "TOTAL" — skip
 *   - Zero-quantity rows are included (products that sold 0 units are valid data)
 */
function parseSalesByMonth(filePath) {
  try {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: true,
    });

    let detectedMonthDate = null; // "YYYY-MM-01"
    let currentCategory = '';    // current section category name
    const records = [];
    const warnings = [];

    // ── Month name → 2-digit month number ────────────────────────────────
    const MONTH_MAP = {
      JANUARY: '01', FEBRUARY: '02', MARCH: '03', APRIL: '04',
      MAY: '05', JUNE: '06', JULY: '07', AUGUST: '08',
      SEPTEMBER: '09', OCTOBER: '10', NOVEMBER: '11', DECEMBER: '12',
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.length) continue;

      // ── 1. Detect month from any cell in the row ──────────────────────
      const joined = row.map(c => clean(c)).join(' ').toUpperCase();

      // Pattern: "MARCH-25", "MARCH 2025", "MARCH-2025", etc.
      const monthMatch = joined.match(
        /\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)[\s\-]*(20)?(\d{2})\b/
      );
      if (monthMatch) {
        const monthName = monthMatch[1];
        const yearSuffix = monthMatch[3];
        const year = yearSuffix.length === 2 ? `20${yearSuffix}` : yearSuffix;
        const month = MONTH_MAP[monthName];
        detectedMonthDate = `${year}-${month}-01`;
        continue; // title row, not a data row
      }

      // ── 2. Skip the header row (S.NO / STOCK ITEMS / TOTAL) ──────────
      const b = clean(row[1]).toUpperCase();
      if (b === 'STOCK ITEMS' || b === 'ITEMS') continue;

      // ── 3. Skip sub-range / sub-total rows ───────────────────────────
      if (b.includes('RANGE') || b.includes('TOTAL')) {
        warnings.push(`Row ${i + 1}: skipped — "${clean(row[1])}"`);
        continue;
      }

      // ── 4. Detect category section header ────────────────────────────
      const detectedCat = detectCategory(row);
      if (detectedCat) {
        currentCategory = detectedCat;
        continue; // header row, not a product row
      }

      // ── 5. Product rows: col B must be a non-empty product name ──────
      const productName = clean(row[1]);
      if (!productName) continue;

      // col C is the TOTAL (units sold). Accept 0 as a valid value.
      const rawQty = row[2];
      const quantity = num(rawQty);

      // col A is S.NO (a number) — validate this looks like a product row
      const sno = clean(row[0]);
      const snoIsNumber = sno !== '' && !isNaN(Number(sno));

      // If col A is empty and col C is empty, this might be a stray row — skip
      if (!snoIsNumber && quantity === 0 && !productName) continue;

      records.push({
        date: detectedMonthDate,
        product_name: productName,
        category: currentCategory,
        quantity,        // units sold (stored as quantity in the importer)
        total_amount: 0, // not available in this format
        unit_price: 0,
        profit: 0,
        sales_type: 'sales_by_month',
      });
    }

    if (!detectedMonthDate) {
      warnings.push('Could not detect month/year from the sheet. Import will use today\'s date.');
    }

    return {
      success: true,
      records,
      totalRows: records.length,
      preview: records.slice(0, 10),
      monthYear: detectedMonthDate,
      importDates: detectedMonthDate ? [detectedMonthDate] : [],
      warnings: warnings.length ? warnings : undefined,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Keep parseStockRegister as alias for backwards compatibility
const parseStockRegister = parseSalesByMonth;

function exportToExcel(data, columns, filePath, sheetName = 'Sheet1') {
  try {
    const rows = data.map(row => {
      const obj = {};
      for (const col of columns) {
        obj[col.header] = row[col.key];
      }
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filePath);

    return { success: true, rows: data.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  parseFile,
  parseSalesByMonth,
  parseStockRegister,
  exportToExcel,
};