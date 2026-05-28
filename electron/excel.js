const XLSX = require('xlsx');

function normalizeExcelDate(value) {
  if (!value) return null;

  if (typeof value === 'number') {
    const utc_days = Math.floor(value - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const year = date_info.getUTCFullYear();
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

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

// ── Month lookups ─────────────────────────────────────────────────────────────
const MONTH_MAP = {
  JANUARY: '01', FEBRUARY: '02', MARCH: '03', APRIL: '04',
  MAY: '05', JUNE: '06', JULY: '07', AUGUST: '08',
  SEPTEMBER: '09', OCTOBER: '10', NOVEMBER: '11', DECEMBER: '12',
};

const MONTH_ABBR_MAP = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04',
  MAY: '05', JUN: '06', JUL: '07', AUG: '08',
  SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/**
 * Extract "YYYY-MM-01" from any text — works on cell content AND sheet tab names.
 * Handles: "MARCH-25", "MARCH 2025", "Mar25", "Oct24", "Nov-24", "03/2025"
 */
function extractMonthDate(text) {
  if (!text) return null;
  const t = String(text).trim().toUpperCase();

  // Full month name
  const fullMatch = t.match(
    /\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)[\s\-]*(20)?(\d{2})\b/
  );
  if (fullMatch) {
    const month = MONTH_MAP[fullMatch[1]];
    const year = fullMatch[3].length === 2 ? `20${fullMatch[3]}` : fullMatch[3];
    return `${year}-${month}-01`;
  }

  // Abbreviated month: Mar25, Oct24, Nov-24, JAN-2025
  const abbrMatch = t.match(
    /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\s\-]*(20)?(\d{2})\b/
  );
  if (abbrMatch) {
    const month = MONTH_ABBR_MAP[abbrMatch[1]];
    const year = abbrMatch[3].length === 2 ? `20${abbrMatch[3]}` : abbrMatch[3];
    return `${year}-${month}-01`;
  }

  // Numeric: 03/2025 or 3-2025
  const numMatch = t.match(/\b(0?[1-9]|1[0-2])[\/\-](20\d{2})\b/);
  if (numMatch) {
    const month = String(numMatch[1]).padStart(2, '0');
    return `${numMatch[2]}-${month}-01`;
  }

  return null;
}

// ── Canonical category names ──────────────────────────────────────────────────
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
 * Detect if a row is a category section header.
 * Returns canonical category name or null.
 */
function detectCategory(rowCells) {
  const a = clean(rowCells[0]).toUpperCase();
  const b = clean(rowCells[1]).toUpperCase();

  for (const key of Object.keys(CATEGORY_MAP)) {
    if (b === key.toUpperCase()) return CATEGORY_MAP[key];
    if (a === key.toUpperCase()) return CATEGORY_MAP[key];
  }

  const cNum = num(rowCells[2]);
  if (!a && b && cNum === 0 && isNaN(Number(rowCells[1]))) {
    if (!b.includes('RANGE') && !b.includes('TOTAL') && b.length > 3) {
      for (const key of Object.keys(CATEGORY_MAP)) {
        if (b.includes(key.toUpperCase()) || key.toUpperCase().includes(b)) {
          return CATEGORY_MAP[key];
        }
      }
      return clean(rowCells[1]).toUpperCase();
    }
  }

  return null;
}

/**
 * Parse ONE worksheet (rows = array-of-arrays).
 * sheetName is used as a fallback month source (e.g. "Mar25").
 */
function parseMonthlySheet(rows, sheetName) {
  let monthDate = null;
  let currentCategory = '';
  const records = [];
  const warnings = [];

  // Try the sheet tab name first — most reliable source for month
  monthDate = extractMonthDate(sheetName);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.length) continue;

    // ── Try to detect month from cell content (title rows) ────────────────
    if (!monthDate) {
      const joined = row.map(c => clean(c)).join(' ');
      const found = extractMonthDate(joined);
      if (found) {
        monthDate = found;
        continue; // this is a title row, skip to next
      }
    } else {
      // Already have month — still skip title rows (no TOTAL value)
      const joined = row.map(c => clean(c)).join(' ').toUpperCase();
      if (extractMonthDate(joined) && !num(row[2])) {
        continue;
      }
    }

    // ── Skip column-header row ────────────────────────────────────────────
    const b = clean(row[1]).toUpperCase();
    if (b === 'STOCK ITEMS' || b === 'ITEMS') continue;

    // ── Skip RANGE and TOTAL sub-rows ─────────────────────────────────────
    if (b.includes('RANGE') || b.includes('TOTAL')) {
      warnings.push(`Row ${i + 1}: skipped sub-row "${clean(row[1])}"`);
      continue;
    }

    // ── Detect category section header ────────────────────────────────────
    const detectedCat = detectCategory(row);
    if (detectedCat) {
      currentCategory = detectedCat;
      continue;
    }

    // ── Product data row ──────────────────────────────────────────────────
    const productName = clean(row[1]);
    if (!productName) continue;

    const quantity = num(row[2]);

    records.push({
      date: monthDate,
      product_name: productName,
      category: currentCategory,
      quantity,
      total_amount: 0,
      unit_price: 0,
      profit: 0,
      sales_type: 'sales_by_month',
    });
  }

  return { records, monthDate, warnings };
}

// ── Public API ────────────────────────────────────────────────────────────────

function parseFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const records = [];
    for (const row of raw) {
      const quantity = num(row.quantity || row.Quantity || row.QTY);
      const totalAmount = num(row.total_amount || row.amount || row.Amount || row.Total);
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
 * parseSalesByMonth — reads ALL sheets in the workbook.
 *
 * Each sheet tab is one month (e.g. "Oct24", "Nov24", "Dec24", "Mar25").
 * There can be any number of sheets — all are processed.
 *
 * Returns:
 *   records      — combined array of all product rows from all sheets
 *   importDates  — unique "YYYY-MM-01" strings (one per sheet/month),
 *                  used by ImportPage to delete-before-insert per month
 *   sheetSummary — per-sheet stats for debugging
 */
function parseSalesByMonth(filePath) {
  try {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames || sheetNames.length === 0) {
      return { success: false, error: 'Workbook has no sheets' };
    }

    const allRecords = [];
    const allWarnings = [];
    const importDatesSet = new Set();
    const sheetSummary = [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: true,
      });

      const { records, monthDate, warnings } = parseMonthlySheet(rows, sheetName);

      if (monthDate) {
        importDatesSet.add(monthDate);
      } else {
        allWarnings.push(
          `[${sheetName}] Month not detected — ${records.length} records will have no date. ` +
          `Add a header like "MARCH-25" or name the tab "Mar25".`
        );
      }

      if (warnings.length) {
        allWarnings.push(...warnings.map(w => `[${sheetName}] ${w}`));
      }

      allRecords.push(...records);

      sheetSummary.push({
        sheetName,
        monthDate: monthDate || null,
        recordCount: records.length,
        detected: !!monthDate,
      });
    }

    const importDates = Array.from(importDatesSet).sort();

    // Human-readable month range label
    let monthYear = null;
    if (importDates.length === 1) {
      monthYear = importDates[0];
    } else if (importDates.length > 1) {
      monthYear = `${importDates[0]} → ${importDates[importDates.length - 1]} (${importDates.length} months)`;
    }

    return {
      success: true,
      records: allRecords,
      totalRows: allRecords.length,
      preview: allRecords.slice(0, 10),
      importDates,
      monthYear,
      sheetsProcessed: sheetNames.length,
      sheetSummary,
      warnings: allWarnings.length ? allWarnings : undefined,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Alias for backwards compatibility
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