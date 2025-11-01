import React from 'react';
import { hexToRgba } from '../utils';

export default function Calendar({ data, onDrop, openDayModal, onDayDragEnter, onDayDragLeave, hoverDate, draggingCatColor }){
  function renderCalendar(){
    const year = data.year;
    const months = [];
    for(let m=0;m<12;m++){
      const first = new Date(year,m,1).getDay();
      const daysInMonth = new Date(year,m+1,0).getDate();
      const cells = [];
      for(let i=0;i<first;i++) cells.push({ empty: true });
      for(let d=1; d<=daysInMonth; d++){
        const date = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const ev = data.events[date];
        cells.push({ date, day:d, ev });
      }
      months.push({ m, name: new Date(year,m,1).toLocaleString(undefined,{month:'long'}), cells });
    }
    return months;
  }

  const months = renderCalendar();

  return (
    <div className="calendar">
      <div className="year-grid">
        {months.map(month => (
          <div key={month.m} className="month">
            <h3 className="month-title">{month.name} {data.year}</h3>
            <div className="weekdays">{['S','M','T','W','T','F','S'].map(d=> <div key={d}>{d}</div>)}</div>
            <div className="days">
                {month.cells.map((cell, i) => {
                if(cell.empty) return <div key={i} className="day inactive" />;
                  const ev = cell.ev;
                  const date = cell.date;
                  // if event exists, use its color; otherwise don't set background so weekend CSS can apply
                  const bg = ev && ev.catId ? (data.categories.find(c=>c.id===ev.catId)?.color || undefined) : undefined;
                  const isHover = hoverDate === date && draggingCatColor;
                  const dropFill = draggingCatColor ? hexToRgba(draggingCatColor, 0.12) : undefined;
                  const dropOutline = draggingCatColor ? hexToRgba(draggingCatColor, 0.5) : undefined;
                  const weekday = new Date(date).getDay();
                  const isWeekend = weekday === 5 || weekday === 6;
                  // if weekend and previous or next cell is filled, consider it connected
                  
                  // check adjacent cells (left/right) to see if they're also filled, to visually connect edges
                  const prevCell = month.cells[i-1];
                  const nextCell = month.cells[i+1];
                  const prevIsWeekend = false;
                  const nextIsWeekend = false;
                //   const prevIsWeekend = prevCell && !prevCell.empty && (new Date(prevCell.date).getDay() === 5 || new Date(prevCell.date).getDay() === 6);
                //   const nextIsWeekend = nextCell && !nextCell.empty && (new Date(nextCell.date).getDay() === 5 || new Date(nextCell.date).getDay() === 6);
                  const leftConnected = prevCell && !prevCell.empty && (prevCell.ev || prevIsWeekend);
                  const rightConnected = nextCell && !nextCell.empty && (nextCell.ev || nextIsWeekend);
                  const connClass = leftConnected && rightConnected ? ' connected-both' : leftConnected ? ' connected-left' : rightConnected ? ' connected-right' : '';
                return (
                  <div key={date}
                    className={'day' + (ev ? ' filled' : '') + connClass + (isHover ? ' drop-target' : '') + (isWeekend ? ' weekend' : '')}
                    onDragOver={(e)=>{ e.preventDefault(); onDayDragEnter && onDayDragEnter(date); }}
                    onDrop={(e)=>onDrop(date,e)}
                    onDragLeave={()=> onDayDragLeave && onDayDragLeave(date)}
                    onClick={()=> openDayModal(date)}
                    style={{background: isHover ? dropFill : (bg || undefined), ['--drop-color']: dropOutline }}
                  >
                    <div className="date-num" style={{color: ev ? (function(){
                      try{ const col = data.categories.find(c=>c.id===ev.catId)?.color || '#000'; const c = col.replace('#',''); const r = parseInt(c.substring(0,2),16); const g = parseInt(c.substring(2,4),16); const b = parseInt(c.substring(4,6),16); const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255; return lum > 0.55 ? '#042029' : '#ffffff'; }catch(e){return '#ffffff'}
                    })() : undefined}}>{cell.day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
