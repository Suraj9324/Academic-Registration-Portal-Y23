import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dateFromValue(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function valueFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatDate(value) {
  const date = dateFromValue(value);
  if (!date) return "DD Month name YYYY";
  return `${String(date.getDate()).padStart(2, "0")} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export default function DatePicker({ value, onChange, label = "Date of birth" }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initial = dateFromValue(value) || new Date(2005, 5, 18);
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value || "");
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const root = useRef(null);
  const trigger = useRef(null);
  const dialog = useRef(null);
  const years = Array.from({ length: 101 }, (_, index) => today.getFullYear() - index);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const days = new Date(viewYear, viewMonth + 1, 0).getDate();
  const viewingCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  useEffect(() => {
    const close = (event) => {
      if (!root.current?.contains(event.target) && !dialog.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      dialog.current
        ?.querySelector(".calendar-days button.selected, .calendar-days button:not(:disabled)")
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [draftValue, open]);

  const openCalendar = () => {
    const selected = dateFromValue(value) || new Date(2005, 5, 18);
    setDraftValue(value || "");
    setViewMonth(selected.getMonth());
    setViewYear(selected.getFullYear());
    setOpen((current) => !current);
  };

  const moveMonth = (amount) => {
    const next = new Date(viewYear, viewMonth + amount, 1);
    if (next > new Date(today.getFullYear(), today.getMonth(), 1)) return;
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
  };

  const moveDraftDate = (amount) => {
    const current = dateFromValue(draftValue) || new Date(viewYear, viewMonth, 1);
    const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount);
    if (next > today) return;
    setDraftValue(valueFromDate(next));
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
  };

  const handleCalendarKeys = (event) => {
    const movements = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key in movements) {
      event.preventDefault();
      moveDraftDate(movements[event.key]);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => trigger.current?.focus());
    }
  };

  return (
    <div className="custom-date-picker" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`date-trigger ${value ? "has-value" : ""}`}
        onClick={openCalendar}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="calendar-mark" aria-hidden="true">
          <i />
        </span>
        <span>
          <small>{label}</small>
          <strong>{formatDate(value)}</strong>
        </span>
        <b aria-hidden="true">{open ? "−" : "+"}</b>
      </button>
      {open &&
        createPortal(
          <div
            className="calendar-layer"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
                window.requestAnimationFrame(() => trigger.current?.focus());
              }
            }}
          >
            <div
              className="calendar-popover"
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-label={`${label} calendar`}
              onKeyDown={handleCalendarKeys}
            >
              <div className="calendar-header">
                <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
                  ←
                </button>
                <div>
                  <select
                    aria-label="Month"
                    value={viewMonth}
                    onChange={(event) => setViewMonth(Number(event.target.value))}
                  >
                    {monthNames.map((month, index) => (
                      <option
                        value={index}
                        key={month}
                        disabled={viewYear === today.getFullYear() && index > today.getMonth()}
                      >
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Year"
                    value={viewYear}
                    onChange={(event) => {
                      const year = Number(event.target.value);
                      setViewYear(year);
                      if (year === today.getFullYear() && viewMonth > today.getMonth()) {
                        setViewMonth(today.getMonth());
                      }
                    }}
                  >
                    {years.map((year) => (
                      <option key={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  aria-label="Next month"
                  disabled={viewingCurrentMonth}
                >
                  →
                </button>
              </div>
              <div className="calendar-weekdays" aria-hidden="true">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="calendar-days">
                {Array.from({ length: firstDay }).map((_, index) => (
                  <span key={`blank-${index}`} />
                ))}
                {Array.from({ length: days }, (_, index) => index + 1).map((day) => {
                  const dateObject = new Date(viewYear, viewMonth, day);
                  const date = valueFromDate(dateObject);
                  const future = dateObject > today;
                  return (
                    <button
                      type="button"
                      key={day}
                      className={draftValue === date ? "selected" : ""}
                      onClick={() => {
                        setDraftValue(date);
                        onChange(date);
                        setOpen(false);
                        window.requestAnimationFrame(() => trigger.current?.focus());
                      }}
                      disabled={future}
                      aria-selected={draftValue === date}
                      aria-label={`${day} ${monthNames[viewMonth]} ${viewYear}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p>Use the arrow keys to move between dates. Future dates are unavailable.</p>
              <div className="calendar-actions">
                <button
                  type="button"
                  className="calendar-clear"
                  onClick={() => {
                    setDraftValue("");
                    onChange("");
                    setOpen(false);
                    window.requestAnimationFrame(() => trigger.current?.focus());
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="calendar-confirm"
                  disabled={!draftValue}
                  onClick={() => {
                    onChange(draftValue);
                    setOpen(false);
                    window.requestAnimationFrame(() => trigger.current?.focus());
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
