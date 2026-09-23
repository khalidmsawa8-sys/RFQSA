"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  RefreshCw,
  User,
  ShieldCheck,
  Headphones,
  CheckCheck,
  Clock,
  Lock,
  ChevronDown,
  AlertCircle,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  sender_role: string;
  sender_name: string;
  message_text: string;
  created_at: string;
  status?: "sending" | "sent" | "error";
}

export interface ClientTicketConversationProps {
  ticketId: string;
  currentUserId?: string;
  viewerRole?: "client" | "vendor" | "courier" | "admin" | "staff";
  currentUserName?: string;
  ticketStatus?: string;
  ticketSubject?: string;
  requesterName?: string;
  className?: string;
}

const CANNED_REPLIES_ADMIN = [
  "أهلاً بك، جاري فحص طلبك ومراجعته مع القسم المختص والرد عليك سريعاً ⏱️",
  "تم مراجعة المشكلة وتحديث الإجراءات بنجاح، هل تحتاج لأي مساعدة أخرى؟ ✓",
  "يرجى تزويدنا بصور للقطع أو رقم الشحنة لتسريع استكمال معالجة التذكرة 📷",
];

const CANNED_REPLIES_USER = [
  "شكراً لكم، بانتظار متابعتكم واعتماد الطلب 🌸",
  "تم توضيح المطلوب، يرجى إفادتي عند انتهاء المعالجة.",
  "هل يمكن تسريع الإجراءات لحاجتي العاجلة لقطع الغيار؟",
];

