import React, { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { parseDate } from "./Calendar";

export default function MultiDayModalContent({
  ctx,
  data,
  onChange,
  onRemoveMulti,
}) {
  const dates = ctx.dates || [];
  const [swapTo, setSwapTo] = useState(ctx.swapTo || "");
  const [half, setHalf] = useState(!!ctx.half);

  useEffect(() => {
    onChange && onChange({ ...ctx, swapTo, half });
  }, [swapTo, half]);

  // count only weekdays
  const weekdayDates = dates.filter((d) => {
    const w = parseDate(d).getDay();
    return !(w === 0 || w === 6);
  });

  return (
    <div className="day-modal">
      <div className="modal-section">
        <div className="modal-header">
          <strong>
            Editing {weekdayDates.length} day
            {weekdayDates.length === 1 ? "" : "s"}
          </strong>
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
          Weekends covered during selection are shown but will not be included
          in the update.
        </div>
      </div>

      <div className="modal-section">
        <select
          value={swapTo}
          onChange={(e) => setSwapTo(e.target.value)}
          className="swap-select"
        >
          <option value="">-- Select category to apply --</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({(c.qty - c.used).toFixed(1)} left)
            </option>
          ))}
        </select>
      </div>

      <div className="seg-group">
        <button
          className={"seg-btn" + (!half ? " selected" : "")}
          onClick={() => setHalf(false)}
        >
          Full day
        </button>
        <button
          className={"seg-btn" + (half ? " selected" : "")}
          onClick={() => setHalf(true)}
        >
          Half day
        </button>
      </div>

      <div className="modal-section">
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            onRemoveMulti && onRemoveMulti(weekdayDates);
          }}
        >
          Remove selected days
        </Button>
      </div>
    </div>
  );
}
