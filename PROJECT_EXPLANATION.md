# Kanthi Textiles - Project Flow & Architecture Explanation

## 1. Project Overview

This is an Electron + React desktop application for textile business analytics, inventory, sales, import, and reporting.

Key layers:
- `electron/` — Main process and native services.
- `src/` — React renderer UI.
- `electron/database.js` — Local SQLite database and query logic.
- `electron/excel.js` — Excel/CSV parsing and export helpers.
- `electron/preload.js` — Secure bridge between renderer and Electron main process.

## 2. Startup Flow

### 2.1 Application entry points
- `package.json` defines `main: electron/main.js` and React start/build scripts.
- `electron/main.js` creates the Electron window and loads the React app.
- In development, it loads `http://localhost:3000`; in production, it loads `build/index.html`.

### 2.2 Database and services initialization
- `electron/main.js` calls `loadServices()` on app readiness.
- `loadServices()` requires `electron/database.js` with the app data path and `electron/excel.js`.
- Database path is resolved from `app.getPath('userData')`, under `KanthiTextiles/kanthi_v2.db`.

### 2.3 Renderer startup
- `src/index.js` mounts the React app and attaches a safe fake `window.electron` object if Electron is unavailable.
- `src/App.js` checks the seed status by calling `window.electron.db.getSeedStatus()`.
- If the DB is not seeded, `App` shows `SeedScreen` until demo data is seeded.
- Otherwise it renders the main `Layout` and route pages.

## 3. Electron Renderer ↔ Main Communication

### 3.1 Preload bridge
- `electron/preload.js` exposes a safe API to the renderer via `contextBridge.exposeInMainWorld('electron', {...})`.
- The renderer can call `window.electron.db.*`, `window.electron.excel.*`, and `window.electron.app.*`.

### 3.2 IPC handlers
- `electron/main.js` maps IPC channels like `db:getDashboardStats` and `excel:parseFile` to database or Excel functions.
- Example:
  - `ipcMain.handle('db:getDashboardStats', () => dbService.getDashboardStats())`
  - `ipcMain.handle('excel:parseFile', async (_, filePath) => excelService.parseFile(filePath))`

## 4. Database Location and Schema

### 4.1 Physical location
- Database file: `KanthiTextiles/kanthi_v2.db`
- Stored inside the Electron user data folder: `app.getPath('userData')`.
- This is a local desktop database, not a remote server.

### 4.2 SQLite schema
The database defines at least these tables:
- `sales`
- `customers`
- `inventory`
- `inventory_transactions`
- `dynamic_tables`

### 4.3 Important indexes
- `idx_sales_date`
- `idx_sales_category`
- `idx_sales_region`
- `idx_sales_customer`
- `idx_sales_customer_id`
- `idx_inventory_sku`
- `idx_inv_tx_date`

This improves performance for filtering and analytics queries.

## 5. Database Query & Analytics Code

### 5.1 Dashboard stats
The dashboard uses `getDashboardStats()` to compute:
- total sales
- total orders
- total profit
- average order value
- unique customers
- current month and last month sales
- month-over-month growth
- low stock items
- inventory value
- customer count

These are computed with SQL `SUM()`, `COUNT()`, `AVG()`, and `strftime()`.

### 5.2 Monthly trend and top products
- `getMonthlySales()` groups sales by month and returns revenue, profit, order count, and distinct customer count for the last 12 months.
- `getTopProducts()` groups by `product_name` and returns sales, profit, quantities, and order count.

### 5.3 Sales listing and filtering
- `getSalesData(params)` supports front-end filtering by:
  - `search` (customer, product, invoice)
  - category
  - region
  - sales type
  - date range
  - customer name / ID
  - sort column and direction
  - pagination (`page`, `limit`)

The code builds a dynamic WHERE clause and runs:
- `SELECT COUNT(*) FROM sales ...`
- `SELECT * FROM sales ... ORDER BY ... LIMIT ... OFFSET ...`

### 5.4 Analytics functions
The analytics flow is implemented in SQL functions like:
- `getCategoryAnalysis()` — group by category and compute totals.
- `getRegionAnalysis()` — group by region.
- `getTimeSeries()` — create daily/weekly/monthly time series.
- `getForecasts()` — perform a simple linear regression forecast from past month totals.
- `getAnomalies()` — flag daily revenue points with a z-score above 2.
- `getCustomerAnalytics()` — aggregate purchases and lifetime spend per customer.

### 5.5 Customer and inventory CRUD
The app also supports:
- `getCustomers()`, `getCustomerById()`, `upsertCustomer()`, `deleteCustomer()`
- `getInventory()`, `upsertInventoryItem()`, `deleteInventoryItem()`
- `addInventoryTransaction()`, `getInventoryTransactions()`, `getInventoryCategories()`

### 5.6 Dynamic tables
The `dynamic_tables` feature allows custom user-defined tables.
- `createDynamicTable()` stores table schema metadata.
- `getDynamicTableData()` reads rows from a custom table.
- `insertDynamicRow()` and `deleteDynamicRow()` modify custom table rows.

## 6. Import Flow and Excel Parsing

### 6.1 Import page flow
`src/pages/Import/ImportPage.jsx` manages a multi-step import wizard:
- Step 0: choose an Excel/CSV file via drag/drop or `openFileDialog()`.
- Step 1: choose import type: `sales` or `sales_by_month`.
- Step 2: parse and preview the file.
- Step 3: import rows into the database.

### 6.2 File parsing
`electron/excel.js` contains file parsing logic.

