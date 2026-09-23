"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  LifeBuoy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Receipt,
  Calendar,
  Hash,
  RotateCcw,
  RefreshCw,
  ChevronLeft,
  Sparkles,
  FileQuestion,
  Headphones,
  Car,
  Send,
  Loader2,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  User,
  ExternalLink,
  Check,
  Lock,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClientTicketConversation } from "@/components/support/client-ticket-conversation";

interface SupportRequest {
  id: string;
  client_id?: string;
  vendor_id?: string;
  requester_id?: string;
  requester_role?: string;
  requester_name?: string;
  order_id?: string;
  request_type: string;
  status: string;
  subject?: string;
  reason: string;
  rejection_reason?: string;
  refund_amount?: number;
  created_at: string;
  reviewed_at?: string;
  completed_at?: string;
  closed_at?: string;
  client?: {
    id: string;
    full_name: string;
    phone?: string;
    company_name?: string;
    ref_code?: string;
    email?: string;
  };
  vendor?: {
    id: string;
    full_name: string;
    phone?: string;
    company_name?: string;
    ref_code?: string;
    email?: string;
  };
  orders?: {
    id: string;
    status: string;
    total_price: number;
    rfqs?: {
      car_make?: string;
      car_model?: string;
      car_year?: string;
      plate_number?: string;
    };
  };
  support_request_items?: Array<{
    id: string;
    part_name: string;
    part_number?: string;
    quantity: number;
    unit_price?: number;
  }>;
}

interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  sender_role: string;
  sender_name: string;
  message_text: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string; icon: any; ring: string }> = {
  open: { label: "مفتوح (جديد)", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", icon: Clock, ring: "ring-blue-500/20" },
  pending: { label: "قيد الانتظار", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: Clock, ring: "ring-amber-500/20" },
  in_progress: { label: "قيد المعالجة", dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700 ring-purple-600/20", icon: Clock, ring: "ring-purple-500/20" },
  accepted: { label: "مقبول", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: CheckCircle2, ring: "ring-emerald-500/20" },
  rejected: { label: "مرفوض", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", icon: XCircle, ring: "ring-rose-500/20" },
  completed: { label: "مكتمل", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700 ring-sky-600/20", icon: CheckCircle2, ring: "ring-sky-500/20" },
  closed: { label: "مغلق", dot: "bg-slate-500", badge: "bg-slate-50 text-slate-700 ring-slate-600/20", icon: CheckCircle2, ring: "ring-slate-500/20" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: any; badge: string }> = {
  return_replacement: { label: "الاستبدال والاسترجاع", icon: RotateCcw, badge: "bg-purple-50 text-purple-700 ring-purple-600/20" },
  item_mismatch: { label: "الطلب غير مطابق", icon: AlertTriangle, badge: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  delivery_delay: { label: "التأخر في استلام الطلب", icon: Clock, badge: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  suggestion: { label: "اقتراح للتطوير", icon: Sparkles, badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  other: { label: "أخرى", icon: FileQuestion, badge: "bg-slate-100 text-slate-700 ring-slate-600/20" },
  return: { label: "استرجاع", icon: RotateCcw, badge: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  replacement: { label: "استبدال", icon: RefreshCw, badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
  inquiry: { label: "استفسار عام", icon: Headphones, badge: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  complaint: { label: "شكوى أو نزاع", icon: AlertTriangle, badge: "bg-rose-50 text-rose-700 ring-rose-600/20" },
};

function shortId(id?: string | null) {
  if (!id) return "";
  return String(id).replace(/^ORD-/, "").slice(0, 8).toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<SupportRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [rejectPromptOpen, setRejectPromptOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicketDetails = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/support/${ticketId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch ticket");
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
        setMessages(
          (data.messages || []).map((m: any) => ({
            ...m,
            message_text: m.message_text || m.message || "",
          }))
        );
      }
    } catch (err) {
      console.error("Error loading ticket thread:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicketDetails();
    const interval = setInterval(() => fetchTicketDetails(true), 4000);
    return () => clearInterval(interval);
  }, [fetchTicketDetails]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sending) return;

    setSending(true);
    const text = replyText.trim();
    setReplyText("");

    try {
      const res = await fetch(`/api/v1/admin/support/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.reply.id || `msg-${Date.now()}`,
            request_id: ticketId,
            sender_id: "admin-demo-id",
            sender_role: "staff",
            sender_name: "فريق الدعم الفني المركزي",
            message_text: text,
            created_at: new Date().toISOString(),
          },
        ]);
        // Update ticket status to in_progress locally if it was open
        setTicket((prev) => (prev && (prev.status === "open" || prev.status === "pending") ? { ...prev, status: "in_progress" } : prev));
      } else {
        alert(data.error || "فشل إرسال الرد");
        setReplyText(text);
      }
    } catch (err) {
      console.error("Error sending reply:", err);
      setReplyText(text);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string, reason?: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          rejection_reason: reason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
        setRejectPromptOpen(false);
        setRejectionReason("");
        await fetchTicketDetails(true);
      } else {
        alert(data.error || "فشل تحديث الحالة");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading && !ticket) {
    return (
      <div className="w-full py-24 flex flex-col items-center justify-center text-gray-500 gap-3" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-800" />
        <span className="text-sm font-bold">جاري تحميل تفاصيل التذكرة والمحادثة...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="w-full py-24 text-center text-gray-500" dir="rtl">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-gray-800">التذكرة غير موجودة</h2>
        <p className="text-xs text-gray-500 mt-1">تعذر العثور على تذكرة الدعم المطلوبة</p>
        <Link href="/admin/support" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B4D3E] text-white rounded-xl text-xs font-bold">
          العودة لقائمة التذاكر
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const typeCfg = TYPE_CONFIG[ticket.request_type] ?? { label: ticket.request_type, icon: Headphones, badge: "bg-gray-100 text-gray-700" };
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;
  const items = ticket.support_request_items ?? [];

  // Build 3-stage timeline (Cancelled "تم القبول")
  const isStep1Done = true;
  const isStep2Done = ["in_progress", "accepted", "completed", "closed", "rejected"].includes(ticket.status);
  const isStep3Done = ["completed", "closed", "rejected"].includes(ticket.status);

  const timeline = [
    {
      label: "تم إنشاء الطلب",
      date: ticket.created_at,
      done: isStep1Done,
      icon: Hash,
      active: ticket.status === "open" || ticket.status === "pending",
      color: "bg-emerald-500",
    },
    {
      label: "قيد المعالجة",
      date: isStep2Done ? (ticket.reviewed_at || ticket.created_at) : null,
      done: isStep2Done,
      icon: Clock,
      active: ticket.status === "in_progress" || ticket.status === "accepted",
      color: "bg-purple-500",
    },
    {
      label: ticket.status === "rejected" ? "تم الرفض" : ticket.status === "closed" ? "تم الإغلاق" : "تم الإكمال",
      date: isStep3Done ? (ticket.completed_at || ticket.closed_at || ticket.reviewed_at) : null,
      done: isStep3Done,
      icon: ticket.status === "rejected" ? XCircle : CheckCircle2,
      active: isStep3Done,
      color: ticket.status === "rejected" ? "bg-rose-500" : "bg-sky-500",
    },
  ];

  const progressPercent = isStep3Done ? "100%" : isStep2Done ? "50%" : "0%";

  const requester = ticket.client || ticket.vendor;
  const requesterRole = ticket.requester_role || (ticket.vendor_id && !ticket.client_id ? "vendor" : "client");

  return (
    <div className="p-6 md:p-8 space-y-6 w-full" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/admin/support" className="hover:text-gray-800 inline-flex items-center gap-1.5 transition-colors">
          <LifeBuoy className="w-3.5 h-3.5" />
          مركز الدعم والمساعدة
        </Link>
        <ChevronLeft className="w-3 h-3 text-gray-300" />
        <span className="font-mono font-semibold text-gray-900">تذكرة #{shortId(ticket.id)}</span>
      </nav>

      {/* Header */}
      <header className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-inset ${statusCfg.ring} bg-gradient-to-br from-white to-gray-50 border border-gray-200/80 shadow-xs`}>
            <TypeIcon className="w-6 h-6 text-gray-700" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-black text-gray-900">
                {typeCfg.label}
              </h1>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${typeCfg.badge}`}>
                {typeCfg.label}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.badge}`}>
                <StatusIcon className="w-3 h-3" strokeWidth={2.5} />
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="font-mono font-bold text-gray-700">#{shortId(ticket.id)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(ticket.created_at)} ({formatTime(ticket.created_at)})
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200 transition-all self-start md:self-auto"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة للتذاكر</span>
        </Link>
      </header>

      {/* TIMELINE (3 STAGES ONLY - IDENTICAL TO CLIENT) */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-emerald-800" />
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">مسار معالجة التذكرة</h2>
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          {/* Background line */}
          <div className="absolute top-3 right-12 left-12 h-0.5 bg-gray-200" />
          {/* Active progress line */}
          <div
            className="absolute top-3 right-12 h-0.5 bg-gradient-to-l from-emerald-500 via-purple-500 to-sky-500 transition-all duration-300"
            style={{
              width: `calc(${progressPercent} - 3rem)`,
            }}
          />
          {timeline.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="relative flex flex-col items-center text-center">
                <div className={`relative w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white transition-all ${
                  step.done ? step.color : "bg-gray-200"
                }`}>
                  {step.done ? (
                    <Icon className="w-3 h-3 text-white" strokeWidth={3} />
                  ) : (
                    <Icon className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
                  )}
                  {step.active && (
                    <div className="absolute inset-0 rounded-full bg-current opacity-30 animate-ping" />
                  )}
                </div>
                <p className={`text-[11px] font-bold mt-2 ${step.done ? "text-gray-900" : "text-gray-400"}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                    {formatDate(step.date)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Rejection Alert */}
      {ticket.status === "rejected" && ticket.rejection_reason && (
        <section className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900 mb-1">سبب تعذر قبول التذكرة:</p>
              <p className="text-xs text-rose-700 leading-relaxed">{ticket.rejection_reason}</p>
            </div>
          </div>
        </section>
      )}

      {/* Main Grid: Live Conversation + Details & Admin Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right / Main: Live Chat Conversation */}
        <div className="lg:col-span-7">
          <ClientTicketConversation
            ticketId={ticket.id}
            currentUserId="admin-staff"
            viewerRole="admin"
            currentUserName="المدير العام للمنصة"
            ticketStatus={ticket.status}
            requesterName={requester?.company_name || requester?.full_name || ticket.requester_name}
          />
        </div>

        {/* Left Sidebar: Admin Controls & Details */}
        <div className="lg:col-span-5 space-y-4">
          {/* Admin Quick Action Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-800" />
                <span>إجراءات التحكم الإداري</span>
              </h3>
              <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full border ${statusCfg.badge}`}>
                {statusCfg.label}
              </span>
            </div>

            <p className="text-[11px] text-gray-500">
              تغيير مسار معالجة التذكرة؛ عند إغلاق التذكرة نهائياً لن يتمكن المستخدم من إرسال رسائل جديدة أو إعادة فتحها.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleUpdateStatus("in_progress")}
                disabled={updatingStatus || ticket.status === "in_progress"}
                className="p-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>قيد المعالجة</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("closed")}
                disabled={updatingStatus || ticket.status === "closed"}
                className="p-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>إغلاق التذكرة نهائياً ✓</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("completed")}
                disabled={updatingStatus || ticket.status === "completed"}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>إكمال وحل المشكلة</span>
              </button>

              <button
                type="button"
                onClick={() => setRejectPromptOpen(!rejectPromptOpen)}
                disabled={updatingStatus}
                className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>رفض التذكرة...</span>
              </button>
            </div>

            {/* Reopen button for admin only if already closed */}
            {(ticket.status === "closed" || ticket.status === "completed" || ticket.status === "rejected") && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("open")}
                disabled={updatingStatus}
                className="w-full mt-2 p-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>إعادة فتح التذكرة (خاص بالإدارة)</span>
              </button>
            )}

            {/* Rejection Prompt Box */}
            {rejectPromptOpen && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
                <label className="text-[11px] font-bold text-rose-900 block">سبب رفض التذكرة:</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اكتب سبب الرفض لمقدم الطلب..."
                  rows={2}
                  className="w-full p-2 text-xs border border-rose-300 rounded-lg bg-white"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRejectPromptOpen(false)}
                    className="px-2.5 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("rejected", rejectionReason)}
                    disabled={!rejectionReason.trim() || updatingStatus}
                    className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                  >
                    تأكيد الرفض
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Requester Information Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-gray-900 flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>مقدم التذكرة</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                requesterRole === "vendor" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}>
                {requesterRole === "vendor" ? "مورد" : "عميل"}
              </span>
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-gray-700">
                <span className="text-gray-500">الاسم / المنشأة:</span>
                <span className="font-bold text-gray-900">
                  {requester?.company_name || requester?.full_name || ticket.requester_name || "—"}
                </span>
              </div>

              {requester?.ref_code && (
                <div className="flex items-center justify-between text-gray-700">
                  <span className="text-gray-500">كود العضوية:</span>
                  <span className="font-mono font-bold text-gray-900">{requester.ref_code}</span>
                </div>
              )}

              {requester?.phone && (
                <div className="flex items-center justify-between text-gray-700">
                  <span className="text-gray-500">رقم الهاتف:</span>
                  <a href={`tel:${requester.phone}`} className="font-mono font-bold text-emerald-800 hover:underline inline-flex items-center gap-1" dir="ltr">
                    <Phone className="w-3 h-3" />
                    <span>{requester.phone}</span>
                  </a>
                </div>
              )}

              {requester?.email && (
                <div className="flex items-center justify-between text-gray-700">
                  <span className="text-gray-500">البريد الإلكتروني:</span>
                  <a href={`mailto:${requester.email}`} className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>{requester.email}</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-100">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span>بيانات التذكرة والطلب</span>
            </h3>

            {ticket.order_id && (
              <div className="flex items-center justify-between text-gray-600">
                <span>الطلب المرتبط:</span>
                <Link
                  href={`/admin/orders`}
                  className="font-mono font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <span>#{shortId(ticket.order_id)}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {ticket.orders?.rfqs && (
              <div className="flex items-center justify-between text-gray-600">
                <span>بيانات المركبة:</span>
                <span className="font-bold text-gray-800">
                  {ticket.orders.rfqs.car_make} {ticket.orders.rfqs.car_model} {ticket.orders.rfqs.car_year}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-gray-600">
              <span>تاريخ التقديم:</span>
              <span>{formatDate(ticket.created_at)}</span>
            </div>

            {ticket.refund_amount && (
              <div className="flex items-center justify-between text-emerald-800 font-bold pt-2 border-t border-gray-100">
                <span>المبلغ المطلوب:</span>
                <span className="font-mono">{Number(ticket.refund_amount).toLocaleString("en-SA")} ر.س</span>
              </div>
            )}
          </div>

          {/* Reason / Initial Note */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-2 text-xs">
            <h3 className="font-bold text-gray-900">شرح وتفاصيل المشكلة المسجلة:</h3>
            <p className="text-gray-700 leading-relaxed bg-gray-50/70 p-3 rounded-xl border border-gray-100">
              {ticket.reason || "لا يوجد شرح إضافي"}
            </p>
          </div>

          {/* Affected Items Table if any */}
          {items.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900">القطع المتأثرة</span>
                <span className="text-gray-400 font-mono">{items.length} قطعة</span>
              </div>

              <div className="space-y-1.5 divide-y divide-gray-50">
                {items.map((it: any) => (
                  <div key={it.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{it.part_name}</p>
                      {it.part_number && (
                        <p className="text-[10px] text-gray-400 font-mono">{it.part_number}</p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-gray-700">x{it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
