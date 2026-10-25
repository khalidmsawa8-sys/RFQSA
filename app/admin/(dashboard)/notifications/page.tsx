"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Bell,
  Send,
  Users,
  Building2,
  Store,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  Tag,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles,
  Loader2,
  Smartphone,
  CheckCheck,
  Radio,
  Download,
  Flame,
  MessageSquare,
  HelpCircle,
  Truck,
  ArrowUpRight,
  Repeat,
  X,
  FileSpreadsheet,
  Check,
  ChevronDown,
  Calendar,
  Mail,
  MessageCircle,
  Play,
  Pause,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, DateRangeValue } from "@/components/date-range-filter";

interface NotificationItem {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  target: string;
  targetName?: string;
  targetPhone?: string;
  priority?: "normal" | "important" | "urgent";
  created_at: string;
  sent_at?: string;
  is_read?: boolean;
  action_url?: string;
  order_id?: string;
  rfq_id?: string;
  delivery_id?: string;
  source?: string;
}

interface ScheduledCampaignRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  target: "all" | "clients" | "vendors" | "couriers" | "user";
  target_user_id?: string;
  priority: "normal" | "important" | "urgent";
  action_url?: string;
  channels: {
    in_app: boolean;
    push: boolean;
    email: boolean;
    whatsapp: boolean;
  };
  scheduled_for: string;
  batch_size: number;
  interval_seconds: number;
  status: "pending" | "processing" | "completed" | "cancelled" | "failed";
  total_recipients: number;
  processed_count: number;
  batches_total: number;
  batches_completed: number;
  current_recipient_index: number;
  last_batch_at?: string | null;
  created_at: string;
  errors?: string[];
}

interface UserProfile {
  id: string;
  full_name: string;
  company_name?: string;
  role: string;
  phone?: string;
  city?: string;
}

interface NotificationStats {
  total: number;
  clients: number;
  vendors: number;
  couriers: number;
  readCount: number;
  readRate: number;
  activeDevicesCount: number;
  totalUsers: number;
  totalClientsRegistered: number;
  totalVendorsRegistered: number;
  totalCouriersRegistered: number;
  lastBroadcastAt: string;
}

const NOTIFICATION_TYPES = [
  { id: "announcement", label: "إعلان إداري عام", icon: Info, color: "bg-blue-50 text-blue-700 border-blue-200", badgeColor: "bg-blue-100 text-blue-800" },
  { id: "warning", label: "تنبيه أمني / صيانة", icon: AlertTriangle, color: "bg-amber-50 text-amber-700 border-amber-200", badgeColor: "bg-amber-100 text-amber-800" },
  { id: "promotion", label: "عرض ترويجي / حافز", icon: Tag, color: "bg-purple-50 text-purple-700 border-purple-200", badgeColor: "bg-purple-100 text-purple-800" },
  { id: "update", label: "تحديث سياسات وضمان", icon: Sparkles, color: "bg-emerald-50 text-emerald-700 border-emerald-200", badgeColor: "bg-emerald-100 text-emerald-800" },
  { id: "order_notice", label: "إشعار طلبات وعمليات", icon: Store, color: "bg-sky-50 text-sky-700 border-sky-200", badgeColor: "bg-sky-100 text-sky-800" },
];