For standard sales files, `parseFile(filePath)`:
- reads the first worksheet with `xlsx`
- converts rows to JSON
- maps common column names to normalized fields (`invoice_no`, `date`, `customer_name`, `product_name`, `category`, `total_amount`, etc.)
- coerces numeric values and dates
- returns `records`, `preview`, and `warnings`

For stock register / monthly data, `parseSalesByMonth(filePath)`:
- reads every sheet
- detects month/year labels from sheet names or header rows
- maps rows with `S.NO`, `STOCK ITEMS`, `TOTAL`
- builds normalized sales records with `date`, `product_name`, `category`, and `total_amount`

### 6.3 Importing data into SQLite
Once parsed, `ImportPage` calls:
- `window.electron.db.insertSales(parseResult.records)`

`insertSales(records)` inserts rows in a transaction and normalizes missing columns.

## 7. UI and Page Flow

### 7.1 Main router
`src/App.js` uses React Router with routes:
- `/dashboard` → `Dashboard` page
- `/sales/*` → `SalesPage`
- `/customers/*` → `CustomersPage`
- `/inventory` → `InventoryPage`
- `/analytics/*` → `AnalyticsPage`
- `/import` → `ImportPage`
- `/manual-entry` → `ManualEntryPage`
- `/tables` → `TablesPage`
- `/ai-insights` → `AIInsightsPage`

### 7.2 Dashboard page
`src/pages/Dashboard/Dashboard.jsx`:
- loads summary stats, monthly trends, top products, category mix
- supports switching import type filters via `salesType`
- uses chart components from `recharts`
- displays KPI cards and charts

### 7.3 Analytics page
`src/pages/Analytics/AnalyticsPage.jsx` uses analytics endpoints:
- `getTimeSeries()` for trend charts
- `getForecasts()` to compute a revenue forecast
- `getAnomalies()` to detect unusual days

This page is dedicated to deeper business intelligence insights.

### 7.4 Sales listing and filtering
The sales listing pages use `getSalesData(params)` to fetch data from the database with the exact filter settings the user chooses.
- Search text
- category filter
- region filter
- date range filter
- sort order
- pagination

### 7.5 Tables and custom imports
`src/pages/Tables/TablesPage.jsx` supports:
- custom dynamic tables
- importing arbitrary Excel data into those tables
- exporting table data back to Excel

This is where custom stock registers or business-specific sheets can be stored.

## 8. How Filtering Works

Filtering is done in the back-end database layer, not solely in the UI.
- The front-end passes filter values to functions like `getSalesData(params)`.
- The DB layer builds SQL `WHERE` clauses using the provided filters.
- Example filter support:
  - `customer_name LIKE ?`
  - `product_name LIKE ?`
  - `invoice_no LIKE ?`
  - `category = ?`
  - `region = ?`
  - `date >= ?` and `date <= ?`

This means the UI fetches only the matching rows, reducing renderer load and keeping filters efficient.

## 9. Export Flow

The app can export data back to Excel using:
- `window.electron.excel.exportData({ data, columns, filename })`
- `electron/excel.js` uses `xlsx` to build a workbook and save it.
- The main process opens a save dialog and writes the file.

Export is used by pages like `SalesPage` and `InventoryPage`.

## 10. Build and Packaging

### 10.1 Development
Run:
```bash
npm run start
```
This starts React and Electron together with `concurrently`.

### 10.2 Production build
Run:
```bash
npm run build
```
This builds the React front-end and packages the Electron app for Windows using `electron-builder`.

### 10.3 App files included in build
The packaged app includes:
- `build/**/*`
- `electron/**/*`
- `node_modules/**/*`
- `package.json`

## 11. Important Files to Know

- `electron/main.js` — app entry point, window creation, IPC handlers
- `electron/preload.js` — secure Electron bridge to renderer
- `electron/database.js` — SQLite schema and query/analytics logic
- `electron/excel.js` — Excel parsing and export logic
- `src/App.js` — app bootstrapping, routing, seed check
- `src/index.js` — React app mount and safe `window.electron`
- `src/pages/Import/ImportPage.jsx` — import wizard for files and Excel parsing
- `src/pages/Dashboard/Dashboard.jsx` — summary data, charts, dashboards
- `src/pages/Analytics/AnalyticsPage.jsx` — trend, forecast, and anomaly insight charts

## 12. Overall Flow Summary

1. Electron starts and initializes `better-sqlite3`.
2. Database schema is created or upgraded in `electron/database.js`.
3. Renderer loads React and checks if demo seed data is required.
4. UI pages call `window.electron.db.*` and `window.electron.excel.*` functions.
5. Electron forwards those calls to SQLite or Excel services.
6. Results are returned to React and rendered in dashboards, tables, and charts.
7. User actions like filtering, import, export, and CRUD operate through this bridge.

## 13. Notes on Data Types

- `sales` records are stored as rows in SQLite with fields like `date`, `product_name`, `category`, `total_amount`, `profit`, `quantity`, and `sales_type`.
- `sales_type` is used to distinguish import formats like `sales` vs `sales_by_month`.
- Date fields are stored as text strings in ISO format (`YYYY-MM-DD`) so SQLite date functions work reliably.

## 14. How Analysis Code is Written

- Analysis is written directly in the SQLite service file `electron/database.js`.
- Most analytics are SQL aggregations (`SUM`, `COUNT`, `AVG`, `GROUP BY`).
- Forecasting is implemented in JavaScript using ordinary least squares regression over monthly revenue totals.
- Anomaly detection uses z-scores computed from daily sales sums.

---

If you want, I can also create a shorter `README` section inside `README.md` or extract a component-level flow diagram from the code.