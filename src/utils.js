export const PALETTE = ['#60a5fa','#7c3aed','#f97316','#ef4444','#34d399','#f59e0b','#10b981','#0ea5e9','#a78bfa','#f472b6'];

export function contrastColor(hex){
  hex = hex.replace('#','');
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
  return lum > 0.55 ? '#042029' : '#ffffff';
}

export function formatNumberForDisplay(value, used){
  const usedHasHalf = Math.abs(used - Math.round(used)) > 0.001;
  return usedHasHalf ? value.toFixed(1) : String(Math.round(value));
}

export function hexToRgba(hex, alpha = 1){
  if(!hex) return `rgba(0,0,0,${alpha})`;
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
