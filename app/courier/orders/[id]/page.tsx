"use client";

import React, { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Sparkles,
  ShieldCheck,
  Camera,
  KeyRound,
  Check,
  X,
  Loader2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { DeliveryRecord } from "@/lib/courier-service";
import {
  CourierDeliveryStatus,
  DELIVERY_STATUS_META,
  ALLOWED_TRANSITIONS,
} from "@/lib/delivery-state-machine";
import {
  generateIdempotencyKey,
  enqueueDeliveryCommand,
  flushCourierOfflineQueue,
} from "@/lib/courier-offline-queue";

export default function CourierTripExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: deliveryId } = use(params);

  const [delivery, setDelivery] = useState<DeliveryRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Checklist for picked items
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  // POD Photo Modal State
  const [showPodModal, setShowPodModal] = useState(false);
  const [podFile, setPodFile] = useState<File | null>(null);
  const [podPreview, setPodPreview] = useState<string | null>(null);
  const [isUploadingPod, setIsUploadingPod] = useState(false);

  // Fetch Delivery Details from Server
  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/v1/courier/deliveries/${deliveryId}`, {
        headers: {
          "x-courier-id": "courier-demo-id",
          "x-user-role": "courier",
        },
      });
      const data = await res.json();
      if (data.success && data.delivery) {
        setDelivery(data.delivery);
      } else {
        setErrorMessage(data.error || "تعذر جلب تفاصيل الشحنة.");
      }
    } catch (err: any) {
      setErrorMessage("فشل الاتصال بالخادم لجلب تفاصيل الرحلة.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [deliveryId]);

  // Capture event-driven GPS coordinates safely
  const captureGpsTelemetry = (): Promise<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    timestamp: string;
  }> => {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({ latitude: null, longitude: null, accuracy: null, timestamp: new Date().toISOString() });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date(pos.timestamp).toISOString(),
          });
        },
        (err) => {
          console.warn("GPS capture warning (non-fatal):", err.message);
          resolve({ latitude: null, longitude: null, accuracy: null, timestamp: new Date().toISOString() });
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  };

  // Execute Transition with Server-Side Idempotency and Offline Queue Fallback
  const handleTransition = async (
    targetStatus: CourierDeliveryStatus,
    extraParams: { otp?: string; podUrl?: string; podMeta?: any } = {}
  ) => {
    if (!delivery) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setOtpError(null);

    const idempotencyKey = generateIdempotencyKey();
    const telemetry = await captureGpsTelemetry();

    // Check online status
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!isOnline) {
      // Enqueue command locally in IndexedDB
      await enqueueDeliveryCommand({
        deliveryId: delivery.id,
        targetStatus,
        idempotencyKey,
        otpCode: extraParams.otp || null,
        podPhotoUrl: extraParams.podUrl || null,
        podMetadata: extraParams.podMeta || null,
        telemetry,
        timestamp: new Date().toISOString(),
      });

      // Optimistic local UI update
      setDelivery({
        ...delivery,
        delivery_status: targetStatus,
        version: (delivery.version || 1) + 1,
      });

      setShowOtpModal(false);
      setShowPodModal(false);
      setIsProcessing(false);
      setSuccessToast("تم حفظ الإجراء محلياً وسيتم المزامنة تلقائياً عند عودة الإنترنت ⚡");
      return;
    }

    try {
      const res = await fetch(`/api/v1/courier/deliveries/${delivery.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          idempotencyKey,
          otpCode: extraParams.otp,
          podPhotoUrl: extraParams.podUrl,
          podMetadata: extraParams.podMeta,
          telemetry,
          expectedVersion: delivery.version,
          source: "online",
        }),
      });

      const resJson = await res.json();

      if (res.ok && resJson.success) {
        setDelivery(resJson.delivery);
        setShowOtpModal(false);
        setShowPodModal(false);
        setSuccessToast(`تم التحديث بنجاح إلى: ${DELIVERY_STATUS_META[targetStatus]?.labelAr || targetStatus}`);
      } else if (res.status === 422 && targetStatus === "DELIVERED") {
        setOtpError(resJson.error || "رمز التحقق OTP غير صحيح. يرجى التأكد من العميل.");
      } else if (res.status === 409) {
        setErrorMessage("تعارض في الحالة (409 Conflict): تم تحديث حالة الشحنة من شاشة أخرى. جاري تحديث البيانات...");
        fetchDetail();
      } else {
        setErrorMessage(resJson.error || "فشل تنفيذ عملية الانتقال.");
      }
    } catch (netErr: any) {
      console.warn("Network failure during transition, enqueuing offline:", netErr);
      await enqueueDeliveryCommand({
        deliveryId: delivery.id,
        targetStatus,
        idempotencyKey,
        otpCode: extraParams.otp || null,
        podPhotoUrl: extraParams.podUrl || null,
        podMetadata: extraParams.podMeta || null,
        telemetry,
        timestamp: new Date().toISOString(),
      });

      setDelivery({
        ...delivery,
        delivery_status: targetStatus,
        version: (delivery.version || 1) + 1,
      });

      setShowOtpModal(false);
      setShowPodModal(false);
      setSuccessToast("تم حفظ الإجراء محلياً بسبب ضعف الشبكة ⚡");
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload POD Photo File
  const handleUploadPodAndDeliver = async () => {
    if (!delivery || !podFile) return;
    setIsUploadingPod(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", podFile);

      const upRes = await fetch(`/api/v1/courier/deliveries/${delivery.id}/upload-pod`, {
        method: "POST",
        body: formData,
      });

      const upData = await upRes.json();
      if (!upRes.ok || !upData.success) {
        setErrorMessage(upData.error || "فشل رفع صورة إثبات التسليم.");
        setIsUploadingPod(false);
        return;
      }

      // Execute transition with POD photo URL
      await handleTransition("DELIVERED", {
        podUrl: upData.file_url,
        podMeta: upData.metadata,
      });
    } catch (err: any) {
      setErrorMessage("حدث خطأ أثناء رفع ملف إثبات التسليم.");
    } finally {
      setIsUploadingPod(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-xs font-bold text-slate-600">جاري تحميل مسار الرحلة...</span>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center border border-slate-200 shadow-2xs space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-black text-slate-900">الشحنة غير متوفرة</h3>
        <p className="text-xs text-slate-500">{errorMessage || "لم يتم العثور على بيانات هذه الشحنة."}</p>
        <button
          onClick={() => router.push("/courier")}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          العودة للمهام
        </button>
      </div>
    );
  }

  const currentStatus = delivery.delivery_status;
  const currentMeta = DELIVERY_STATUS_META[currentStatus] || DELIVERY_STATUS_META.ASSIGNED;
  const isDelivered = currentStatus === "DELIVERED";

  // Google Maps Deep Links
  const supplierMapsUrl = delivery.pickup_coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${delivery.pickup_coords.lat},${delivery.pickup_coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.pickup_address)}`;

  const customerMapsUrl = delivery.dropoff_coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${delivery.dropoff_coords.lat},${delivery.dropoff_coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.dropoff_address)}`;

  // Determine Primary CTA Button Text & Target
  let nextActionLabel = "بدء التحرك للمورد";
  let nextTargetStatus: CourierDeliveryStatus = "EN_ROUTE_PICKUP";
  let ctaColor = "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white";

  if (currentStatus === "ASSIGNED") {
    nextActionLabel = "بدء التحرك لموقع المورد 🚗";
    nextTargetStatus = "EN_ROUTE_PICKUP";
    ctaColor = "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white";
  } else if (currentStatus === "EN_ROUTE_PICKUP") {
    nextActionLabel = "تأكيد الوصول لموقع المورد 📍";
    nextTargetStatus = "ARRIVED_PICKUP";
    ctaColor = "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white";
  } else if (currentStatus === "ARRIVED_PICKUP") {
    nextActionLabel = "تأكيد استلام وفحص الشحنة 📦";
    nextTargetStatus = "PICKED_UP";
    ctaColor = "bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white";
  } else if (currentStatus === "PICKED_UP") {
    nextActionLabel = "بدء التحرك لموقع العميل 🚚";
    nextTargetStatus = "EN_ROUTE_DELIVERY";
    ctaColor = "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white";
  } else if (currentStatus === "EN_ROUTE_DELIVERY") {
    nextActionLabel = "تأكيد الوصول لموقع العميل 📍";
    nextTargetStatus = "ARRIVED_DELIVERY";
    ctaColor = "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white";
  } else if (currentStatus === "ARRIVED_DELIVERY") {
    nextActionLabel = "إتمام التسليم وإدخال رمز OTP ✅";
    nextTargetStatus = "DELIVERED";
    ctaColor = "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white";
  }

  return (
    <div className="space-y-3 pb-8">
      {/* ── Top Bar with Back Link & Title ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/courier")}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-950 p-1 -m-1 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
          <span>العودة للمهام</span>
        </button>

        <span className="text-xs font-mono font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
          #{delivery.order_id}
        </span>
      </div>

      {/* ── Toast Notifications ── */}
      {successToast && (
        <div className="bg-emerald-600 text-white p-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md">
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-200 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-600 text-white p-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-200 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Status Banner & Stepper Header ── */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">المرحلة الحالية:</span>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 mt-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${currentMeta.dotColor}`} />
              {currentMeta.labelAr}
            </h2>
          </div>

          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold block">عمولة الرحلة</span>
            <span className="text-sm font-black text-emerald-800 font-mono">
              +{delivery.delivery_fee_earned || 35} ر.س
            </span>
          </div>
        </div>

        <p className="text-xs font-medium text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
          💡 {currentMeta.shortDescAr}
        </p>

        {/* 6-Node Mini Stepper Track */}
        <div className="grid grid-cols-6 gap-1 pt-1 text-center">
          {["مُسند", "للمورد", "وصل", "استلم", "للعميل", "تم"].map((lbl, idx) => {
            const isPassed = currentMeta.stepIndex >= idx + 1;
            const isCurrent = currentMeta.stepIndex === idx;

            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    isPassed
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-[#1B4D3E] text-white ring-2 ring-emerald-400/50"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                </div>
                <span className={`text-[9px] font-bold truncate ${isCurrent ? "text-emerald-900 font-black" : "text-slate-400"}`}>
                  {lbl}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Leg 1: Supplier Pickup Card ── */}
      <div className={`bg-white rounded-3xl p-4 border shadow-2xs space-y-3 transition-all ${
        ["ASSIGNED", "EN_ROUTE_PICKUP", "ARRIVED_PICKUP"].includes(currentStatus)
          ? "border-amber-400 ring-2 ring-amber-400/20"
          : "border-slate-200/90"
      }`}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-black">
              1
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 block">نقطة الاستلام (المورد)</span>
              <span className="text-[10px] text-amber-800 font-bold">{delivery.vendor_name}</span>
            </div>
          </div>

          <a
            href={`tel:${delivery.vendor_phone}`}
            className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
          >
            <Phone className="w-3 h-3" />
            <span>اتصال</span>
          </a>
        </div>

        <p className="text-xs font-bold text-slate-800 flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{delivery.pickup_address}</span>
        </p>

        {/* Action Button: Navigation Deep Link */}
        <a
          href={supplierMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-amber-400" />
          <span>فتح الملاحة لموقع المورد (Google Maps)</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        {/* Parts Verification Checklist */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
          <span className="text-[10px] font-black text-slate-500 block">قائمة فحص القطع عند الاستلام:</span>
          {delivery.parts_items && delivery.parts_items.length > 0 ? (
            delivery.parts_items.map((item, idx) => (
              <label
                key={idx}
                className="flex items-center justify-between text-xs font-medium text-slate-800 p-1.5 bg-white rounded-xl border border-slate-200/60 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!checkedItems[idx]}
                    onChange={(e) =>
                      setCheckedItems({ ...checkedItems, [idx]: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span>{item.name}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 font-mono">الكمية: {item.quantity}</span>
              </label>
            ))
          ) : (
            <p className="text-xs font-bold text-slate-700">{delivery.parts_summary}</p>
          )}
        </div>
      </div>

      {/* ── Leg 2: Customer Dropoff Card ── */}
      <div className={`bg-white rounded-3xl p-4 border shadow-2xs space-y-3 transition-all ${
        ["PICKED_UP", "EN_ROUTE_DELIVERY", "ARRIVED_DELIVERY"].includes(currentStatus)
          ? "border-emerald-500 ring-2 ring-emerald-500/20"
          : "border-slate-200/90"
      }`}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center text-xs font-black">
              2
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 block">نقطة التسليم (العميل)</span>
              <span className="text-[10px] text-emerald-800 font-bold">{delivery.client_name}</span>
            </div>
          </div>

          <a
            href={`tel:${delivery.client_phone}`}
            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/70 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
          >
            <Phone className="w-3 h-3" />
            <span>اتصال</span>
          </a>
        </div>

        <p className="text-xs font-bold text-slate-800 flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{delivery.dropoff_address}</span>
        </p>

        {/* Action Button: Navigation Deep Link */}
        <a
          href={customerMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          <span>فتح الملاحة لموقع العميل (Google Maps)</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>

      {/* ── Large Sticky One-Thumb Primary Action Bar ── */}
      <div className="fixed bottom-14 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200">
        <div className="max-w-md mx-auto">
          {isDelivered ? (
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-black text-emerald-900">تم إكمال هذه الرحلة بنجاح</p>
              <p className="text-[11px] text-emerald-700">تم تسجيل العمولة في محفظتك المالية.</p>
            </div>
          ) : currentStatus === "ARRIVED_DELIVERY" ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowOtpModal(true)}
                disabled={isProcessing}
                className="py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>إدخال رمز OTP 🔑</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPodModal(true)}
                disabled={isProcessing}
                className="py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>صورة إثبات POD 📷</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleTransition(nextTargetStatus)}
              disabled={isProcessing}
              className={`w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 ${ctaColor}`}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>{nextActionLabel}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Secure OTP Input Modal ── */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">إدخال رمز التحقق OTP</h3>
              <p className="text-xs text-slate-500 mt-1">
                اطلب الرمز السري المكون من 4 أرقام من العميل المستلم لتأكيد التسليم
              </p>
            </div>

            {otpError && (
              <div className="bg-rose-50 text-rose-800 p-2.5 rounded-xl text-xs font-bold border border-rose-200">
                {otpError}
              </div>
            )}

            <div>
              <input
                type="text"
                maxLength={4}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="• • • •"
                className="w-full text-center text-3xl font-mono font-black tracking-widest py-3 border-2 border-emerald-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 bg-slate-50"
                autoFocus
              />
              <span className="text-[10px] text-slate-400 block mt-1.5">اطلب الرمز السري المكون من 4 أرقام من العميل لتأكيد الاستلام</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                disabled={isProcessing}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => handleTransition("DELIVERED", { otp: otpCode })}
                disabled={isProcessing || otpCode.length !== 4}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد التسليم ✅"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── POD Photo Upload Modal ── */}
      {showPodModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">إثبات التسليم بالصورة (POD)</h3>
              <p className="text-xs text-slate-500 mt-1">
                التقط صورة واضحة للقطع المسلمة عند موقع العميل
              </p>
            </div>

            {/* File upload input */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 text-center">
              {podPreview ? (
                <div className="space-y-2">
                  <img
                    src={podPreview}
                    alt="معاينة إثبات التسليم"
                    className="max-h-48 w-auto mx-auto rounded-xl object-contain border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPodFile(null);
                      setPodPreview(null);
                    }}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    تغيير الصورة ✕
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block space-y-2">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                  <span className="text-xs font-bold text-slate-700 block">انقر لالتقاط أو اختيار الصورة</span>
                  <span className="text-[10px] text-slate-400 block">JPG, PNG, WEBP (الحد الأقصى 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPodFile(file);
                        setPodPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPodModal(false)}
                disabled={isUploadingPod}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleUploadPodAndDeliver}
                disabled={isUploadingPod || !podFile}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isUploadingPod ? <Loader2 className="w-4 h-4 animate-spin" /> : "اعتماد التسليم 📷"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
