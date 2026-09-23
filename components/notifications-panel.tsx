"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Tag,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  Wallet,
  FileText,
  Clock,
  ExternalLink,
  ChevronLeft,
  Sparkles,
  Inbox,
  ShoppingBag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const supabase = createClient();

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  rfq_id?: string | null;
  quote_id?: string | null;
  order_id?: string | null;
  is_read: boolean;
  created_at: string;
  sent_at?: string | null;
  action_url?: string | null;
}

// Visual Config for Each Notification Category
const TYPE_CONFIG: Record<
  string,
  {
    icon: any;
    color: string;
    bg: string;
    border: string;
    badgeLabel: string;
    badgeColor: string;
  }
> = {
  new_quote: {
    icon: Tag,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200/80",
    border: "border-r-emerald-500",
    badgeLabel: "عرض سعر جديد",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  quote_accepted: {
    icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200/80",
    border: "border-r-emerald-600",
    badgeLabel: "تم قبول العرض",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  new_rfq: {
    icon: FileText,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200/80",
    border: "border-r-amber-500",
    badgeLabel: "طلب تسعير جديد",
    badgeColor: "bg-amber-100 text-amber-800",
  },
  deal_status_updated: {
    icon: Truck,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200/80",
    border: "border-r-blue-500",
    badgeLabel: "حالة الشحن والتوصيل",
    badgeColor: "bg-blue-100 text-blue-800",
  },
  order_completed: {
    icon: CheckCircle2,
    color: "text-teal-600",
    bg: "bg-teal-50 border-teal-200/80",
    border: "border-r-teal-500",
    badgeLabel: "اكتمل الطلب",
    badgeColor: "bg-teal-100 text-teal-800",
  },
  announcement: {
    icon: Megaphone,
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200/80",
    border: "border-r-indigo-500",
    badgeLabel: "تنويه إداري",
    badgeColor: "bg-indigo-100 text-indigo-800",
  },
  wallet_credit: {
    icon: Wallet,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200/80",
    border: "border-r-purple-500",
    badgeLabel: "رصيد ومحفظة",
    badgeColor: "bg-purple-100 text-purple-800",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200/80",
    border: "border-r-rose-500",
    badgeLabel: "تنبيه هام",
    badgeColor: "bg-rose-100 text-rose-800",
  },
};

function formatArabicRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "مؤخراً";
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "الآن";
    if (diffMin === 1) return "منذ دقيقة";
    if (diffMin === 2) return "منذ دقيقتين";
    if (diffMin < 11) return `منذ ${diffMin} دقائق`;
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHour === 1) return "منذ ساعة";
    if (diffHour === 2) return "منذ ساعتين";
    if (diffHour < 11) return `منذ ${diffHour} ساعات`;
    if (diffHour < 24) return `منذ ${diffHour} ساعة`;
    if (diffDay === 1) return "أمس";
    if (diffDay === 2) return "منذ يومين";
    if (diffDay < 7) return `منذ ${diffDay} أيام`;

    return d.toLocaleDateString("ar-SA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "مؤخراً";
  }
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "orders" | "system">("all");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();

    // Listen for storage or custom events
    const handleRefresh = () => loadNotifications();
    window.addEventListener("rfq_data_changed", handleRefresh);
    window.addEventListener("storage", handleRefresh);

    // Set up real-time subscription
    const channel = supabase
      .channel("notifications_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          const item = payload.new as NotificationItem;
          setNotifications((prev) => [item, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("rfq_data_changed", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadNotifications() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || "client-demo-id";

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(25);

      if (data && Array.isArray(data)) {
        // Ensure every notification item has a valid title/message
        const sanitized = data.map((n: any, idx: number) => ({
          ...n,
          id: n.id || `NOTIF-${idx + 1}`,
          title: n.title || (n.order_id ? `تحديث الطلب #${n.order_id}` : "إشعار جديد من المنصة"),
          message: n.message || "لديك تحديث جديد متعلق بحسابك في منصة رِفق.",
          type: n.type || "announcement",
          created_at: n.created_at || new Date().toISOString(),
          is_read: Boolean(n.is_read),
        }));

        setNotifications(sanitized);
        setUnreadCount(sanitized.filter((n: any) => !n.is_read).length);
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  }

  async function markAsRead(id: string, e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || "client-demo-id";

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUserId)
        .eq("is_read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Error marking all as read:", e);
    }
  }

  function getNotificationLink(notification: NotificationItem): string {
    if (notification.action_url) return notification.action_url;
    if (notification.order_id) return `/deal/${notification.order_id}`;
    if (notification.quote_id && notification.rfq_id) return `/client/rfq/${notification.rfq_id}`;
    if (notification.rfq_id) return `/vendor/quote/${notification.rfq_id}`;
    return "#";
  }

  // Filtered Notifications based on active tab
  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case "unread":
        return notifications.filter((n) => !n.is_read);
      case "orders":
        return notifications.filter(
          (n) =>
            n.order_id ||
            n.rfq_id ||
            ["new_quote", "quote_accepted", "new_rfq", "deal_status_updated", "order_completed"].includes(n.type)
        );
      case "system":
        return notifications.filter(
          (n) => ["announcement", "warning", "wallet_credit"].includes(n.type) || (!n.order_id && !n.rfq_id)
        );
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 transition-all border border-slate-200/70 bg-white shadow-2xs cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          title="الإشعارات والتنبيهات"
          aria-label="الإشعارات"
        >
          <Bell className="w-4.5 h-4.5 transition-transform group-hover:rotate-12" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[10px] ring-2 ring-white shadow-sm animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[390px] sm:w-[440px] max-w-[95vw] p-0 rounded-3xl border border-slate-200/90 shadow-2xl bg-white overflow-hidden text-slate-900 z-50 animate-in fade-in-50 zoom-in-95"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">مركز الإشعارات</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/90 text-white border border-rose-400/40">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                متابعة تحديثات طلباتك وعروض الأسعار الفورية
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 transition-all cursor-pointer border border-white/10"
              title="تحديد الكل كمقروء"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>قراءة الكل</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center text-[11px] font-bold flex items-center justify-center gap-1.5 ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200 font-black"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>الكل</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
              {notifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("unread")}
            className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center text-[11px] font-bold flex items-center justify-center gap-1.5 ${
              activeTab === "unread"
                ? "bg-white text-rose-700 shadow-2xs border border-slate-200 font-black"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>غير المقروءة</span>
            {unreadCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-black">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center text-[11px] font-bold flex items-center justify-center gap-1.5 ${
              activeTab === "orders"
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200 font-black"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <ShoppingBag className="w-3 h-3" />
            <span>الطلبات</span>
          </button>

          <button
            onClick={() => setActiveTab("system")}
            className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center text-[11px] font-bold flex items-center justify-center gap-1.5 ${
              activeTab === "system"
                ? "bg-white text-purple-700 shadow-2xs border border-slate-200 font-black"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>النظام</span>
          </button>
        </div>

        {/* Notifications List Body */}
        <div className="max-h-[390px] overflow-y-auto divide-y divide-slate-100 p-2 space-y-1 bg-white">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-6 text-center text-slate-400 space-y-2.5">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                <Inbox className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">لا توجد إشعارات في هذا القسم</p>
              <p className="text-[11px] text-slate-400 leading-normal max-w-[240px] mx-auto">
                ستصلك التحديثات وتفاصيل عروض الأسعار والشحنات فور توفرها.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const cfg = TYPE_CONFIG[notification.type] || {
                icon: Bell,
                color: "text-slate-600",
                bg: "bg-slate-100 border-slate-200",
                border: "border-r-slate-400",
                badgeLabel: "إشعار",
                badgeColor: "bg-slate-100 text-slate-700",
              };
              const IconComponent = cfg.icon;
              const link = getNotificationLink(notification);
              const relativeTime = formatArabicRelativeTime(notification.created_at);

              return (
                <div
                  key={notification.id}
                  className={`group relative rounded-2xl p-3 transition-all flex items-start gap-3 border ${
                    !notification.is_read
                      ? "bg-blue-50/40 border-blue-100/80 shadow-2xs hover:bg-blue-50/70"
                      : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200/70"
                  }`}
                >
                  {/* Unread Glow Indicator */}
                  {!notification.is_read && (
                    <span className="absolute top-3.5 right-2 w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-sm" />
                  )}

                  {/* Icon Circle */}
                  <div
                    className={`w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${cfg.bg}`}
                  >
                    <IconComponent className={`w-4.5 h-4.5 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-1">
                    {/* Header Row: Badge & Time */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${cfg.badgeColor}`}>
                        {cfg.badgeLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {relativeTime}
                      </span>
                    </div>

                    {/* Title */}
                    <h4
                      className={`text-xs leading-snug font-bold transition-colors ${
                        !notification.is_read ? "text-slate-900 font-black" : "text-slate-800"
                      }`}
                    >
                      {notification.title}
                    </h4>

                    {/* Message Body */}
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mt-1 font-normal">
                      {notification.message}
                    </p>

                    {/* Action Bar */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
                      {link !== "#" ? (
                        <Link
                          href={link}
                          onClick={() => {
                            if (!notification.is_read) markAsRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <span>عرض التفاصيل</span>
                          <ChevronLeft className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[10px] text-slate-400">إشعار عام</span>
                      )}

                      {!notification.is_read ? (
                        <button
                          onClick={(e) => markAsRead(notification.id, e)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-700 px-2 py-0.5 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer flex items-center gap-1"
                          title="تحديد كمقروء"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>تمييز كمقروء</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 text-slate-400" />
                          تمت القراءة
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs">
          <span className="text-[11px] font-semibold text-slate-500">
            إجمالي {notifications.length} إشعار مسجل
          </span>

          <Link
            href="/admin/notifications"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-700 hover:text-blue-600 transition-colors"
          >
            <span>مركز الإشعارات الكامل</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
