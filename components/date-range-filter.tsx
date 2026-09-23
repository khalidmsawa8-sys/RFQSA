"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Check,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface DateRangeValue {
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null;   // "YYYY-MM-DD"
  label?: string;
  mode?: "range" | "monthly" | "preset" | "all";
  preset?: string;
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const WEEKDAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"]; // Sat -> Fri RTL

interface DateRangeFilterProps {
  value: DateRangeValue | null;
  onChange: (val: DateRangeValue | null) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className = "" }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"range" | "monthly" | "preset">("range");

  // Temporary selection inside the modal
  const [tempStart, setTempStart] = useState<string | null>(value?.startDate || null);
  const [tempEnd, setTempEnd] = useState<string | null>(value?.endDate || null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Calendar Base Month (defaults to current or August 2026)
  const [baseYear, setBaseYear] = useState<number>(() => {
    if (value?.startDate) return new Date(value.startDate).getFullYear();
    return 2026;
  });
  const [baseMonth, setBaseMonth] = useState<number>(() => {
    if (value?.startDate) return new Date(value.startDate).getMonth();
    return 7; // August (0-indexed)
  });

  // Monthly Mode Selected Year & Month
  const [monthlyYear, setMonthlyYear] = useState<number>(2026);
  const [monthlyMonth, setMonthlyMonth] = useState<number | null>(7);

  // Sync state when popup opens
  useEffect(() => {
    if (isOpen) {
      setTempStart(value?.startDate || null);
      setTempEnd(value?.endDate || null);
      if (value?.startDate) {
        const d = new Date(value.startDate);
        setBaseYear(d.getFullYear());
        setBaseMonth(d.getMonth());
        setMonthlyYear(d.getFullYear());
        setMonthlyMonth(d.getMonth());
      }
    }
  }, [isOpen, value]);

  // Format Display Label for the Trigger Button
  const triggerLabel = useMemo(() => {
    if (!value || (!value.startDate && !value.endDate)) {
      return { primary: "الإطار الزمني", secondary: null };
    }

    if (value.mode === "monthly" && value.startDate) {
      const d = new Date(value.startDate);
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      return {
        primary: `${d.getFullYear()}-${mStr}`,
        secondary: "شهري",
      };
    }

    if (value.startDate && value.endDate) {
      const s = value.startDate.replace(/-/g, "/");
      const e = value.endDate.replace(/-/g, "/");
      if (s === e) {
        return { primary: s, secondary: "الإطار الزمني" };
      }
      return { primary: `${s} - ${e}`, secondary: "الإطار الزمني" };
    }

    if (value.startDate) {
      return { primary: value.startDate.replace(/-/g, "/"), secondary: "من تاريخ" };
    }

    return { primary: "الإطار الزمني", secondary: null };
  }, [value]);

  // Helper to format Arabic Date Range String
  const formatArabicRangeText = (start: string | null, end: string | null) => {
    if (!start && !end) return "حدد نطاق التاريخ من التقويم";
    if (start && !end) {
      const d = new Date(start);
      return `من ${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (start && end) {
      const ds = new Date(start);
      const de = new Date(end);
      if (start === end) {
        return `${ds.getDate()} ${ARABIC_MONTHS[ds.getMonth()]} ${ds.getFullYear()}`;
      }
      return `${ds.getDate()} ${ARABIC_MONTHS[ds.getMonth()]} ${ds.getFullYear()} - ${de.getDate()} ${ARABIC_MONTHS[de.getMonth()]} ${de.getFullYear()}`;
    }
    return "";
  };

  // Calendar Day Click Handler
  const handleDayClick = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  // Quick Presets
  const applyPreset = (presetKey: string) => {
    const today = new Date(2026, 7, 26); // Default baseline Aug 26, 2026
    let start = new Date(today);
    let end = new Date(today);

    switch (presetKey) {
      case "today":
        break;
      case "last7":
        start.setDate(today.getDate() - 6);
        break;
      case "last30":
        start.setDate(today.getDate() - 29);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "thisYear":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        break;
    }

    const sStr = start.toISOString().split("T")[0];
    const eStr = end.toISOString().split("T")[0];

    onChange({
      startDate: sStr,
      endDate: eStr,
      mode: "preset",
      label: formatArabicRangeText(sStr, eStr),
    });
    setIsOpen(false);
  };

  // Apply Action
  const handleApply = () => {
    if (activeTab === "monthly" && monthlyMonth !== null) {
      const start = new Date(monthlyYear, monthlyMonth, 1).toISOString().split("T")[0];
      const end = new Date(monthlyYear, monthlyMonth + 1, 0).toISOString().split("T")[0];
      onChange({
        startDate: start,
        endDate: end,
        mode: "monthly",
        label: `${ARABIC_MONTHS[monthlyMonth]} ${monthlyYear}`,
      });
    } else {
      onChange({
        startDate: tempStart,
        endDate: tempEnd || tempStart,
        mode: "range",
        label: formatArabicRangeText(tempStart, tempEnd || tempStart),
      });
    }
    setIsOpen(false);
  };

  // Reset Action
  const handleReset = () => {
    setTempStart(null);
    setTempEnd(null);
    setMonthlyMonth(null);
    onChange(null);
    setIsOpen(false);
  };

  // Generate Month Days Matrix
  const getMonthMatrix = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // In Arabic calendar starting Saturday (0 = Sun, 6 = Sat)
    // Map JS Sunday (0) to index 1, Saturday (6) to index 0
    let startDayIdx = (firstDay.getDay() + 1) % 7;

    const days: Array<{ day: number | null; dateStr: string }> = [];

    // Previous month filler
    for (let i = 0; i < startDayIdx; i++) {
      days.push({ day: null, dateStr: "" });
    }

    // Month days
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      days.push({ day: d, dateStr: `${year}-${mStr}-${dStr}` });
    }

    return days;
  };

  // Dual Month Setup (Left = baseMonth - 1 or baseMonth, Right = baseMonth + 1)
  const monthA = { year: baseYear, month: (baseMonth - 1 + 12) % 12 };
  const monthB = { year: baseYear, month: baseMonth };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {/* ── Trigger Button (Pill Design Matching Screenshots) ── */}
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer select-none ${
            value?.startDate ? "border-blue-400 bg-blue-50/40 text-blue-900 ring-1 ring-blue-400/30" : "text-slate-700"
          } ${className}`}
          title="تصفية حسب الإطار الزمني"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          {triggerLabel.secondary ? (
            <div className="flex items-center gap-1 text-[11px] font-mono" dir="ltr">
              <ChevronDown className="w-3 h-3 text-slate-400" />
              <span className="font-bold text-blue-900">{triggerLabel.primary}</span>
              <span className="text-slate-300 font-normal">|</span>
              <span className="font-sans font-bold text-slate-600">{triggerLabel.secondary}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span>الإطار الزمني</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          )}
        </button>
      </PopoverTrigger>

      {/* ── Popover Dropdown Window (Matching Screenshot 2 & 3) ── */}
      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={20}
        className="w-[320px] sm:w-[500px] max-w-[calc(100vw-32px)] p-0 rounded-2xl shadow-2xl border border-slate-200 bg-white z-50 text-right dir-rtl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900">الإطار الزمني</span>
            {/* Mode Switcher Pills */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("range")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  activeTab === "range" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                نطاق تاريخ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("monthly")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  activeTab === "monthly" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                شهري
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preset")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  activeTab === "preset" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                فترات سريعة
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-bold text-slate-400 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة تعيين</span>
          </button>
        </div>

        {/* Selected Date Range Display Box */}
        <div className="p-3 bg-white border-b border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {activeTab === "monthly" && monthlyMonth !== null
                  ? `${ARABIC_MONTHS[monthlyMonth]} ${monthlyYear}`
                  : formatArabicRangeText(tempStart, tempEnd)}
              </span>
            </div>
            {(tempStart || (activeTab === "monthly" && monthlyMonth !== null)) && (
              <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold">
                محدد ✅
              </span>
            )}
          </div>
        </div>

        {/* ── Mode 1: Dual Month Calendar Range Picker ── */}
        {activeTab === "range" && (
          <div className="p-4 space-y-3">
            {/* Dual Calendars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Calendar Month 1 (e.g. July) */}
              <div className="space-y-2 border-l-0 sm:border-l sm:border-slate-100 sm:pl-3">
                <div className="flex items-center justify-between mb-1 px-1">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={monthA.month}
                      onChange={(e) => setBaseMonth(Number(e.target.value) + 1)}
                      className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      {ARABIC_MONTHS.map((m, idx) => (
                        <option key={idx} value={idx}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={monthA.year}
                      onChange={(e) => setBaseYear(Number(e.target.value))}
                      className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 py-1">
                  {WEEKDAYS.map((w, idx) => (
                    <span key={idx}>{w}</span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                  {getMonthMatrix(monthA.year, monthA.month).map((dObj, idx) => {
                    if (!dObj.day) {
                      return <span key={idx} className="h-7 w-7" />;
                    }

                    const isStart = tempStart === dObj.dateStr;
                    const isEnd = tempEnd === dObj.dateStr;
                    const inRange =
                      tempStart &&
                      tempEnd &&
                      dObj.dateStr > tempStart &&
                      dObj.dateStr < tempEnd;
                    const inHover =
                      tempStart &&
                      !tempEnd &&
                      hoverDate &&
                      dObj.dateStr > tempStart &&
                      dObj.dateStr <= hoverDate;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDayClick(dObj.dateStr)}
                        onMouseEnter={() => !tempEnd && setHoverDate(dObj.dateStr)}
                        className={`h-7 w-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                          isStart || isEnd
                            ? "bg-[#1a2b4a] text-white rounded-lg shadow-xs font-black z-10"
                            : inRange || inHover
                            ? "bg-blue-100/70 text-blue-950 font-bold rounded-none"
                            : "text-slate-700 hover:bg-slate-100 rounded-lg"
                        }`}
                      >
                        {dObj.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calendar Month 2 (e.g. August) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1 px-1">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={monthB.month}
                      onChange={(e) => setBaseMonth(Number(e.target.value))}
                      className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      {ARABIC_MONTHS.map((m, idx) => (
                        <option key={idx} value={idx}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={monthB.year}
                      onChange={(e) => setBaseYear(Number(e.target.value))}
                      className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (baseMonth === 0) {
                          setBaseMonth(11);
                          setBaseYear(baseYear - 1);
                        } else {
                          setBaseMonth(baseMonth - 1);
                        }
                      }}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (baseMonth === 11) {
                          setBaseMonth(0);
                          setBaseYear(baseYear + 1);
                        } else {
                          setBaseMonth(baseMonth + 1);
                        }
                      }}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 py-1">
                  {WEEKDAYS.map((w, idx) => (
                    <span key={idx}>{w}</span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                  {getMonthMatrix(monthB.year, monthB.month).map((dObj, idx) => {
                    if (!dObj.day) {
                      return <span key={idx} className="h-7 w-7" />;
                    }

                    const isStart = tempStart === dObj.dateStr;
                    const isEnd = tempEnd === dObj.dateStr;
                    const inRange =
                      tempStart &&
                      tempEnd &&
                      dObj.dateStr > tempStart &&
                      dObj.dateStr < tempEnd;
                    const inHover =
                      tempStart &&
                      !tempEnd &&
                      hoverDate &&
                      dObj.dateStr > tempStart &&
                      dObj.dateStr <= hoverDate;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDayClick(dObj.dateStr)}
                        onMouseEnter={() => !tempEnd && setHoverDate(dObj.dateStr)}
                        className={`h-7 w-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                          isStart || isEnd
                            ? "bg-[#1a2b4a] text-white rounded-lg shadow-xs font-black z-10"
                            : inRange || inHover
                            ? "bg-blue-100/70 text-blue-950 font-bold rounded-none"
                            : "text-slate-700 hover:bg-slate-100 rounded-lg"
                        }`}
                      >
                        {dObj.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Mode 2: Monthly Grid Picker (Screenshot 3) ── */}
        {activeTab === "monthly" && (
          <div className="p-4 space-y-4 max-w-sm mx-auto">
            {/* Year Selector */}
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMonthlyYear(monthlyYear + 1)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="font-mono font-black text-sm text-slate-900">{monthlyYear}</span>
              <button
                type="button"
                onClick={() => setMonthlyYear(monthlyYear - 1)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* 3x4 Months Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {ARABIC_MONTHS.map((monthName, idx) => {
                const isSelected = monthlyMonth === idx;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMonthlyMonth(idx)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md font-black ring-2 ring-blue-400/40"
                        : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                    }`}
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Mode 3: Quick Presets List ── */}
        {activeTab === "preset" && (
          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              { id: "today", label: "اليوم" },
              { id: "last7", label: "آخر 7 أيام" },
              { id: "thisMonth", label: "هذا الشهر" },
              { id: "lastMonth", label: "الشهر السابق" },
              { id: "last30", label: "آخر 30 يوم" },
              { id: "thisYear", label: "السنة الحالية" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="py-2.5 px-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-900 text-right transition-all flex items-center justify-between"
              >
                <span>{p.label}</span>
                <ChevronLeft className="w-3.5 h-3.5 opacity-50" />
              </button>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            إلغاء
          </Button>

          <Button
            size="sm"
            onClick={handleApply}
            className="bg-[#1a2b4a] hover:bg-slate-900 text-white rounded-xl text-xs font-bold px-5 shadow-xs"
          >
            تطبيق الفلتر
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
