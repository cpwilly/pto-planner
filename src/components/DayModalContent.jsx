import React, { useEffect, useState } from 'react';
import { Button } from '@mui/material';

export default function DayModalContent({ ctx, data, onChange, onRemove }){
  const ev = ctx.ev;
  const [swapTo, setSwapTo] = useState(ev ? ev.catId : '');
  const [half, setHalf] = useState(ev ? !!ev.half : false);

  useEffect(()=> {
    onChange({...ctx, swapTo, half});
  }, [swapTo, half]);

  return (
    <div className="day-modal">
      <div className="modal-section">
        {ev && ev.catId ? (
          <div className="modal-header">
            <div className="cat-pill" style={{background: data.categories.find(x=>x.id===ev.catId)?.color}} />
            <strong>{data.categories.find(x=>x.id===ev.catId)?.name}</strong> {ev.half ? '(Half day)' : ''}
          </div>
        ) : <div>No time off on this day</div>}
      </div>

      <div className="modal-section">
        <select value={swapTo} onChange={(e)=>setSwapTo(e.target.value)} className="swap-select">
          <option value=''>-- Swap to another category --</option>
          {data.categories.map(c=> <option key={c.id} value={c.id}>{c.name} ({(c.qty - c.used).toFixed(1)} left)</option>)}
        </select>
      </div>

      <div className="seg-group">
        <button className={'seg-btn' + (!half ? ' selected' : '')} onClick={()=>setHalf(false)}>Full day</button>
        <button className={'seg-btn' + (half ? ' selected' : '')} onClick={()=>setHalf(true)}>Half day</button>
      </div>

      <div className="modal-section">
        <Button variant="outlined" onClick={()=>{
            onRemove(ctx.date);
        }}>Remove day</Button>
      </div>
    </div>
  );
}