const PRESET_TEMPLATES = [
  {
    title: "صيانة مجدولة للخوادم وقواعد البيانات 🛠️",
    message: "نحيطكم علماً بأنه سيتم إجراء ترقية للبنية التحتية والخوادم يوم السبت القادم من 2:00 إلى 3:00 صباحاً لتحسين سرعة البث.",
    type: "warning",
    target: "all" as const,
    priority: "important" as const,
  },
  {
    title: "تحديث شروط الضمان المعتمد لقطع الغيار 📜",
    message: "تم تحديث سياسة المنصة لتصبح شروط الضمان لقطع الغيار الكهربائية والميكانيكية ملزمة بحد أدنى 6 أشهر لضمان ثقة العملاء.",
    type: "update",
    target: "vendors" as const,
    priority: "important" as const,
  },
  {
    title: "عرض حصري: كاش باك 5% على شحن المحافظ 💰",
    message: "اشحن محفظة شركتك الآن برصيد 10,000 ريال أو أكثر واحصل فوراً على 5% رصيد إضافي مجاني للاستخدام في كافة طلبات الشراء.",
    type: "promotion",
    target: "clients" as const,
    priority: "normal" as const,
  },
  {
    title: "تنبيه: ميزة إعادة تنشيط الطلبات المنتهية 🚀",
    message: "يمكنكم الآن تجديد واستقبال عروض أسعار جديدة لطلباتكم المنتهية بضغطة زر واحدة عبر زر 'إعادة تنشيط' في صفحة الطلبات.",
    type: "announcement",
    target: "clients" as const,
    priority: "normal" as const,
  },
  {
    title: "تنبيه هام: توثيق السجلات التجارية والحسابات ⚠️",
    message: "يرجى من جميع الموردين والمؤسسات التأكد من سريان السجل التجاري والشهادة الضريبية لضمان استمرار استقبال إشعارات الرادار.",
    type: "warning",
    target: "vendors" as const,
    priority: "urgent" as const,
  },
];

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    clients: 0,
    vendors: 0,
    couriers: 0,
    readCount: 0,
    readRate: 0,
    activeDevicesCount: 0,
    totalUsers: 0,
    totalClientsRegistered: 0,
    totalVendorsRegistered: 0,
    totalCouriersRegistered: 0,
    lastBroadcastAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterTarget, setFilterTarget] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  // View Navigation: "stream" (Live Stream) vs "scheduled" (Throttled Scheduled Campaigns)
  const [activeViewTab, setActiveViewTab] = useState<"stream" | "scheduled">("stream");

  // Scheduled Campaigns State
  const [scheduledCampaigns, setScheduledCampaigns] = useState<ScheduledCampaignRecord[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [processingCampaignId, setProcessingCampaignId] = useState<string | null>(null);

  // Broadcast Mode & Scheduling Configuration
  const [broadcastMode, setBroadcastMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDatetime, setScheduledDatetime] = useState<string>(() => {
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    nextHour.setMinutes(Math.ceil(nextHour.getMinutes() / 15) * 15, 0, 0);
    return nextHour.toISOString().slice(0, 16);
  });
  const [batchSize, setBatchSize] = useState<number>(50);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(30);

  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const [target, setTarget] = useState<"all" | "clients" | "vendors" | "couriers" | "user">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("normal");
  const [actionUrl, setActionUrl] = useState("");
  
  // Multi-Channel Delivery Options
  const [sendInApp, setSendInApp] = useState(true);
  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);

  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Inspect Modal State
  const [inspectItem, setInspectItem] = useState<NotificationItem | null>(null);

  // Load Notifications & Users
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUsers(data.users || []);
          if (data.stats) {
            setStats(data.stats);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load admin notifications data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Scheduled Campaigns
  const loadScheduledCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch("/api/v1/admin/notifications/scheduled");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setScheduledCampaigns(data.campaigns || []);
        }
      }
    } catch (e) {
      console.error("Failed to load scheduled campaigns:", e);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadScheduledCampaigns();
  }, [loadData, loadScheduledCampaigns]);

  // Delete Notification Handler
  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا الإشعار من السجل المركزي؟")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/admin/notifications?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setStats((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));
        setSuccessMessage("تم حذف الإشعار بنجاح من السجل المركزي");
        setTimeout(() => setSuccessMessage(""), 3500);
      } else {
        alert(data.error || "حدث خطأ أثناء محاولة حذف الإشعار");
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
      alert("تعذر الاتصال بالسيرفر لحذف الإشعار");
    } finally {
      setDeletingId(null);
    }
  };

  // Process Due Batches Now
  const handleProcessDueBatchesNow = async () => {
    setProcessingCampaignId("all");
    try {
      const res = await fetch("/api/v1/admin/notifications/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_now" }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`⚡ ${data.message}`);
        await loadScheduledCampaigns();
        await loadData();
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        alert(data.error || "فشل معالجة الدفعات");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الاتصال بالسيرفر");
    } finally {
      setProcessingCampaignId(null);
    }
  };

  // Cancel Scheduled Campaign
  const handleCancelCampaign = async (campaignId: string) => {
    if (!window.confirm("هل ترغب في إيقاف وإلغاء هذه الحملة المجدولة؟")) return;
    try {
      const res = await fetch("/api/v1/admin/notifications/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", campaign_id: campaignId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage("تم إلغاء الحملة المجدولة بنجاح");
        await loadScheduledCampaigns();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        alert(data.error || "فشل إلغاء الحملة");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء محاولة إلغاء الحملة");
    }
  };

  // Delete Scheduled Campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الحملة نهائياً من قائمة الجدولة؟")) return;
    try {
      const res = await fetch(`/api/v1/admin/notifications/scheduled?id=${campaignId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setScheduledCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
        setSuccessMessage("تم حذف سجل الحملة بنجاح");
        setTimeout(() => setSuccessMessage(""), 3500);
      } else {
        alert(data.error || "فشل حذف الحملة");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء محاولة حذف الحملة");
    }
  };

  // Handle Send Notification (Immediate or Scheduled with Throttling)
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert("يرجى إدخال عنوان الإشعار ونص الرسالة");
      return;
    }

    if (target === "user" && !targetUserId) {
      alert("يرجى اختيار المستخدم المستهدف من القائمة");
      return;
    }

    if (!sendInApp && !sendPush && !sendEmail && !sendWhatsapp) {
      alert("يرجى اختيار قناة تسليم واحدة على الأقل (جرس المنصة، دفع للجوال، بريد إلكتروني، أو واتساب).");
      return;
    }

    setSubmitting(true);
    try {
      if (broadcastMode === "scheduled") {
        // Scheduled Campaign with Throttling Batches
        const res = await fetch("/api/v1/admin/notifications/scheduled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
            type,
            target,
            target_user_id: target === "user" ? targetUserId : undefined,
            priority,
            action_url: actionUrl.trim() || undefined,
            channels: {
              in_app: sendInApp,
              push: sendPush,
              email: sendEmail,
              whatsapp: sendWhatsapp,
            },
            scheduled_for: new Date(scheduledDatetime).toISOString(),
            batch_size: Number(batchSize) || 50,
            interval_seconds: Number(intervalSeconds) || 30,
          }),
        });

        const json = await res.json();
        if (json.success) {
          setSuccessMessage(`⏰ ${json.message}`);
          setTimeout(() => setSuccessMessage(""), 5000);
          await loadScheduledCampaigns();
          setActiveViewTab("scheduled");

          // Reset Form
          setTitle("");
          setMessage("");
          setActionUrl("");
          setTarget("all");
          setTargetUserId("");
          setUserSearchTerm("");
        } else {
          alert(json.error || "فشل جدولة الإشعار");
        }
      } else {
        // Immediate Multi-Channel Broadcast
        const res = await fetch("/api/v1/admin/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
            type,
            target,
            target_user_id: target === "user" ? targetUserId : undefined,
            priority,
            action_url: actionUrl.trim() || undefined,
            send_push: sendPush,
            send_in_app: sendInApp,
          }),
        });

        const json = await res.json();
        if (json.success) {
          setSuccessMessage(`✅ ${json.message}`);
          setTimeout(() => setSuccessMessage(""), 5000);

          // Reload data
          await loadData();

          // Reset Form
          setTitle("");
          setMessage("");
          setActionUrl("");
          setTarget("all");
          setTargetUserId("");
          setUserSearchTerm("");
        } else {
          alert(json.error || "فشل إرسال الإشعار");
        }
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Apply Preset
  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setTitle(preset.title);
    setMessage(preset.message);
    setType(preset.type);
    setTarget(preset.target);
    setPriority(preset.priority);
  };

  // Quick Re-broadcast (Clone)
  const handleRebroadcast = (item: NotificationItem) => {
    setTitle(item.title);
    setMessage(item.message);
    setType(item.type || "announcement");
    if (item.target === "client" || item.target === "clients") setTarget("clients");
    else if (item.target === "vendor" || item.target === "vendors") setTarget("vendors");
    else if (item.target === "courier" || item.target === "couriers") setTarget("couriers");
    else setTarget("all");
    setPriority(item.priority || "normal");
    setActionUrl(item.action_url || "");
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredNotifications.length === 0) {
      alert("لا توجد إشعارات للتصدير حالياً");
      return;
    }

    const headers = ["معرف الإشعار", "العنوان", "الرسالة", "النوع", "الجمهور المستهدف", "المستلم", "الأولوية", "حالة القراءة", "التاريخ والوقت"];
    const rows = filteredNotifications.map((n) => [
      n.id,
      `"${(n.title || "").replace(/"/g, '""')}"`,
      `"${(n.message || "").replace(/"/g, '""')}"`,
      n.type,
      n.target,
      `"${(n.targetName || "").replace(/"/g, '""')}"`,
      n.priority || "normal",
      n.is_read ? "مقروء" : "جديد",
      new Date(n.created_at).toLocaleString("ar-SA"),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `سجل_الإشعارات_الإدارية_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Users for Dropdown
  const filteredUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return users.slice(0, 50);
    const term = userSearchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(term) ||
        u.company_name?.toLowerCase().includes(term) ||
        u.phone?.includes(term) ||
        u.city?.toLowerCase().includes(term)
    );
  }, [users, userSearchTerm]);

  // Estimated Reach calculation
  const estimatedReach = useMemo(() => {
    if (target === "all") return stats.totalUsers || users.length || 1;
    if (target === "clients") return stats.totalClientsRegistered || users.filter((u) => u.role === "client").length || 1;
    if (target === "vendors") return stats.totalVendorsRegistered || users.filter((u) => u.role === "vendor").length || 1;
    if (target === "couriers") return stats.totalCouriersRegistered || users.filter((u) => u.role === "courier").length || 1;
    if (target === "user") return targetUserId ? 1 : 0;
    return 0;
  }, [target, targetUserId, stats, users]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Type Filter
      if (filterType !== "all" && n.type !== filterType) return false;

      // Target Filter
      if (filterTarget !== "all") {
        if (filterTarget === "clients" && n.target !== "client" && n.target !== "clients" && !n.user_id?.startsWith("client")) return false;
        if (filterTarget === "vendors" && n.target !== "vendor" && n.target !== "vendors" && !n.user_id?.startsWith("vendor")) return false;
        if (filterTarget === "couriers" && n.target !== "courier" && n.target !== "couriers" && !n.user_id?.startsWith("courier")) return false;
      }

      // Date Range Filter
      if (dateRange?.startDate && dateRange?.endDate) {
        const itemDate = new Date(n.created_at).toISOString().slice(0, 10);
        if (itemDate < dateRange.startDate || itemDate > dateRange.endDate) {
          return false;
        }
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q) ||
          n.targetName?.toLowerCase().includes(q) ||
          n.targetPhone?.includes(q) ||
          n.id?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notifications, filterType, filterTarget, dateRange, search]);

  // Reset visible count on filter/search change
  useEffect(() => {
    setVisibleCount(10);
  }, [filterType, filterTarget, dateRange, search]);

  // Sliced notifications for incremental (Load More) pagination
  const displayedNotifications = useMemo(() => {
    return filteredNotifications.slice(0, visibleCount);
  }, [filteredNotifications, visibleCount]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full dir-rtl" dir="rtl">
      {/* ── 1. LUXURY HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-slate-700/60">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border-2 border-white/20 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Bell className="w-7 h-7 text-white animate-bounce" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  مركز الإشعارات والبث الإداري الذكي
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>بث فوري حي • FCM & WebSockets</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">
                إرسال وإدارة التنبيهات المؤسسية اللحظية لكافة العملاء والشركات وموردي قطع الغيار ومناديب الأسطول ومتابعة التفاعل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-bold gap-1.5 h-10 px-4 cursor-pointer backdrop-blur-xs"
            >
              <Download className="w-4 h-4" />
              <span>تصدير السجل (Excel/CSV)</span>
            </Button>
            <Button
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 h-10 px-4 cursor-pointer shadow-md shadow-blue-600/30"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث البيانات الحية</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── SUCCESS ALERT ── */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 2. REAL-TIME STATS KPIS (NO STATIC NUMBERS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">إجمالي الإشعارات</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total || notifications.length}</p>
          <span className="text-[9.5px] text-blue-600 font-bold block">سجل مركزي حي</span>
        </div>

        {/* Card 2: Clients */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">إشعارات العملاء</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-900">{stats.clients}</p>
          <span className="text-[9.5px] text-slate-400 font-medium block">طلبات وصفقات</span>
        </div>

        {/* Card 3: Vendors */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">إشعارات الموردين</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-900">{stats.vendors}</p>
          <span className="text-[9.5px] text-slate-400 font-medium block">تسعيرات ورادار</span>
        </div>

        {/* Card 4: Couriers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">أسطول التوصيل</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-900">{stats.couriers}</p>
          <span className="text-[9.5px] text-slate-400 font-medium block">مهام وشحنات</span>
        </div>

        {/* Card 5: Push Devices */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">أجهزة متصلة (Push)</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-900">{stats.activeDevicesCount}</p>
          <span className="text-[9.5px] text-purple-600 font-bold block">هواتف نشطة</span>
        </div>

        {/* Card 6: Read Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">معدل التفاعل</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-teal-900">{stats.readRate}%</p>
          <span className="text-[9.5px] text-emerald-600 font-bold block">قراءة وتفاعل</span>
        </div>
      </div>

      {/* ── 3. MAIN WORKSPACE (TWO COLUMNS: COMPOSER & STREAM/SCHEDULED QUEUE) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── RIGHT COLUMN: SMART BROADCAST COMPOSER (5 COLS) ── */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6 lg:sticky lg:top-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {broadcastMode === "scheduled" ? "إنشاء حملة مجدولة ومقسمة" : "إنشاء وبث إشعار فوري"}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {broadcastMode === "scheduled"
                    ? "جدولة البث مع تقسيم المستلمين لدفعات لمنع الضغط"
                    : "إرسال تنبيه فوري لكافة المنصات وتطبيقات الجوال"}
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
              الوصول: {estimatedReach} مستخدم
            </span>
          </div>

          {/* Mode Switch (Immediate vs Scheduled with Throttling) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setBroadcastMode("immediate")}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                broadcastMode === "immediate"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>بث فوري ⚡</span>
            </button>
            <button
              type="button"
              onClick={() => setBroadcastMode("scheduled")}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                broadcastMode === "scheduled"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>جدولة وتقسيم لدفعات ⏰</span>
            </button>
          </div>

          {/* Quick Preset Templates */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>قوالب جاهزة سريعة:</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(tpl)}
                  className="px-2.5 py-1 rounded-xl text-[10.5px] font-bold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  {tpl.title.split(" ")[0]} {tpl.title.split(" ")[1]}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4 text-xs">
            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">الجمهور المستهدف:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTarget("all")}
                  className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    target === "all"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 mx-auto mb-1" />
                  <span className="text-[11px]">الكل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget("clients")}
                  className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    target === "clients"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 mx-auto mb-1" />
                  <span className="text-[11px]">العملاء فقط</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget("vendors")}
                  className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    target === "vendors"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Store className="w-3.5 h-3.5 mx-auto mb-1" />
                  <span className="text-[11px]">الموردين فقط</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget("couriers")}
                  className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    target === "couriers"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 mx-auto mb-1" />
                  <span className="text-[11px]">المناديب</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget("user")}
                  className={`col-span-2 sm:col-span-2 p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    target === "user"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 mx-auto mb-1" />
                  <span className="text-[11px]">مستخدم محدد (فردي)</span>
                </button>
              </div>
            </div>

            {/* Individual User Search & Selection */}
            {target === "user" && (
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="font-bold text-slate-700 block text-[11px]">ابحث عن العميل أو المورد:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو الشركة أو رقم الجوال..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="">-- اختر المستخدم المستهدف ({filteredUsers.length}) --</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.company_name} ({u.role === "client" ? "عميل" : u.role === "vendor" ? "مورد" : "مندوب"}) {u.phone ? `• ${u.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Type & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">تصنيف الإشعار:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {NOTIFICATION_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">مستوى الأولوية:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="normal">عادي (Normal)</option>
                  <option value="important">هام (Important)</option>
                  <option value="urgent">عاجل وفوري ⚡ (Urgent)</option>
                </select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 block">عنوان الإشعار:</label>
                <span className="text-[10px] text-slate-400 font-mono">{title.length}/80</span>
              </div>
              <Input
                type="text"
                placeholder="مثال: تنبيه هام بخصوص تحديث أسعار قطع الغيار..."
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                className="h-10 rounded-xl border-slate-200 font-medium text-slate-900 bg-white"
                required
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 block">نص وتفاصيل الرسالة:</label>
                <span className="text-[10px] text-slate-400 font-mono">{message.length}/500</span>
              </div>
              <textarea
                rows={3}
                placeholder="اكتب رسالتك وتوجيهاتك بالتفصيل هنا..."
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                className="w-full p-3 rounded-2xl border border-slate-200 font-medium text-slate-900 bg-white text-xs resize-none focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Action Deep Link */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">رابط التوجيه المباشر (Deep Link - اختياري):</label>
              <Input
                type="text"
                placeholder="مثال: /client/orders أو /vendor/radar أو /wallet"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                className="h-9 rounded-xl border-slate-200 font-mono text-[11px] text-slate-700 bg-white"
                dir="ltr"
              />
            </div>

            {/* Broadcast Channels Toggles */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 block">قنوات البث والتسليم المتعددة:</span>
                <span className="text-[10px] text-slate-400 font-semibold">اختيار متعدد</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-blue-50/50">
                  <input
                    type="checkbox"
                    checked={sendInApp}
                    onChange={(e) => setSendInApp(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[11px]">جرس المنصة (In-App)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-purple-50/50">
                  <input
                    type="checkbox"
                    checked={sendPush}
                    onChange={(e) => setSendPush(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-[11px]">دفع للجوال (FCM Push)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-sky-50/50">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <Mail className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-[11px]">البريد (SMTP)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50">
                  <input
                    type="checkbox"
                    checked={sendWhatsapp}
                    onChange={(e) => setSendWhatsapp(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px]">واتساب (WhatsApp API)</span>
                </label>
              </div>
            </div>

            {/* Scheduled Configuration Card (When Scheduled Mode Active) */}
            {broadcastMode === "scheduled" && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>إعدادات الجدولة والتقسيم لدفعات (Throttling System):</span>
                </div>

                {/* Scheduled Datetime */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px] block">موعد وتوقيت البث المجدول:</label>
                  <input
                    type="datetime-local"
                    value={scheduledDatetime}
                    onChange={(e) => setScheduledDatetime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Batch Size & Interval */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px] block">حجم الدفعة (أعضاء):</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value, 10) || 50)}
                      className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                      placeholder="50"
                      required
                    />
                    <span className="text-[9.5px] text-slate-500 block">مثال: 50 عضو بكل دفعة</span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px] block">الفاصل بين الدفعات (ثواني):</label>
                    <input
                      type="number"
                      min="5"
                      max="3600"
                      value={intervalSeconds}
                      onChange={(e) => setIntervalSeconds(parseInt(e.target.value, 10) || 30)}
                      className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                      placeholder="30"
                      required
                    />
                    <span className="text-[9.5px] text-slate-500 block">مثال: 30 ثانية لتفادي الضغط</span>
                  </div>
                </div>

                {/* Safety Load Guarantee Note */}
                <div className="p-2.5 rounded-xl bg-white/80 border border-indigo-100 text-[10.5px] text-indigo-900 leading-relaxed font-semibold">
                  🛡️ <strong>حماية السيرفر:</strong> يقوم النظام بتقسيم المستلمين تلقائياً إلى دفعات مجدولة وإرسالها بالفاصل الزمني المختار لضمان عدم حدوث أي Load أو حظر من بوابات الإرسال.
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className={`w-full h-12 rounded-2xl font-black text-sm text-white shadow-md cursor-pointer gap-2 transition-all ${
                broadcastMode === "scheduled"
                  ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 shadow-indigo-500/25"
                  : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/20"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {broadcastMode === "scheduled"
                      ? "جاري جدولة الحملة وتقسيم المستلمين..."
                      : "جاري معالجة وبث الإشعار..."}
                  </span>
                </>
              ) : broadcastMode === "scheduled" ? (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>جدولة الإشعار ({batchSize} عضو/دفعة كل {intervalSeconds} ثانية)</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال وبث الإشعار فوراً ({estimatedReach} مستلم)</span>
                </>
              )}
            </Button>
          </form>
        </div>

        {/* ── LEFT COLUMN: STREAM & SCHEDULED QUEUE TABS (7 COLS) ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main View Mode Selector Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80">
            <button
              onClick={() => setActiveViewTab("stream")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeViewTab === "stream"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>سجل الإشعارات المركزية الحية</span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-blue-200">
                {notifications.length}
              </span>
            </button>

            <button
              onClick={() => setActiveViewTab("scheduled")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeViewTab === "scheduled"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>طابور الحملات المجدولة ومراقبة التقسيم</span>
              {scheduledCampaigns.filter((c) => c.status === "pending" || c.status === "processing").length > 0 && (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-black border border-amber-300 animate-pulse">
                  {scheduledCampaigns.filter((c) => c.status === "pending" || c.status === "processing").length} نشطة
                </span>
              )}
            </button>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── TAB 1: SCHEDULED CAMPAIGNS & THROTTLING QUEUE VIEW ── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeViewTab === "scheduled" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Scheduled Queue Control Bar */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">
                      طابور البث المجدول ومراقبة الحِمل
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      إجمالي الحملات: {scheduledCampaigns.length} حملة مجدولة ومقسمة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadScheduledCampaigns}
                    disabled={loadingCampaigns}
                    className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold gap-1.5 h-9 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCampaigns ? "animate-spin text-blue-600" : ""}`} />
                    <span>تحديث الطابور</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleProcessDueBatchesNow}
                    disabled={processingCampaignId !== null}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black gap-1.5 h-9 cursor-pointer shadow-sm shadow-indigo-600/30"
                  >
                    {processingCampaignId ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري المعالجة...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>معالجة الدفعات المستحقة فوراً ⚡</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Scheduled Campaigns List */}
              {loadingCampaigns ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                  <p className="text-xs font-bold text-slate-800">جاري قراءة طابور الحملات المجدولة وإحصائيات الدفعات...</p>
                </div>
              ) : scheduledCampaigns.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3 text-slate-400">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-black text-slate-700">لا توجد حملات مجدولة حالياً</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    يمكنك جدولة إشعار جديد عبر اختيار خيار <strong>"جدولة وتقسيم لدفعات ⏰"</strong> من النموذج على اليمين وتحديد موعد البث وحجم الدفعة.
                  </p>
                </div>
              ) : (
                scheduledCampaigns.map((camp) => {
                  const percent = camp.total_recipients > 0 ? Math.round((camp.processed_count / camp.total_recipients) * 100) : 0;
                  const isPending = camp.status === "pending";
                  const isProcessing = camp.status === "processing";
                  const isCompleted = camp.status === "completed";
                  const isCancelled = camp.status === "cancelled";

                  return (
                    <div
                      key={camp.id}
                      className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900">{camp.title}</h4>
                            <Badge
                              className={`text-[10px] font-black ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isProcessing
                                  ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                                  : isPending
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {isCompleted
                                ? "مكتملة بنجاح ✓"
                                : isProcessing
                                ? "جاري البث والتقسيم 🔄"
                                : isPending
                                ? "في الانتظار ⏰"
                                : "ملغاة ⏸️"}
                            </Badge>

                            <span className="text-[10px] text-slate-400 font-mono">#{camp.id}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{camp.message}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {(isPending || isProcessing) && (
                            <button
                              type="button"
                              onClick={() => handleCancelCampaign(camp.id)}
                              title="إلغاء الحملة"
                              className="p-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-all cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCampaign(camp.id)}
                            title="حذف من السجل"
                            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Delivery Channels Badges */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                        <span className="text-slate-400 text-[10px]">قنوات التسليم:</span>
                        {camp.channels?.in_app && (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                            <Bell className="w-3 h-3" /> جرس
                          </span>
                        )}
                        {camp.channels?.push && (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                            <Smartphone className="w-3 h-3" /> جوال (Push)
                          </span>
                        )}
                        {camp.channels?.email && (
                          <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" /> بريد
                          </span>
                        )}
                        {camp.channels?.whatsapp && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> واتساب
                          </span>
                        )}
                      </div>

                      {/* Throttling Metrics & Progress */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 flex-wrap gap-2">
                          <span className="flex items-center gap-1.5 text-indigo-700 font-black">
                            <Clock className="w-3.5 h-3.5" />
                            <span>موعد البث: {new Date(camp.scheduled_for).toLocaleString("ar-SA")}</span>
                          </span>
                          <span className="text-slate-500">
                            التقسيم: {camp.batch_size} عضو/دفعة كل {camp.interval_seconds} ثانية
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                            <span>
                              تم تسليم: <strong>{camp.processed_count}</strong> من <strong>{camp.total_recipients}</strong> مستلم ({camp.batches_completed} من {camp.batches_total} دفعة)
                            </span>
                            <span className="font-mono font-black text-indigo-600">{percent}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted
                                  ? "bg-emerald-500"
                                  : isProcessing
                                  ? "bg-blue-600 animate-pulse"
                                  : "bg-indigo-600"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── TAB 2: LIVE NOTIFICATION STREAM & HISTORY ── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeViewTab === "stream" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Filter & Search Bar */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3.5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:flex-1">
                    <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="بحث في سجل الإشعارات (العنوان، المحتوى، اسم المستلم)..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Date Range Filter */}
                  <DateRangeFilter
                    value={dateRange}
                    onChange={(val) => setDateRange(val)}
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* Type & Audience Category Pills */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs">
                  {/* Audience Filter Pills */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10.5px] font-bold text-slate-400 ml-1">الجمهور:</span>
                    {[
                      { id: "all", label: "الكل" },
                      { id: "clients", label: "العملاء" },
                      { id: "vendors", label: "الموردين" },
                      { id: "couriers", label: "المناديب" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFilterTarget(item.id)}
                        className={`px-2.5 py-1 rounded-xl font-bold text-[10.5px] transition-all cursor-pointer ${
                          filterTarget === item.id
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Type Filter Pills */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10.5px] font-bold text-slate-400 ml-1">النوع:</span>
                    {[
                      { id: "all", label: "كافة الأنواع" },
                      { id: "announcement", label: "إعلانات" },
                      { id: "warning", label: "تنبيهات" },
                      { id: "promotion", label: "عروض" },
                      { id: "update", label: "تحديثات" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFilterType(item.id)}
                        className={`px-2.5 py-1 rounded-xl font-bold text-[10.5px] transition-all cursor-pointer ${
                          filterType === item.id
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results Count Bar */}
              <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span>سجل الإشعارات المرسلة</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-black">
                    {displayedNotifications.length} من {filteredNotifications.length}
                  </span>
                </div>
                {(search || filterType !== "all" || filterTarget !== "all" || dateRange) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilterType("all");
                      setFilterTarget("all");
                      setDateRange(null);
                    }}
                    className="text-red-600 hover:underline text-[11px] cursor-pointer"
                  >
                    إلغاء كافة الفلاتر
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-xs font-bold text-slate-800">جاري قراءة سجلات الإشعارات الحية وقنوات البث...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2 text-slate-400">
                <Bell className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">لا توجد إشعارات مطابقة لمعايير البحث والفلترة</p>
                <p className="text-xs text-slate-400">جرب توسيع نطاق البحث أو الضغط على "إلغاء الفلاتر"</p>
              </div>
            ) : (
              displayedNotifications.map((item) => {
                const typeObj = NOTIFICATION_TYPES.find((t) => t.id === item.type) || NOTIFICATION_TYPES[0];
                const TypeIcon = typeObj.icon;
                const isDeleting = deletingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeObj.color}`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                              {item.title}
                            </h3>
                            <span className={`px-2 py-0.2 rounded-md text-[9.5px] font-black border ${typeObj.color}`}>
                              {typeObj.label}
                            </span>
                            {item.priority === "urgent" && (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-red-100 text-red-800 border border-red-200 animate-pulse">
                                ⚡ عاجل وفوري
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-slate-600 font-medium mt-1 leading-relaxed line-clamp-2">
                            {item.message}
                          </p>
                        </div>
                      </div>

                      {/* Action Menu buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setInspectItem(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="معاينة وفحص تفاصيل الإشعار"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRebroadcast(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="إعادة بث وتعبئة المحرر"
                        >
                          <Repeat className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDeleteNotification(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="حذف من السجل"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-red-600" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Card Footer: Target info & Timestamps */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-[10px] font-medium text-slate-500 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700 font-bold">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>المستهدف: {item.targetName || "كافة المستخدمين"}</span>
                        </span>
                        {item.action_url && (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-mono text-[9px] bg-blue-50 px-1.5 py-0.5 rounded">
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>{item.action_url}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(item.created_at).toLocaleDateString("ar-SA", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${item.is_read ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {item.is_read ? "✓ تم الاطلاع" : "تم التسليم"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Load More Pagination Controls */}
            {filteredNotifications.length > visibleCount && (
              <div className="p-4 bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="font-bold text-slate-600">
                  يتم عرض <span className="text-blue-600 font-black">{displayedNotifications.length}</span> من أصل <span className="text-slate-900 font-black">{filteredNotifications.length}</span> إشعار
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    className="flex-1 sm:flex-none rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-5 h-10 shadow-md shadow-blue-500/20 gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>مشاهدة المزيد (+10 إشعارات)</span>
                  </Button>
                  {filteredNotifications.length > visibleCount + 10 && (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setVisibleCount(filteredNotifications.length)}
                      className="rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 h-10 cursor-pointer"
                    >
                      <span>عرض الكل ({filteredNotifications.length})</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {filteredNotifications.length > 0 && filteredNotifications.length <= visibleCount && (
              <div className="py-3.5 text-center text-xs font-bold text-slate-400 bg-white/70 rounded-2xl border border-slate-200/70">
                ✓ تم عرض كافة الإشعارات في السجل ({filteredNotifications.length} إشعار)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>

  {/* ── 4. INSPECT MODAL (معاينة وفحص الإشعار وحمولة البيانات) ── */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تفاصيل وحمولة الإشعار الفنية</h3>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {inspectItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">عنوان الإشعار:</span>
                <p className="font-black text-slate-900 text-sm">{inspectItem.title}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">نص الإشعار:</span>
                <p className="font-medium text-slate-700 text-xs leading-relaxed">{inspectItem.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 block font-bold">الجمهور المستهدف:</span>
                  <span className="font-bold text-slate-800">{inspectItem.targetName || inspectItem.target}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 block font-bold">نوع الإشعار:</span>
                  <span className="font-bold text-slate-800">{inspectItem.type}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 block font-bold">تاريخ البث:</span>
                  <span className="font-bold text-slate-800 font-mono">{new Date(inspectItem.created_at).toLocaleString("ar-SA")}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 block font-bold">حالة القراءة:</span>
                  <span className="font-bold text-emerald-700">{inspectItem.is_read ? "مقروء من المستخدم" : "تم التسليم بنجاح"}</span>
                </div>
              </div>

              {inspectItem.action_url && (
                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
                  <span className="text-[9px] text-blue-700 block font-bold">رابط التوجيه المرفق (Deep Link):</span>
                  <span className="font-mono font-bold text-blue-900 text-xs">{inspectItem.action_url}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectItem(null)}
                className="rounded-xl text-xs font-bold"
              >
                إغلاق
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleRebroadcast(inspectItem);
                  setInspectItem(null);
                }}
                className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white gap-1"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>إعادة بث هذا الإشعار</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
