const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let dbService, excelService;

function getAppDataPath() {
  return path.join(app.getPath('userData'), 'KanthiTextiles');
}

function ensureAppDataDir() {
  const dir = getAppDataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function loadServices() {
  const appDataPath = ensureAppDataDir();
  try {
    dbService = require('./database')(appDataPath);
    excelService = require('./excel');
    console.log('Services loaded');

    const expectedDbFns = [
      'getDashboardStats', 'getMonthlySales', 'getTopProducts', 'getSalesData',
      'getSaleById', 'insertSale', 'insertSales', 'updateSale', 'deleteSale',
      'deleteSalesByIds', 'deleteSalesByFilter', 'deleteAllSales',
    ];
    const missing = expectedDbFns.filter(n => typeof dbService[n] !== 'function');
    if (missing.length) console.warn('DB service missing expected functions:', missing.join(', '));
  } catch (err) {
    console.error('Services load failed:', err);
  }
}

let mainWindow;

function createWindow() {
  console.log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    frame: false, backgroundColor: '#0F1117',
    icon: path.join(__dirname, '../logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;
  console.log('Loading URL:', startURL);
  mainWindow.loadURL(startURL);

  mainWindow.webContents.once('did-finish-load', () => console.log('Window finished loading content'));
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('[WINDOW] did-fail-load', { errorCode, errorDescription, validatedURL, isMainFrame });
  });
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[RENDERER]', { level, message, line, sourceId });
  });

  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.once('ready-to-show', () => { console.log('Window ready-to-show'); mainWindow.show(); });
  mainWindow.on('closed', () => { console.log('Window closed'); mainWindow = null; });
}

app.whenReady().then(() => { loadServices(); createWindow(); console.log('App ready'); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── Window controls ───────────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window:close', () => mainWindow?.close());

// ── DB handler factory ────────────────────────────────────────────────────────
const dbHandler = (channel, fn) => ipcMain.handle(channel, async (_, ...args) => {
  try { return fn(...args); } catch (e) { return { success: false, error: e.message }; }
});

// Core sales
dbHandler('db:getDashboardStats', (p) => dbService.getDashboardStats(p));
dbHandler('db:getMonthlySales', (m) => dbService.getMonthlySales(m));
dbHandler('db:getTopProducts', (l) => dbService.getTopProducts(l));
dbHandler('db:getSalesData', (p) => dbService.getSalesData(p));
dbHandler('db:getSaleById', (id) => dbService.getSaleById(id));
dbHandler('db:insertSale', (d) => dbService.insertSale(d));
dbHandler('db:insertSales', (r) => dbService.insertSales(r));
dbHandler('db:updateSale', ({ id, data }) => dbService.updateSale(id, data));
dbHandler('db:deleteSale', (id) => dbService.deleteSale(id));
dbHandler('db:deleteSalesByIds', (ids) => dbService.deleteSalesByIds(ids));
dbHandler('db:deleteSalesByFilter', (params) => dbService.deleteSalesByFilter(params));
dbHandler('db:deleteAllSales', () => dbService.deleteAllSales());

// Analytics
dbHandler('db:getCategoryAnalysis', (p) => dbService.getCategoryAnalysis(p));
dbHandler('db:getRegionAnalysis', (p) => dbService.getRegionAnalysis(p));
dbHandler('db:getTimeSeries', (p) => dbService.getTimeSeries(p));
dbHandler('db:getForecasts', (p) => dbService.getForecasts(p));
dbHandler('db:getAnomalies', (p) => dbService.getAnomalies(p));
dbHandler('db:getCustomerAnalytics', (p) => dbService.getCustomerAnalytics(p));
dbHandler('db:getProductMonthlySales', (p) => dbService.getProductMonthlySales(p));
dbHandler('db:getMonthOverMonth', (p) => dbService.getMonthOverMonth(p));
dbHandler('db:getCategoryMonthly', (p) => dbService.getCategoryMonthly(p));

// Customers
dbHandler('db:getCustomers', (p) => dbService.getCustomers(p));
dbHandler('db:getCustomerById', (id) => dbService.getCustomerById(id));
dbHandler('db:upsertCustomer', (d) => dbService.upsertCustomer(d));
dbHandler('db:deleteCustomer', (id) => dbService.deleteCustomer(id));

// Inventory
dbHandler('db:getInventory', (p) => dbService.getInventory(p));
dbHandler('db:upsertInventoryItem', (d) => dbService.upsertInventoryItem(d));
dbHandler('db:deleteInventoryItem', (id) => dbService.deleteInventoryItem(id));
dbHandler('db:addInventoryTransaction', (d) => dbService.addInventoryTransaction(d));
dbHandler('db:getInventoryTransactions', (id) => dbService.getInventoryTransactions(id));
dbHandler('db:getInventoryCategories', () => dbService.getInventoryCategories());
dbHandler('db:importStockRegister', ({ records, monthYear }) => dbService.importStockRegister(records, monthYear));

// Dynamic tables
dbHandler('db:createDynamicTable', ({ tableName, displayName, columns, description }) =>
  dbService.createDynamicTable(tableName, displayName, columns, description));
dbHandler('db:getDynamicTables', () => dbService.getDynamicTables());
dbHandler('db:getDynamicTableData', ({ tableName, params }) => dbService.getDynamicTableData(tableName, params));
dbHandler('db:insertDynamicRow', ({ tableName, data }) => dbService.insertDynamicRow(tableName, data));
dbHandler('db:deleteDynamicRow', ({ tableName, id }) => dbService.deleteDynamicRow(tableName, id));
dbHandler('db:deleteDynamicTable', (name) => dbService.deleteDynamicTable(name));
dbHandler('db:getSeedStatus', () => dbService.getSeedStatus());
dbHandler('db:seedDemoData', () => dbService.seedDemoData());

// ── Excel handlers ────────────────────────────────────────────────────────────
ipcMain.handle('excel:test', async () => {
  try { return { success: true, mainWindow: !!mainWindow, isDev }; }
  catch (e) { return null; }
});

ipcMain.handle('excel:openFileDialog', async () => {
  try {
    if (!mainWindow) { console.error('[DIALOG] ERROR: mainWindow is null!'); return null; }
    const r = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Excel File',
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    return r.canceled ? null : r.filePaths[0];
  } catch (e) {
    console.error('[DIALOG] ERROR:', e.message);
    return null;
  }
});

ipcMain.handle('excel:parseFile', async (_, filePath) =>
  excelService.parseFile(filePath)
);

// FIX: both handlers point to the same parseSalesByMonth function
ipcMain.handle('excel:parseStockRegister', async (_, filePath) =>
  excelService.parseSalesByMonth(filePath)
);

ipcMain.handle('excel:parseSalesByMonth', async (_, filePath) =>
  excelService.parseSalesByMonth(filePath)
);

ipcMain.handle('excel:exportData', async (_, opts) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Export',
    defaultPath: path.join(app.getPath('downloads'), opts.filename || 'export.xlsx'),
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (r.canceled) return null;
  const res = excelService.exportToExcel(opts.data, opts.columns, r.filePath, opts.sheetName);
  if (res.success) shell.showItemInFolder(r.filePath);
  return res;
});

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getDataPath', () => getAppDataPath());