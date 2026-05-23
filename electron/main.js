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
  mainWindow.loadURL(startURL);
  mainWindow.once('ready-to-show', () => { mainWindow.show(); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => { loadServices(); createWindow(); });
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
ipcMain.handle('excel:openFileDialog', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { title:'Select File', filters:[{name:'Excel/CSV',extensions:['xlsx','xls','csv']}], properties:['openFile'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('excel:parseFile', async (_, filePath) => excelService.parseFile(filePath));
ipcMain.handle('excel:parseStockRegister', async (_, filePath) => excelService.parseStockRegister(filePath));
ipcMain.handle('excel:exportData', async (_, opts) => {
  const r = await dialog.showSaveDialog(mainWindow, { title:'Save Export', defaultPath: path.join(app.getPath('downloads'), opts.filename||'export.xlsx'), filters:[{name:'Excel',extensions:['xlsx']}] });
  if (r.canceled) return null;
  const res = excelService.exportToExcel(opts.data, opts.columns, r.filePath);
  if (res.success) shell.showItemInFolder(r.filePath);
  return res;
});

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getDataPath', () => getAppDataPath());
