import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Loader2, RefreshCw, TrendingUp, AlertTriangle, Target, Lightbulb, Package, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Badge, Button, PageHeader } from '../../components/ui/index';

const SUGGESTED = [
  { icon:TrendingUp, label:'Sales Performance', prompt:'Analyze our sales performance. Which categories and time periods are growing? What are our top 3 opportunities for next quarter?' },
  { icon:AlertTriangle, label:'Risk Alerts', prompt:'What are the key risks in our sales and inventory data? Any concerning trends I should act on immediately?' },
  { icon:Target, label:'Category Strategy', prompt:'Which product categories should we focus on to maximize profit margins? Give specific, actionable recommendations.' },
  { icon:Lightbulb, label:'Pricing Strategy', prompt:'Based on our sales data, what pricing adjustments would improve overall margins? Which products are underpriced or overpriced?' },
  { icon:Sparkles, label:'Seasonal Planning', prompt:'Identify seasonal trends in our sales. How should we adjust inventory levels for the next 3 months?' },
  { icon:Users, label:'Customer Retention', prompt:'Who are our most valuable customers? What strategies would help us retain wholesale buyers and grow retail?' },
  { icon:Package, label:'Inventory Optimization', prompt:'Which items are overstocked and which are likely to run out? Recommend reorder quantities for the top 10 items.' },
  { icon:TrendingUp, label:'Growth Forecast', prompt:'Based on our historical data, what sales growth can we realistically expect in the next 6 months? What would drive faster growth?' },
];

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{display:'flex',gap:10,marginBottom:14,flexDirection:isUser?'row-reverse':'row'}}>
      <div style={{width:32,height:32,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:isUser?'var(--accent-bg)':'linear-gradient(135deg,rgba(236,72,153,.15),rgba(139,92,246,.15)',border:`1px solid ${isUser?'var(--accent-border)':'rgba(139,92,246,.2)'}`}}>
        {isUser?<User size={14} style={{color:'var(--accent)'}}/>:<Bot size={14} style={{color:'#a78bfa'}}/>}
      </div>
      <div style={{maxWidth:'80%',background:isUser?'var(--accent-bg)':'var(--bg-hover)',border:`1px solid ${isUser?'var(--accent-border)':'var(--border)'}`,borderRadius:isUser?'16px 4px 16px 16px':'4px 16px 16px 16px',padding:'10px 14px',fontSize:13,lineHeight:1.6,color:'var(--text-primary)'}}>
        {msg.loading?(
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Loader2 size={13} style={{animation:'spin .8s linear infinite',color:'#a78bfa'}}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <span style={{color:'var(--text-muted)',fontSize:12}}>Analyzing your business data...</span>
          </div>
        ):(
          <div style={{whiteSpace:'pre-wrap'}}>{msg.content}</div>
        )}
      </div>
    </div>
  );
}

