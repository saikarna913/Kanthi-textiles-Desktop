const { contextBridge, ipcRenderer } = require('electron');

const invoke = (ch, ...args) => ipcRenderer.invoke(ch, ...args);

contextBridge.exposeInMainWorld('electron', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
  db: {
    getDashboardStats: (p) => invoke('db:getDashboardStats', p),
    getMonthlySales: (m) => invoke('db:getMonthlySales', m),
    getTopProducts: (l) => invoke('db:getTopProducts', l),
    getSalesData: (p) => invoke('db:getSalesData', p),
    getSaleById: (id) => invoke('db:getSaleById', id),
    insertSale: (d) => invoke('db:insertSale', d),
    insertSales: (r) => invoke('db:insertSales', r),
    updateSale: (id, data) => invoke('db:updateSale', { id, data }),
    deleteSale: (id) => invoke('db:deleteSale', id),
    deleteSalesByIds: (ids) => invoke('db:deleteSalesByIds', ids),
    deleteSalesByFilter: (params) => invoke('db:deleteSalesByFilter', params),
    getCategoryAnalysis: (p) => invoke('db:getCategoryAnalysis', p),
    getRegionAnalysis: (p) => invoke('db:getRegionAnalysis', p),
    getTimeSeries: (p) => invoke('db:getTimeSeries', p),
    getForecasts: (p) => invoke('db:getForecasts', p),
    getAnomalies: (p) => invoke('db:getAnomalies', p),
    getCustomerAnalytics: (p) => invoke('db:getCustomerAnalytics', p),
    getCustomers: (p) => invoke('db:getCustomers', p),
    getCustomerById: (id) => invoke('db:getCustomerById', id),
    upsertCustomer: (d) => invoke('db:upsertCustomer', d),
    deleteCustomer: (id) => invoke('db:deleteCustomer', id),
    getInventory: (p) => invoke('db:getInventory', p),
    upsertInventoryItem: (d) => invoke('db:upsertInventoryItem', d),
    deleteInventoryItem: (id) => invoke('db:deleteInventoryItem', id),
    addInventoryTransaction: (d) => invoke('db:addInventoryTransaction', d),
    getInventoryTransactions: (id) => invoke('db:getInventoryTransactions', id),
    getInventoryCategories: () => invoke('db:getInventoryCategories'),
    importStockRegister: (records, monthYear) => invoke('db:importStockRegister', { records, monthYear }),
    createDynamicTable: (t,dn,c,d) => invoke('db:createDynamicTable', { tableName:t, displayName:dn, columns:c, description:d }),
    getDynamicTables: () => invoke('db:getDynamicTables'),
    getDynamicTableData: (t,p) => invoke('db:getDynamicTableData', { tableName:t, params:p }),
    insertDynamicRow: (t,d) => invoke('db:insertDynamicRow', { tableName:t, data:d }),
    deleteDynamicRow: (t,id) => invoke('db:deleteDynamicRow', { tableName:t, id }),
    deleteDynamicTable: (n) => invoke('db:deleteDynamicTable', n),
    runQuery: (sql) => invoke('db:runQuery', sql),
    getSeedStatus: () => invoke('db:getSeedStatus'),
    seedDemoData: () => invoke('db:seedDemoData'),
  },
  excel: {
    test: () => invoke('excel:test'),
    openFileDialog: () => invoke('excel:openFileDialog'),
    parseFile: (p) => invoke('excel:parseFile', p),
    parseStockRegister: (p) => invoke('excel:parseStockRegister', p),
    parseSalesByMonth: async (p) => {
      try {
        return await invoke('excel:parseSalesByMonth', p);
      } catch (e) {
        return await invoke('excel:parseStockRegister', p);
      }
    },
    exportData: (o) => invoke('excel:exportData', o),
  },
  app: {
    getVersion: () => invoke('app:getVersion'),
    getDataPath: () => invoke('app:getDataPath'),
  },
});
