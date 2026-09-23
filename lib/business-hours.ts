/**
 * Structured Business Hours & Operational Status Engine (Enterprise v4)
 * Supports Saudi Arabia (Asia/Riyadh) timezone, weekly schedules, and dynamic status computation:
 * - Open Now (مفتوح الآن)
 * - Closed (مغلق حالياً)
 * - Opening Soon (يفتح قريباً)
 * - Closing Soon (يغلق قريباً)
 */

export type DayOfWeekKey =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export interface DaySchedule {
  isOpen: boolean;
  openTime: string; // "08:00"
  closeTime: string; // "22:00"
  breakStart?: string; // e.g. "12:00" (optional)
  breakEnd?: string; // e.g. "13:00" (optional)
}

export interface StructuredBusinessHours {
  timezone: string; // "Asia/Riyadh"
  schedule?: Record<DayOfWeekKey, DaySchedule>;
  weekly_schedule?: Record<string, any>;
  holidayNotes?: string;
}

export interface OperationalStatusResult {
  status: "open" | "closed" | "opening_soon" | "closing_soon";
  labelAr: string;
  badgeClass: string;
  nextChangeAr: string;
  currentDayAr: string;
  todayHoursAr: string;
}

export const ARABIC_DAYS_MAP: Record<DayOfWeekKey, { nameAr: string; shortAr: string }> = {
  saturday: { nameAr: "السبت", shortAr: "سبت" },
  sunday: { nameAr: "الأحد", shortAr: "أحد" },
  monday: { nameAr: "الإثنين", shortAr: "إثنين" },
  tuesday: { nameAr: "الثلاثاء", shortAr: "ثلاثاء" },
  wednesday: { nameAr: "الأربعاء", shortAr: "أربعاء" },
  thursday: { nameAr: "الخميس", shortAr: "خميس" },
  friday: { nameAr: "الجمعة", shortAr: "جمعة" },
};

const JS_DAY_TO_KEY: DayOfWeekKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getDefaultBusinessHours(): NormalizedBusinessHours {
  return {
    timezone: "Asia/Riyadh",
    schedule: {
      saturday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      sunday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      monday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      tuesday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      wednesday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      thursday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
      friday: { isOpen: true, openTime: "16:00", closeTime: "22:00" },
    },
  };
}

export const DEFAULT_SAUDI_BUSINESS_HOURS = getDefaultBusinessHours();

export interface NormalizedBusinessHours {
  timezone: string;
  schedule: Record<DayOfWeekKey, DaySchedule>;
  holidayNotes?: string;
}

/**
 * Normalizes input hours supporting multiple JSON representations:
 * - schedule vs weekly_schedule
 * - openTime/closeTime vs open/close
 */
export function normalizeBusinessHours(rawHours?: any | null): NormalizedBusinessHours {
  if (!rawHours || typeof rawHours !== "object") {
    return getDefaultBusinessHours();
  }

  const rawSched = rawHours.schedule || rawHours.weekly_schedule || {};
  const tz = rawHours.timezone || "Asia/Riyadh";

  const schedule: Record<DayOfWeekKey, DaySchedule> = {} as any;
  const days: DayOfWeekKey[] = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];

  for (const day of days) {
    const rawDay = rawSched[day];
    if (!rawDay) {
      schedule[day] = { isOpen: false, openTime: "08:00", closeTime: "22:00" };
    } else {
      schedule[day] = {
        isOpen: rawDay.isOpen !== false && rawDay.is_open !== false,
        openTime: rawDay.openTime || rawDay.open || "08:00",
        closeTime: rawDay.closeTime || rawDay.close || "22:00",
        breakStart: rawDay.breakStart || rawDay.break_start,
        breakEnd: rawDay.breakEnd || rawDay.break_end,
      };
    }
  }

  return {
    timezone: tz,
    schedule,
    holidayNotes: rawHours.holidayNotes || rawHours.holiday_notes,
  };
}

/**
 * Convert 24-hour "HH:mm" time string into formatted 12-hour Arabic representation.
 */
export function formatTimeAr(timeStr?: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (isNaN(h)) return timeStr;

  const period = h >= 12 ? "م" : "ص";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const minFormatted = m === 0 ? "" : `:${m < 10 ? "0" + m : m}`;
  return `${h12}${minFormatted} ${period}`;
}

/**
 * Calculates real-time operational status (Open, Closed, Opening Soon, Closing Soon)
 * taking into account timezone and day schedule.
 */
