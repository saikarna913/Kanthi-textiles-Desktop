import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

const S = { // inline style helpers using CSS vars
  card: { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16 },
  input: { background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-primary)', borderRadius:10, outline:'none', width:'100%', fontSize:13, padding:'7px 12px' },
  btn: {
    primary: { background:'var(--accent)', color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:600, fontSize:13 },
    secondary: { background:'var(--bg-hover)', border:'1px solid var(--border)', color:'var(--text-primary)', borderRadius:10, cursor:'pointer', fontSize:13 },
    ghost: { background:'transparent', border:'1px solid transparent', color:'var(--text-secondary)', borderRadius:10, cursor:'pointer', fontSize:13 },
    danger: { background:'var(--danger-bg)', border:'1px solid rgba(239,68,68,.3)', color:'var(--danger)', borderRadius:10, cursor:'pointer', fontSize:13 },
  }
};

export function Card({ children, className, style, onClick }) {
  return <div onClick={onClick} className={clsx('transition-all', onClick&&'cursor-pointer', className)} style={{ ...S.card, padding:20, ...style }}>{children}</div>;
}

export function StatCard({ label, value, subValue, icon:Icon, iconBg, trend, trendValue, delay=0, format='number' }) {
  const up = trend === 'up';
  const fmt = (v) => {
    if (format==='currency') return `₹${Number(v).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
    if (format==='percent') return `${Number(v).toFixed(1)}%`;
    return Number(v).toLocaleString('en-IN');
  };
  return (
    <div className="animate-fade-in-up" style={{ ...S.card, padding:18, animationDelay:`${delay}ms`, animationFillMode:'forwards', opacity:0 }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: iconBg||'var(--accent-bg)'}}>
          {Icon && <Icon size={18} style={{color:'var(--accent)'}} />}
        </div>
        {trend && trend !== 'neutral' && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{background: up?'var(--success-bg)':'var(--danger-bg)', color: up?'var(--success)':'var(--danger)'}}>
            {up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
            {trendValue}
          </div>
        )}
      </div>
      <div className="font-num text-2xl font-bold mb-1" style={{color:'var(--text-primary)'}}>{fmt(value)}</div>
      <div className="text-xs font-medium" style={{color:'var(--text-secondary)'}}>{label}</div>
      {subValue && <div className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>{subValue}</div>}
    </div>
  );
}

export function Badge({ children, variant='default', size='sm' }) {
  const v = {
    default: {background:'var(--bg-hover)',color:'var(--text-secondary)'},
    success: {background:'var(--success-bg)',color:'var(--success)',border:'1px solid rgba(16,185,129,.2)'},
    warning: {background:'var(--warning-bg)',color:'var(--warning)',border:'1px solid rgba(245,158,11,.2)'},
    danger:  {background:'var(--danger-bg)', color:'var(--danger)', border:'1px solid rgba(239,68,68,.2)'},
    info:    {background:'var(--info-bg)',   color:'var(--info)',   border:'1px solid rgba(59,130,246,.2)'},
    accent:  {background:'var(--accent-bg)', color:'var(--accent)', border:'1px solid var(--accent-border)'},
    gold:    {background:'var(--gold-bg)',   color:'var(--gold)',   border:'1px solid rgba(245,158,11,.2)'},
  }[variant] || {};
  const sz = size==='xs' ? {fontSize:10,padding:'2px 6px'} : size==='md' ? {fontSize:13,padding:'4px 10px'} : {fontSize:11,padding:'3px 8px'};
  return <span style={{...v,...sz,borderRadius:999,fontWeight:600,display:'inline-flex',alignItems:'center',gap:4}}>{children}</span>;
}

export function Button({ children, variant='primary', size='md', icon:Icon, onClick, disabled, style:extraStyle, type='button' }) {
  const sz = size==='sm'?{padding:'5px 12px',gap:5,fontSize:12}:size==='lg'?{padding:'10px 20px',gap:8,fontSize:15}:{padding:'7px 16px',gap:6,fontSize:13};
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{...S.btn[variant]||S.btn.primary,...sz,...extraStyle,display:'inline-flex',alignItems:'center',fontFamily:'inherit',opacity:disabled?.5:1,cursor:disabled?'not-allowed':'pointer',transition:'opacity .15s,transform .1s'}}
      onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform='scale(0.97)'}}
      onMouseUp={e=>e.currentTarget.style.transform=''}
      onMouseLeave={e=>e.currentTarget.style.transform=''}>
      {Icon && <Icon size={size==='sm'?12:14}/>}{children}
    </button>
  );
}

export function Input({ placeholder, value, onChange, icon:Icon, style:extra, type='text', onKeyDown, name, readOnly }) {
  return (
    <div style={{position:'relative'}}>
      {Icon && <Icon size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>}
      <input type={type} name={name} placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown} readOnly={readOnly}
        style={{...S.input,paddingLeft:Icon?32:12,...extra}}
        onFocus={e=>{e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 2px var(--accent-bg)'}}
        onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}} />
    </div>
  );
}

export function Select({ value, onChange, options, placeholder, style:extra }) {
  return (
    <select value={value} onChange={onChange}
      style={{...S.input,appearance:'none',cursor:'pointer',paddingRight:28,...extra}}
      onFocus={e=>{e.target.style.borderColor='var(--accent)'}}
      onBlur={e=>{e.target.style.borderColor='var(--border)'}}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{display:'flex',gap:4,padding:4,background:'var(--bg-hover)',borderRadius:12,border:'1px solid var(--border)'}}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:8,
          border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,
          transition:'all .15s',
          background: active===t.id ? 'var(--accent-bg)' : 'transparent',
          color: active===t.id ? 'var(--accent)' : 'var(--text-secondary)',
          outline: active===t.id ? '1px solid var(--accent-border)' : 'none',
        }}>
          {t.icon && <t.icon size={13}/>}{t.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, icon:Icon, iconColor }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        {Icon && (
          <div style={{width:38,height:38,background:'var(--bg-hover)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid var(--border)'}}>
            <Icon size={18} style={{color:iconColor||'var(--accent)'}}/>
          </div>
        )}
        <div>
          <h1 style={{fontSize:17,fontWeight:700,color:'var(--text-primary)'}}>{title}</h1>
          {subtitle && <p style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{display:'flex',alignItems:'center',gap:8}}>{actions}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, color='accent' }) {
  const pct = Math.min(100,(value/Math.max(max,1))*100);
  const colors = {accent:'var(--accent)',gold:'var(--gold)',success:'var(--success)',danger:'var(--danger)',info:'var(--info)'};
  return (
    <div style={{width:'100%',height:5,background:'var(--bg-hover)',borderRadius:999,overflow:'hidden'}}>
      <div style={{width:`${pct}%`,height:'100%',background:colors[color]||colors.accent,borderRadius:999,transition:'width .5s'}}/>
    </div>
  );
}

export function Skeleton({ className, height=14, width='100%' }) {
  return <div className="skeleton" style={{height,width,borderRadius:6}} />;
}

export function EmptyState({ icon:Icon, title, description, action }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 24px',textAlign:'center'}}>
      {Icon && <div style={{width:56,height:56,background:'var(--bg-hover)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,border:'1px solid var(--border)'}}><Icon size={24} style={{color:'var(--text-muted)'}}/></div>}
      <p style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:6}}>{title}</p>
      {description && <p style={{fontSize:12,color:'var(--text-muted)',maxWidth:280}}>{description}</p>}
      {action && <div style={{marginTop:16}}>{action}</div>}
    </div>
  );
}

export function Divider({ label }) {
  if (!label) return <div style={{borderTop:'1px solid var(--border)',margin:'12px 0'}}/>;
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,margin:'12px 0'}}>
      <div style={{flex:1,borderTop:'1px solid var(--border)'}}/>
      <span style={{fontSize:11,color:'var(--text-muted)'}}>{label}</span>
      <div style={{flex:1,borderTop:'1px solid var(--border)'}}/>
    </div>
  );
}

// Themed ChartTooltip for recharts
export function ChartTooltip({ active, payload, label, currency=true }) {
  if (!active || !payload?.length) return null;
  const fmt = v => currency && v > 100 ? `₹${Number(v).toLocaleString('en-IN',{maximumFractionDigits:0})}` : Number(v).toLocaleString('en-IN',{maximumFractionDigits:1});
  return (
    <div style={{ background:'var(--chart-tooltip-bg)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'var(--shadow)' }}>
      <p style={{color:'var(--text-secondary)',marginBottom:6,fontWeight:600}}>{label}</p>
      {payload.map((p,i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:p.color,flexShrink:0}}/>
          <span style={{color:'var(--text-secondary)'}}>{p.name}:</span>
          <span style={{color:'var(--text-primary)',fontFamily:'monospace',fontWeight:600}}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