export default function AIInsightsPage() {
  const [messages, setMessages] = useState([{
    role:'assistant',
    content:`Hello! I'm your AI business analyst for Kanthi Textiles. I have access to your live sales data, inventory levels, customer analytics, and financial metrics.\n\nI can help you with:\n• Sales trend analysis & revenue forecasting\n• Category and product performance deep dives\n• Customer segmentation and retention strategies\n• Inventory optimization and reorder planning\n• Pricing strategy and margin improvement\n\nWhat would you like to explore today?`
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('kt_anthropic_key')||'');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('kt_anthropic_key'));
  const [tempKey, setTempKey] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const saveKey = () => {
    if (!tempKey.trim()) return;
    localStorage.setItem('kt_anthropic_key', tempKey.trim());
    setApiKey(tempKey.trim()); setShowKeyInput(false);
    toast.success('API key saved locally');
  };

  const buildContext = async () => {
    try {
      const [stats,monthly,categories,regions,top] = await Promise.all([
        window.electron.db.getDashboardStats(),
        window.electron.db.getMonthlySales(6),
        window.electron.db.getCategoryAnalysis(),
        window.electron.db.getRegionAnalysis(),
        window.electron.db.getTopProducts(5),
      ]);
      return `KANTHI TEXTILES — LIVE BUSINESS DATA
Generated: ${new Date().toLocaleString()}

OVERALL PERFORMANCE:
- Total Revenue: ₹${Number(stats.totalSales).toLocaleString('en-IN')}
- Total Orders: ${stats.totalOrders?.toLocaleString()}
- Total Profit: ₹${Number(stats.totalProfit).toLocaleString('en-IN')}
- Avg Order Value: ₹${Number(stats.avgOrderValue).toFixed(0)}
- Unique Customers: ${stats.uniqueCustomers}
- This Month Sales: ₹${Number(stats.thisMonthSales).toLocaleString('en-IN')}
- Month-over-Month Growth: ${stats.monthGrowth?.toFixed(1)}%
- Low Stock Items: ${stats.lowStockItems}
- Total Inventory Value: ₹${Number(stats.totalInventoryValue).toLocaleString('en-IN')}

LAST 6 MONTHS:
${monthly.map(m=>`${m.label}: Revenue ₹${Number(m.sales).toLocaleString('en-IN')}, Profit ₹${Number(m.profit).toLocaleString('en-IN')}, Orders ${m.orders}`).join('\n')}

TOP CATEGORIES (by revenue):
${categories.slice(0,6).map(c=>`${c.category}: ₹${Number(c.total_sales).toLocaleString('en-IN')} revenue, ${c.margin_pct}% margin, ${c.transactions} transactions`).join('\n')}

REGIONAL PERFORMANCE:
${regions.map(r=>`${r.region}: ₹${Number(r.total_sales).toLocaleString('en-IN')} sales, ${r.customers} customers`).join('\n')}

TOP 5 PRODUCTS:
${top.map(p=>`${p.product_name} (${p.category}): ₹${Number(p.total_sales).toLocaleString('en-IN')}, ${p.total_qty} units sold`).join('\n')}`;
    } catch(e) { return 'Live data context unavailable.'; }
  };

  const send = async (text) => {
    if (!text.trim() || loading) return;
    if (!apiKey) { setShowKeyInput(true); toast.error('Set your API key first'); return; }

    const userMsg = {role:'user',content:text};
    const loadingMsg = {role:'assistant',content:'',loading:true};
    setMessages(prev=>[...prev,userMsg,loadingMsg]);
    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height='auto'; }
    setLoading(true);

    try {
      const context = await buildContext();
      const system = `You are an expert business analyst for Kanthi Textiles, a textile retailer in India specialising in Kalamkari products, sarees, fabrics, bags, bedsheets, and more.

You have access to REAL-TIME business data:
${context}

Guidelines:
- Be specific — reference actual numbers from the data above
- Give actionable, prioritised recommendations
- Use Indian business context (₹ INR, Indian market dynamics, festive seasons)
- Keep responses focused and practical — no fluff
- Format with clear bullet points or sections when listing multiple items
- Proactively flag risks or opportunities you notice in the data`;

      const history = messages.filter(m=>!m.loading).slice(-8).map(m=>({role:m.role,content:m.content}));
      history.push({role:'user',content:text});

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key':apiKey,
          'anthropic-version':'2023-06-01',
          'anthropic-dangerous-direct-browser-access':'true',
        },
        body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1024, system, messages:history }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message||`API error ${response.status}`);
      }
      const data = await response.json();
      const reply = data.content?.[0]?.text || 'No response received.';
      setMessages(prev=>[...prev.slice(0,-1),{role:'assistant',content:reply}]);
    } catch(e) {
      setMessages(prev=>[...prev.slice(0,-1),{role:'assistant',content:`Error: ${e.message}`}]);
      toast.error('AI request failed');
    }
    setLoading(false);
  };

  const inputSt = { background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-primary)', borderRadius:8, padding:'7px 10px', fontSize:12, outline:'none', fontFamily:'inherit' };

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'20px 24px 12px',flexShrink:0}}>
        <PageHeader title="AI Insights" subtitle="Claude-powered analyst with live business data context" icon={Sparkles} iconColor="#a78bfa"
          actions={<Button variant="ghost" size="sm" icon={RefreshCw} onClick={()=>setMessages([{role:'assistant',content:'Chat cleared. How can I help analyze your business today?'}])}>Clear Chat</Button>}/>
      </div>

      {/* API Key Banner */}
      {showKeyInput && (
        <div style={{margin:'0 24px 12px',background:'var(--gold-bg)',border:'1px solid rgba(245,158,11,.25)',borderRadius:12,padding:'12px 16px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
            <Sparkles size={15} style={{color:'var(--gold)',marginTop:1,flexShrink:0}}/>
            <div style={{flex:1}}>
              <p style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',marginBottom:4}}>Connect Claude AI</p>
              <p style={{fontSize:11,color:'var(--text-muted)',marginBottom:10}}>Get a free API key at <b>console.anthropic.com</b>. Your key is stored only on this device.</p>
              <div style={{display:'flex',gap:8}}>
                <input type="password" placeholder="sk-ant-api03-..." value={tempKey} onChange={e=>setTempKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveKey()} style={{...inputSt,flex:1,fontFamily:'monospace',fontSize:11}}/>
                <button onClick={saveKey} style={{background:'var(--accent)',color:'white',border:'none',borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
                {apiKey && <button onClick={()=>setShowKeyInput(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:12,fontFamily:'inherit'}}>Cancel</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',flex:1,overflow:'hidden',gap:14,padding:'0 24px 16px'}}>
        {/* Chat */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <Card style={{flex:1,overflowY:'auto',padding:16,marginBottom:10}}>
            {messages.map((m,i)=><Bubble key={i} msg={m}/>)}
            <div ref={bottomRef}/>
          </Card>

          {/* Input */}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,display:'flex',alignItems:'flex-end',gap:10,padding:'10px 12px'}}>
            <textarea ref={textareaRef} value={input} onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder={apiKey?"Ask about sales trends, inventory, customers, forecasts...":"Set API key above to enable AI insights"} rows={1} disabled={loading||!apiKey} style={{flex:1,background:'transparent',border:'none',color:'var(--text-primary)',resize:'none',outline:'none',fontSize:13,lineHeight:1.5,maxHeight:120,overflowY:'auto',fontFamily:'inherit',minHeight:24,placeholder:'var(--text-muted)'}}/>
            <button onClick={()=>send(input)} disabled={loading||!input.trim()||!apiKey} style={{width:36,height:36,background:'var(--accent)',border:'none',borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:loading||!input.trim()||!apiKey?.4:1,transition:'opacity .15s'}}>
              {loading?<Loader2 size={14} color="white" style={{animation:'spin .8s linear infinite'}}/>:<Send size={14} color="white"/>}
            </button>
          </div>
          {!apiKey && <p style={{fontSize:11,textAlign:'center',color:'var(--text-muted)',marginTop:6}}><button onClick={()=>setShowKeyInput(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontFamily:'inherit',fontSize:11}}>Add API key</button> to enable AI analysis</p>}
        </div>

        {/* Prompt suggestions */}
        <div style={{width:200,flexShrink:0,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
          <p style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',marginBottom:4}}>Quick Questions</p>
          {SUGGESTED.map(({icon:Icon,label,prompt})=>(
            <button key={label} onClick={()=>send(prompt)} disabled={loading||!apiKey}
              style={{textAlign:'left',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',cursor:'pointer',fontFamily:'inherit',transition:'all .15s',opacity:loading||!apiKey?.5:1,width:'100%'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent-border)';e.currentTarget.style.background='var(--bg-hover)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--bg-card)';}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                <Icon size={12} style={{color:'var(--accent)',flexShrink:0}}/>
                <span style={{fontSize:11,fontWeight:700,color:'var(--text-primary)'}}>{label}</span>
              </div>
              <p style={{fontSize:10,color:'var(--text-muted)',lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{prompt}</p>
            </button>
          ))}
          <div style={{marginTop:4,padding:'8px 10px',background:'var(--bg-hover)',border:'1px solid var(--border)',borderRadius:10}}>
            <p style={{fontSize:10,color:'var(--text-muted)',lineHeight:1.5}}>AI receives your live sales, inventory, and analytics data with every message.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
