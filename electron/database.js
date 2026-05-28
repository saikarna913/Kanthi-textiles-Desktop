const path = require('path');
const fs = require('fs');

module.exports = function createDatabase(appDataPath) {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.error('better-sqlite3 load error:', e.message);
    throw e;
  }

  const dbPath = path.join(appDataPath, 'kanthi_v2.db');
  console.log('DB path:', dbPath);

  const db = new Database(dbPath, { verbose: null });

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 10000');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');

  // ── Schema ────────────────────────────────────────────────────────────────
  db.exec(`
CREATE TABLE IF NOT EXISTS transaction_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT,
  date TEXT NOT NULL,
  customer_id INTEGER,
  customer_name TEXT,
  customer_type TEXT DEFAULT 'Retail',
  region TEXT DEFAULT '',
  state TEXT DEFAULT '',
  city TEXT DEFAULT '',
  product_name TEXT NOT NULL,
  category TEXT DEFAULT 'Uncategorized',
  sub_category TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  quantity REAL DEFAULT 1,
  unit_price REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  cost_price REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  payment_mode TEXT DEFAULT 'Cash',
  sales_rep TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS monthly_product_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_key TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  date TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT DEFAULT '',
  sub_category TEXT DEFAULT '',
  units_sold REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(month_key, product_name)
);

CREATE INDEX IF NOT EXISTS idx_tx_date ON transaction_sales(date);
CREATE INDEX IF NOT EXISTS idx_tx_customer ON transaction_sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transaction_sales(category);
CREATE INDEX IF NOT EXISTS idx_monthly_date ON monthly_product_sales(date);
CREATE INDEX IF NOT EXISTS idx_monthly_product ON monthly_product_sales(product_name);
CREATE INDEX IF NOT EXISTS idx_monthly_category ON monthly_product_sales(category);
CREATE INDEX IF NOT EXISTS idx_monthly_monthkey ON monthly_product_sales(month_key);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  customer_type TEXT DEFAULT 'Retail',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  region TEXT DEFAULT '',
  city TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  credit_limit REAL DEFAULT 0,
  credit_days INTEGER DEFAULT 0,
  total_purchases REAL DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  first_purchase TEXT DEFAULT '',
  last_purchase TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE,
  product_name TEXT,
  category TEXT DEFAULT '',
  sub_category TEXT DEFAULT '',
  unit TEXT DEFAULT 'pcs',
  current_stock REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  max_stock REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  supplier TEXT DEFAULT '',
  supplier_contact TEXT DEFAULT '',
  lead_time_days INTEGER DEFAULT 0,
  last_restocked TEXT DEFAULT '',
  last_delivery_date TEXT DEFAULT '',
  next_expected_delivery TEXT DEFAULT '',
  reorder_point REAL DEFAULT 0,
  location TEXT DEFAULT '',
  barcode TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventory_id INTEGER,
  transaction_type TEXT,
  quantity REAL,
  balance_after REAL,
  unit_cost REAL,
  supplier TEXT,
  notes TEXT,
  transaction_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dynamic_tables (
  table_name TEXT PRIMARY KEY,
  display_name TEXT,
  columns_json TEXT,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
  `);

  const SALES_TABLE = 'transaction_sales';
  const MONTHLY_TABLE = 'monthly_product_sales';

  function tableNameForType(salesType) {
    return salesType === 'sales_by_month' ? MONTHLY_TABLE : SALES_TABLE;
  }

  function amountColumnForType(salesType) {
    return salesType === 'sales_by_month' ? 'units_sold' : 'total_amount';
  }

  function quantityColumnForType(salesType) {
    return salesType === 'sales_by_month' ? 'units_sold' : 'quantity';
  }

  function profitColumnForType(salesType) {
    return salesType === 'sales_by_month' ? '0' : 'profit';
  }

  function buildWhere(filters) {
    const { search, category, region, salesType, dateFrom, dateTo, customerId, customerName } = filters || {};
    const where = [];
    const args = [];
    if (search) {
      if (salesType === 'sales_by_month') {
        where.push(`(product_name LIKE ? OR category LIKE ?)`);
        args.push(`%${search}%`, `%${search}%`);
      } else {
        where.push(`(customer_name LIKE ? OR product_name LIKE ? OR invoice_no LIKE ?)`);
        args.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    }
    if (customerName && salesType !== 'sales_by_month') {
      where.push(`customer_name LIKE ?`);
      args.push(`%${customerName}%`);
    }
    if (category) { where.push(`category = ?`); args.push(category); }
    if (region && salesType !== 'sales_by_month') { where.push(`region = ?`); args.push(region); }
    if (dateFrom) { where.push(`date >= ?`); args.push(dateFrom); }
    if (dateTo) { where.push(`date <= ?`); args.push(dateTo); }
    if (customerId && salesType !== 'sales_by_month') { where.push(`customer_id = ?`); args.push(customerId); }
    return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
  }

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  function getDashboardStats(params) {
    const { salesType } = params || {};
    const table = tableNameForType(salesType);
    const amountCol = amountColumnForType(salesType);
    const profitExpr = profitColumnForType(salesType);

    const totalSales = db.prepare(`SELECT COALESCE(SUM(${amountCol}),0) as v FROM ${table}`).get().v;
    const totalOrders = db.prepare(`SELECT COUNT(*) as v FROM ${table}`).get().v;
    const totalProfit = salesType === 'sales_by_month'
      ? 0
      : db.prepare(`SELECT COALESCE(SUM(${profitExpr}),0) as v FROM ${table}`).get().v;
    const avgOrder = db.prepare(`SELECT COALESCE(AVG(${amountCol}),0) as v FROM ${table}`).get().v;
    const uniqueCustomers = salesType === 'sales_by_month'
      ? 0
      : db.prepare(`SELECT COUNT(DISTINCT customer_name) as v FROM ${table} WHERE customer_name != ''`).get().v;
    const thisMonth = db.prepare(`SELECT COALESCE(SUM(${amountCol}),0) as v FROM ${table} WHERE strftime('%Y-%m',date)=strftime('%Y-%m','now')`).get().v;
    const lastMonth = db.prepare(`SELECT COALESCE(SUM(${amountCol}),0) as v FROM ${table} WHERE strftime('%Y-%m',date)=strftime('%Y-%m',date('now','-1 month'))`).get().v;
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
    const lowStock = db.prepare(`SELECT COUNT(*) as v FROM inventory WHERE current_stock <= min_stock`).get().v;
    const totalInvValue = db.prepare(`SELECT COALESCE(SUM(current_stock*unit_cost),0) as v FROM inventory`).get().v;
    const totalCustomers = db.prepare(`SELECT COUNT(*) as v FROM customers`).get().v;

    return {
      totalSales, totalOrders, totalProfit,
      avgOrderValue: avgOrder,
      uniqueCustomers, thisMonthSales: thisMonth, lastMonthSales: lastMonth,
      monthGrowth: growth, lowStockItems: lowStock,
      totalInventoryValue: totalInvValue, totalCustomers,
    };
  }

  // ── Monthly Sales chart ───────────────────────────────────────────────────
  function getMonthlySales(monthsOrParams) {
    const opts = typeof monthsOrParams === 'object' && monthsOrParams !== null
      ? monthsOrParams : { months: monthsOrParams };
    const m = parseInt(opts.months) || 12;
    const { salesType } = opts;

    if (salesType === 'sales_by_month') {
      return db.prepare(`
        SELECT
          strftime('%Y-%m', date) as month,
          strftime('%Y-%m', date) as label,
          ROUND(SUM(units_sold),2) as sales,
          0 as profit,
          COUNT(*) as orders,
          0 as customers
        FROM monthly_product_sales
        WHERE date >= date('now', '-${m} months')
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month ASC
      `).all();
    }

    return db.prepare(`
      SELECT
        strftime('%Y-%m', date) as month,
        strftime('%Y-%m', date) as label,
        ROUND(SUM(total_amount),2) as sales,
        ROUND(SUM(profit),2) as profit,
        COUNT(*) as orders,
        COUNT(DISTINCT customer_name) as customers
      FROM transaction_sales
      WHERE date >= date('now', '-${m} months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `).all();
  }

  // ── Product monthly sales (for per-product time series) ──────────────────
  function getProductMonthlySales(params) {
    const { productName, months = 12, salesType = 'sales_by_month' } = params || {};
    if (!productName) return [];

    if (salesType === 'sales_by_month') {
      return db.prepare(`
        SELECT
          strftime('%Y-%m', date) as month,
          strftime('%Y-%m', date) as label,
          ROUND(SUM(units_sold),2) as qty,
          COUNT(*) as rows
        FROM monthly_product_sales
        WHERE product_name = ?
          AND date >= date('now', '-${parseInt(months) || 12} months')
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month ASC
      `).all(productName);
    }

    return db.prepare(`
      SELECT
        strftime('%Y-%m', date) as month,
        strftime('%Y-%m', date) as label,
        ROUND(SUM(quantity),2) as qty,
        COUNT(*) as rows
      FROM transaction_sales
      WHERE product_name = ?
        AND date >= date('now', '-${parseInt(months) || 12} months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `).all(productName);
  }

  // ── Month-over-Month comparison ───────────────────────────────────────────
  // FIX: default months raised to 12 to show full year by default
  function getMonthOverMonth(params) {
    const { salesType = 'sales_by_month', months = 12 } = params || {};

    if (salesType === 'sales_by_month') {
      const rows = db.prepare(`
        SELECT
          strftime('%Y-%m', date) as month,
          strftime('%Y-%m', date) as label,
          ROUND(SUM(units_sold),2) as value,
          COUNT(DISTINCT product_name) as products
        FROM monthly_product_sales
        WHERE date >= date('now', '-${parseInt(months) || 12} months')
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month ASC
      `).all();
      return rows.map((row, i) => {
        const prev = i > 0 ? rows[i - 1].value : null;
        const change = prev != null && prev > 0 ? ((row.value - prev) / prev) * 100 : null;
        return { ...row, prevValue: prev, change: change != null ? Math.round(change * 10) / 10 : null };
      });
    }

    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', date) as month,
        strftime('%Y-%m', date) as label,
        ROUND(SUM(total_amount),2) as value,
        COUNT(DISTINCT product_name) as products
      FROM transaction_sales
      WHERE date >= date('now', '-${parseInt(months) || 12} months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `).all();

    return rows.map((row, i) => {
      const prev = i > 0 ? rows[i - 1].value : null;
      const change = prev != null && prev > 0 ? ((row.value - prev) / prev) * 100 : null;
      return { ...row, prevValue: prev, change: change != null ? Math.round(change * 10) / 10 : null };
    });
  }

  // ── Top Products ──────────────────────────────────────────────────────────
  function getTopProducts(limitOrParams) {
    const opts = typeof limitOrParams === 'object' && limitOrParams !== null
      ? limitOrParams : { limit: limitOrParams };
    const l = parseInt(opts.limit) || 10;
    const { salesType } = opts;

    if (salesType === 'sales_by_month') {
      return db.prepare(`
        SELECT
          product_name, category,
          ROUND(SUM(units_sold),2) as total_qty,
          ROUND(SUM(units_sold),2) as total_sales,
          0 as total_profit,
          COUNT(*) as order_count,
          0 as avg_price,
          COUNT(DISTINCT month_key) as months_appeared
        FROM monthly_product_sales
        GROUP BY product_name
        ORDER BY total_qty DESC
        LIMIT ${l}
      `).all();
    }

    return db.prepare(`
      SELECT
        product_name, category,
        ROUND(SUM(quantity),2) as total_qty,
        ROUND(SUM(total_amount),2) as total_sales,
        ROUND(SUM(profit),2) as total_profit,
        COUNT(*) as order_count,
        ROUND(AVG(unit_price),2) as avg_price,
        COUNT(DISTINCT strftime('%Y-%m', date)) as months_appeared
      FROM transaction_sales
      GROUP BY product_name
      ORDER BY SUM(total_amount) DESC
      LIMIT ${l}
    `).all();
  }

  // ── Category breakdown by month (stacked view) ────────────────────────────
  function getCategoryMonthly(params) {
    const { salesType = 'sales_by_month', months = 6 } = params || {};
    if (salesType === 'sales_by_month') {
      return db.prepare(`
        SELECT
          strftime('%Y-%m', date) as month,
          strftime('%Y-%m', date) as label,
          category,
          ROUND(SUM(units_sold),2) as value
        FROM monthly_product_sales
        WHERE date >= date('now', '-${parseInt(months) || 6} months')
          AND category IS NOT NULL AND category != ''
        GROUP BY strftime('%Y-%m', date), category
        ORDER BY month ASC, value DESC
      `).all();
    }
    return db.prepare(`
      SELECT
        strftime('%Y-%m', date) as month,
        strftime('%Y-%m', date) as label,
        category,
        ROUND(SUM(total_amount),2) as value
      FROM transaction_sales
      WHERE date >= date('now', '-${parseInt(months) || 6} months')
        AND category IS NOT NULL AND category != ''
      GROUP BY strftime('%Y-%m', date), category
      ORDER BY month ASC, value DESC
    `).all();
  }

  // ── Sales Data (paginated) ────────────────────────────────────────────────
  function getSalesData(params) {
    const {
      page = 1, limit = 50, sortBy = 'date', sortDir = 'DESC',
      search, category, region, salesType, dateFrom, dateTo, customerId, customerName
    } = params || {};

    const table = tableNameForType(salesType);
    const { clause, args } = buildWhere({ search, category, region, salesType, dateFrom, dateTo, customerId, customerName });
    const offset = (page - 1) * limit;

    // Map UI sort keys to real column names for monthly table
    let sortCol = sortBy;
    if (salesType === 'sales_by_month') {
      if (sortBy === 'quantity' || sortBy === 'total_amount') sortCol = 'units_sold';
    }
    const safeCols = salesType === 'sales_by_month'
      ? ['date', 'product_name', 'category', 'units_sold', 'month_key', 'year', 'month']
      : ['date', 'total_amount', 'customer_name', 'product_name', 'profit', 'quantity', 'invoice_no', 'payment_mode'];
    const sb = safeCols.includes(sortCol) ? sortCol : 'date';
    const sd = sortDir === 'ASC' ? 'ASC' : 'DESC';

    const total = db.prepare(`SELECT COUNT(*) as count FROM ${table} ${clause}`).get(...args);

    // FIX: explicitly alias units_sold → quantity so the React table key 'quantity' works
    const selectCols = salesType === 'sales_by_month'
      ? 'id, month_key, year, month, date, product_name, category, sub_category, units_sold AS quantity'
      : '*';

    const rows = db.prepare(
      `SELECT ${selectCols} FROM ${table} ${clause} ORDER BY ${sb} ${sd} LIMIT ? OFFSET ?`
    ).all(...args, limit, offset);

    return { rows, total: total.count, page, limit };
  }

  function getSaleById(id) {
    let row = db.prepare(`SELECT * FROM transaction_sales WHERE id = ?`).get(id);
    if (row) return row;
    row = db.prepare(
      `SELECT id, month_key, year, month, date, product_name, category, sub_category, units_sold AS quantity
       FROM monthly_product_sales WHERE id = ?`
    ).get(id);
    return row;
  }

  // ── Insert single sale ────────────────────────────────────────────────────
  function insertSale(data) {
    const salesType = data.sales_type || data.salesType || 'sales';
    const date = normalizeDate(data.date || new Date().toISOString().split('T')[0]);

    if (salesType === 'sales_by_month') {
      // FIX: parse date parts without using Date constructor (avoids UTC shift)
      const parts = String(date).split('-');
      const year = parseInt(parts[0]) || new Date().getFullYear();
      const month = parseInt(parts[1]) || (new Date().getMonth() + 1);
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const units = parseFloat(data.quantity || data.units_sold || 0) || 0;
      const existing = db.prepare(
        `SELECT id FROM monthly_product_sales WHERE month_key = ? AND product_name = ?`
      ).get(monthKey, data.product_name || '');
      if (existing) {
        db.prepare(
          `UPDATE monthly_product_sales SET units_sold = ?, category = ?, sub_category = ?,
           updated_at = datetime('now') WHERE id = ?`
        ).run(units, data.category || '', data.sub_category || '', existing.id);
        return { success: true, id: existing.id, updated: true };
      }
      const info = db.prepare(
        `INSERT INTO monthly_product_sales (month_key, year, month, date, product_name, category, sub_category, units_sold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(monthKey, year, month, date, data.product_name || '', data.category || '', data.sub_category || '', units);
      return { success: true, id: info.lastInsertRowid };
    }

    const stmt = db.prepare(`
      INSERT INTO transaction_sales (
        invoice_no,date,customer_id,customer_name,customer_type,region,state,city,
        product_name,category,sub_category,sku,quantity,unit_price,discount,total_amount,
        cost_price,profit,payment_mode,sales_rep,notes
      ) VALUES (
        @invoice_no,@date,@customer_id,@customer_name,@customer_type,@region,@state,@city,
        @product_name,@category,@sub_category,@sku,@quantity,@unit_price,@discount,@total_amount,
        @cost_price,@profit,@payment_mode,@sales_rep,@notes
      )
    `);
    const info = stmt.run({
      invoice_no: data.invoice_no || '', date,
      customer_id: data.customer_id || null, customer_name: data.customer_name || '',
      customer_type: data.customer_type || 'Retail', region: data.region || '',
      state: data.state || '', city: data.city || '', product_name: data.product_name || '',
      category: data.category || '', sub_category: data.sub_category || '', sku: data.sku || '',
      quantity: parseFloat(data.quantity) || 1, unit_price: parseFloat(data.unit_price) || 0,
      discount: parseFloat(data.discount) || 0, total_amount: parseFloat(data.total_amount) || 0,
      cost_price: parseFloat(data.cost_price) || 0, profit: parseFloat(data.profit) || 0,
      payment_mode: data.payment_mode || 'Cash', sales_rep: data.sales_rep || '',
      notes: data.notes || '',
    });
    updateCustomerStats(data.customer_name, date);
    return { success: true, id: info.lastInsertRowid };
  }

  // ── Bulk insert sales ─────────────────────────────────────────────────────
  function insertSales(records) {
    if (!Array.isArray(records)) return { success: false, error: 'Invalid records' };

    const tx = db.transaction((rows) => {
      let inserted = 0;
      const insertTx = db.prepare(`
        INSERT INTO transaction_sales (
          invoice_no,date,customer_name,product_name,category,quantity,unit_price,total_amount,profit,payment_mode
        ) VALUES (?,?,?,?,?,?,?,?,?,?)`
      );
      const insertMonthly = db.prepare(`
        INSERT INTO monthly_product_sales (month_key,year,month,date,product_name,category,sub_category,units_sold)
        VALUES (?,?,?,?,?,?,?,?)`
      );
      const updateMonthly = db.prepare(`
        UPDATE monthly_product_sales SET units_sold = ?, category = ?, sub_category = ?,
        updated_at = datetime('now') WHERE id = ?`
      );
      const selectMonthly = db.prepare(
        `SELECT id FROM monthly_product_sales WHERE month_key = ? AND product_name = ?`
      );

      for (const row of rows) {
        const salesType = row.sales_type || row.salesType || 'sales';
        const date = normalizeDate(row.date || new Date().toISOString().split('T')[0]);

        if (salesType === 'sales_by_month') {
          // FIX: parse by splitting, no Date constructor
          const parts = String(date).split('-');
          const year = parseInt(parts[0]) || new Date().getFullYear();
          const month = parseInt(parts[1]) || (new Date().getMonth() + 1);
          const monthKey = `${year}-${String(month).padStart(2, '0')}`;
          // quantity field holds the unit count (set by importer before calling insertSales)
          const units = parseFloat(row.quantity || row.units_sold || 0) || 0;
          const existing = selectMonthly.get(monthKey, row.product_name || '');
          if (existing) {
            updateMonthly.run(units, row.category || '', row.sub_category || '', existing.id);
          } else {
            insertMonthly.run(
              monthKey, year, month, date,
              row.product_name || '', row.category || '', row.sub_category || '', units
            );
          }
          inserted++;
          continue;
        }

        insertTx.run(
          row.invoice_no || '',
          date,
          row.customer_name || '',
          row.product_name || '',
          row.category || '',
          parseFloat(row.quantity) || 0,
          parseFloat(row.unit_price) || 0,
          parseFloat(row.total_amount) || 0,
          parseFloat(row.profit) || 0,
          row.payment_mode || ''
        );
        inserted++;
      }
      return inserted;
    });

    try {
      const inserted = tx(records);
      return { success: true, inserted };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function normalizeDate(d) {
    if (!d) return new Date().toISOString().split('T')[0];
    const s = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${mo}-${day}`;
    }
    return new Date().toISOString().split('T')[0];
  }

  function updateSale(id, data) {
    const txRow = db.prepare(`SELECT id FROM transaction_sales WHERE id = ?`).get(id);
    if (txRow) {
      const allowed = ['invoice_no', 'date', 'customer_name', 'customer_type', 'region', 'state', 'city',
        'product_name', 'category', 'sub_category', 'sku', 'quantity', 'unit_price', 'discount',
        'total_amount', 'cost_price', 'profit', 'payment_mode', 'sales_rep', 'notes'];
      const fields = Object.keys(data).filter(k => allowed.includes(k));
      if (!fields.length) return { success: false, error: 'No valid fields' };
      const sets = fields.map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE transaction_sales SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
      return { success: true };
    }
    const mb = db.prepare(`SELECT id FROM monthly_product_sales WHERE id = ?`).get(id);
    if (mb) {
      const allowed = ['date', 'product_name', 'category', 'sub_category', 'units_sold'];
      const fields = Object.keys(data).filter(k => allowed.includes(k));
      if (!fields.length) return { success: false, error: 'No valid fields' };
      const sets = fields.map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE monthly_product_sales SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
      return { success: true };
    }
    return { success: false, error: 'Record not found' };
  }

  function deleteSale(id) {
    let info = db.prepare(`DELETE FROM transaction_sales WHERE id = ?`).run(id);
    if (info.changes > 0) return { success: true, deleted: info.changes };
    info = db.prepare(`DELETE FROM monthly_product_sales WHERE id = ?`).run(id);
    return { success: true, deleted: info.changes };
  }

  function deleteSalesByIds(ids, params = {}) {
    if (!Array.isArray(ids) || !ids.length) return { success: false, error: 'No IDs' };
    const table = tableNameForType(params.salesType);
    const ph = ids.map(() => '?').join(',');
    const info = db.prepare(`DELETE FROM ${table} WHERE id IN (${ph})`).run(...ids);
    return { success: true, deleted: info.changes };
  }

  // FIX: allow salesType-only deletion (no other filters) for "Delete all" by type
  function deleteSalesByFilter(params) {
    const { salesType } = params || {};
    const table = tableNameForType(salesType);
    const { clause, args } = buildWhere(params);

    // If no row-level filters, truncate the whole table for this type
    if (!clause) {
      const info = db.prepare(`DELETE FROM ${table}`).run();
      return { success: true, deleted: info.changes };
    }

    const info = db.prepare(`DELETE FROM ${table} ${clause}`).run(...args);
    return { success: true, deleted: info.changes };
  }

  function deleteAllSales(params = {}) {
    const table = params.salesType ? tableNameForType(params.salesType) : null;
    if (table) {
      const info = db.prepare(`DELETE FROM ${table}`).run();
      return { success: true, deleted: info.changes };
    }
    const info1 = db.prepare(`DELETE FROM transaction_sales`).run();
    const info2 = db.prepare(`DELETE FROM monthly_product_sales`).run();
    return { success: true, deleted: info1.changes + info2.changes };
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  function getCategoryAnalysis(params) {
    const { salesType } = params || {};

    if (salesType === 'sales_by_month') {
      // For monthly data: aggregate units sold per category
      return db.prepare(`
        SELECT
          category,
          COUNT(*) as transactions,
          ROUND(SUM(units_sold),2) as total_qty,
          ROUND(SUM(units_sold),2) as total_sales,
          0 as total_profit,
          ROUND(AVG(units_sold),2) as avg_sale,
          0 as margin_pct
        FROM monthly_product_sales
        WHERE category IS NOT NULL AND category != ''
        GROUP BY category
        ORDER BY total_qty DESC
      `).all();
    }

    return db.prepare(`
      SELECT
        category,
        COUNT(*) as transactions,
        ROUND(SUM(quantity),2) as total_qty,
        ROUND(SUM(total_amount),2) as total_sales,
        ROUND(SUM(profit),2) as total_profit,
        ROUND(AVG(total_amount),2) as avg_sale,
        CASE
          WHEN SUM(total_amount)=0 THEN 0
          ELSE ROUND(SUM(profit)/SUM(total_amount)*100,2)
        END as margin_pct
      FROM transaction_sales
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY total_sales DESC
    `).all();
  }

  function getRegionAnalysis(params) {
    const { salesType } = params || {};
    if (salesType === 'sales_by_month') return [];
    return db.prepare(`
      SELECT
        region, COUNT(*) as transactions,
        COUNT(DISTINCT customer_name) as customers,
        ROUND(SUM(total_amount),2) as total_sales,
        ROUND(SUM(profit),2) as total_profit,
        ROUND(AVG(total_amount),2) as avg_sale
      FROM transaction_sales
      WHERE region IS NOT NULL AND region != ''
      GROUP BY region ORDER BY total_sales DESC
    `).all();
  }

  function getTimeSeries(params) {
    const { granularity = 'monthly', months = 24, salesType, metric = 'sales' } = params || {};
    const fmts = { daily: '%Y-%m-%d', weekly: '%Y-%W', monthly: '%Y-%m' };
    const fmt = fmts[granularity] || '%Y-%m';
    const table = tableNameForType(salesType);

    // FIX: for sales_by_month, revenue/quantity both map to units_sold
    let valueExpr;
    if (salesType === 'sales_by_month') {
      valueExpr = metric === 'orders' ? 'COUNT(*)' : 'ROUND(SUM(units_sold),2)';
    } else {
      if (metric === 'profit') valueExpr = 'ROUND(SUM(profit),2)';
      else if (metric === 'orders') valueExpr = 'COUNT(*)';
      else valueExpr = 'ROUND(SUM(total_amount),2)';
    }

    const salesExpr = salesType === 'sales_by_month' ? 'ROUND(SUM(units_sold),2)' : 'ROUND(SUM(total_amount),2)';
    const unitsExpr = salesType === 'sales_by_month' ? 'ROUND(SUM(units_sold),2)' : 'ROUND(SUM(quantity),2)';

    const data = db.prepare(`
      SELECT
        strftime('${fmt}', date) as period,
        ${valueExpr} as value,
        COUNT(*) as count,
        ${salesExpr} as sales,
        ${unitsExpr} as units,
        ${salesType === 'sales_by_month' ? '0' : 'ROUND(SUM(profit),2)'} as profit
      FROM ${table}
      WHERE date >= date('now', '-${parseInt(months) || 24} months')
      GROUP BY strftime('${fmt}', date)
      ORDER BY period ASC
    `).all();

    return data.map((d, i) => {
      const window = data.slice(Math.max(0, i - 6), i + 1);
      const ma = window.reduce((s, r) => s + r.value, 0) / window.length;
      return { ...d, movingAvg: Math.round(ma * 100) / 100 };
    });
  }

  function getForecasts(params) {
    const { periods = 6, salesType } = params || {};
    const table = tableNameForType(salesType);
    const salesExpr = salesType === 'sales_by_month'
      ? 'ROUND(SUM(units_sold),2)'
      : 'ROUND(SUM(total_amount),2)';

    const data = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, ${salesExpr} as sales
      FROM ${table}
      GROUP BY strftime('%Y-%m', date) ORDER BY month ASC
    `).all();

    if (data.length < 3) return { historical: data, forecast: [], r2: 0 };

    const n = data.length;
    const xs = data.map((_, i) => i);
    const ys = data.map(d => d.sales);
    const xm = xs.reduce((a, b) => a + b, 0) / n;
    const ym = ys.reduce((a, b) => a + b, 0) / n;
    const ssxy = xs.reduce((s, x, i) => s + (x - xm) * (ys[i] - ym), 0);
    const ssxx = xs.reduce((s, x) => s + (x - xm) ** 2, 0);
    const slope = ssxy / ssxx;
    const intercept = ym - slope * xm;
    const ssTot = ys.reduce((s, y) => s + (y - ym) ** 2, 0);
    const ssRes = ys.reduce((s, y, i) => s + (y - (slope * i + intercept)) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // FIX: build month strings by incrementing numerically, not via Date constructor
    const lastMonthStr = data[data.length - 1].month; // "YYYY-MM"
    let [fy, fm] = lastMonthStr.split('-').map(Number);
    const forecast = [];
    for (let i = 1; i <= (parseInt(periods) || 6); i++) {
      fm++;
      if (fm > 12) { fm = 1; fy++; }
      const mm = `${fy}-${String(fm).padStart(2, '0')}`;
      const predicted = slope * (n - 1 + i) + intercept;
      const ci = Math.max(0, predicted * 0.15);
      forecast.push({
        month: mm,
        predicted: Math.max(0, Math.round(predicted)),
        lower: Math.max(0, Math.round(predicted - ci)),
        upper: Math.round(predicted + ci),
      });
    }

    return { historical: data, forecast, r2: Math.round(r2 * 1000) / 1000, slope, intercept };
  }

  function getAnomalies(params) {
    const { salesType } = params || {};
    const table = tableNameForType(salesType);
    const valExpr = salesType === 'sales_by_month'
      ? 'ROUND(SUM(units_sold),2)'
      : 'ROUND(SUM(total_amount),2)';

    const data = db.prepare(`
      SELECT strftime('%Y-%m-%d', date) as day, ${valExpr} as sales, COUNT(*) as orders
      FROM ${table}
      WHERE date IS NOT NULL
      GROUP BY strftime('%Y-%m-%d', date) ORDER BY day ASC
    `).all();

    if (data.length < 5) return [];
    const vals = data.map(d => d.sales);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    return data
      .map(d => ({
        ...d,
        zScore: std > 0 ? Math.round((d.sales - mean) / std * 100) / 100 : 0,
        mean: Math.round(mean),
        std: Math.round(std),
      }))
      .filter(d => Math.abs(d.zScore) > 2)
      .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }

  function getCustomerAnalytics(params) {
    const { salesType } = params || {};
    if (salesType === 'sales_by_month') return [];
    return db.prepare(`
      SELECT
        customer_name, customer_type, region,
        COUNT(*) as purchase_count,
        ROUND(SUM(total_amount),2) as total_spent,
        ROUND(AVG(total_amount),2) as avg_order,
        MIN(date) as first_purchase, MAX(date) as last_purchase,
        ROUND(SUM(profit),2) as total_profit,
        COUNT(DISTINCT category) as categories_bought
      FROM transaction_sales
      WHERE customer_name != ''
      GROUP BY customer_name ORDER BY total_spent DESC LIMIT 200
    `).all();
  }

  // ── Customer CRUD ──────────────────────────────────────────────────────────
  function getCustomers(params) {
    const { page = 1, limit = 50, search = '', type = '' } = params || {};
    const where = []; const args = [];
    if (search) { where.push(`(name LIKE ? OR phone LIKE ? OR city LIKE ?)`); args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (type) { where.push(`customer_type = ?`); args.push(type); }
    const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const total = db.prepare(`SELECT COUNT(*) as count FROM customers ${wc}`).get(...args);
    const rows = db.prepare(`SELECT * FROM customers ${wc} ORDER BY total_purchases DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
    return { rows, total: total.count };
  }

  function getCustomerById(id) {
    const c = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
    if (!c) return null;
    const sales = db.prepare(
      `SELECT * FROM transaction_sales WHERE (customer_id = ? OR customer_name = ?) ORDER BY date DESC LIMIT 50`
    ).all(id, c.name);
    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, strftime('%Y-%m', date) as label,
        ROUND(SUM(total_amount),2) as sales, COUNT(*) as orders
      FROM transaction_sales WHERE customer_name = ?
      GROUP BY strftime('%Y-%m', date) ORDER BY month ASC
    `).all(c.name);
    const topProducts = db.prepare(`
      SELECT product_name, category, COUNT(*) as times_bought,
        ROUND(SUM(total_amount),2) as total_spent
      FROM transaction_sales WHERE customer_name = ?
      GROUP BY product_name ORDER BY total_spent DESC LIMIT 10
    `).all(c.name);
    return { ...c, recentSales: sales, monthlySpend: monthly, topProducts };
  }

  function upsertCustomer(data) {
    const existing = db.prepare(`SELECT id FROM customers WHERE name = ?`).get(data.name || '');
    if (existing) {
      const allowed = ['name', 'customer_type', 'phone', 'email', 'address', 'region', 'city', 'gstin', 'credit_limit', 'credit_days', 'notes'];
      const fields = Object.keys(data).filter(k => allowed.includes(k));
      if (fields.length) {
        const sets = fields.map(k => `${k} = @${k}`).join(', ');
        db.prepare(`UPDATE customers SET ${sets} WHERE id = @id`).run({ ...data, id: existing.id });
      }
      return { success: true, id: existing.id, updated: true };
    }
    const info = db.prepare(`
      INSERT INTO customers (name,customer_type,phone,email,address,region,city,gstin,credit_limit,credit_days,notes)
      VALUES (@name,@customer_type,@phone,@email,@address,@region,@city,@gstin,@credit_limit,@credit_days,@notes)
    `).run({
      name: data.name || '', customer_type: data.customer_type || 'Retail',
      phone: data.phone || '', email: data.email || '', address: data.address || '',
      region: data.region || '', city: data.city || '', gstin: data.gstin || '',
      credit_limit: parseFloat(data.credit_limit) || 0,
      credit_days: parseInt(data.credit_days) || 0, notes: data.notes || '',
    });
    return { success: true, id: info.lastInsertRowid, updated: false };
  }

  function deleteCustomer(id) {
    db.prepare(`DELETE FROM customers WHERE id = ?`).run(id);
    return { success: true };
  }

  function updateCustomerStats(customerName, saleDate) {
    if (!customerName) return;
    db.prepare(`
      UPDATE customers SET
        total_purchases = (SELECT COALESCE(SUM(total_amount),0) FROM transaction_sales WHERE customer_name = ?),
        purchase_count  = (SELECT COUNT(*) FROM transaction_sales WHERE customer_name = ?),
        last_purchase   = (SELECT MAX(date) FROM transaction_sales WHERE customer_name = ?),
        first_purchase  = CASE WHEN first_purchase = '' THEN ? ELSE first_purchase END
      WHERE name = ?
    `).run(customerName, customerName, customerName, saleDate || '', customerName);
  }

  // ── Inventory ──────────────────────────────────────────────────────────────
  function getInventory(params) {
    const { page = 1, limit = 100, search = '', category = '', lowStock = false } = params || {};
    const where = []; const args = [];
    if (search) { where.push(`(product_name LIKE ? OR sku LIKE ?)`); args.push(`%${search}%`, `%${search}%`); }
    if (category) { where.push(`category = ?`); args.push(category); }
    if (lowStock) where.push(`current_stock <= min_stock`);
    const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const total = db.prepare(`SELECT COUNT(*) as count FROM inventory ${wc}`).get(...args);
    const rows = db.prepare(`SELECT * FROM inventory ${wc} ORDER BY category, product_name LIMIT ? OFFSET ?`).all(...args, limit, offset);
    return { rows, total: total.count };
  }

  function upsertInventoryItem(data) {
    const existing = data.id
      ? db.prepare(`SELECT id FROM inventory WHERE id = ?`).get(data.id)
      : db.prepare(`SELECT id FROM inventory WHERE sku = ?`).get(data.sku || '');
    if (existing) {
      const allowed = ['sku', 'product_name', 'category', 'sub_category', 'unit', 'current_stock', 'min_stock',
        'max_stock', 'unit_cost', 'unit_price', 'supplier', 'supplier_contact', 'lead_time_days',
        'last_restocked', 'last_delivery_date', 'next_expected_delivery', 'reorder_point', 'location', 'barcode'];
      const fields = Object.keys(data).filter(k => allowed.includes(k));
      if (fields.length) {
        const sets = fields.map(k => `${k} = @${k}`).join(', ');
        db.prepare(`UPDATE inventory SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id: existing.id });
      }
      return { success: true, id: existing.id };
    }
    const info = db.prepare(`
      INSERT INTO inventory (sku,product_name,category,sub_category,unit,current_stock,min_stock,max_stock,
        unit_cost,unit_price,supplier,supplier_contact,lead_time_days,last_restocked,
        last_delivery_date,next_expected_delivery,reorder_point,location,barcode)
      VALUES (@sku,@product_name,@category,@sub_category,@unit,@current_stock,@min_stock,@max_stock,
        @unit_cost,@unit_price,@supplier,@supplier_contact,@lead_time_days,@last_restocked,
        @last_delivery_date,@next_expected_delivery,@reorder_point,@location,@barcode)
    `).run({
      sku: data.sku || `SKU-${Date.now()}`, product_name: data.product_name || '',
      category: data.category || '', sub_category: data.sub_category || '',
      unit: data.unit || 'pcs', current_stock: parseFloat(data.current_stock) || 0,
      min_stock: parseFloat(data.min_stock) || 5, max_stock: parseFloat(data.max_stock) || 500,
      unit_cost: parseFloat(data.unit_cost) || 0, unit_price: parseFloat(data.unit_price) || 0,
      supplier: data.supplier || '', supplier_contact: data.supplier_contact || '',
      lead_time_days: parseInt(data.lead_time_days) || 7,
      last_restocked: data.last_restocked || '', last_delivery_date: data.last_delivery_date || '',
      next_expected_delivery: data.next_expected_delivery || '',
      reorder_point: parseFloat(data.reorder_point) || 10,
      location: data.location || '', barcode: data.barcode || '',
    });
    return { success: true, id: info.lastInsertRowid };
  }

  function deleteInventoryItem(id) {
    db.prepare(`DELETE FROM inventory WHERE id = ?`).run(id);
    return { success: true };
  }

  function addInventoryTransaction(data) {
    const item = db.prepare(`SELECT * FROM inventory WHERE id = ?`).get(data.inventory_id);
    if (!item) return { success: false, error: 'Item not found' };
    let newStock = item.current_stock;
    const qty = parseFloat(data.quantity) || 0;
    if (data.transaction_type === 'received') newStock += qty;
    else if (data.transaction_type === 'sold') newStock -= qty;
    else if (data.transaction_type === 'adjusted') newStock = qty;
    else if (data.transaction_type === 'returned') newStock += qty;
    newStock = Math.max(0, newStock);
    db.prepare(
      `UPDATE inventory SET current_stock = ?, updated_at = datetime('now'),
       last_delivery_date = CASE WHEN ? = 'received' THEN date('now') ELSE last_delivery_date END
       WHERE id = ?`
    ).run(newStock, data.transaction_type, data.inventory_id);
    db.prepare(
      `INSERT INTO inventory_transactions
       (inventory_id,transaction_type,quantity,balance_after,unit_cost,supplier,notes,transaction_date)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(
      data.inventory_id, data.transaction_type, qty, newStock,
      parseFloat(data.unit_cost) || item.unit_cost,
      data.supplier || item.supplier, data.notes || '',
      data.transaction_date || new Date().toISOString().split('T')[0]
    );
    return { success: true, newStock };
  }

  function getInventoryTransactions(inventoryId) {
    return db.prepare(
      `SELECT * FROM inventory_transactions WHERE inventory_id = ? ORDER BY transaction_date DESC LIMIT 50`
    ).all(inventoryId);
  }

  function getInventoryCategories() {
    return db.prepare(
      `SELECT DISTINCT category FROM inventory WHERE category != '' ORDER BY category`
    ).all().map(r => r.category);
  }

  function importStockRegister(records, monthYear) {
    let upserted = 0;
    const tx = db.transaction(() => {
      for (const r of records) {
        if (!r.product_name) continue;
        const existing = db.prepare(
          `SELECT id FROM inventory WHERE product_name = ? COLLATE NOCASE`
        ).get(r.product_name);
        if (existing) {
          db.prepare(
            `UPDATE inventory SET current_stock = ?, updated_at = datetime('now'), last_restocked = ? WHERE id = ?`
          ).run(parseFloat(r.current_stock) || 0, monthYear || new Date().toISOString().split('T')[0], existing.id);
        } else {
          db.prepare(
            `INSERT INTO inventory (sku,product_name,category,current_stock,unit,last_restocked) VALUES (?,?,?,?,?,?)`
          ).run(`SKU-${Date.now()}-${upserted}`, r.product_name, r.category || '', parseFloat(r.current_stock) || 0, r.unit || 'pcs', monthYear || '');
        }
        upserted++;
      }
    });
    tx();
    return { success: true, upserted };
  }

  // ── Dynamic Tables ─────────────────────────────────────────────────────────
  function createDynamicTable(tableName, displayName, columns, description) {
    const safe = tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const colDefs = columns.map(c => `"${c.name}" ${c.type || 'TEXT'} DEFAULT ''`).join(', ');
    db.exec(`CREATE TABLE IF NOT EXISTS "dt_${safe}" (id INTEGER PRIMARY KEY AUTOINCREMENT, ${colDefs}, created_at TEXT DEFAULT (datetime('now')))`);
    db.prepare(`INSERT OR REPLACE INTO dynamic_tables (table_name,display_name,columns_json,description) VALUES (?,?,?,?)`)
      .run(safe, displayName, JSON.stringify(columns), description || '');
    return { success: true, tableName: safe };
  }

  function getDynamicTables() {
    return db.prepare(`SELECT * FROM dynamic_tables ORDER BY created_at DESC`).all()
      .map(t => ({ ...t, columns: JSON.parse(t.columns_json) }));
  }

  function getDynamicTableData(tableName, params) {
    const { page = 1, limit = 100, search = '' } = params || {};
    const safe = tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    try {
      const info = db.prepare(`SELECT * FROM dynamic_tables WHERE table_name = ?`).get(safe);
      if (!info) return { rows: [], total: 0, columns: [] };
      const columns = JSON.parse(info.columns_json);
      const offset = (page - 1) * limit;
      let where = '';
      if (search && columns.length) {
        where = `WHERE ${columns.slice(0, 3).map(c => `"${c.name}" LIKE '%${search.replace(/'/g, '')}%'`).join(' OR ')}`;
      }
      const total = db.prepare(`SELECT COUNT(*) as count FROM "dt_${safe}" ${where}`).get();
      const rows = db.prepare(`SELECT * FROM "dt_${safe}" ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(limit, offset);
      return { rows, total: total.count, columns };
    } catch (e) {
      return { rows: [], total: 0, columns: [], error: e.message };
    }
  }

  function insertDynamicRow(tableName, data) {
    const safe = tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at');
    if (!keys.length) return { success: false };
    const cols = keys.map(k => `"${k}"`).join(',');
    const vals = keys.map(k => `@${k}`).join(',');
    db.prepare(`INSERT INTO "dt_${safe}" (${cols}) VALUES (${vals})`).run(data);
    return { success: true };
  }

  function deleteDynamicRow(tableName, id) {
    const safe = tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    db.prepare(`DELETE FROM "dt_${safe}" WHERE id = ?`).run(id);
    return { success: true };
  }

  function deleteDynamicTable(tableName) {
    const safe = tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    db.exec(`DROP TABLE IF EXISTS "dt_${safe}"`);
    db.prepare(`DELETE FROM dynamic_tables WHERE table_name = ?`).run(safe);
    return { success: true };
  }

  function getSeedStatus() {
    const txSales = db.prepare(`SELECT COUNT(*) as c FROM transaction_sales`).get();
    const monthly = db.prepare(`SELECT COUNT(*) as c FROM monthly_product_sales`).get();
    const inv = db.prepare(`SELECT COUNT(*) as c FROM inventory`).get();
    return {
      seeded: txSales.c > 0 || monthly.c > 0 || inv.c > 0,
      salesCount: txSales.c + monthly.c,
      inventoryCount: inv.c,
    };
  }

  function seedDemoData() {
    return { success: true, inserted: 0 };
  }

  return {
    getDashboardStats, getMonthlySales, getTopProducts, getSalesData,
    getSaleById, insertSale, insertSales, updateSale, deleteSale,
    deleteSalesByIds, deleteSalesByFilter, deleteAllSales,
    getCategoryAnalysis, getRegionAnalysis, getTimeSeries, getForecasts, getAnomalies,
    getCustomerAnalytics, getCustomers, getCustomerById, upsertCustomer, deleteCustomer,
    updateCustomerStats,
    getInventory, upsertInventoryItem, deleteInventoryItem, addInventoryTransaction,
    getInventoryTransactions, getInventoryCategories, importStockRegister,
    createDynamicTable, getDynamicTables, getDynamicTableData, insertDynamicRow,
    deleteDynamicRow, deleteDynamicTable, getSeedStatus, seedDemoData,
    getProductMonthlySales, getMonthOverMonth, getCategoryMonthly,
  };
};