# Kanthi Textiles Analytics Suite v2.0
Windows desktop app — Electron + React + SQLite · Offline-first

## Quick Start (3 commands)
```bash
cd kanthi-textiles
npm install
npm start
```

## Build Windows Installer
```bash
npm run build
# → dist/Kanthi Textiles Analytics Setup 2.0.0.exe
```

## If better-sqlite3 fails to build (Windows)
```bash
npm install --global --production windows-build-tools
npm rebuild better-sqlite3
# OR: use pre-built binary
npm install better-sqlite3 --build-from-source
```

## Library Versions (all latest as of Nov 2024)
| Package | Version |
|---|---|
| Electron | 33.x |
| React | 18.3.x |
| better-sqlite3 | **11.3.x** |
| recharts | 2.13.x |
| xlsx (SheetJS) | 0.18.x |
| react-dropzone | 14.3.x |
| framer-motion | 11.x |
| lucide-react | 0.460.x |

## Pages & Features
| Page | Features |
|---|---|
| **Dashboard** | KPI cards, revenue/profit trend, category pie, top products, monthly orders |
| **Sales** | Paginated table, search, filter by category/region/date, sort, delete, Excel export |
| **Customers** | Full CRUD, detail view with purchase history chart, top products, transaction table |
| **Inventory** | Grouped by category (your exact format), stock transactions, delivery dates, edit modal |
| **Analytics** | Time Series + MA, Forecasting + CI, Anomaly Detection, Category, Region, Customer tabs |
| **Import** | Drag-drop Excel, detects your stock register format (S.NO/STOCK ITEMS/TOTAL), sales format |
| **Add/Edit** | Manual entry forms for sales, customers, inventory items |
| **Custom Tables** | Create any table schema, import/export Excel, per-table views |
| **AI Insights** | Claude API chatbot with live business data context |

## Your Stock Register Format
The import page auto-detects your exact format:
```
OCTOBER-24
S.NO  STOCK ITEMS                 TOTAL
      KALAMKARI SAREES
1     MALMAL SAREE (S.P)          245
2     MALMAL SAREE (H.P)          34
```
→ Choose "Stock Register" on the import type screen

## Data Storage
- Database: `%APPDATA%\KanthiTextiles\kanthi_v2.db`
- All data stays on your laptop, no internet needed
- SQLite WAL mode for fast concurrent reads

## Light/Dark Theme
- Click the ☀/🌙 icon in the title bar
- Preference saved in localStorage

## AI Insights Setup
1. Get free API key at console.anthropic.com
2. Open AI Insights page → enter key → Save
3. Key stored locally on device only
