import React, { useState, useRef, useEffect } from "react";
import { hexToRgba } from "../utils";

export default function Calendar({
  data,
  onDrop,
  openDayModal,
  onDayDragEnter,
  onDayDragLeave,
  hoverDate,
  draggingCatColor,
}) {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedSet, setSelectedSet] = useState(new Set());
  const selectModeRef = useRef(null); // {type:'create'|'extend', catId, direction:'left'|'right'}
  const startDateRef = useRef(null);

  useEffect(() => {
    const onUp = (ev) => {
      if (isSelecting) {
        // include the date under the cursor (so last day is included)
        const endSet = new Set(selectedSet);
        try {
          if (ev && typeof ev.clientX === "number") {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            let node = el;
            while (node && node !== document.body) {
              if (node.dataset && node.dataset.date) {
                endSet.add(node.dataset.date);
                break;
              }
              node = node.parentNode;
            }
          }
        } catch (e) {}

        // produce sorted array by time (use local-date construction to avoid timezone shifts)
        const arr = Array.from(endSet)
          .map((d) => ({ d, t: parseDate(d).getTime() }))
          .sort((a, b) => a.t - b.t)
          .map((x) => x.d);
        // filter out weekends (days 5 and 6 per request)
        if (arr.length > 0) {
          if (
            selectModeRef.current &&
            selectModeRef.current.type === "extend"
          ) {
            openDayModal({
              type: "multi",
              dates: arr,
              swapTo: selectModeRef.current.catId,
              half: false,
            });
          } else {
            openDayModal({ type: "multi", dates: arr });
          }
        }
      }
      setIsMouseDown(false);
      setIsSelecting(false);
      setSelectedSet(new Set());
      selectModeRef.current = null;
      startDateRef.current = null;
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [isSelecting, selectedSet, openDayModal]);

  function renderCalendar() {
    const year = data.year;
    const months = [];
    for (let m = 0; m < 12; m++) {
      const first = new Date(year, m, 1).getDay();
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < first; i++) cells.push({ empty: true });
      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(
          d
        ).padStart(2, "0")}`;
        const ev = data.events[date];
        cells.push({ date, day: d, ev });
      }
      months.push({
        m,
        name: new Date(year, m, 1).toLocaleString(undefined, { month: "long" }),
        cells,
      });
    }
    return months;
  }

  const months = renderCalendar();

  return (
    <div className="calendar">
      <div className="year-grid">
        {months.map((month) => (
          <div key={month.m} className="month">
            <h3 className="month-title">
              {month.name} {data.year}
            </h3>
            <div className="weekdays">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="days">
              {month.cells.map((cell, i) => {
                if (cell.empty) return <div key={i} className="day inactive" />;
                const ev = cell.ev;
                const date = cell.date;
                // if event exists, use its color; otherwise don't set background so weekend CSS can apply
                const bg =
                  ev && ev.catId
                    ? data.categories.find((c) => c.id === ev.catId)?.color ||
                      undefined
                    : undefined;
                const isHover = hoverDate === date && draggingCatColor;
                const dropFill = draggingCatColor
                  ? hexToRgba(draggingCatColor, 0.12)
                  : undefined;
                const dropOutline = draggingCatColor
                  ? hexToRgba(draggingCatColor, 0.5)
                  : undefined;
                const weekday = parseDate(date).getDay();
                // weekend = days 5 and 6 per request
                const isWeekend = weekday === 0 || weekday === 6;
                // check adjacent cells (left/right) to see if they're also filled or are weekend days,
                // so a time-off day visually connects to a neighbouring weekend and vice-versa
                const prevCell = month.cells[i - 1];
                const nextCell = month.cells[i + 1];
                const prevIsWeekend =
                  prevCell &&
                  !prevCell.empty &&
                  (parseDate(prevCell.date).getDay() === 0 ||
                    parseDate(prevCell.date).getDay() === 6);
                const nextIsWeekend =
                  nextCell &&
                  !nextCell.empty &&
                  (parseDate(nextCell.date).getDay() === 0 ||
                    parseDate(nextCell.date).getDay() === 6);
                const leftConnected =
                  prevCell && !prevCell.empty && (prevCell.ev || prevIsWeekend);
                const rightConnected =
                  nextCell && !nextCell.empty && (nextCell.ev || nextIsWeekend);
                const connClass =
                  leftConnected && rightConnected
                    ? " connected-both"
                    : leftConnected
                    ? " connected-left"
                    : rightConnected
                    ? " connected-right"
                    : "";
                const isSelected = selectedSet.has(date);
                const selectClass = isSelected ? " selected" : "";

                // mouse handlers for selection/extension
                const handleMouseDown = (e) => {
                  e.preventDefault();
                  setIsMouseDown(true);
                  if (ev && ev.catId) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const pct = x / rect.width;
                    if (pct > 0.7) {
                      selectModeRef.current = {
                        type: "extend",
                        catId: ev.catId,
                        direction: "right",
                      };
                    } else if (pct < 0.3) {
                      selectModeRef.current = {
                        type: "extend",
                        catId: ev.catId,
                        direction: "left",
                      };
                    } else {
                      selectModeRef.current = { type: "create" };
                    }
                  } else {
                    selectModeRef.current = { type: "create" };
                  }
                  startDateRef.current = date;
                  setIsSelecting(true);
                  setSelectedSet((prev) => new Set([date]));
                };

                const handleMouseEnter = () => {
                  if (!isMouseDown || !isSelecting) return;
                  const start = parseDate(startDateRef.current);
                  const end = parseDate(date);
                  const inc = start <= end ? 1 : -1;
                  const cur = new Date(start);
                  const newSet = new Set();
                  while (true) {
                    const dstr = `${cur.getFullYear()}-${String(
                      cur.getMonth() + 1
                    ).padStart(2, "0")}-${String(cur.getDate()).padStart(
                      2,
                      "0"
                    )}`;
                    newSet.add(dstr);
                    if (
                      cur.getFullYear() === end.getFullYear() &&
                      cur.getMonth() === end.getMonth() &&
                      cur.getDate() === end.getDate()
                    )
                      break;
                    cur.setDate(cur.getDate() + inc);
                  }
                  setSelectedSet(newSet);
                };
                return (
                  <div
                    key={date}
                    data-date={date}
                    className={
                      "day" +
                      (ev ? " filled" : "") +
                      connClass +
                      (isHover ? " drop-target" : "") +
                      (isWeekend ? " weekend" : "") +
                      selectClass
                    }
                    onMouseDown={handleMouseDown}
                    onMouseEnter={handleMouseEnter}
                    onDragOver={(e) => {
                      e.preventDefault();
                      onDayDragEnter && onDayDragEnter(date);
                    }}
                    onDrop={(e) => onDrop(date, e)}
                    onDragLeave={() => onDayDragLeave && onDayDragLeave(date)}
                    onClick={() => openDayModal(date)}
                    style={{
                      background: isHover ? dropFill : bg || undefined,
                      ["--drop-color"]: dropOutline,
                    }}
                  >
                    <div
                      className="date-num"
                      style={{
                        color: ev
                          ? (function () {
                              try {
                                const col =
                                  data.categories.find((c) => c.id === ev.catId)
                                    ?.color || "#000";
                                const c = col.replace("#", "");
                                const r = parseInt(c.substring(0, 2), 16);
                                const g = parseInt(c.substring(2, 4), 16);
                                const b = parseInt(c.substring(4, 6), 16);
                                const lum =
                                  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                                return lum > 0.55 ? "#042029" : "#ffffff";
                              } catch (e) {
                                return "#ffffff";
                              }
                            })()
                          : undefined,
                      }}
                    >
                      {cell.day}
                    </div>
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

export const parseDate = (dstr) => {
  if (!dstr) return null;
  const parts = dstr.split("-").map((x) => parseInt(x, 10));
  return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
};
