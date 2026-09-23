"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LifeBuoy, Search, RefreshCw, MessageSquare, Clock, CheckCircle2,
  XCircle, AlertCircle, Send, User, ChevronRight, CornerDownLeft,
  Calendar, FileText, ArrowRight, X, Phone, Building2, ShieldAlert
} from "lucide-react";
import Link from "next/link";

interface SupportRequest {
  id: string;
  client_id?: string;
  vendor_id?: string;
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
  client?: { full_name: string; phone?: string; company_name?: string; ref_code?: string };
  vendor?: { full_name: string; phone?: string; company_name?: string; ref_code?: string };
  support_request_items?: any[];
}

interface SupportMessage {
  id: string;
  request_id: string;
  sender_name: string;
  sender_role: "admin" | "staff" | "client" | "vendor" | "courier";
  message: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open: { label: "مفتوح (جديد)", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pending: { label: "قيد الانتظار", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "قيد المعالجة", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  accepted: { label: "تم القبول", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "مكتمل / مغلق", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  closed: { label: "مغلق", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  rejected: { label: "مرفوض", cls: "bg-red-50 text-red-700 border-red-200" },
};

const TYPE_MAP: Record<string, string> = {
  inquiry: "استفسار عام",
  complaint: "شكوى أو نزاع",
  return: "طلب إرجاع قطعة",
  replacement: "طلب استبدال",
  financial: "مطالبة مالية / محفظة",
  payout_withdrawal: "سحب الرصيد (مورد)",
  pickup_delay: "التأخر في استلام الطلب",
  return_replacement: "الاستبدال والاسترجاع",
  item_mismatch: "الطلب غير مطابق",
  delivery_delay: "التأخر في استلام الطلب",
  suggestion: "اقتراح للتطوير",
  other: "طلب مساعدة عامة",
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "closed">("all");

  // Conversation Modal State (CRITICAL REQUIREMENT)
  const [selectedTicket, setSelectedTicket] = useState<SupportRequest | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/support", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } catch (e) {
      console.error("Failed to load tickets:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    const interval = setInterval(() => loadTickets(true), 7000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  const openConversation = async (ticket: SupportRequest) => {
    setSelectedTicket(ticket);
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/v1/admin/support/${ticket.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(data.ticket);
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Failed to load thread:", e);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setReplying(true);
    try {
      const res = await fetch(`/api/v1/admin/support/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        setMessages((prev) => [...prev, data.reply]);
        // Refresh ticket status locally
        setSelectedTicket((prev) => prev ? { ...prev, status: "in_progress" } : null);
        loadTickets();
      }
    } catch (e) {
      console.error("Failed to send reply:", e);
    } finally {
      setReplying(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/admin/support/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(data.ticket);
        loadTickets();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filtered = tickets.filter((t) => {
    if (statusFilter === "open" && !["open", "pending"].includes(t.status)) return false;
    if (statusFilter === "in_progress" && t.status !== "in_progress") return false;
    if (statusFilter === "closed" && !["closed", "completed", "rejected"].includes(t.status)) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [
      t.id,
      t.order_id,
      t.subject,
      t.reason,
      t.client?.full_name,
      t.client?.company_name,
      t.client?.ref_code,
      t.vendor?.company_name,
      t.vendor?.ref_code,
    ].some((v) => v && String(v).toLowerCase().includes(q));
  });

  const openCount = tickets.filter((t) => ["open", "pending"].includes(t.status)).length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const closedCount = tickets.filter((t) => ["closed", "completed", "rejected"].includes(t.status)).length;

  return (
    <div className="p-6 md:p-8 space-y-6 w-full" dir="rtl">
      
      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">المساعدة والدعم الفني</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            إدارة تذاكر الدعم والنزاعات، والرد المباشر على المحادثات وتغيير حالات المعالجة
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadTickets()}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: "open" as const, label: "تذاكر جديدة / مفتوحة", count: openCount, icon: Clock, color: "bg-blue-50/60 border-blue-200 text-blue-700" },
          { key: "in_progress" as const, label: "تذاكر قيد المعالجة", count: inProgressCount, icon: MessageSquare, color: "bg-purple-50/60 border-purple-200 text-purple-700" },
          { key: "closed" as const, label: "تذاكر مغلقة ومكتملة", count: closedCount, icon: CheckCircle2, color: "bg-emerald-50/60 border-emerald-200 text-emerald-700" },
        ].map((c) => {
          const Icon = c.icon;
          const isSelected = statusFilter === c.key;
          return (
            <div
              key={c.label}
              onClick={() => setStatusFilter(statusFilter === c.key ? "all" : c.key)}
              className={`rounded-3xl border p-5 shadow-xs cursor-pointer transition-all flex items-center justify-between ${c.color} ${
                isSelected ? "ring-2 ring-blue-500/40 font-black scale-101" : ""
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-600">{c.label}</p>
                <p className="text-3xl font-black font-mono mt-1 text-slate-900">{c.count}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-700 shadow-2xs">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. Search & Quick Filters ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم التذكرة، رقم الطلب، اسم العميل، المورد، أو موضوع المشكلة..."
            className="w-full h-10 pr-10 pl-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex gap-1.5 bg-slate-100 rounded-2xl p-1.5 shrink-0 text-xs font-bold">
          {[
            { key: "all", label: "كافة التذاكر" },
            { key: "open", label: "مفتوحة" },
            { key: "in_progress", label: "قيد المعالجة" },
            { key: "closed", label: "مغلقة" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key as any)}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === f.key ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Tickets Table ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                <th className="py-4 px-4">رقم التذكرة</th>
                <th className="py-4 px-4">نوع الطلب</th>
                <th className="py-4 px-4">العميل / الطرف المتضرر</th>
                <th className="py-4 px-4">الموضوع / سبب الشكوى</th>
                <th className="py-4 px-4 text-center">رقم الطلب</th>
                <th className="py-4 px-4 text-center">الحالة</th>
                <th className="py-4 px-4 text-center">تاريخ الإنشاء</th>
                <th className="py-4 px-5 text-center w-28">المحادثة والرد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-5">
                      <div className="h-4 bg-slate-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-bold">
                    لا توجد تذاكر دعم مطابقة
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const st = STATUS_MAP[t.status] || { label: t.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
                  const requesterRole = (t as any).requester_role || (t.vendor_id && !t.client_id ? "vendor" : (t as any).courier ? "courier" : "client");
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-slate-900">
                        #{t.id.slice(0, 8).toUpperCase()}
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800 text-xs">
                          {TYPE_MAP[t.request_type] || t.request_type}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          {requesterRole === "vendor" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                              مورد
                            </span>
                          )}
                          {requesterRole === "client" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                              عميل
                            </span>
                          )}
                          {requesterRole === "courier" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                              مندوب
                            </span>
                          )}
                        </div>
                        <p className="font-black text-slate-900 truncate max-w-40">
                          {t.client?.company_name || t.client?.full_name || t.vendor?.company_name || (t as any).courier?.full_name || "—"}
                        </p>
                        {(t.client?.ref_code || t.vendor?.ref_code || (t as any).courier?.ref_code) && (
                          <span className="font-mono text-[10px] text-slate-400 block font-bold">
                            {t.client?.ref_code || t.vendor?.ref_code || (t as any).courier?.ref_code}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-700 max-w-56">
                        <p className="font-bold text-xs truncate">{t.subject || t.reason}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{t.reason}</p>
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-slate-600">
                        {t.order_id ? `#${t.order_id.slice(0, 8).toUpperCase()}` : "—"}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-0.5 rounded-full border ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center text-slate-400 font-medium text-[11px]">
                        {new Date(t.created_at).toLocaleDateString("ar-SA")}
                      </td>

                      <td className="py-4 px-5 text-center">
                        <Link
                          href={`/admin/support/${t.id}`}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>فتح المحادثة</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Conversation & Reply Modal ── */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">
                      تذكرة #{selectedTicket.id.slice(0, 8).toUpperCase()} · {TYPE_MAP[selectedTicket.request_type] || selectedTicket.request_type}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${STATUS_MAP[selectedTicket.status]?.cls || ""}`}>
                      {STATUS_MAP[selectedTicket.status]?.label || selectedTicket.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    الطرف: {selectedTicket.client?.full_name || selectedTicket.client?.company_name || selectedTicket.vendor?.company_name || (selectedTicket as any).courier?.full_name || "—"}
                    {selectedTicket.order_id && ` · رقم الطلب: #${selectedTicket.order_id.slice(0, 8).toUpperCase()}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ticket Subject & Original Reason */}
            <div className="p-4 bg-blue-50/40 border-b border-blue-100 text-xs space-y-1">
              <p className="font-bold text-slate-800">بيان المشكلة الأساسي:</p>
              <p className="text-slate-700 leading-relaxed">{selectedTicket.reason}</p>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/50">
              {loadingThread ? (
                <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل سجل المحادثة...</div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold">
                  لا توجد ردود سابقة بعد. يمكنك إرسال الرد الأول للمستخدم أدناه.
                </div>
              ) : (
                messages.map((msg) => {
                  const isStaff = msg.sender_role === "admin" || msg.sender_role === "staff";
                  const roleLabel =
                    isStaff
                      ? "فريق الدعم الفني (الإدارة)"
                      : msg.sender_role === "vendor"
                      ? "المورد"
                      : msg.sender_role === "courier"
                      ? "مندوب التوصيل"
                      : "العميل";

                  const roleBadgeCls =
                    isStaff
                      ? "bg-purple-100 text-purple-800"
                      : msg.sender_role === "vendor"
                      ? "bg-emerald-100 text-emerald-800"
                      : msg.sender_role === "courier"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isStaff ? "mr-auto items-start" : "ml-auto items-end"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-slate-500">
                        <span>{msg.sender_name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${roleBadgeCls}`}>
                          {roleLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(msg.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed font-semibold shadow-2xs ${
                          isStaff
                            ? "bg-slate-900 text-white rounded-tr-none"
                            : "bg-white text-slate-900 border border-slate-200 rounded-tl-none"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Status Workflow Action Toolbar */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-bold">
              <span className="text-slate-500 text-[11px]">تحديث حالة التذكرة:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("in_progress")}
                  disabled={updatingStatus || selectedTicket.status === "in_progress"}
                  className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                >
                  قيد المعالجة
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("closed")}
                  disabled={updatingStatus || selectedTicket.status === "closed"}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  إغلاق التذكرة ✓
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("open")}
                  disabled={updatingStatus || selectedTicket.status === "open"}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  إعادة فتح
                </button>
              </div>
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="اكتب رد فريق الدعم الفني هنا..."
                className="flex-1 h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={replying || !replyText.trim()}
                className="h-11 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {replying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>إرسال الرد</span>
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
