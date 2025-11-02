import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Typography } from '@mui/material';

export default function CategoryEditor({ open, onClose, initial = {}, PALETTE = [], onSave, onDelete }){
  const [name, setName] = useState(initial.name || '');
  const [qty, setQty] = useState(initial.qty != null ? String(initial.qty) : '');
  const [color, setColor] = useState(initial.color || (PALETTE[0] || '#60a5fa'));

  useEffect(()=>{
    setName(initial.name || '');
    setQty(initial.qty != null ? String(initial.qty) : '');
    setColor(initial.color || (PALETTE[0] || '#60a5fa'));
  }, [initial, open]);

  function handleSave(){
    const n = name.trim();
    const q = parseFloat(qty) || 0;
    if(!n || q <= 0){ alert('Please provide a name and quantity > 0'); return; }
    onSave({ id: initial.id, name: n, qty: q, color });
    onClose();
  }

  function handleDelete(){
    if(!initial.id) return; // nothing to delete
    if(window.confirm('Delete category and remove its events?')){
      onDelete(initial.id);
      onClose();
    }
  }

  return (
    <Dialog open={!!open} onClose={onClose}>
      <DialogTitle>{initial.id ? 'Edit category' : 'Create category'}</DialogTitle>
      <DialogContent>
        <div className="editor-content">
          <TextField label="Category name" value={name} onChange={(e)=>setName(e.target.value)} />
          <TextField label="Quantity (days)" type="number" value={qty} onChange={(e)=>setQty(e.target.value)} />

          <div>
            <Typography variant="subtitle2" className="mb-1">Pick a color</Typography>
            <div className="palette">
              {PALETTE.map(col=> (
                <div key={col} onClick={()=>setColor(col)} className={"swatch" + (color===col ? ' selected' : '')} style={{background: col}} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogActions className="dialog-actions">
        {initial.id ? <Button color="error" onClick={handleDelete}>Delete</Button> : null}
        <div style={{flex:1}} />
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>{initial.id ? 'Save' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
