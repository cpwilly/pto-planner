import React, { useEffect, useState, useRef } from "react";
import "./styles.css";
import { PALETTE, contrastColor } from "./utils";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import Navbar from "./components/Navbar";
import Calendar from "./components/Calendar";
import DayModalContent from "./components/DayModalContent";
import MultiDayModalContent from "./components/MultiDayModalContent";

const stateKey = "timeoff_planner_v3_react";

function defaultData(year) {
  return {
    year,
    categories: [
      {
        id: "cat_holiday",
        name: "Holiday",
        qty: 10,
        used: 0,
        color: PALETTE[9],
      },
      { id: "cat_pto", name: "PTO", qty: 15, used: 0, color: PALETTE[0] },
      { id: "cat_sick", name: "Sick", qty: 10, used: 0, color: PALETTE[4] },
    ],
    events: {},
  };
}

export default function App() {
  const today = new Date();
  const [data, setData] = useState(() => {
    const raw = localStorage.getItem(stateKey);
    if (raw)
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.warn(e);
      }
    return defaultData(today.getFullYear());
  });

    const parseDate = (dstr) => {
      if(!dstr) return null;
      const parts = dstr.split('-').map(x=>parseInt(x,10));
      return new Date(parts[0], (parts[1]||1)-1, parts[2]||1);
    };
  const [yearSelect, setYearSelect] = useState(data.year);
  const [catName, setCatName] = useState("");
  const [catQty, setCatQty] = useState("");
  const [chosenColor, setChosenColor] = useState(PALETTE[0]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCtx, setModalCtx] = useState(null);
  const fileInputRef = useRef(null);
  const dragCatRef = useRef(null);
  const [draggingCatId, setDraggingCatId] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  useEffect(() => {
    localStorage.setItem(stateKey, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    // keep year select in sync
    setYearSelect(data.year);
  }, [data.year]);

  function save(newData) {
    setData(newData);
    localStorage.setItem(stateKey, JSON.stringify(newData));
  }

  function countUsed(catId) {
    let sum = 0;
    Object.values(data.events).forEach((ev) => {
      if (ev && ev.catId === catId) sum += ev.half ? 0.5 : 1;
    });
    return sum;
  }

  function updateUsed(newData) {
    newData.categories.forEach((c) => (c.used = countUsed(c.id)));
  }

  // addCategory can be called with (name, qty, color) or without args (uses local inputs)
  function addCategory(nameArg, qtyArg, colorArg) {
    const name = nameArg != null ? String(nameArg).trim() : catName.trim();
    const qty =
      qtyArg != null ? parseFloat(qtyArg) || 0 : parseFloat(catQty) || 0;
    const color = colorArg || chosenColor || PALETTE[0];
    if (!name || qty <= 0) {
      alert("Please provide a name and quantity > 0");
      return;
    }
    const id = "cat_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
    const next = {
      ...data,
      categories: [...data.categories, { id, name, qty, used: 0, color }],
    };
    updateUsed(next);
    save(next);
    // clear local inputs if used
    setCatName("");
    setCatQty("");
    setChosenColor(PALETTE[0]);
  }

  function deleteCategory(catId) {
    const next = {
      ...data,
      categories: data.categories.filter((c) => c.id !== catId),
    };
    for (const day in next.events)
      if (next.events[day] && next.events[day].catId === catId)
        delete next.events[day];
    updateUsed(next);
    save(next);
  }

  function onDrop(date, e) {
    e.preventDefault();
    const catId =
      e.dataTransfer.getData("text/plain") ||
      (dragCatRef.current && dragCatRef.current.id);
    if (!catId) return;
    const cat = data.categories.find((c) => c.id === catId);
    if (!cat) return;
    const used = countUsed(cat.id);
    if (used + 1 > cat.qty + 0.001) {
      alert("No remaining days in this category");
      return;
    }
    const next = {
      ...data,
      events: { ...data.events, [date]: { catId: cat.id, half: false } },
    };
    updateUsed(next);
    save(next);
    // clear drag state after drop
    setDraggingCatId(null);
    setHoverDate(null);
    dragCatRef.current = null;
  }

  function onDragStartCat(e, cat) {
    dragCatRef.current = cat;
    e.dataTransfer.setData("text/plain", cat.id);
    setDraggingCatId(cat.id);
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = cat.color;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = contrastColor(cat.color);
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cat.name[0] || "•", 32, 32);
    const img = new Image();
    img.src = canvas.toDataURL("image/png");
    img.onload = () => {
      try {
        e.dataTransfer.setDragImage(img, 32, 32);
      } catch (err) {}
    };
  }

  function handleDragEnd() {
    setDraggingCatId(null);
    setHoverDate(null);
    dragCatRef.current = null;
  }

  function openDayModal(date) {
    // support calling with either a date string or a ctx object (for multi-day selection)
    if (!date) return;
    if (typeof date === 'string'){
      setModalCtx({ type: "day", date, ev: data.events[date] || null });
    } else {
      // assume an object ctx for multi-day
      setModalCtx(date);
    }
    setModalOpen(true);
  }

  function applyModalChanges(ctx) {
    if (!ctx) return;
    const next = { ...data, events: { ...data.events } };
    if (ctx.type === 'multi' && Array.isArray(ctx.dates)){
      const half = !!ctx.half;
      const selectedSwap = ctx.swapTo;
      if (selectedSwap){
        ctx.dates.forEach(d => {
          // only apply to weekdays (should already be filtered, but double-check)
          const w = parseDate(d).getDay(); if(w===0||w===6) return;
          next.events[d] = { catId: selectedSwap, half };
        });
        updateUsed(next);
        save(next);
      }
    } else {
      const date = ctx.date;
      const half = !!ctx.half;
      const selectedSwap = ctx.swapTo;
      if (selectedSwap) {
        next.events[date] = { catId: selectedSwap, half };
      } else {
        const ev = next.events[date];
        if (ev && ev.catId) {
          ev.half = half;
        }
      }
      updateUsed(next);
      save(next);
    }
    setModalOpen(false);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `timeoff-${data.year}.json`;
    a.click();
  }

  function importJSONFile(files) {
    const f = files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        if (obj && obj.categories) {
          updateUsed(obj);
          setData(obj);
        } else alert("Invalid file");
      } catch (err) {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(f);
  }

  function clearAll() {
    if (window.confirm("Clear all events?")) {
      const next = { ...data, events: {} };
      updateUsed(next);
      save(next);
    }
  }

  function updateCategory(catId, name, qty, color) {
    const next = {
      ...data,
      categories: data.categories.map((c) =>
        c.id === catId ? { ...c, name, qty, color: color || c.color } : c
      ),
    };
    updateUsed(next);
    save(next);
  }

  // render calendar
  function onYearChange(y) {
    const next = { ...data, year: y };
    setData(next);
    setYearSelect(y);
    save(next);
  }

  return (
    <Box className="app">
      <Navbar
        data={data}
        year={data.year}
        onYearChange={onYearChange}
        catName={catName}
        setCatName={setCatName}
        catQty={catQty}
        setCatQty={setCatQty}
        chosenColor={chosenColor}
        setChosenColor={setChosenColor}
        paletteOpen={paletteOpen}
        setPaletteOpen={setPaletteOpen}
        addCategory={addCategory}
        exportJSON={exportJSON}
        importJSONFile={importJSONFile}
        fileInputRef={fileInputRef}
        deleteCategory={deleteCategory}
        onDragStartCat={onDragStartCat}
        onDragEnd={handleDragEnd}
        draggingCatId={draggingCatId}
        clearAll={clearAll}
        PALETTE={PALETTE}
        updateCategory={updateCategory}
      />

      <Calendar
        data={data}
        onDrop={onDrop}
        openDayModal={openDayModal}
        onDayDragEnter={(date) => setHoverDate(date)}
        onDayDragLeave={(date) => setHoverDate(null)}
        hoverDate={hoverDate}
        draggingCatColor={
          draggingCatId
            ? data.categories.find((c) => c.id === draggingCatId)?.color
            : null
        }
      />

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>Day options</DialogTitle>
        <DialogContent>
          {modalCtx && (modalCtx.type === 'multi' ? (
            <MultiDayModalContent
              ctx={modalCtx}
              data={data}
              onChange={(newCtx) => setModalCtx(newCtx)}
              onRemoveMulti={(dates)=>{
                const next = { ...data, events: { ...data.events } };
                dates.forEach(d=> delete next.events[d]);
                updateUsed(next);
                save(next);
                setModalOpen(false);
              }}
            />
          ) : (
            <DayModalContent
              ctx={modalCtx}
              data={data}
              onChange={(newCtx) => setModalCtx(newCtx)}
              onRemove={(date) => {
                const next = { ...data, events: { ...data.events } };
                delete next.events[date];
                updateUsed(next);
                save(next);
                setModalOpen(false);
              }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Close</Button>
          <Button
            onClick={() => {
              applyModalChanges(modalCtx);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
