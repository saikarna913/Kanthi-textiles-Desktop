const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let dbService, excelService;

function getAppDataPath() { return path.join(app.getPath('userData'), 'KanthiTextiles'); }

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
  } catch (err) { console.error('Services load failed:', err); }
}

let mainWindow;

function createWindow() {
  console.log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    frame: false, backgroundColor: '#0F1117',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });
  const startURL = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`;
  console.log('Loading URL:', startURL);
  mainWindow.loadURL(startURL);
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Window finished loading content');
  });
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('[WINDOW] did-fail-load', { errorCode, errorDescription, validatedURL, isMainFrame });
  });
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[RENDERER]', { level, message, line, sourceId });
  });
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.once('ready-to-show', () => { 
    console.log('Window ready-to-show, displaying...');
    mainWindow.show(); 
  });
  mainWindow.on('closed', () => { 
    console.log('Window closed');
    mainWindow = null; 
  });
}

app.whenReady().then(() => { 
  loadServices(); 
  createWindow();
  console.log('App ready, mainWindow created');
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window:close', () => mainWindow?.close());

// DB handlers
const dbHandler = (channel, fn) => ipcMain.handle(channel, async (_, ...args) => { try { return fn(...args); } catch(e) { return { success: false, error: e.message }; } });

dbHandler('db:getDashboardStats', () => dbService.getDashboardStats());
dbHandler('db:getMonthlySales', (m) => dbService.getMonthlySales(m));
dbHandler('db:getTopProducts', (l) => dbService.getTopProducts(l));
dbHandler('db:getSalesData', (p) => dbService.getSalesData(p));
dbHandler('db:getSaleById', (id) => dbService.getSaleById(id));
dbHandler('db:insertSale', (d) => dbService.insertSale(d));
dbHandler('db:insertSales', (r) => dbService.insertSales(r));
dbHandler('db:updateSale', ({id,data}) => dbService.updateSale(id,data));
dbHandler('db:deleteSale', (id) => dbService.deleteSale(id));
dbHandler('db:getCategoryAnalysis', () => dbService.getCategoryAnalysis());
dbHandler('db:getRegionAnalysis', () => dbService.getRegionAnalysis());
dbHandler('db:getTimeSeries', (p) => dbService.getTimeSeries(p));
dbHandler('db:getForecasts', (p) => dbService.getForecasts(p));
dbHandler('db:getAnomalies', () => dbService.getAnomalies());
dbHandler('db:getCustomerAnalytics', () => dbService.getCustomerAnalytics());
dbHandler('db:getCustomers', (p) => dbService.getCustomers(p));
dbHandler('db:getCustomerById', (id) => dbService.getCustomerById(id));
dbHandler('db:upsertCustomer', (d) => dbService.upsertCustomer(d));
dbHandler('db:deleteCustomer', (id) => dbService.deleteCustomer(id));
dbHandler('db:getInventory', (p) => dbService.getInventory(p));
dbHandler('db:upsertInventoryItem', (d) => dbService.upsertInventoryItem(d));
dbHandler('db:deleteInventoryItem', (id) => dbService.deleteInventoryItem(id));
dbHandler('db:addInventoryTransaction', (d) => dbService.addInventoryTransaction(d));
dbHandler('db:getInventoryTransactions', (id) => dbService.getInventoryTransactions(id));
dbHandler('db:getInventoryCategories', () => dbService.getInventoryCategories());
dbHandler('db:importStockRegister', ({records,monthYear}) => dbService.importStockRegister(records,monthYear));
dbHandler('db:createDynamicTable', ({tableName,displayName,columns,description}) => dbService.createDynamicTable(tableName,displayName,columns,description));
dbHandler('db:getDynamicTables', () => dbService.getDynamicTables());
dbHandler('db:getDynamicTableData', ({tableName,params}) => dbService.getDynamicTableData(tableName,params));
dbHandler('db:insertDynamicRow', ({tableName,data}) => dbService.insertDynamicRow(tableName,data));
dbHandler('db:deleteDynamicRow', ({tableName,id}) => dbService.deleteDynamicRow(tableName,id));
dbHandler('db:deleteDynamicTable', (name) => dbService.deleteDynamicTable(name));
dbHandler('db:runQuery', (sql) => dbService.runRawQuery(sql));
dbHandler('db:getSeedStatus', () => dbService.getSeedStatus());
dbHandler('db:seedDemoData', () => dbService.seedDemoData());

// Excel handlers
ipcMain.handle('excel:test', async (event) => {
  console.log('[TEST] 1. Handler invoked');
  try {
    console.log('[TEST] 2. In try block');
    console.log('[TEST] 3. mainWindow check:', mainWindow ? 'EXISTS' : 'NULL');
    console.log('[TEST] 4. isDev =', isDev);
    console.log('[TEST] 5. Building result object');
    const result = { success: true, mainWindow: !!mainWindow, isDev };
    console.log('[TEST] 6. Result object created:', result);
    console.log('[TEST] 7. About to return');
    return result;
  } catch(e) {
    console.error('[TEST] ERROR - caught exception:', e.message);
    console.error('[TEST] ERROR - stack:', e.stack);
    return null;
  }
});

ipcMain.handle('excel:openFileDialog', async () => {
  try {
    console.log('[DIALOG] Starting file dialog...');
    console.log('[DIALOG] mainWindow is:', mainWindow ? 'READY' : 'NULL');
    
    if (!mainWindow) {
      console.error('[DIALOG] ERROR: mainWindow is null!');
      return null;
    }

    console.log('[DIALOG] Calling dialog.showOpenDialog...');
    const r = await dialog.showOpenDialog(mainWindow, { 
      title: 'Select Excel File', 
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ], 
      properties: ['openFile'] 
    });
    
    console.log('[DIALOG] Dialog returned - canceled:', r.canceled, 'files:', r.filePaths.length);
    if (r.filePaths.length > 0) {
      console.log('[DIALOG] Selected file:', r.filePaths[0]);
    }
    
    return r.canceled ? null : r.filePaths[0];
  } catch(e) {
    console.error('[DIALOG] ERROR:', e.message);
    console.error('[DIALOG] Stack:', e.stack);
    return null;
  }
});
ipcMain.handle('excel:parseFile', async (_, filePath) => excelService.parseFile(filePath));
ipcMain.handle('excel:parseStockRegister', async (_, filePath) => excelService.parseStockRegister(filePath));
ipcMain.handle('excel:parseSalesByMonth', async (_, filePath) => {
  if (typeof excelService.parseSalesByMonth === 'function') {
    return excelService.parseSalesByMonth(filePath);
  }
  return excelService.parseStockRegister(filePath);
});
ipcMain.handle('excel:exportData', async (_, opts) => {
  const r = await dialog.showSaveDialog(mainWindow, { title:'Save Export', defaultPath: path.join(app.getPath('downloads'), opts.filename||'export.xlsx'), filters:[{name:'Excel',extensions:['xlsx']}] });
  if (r.canceled) return null;
  const res = excelService.exportToExcel(opts.data, opts.columns, r.filePath);
  if (res.success) shell.showItemInFolder(r.filePath);
  return res;
});

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getDataPath', () => getAppDataPath());
