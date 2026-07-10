import { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Helper to format date with ordinal suffixes (e.g., "10th July 2026")
export const formatOrdinalDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const monthName = months[m - 1];
  
  // Ordinal suffix (e.g., 1st, 2nd, 3rd, 4th)
  let suffix = "th";
  if (d % 10 === 1 && d !== 11) suffix = "st";
  else if (d % 10 === 2 && d !== 12) suffix = "nd";
  else if (d % 10 === 3 && d !== 13) suffix = "rd";
  
  return `${d}${suffix} ${monthName} ${y}`;
};

export default function CustomDatePicker({ value, onChange, placeholder = "Select date" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  // Local state for month browsing (initialized to selected value or today)
  const today = new Date();
  const [browseMonth, setBrowseMonth] = useState(today.getMonth());
  const [browseYear, setBrowseYear] = useState(today.getFullYear());

  // Update browse view when a value is loaded
  useEffect(() => {
    if (value) {
      const parts = value.split("-").map(Number);
      if (parts.length === 3) {
        setBrowseYear(parts[0]);
        setBrowseMonth(parts[1] - 1);
      }
    }
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (browseMonth === 0) {
      setBrowseMonth(11);
      setBrowseYear((y) => y - 1);
    } else {
      setBrowseMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (browseMonth === 11) {
      setBrowseMonth(0);
      setBrowseYear((y) => y + 1);
    } else {
      setBrowseMonth((m) => m + 1);
    }
  };

  // Get days in the current browsing month
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  // Get start day of the month (0 = Sun, 1 = Mon, etc.)
  const getStartDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(browseYear, browseMonth);
  const startDay = getStartDayOfMonth(browseYear, browseMonth);

  // Generate date grid cells
  const dateCells = [];
  
  // Padding cells for previous month days
  for (let i = 0; i < startDay; i++) {
    dateCells.push({ day: null, key: `empty-${i}` });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const paddedM = String(browseMonth + 1).padStart(2, "0");
    const paddedD = String(d).padStart(2, "0");
    const dateKey = `${browseYear}-${paddedM}-${paddedD}`;
    dateCells.push({ day: d, dateStr: dateKey, key: dateKey });
  }

  const handleSelectDate = (dateStr) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const handleToday = () => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  // Check if a date cell is today
  const isTodayDate = (dateStr) => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return dateStr === `${y}-${m}-${d}`;
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-850 rounded-xl text-xs font-semibold text-slate-200 transition duration-300 shadow-md select-none min-w-[170px] justify-between cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="truncate">
            {value ? formatOrdinalDate(value) : placeholder}
          </span>
        </span>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-0.5 rounded-full hover:bg-slate-700/60 text-slate-500 hover:text-slate-300 transition duration-200"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Calendar Panel Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2.5 w-64 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-2xl z-40 backdrop-blur-xl flex flex-col space-y-3"
          >
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                {months[browseMonth]} {browseYear}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekdays Label Header */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {dateCells.map((cell) => {
                if (!cell.day) {
                  return <div key={cell.key} className="w-7 h-7" />;
                }

                const isSelected = value === cell.dateStr;
                const isToday = isTodayDate(cell.dateStr);

                return (
                  <button
                    type="button"
                    key={cell.key}
                    onClick={() => handleSelectDate(cell.dateStr)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-semibold flex items-center justify-center transition duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : isToday
                        ? "border border-indigo-500 text-indigo-400 bg-indigo-500/5 hover:bg-slate-800"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-900">
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/5 px-2.5 py-1 rounded-lg border border-rose-500/10 hover:bg-rose-500/10 transition cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/10 hover:bg-indigo-500/10 transition cursor-pointer"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
