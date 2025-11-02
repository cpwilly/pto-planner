import React, { useState } from "react";
import { Box, Button, Select, MenuItem, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import { hexToRgba } from '../utils';
import CategoryEditor from "./CategoryEditor";

export default function Navbar({
  data,
  year,
  onYearChange,
  addCategory,
  exportJSON,
  importJSONFile,
  fileInputRef,
  deleteCategory,
  onDragStartCat,
  onDragEnd,
  draggingCatId,
  clearAll,
  PALETTE,
  updateCategory,
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState(null);

  function openCreate() {
    setEditorInitial(null);
    setEditorOpen(true);
  }
  function openEdit(cat) {
    setEditorInitial(cat);
    setEditorOpen(true);
  }

  return (
    <Box className="navbar">
      <Typography variant="h6">Time Off Planner</Typography>

      <Typography className="label spacer">
        Year
      </Typography>
      <Select value={year} onChange={(e) => onYearChange(+e.target.value)}>
        {Array.from({ length: 7 }).map((_, i) => {
          const y = year - 1 + i;
          return (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          );
        })}
      </Select>

      <Typography className="label spacer">
        Categories
      </Typography>
      <Box id="categories">

        {data.categories.map((cat) => {
          const used = cat.used || 0;
          const remaining = Math.max(0, cat.qty - used);
          const containerStyle = draggingCatId===cat.id ? { background: hexToRgba(cat.color, 0.06) } : {};
          return (
            <Box key={cat.id} className={"category" + (draggingCatId===cat.id? ' dragging':'')} draggable onDragStart={(e) => onDragStartCat(e, cat)} onDragEnd={()=> onDragEnd && onDragEnd()} style={containerStyle}>
              <div className="cat-color" onClick={() => openEdit(cat)} style={{background: cat.color}} />
              <Box className="meta flex-1" onClick={() => openEdit(cat)}>
                <div className="name">{cat.name}</div>
                <div className="qty">
                  {remaining}/{cat.qty} remaining
                </div>
              </Box>
              <Box className="actions">
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(cat);
                  }}
                  className="small-btn"
                >
                  Edit
                </Button>
              </Box>
            </Box>
          );
        })}
        {/* Ghost "create" category inline */}
        <Box key="__create" className="category create-ghost" onClick={() => openCreate()}>
          <div className="create-icon">+</div>
          <Box className="meta">
            <div className="name muted-text">Add new category</div>
            <div className="qty muted-text">Click to create</div>
          </Box>
          <Box className="actions">
            <Button size="small" className="small-btn">Create</Button>
          </Box>
        </Box>
      </Box>

      <div className="footer-note">
        Drag a category square to any day. Click a filled day to remove, swap,
        or convert to half-day.
      </div>
      <Box className="spacer-top">
        <Button variant="outlined" className="small-btn" onClick={clearAll}>
          Clear All
        </Button>
      </Box>

      {/* import/export moved to bottom */}
      <Box className="import-export">
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportJSON}
        >
          Export
        </Button>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          Import
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json" className="file-input" onChange={(e) => importJSONFile(e.target.files)} />
      </Box>

      <CategoryEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editorInitial || {}}
        PALETTE={PALETTE}
        onSave={(payload) => {
          if (payload.id)
            updateCategory(
              payload.id,
              payload.name,
              payload.qty,
              payload.color
            );
          else
            addCategory &&
              addCategory(payload.name, payload.qty, payload.color);
        }}
        onDelete={(id) => deleteCategory(id)}
      />
    </Box>
  );
}
