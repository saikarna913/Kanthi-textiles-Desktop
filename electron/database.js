const path = require('path');
const fs = require('fs');

module.exports = function createDatabase(appDataPath) {
  // Use require with try/catch for better-sqlite3 native module
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch(e) {
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
    CREATE TABLE IF NOT EXISTS sales (
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
      total_amount REAL NOT NULL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'Cash',
      sales_rep TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
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
      outstanding_balance REAL DEFAULT 0,
      first_purchase TEXT DEFAULT '',
      last_purchase TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      category TEXT DEFAULT '',
      sub_category TEXT DEFAULT '',
      unit TEXT DEFAULT 'pcs',
      current_stock REAL DEFAULT 0,
      min_stock REAL DEFAULT 5,
      max_stock REAL DEFAULT 500,
      unit_cost REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      supplier TEXT DEFAULT '',
      supplier_contact TEXT DEFAULT '',
      lead_time_days INTEGER DEFAULT 7,
      last_restocked TEXT DEFAULT '',
      last_delivery_date TEXT DEFAULT '',
      next_expected_delivery TEXT DEFAULT '',
      reorder_point REAL DEFAULT 10,
      location TEXT DEFAULT '',
      barcode TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER,
      transaction_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      balance_after REAL NOT NULL,
      unit_cost REAL DEFAULT 0,
      supplier TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      transaction_date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(inventory_id) REFERENCES inventory(id)
    );

    CREATE TABLE IF NOT EXISTS dynamic_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      columns_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      description TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_sales_category ON sales(category);
    CREATE INDEX IF NOT EXISTS idx_sales_region ON sales(region);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_name);
    CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
    CREATE INDEX IF NOT EXISTS idx_inv_tx_date ON inventory_transactions(transaction_date);
  `);

  // ── Dashboard Stats ────────────────────────────────────────────────────────
  function getDashboardStats() {
    const totalSales = db.prepare(`SELECT COALESCE(SUM(total_amount),0) as value FROM sales`).get();
    const totalOrders = db.prepare(`SELECT COUNT(*) as value FROM sales`).get();
    const totalProfit = db.prepare(`SELECT COALESCE(SUM(profit),0) as value FROM sales`).get();
    const avgOrder = db.prepare(`SELECT COALESCE(AVG(total_amount),0) as value FROM sales`).get();
    const uniqueCustomers = db.prepare(`SELECT COUNT(DISTINCT customer_name) as value FROM sales WHERE customer_name != ''`).get();
    const thisMonth = db.prepare(`SELECT COALESCE(SUM(total_amount),0) as value FROM sales WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`).get();
    const lastMonth = db.prepare(`SELECT COALESCE(SUM(total_amount),0) as value FROM sales WHERE strftime('%Y-%m', date) = strftime('%Y-%m', date('now','-1 month'))`).get();
    const growth = lastMonth.value > 0 ? ((thisMonth.value - lastMonth.value) / lastMonth.value) * 100 : 0;
    const lowStock = db.prepare(`SELECT COUNT(*) as value FROM inventory WHERE current_stock <= min_stock`).get();
    const totalInventoryValue = db.prepare(`SELECT COALESCE(SUM(current_stock * unit_cost),0) as value FROM inventory`).get();
    const totalCustomers = db.prepare(`SELECT COUNT(*) as value FROM customers`).get();

    return {
      totalSales: totalSales.value, totalOrders: totalOrders.value,
      totalProfit: totalProfit.value, avgOrderValue: avgOrder.value,
      uniqueCustomers: uniqueCustomers.value, thisMonthSales: thisMonth.value,
      lastMonthSales: lastMonth.value, monthGrowth: growth,
      lowStockItems: lowStock.value, totalInventoryValue: totalInventoryValue.value,
      totalCustomers: totalCustomers.value,
    };
  }

  function getMonthlySales(months) {
    const m = parseInt(months) || 12;
    return db.prepare(`
      SELECT strftime('%Y-%m', date) as month, strftime('%b %Y', date) as label,
        ROUND(SUM(total_amount),2) as sales, ROUND(SUM(profit),2) as profit,
        COUNT(*) as orders, COUNT(DISTINCT customer_name) as customers
      FROM sales WHERE date >= date('now', '-${m} months')
      GROUP BY strftime('%Y-%m', date) ORDER BY month ASC
    `).all();
  }

  function getTopProducts(limit) {
    const l = parseInt(limit) || 10;
    return db.prepare(`
      SELECT product_name, category, SUM(quantity) as total_qty,
        ROUND(SUM(total_amount),2) as total_sales, ROUND(SUM(profit),2) as total_profit,
        COUNT(*) as order_count, ROUND(AVG(unit_price),2) as avg_price
      FROM sales GROUP BY product_name ORDER BY total_sales DESC LIMIT ${l}
    `).all();
  }

  function getSalesData(params) {
    const { page=1, limit=50, search='', category='', region='', sortBy='date', sortDir='DESC', dateFrom='', dateTo='', customerId='' } = params || {};
    let where = []; let args = [];
    if (search) { where.push(`(customer_name LIKE ? OR product_name LIKE ? OR invoice_no LIKE ?)`); args.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    if (category) { where.push(`category = ?`); args.push(category); }
    if (region) { where.push(`region = ?`); args.push(region); }
    if (dateFrom) { where.push(`date >= ?`); args.push(dateFrom); }
    if (dateTo) { where.push(`date <= ?`); args.push(dateTo); }
    if (customerId) { where.push(`customer_id = ?`); args.push(customerId); }
    const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const safe = ['date','total_amount','customer_name','product_name','profit','quantity'];
    const sb = safe.includes(sortBy) ? sortBy : 'date';
    const sd = sortDir === 'ASC' ? 'ASC' : 'DESC';
    const total = db.prepare(`SELECT COUNT(*) as count FROM sales ${wc}`).get(...args);
    const rows = db.prepare(`SELECT * FROM sales ${wc} ORDER BY ${sb} ${sd} LIMIT ? OFFSET ?`).all(...args, limit, offset);
    return { rows, total: total.count, page, limit };
  }

  function getSaleById(id) { return db.prepare(`SELECT * FROM sales WHERE id = ?`).get(id); }

  function insertSale(data) {
    const stmt = db.prepare(`
      INSERT INTO sales (invoice_no,date,customer_id,customer_name,customer_type,region,state,city,
        product_name,category,sub_category,sku,quantity,unit_price,discount,total_amount,
        cost_price,profit,payment_mode,sales_rep,notes)
      VALUES (@invoice_no,@date,@customer_id,@customer_name,@customer_type,@region,@state,@city,
        @product_name,@category,@sub_category,@sku,@quantity,@unit_price,@discount,@total_amount,
        @cost_price,@profit,@payment_mode,@sales_rep,@notes)
    `);
    const info = stmt.run({
      invoice_no: data.invoice_no||'', date: data.date||new Date().toISOString().split('T')[0],
      customer_id: data.customer_id||null, customer_name: data.customer_name||'',
      customer_type: data.customer_type||'Retail', region: data.region||'', state: data.state||'',
      city: data.city||'', product_name: data.product_name||'', category: data.category||'',
      sub_category: data.sub_category||'', sku: data.sku||'',
      quantity: parseFloat(data.quantity)||1, unit_price: parseFloat(data.unit_price)||0,
      discount: parseFloat(data.discount)||0, total_amount: parseFloat(data.total_amount)||0,
      cost_price: parseFloat(data.cost_price)||0, profit: parseFloat(data.profit)||0,
      payment_mode: data.payment_mode||'Cash', sales_rep: data.sales_rep||'', notes: data.notes||''
    });
    updateCustomerStats(data.customer_name, data.date);
    return { success: true, id: info.lastInsertRowid };
  }

  function insertSales(records) {
    if (!Array.isArray(records) || !records.length) {
      return { success: false, error: 'No records provided' };
    }
    const stmt = db.prepare(`
      INSERT INTO sales (invoice_no,date,customer_name,customer_type,region,state,city,
        product_name,category,sub_category,sku,quantity,unit_price,discount,total_amount,
        cost_price,profit,payment_mode,sales_rep,notes)
      VALUES (@invoice_no,@date,@customer_name,@customer_type,@region,@state,@city,
        @product_name,@category,@sub_category,@sku,@quantity,@unit_price,@discount,@total_amount,
        @cost_price,@profit,@payment_mode,@sales_rep,@notes)
    `);
    const insertMany = db.transaction((rows) => {
      let count = 0, errors = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          stmt.run({
            invoice_no: row.invoice_no||row['Invoice No']||'',
            date: normalizeDate(row.date||row['Date']||''),
            customer_name: row.customer_name||row['Customer Name']||row['Customer']||'',
            customer_type: row.customer_type||row['Customer Type']||'Retail',
            region: row.region||row['Region']||'', state: row.state||row['State']||'',
            city: row.city||row['City']||'',
            product_name: row.product_name||row['Product Name']||row['Item']||row['STOCK ITEMS']||'',
            category: row.category||row['Category']||'',
            sub_category: row.sub_category||row['Sub Category']||'',
            sku: row.sku||row['SKU']||'',
            quantity: parseFloat(row.quantity||row['Quantity']||row['Qty']||row['TOTAL']||1),
            unit_price: parseFloat(row.unit_price||row['Unit Price']||row['Price']||0),
            discount: parseFloat(row.discount||row['Discount']||0),
            total_amount: parseFloat(row.total_amount||row['Total Amount']||row['Amount']||row['Total']||0),
            cost_price: parseFloat(row.cost_price||row['Cost Price']||0),
            profit: parseFloat(row.profit||row['Profit']||0),
            payment_mode: row.payment_mode||row['Payment Mode']||'Cash',
            sales_rep: row.sales_rep||row['Sales Rep']||'',
            notes: row.notes||row['Notes']||''
          });
          count++;
        } catch(e) { 
          console.error(`Row ${i+1} insert error:`, e.message, 'data:', row);
          errors.push(`Row ${i+1}: ${e.message}`);
        }
      }
      return { count, errors };
    });
    const result = insertMany(records);
    if (result.count === 0) {
      return { success: false, error: `Failed to insert records. ${result.errors.slice(0, 3).join('; ')}` };
    }
    console.log(`Inserted ${result.count}/${records.length} sales records. Errors: ${result.errors.length}`);
    return { success: true, inserted: result.count, errors: result.errors.length > 0 ? result.errors : undefined };
  }

  function normalizeDate(d) {
    if (!d) return new Date().toISOString().split('T')[0];
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  }

  function updateSale(id, data) {
    const allowed = ['invoice_no','date','customer_name','customer_type','region','state','city',
      'product_name','category','sub_category','sku','quantity','unit_price','discount',
      'total_amount','cost_price','profit','payment_mode','sales_rep','notes'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return { success: false, error: 'No valid fields' };
    const sets = fields.map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE sales SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({...data, id});
    return { success: true };
  }

  function deleteSale(id) { db.prepare(`DELETE FROM sales WHERE id = ?`).run(id); return { success: true }; }

  // ── Analytics ──────────────────────────────────────────────────────────────
  function getCategoryAnalysis() {
    return db.prepare(`
      SELECT category, COUNT(*) as transactions, SUM(quantity) as total_qty,
        ROUND(SUM(total_amount),2) as total_sales, ROUND(SUM(profit),2) as total_profit,
        ROUND(AVG(total_amount),2) as avg_sale,
        ROUND(SUM(profit)/NULLIF(SUM(total_amount),0)*100,2) as margin_pct
      FROM sales WHERE category IS NOT NULL AND category != ''
      GROUP BY category ORDER BY total_sales DESC
    `).all();
  }

  function getRegionAnalysis() {
    return db.prepare(`
      SELECT region, COUNT(*) as transactions, COUNT(DISTINCT customer_name) as customers,
        ROUND(SUM(total_amount),2) as total_sales, ROUND(SUM(profit),2) as total_profit,
        ROUND(AVG(total_amount),2) as avg_sale
      FROM sales WHERE region IS NOT NULL AND region != ''
      GROUP BY region ORDER BY total_sales DESC
    `).all();
  }

  function getTimeSeries(params) {
    const { granularity='monthly', months=24 } = params || {};
    const fmts = { daily:'%Y-%m-%d', weekly:'%Y-%W', monthly:'%Y-%m' };
    const fmt = fmts[granularity] || '%Y-%m';
    const data = db.prepare(`
      SELECT strftime('${fmt}', date) as period,
        ROUND(SUM(total_amount),2) as value, COUNT(*) as count,
        ROUND(SUM(total_amount),2) as sales, ROUND(SUM(profit),2) as profit
      FROM sales WHERE date >= date('now', '-${parseInt(months)||24} months')
      GROUP BY strftime('${fmt}', date) ORDER BY period ASC
    `).all();
    return data.map((d, i) => {
      const window = data.slice(Math.max(0, i-6), i+1);
      const ma = window.reduce((s,r) => s+r.value, 0) / window.length;
      return { ...d, movingAvg: Math.round(ma*100)/100 };
    });
  }

  function getForecasts(params) {
    const { periods=6 } = params || {};
    const data = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, ROUND(SUM(total_amount),2) as sales
      FROM sales GROUP BY strftime('%Y-%m', date) ORDER BY month ASC
    `).all();
    if (data.length < 3) return { historical: data, forecast: [], r2: 0 };
    const n = data.length, xs = data.map((_,i) => i), ys = data.map(d => d.sales);
    const xm = xs.reduce((a,b)=>a+b,0)/n, ym = ys.reduce((a,b)=>a+b,0)/n;
    const ssxy = xs.reduce((s,x,i) => s+(x-xm)*(ys[i]-ym), 0);
    const ssxx = xs.reduce((s,x) => s+(x-xm)**2, 0);
    const slope = ssxy/ssxx, intercept = ym - slope*xm;
    const ssTot = ys.reduce((s,y) => s+(y-ym)**2, 0);
    const ssRes = ys.reduce((s,y,i) => s+(y-(slope*i+intercept))**2, 0);
    const r2 = 1 - ssRes/ssTot;
    const lastDate = new Date(data[data.length-1].month + '-01');
    const forecast = [];
    for (let i = 1; i <= parseInt(periods)||6; i++) {
      lastDate.setMonth(lastDate.getMonth()+1);
      const mm = lastDate.toISOString().slice(0,7);
      const predicted = slope*(n-1+i)+intercept;
      const ci = Math.max(0, predicted*0.15);
      forecast.push({ month: mm, predicted: Math.max(0,Math.round(predicted)), lower: Math.max(0,Math.round(predicted-ci)), upper: Math.round(predicted+ci) });
    }
    return { historical: data, forecast, r2: Math.round(r2*1000)/1000, slope, intercept };
  }

  function getAnomalies() {
    const data = db.prepare(`
      SELECT strftime('%Y-%m-%d', date) as day, ROUND(SUM(total_amount),2) as sales, COUNT(*) as orders
      FROM sales GROUP BY strftime('%Y-%m-%d', date) ORDER BY day ASC
    `).all();
    if (data.length < 5) return [];
    const vals = data.map(d => d.sales);
    const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
    const std = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
    return data.map(d => ({ ...d, zScore: std > 0 ? (d.sales-mean)/std : 0, mean, std }))
      .filter(d => Math.abs(d.zScore) > 2).sort((a,b) => Math.abs(b.zScore)-Math.abs(a.zScore));
  }

  function getCustomerAnalytics() {
    return db.prepare(`
      SELECT customer_name, customer_type, region,
        COUNT(*) as purchase_count, ROUND(SUM(total_amount),2) as total_spent,
        ROUND(AVG(total_amount),2) as avg_order, MIN(date) as first_purchase,
        MAX(date) as last_purchase, ROUND(SUM(profit),2) as total_profit,
        COUNT(DISTINCT category) as categories_bought
      FROM sales WHERE customer_name != ''
      GROUP BY customer_name ORDER BY total_spent DESC LIMIT 200
    `).all();
  }

  // ── Customer CRUD ──────────────────────────────────────────────────────────
  function getCustomers(params) {
    const { page=1, limit=50, search='', type='' } = params || {};
    let where = []; let args = [];
    if (search) { where.push(`(name LIKE ? OR phone LIKE ? OR city LIKE ?)`); args.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    if (type) { where.push(`customer_type = ?`); args.push(type); }
    const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page-1)*limit;
    const total = db.prepare(`SELECT COUNT(*) as count FROM customers ${wc}`).get(...args);
    const rows = db.prepare(`SELECT * FROM customers ${wc} ORDER BY total_purchases DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
    return { rows, total: total.count };
  }

  function getCustomerById(id) {
    const c = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
    if (!c) return null;
    const sales = db.prepare(`SELECT * FROM sales WHERE customer_id = ? OR customer_name = ? ORDER BY date DESC LIMIT 50`).all(id, c.name);
    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, strftime('%b %Y', date) as label,
        ROUND(SUM(total_amount),2) as sales, COUNT(*) as orders
      FROM sales WHERE customer_name = ?
      GROUP BY strftime('%Y-%m', date) ORDER BY month ASC
    `).all(c.name);
    const topProducts = db.prepare(`
      SELECT product_name, category, COUNT(*) as times_bought, ROUND(SUM(total_amount),2) as total_spent
      FROM sales WHERE customer_name = ? GROUP BY product_name ORDER BY total_spent DESC LIMIT 10
    `).all(c.name);
    return { ...c, recentSales: sales, monthlySpend: monthly, topProducts };
  }

  function upsertCustomer(data) {
    const existing = db.prepare(`SELECT id FROM customers WHERE name = ?`).get(data.name||'');
    if (existing) {
      const allowed = ['name','customer_type','phone','email','address','region','city','gstin','credit_limit','credit_days','notes'];
      const fields = Object.keys(data).filter(k => allowed.includes(k));
      if (fields.length) {
        const sets = fields.map(k=>`${k} = @${k}`).join(', ');
        db.prepare(`UPDATE customers SET ${sets} WHERE id = @id`).run({...data, id: existing.id});
      }
      return { success: true, id: existing.id, updated: true };
    }
    const info = db.prepare(`
      INSERT INTO customers (name,customer_type,phone,email,address,region,city,gstin,credit_limit,credit_days,notes)
      VALUES (@name,@customer_type,@phone,@email,@address,@region,@city,@gstin,@credit_limit,@credit_days,@notes)
    `).run({
      name: data.name||'', customer_type: data.customer_type||'Retail',
      phone: data.phone||'', email: data.email||'', address: data.address||'',
      region: data.region||'', city: data.city||'', gstin: data.gstin||'',
      credit_limit: parseFloat(data.credit_limit)||0,
      credit_days: parseInt(data.credit_days)||0, notes: data.notes||''
    });
    return { success: true, id: info.lastInsertRowid, updated: false };
  }

  function deleteCustomer(id) { db.prepare(`DELETE FROM customers WHERE id = ?`).run(id); return { success: true }; }

  function updateCustomerStats(customerName, saleDate) {
    if (!customerName) return;
    db.prepare(`
      UPDATE customers SET
        total_purchases = (SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE customer_name = ?),
        purchase_count = (SELECT COUNT(*) FROM sales WHERE customer_name = ?),
        last_purchase = (SELECT MAX(date) FROM sales WHERE customer_name = ?),
        first_purchase = CASE WHEN first_purchase = '' THEN ? ELSE first_purchase END
      WHERE name = ?
    `).run(customerName, customerName, customerName, saleDate||'', customerName);
  }

  // ── Inventory ──────────────────────────────────────────────────────────────
  function getInventory(params) {
    const { page=1, limit=100, search='', category='', lowStock=false } = params || {};
    let where = []; let args = [];
    if (search) { where.push(`(product_name LIKE ? OR sku LIKE ?)`); args.push(`%${search}%`,`%${search}%`); }
    if (category) { where.push(`category = ?`); args.push(category); }
    if (lowStock) where.push(`current_stock <= min_stock`);
    const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page-1)*limit;
    const total = db.prepare(`SELECT COUNT(*) as count FROM inventory ${wc}`).get(...args);
    const rows = db.prepare(`SELECT * FROM inventory ${wc} ORDER BY category, product_name LIMIT ? OFFSET ?`).all(...args, limit, offset);
    return { rows, total: total.count };
  }

  function upsertInventoryItem(data) {
    const existing = data.id
      ? db.prepare(`SELECT id FROM inventory WHERE id = ?`).get(data.id)
      : db.prepare(`SELECT id FROM inventory WHERE sku = ?`).get(data.sku||'');
    if (existing) {
      const allowed = ['sku','product_name','category','sub_category','unit','current_stock','min_stock',
        'max_stock','unit_cost','unit_price','supplier','supplier_contact','lead_time_days',
        'last_restocked','last_delivery_date','next_expected_delivery','reorder_point','location','barcode'];
      const fields = Object.keys(data).filter(k => allowed.includes(k));
      if (fields.length) {
        const sets = fields.map(k=>`${k} = @${k}`).join(', ');
        db.prepare(`UPDATE inventory SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({...data, id: existing.id});
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
      sku: data.sku||`SKU-${Date.now()}`, product_name: data.product_name||'',
      category: data.category||'', sub_category: data.sub_category||'',
      unit: data.unit||'pcs', current_stock: parseFloat(data.current_stock)||0,
      min_stock: parseFloat(data.min_stock)||5, max_stock: parseFloat(data.max_stock)||500,
      unit_cost: parseFloat(data.unit_cost)||0, unit_price: parseFloat(data.unit_price)||0,
      supplier: data.supplier||'', supplier_contact: data.supplier_contact||'',
      lead_time_days: parseInt(data.lead_time_days)||7,
      last_restocked: data.last_restocked||'', last_delivery_date: data.last_delivery_date||'',
      next_expected_delivery: data.next_expected_delivery||'',
      reorder_point: parseFloat(data.reorder_point)||10,
      location: data.location||'', barcode: data.barcode||''
    });
    return { success: true, id: info.lastInsertRowid };
  }

  function deleteInventoryItem(id) { db.prepare(`DELETE FROM inventory WHERE id = ?`).run(id); return { success: true }; }

  function addInventoryTransaction(data) {
    const item = db.prepare(`SELECT * FROM inventory WHERE id = ?`).get(data.inventory_id);
    if (!item) return { success: false, error: 'Item not found' };
    let newStock = item.current_stock;
    if (data.transaction_type === 'received') newStock += parseFloat(data.quantity)||0;
    else if (data.transaction_type === 'sold') newStock -= parseFloat(data.quantity)||0;
    else if (data.transaction_type === 'adjusted') newStock = parseFloat(data.quantity)||0;
    else if (data.transaction_type === 'returned') newStock += parseFloat(data.quantity)||0;
    newStock = Math.max(0, newStock);
    db.prepare(`UPDATE inventory SET current_stock = ?, updated_at = datetime('now'), last_delivery_date = CASE WHEN ? = 'received' THEN date('now') ELSE last_delivery_date END WHERE id = ?`)
      .run(newStock, data.transaction_type, data.inventory_id);
    db.prepare(`INSERT INTO inventory_transactions (inventory_id,transaction_type,quantity,balance_after,unit_cost,supplier,notes,transaction_date) VALUES (?,?,?,?,?,?,?,?)`)
      .run(data.inventory_id, data.transaction_type, parseFloat(data.quantity)||0, newStock, parseFloat(data.unit_cost)||item.unit_cost, data.supplier||item.supplier, data.notes||'', data.transaction_date||new Date().toISOString().split('T')[0]);
    return { success: true, newStock };
  }

  function getInventoryTransactions(inventoryId) {
    return db.prepare(`SELECT * FROM inventory_transactions WHERE inventory_id = ? ORDER BY transaction_date DESC LIMIT 50`).all(inventoryId);
  }

  function getInventoryCategories() {
    return db.prepare(`SELECT DISTINCT category FROM inventory WHERE category != '' ORDER BY category`).all().map(r => r.category);
  }

  // ── Stock Register (your exact format) ────────────────────────────────────
  function importStockRegister(records, monthYear) {
    let upserted = 0;
    const tx = db.transaction(() => {
      for (const r of records) {
        if (!r.product_name) continue;
        const existing = db.prepare(`SELECT id FROM inventory WHERE product_name = ? COLLATE NOCASE`).get(r.product_name);
        if (existing) {
          db.prepare(`UPDATE inventory SET current_stock = ?, updated_at = datetime('now'), last_restocked = ? WHERE id = ?`)
            .run(parseFloat(r.current_stock)||0, monthYear||new Date().toISOString().split('T')[0], existing.id);
        } else {
          db.prepare(`INSERT INTO inventory (sku,product_name,category,current_stock,unit,last_restocked) VALUES (?,?,?,?,?,?)`)
            .run(`SKU-${Date.now()}-${upserted}`, r.product_name, r.category||'', parseFloat(r.current_stock)||0, r.unit||'pcs', monthYear||'');
        }
        upserted++;
      }
    });
    tx();
    return { success: true, upserted };
  }

  // ── Dynamic Tables ─────────────────────────────────────────────────────────
  function createDynamicTable(tableName, displayName, columns, description) {
    const safeName = tableName.replace(/[^a-zA-Z0-9_]/g,'_').toLowerCase();
    const colDefs = columns.map(c => `"${c.name}" ${c.type||'TEXT'} DEFAULT ${c.default !== undefined ? `'${c.default}'` : "''"}`).join(', ');
    db.exec(`CREATE TABLE IF NOT EXISTS "dt_${safeName}" (id INTEGER PRIMARY KEY AUTOINCREMENT, ${colDefs}, created_at TEXT DEFAULT (datetime('now')))`);
    db.prepare(`INSERT OR REPLACE INTO dynamic_tables (table_name, display_name, columns_json, description) VALUES (?,?,?,?)`)
      .run(safeName, displayName, JSON.stringify(columns), description||'');
    return { success: true, tableName: safeName };
  }

  function getDynamicTables() {
    return db.prepare(`SELECT * FROM dynamic_tables ORDER BY created_at DESC`).all().map(t => ({
      ...t, columns: JSON.parse(t.columns_json)
    }));
  }

  function getDynamicTableData(tableName, params) {
    const { page=1, limit=100, search='' } = params || {};
    const safeName = tableName.replace(/[^a-zA-Z0-9_]/g,'_').toLowerCase();
    try {
      const info = db.prepare(`SELECT * FROM dynamic_tables WHERE table_name = ?`).get(safeName);
      if (!info) return { rows: [], total: 0, columns: [] };
      const columns = JSON.parse(info.columns_json);
      const offset = (page-1)*limit;
      let where = '';
      if (search && columns.length) {
        where = `WHERE ${columns.slice(0,3).map(c => `"${c.name}" LIKE '%${search.replace(/'/g,'')}%'`).join(' OR ')}`;
      }
      const total = db.prepare(`SELECT COUNT(*) as count FROM "dt_${safeName}" ${where}`).get();
      const rows = db.prepare(`SELECT * FROM "dt_${safeName}" ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(limit, offset);
      return { rows, total: total.count, columns };
    } catch(e) {
      return { rows: [], total: 0, columns: [], error: e.message };
    }
  }

  function insertDynamicRow(tableName, data) {
    const safeName = tableName.replace(/[^a-zA-Z0-9_]/g,'_').toLowerCase();
    const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at');
    if (!keys.length) return { success: false };
    const cols = keys.map(k=>`"${k}"`).join(',');
    const vals = keys.map(k=>`@${k}`).join(',');
    db.prepare(`INSERT INTO "dt_${safeName}" (${cols}) VALUES (${vals})`).run(data);
    return { success: true };
  }

  function deleteDynamicRow(tableName, id) {
    const safeName = tableName.replace(/[^a-zA-Z0-9_]/g,'_').toLowerCase();
    db.prepare(`DELETE FROM "dt_${safeName}" WHERE id = ?`).run(id);
    return { success: true };
  }

  function deleteDynamicTable(tableName) {
    const safeName = tableName.replace(/[^a-zA-Z0-9_]/g,'_').toLowerCase();
    db.exec(`DROP TABLE IF EXISTS "dt_${safeName}"`);
    db.prepare(`DELETE FROM dynamic_tables WHERE table_name = ?`).run(safeName);
    return { success: true };
  }

  // ── Misc ───────────────────────────────────────────────────────────────────
  function runRawQuery(sql) {
    try { return { success: true, rows: db.prepare(sql).all() }; }
    catch(e) { return { success: false, error: e.message }; }
  }

  function getSeedStatus() {
    const count = db.prepare(`SELECT COUNT(*) as count FROM sales`).get();
    const invCount = db.prepare(`SELECT COUNT(*) as count FROM inventory`).get();
    return { seeded: count.count > 0 || invCount.count > 0, salesCount: count.count, inventoryCount: invCount.count };
  }

  function seedDemoData() {
    // Seed inventory from your exact stock register format
    const stockItems = [
      { product_name: 'MALMAL SAREE (S.P)', category: 'KALAMKARI SAREES', current_stock: 245 },
      { product_name: 'MALMAL SAREE (H.P)', category: 'KALAMKARI SAREES', current_stock: 34 },
      { product_name: 'NRK SILK SAREE', category: 'KALAMKARI SAREES', current_stock: 146 },
      { product_name: 'CHANDRI SILK SAREE', category: 'KALAMKARI SAREES', current_stock: 100 },
      { product_name: '30\'s Fabric', category: 'KALAMKARI UNSTITCHED', current_stock: 689.3, unit: 'mtrs' },
      { product_name: 'Silk fabric', category: 'KALAMKARI UNSTITCHED', current_stock: 306.2, unit: 'mtrs' },
      { product_name: 'Plain fabric', category: 'KALAMKARI UNSTITCHED', current_stock: 323.4, unit: 'mtrs' },
      { product_name: 'Chanderi Fabric', category: 'KALAMKARI UNSTITCHED', current_stock: 196.65, unit: 'mtrs' },
      { product_name: 'BLOUSE PIECES', category: 'KALAMKARI UNSTITCHED', current_stock: 279 },
      { product_name: 'PLAIN Shirts', category: 'READYMADES - MENS', current_stock: 18 },
      { product_name: 'KALAMKARI SHRITS', category: 'READYMADES - MENS', current_stock: 70 },
      { product_name: 'KALAMKARI KURTHA', category: 'READYMADES - MENS', current_stock: 19 },
      { product_name: 'Kalamkari 3/4 th', category: 'WOMEN TOPS/KURTHIS', current_stock: 23 },
      { product_name: 'Kalamkari Umbrella', category: 'WOMEN TOPS/KURTHIS', current_stock: 7 },
      { product_name: 'Ladies Bags Small', category: 'BAGS', current_stock: 23 },
      { product_name: 'Gift Bags', category: 'BAGS', current_stock: 60 },
      { product_name: 'Kalamkari purse', category: 'BAGS', current_stock: 30 },
      { product_name: '60*90 (OR) B/S', category: 'BEDSHEETS', current_stock: 179 },
      { product_name: '60*90 NRK W/P', category: 'BEDSHEETS', current_stock: 107 },
      { product_name: '90*108 NRK W/P', category: 'BEDSHEETS', current_stock: 130 },
      { product_name: '100*90 NRK W/P', category: 'BEDSHEETS', current_stock: 95 },
      { product_name: 'PILLOW COVER SET', category: 'BEDSHEETS', current_stock: 60.5 },
      { product_name: 'BIG TOWEL', category: 'TOWELS', current_stock: 156 },
      { product_name: 'COTTON DUPATTA', category: 'KALAMKARI DUPATTAS', current_stock: 44 },
      { product_name: 'SILK DUPPATTA', category: 'KALAMKARI DUPATTAS', current_stock: 48 },
      { product_name: 'CHANDHRI DUPATTA', category: 'KALAMKARI DUPATTAS', current_stock: 184 },
      { product_name: 'NRK NIGHTIE', category: 'LEISURE WARE', current_stock: 103 },
      { product_name: 'LUNGIES 2 MT', category: 'LEISURE WARE', current_stock: 95 },
      { product_name: 'GOTE NIGHTIE', category: 'LEISURE WARE', current_stock: 45 },
      { product_name: '1.5 x 2 FT Carpet', category: 'CARPETS', current_stock: 41 },
      { product_name: '4 x 6 FT Carpet', category: 'CARPETS', current_stock: 19 },
      { product_name: 'MEDIUM HANKIES', category: 'HANKIES', current_stock: 81.5 },
      { product_name: 'HANDLOOM SAREES (YP)', category: 'SAREES', current_stock: 27 },
      { product_name: 'FANCY SILK (AH)', category: 'SAREES', current_stock: 28 },
      { product_name: 'BATIK DRESS SETS (K.L)', category: 'DRESS SETS', current_stock: 46 },
    ];

    const invStmt = db.prepare(`INSERT OR IGNORE INTO inventory (sku,product_name,category,unit,current_stock,min_stock,unit_price,supplier,last_restocked) VALUES (?,?,?,?,?,?,?,?,?)`);
    const seedInv = db.transaction(() => {
      stockItems.forEach((item, i) => {
        invStmt.run(`KT-${String(i+1).padStart(4,'0')}`, item.product_name, item.category, item.unit||'pcs', item.current_stock, 10, 0, 'Kanthi Warehouse', '2024-10-01');
      });
    });
    seedInv();

    // Seed sample customers
    const customers = ['Priya Collections', 'Meena Silk House', 'Lakshmi Textiles', 'Saraswati Traders', 'Durga Enterprises', 'Kavitha Boutique', 'Radha Fashions', 'Ganga Fabrics'];
    const custStmt = db.prepare(`INSERT OR IGNORE INTO customers (name,customer_type,city,region) VALUES (?,?,?,?)`);
    const seedCust = db.transaction(() => {
      const types = ['Wholesale','Retail','Retail','Wholesale','Wholesale','Retail','Retail','Wholesale'];
      const cities = ['Hyderabad','Chennai','Bangalore','Delhi','Mumbai','Kolkata','Pune','Ahmedabad'];
      customers.forEach((c,i) => custStmt.run(c, types[i], cities[i], ['South','South','South','North','West','East','West','West'][i]));
    });
    seedCust();

    // Seed sample sales
    const cats = ['KALAMKARI SAREES','KALAMKARI UNSTITCHED','READYMADES - MENS','WOMEN TOPS/KURTHIS','BAGS','BEDSHEETS','LEISURE WARE'];
    const prods = { 'KALAMKARI SAREES': ['MALMAL SAREE (S.P)','NRK SILK SAREE','CHANDRI SILK SAREE'], 'KALAMKARI UNSTITCHED': ["30's Fabric",'Silk fabric','Plain fabric'], 'READYMADES - MENS': ['KALAMKARI SHRITS','KALAMKARI KURTHA'], 'WOMEN TOPS/KURTHIS': ['Kalamkari 3/4 th','Kalamkari Umbrella'], 'BAGS': ['Ladies Bags Small','Gift Bags'], 'BEDSHEETS': ['60*90 (OR) B/S','90*108 NRK W/P'], 'LEISURE WARE': ['NRK NIGHTIE','LUNGIES 2 MT'] };
    const prices = { 'KALAMKARI SAREES': [500,3000], 'KALAMKARI UNSTITCHED': [80,600], 'READYMADES - MENS': [400,1200], 'WOMEN TOPS/KURTHIS': [300,900], 'BAGS': [150,800], 'BEDSHEETS': [300,1500], 'LEISURE WARE': [200,600] };
    const rnd = (mn,mx) => Math.random()*(mx-mn)+mn;
    const pick = a => a[Math.floor(Math.random()*a.length)];
    const records = [];
    const now = new Date();
    for (let d = 0; d < 365; d++) {
      const dt = new Date(now); dt.setDate(dt.getDate()-d);
      const ds = dt.toISOString().split('T')[0];
      const month = dt.getMonth();
      const sm = [0.7,0.7,0.9,1.0,1.1,0.8,0.8,1.0,1.3,1.4,1.5,1.8][month];
      const numTx = Math.floor(rnd(2,10)*sm);
      for (let t = 0; t < numTx; t++) {
        const cat = pick(cats);
        const prod = pick(prods[cat]||['Unknown']);
        const [pMin,pMax] = prices[cat]||[100,500];
        const qty = Math.ceil(rnd(1,6));
        const up = Math.round(rnd(pMin,pMax));
        const cp = Math.round(up*rnd(0.55,0.72));
        const disc = Math.round(rnd(0,up*0.08));
        const total = (up-disc)*qty;
        const cust = pick(customers);
        records.push({ invoice_no:`KT-${ds.replace(/-/g,'')}-${t}`, date:ds, customer_name:cust, customer_type: ['Priya Collections','Meena Silk House','Saraswati Traders','Durga Enterprises','Ganga Fabrics'].includes(cust)?'Wholesale':'Retail', region:'South', state:'Telangana', city:'Hyderabad', product_name:prod, category:cat, sub_category:'', sku:'', quantity:qty, unit_price:up, discount:disc, total_amount:total, cost_price:cp, profit:(up-disc-cp)*qty, payment_mode:pick(['Cash','UPI','Bank Transfer','Credit']), sales_rep:'', notes:'' });
      }
    }
    insertSales(records);
    return { success: true, inserted: records.length };
  }

  return {
    getDashboardStats, getMonthlySales, getTopProducts, getSalesData,
    getSaleById, insertSale, insertSales, updateSale, deleteSale,
    getCategoryAnalysis, getRegionAnalysis, getTimeSeries, getForecasts, getAnomalies,
    getCustomerAnalytics, getCustomers, getCustomerById, upsertCustomer, deleteCustomer,
    getInventory, upsertInventoryItem, deleteInventoryItem, addInventoryTransaction,
    getInventoryTransactions, getInventoryCategories, importStockRegister,
    createDynamicTable, getDynamicTables, getDynamicTableData, insertDynamicRow,
    deleteDynamicRow, deleteDynamicTable, runRawQuery, getSeedStatus, seedDemoData,
  };
};