export function calculateVendorOpenStatus(
  rawHours?: any | null,
  referenceDate = new Date()
): OperationalStatusResult {
  const hours = normalizeBusinessHours(rawHours);

  // Compute local date/time in the target timezone (defaults to Asia/Riyadh UTC+3)
  const tz = hours.timezone || "Asia/Riyadh";
  let now: Date;
  try {
    const tzString = referenceDate.toLocaleString("en-US", { timeZone: tz });
    now = new Date(tzString);
  } catch {
    now = referenceDate;
  }

  const jsDay = now.getDay();
  const dayKey = JS_DAY_TO_KEY[jsDay];
  const dayInfo = ARABIC_DAYS_MAP[dayKey];
  const todaySchedule = hours.schedule[dayKey] || {
    isOpen: false,
    openTime: "08:00",
    closeTime: "22:00",
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!todaySchedule.isOpen) {
    return {
      status: "closed",
      labelAr: "مغلق اليوم (عطلة)",
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      nextChangeAr: "يفتح يوم العمل التالي",
      currentDayAr: dayInfo.nameAr,
      todayHoursAr: "مغلق طوال اليوم",
    };
  }

  const [openH, openM] = todaySchedule.openTime.split(":").map((n) => parseInt(n, 10));
  const [closeH, closeM] = todaySchedule.closeTime.split(":").map((n) => parseInt(n, 10));
  const openMinutes = openH * 60 + (openM || 0);
  const closeMinutes = closeH * 60 + (closeM || 0);

  const todayHoursFormatted = `${formatTimeAr(todaySchedule.openTime)} – ${formatTimeAr(
    todaySchedule.closeTime
  )}`;

  // 1. Before Open Time
  if (currentMinutes < openMinutes) {
    const diff = openMinutes - currentMinutes;
    if (diff <= 60) {
      return {
        status: "opening_soon",
        labelAr: `يفتح قريباً (خلال ${diff} دقيقة)`,
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        nextChangeAr: `يفتح عند ${formatTimeAr(todaySchedule.openTime)}`,
        currentDayAr: dayInfo.nameAr,
        todayHoursAr: todayHoursFormatted,
      };
    }
    return {
      status: "closed",
      labelAr: `مغلق (يفتح ${formatTimeAr(todaySchedule.openTime)})`,
      badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      nextChangeAr: `يفتح عند ${formatTimeAr(todaySchedule.openTime)}`,
      currentDayAr: dayInfo.nameAr,
      todayHoursAr: todayHoursFormatted,
    };
  }

  // 2. Open Now
  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    const diffClose = closeMinutes - currentMinutes;
    if (diffClose <= 60) {
      return {
        status: "closing_soon",
        labelAr: `يغلق قريباً (خلال ${diffClose} دقيقة)`,
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        nextChangeAr: `يغلق عند ${formatTimeAr(todaySchedule.closeTime)}`,
        currentDayAr: dayInfo.nameAr,
        todayHoursAr: todayHoursFormatted,
      };
    }
    return {
      status: "open",
      labelAr: "مفتوح الآن",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      nextChangeAr: `حتى ${formatTimeAr(todaySchedule.closeTime)}`,
      currentDayAr: dayInfo.nameAr,
      todayHoursAr: todayHoursFormatted,
    };
  }

  // 3. After Close Time
  return {
    status: "closed",
    labelAr: "مغلق حالياً",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    nextChangeAr: "انتهت ساعات العمل اليومية",
    currentDayAr: dayInfo.nameAr,
    todayHoursAr: todayHoursFormatted,
  };
}

/**
 * Returns formatted weekly schedule list for rendering in details modal.
 */
export function getFormattedWeeklySchedule(
  rawHours?: any | null,
  referenceDate = new Date()
): Array<{
  dayKey: DayOfWeekKey;
  dayNameAr: string;
  hoursAr: string;
  isOpen: boolean;
  isToday: boolean;
}> {
  const hours = normalizeBusinessHours(rawHours);

  const tz = hours.timezone || "Asia/Riyadh";
  let now: Date;
  try {
    const tzString = referenceDate.toLocaleString("en-US", { timeZone: tz });
    now = new Date(tzString);
  } catch {
    now = referenceDate;
  }
  const todayKey = JS_DAY_TO_KEY[now.getDay()];

  const orderedDays: DayOfWeekKey[] = [
    "saturday",
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ];

  return orderedDays.map((dayKey) => {
    const daySchedule = hours.schedule[dayKey] || {
      isOpen: false,
      openTime: "08:00",
      closeTime: "22:00",
    };
    const dayMeta = ARABIC_DAYS_MAP[dayKey];
    const isToday = dayKey === todayKey;

    const hoursAr = daySchedule.isOpen
      ? `${formatTimeAr(daySchedule.openTime)} إلى ${formatTimeAr(daySchedule.closeTime)}`
      : "عطلة مغلق";

    return {
      dayKey,
      dayNameAr: dayMeta.nameAr,
      hoursAr,
      isOpen: daySchedule.isOpen,
      isToday,
    };
  });
}