export function ClientTicketConversation({
  ticketId,
  currentUserId,
  viewerRole = "client",
  currentUserName,
  ticketStatus,
  ticketSubject,
  requesterName,
  className = "",
}: ClientTicketConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesCountRef = useRef(0);
  const isInitialScrollDone = useRef(false);

  const isClosed = ["closed", "completed", "rejected"].includes(ticketStatus || "");
  const isAdminViewer = viewerRole === "admin" || viewerRole === "staff";

  // Helper to determine if message is sent by ME (current viewer)
  const isMyMessage = useCallback(
    (m: Message): boolean => {
      const isStaffMsg =
        m.sender_role === "admin" || m.sender_role === "staff" || m.sender_role === "support";

      if (isAdminViewer) {
        return isStaffMsg;
      }

      if (isStaffMsg) {
        return false;
      }

      if (m.sender_role && m.sender_role === viewerRole) {
        return true;
      }

      if (currentUserId && m.sender_id === currentUserId) {
        return true;
      }

      return false;
    },
    [isAdminViewer, viewerRole, currentUserId]
  );

  // Strictly container-only scroll! NEVER touches window or document scroll!
  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      if (smooth) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, []);

  // Detect if user has scrolled up inside the chat box
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const atBottom = distanceToBottom < 60;
    isAtBottomRef.current = atBottom;
    setShowScrollDownBtn(!atBottom && target.scrollHeight > target.clientHeight + 80);
  }, []);

  // Fetch messages from server without unstable dependencies
  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!silent && prevMessagesCountRef.current === 0) setLoading(true);
      try {
        let res = await fetch(`/api/v1/support/${ticketId}/messages`, { cache: "no-store" });
        if (!res.ok && isAdminViewer) {
          res = await fetch(`/api/v1/admin/support/${ticketId}`, { cache: "no-store" });
        }
        if (!res.ok) {
          res = await fetch(`/api/v1/client/support/${ticketId}/messages`, { cache: "no-store" });
        }
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.messages)) {
            const fetched: Message[] = data.messages.map((m: any) => ({
              ...m,
              message_text: m.message_text || m.message || "",
              status: "sent",
            }));

            // Merge with local state preserving any optimistic sending messages
            setMessages((prev) => {
              const pendingOptimistic = prev.filter(
                (p) =>
                  p.status === "sending" &&
                  !fetched.some(
                    (f) =>
                      f.message_text === p.message_text &&
                      Math.abs(new Date(f.created_at).getTime() - new Date(p.created_at).getTime()) < 10000
                  )
              );

              // Sort ascending by created_at
              const combined = [...fetched, ...pendingOptimistic].sort((a, b) => {
                const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                if (diff !== 0) return diff;
                return a.id.localeCompare(b.id);
              });

              // Avoid unnecessary state updates if nothing changed
              if (
                prev.length === combined.length &&
                prev[prev.length - 1]?.id === combined[combined.length - 1]?.id &&
                prev[prev.length - 1]?.status === combined[combined.length - 1]?.status
              ) {
                return prev;
              }

              return combined;
            });

            setLastSync(new Date());
          }
        }
      } catch (e) {
        console.warn("Fetch messages error:", e);
      } finally {
        setLoading(false);
      }
    },
    [ticketId, isAdminViewer]
  );

  // Initial load & Polling
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 3000);

    // Instant refresh on window focus
    const onFocus = () => fetchMessages(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchMessages]);

  // Supabase Realtime Subscription for sub-second updates
  useEffect(() => {
    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`support-chat-${ticketId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `request_id=eq.${ticketId}`,
          },
          () => {
            fetchMessages(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      // Supabase realtime channel optional fallback to polling
    }
  }, [ticketId, fetchMessages]);

  // Auto-scroll chat box container ONLY on initial load or new messages
  useEffect(() => {
    if (messages.length === 0) return;

    if (!isInitialScrollDone.current) {
      // First load: jump to bottom of chat box without touching page scroll
      isInitialScrollDone.current = true;
      prevMessagesCountRef.current = messages.length;
      setTimeout(() => scrollToBottom(false), 50);
      return;
    }

    // A genuinely new message arrived
    if (messages.length > prevMessagesCountRef.current) {
      prevMessagesCountRef.current = messages.length;
      if (isAtBottomRef.current) {
        setTimeout(() => scrollToBottom(true), 30);
      }
    }
  }, [messages.length, scrollToBottom]);

  // Send message handler with instant OPTIMISTIC update
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || newMsg).trim();
    if (!textToSend || sending || isClosed) return;

    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const optimisticMessage: Message = {
      id: optimisticId,
      request_id: ticketId,
      sender_id: currentUserId || "me",
      sender_role: isAdminViewer ? "staff" : viewerRole,
      sender_name:
        currentUserName ||
        (isAdminViewer ? "فريق الدعم الفني المركزي" : viewerRole === "vendor" ? "المورد" : "العميل"),
      message_text: textToSend,
      created_at: nowIso,
      status: "sending",
    };

    // 1. Instantly append to messages for 0ms feedback
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMsg("");
    setSending(true);

    // 2. Scroll to bottom immediately
    setTimeout(() => scrollToBottom(true), 20);

    try {
      let res = await fetch(`/api/v1/support/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, message_text: textToSend }),
      });

      if (!res.ok && isAdminViewer) {
        res = await fetch(`/api/v1/admin/support/${ticketId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: textToSend, message_text: textToSend }),
        });
      }

      if (!res.ok) {
        res = await fetch(`/api/v1/client/support/${ticketId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message_text: textToSend }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? {
                  ...m,
                  id: data.reply?.id || m.id,
                  status: "sent",
                  created_at: data.reply?.created_at || m.created_at,
                }
              : m
          )
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? { ...m, status: "error" } : m))
        );
        alert(err.error || "فشل إرسال الرسالة");
      }
    } catch (err) {
      console.error("Send message network error:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, status: "error" } : m))
      );
    } finally {
      setSending(false);
    }
  };

  // Time format
  const fmtTime = (d: string) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Date divider label
  const getDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (d.toDateString() === today.toDateString()) {
        return "اليوم";
      }
      if (d.toDateString() === yesterday.toDateString()) {
        return "أمس";
      }
      return d.toLocaleDateString("ar-SA", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  const cannedReplies = isAdminViewer ? CANNED_REPLIES_ADMIN : CANNED_REPLIES_USER;

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[580px] font-sans relative ${className}`}
      dir="rtl"
    >
      {/* ── CHAT HEADER ── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
              <Headphones className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                {isAdminViewer ? "المحادثة المباشرة مع مقدم التذكرة" : "المحادثة المباشرة مع فريق الدعم"}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>مباشر ⚡</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {isAdminViewer
                ? `الردود تصدر باسم الإدارة المركزية وتصل مباشرة لـ (${requesterName || "المستخدم"})`
                : "نحن متواجدون للرد على استفساراتك وحل المشكلات التشغيلية فوراً"}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchMessages()}
          className="h-8 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="تحديث الرسائل الآن"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
        </Button>
      </div>

      {/* ── MESSAGES SCROLL CONTAINER ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#f8fafc] custom-scrollbar relative"
      >
        {loading && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 gap-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="font-bold">جاري تحميل سجل المحادثة المباشرة...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h4 className="text-xs font-black text-slate-800">لا توجد رسائل سابقة في هذه المحادثة</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              اكتب استفسارك أو تفاصيل المشكلة في المربع أدناه وسيقوم فريق الدعم بمتابعتها معك مباشرة.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = isMyMessage(m);
            const isStaffMsg =
              m.sender_role === "admin" || m.sender_role === "staff" || m.sender_role === "support";

            // Determine if date divider is needed
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDateDivider =
              !prevMsg ||
              new Date(prevMsg.created_at).toDateString() !== new Date(m.created_at).toDateString();

            return (
              <React.Fragment key={m.id || idx}>
                {/* Date Divider Pill */}
                {showDateDivider && (
                  <div className="flex items-center justify-center my-3 select-none">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-600 border border-slate-300/40 shadow-2xs">
                      {getDateLabel(m.created_at)}
                    </span>
                  </div>
                )}

                {/* Message Row: In RTL, justify-end = LEFT (Outgoing/Me), justify-start = RIGHT (Incoming/Other) */}
                <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Sender Identity & Header */}
                    <div className="flex items-center gap-1.5 mb-1 px-1.5 text-[11px]">
                      {isMe ? (
                        <span className="font-bold text-slate-500 text-[10px]">
                          {isAdminViewer ? "فريق الدعم الفني (أنت)" : "أنت"}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {isStaffMsg ? (
                            <span className="inline-flex items-center gap-1 font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px]">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>فريق الدعم الفني ({m.sender_name || "مشرف المنصة"})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px]">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{m.sender_name || (m.sender_role === "vendor" ? "المورد" : "العميل")}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words transition-all ${
                        isMe
                          ? "bg-gradient-to-l from-emerald-600 via-[#1B4D3E] to-teal-800 text-white rounded-bl-xs shadow-md shadow-emerald-950/10 border border-emerald-500/20"
                          : "bg-white border border-slate-200/90 text-slate-900 rounded-br-xs shadow-xs"
                      }`}
                    >
                      <div className="leading-relaxed font-medium">{m.message_text}</div>

                      {/* Time & Delivery Status Checkmarks */}
                      <div
                        className={`flex items-center gap-1.5 mt-2 pt-1 text-[10px] font-mono select-none ${
                          isMe
                            ? "justify-end text-emerald-200/90 border-t border-white/10"
                            : "justify-end text-slate-400 border-t border-slate-100"
                        }`}
                      >
                        <span>{fmtTime(m.created_at)}</span>

                        {isMe && (
                          <span
                            title={
                              m.status === "sending"
                                ? "جاري الإرسال..."
                                : m.status === "error"
                                ? "تعذر الإرسال"
                                : "تم التسليم"
                            }
                          >
                            {m.status === "sending" ? (
                              <Clock className="w-3 h-3 animate-spin text-emerald-200" />
                            ) : m.status === "error" ? (
                              <AlertCircle className="w-3 h-3 text-rose-300" />
                            ) : (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollDownBtn && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all z-20 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>أحدث الرسائل ↓</span>
        </button>
      )}

      {/* ── FOOTER: QUICK REPLIES & INPUT ── */}
      {isClosed ? (
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-center gap-2.5 text-center text-slate-700 shrink-0">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-bold">
            تم إغلاق هذه التذكرة نهائياً من قبل الإدارة، والمحادثة مغلقة ولا يمكن إرسال ردود جديدة.
          </span>
        </div>
      ) : (
        <div className="p-3 bg-white border-t border-slate-100 space-y-2 shrink-0">
          {/* Quick Canned Responses Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] text-slate-400 font-bold shrink-0 flex items-center gap-1 ml-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>رد سريع:</span>
            </span>
            {cannedReplies.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(undefined, chip)}
                disabled={sending}
                className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/80 whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {chip.slice(0, 38)}...
              </button>
            ))}
          </div>

          {/* Typing Form */}
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className="relative flex-1">
              <Textarea
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder={
                  isAdminViewer
                    ? "اكتب رد فريق الدعم الفني هنا... (اضغط Enter للإرسال، و Shift+Enter لسطر جديد)"
                    : "اكتب رسالتك لفريق الدعم هنا... (اضغط Enter للإرسال)"
                }
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                className="min-h-[44px] max-h-[110px] text-xs resize-none rounded-2xl bg-slate-50/80 border-slate-200 py-3 px-3.5 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>

            <Button
              type="submit"
              disabled={!newMsg.trim() || sending}
              size="sm"
              className="rounded-2xl bg-gradient-to-r from-emerald-600 via-[#1B4D3E] to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-5 h-11 shrink-0 font-black text-xs gap-1.5 shadow-md shadow-emerald-950/20 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 rotate-180" />
              )}
              <span>إرسال</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ClientTicketConversation;
