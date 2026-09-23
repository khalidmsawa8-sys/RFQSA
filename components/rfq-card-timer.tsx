"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Clock, Hourglass, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

interface RfqCardTimerProps {
  createdAt: string;
  expiresAt?: string | null;
  status?: string;
  durationMinutes?: number;
  className?: string;
  compact?: boolean;
  onExpire?: () => void;
}

// Global in-memory cache for settings to avoid repeated API requests
let cachedDurationMinutes: number | null = null;
let lastFetchTime = 0;

export function RfqCardTimer({
  createdAt,
  expiresAt,
  status,
  durationMinutes: propDurationMinutes,
  className = "",
  compact = false,
  onExpire,
}: RfqCardTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [systemDuration, setSystemDuration] = useState<number>(propDurationMinutes || cachedDurationMinutes || 20);
  const [now, setNow] = useState<number>(() => Date.now());
  const [hasNotifiedExpire, setHasNotifiedExpire] = useState(false);

  // Sync settings duration if not passed as prop
  useEffect(() => {
    setMounted(true);

    if (propDurationMinutes) {
      setSystemDuration(propDurationMinutes);
      cachedDurationMinutes = propDurationMinutes;
      return;
    }

    const nowMs = Date.now();
    if (cachedDurationMinutes && nowMs - lastFetchTime < 60000) {
      setSystemDuration(cachedDurationMinutes);
      return;
    }

    fetch("/api/v1/admin/settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch settings: " + res.status);
        return res.json();
      })
      .then((data) => {
        if (data.success && data.settings?.rfq_visibility_duration_minutes) {
          const mins = Number(data.settings.rfq_visibility_duration_minutes);
          if (mins && !isNaN(mins)) {
            cachedDurationMinutes = mins;
            lastFetchTime = Date.now();
            setSystemDuration(mins);
          }
        }
      })
      .catch((e) => {
        console.warn("[RfqCardTimer] System duration fallback to 20m:", e?.message || e);
      });
  }, [propDurationMinutes]);

  // Compute exact target expiry timestamp
  const targetMs = useMemo(() => {
    const createdMs = new Date(createdAt || Date.now()).getTime() || Date.now();
    const durationMs = (systemDuration || 20) * 60 * 1000;
    const adminCalculatedExpiry = createdMs + durationMs;

    if (expiresAt) {
      const explicitExpiryMs = new Date(expiresAt).getTime();
      if (!isNaN(explicitExpiryMs)) {
        // If explicit expiry is farther than admin limit by more than 5 minutes (outdated legacy 48h), bound by adminCalculatedExpiry
        if (explicitExpiryMs - createdMs > durationMs + 5 * 60 * 1000) {
          return adminCalculatedExpiry;
        }
        return explicitExpiryMs;
      }
    }

    return adminCalculatedExpiry;
  }, [createdAt, expiresAt, systemDuration]);

  // Live 1-second interval ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const diffMs = targetMs - now;
  const isExpired = diffMs <= 0 || status === "cancelled" || status === "expired";

  // Trigger onExpire callback when transition happens
  useEffect(() => {
    if (isExpired && !hasNotifiedExpire && onExpire) {
      setHasNotifiedExpire(true);
      onExpire();
    }
  }, [isExpired, hasNotifiedExpire, onExpire]);

  // If order is completed or closed normally, do not display timer badge
  if (status === "completed" || status === "closed") {
    return null;
  }

  // Calculate breakdown
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  // SSR initial placeholder before hydration
  if (!mounted) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2.5 py-1 rounded-full shadow-2xs whitespace-nowrap shrink-0 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="whitespace-nowrap leading-none">جاري التحميل...</span>
      </span>
    );
  }

  // 1. EXPIRED STATE
  if (isExpired) {
    return (
      <span
        title={`انتهت المهلة المحددة من الإدارة (${systemDuration} دقيقة) وتم إيقاف استقبال عروض الأسعار`}
        className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50/90 hover:bg-amber-100/70 border border-amber-300/80 px-2.5 py-1 rounded-full shadow-2xs whitespace-nowrap shrink-0 transition-colors ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="whitespace-nowrap leading-none">انتهت الصلاحية</span>
      </span>
    );
  }

  // 2. CRITICAL URGENT STATE (<= 3 minutes)
  if (diffMs <= 3 * 60 * 1000) {
    return (
      <span
        title={`المهلة تنتهي قريباً جداً! تم تحديد مدة الطلب بـ ${systemDuration} دقيقة من لوحة التحكم`}
        className={`inline-flex items-center gap-1.5 text-[11px] font-black text-rose-900 bg-rose-50 hover:bg-rose-100/70 border border-rose-300/80 px-2.5 py-1 rounded-full shadow-2xs whitespace-nowrap shrink-0 animate-pulse transition-colors ${className}`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
        </span>
        <Hourglass className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span className="text-[11px] font-bold text-rose-800 whitespace-nowrap leading-none">ينتهي خلال:</span>
        <span dir="ltr" className="font-mono font-black text-xs text-rose-950 whitespace-nowrap leading-none">
          {pad(minutes)}:{pad(seconds)}
        </span>
      </span>
    );
  }

  // 3. WARNING URGENT STATE (<= 10 minutes)
  if (diffMs <= 10 * 60 * 1000) {
    return (
      <span
        title={`الوقت المتبقي حسب إعدادات المشرف (${systemDuration} دقيقة)`}
        className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100/70 border border-amber-300/80 px-2.5 py-1 rounded-full shadow-2xs whitespace-nowrap shrink-0 transition-colors ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="text-[11px] font-bold text-amber-800 whitespace-nowrap leading-none">متبقي:</span>
        <span dir="ltr" className="font-mono font-black text-xs text-amber-950 whitespace-nowrap leading-none">
          {pad(minutes)}:{pad(seconds)}
        </span>
      </span>
    );
  }

  // 4. NORMAL ACTIVE COUNTDOWN (> 10 minutes)
  let formattedTime = "";
  if (days > 0) {
    formattedTime = `${days} يوم و ${hours} س`;
  } else if (hours > 0) {
    formattedTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    formattedTime = `${pad(minutes)}:${pad(seconds)}`;
  }

  return (
    <span
      title={`الوقت المتبقي للطلب نشطاً: ${systemDuration} دقيقة مخصصة من لوحة التحكم`}
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-900 bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200/90 px-2.5 py-1 rounded-full shadow-2xs whitespace-nowrap shrink-0 transition-colors ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      <span className="text-[11px] font-bold text-blue-800 whitespace-nowrap leading-none">متبقي:</span>
      <span dir="ltr" className="font-mono font-black text-xs text-blue-950 tracking-wider whitespace-nowrap leading-none">
        {formattedTime}
      </span>
    </span>
  );
}
