import React, { useState } from 'react';
import { Layers, Database, Sparkles, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

export default function SeedScreen({ onSeeded }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const { isDark, toggle } = useTheme();

  async function handleSeed() {
    setLoading(true);
    try {
      setProgress('Creating database schema...');
      await new Promise(r=>setTimeout(r,300));
      setProgress('Loading stock register data...');
      await new Promise(r=>setTimeout(r,300));
      setProgress('Generating sales history...');
      const result = await window.electron.db.seedDemoData();
      setProgress(`✓ Loaded ${result.inserted?.toLocaleString()} transactions`);
      await new Promise(r=>setTimeout(r,500));
      toast.success('Demo data loaded!');
      onSeeded();
    } catch(e) { toast.error('Seed failed: '+e.message); setLoading(false); }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--bg-primary)',alignItems:'center',justifyContent:'center'}}>
      <div style={{maxWidth:420,width:'100%',padding:'0 20px',textAlign:'center'}}>
        <div style={{width:72,height:72,background:'var(--accent)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 0 30px rgba(20,184,166,.3)'}}>
          <Layers size={32} color="white"/>
        </div>
        <h1 style={{fontSize:28,fontWeight:800,color:'var(--text-primary)',marginBottom:6}}>Kanthi Textiles</h1>
        <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:28}}>Analytics & Inventory Suite v2.0</p>

        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,marginBottom:20,textAlign:'left'}}>
          {[
            [Database,'1 year of sales transactions','Your exact stock categories'],
            [Package,'Kalamkari, Sarees, Fabrics, Bags…','All 10 product categories'],
            [Sparkles,'Customer analytics & forecasting','AI insights with Claude'],
          ].map(([Icon, t, s],i) => (
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom: i<2?12:0}}>
              <Icon size={15} style={{color:'var(--accent)',marginTop:2,flexShrink:0}}/>
              <div>
                <p style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{t}</p>
                <p style={{fontSize:11,color:'var(--text-muted)'}}>{s}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:'center'}}>
            <div style={{width:36,height:36,border:'3px solid var(--accent)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 10px'}}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{fontSize:12,color:'var(--text-secondary)',fontFamily:'monospace'}}>{progress}</p>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <button onClick={handleSeed} style={{padding:'12px',background:'var(--accent)',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              Load Demo Data & Start
            </button>
            <button onClick={onSeeded} style={{padding:'10px',background:'var(--bg-hover)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:12,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
              Start with Empty Database
            </button>
          </div>
        )}
        <button onClick={toggle} style={{marginTop:20,background:'none',border:'none',cursor:'pointer',fontSize:11,color:'var(--text-muted)',fontFamily:'inherit'}}>
          Switch to {isDark?'Light':'Dark'} mode
        </button>
      </div>
    </div>
  );
}
