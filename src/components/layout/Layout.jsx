import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, BarChart2, Upload, Sparkles, Users, PenLine, Table2, ChevronLeft, ChevronRight, Minus, Square, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import clsx from 'clsx';
import logo from '../../assets/app-logo.png';

const NAV = [
  { path:'/dashboard', label:'Dashboard', icon:LayoutDashboard },
  { path:'/sales', label:'Sales', icon:ShoppingCart },
  { path:'/import', label:'Import Data', icon:Upload },
  { path:'/customers', label:'Customers', icon:Users },
  { path:'/inventory', label:'Inventory', icon:Package },
  { path:'/analytics', label:'Analytics', icon:BarChart2 },
  { path:'/manual-entry', label:'Add / Edit', icon:PenLine },
  { path:'/tables', label:'Custom Tables', icon:Table2 },
  { path:'/ai-insights', label:'AI Insights', icon:Sparkles },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { isDark, toggle } = useTheme();

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{background:'var(--bg-primary)'}}>
      {/* Title bar */}
      <div className="title-bar-drag h-10 flex items-center justify-between px-3 shrink-0 z-50"
        style={{background:'var(--bg-secondary)',borderBottom:'1px solid var(--border)'}}>
        <div className="flex items-center gap-2 title-bar-no-drag">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center" style={{background:'white'}}>
            <img src={logo} alt="Kanthi Textiles logo" className="w-5 h-5 object-contain" />
          </div>
          <span className="text-sm font-bold" style={{color:'var(--text-primary)'}}>Kanthi Textiles</span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{color:'var(--text-muted)',background:'var(--bg-hover)'}}>v2.0</span>
        </div>
        <div className="flex items-center gap-1 title-bar-no-drag">
          <button onClick={toggle} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{color:'var(--text-secondary)'}} title="Toggle theme">
            {isDark ? <Sun size={13}/> : <Moon size={13}/>}
          </button>
          <button onClick={() => window.electron?.window.minimize()} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70" style={{color:'var(--text-secondary)'}}>
            <Minus size={12}/>
          </button>
          <button onClick={() => window.electron?.window.maximize()} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70" style={{color:'var(--text-secondary)'}}>
            <Square size={11}/>
          </button>
          <button onClick={() => window.electron?.window.close()} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" style={{color:'var(--text-secondary)'}}>
            <X size={13}/>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={clsx('flex flex-col shrink-0 transition-all duration-300', collapsed?'w-14':'w-52')}
          style={{background:'var(--bg-secondary)',borderRight:'1px solid var(--border)'}}>
          <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
            {NAV.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} className={({ isActive }) =>
                clsx('flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 group relative',
                  isActive ? 'font-semibold' : 'hover:opacity-80')
              } style={({ isActive }) => ({
                background: isActive ? 'var(--accent-bg)' : 'transparent',
                border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              })}>
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="text-sm truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="p-2" style={{borderTop:'1px solid var(--border)'}}>
            <button onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs transition-colors"
              style={{color:'var(--text-muted)'}}>
              {collapsed ? <ChevronRight size={14}/> : <><ChevronLeft size={14}/><span>Collapse</span></>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-hidden" style={{background:'var(--bg-primary)'}}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
