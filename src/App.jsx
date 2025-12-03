import React, { useEffect, useState, useRef } from "react";
import "./styles.css";
import { PALETTE, contrastColor, hexToRgba } from "./utils";
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
import { holidays_observed_2025_2030 } from "./components/holidays.constants.jsx";

const stateKey = "timeoff_planner_v4_react";

function defaultDataForYear(year) {
  return {
    categories: [
      { id: "cat_pto", name: "PTO", qty: 15, used: 0, color: PALETTE[0] },
      { id: "cat_sick", name: "Sick", qty: 10, used: 0, color: PALETTE[5] },
      {
        id: "cat_holiday",
        name: "Holiday",
        qty: 10,
        used: 0,
        color: PALETTE[6],
      },
    ],
    events: {},
  };
}

export default function App() {
  const today = new Date();
  const [data, setData] = useState(() => {
    const raw = localStorage.getItem(stateKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // migrate old single-year shape -> keep top-level cats/events and add years map
        if (parsed && parsed.categories && parsed.year && !parsed.years) {
          const years = {};
          years[parsed.year] = {
            categories: parsed.categories,
            events: parsed.events || {},
          };
          return {
            year: parsed.year,
            years,
            categories: parsed.categories,
            events: parsed.events || {},
          };
        }
        // already new-format (multi-year)
        if (parsed && parsed.years && parsed.year) {
          const yd =
            parsed.years[parsed.year] || defaultDataForYear(parsed.year);
          return {
            ...parsed,
            categories: parsed.categories || yd.categories,
            events: parsed.events || yd.events,
          };
        }
      } catch (e) {
        console.warn(e);
      }
    }
    const y = today.getFullYear();
    const yd = defaultDataForYear(y);
    return {
      year: y,
      years: { [y]: yd },
      categories: yd.categories,
      events: yd.events,
    };
  });

  const parseDate = (dstr) => {
    if (!dstr) return null;
    const parts = dstr.split("-").map((x) => parseInt(x, 10));
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  };
  const [yearSelect, setYearSelect] = useState(data.year);
  const [showWelcome, setShowWelcome] = useState(() => {
    // show welcome only if there is no saved state yet
    try {
      return !localStorage.getItem(stateKey);
    } catch (e) {
      return true;
    }
  });
  const [catName, setCatName] = useState("");
  const [catQty, setCatQty] = useState("");
  const [chosenColor, setChosenColor] = useState(PALETTE[0]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCtx, setModalCtx] = useState(null);
  const fileInputRef = useRef(null);
  const dragCatRef = useRef(null);
  const dragDayRef = useRef(null);
  const dragImageRef = useRef(null);
  const [draggingCatId, setDraggingCatId] = useState(null);
  const [draggingDayDate, setDraggingDayDate] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  useEffect(() => {
    localStorage.setItem(stateKey, JSON.stringify(data));
  }, [data]);

  // On initial mount ensure the active year has holiday events populated
  useEffect(() => {
    const next = JSON.parse(JSON.stringify(data));
    const y = next.year;
    const changed = populateHolidaysForYear(next, y);
    if (changed) {
      updateUsed(next);
      save(next);
    }
  }, []);

  useEffect(() => {
    // keep year select in sync
    setYearSelect(data.year);
  }, [data.year]);

  function save(newData) {
    // ensure years map exists and mirror the top-level categories/events
    const copy = JSON.parse(JSON.stringify(newData));
    copy.years = copy.years || {};
    // merge with any existing year meta (preserve flags like holidaysPopulated)
    copy.years[copy.year] = {
      ...(copy.years[copy.year] || {}),
      categories: copy.categories,
      events: copy.events || {},
    };
    setData(copy);
    localStorage.setItem(stateKey, JSON.stringify(copy));
  }

  function countUsed(catId) {
    let sum = 0;
    Object.values(data.events || {}).forEach((ev) => {
      if (ev && ev.catId === catId) sum += ev.half ? 0.5 : 1;
    });
    return sum;
  }

  function updateUsed(newData) {
    // Count usage against the provided newData.events so counts are accurate
    // immediately after mutating or creating the new data object.
    (newData.categories || []).forEach((c) => {
      let sum = 0;
      Object.values(newData.events || {}).forEach((ev) => {
        if (ev && ev.catId === c.id) sum += ev.half ? 0.5 : 1;
      });
      c.used = sum;
    });
    // mirror into years map as well if present, but merge so we don't drop flags
    if (newData.years && newData.year) {
      newData.years[newData.year] = {
        ...(newData.years[newData.year] || {}),
        categories: newData.categories,
        events: newData.events || {},
      };
    }
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
    const payload =
      e.dataTransfer.getData("text/plain") ||
      (dragCatRef.current && dragCatRef.current.id) ||
      (dragDayRef.current && `day:${dragDayRef.current}`);
    if (!payload) return;
    // if payload is a moved day
    if (payload && payload.startsWith("day:")) {
      const from = payload.slice(4);
      if (!from || from === date) {
        // nothing to do
        setDraggingDayDate(null);
        dragDayRef.current = null;
        return;
      }
      const next = { ...data, events: { ...data.events } };
      next.events[date] = next.events[from];
      delete next.events[from];
      updateUsed(next);
      save(next);
      setDraggingDayDate(null);
      dragDayRef.current = null;
      setHoverDate(null);
      return;
    }
    // otherwise treat as category drag (existing behavior)
    const catId = payload;
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
    // build a rectangular translucent drag image with the category color
    try {
      const w = 100;
      const h = 40;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      // rounded rect background
      const radius = 8;
      ctx.fillStyle = hexToRgba(cat.color, 0.9);
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(w - radius, 0);
      ctx.quadraticCurveTo(w, 0, w, radius);
      ctx.lineTo(w, h - radius);
      ctx.quadraticCurveTo(w, h, w - radius, h);
      ctx.lineTo(radius, h);
      ctx.quadraticCurveTo(0, h, 0, h - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();
      // text label
      ctx.fillStyle = contrastColor(cat.color);
      ctx.font = "600 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = cat.name || "Time Off";
      ctx.fillText(label, w / 2, h / 2);

      // Create a DOM element that uses the canvas data as a background image and attach
      // it to the document so setDragImage is reliable across browsers.
      const dataUrl = canvas.toDataURL();
      const node = document.createElement("div");
      node.style.width = w + "px";
      node.style.height = h + "px";
      node.style.backgroundImage = `url(${dataUrl})`;
      node.style.backgroundSize = "cover";
      node.style.position = "absolute";
      node.style.left = "-9999px";
      node.style.top = "-9999px";
      node.style.pointerEvents = "none";
      document.body.appendChild(node);
      dragImageRef.current = node;
      try {
        e.dataTransfer.setDragImage(node, w / 2, h / 2);
      } catch (err) {}
    } catch (err) {
      // fallback silently
    }
  }

  function onDayDragStart(date, e) {
    dragDayRef.current = date;
    setDraggingDayDate(date);
    e.dataTransfer.setData("text/plain", `day:${date}`);
    // set drag image to a small colored square representing the category
    try {
      const ev = data.events[date];
      const cat = ev && data.categories.find((c) => c.id === ev.catId);
      const color = (cat && cat.color) || "#999";
      const w = 140;
      const h = 40;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      const radius = 8;
      ctx.fillStyle = hexToRgba(color, 0.9);
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(w - radius, 0);
      ctx.quadraticCurveTo(w, 0, w, radius);
      ctx.lineTo(w, h - radius);
      ctx.quadraticCurveTo(w, h, w - radius, h);
      ctx.lineTo(radius, h);
      ctx.quadraticCurveTo(0, h, 0, h - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = contrastColor(color);
      ctx.font = "600 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = (cat && cat.name) || "Time Off";
      ctx.fillText(label, w / 2, h / 2);

      const dataUrl = canvas.toDataURL();
      const node = document.createElement("div");
      node.style.width = w + "px";
      node.style.height = h + "px";
      node.style.backgroundImage = `url(${dataUrl})`;
      node.style.backgroundSize = "cover";
      node.style.position = "absolute";
      node.style.left = "-9999px";
      node.style.top = "-9999px";
      node.style.pointerEvents = "none";
      document.body.appendChild(node);
      dragImageRef.current = node;
      try {
        e.dataTransfer.setDragImage(node, w / 2, h / 2);
      } catch (err) {}
    } catch (err) {
      // ignore
    }
  }

  function onDayDragEnd() {
    dragDayRef.current = null;
    setDraggingDayDate(null);
    setHoverDate(null);
    // cleanup drag image element if created
    try {
      if (dragImageRef.current && dragImageRef.current.parentNode)
        dragImageRef.current.parentNode.removeChild(dragImageRef.current);
    } catch (e) {}
    dragImageRef.current = null;
  }

  function handleDragEnd() {
    setDraggingCatId(null);
    setHoverDate(null);
    dragCatRef.current = null;
    try {
      if (dragImageRef.current && dragImageRef.current.parentNode)
        dragImageRef.current.parentNode.removeChild(dragImageRef.current);
    } catch (e) {}
    dragImageRef.current = null;
  }

  function openDayModal(date) {
    // support calling with either a date string or a ctx object (for multi-day selection)
    if (!date) return;
    if (typeof date === "string") {
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
    if (ctx.type === "multi" && Array.isArray(ctx.dates)) {
      const half = !!ctx.half;
      const selectedSwap = ctx.swapTo;
      if (selectedSwap) {
        ctx.dates.forEach((d) => {
          // only apply to weekdays (should already be filtered, but double-check)
          const w = parseDate(d).getDay();
          if (w === 0 || w === 6) return;
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
        // avoid mutating nested objects in-place; replace the event object so
        // React sees the change clearly and downstream calculations use the
        // updated value immediately.
        if (next.events[date] && next.events[date].catId) {
          next.events[date] = { ...next.events[date], half };
        }
      }
      updateUsed(next);
      save(next);
    }
    setModalOpen(false);
  }

  function exportJSON() {
    // export only the active year's data
    const yd = {
      year: data.year,
      categories: data.categories,
      events: data.events,
    };
    const blob = new Blob([JSON.stringify(yd, null, 2)], {
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
        if (obj && obj.categories && obj.year) {
          // import into the file's year slot and make it active
          const next = JSON.parse(JSON.stringify(data));
          next.year = obj.year;
          next.categories = obj.categories;
          next.events = obj.events || {};
          next.years = next.years || {};
          next.years[obj.year] = {
            categories: obj.categories,
            events: obj.events || {},
          };
          updateUsed(next);
          save(next);
        } else if (obj && obj.categories) {
          // legacy shape without year: import into current year
          const next = JSON.parse(JSON.stringify(data));
          next.categories = obj.categories;
          next.events = obj.events || {};
          next.years = next.years || {};
          next.years[next.year] = {
            categories: next.categories,
            events: next.events,
          };
          updateUsed(next);
          save(next);
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
      next.years = next.years || {};
      next.years[next.year] = { categories: next.categories, events: {} };
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

  function getHolidayDatesForYear(y) {
    const rec = (holidays_observed_2025_2030 || []).find((h) => h.year === y);
    if (!rec) return [];
    return Object.keys(rec)
      .filter((k) => k !== "year")
      .map((k) => rec[k])
      .filter(Boolean);
  }

  function ensureHolidayCategory(next) {
    // find by id or name
    let cat = (next.categories || []).find(
      (c) =>
        c.id === "cat_holiday" || (c.name && c.name.toLowerCase() === "holiday")
    );
    if (!cat) {
      const id = "cat_holiday";
      const color = PALETTE[6];
      const obj = { id, name: "Holiday", qty: 10, used: 0, color };
      next.categories = [...(next.categories || []), obj];
      cat = obj;
    }
    return cat.id;
  }

  function populateHolidaysForYear(next, y) {
    // ensure years map exists
    next.years = next.years || {};
    // If this year was already populated before, don't populate again
    if (next.years[y] && next.years[y].holidaysPopulated) return false;
    const dates = getHolidayDatesForYear(y);
    // even if no dates available, mark as populated to avoid repeated attempts
    if (!dates || dates.length === 0) {
      next.years[y] = { categories: next.categories, events: next.events || {}, holidaysPopulated: true };
      return false;
    }
    const catId = ensureHolidayCategory(next);
    next.events = next.events || {};
    let changed = false;
    dates.forEach((d) => {
      if (!next.events[d]) {
        next.events[d] = { catId, half: false };
        changed = true;
      }
    });
    // mirror into years map and mark populated
    next.years[y] = { categories: next.categories, events: next.events, holidaysPopulated: true };
    return changed;
  }

  // render calendar
  function onYearChange(y) {
    const next = JSON.parse(JSON.stringify(data));
    next.year = y;
    next.years = next.years || {};
    const yd = next.years[y] || defaultDataForYear(y);
    next.categories = yd.categories;
    next.events = yd.events || {};
    // populate holidays for the newly selected year (don't overwrite existing days)
    populateHolidaysForYear(next, y);
    updateUsed(next);
    save(next);
    setYearSelect(y);
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
        // day drag props
        onDayDropRemove={(date) => {
          const next = { ...data, events: { ...data.events } };
          delete next.events[date];
          updateUsed(next);
          save(next);
          // clear drag state
          dragDayRef.current = null;
          setDraggingDayDate(null);
        }}
        draggingDayDate={draggingDayDate}
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
        onDayDragStart={onDayDragStart}
        onDayDragEnd={onDayDragEnd}
        hoverDate={hoverDate}
        draggingCatColor={
          // prefer dragging category color; if we're moving a day, use its category color
          draggingCatId
            ? data.categories.find((c) => c.id === draggingCatId)?.color
            : draggingDayDate
            ? data.events[draggingDayDate]
              ? data.categories.find(
                  (c) => c.id === data.events[draggingDayDate].catId
                )?.color
              : null
            : null
        }
        draggingDayDate={draggingDayDate}
        draggingCatId={draggingCatId}
      />

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>Day options</DialogTitle>
        <DialogContent>
          {modalCtx &&
            (modalCtx.type === "multi" ? (
              <MultiDayModalContent
                ctx={modalCtx}
                data={data}
                onChange={(newCtx) => setModalCtx(newCtx)}
                onRemoveMulti={(dates) => {
                  const next = { ...data, events: { ...data.events } };
                  dates.forEach((d) => delete next.events[d]);
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

      {/* One-time welcome modal shown only when there's no saved state */}
      <Dialog open={showWelcome} onClose={() => setShowWelcome(false)}>
        <DialogTitle>Welcome to <strong>Time</strong>Off<strong>Tool</strong>!</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            This app is designed to help you plan PTO and holidays. Drag a category
            from the left panel onto calendar days to mark time off. Click a
            filled day to edit or remove it. Create and edit categories using
            the Categories editor.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Holidays are pre-populated, but can be changed. This app is a work in progress 😀
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowWelcome(false);
            }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
