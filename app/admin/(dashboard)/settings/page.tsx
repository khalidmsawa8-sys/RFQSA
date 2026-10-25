"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Shield,
  Database,
  Server,
  Clock,
  Timer,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Hourglass,
  Lock,
  KeyRound,
  Smartphone,
  Laptop,
  Cpu,
  HardDrive,
  Activity,
  Download,
  Trash2,
  AlertTriangle,
  Percent,
  Receipt,
  Power,
  Globe,
  Sliders,
  UserCheck,
  Check,
  Eye,
  EyeOff,
  SlidersHorizontal,
  FileJson,
  Layers,
  Users,
  ShoppingBag,
  FileText,
  Copy,
  ExternalLink,
  Mail,
  Send,
  ShieldCheck,
  AtSign,
  Globe2,
  MessageCircle,
  MessageSquare,
  Calculator,
  Wallet,
  Coins,
  Scale,
  ArrowRightLeft,
} from "lucide-react";
import { Loader2 } from "lucide-react";

interface SystemMetrics {
  server: {
    host: string;
    domain: string;
    port: number;
    environment: string;
    os: string;
    node_version: string;
    uptime_human: string;
    process_uptime_human: string;
    memory: { total_mb: number; used_mb: number; free_mb: number; percent: number };
    cpu: { model: string; cores: number; load_avg_1m: number };
    disk: { total_gb: number; used_gb: number; free_gb: number; percent: number };
    services: {
      pm2: { name: string; status: string; cluster_mode: string; port: number };
      nginx: { status: string; ssl: string; domain: string };
      database: { engine: string; status: string; latency_ms: number };
    };
  };
  stats: {
    rfqs_count: number;
    orders_count: number;
    quotes_count: number;
    users_count: number;
    clients_count: number;
    vendors_count: number;
  };
  settings: any;
  admin_profile: {
    full_name: string;
    email: string;
    phone: string;
    job_title: string;
    ref_code: string;
    role_badge: string;
    two_factor_enabled: boolean;
    last_login: string;
    created_at: string;
  };
}

function formatMinutesArabic(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return "0 دقيقة";
  if (totalMinutes < 60) return `${totalMinutes} دقيقة`;
  const days = Math.floor(totalMinutes / 1440);
  const remainingAfterDays = totalMinutes % 1440;
  const hours = Math.floor(remainingAfterDays / 60);
  const mins = remainingAfterDays % 60;

  const parts = [];
  if (days > 0) {
    parts.push(
      `${days} ${days === 1 ? "يوم" : days === 2 ? "يومان" : days <= 10 ? "أيام" : "يوم"}`
    );
  }
  if (hours > 0) {
    parts.push(
      `${hours} ${hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : hours <= 10 ? "ساعات" : "ساعة"}`
    );
  }
  if (mins > 0) parts.push(`${mins} دقيقة`);
  return parts.join(" و ");
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "email" | "whatsapp" | "profile" | "server" | "data">("general");
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // General Settings State
  const [durationMinutes, setDurationMinutes] = useState<number>(2880);
  const [isSavingDuration, setIsSavingDuration] = useState(false);
  const [durationFeedback, setDurationFeedback] = useState<{
    type: "success" | "error";
    message: string;
    details?: { cancelledCount?: number; updatedCount?: number };
  } | null>(null);

  // Platform Advanced Policies State
  const [platformPolicies, setPlatformPolicies] = useState({
    maintenance_mode: false,
    maintenance_message: "الموقع يخضع حالياً لأعمال صيانة وترقية مجدولة لخدمتكم بشكل أفضل، وسنعود للعمل خلال دقائق.",
    platform_commission_percent: 3,
    client_platform_fee_percent: 3,
    vendor_platform_fee_percent: 3,
    fee_calculation_basis: "parts_before_vat",
    client_fee_label: "رسوم المنصة",
    auto_wallet_settlement: true,
    separate_platform_fee_transactions: true,
    vat_percent: 15,
    cr_number: "1010789456",
    vat_number: "310987654300003",
    require_vendor_verification: true,
    max_quotes_per_rfq: 10,
    allow_customer_cancel_after_quotes: true,
  });
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);
  const [policiesFeedback, setPoliciesFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Live Financial Simulator State (محاكي التسوية المالية المباشر)
  const [simPartsAmount, setSimPartsAmount] = useState<number>(100);
  const [simDeliveryFee, setSimDeliveryFee] = useState<number>(25);

  // SMTP Email Server Configuration State (Encrypted Credentials)
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_enabled: false,
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_from_name: "منصة RFQ السعودية",
    smtp_from_email: "notifications@rfq-sa.com",
    smtp_secure: false,
  });
  const [smtpHasPasswordSaved, setSmtpHasPasswordSaved] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpFeedback, setSmtpFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Test Email State
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testSmtpFeedback, setTestSmtpFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // WhatsApp Gateway Configuration State (Encrypted AES-256-GCM)
  const [whatsappConfig, setWhatsappConfig] = useState({
    whatsapp_enabled: false,
    whatsapp_provider: "meta" as "meta" | "ultramsg" | "twilio" | "custom",
    whatsapp_api_url: "https://graph.facebook.com/v20.0",
    whatsapp_phone_number_id: "",
    whatsapp_api_token: "",
    whatsapp_auto_order_updates: true,
    whatsapp_from_phone: "+966500000000",
  });
  const [whatsappHasTokenSaved, setWhatsappHasTokenSaved] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [whatsappFeedback, setWhatsappFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Test WhatsApp State
  const [testWhatsappRecipient, setTestWhatsappRecipient] = useState("");
  const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);
  const [testWhatsappFeedback, setTestWhatsappFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Admin Profile Edit State
  const [adminForm, setAdminForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    job_title: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  // Password Change State
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [isToggling2FA, setIsToggling2FA] = useState(false);

  // Copied feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = useCallback(async (showSpin = true) => {
    if (showSpin) setIsRefreshing(true);
    try {
      const res = await fetch("/api/v1/admin/system-metrics", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setMetrics(data);
        if (data.settings?.rfq_visibility_duration_minutes) {
          setDurationMinutes(Number(data.settings.rfq_visibility_duration_minutes));
        }
        if (data.settings) {
          setPlatformPolicies({
            maintenance_mode: Boolean(data.settings.maintenance_mode),
            maintenance_message: data.settings.maintenance_message || platformPolicies.maintenance_message,
            platform_commission_percent: data.settings.platform_commission_percent !== undefined ? Number(data.settings.platform_commission_percent) : 3,
            client_platform_fee_percent: data.settings.client_platform_fee_percent !== undefined
              ? Number(data.settings.client_platform_fee_percent)
              : (data.settings.platform_commission_percent !== undefined ? Number(data.settings.platform_commission_percent) : 3),
            vendor_platform_fee_percent: data.settings.vendor_platform_fee_percent !== undefined
              ? Number(data.settings.vendor_platform_fee_percent)
              : (data.settings.platform_commission_percent !== undefined ? Number(data.settings.platform_commission_percent) : 3),
            fee_calculation_basis: data.settings.fee_calculation_basis || "parts_before_vat",
            client_fee_label: data.settings.client_fee_label || "رسوم المنصة",
            auto_wallet_settlement: data.settings.auto_wallet_settlement !== false,
            separate_platform_fee_transactions: data.settings.separate_platform_fee_transactions !== false,
            vat_percent: data.settings.vat_percent ?? 15,
            cr_number: data.settings.cr_number || "1010789456",
            vat_number: data.settings.vat_number || "310987654300003",
            require_vendor_verification: data.settings.require_vendor_verification !== false,
            max_quotes_per_rfq: data.settings.max_quotes_per_rfq ?? 10,
            allow_customer_cancel_after_quotes: data.settings.allow_customer_cancel_after_quotes !== false,
          });

          setSmtpConfig({
            smtp_enabled: Boolean(data.settings.smtp_enabled),
            smtp_host: data.settings.smtp_host || "smtp.gmail.com",
            smtp_port: Number(data.settings.smtp_port) || 587,
            smtp_user: data.settings.smtp_user || "",
            smtp_password: "",
            smtp_from_name: data.settings.smtp_from_name || "منصة RFQ السعودية",
            smtp_from_email: data.settings.smtp_from_email || "notifications@rfq-sa.com",
            smtp_secure: Boolean(data.settings.smtp_secure),
          });
          setSmtpHasPasswordSaved(
            Boolean(data.settings.smtp_password_configured)
          );

          setWhatsappConfig({
            whatsapp_enabled: Boolean(data.settings.whatsapp_enabled),
            whatsapp_provider: data.settings.whatsapp_provider || "meta",
            whatsapp_api_url: data.settings.whatsapp_api_url || "https://graph.facebook.com/v20.0",
            whatsapp_phone_number_id: data.settings.whatsapp_phone_number_id || "",
            whatsapp_api_token: "",
            whatsapp_auto_order_updates: data.settings.whatsapp_auto_order_updates !== false,
            whatsapp_from_phone: data.settings.whatsapp_from_phone || "+966500000000",
          });
          setWhatsappHasTokenSaved(
            Boolean(data.settings.whatsapp_token_configured)
          );
        }
        if (data.admin_profile) {
          setAdminForm({
            full_name: data.admin_profile.full_name || "",
            email: data.admin_profile.email || "",
            phone: data.admin_profile.phone || "",
            job_title: data.admin_profile.job_title || "",
          });
          setTwoFactorEnabled(Boolean(data.admin_profile.two_factor_enabled));
        }
      }
    } catch (e) {
      console.error("Failed to load metrics:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Save Duration
  const handleSaveDuration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!durationMinutes || durationMinutes < 1) {
      setDurationFeedback({
        type: "error",
        message: "يرجى إدخال مدة صحيحة بالدقائق (دقيقة واحدة على الأقل).",
      });
      return;
    }

    setIsSavingDuration(true);
    setDurationFeedback(null);

    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfq_visibility_duration_minutes: durationMinutes,
          auto_cancel_expired: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDurationFeedback({
          type: "success",
          message: data.message,
          details: data.affected,
        });
        loadData(false);
      } else {
        setDurationFeedback({
          type: "error",
          message: data.error || "فشل حفظ الإعدادات",
        });
      }
    } catch (err: any) {
      setDurationFeedback({
        type: "error",
        message: err?.message || "فشل الاتصال بالسيرفر",
      });
    } finally {
      setIsSavingDuration(false);
    }
  };

  // 2. Save Platform Policies
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicies(true);
    setPoliciesFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify(platformPolicies),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPoliciesFeedback({
          type: "success",
          message: "تم حفظ وتفعيل سياسات المنصة المالية، الضريبة، والعمولات بنجاح في كافة المعاملات والفواتير!",
        });
        if (data.settings) {
          setPlatformPolicies((prev) => ({
            ...prev,
            ...data.settings,
          }));
        }
        loadData(false);
        setTimeout(() => setPoliciesFeedback(null), 5000);
      } else {
        setPoliciesFeedback({
          type: "error",
          message: data.error || "فشل حفظ سياسات المنصة المالية",
        });
      }
    } catch (err: any) {
      console.error(err);
      setPoliciesFeedback({
        type: "error",
        message: err?.message || "فشل الاتصال بالخادم",
      });
    } finally {
      setIsSavingPolicies(false);
    }
  };

  // 2.1. Save SMTP Configuration (Encrypted Server-Side)
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    setSmtpFeedback(null);
    try {
      const payload: any = {
        smtp_enabled: smtpConfig.smtp_enabled,
        smtp_host: smtpConfig.smtp_host,
        smtp_port: smtpConfig.smtp_port,
        smtp_user: smtpConfig.smtp_user,
        smtp_from_name: smtpConfig.smtp_from_name,
        smtp_from_email: smtpConfig.smtp_from_email,
        smtp_secure: smtpConfig.smtp_secure,
      };

      // Only pass password if admin explicitly typed a new one
      if (smtpConfig.smtp_password && smtpConfig.smtp_password.trim().length > 0) {
        payload.smtp_password = smtpConfig.smtp_password.trim();
      }

      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpFeedback({
          type: "success",
          message: "تم حفظ إعدادات خادم البريد وتشفير كلمة المرور في السيرفر بنجاح (AES-256-GCM)!",
        });
        setSmtpConfig((prev) => ({ ...prev, smtp_password: "" }));
        loadData(false);
        setTimeout(() => setSmtpFeedback(null), 5000);
      } else {
        setSmtpFeedback({
          type: "error",
          message: data.error || "فشل حفظ إعدادات البريد",
        });
      }
    } catch (err: any) {
      setSmtpFeedback({
        type: "error",
        message: err?.message || "فشل الاتصال بالسيرفر",
      });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  // 2.2. Test SMTP Connection & Send Verification Mail
  const handleTestSmtp = async () => {
    if (!smtpConfig.smtp_host || !smtpConfig.smtp_user) {
      setTestSmtpFeedback({
        type: "error",
        message: "يرجى إدخال عنوان خادم SMTP والبريد الإلكتروني للبدء بالفحص.",
      });
      return;
    }
    setIsTestingSmtp(true);
    setTestSmtpFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: smtpConfig.smtp_host,
          smtp_port: smtpConfig.smtp_port,
          smtp_user: smtpConfig.smtp_user,
          smtp_password: smtpConfig.smtp_password,
          smtp_secure: smtpConfig.smtp_secure,
          target_email: testEmailRecipient.trim() || smtpConfig.smtp_user,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestSmtpFeedback({
          type: "success",
          message: data.message || "تم اختبار الاتصال بنجاح!",
        });
      } else {
        setTestSmtpFeedback({
          type: "error",
          message: data.error || "فشل الاتصال بخادم البريد، يرجى مراجعة البيانات.",
        });
      }
    } catch (err: any) {
      setTestSmtpFeedback({
        type: "error",
        message: err?.message || "حدث خطأ أثناء فحص خادم البريد.",
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // 2.3. Save WhatsApp Configuration (Encrypted AES-256-GCM Server-Side)
  const handleSaveWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsapp(true);
    setWhatsappFeedback(null);
    try {
      const payload: any = {
        whatsapp_enabled: whatsappConfig.whatsapp_enabled,
        whatsapp_provider: whatsappConfig.whatsapp_provider,
        whatsapp_api_url: whatsappConfig.whatsapp_api_url,
        whatsapp_phone_number_id: whatsappConfig.whatsapp_phone_number_id,
        whatsapp_auto_order_updates: whatsappConfig.whatsapp_auto_order_updates,
        whatsapp_from_phone: whatsappConfig.whatsapp_from_phone,
      };

      if (whatsappConfig.whatsapp_api_token && whatsappConfig.whatsapp_api_token.trim().length > 0) {
        payload.whatsapp_api_token = whatsappConfig.whatsapp_api_token.trim();
      }

      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsappFeedback({
          type: "success",
          message: "تم حفظ إعدادات بوابة واتساب وتشفير رمز الوصول بنجاح (AES-256-GCM)!",
        });
        setWhatsappConfig((prev) => ({ ...prev, whatsapp_api_token: "" }));
        loadData(false);
        setTimeout(() => setWhatsappFeedback(null), 5000);
      } else {
        setWhatsappFeedback({
          type: "error",
          message: data.error || "فشل حفظ إعدادات واتساب",
        });
      }
    } catch (err: any) {
      setWhatsappFeedback({
        type: "error",
        message: err?.message || "فشل الاتصال بالسيرفر",
      });
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  // 2.4. Test WhatsApp Connection & Send Live Verification Message
  const handleTestWhatsapp = async () => {
    if (!testWhatsappRecipient) {
      setTestWhatsappFeedback({
        type: "error",
        message: "يرجى إدخال رقم هاتف المستلم لفحص وصول الرسالة (مثال: 0501234567 أو 966501234567).",
      });
      return;
    }
    setIsTestingWhatsapp(true);
    setTestWhatsappFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/settings/test-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: whatsappConfig.whatsapp_provider,
          api_url: whatsappConfig.whatsapp_api_url,
          phone_number_id: whatsappConfig.whatsapp_phone_number_id,
          api_token: whatsappConfig.whatsapp_api_token,
          from_phone: whatsappConfig.whatsapp_from_phone,
          target_phone: testWhatsappRecipient.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestWhatsappFeedback({
          type: "success",
          message: data.message || "تم إرسال رسالة الاختبار بنجاح إلى رقم الواتساب!",
        });
      } else {
        setTestWhatsappFeedback({
          type: "error",
          message: data.error || "فشل إرسال رسالة الواتساب، يرجى مراجعة إعدادات البوابة والرمز السري.",
        });
      }
    } catch (err: any) {
      setTestWhatsappFeedback({
        type: "error",
        message: err?.message || "حدث خطأ أثناء فحص بوابة الواتساب.",
      });
    } finally {
      setIsTestingWhatsapp(false);
    }
  };

  // 3. Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          profile: adminForm,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileFeedback("تم حفظ بيانات المشرف الشخصية وتحديثها فورياً في النظام.");
        loadData(false);
        setTimeout(() => setProfileFeedback(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 4. Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordFeedback({ type: "error", message: "كلمتا المرور غير متطابقتين!" });
      return;
    }
    if (passwords.new_password.length < 6) {
      setPasswordFeedback({ type: "error", message: "يجب أن لا تقل كلمة المرور عن 6 أحرف أو أرقام!" });
      return;
    }
    setIsSavingPassword(true);
    setPasswordFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          password_data: passwords,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordFeedback({ type: "success", message: "تم تغيير كلمة المرور بنجاح وتأمين الحساب." });
        setPasswords({ current_password: "", new_password: "", confirm_password: "" });
        setTimeout(() => setPasswordFeedback(null), 5000);
      } else {
        setPasswordFeedback({ type: "error", message: data.error || "فشل تغيير كلمة المرور" });
      }
    } catch (e: any) {
      setPasswordFeedback({ type: "error", message: e?.message || "فشل الاتصال" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // 5. Toggle 2FA
  const handleToggle2FA = async () => {
    setIsToggling2FA(true);
    try {
      const nextVal = !twoFactorEnabled;
      const res = await fetch("/api/v1/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_2fa",
          enabled: nextVal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTwoFactorEnabled(data.two_factor_enabled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsToggling2FA(false);
    }
  };

  // Instant DB Backup Export
  const handleDownloadBackup = () => {
    const backupData = {
      backup_timestamp: new Date().toISOString(),
      platform: "RFQ B2B Marketplace Platform",
      host: metrics?.server.host || "147.93.56.252",
      metrics: metrics,
      settings: platformPolicies,
      exported_by: metrics?.admin_profile.full_name || "Super Admin",
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rfq_system_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const PRESETS = [
    { label: "30 دقيقة (نصف ساعة)", val: 30 },
    { label: "60 دقيقة (ساعة)", val: 60 },
    { label: "120 دقيقة (ساعتان)", val: 120 },
    { label: "720 دقيقة (12 ساعة)", val: 720 },
    { label: "1440 دقيقة (24 ساعة)", val: 1440 },
    { label: "2880 دقيقة (48 ساعة)", val: 2880 },
  ];

  // Financial Simulator Calculations (المواصفة النهائية لرسوم المنصة)
  const simClientFeePct = Number(platformPolicies.client_platform_fee_percent) || 0;
  const simVendorFeePct = Number(platformPolicies.vendor_platform_fee_percent) || 0;
  const simVatPct = Number(platformPolicies.vat_percent) || 15;
  const validSimParts = Math.max(0, Number(simPartsAmount) || 0);
  const validSimDelivery = Math.max(0, Number(simDeliveryFee) || 0);

  const calcClientFee = Math.round((validSimParts * (simClientFeePct / 100)) * 100) / 100;
  const calcVendorFee = Math.round((validSimParts * (simVendorFeePct / 100)) * 100) / 100;
  const calcVatOnParts = Math.round((validSimParts * (simVatPct / 100)) * 100) / 100;
  const calcSubtotalBeforeVat = Math.round((validSimParts + calcClientFee) * 100) / 100;
  const calcClientTotal = Math.round((validSimParts + calcClientFee + calcVatOnParts + validSimDelivery) * 100) / 100;

  const calcVendorNetParts = Math.round((validSimParts - calcVendorFee) * 100) / 100;
  const calcVendorPayout = Math.round((calcVendorNetParts + calcVatOnParts) * 100) / 100;
  const calcPlatformRevenue = Math.round((calcClientFee + calcVendorFee) * 100) / 100;
  const calcCourierPayout = validSimDelivery;

  const calcTotalDisbursed = Math.round((calcVendorPayout + calcPlatformRevenue + calcCourierPayout) * 100) / 100;
  const isZeroLeakage = Math.abs(calcTotalDisbursed - calcClientTotal) < 0.001;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-bold text-sm">جاري قراءة بيانات السيرفر الحقيقية وإعدادات المنصة...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 w-full" dir="rtl">
      {/* ── TOP HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">إعدادات المنصة وحساب الإدارة</h1>
              <p className="text-slate-500 text-sm font-semibold mt-0.5">
                لوحة التحكم المركزية في سياسات النظام، مدة ظهور الطلبات، صلاحيات المشرف، وصحة الخادم
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>السيرفر متصل:</span>
            <span className="font-mono font-black">{metrics?.server.host}</span>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>تحديث القياسات</span>
          </button>
        </div>
      </div>

      {/* ── ENTERPRISE TABS NAVIGATION ── */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-x-auto">
        {[
          { key: "general", label: "الإعدادات العامة والطلبات", icon: SlidersHorizontal, count: null },
          { key: "email", label: "خادم البريد الإلكتروني (SMTP)", icon: Mail, count: smtpConfig.smtp_enabled ? "مفعل" : null },
          { key: "whatsapp", label: "بوابة واتساب (WhatsApp API)", icon: MessageSquare, count: whatsappConfig.whatsapp_enabled ? "مفعل" : null },
          { key: "profile", label: "إدارة حساب المشرف والأمان", icon: Shield, count: null },
          { key: "server", label: "صحة الخادم والبنية السحابية", icon: Server, count: "مباشر" },
          { key: "data", label: "إحصائيات المنصة والنسخ الاحتياطي", icon: Database, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-white text-blue-600 shadow-md shadow-slate-200/60 scale-[1.01]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.count && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: GENERAL & ORDERS ENGINE SETTINGS ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "general" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* A. ORDER VISIBILITY DURATION (THE USER'S PRIMARY REQUEST) */}
          <Card className="border-2 border-blue-200/90 bg-gradient-to-b from-white to-blue-50/20 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-blue-100/70 bg-blue-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Timer className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900">
                      مدة ظهور طلبات العملاء عند الموردين (بالدقائق)
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs font-bold mt-0.5">
                      التحكم في مهلة تنافس طلبات التسعير (RFQs) وتحويلها التلقائي لحالة "ملغاة" بعد انتهائها
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-blue-600 text-white font-black px-3.5 py-1.5 rounded-xl text-xs shadow-xs w-fit">
                  تطبيق فوري وتلقائي
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
              <form onSubmit={handleSaveDuration} className="space-y-6">
                {/* Input & Unit */}
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800">
                    أدخل المدة المسموحة لبقاء الطلب مفتوحاً للتسعير (بالدقائق):
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                    <div className="relative flex-1 max-w-md">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={durationMinutes || ""}
                        onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                        placeholder="مثال: 120"
                        className="w-full h-14 px-5 pl-24 rounded-2xl border-2 border-slate-200 bg-white text-xl font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-xs"
                        required
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 font-black text-sm pointer-events-none">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>دقيقة</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingDuration}
                      className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingDuration ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>جاري الفحص والتطبيق على الطلبات...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          <span>حفظ وتطبيق على جميع الطلبات</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Calculated dynamic preview */}
                  <div className="flex items-center gap-2.5 text-xs font-bold text-blue-800 bg-blue-50/90 border border-blue-200/90 px-4 py-2.5 rounded-2xl w-fit shadow-xs">
                    <Hourglass className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                    <span>المدة المحسوبة للنظام:</span>
                    <span className="font-black text-blue-900 underline decoration-blue-400 text-sm">
                      {formatMinutesArabic(durationMinutes)}
                    </span>
                    <span className="text-slate-400 font-mono">({durationMinutes} دقيقة)</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 block">خيارات سريعة محددة مسبقاً:</span>
                  <div className="flex flex-wrap gap-2.5">
                    {PRESETS.map((p) => {
                      const isSelected = durationMinutes === p.val;
                      return (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setDurationMinutes(p.val)}
                          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-xs"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Explanatory Banner */}
                <div className="p-4.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ضمانات التطبيق التلقائي الفوري:</span>
                  </div>
                  <ul className="space-y-1 text-amber-900 font-semibold list-disc list-inside">
                    <li>يتم فوراً فحص كافة طلبات التسعير المسجلة في النظام.</li>
                    <li>أي طلب مر على وقت إنشائه مدة تزيد عن هذه الدقائق يتم نقله فوراً إلى <strong>"الطلبات ملغاة"</strong>.</li>
                    <li>الطلبات النشطة المتبقية يتم إعادة جدولة عدادها التنازلي بدقة وفق المهلة الجديدة.</li>
                    <li>يختفي الطلب المنتهي من رادار الموردين ولا يمكن لأي مورد تقديم عروض عليه بعد ذلك.</li>
                  </ul>
                </div>

                {/* Feedback */}
                {durationFeedback && (
                  <div
                    className={`p-4.5 rounded-2xl border text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
                      durationFeedback.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : "bg-red-50 border-red-200 text-red-950"
                    }`}
                  >
                    {durationFeedback.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1">
                      <p className="font-black text-base leading-snug">{durationFeedback.message}</p>
                      {durationFeedback.details && (
                        <p className="text-xs text-emerald-700 font-semibold">
                          النتيجة الحية: تحويل {durationFeedback.details.cancelledCount || 0} طلب منتهي إلى ملغي، وتحديث مهلة {durationFeedback.details.updatedCount || 0} طلب نشط بنجاح.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* B. PLATFORM BUSINESS POLICIES & TAX - COMPREHENSIVE FEE GOVERNANCE */}
          <Card className="border-2 border-slate-200/90 shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <CardTitle className="text-xl font-black text-slate-900">
                        حوكمة رسوم المنصة والسياسات المالية (المواصفة النهائية المعتمدة)
                      </CardTitle>
                      <Badge className="bg-emerald-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full">
                        المواصفة الرسمية المعتمدة
                      </Badge>
                      <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-[10px] px-2.5 py-0.5 rounded-full">
                        صفر تسريب مالي Zero-Leakage
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-500 text-xs font-bold mt-1">
                      التحكم المركزي في نسب رسوم العملاء والموردين، الفوترة الضريبية (ZATCA)، حوكمة المحافظ، ومحاكي التسوية الفورية
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                    تطبيق آلي على كافة المعاملات
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-8">
              <form onSubmit={handleSavePolicies} className="space-y-8">
                {/* ── SECTION 1: UNIFORM FEE RATES & BASIS ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Scale className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900">1. آلية احتساب الرسوم والنسب الموحدة</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Client Fee % */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                        <span>نسبة رسوم العميل (%)</span>
                        <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-black">
                          تُضاف لقيمة القطع
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={platformPolicies.client_platform_fee_percent ?? 3}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPlatformPolicies({
                              ...platformPolicies,
                              client_platform_fee_percent: val,
                              platform_commission_percent: val,
                            });
                          }}
                          className="w-full h-12 px-4 pl-10 rounded-2xl border-2 border-slate-200 text-base font-black text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all shadow-xs"
                          required
                        />
                        <Percent className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                        تُحتسب على قيمة القطع قبل ضريبة القيمة المضافة
                      </p>
                    </div>

                    {/* Vendor Fee % */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                        <span>نسبة رسوم المورد (%)</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-black">
                          تُخصم من مستحقاته
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={platformPolicies.vendor_platform_fee_percent ?? 5}
                          onChange={(e) =>
                            setPlatformPolicies({
                              ...platformPolicies,
                              vendor_platform_fee_percent: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full h-12 px-4 pl-10 rounded-2xl border-2 border-slate-200 text-base font-black text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all shadow-xs"
                          required
                        />
                        <Percent className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                        تُخصم من قيمة القطع ولا تظهر بفاتورة العميل
                      </p>
                    </div>

                    {/* Client Fee Label on Invoices */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                        <span>مسمى بند الرسوم في الفاتورة</span>
                        <span className="text-[10px] text-slate-500 font-mono">فاتورة العميل</span>
                      </label>
                      <input
                        type="text"
                        value={platformPolicies.client_fee_label || "رسوم المنصة"}
                        onChange={(e) =>
                          setPlatformPolicies({ ...platformPolicies, client_fee_label: e.target.value })
                        }
                        placeholder="رسوم المنصة"
                        className="w-full h-12 px-4 rounded-2xl border-2 border-slate-200 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all shadow-xs"
                        required
                      />
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                        المسمى الرسمي الذي يظهر في فاتورة العميل الضريبية وملخص السلة
                      </p>
                    </div>

                    {/* Fee Calculation Basis */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                        <span>أساس احتساب الرسوم</span>
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-black">
                          قاعدة ملزمة
                        </span>
                      </label>
                      <div className="h-12 px-4 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-black text-slate-800 shadow-xs">
                        <span>قيمة القطع قبل الضريبة</span>
                        <Badge className="bg-slate-200 text-slate-700 text-[10px]">استبعاد الشحن والتوصيل</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                        تطبيقاً للأصول المالية، تستثنى رسوم الشحن والتوصيل تماماً من العمولة
                      </p>
                    </div>
                  </div>

                  {/* 4 Pillars Guarantees Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-900 font-black text-xs">
                        <Scale className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>نسبة موحدة لجميع الأطراف</span>
                      </div>
                      <p className="text-[11px] text-blue-950 font-semibold leading-relaxed">
                        لا يُسمح بتخصيص نسب مختلفة لعملاء أو موردين بعينهم؛ لضمان النزاهة والعدالة التنافسية.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-indigo-900 font-black text-xs">
                        <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>تجميد النسبة مع الطلب (Snapshot)</span>
                      </div>
                      <p className="text-[11px] text-indigo-950 font-semibold leading-relaxed">
                        تُحفظ نسبة كل طرف مع الطلب عند إنشائه، ولا تؤثر أي تعديلات لاحقة على الطلبات السابقة.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
                        <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>فاتورة العميل المستقلة</span>
                      </div>
                      <p className="text-[11px] text-emerald-950 font-semibold leading-relaxed">
                        تظهر الرسوم في فاتورة العميل كبند مستقل باسم «{platformPolicies.client_fee_label || "رسوم المنصة"}» قبل احتساب الضريبة.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-purple-900 font-black text-xs">
                        <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>امتثال الزكاة والضريبة (ZATCA)</span>
                      </div>
                      <p className="text-[11px] text-purple-950 font-semibold leading-relaxed">
                        رسوم المورد تُخصم من مستحقاته ولا تظهر بفاتورة العميل، ولا تفرض ضريبة إضافية داخل فاتورة المورد.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: TAX IDENTIFIERS & CR ── */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Receipt className="w-4 h-4 text-violet-600" />
                    <h3 className="text-sm font-black text-slate-900">2. المعرفات الضريبية والتجارية للمنصة (ZATCA)</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700">نسبة ضريبة القيمة المضافة VAT (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={platformPolicies.vat_percent}
                          onChange={(e) =>
                            setPlatformPolicies({ ...platformPolicies, vat_percent: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full h-12 px-4 pl-10 rounded-2xl border-2 border-slate-200 text-base font-black text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 shadow-xs"
                          required
                        />
                        <Percent className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700">الرقم الضريبي للمنصة (VAT ID)</label>
                      <input
                        type="text"
                        value={platformPolicies.vat_number}
                        onChange={(e) => setPlatformPolicies({ ...platformPolicies, vat_number: e.target.value })}
                        className="w-full h-12 px-4 rounded-2xl border-2 border-slate-200 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 shadow-xs"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700">رقم السجل التجاري (CR Number)</label>
                      <input
                        type="text"
                        value={platformPolicies.cr_number}
                        onChange={(e) => setPlatformPolicies({ ...platformPolicies, cr_number: e.target.value })}
                        className="w-full h-12 px-4 rounded-2xl border-2 border-slate-200 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 shadow-xs"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: WALLET & FINANCIAL SETTLEMENTS ── */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-900">3. تسوية المحافظ والحسابات المالية</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-start gap-3.5 p-4.5 rounded-2xl border-2 border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={platformPolicies.auto_wallet_settlement !== false}
                        onChange={(e) =>
                          setPlatformPolicies({ ...platformPolicies, auto_wallet_settlement: e.target.checked })
                        }
                        className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                      />
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-900">تفعيل التسوية الآلية للمحافظ عند اكتمال الدفع</p>
                        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                          عند نجاح سداد العميل، يقوم النظام فورياً بتوزيع المستحقات إلى محفظة المورد، محفظة شركة الشحن/المندوب، ومحفظة عمولات المنصة بدون تدخل بشري.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 p-4.5 rounded-2xl border-2 border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={platformPolicies.separate_platform_fee_transactions !== false}
                        onChange={(e) =>
                          setPlatformPolicies({
                            ...platformPolicies,
                            separate_platform_fee_transactions: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                      />
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-900">تسجيل رسوم المنصة كمعاملتين منفصلتين في المحفظة</p>
                        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                          إيداع رسوم المنصة بقيدين مستقلين: قيد 1 (رسوم العميل: <span className="font-mono text-[10px]">SETTLE-order-PLATFORM-CLIENT</span>) وقيد 2 (رسوم المورد: <span className="font-mono text-[10px]">SETTLE-order-PLATFORM-VENDOR</span>) للتدقيق المالي الشفاف.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* ── SECTION 4: LIVE INTERACTIVE FINANCIAL SIMULATOR ── */}
                <div className="p-6 md:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl border border-indigo-800/40 space-y-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Simulator Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-800/50 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">
                          محاكي التسوية المالية المباشر (Live Financial Simulator)
                        </h4>
                        <p className="text-xs text-indigo-200/80 font-semibold mt-0.5">
                          اختبر أي مبلغ للقطع واشهد توزيع الأموال الدقيق بنسبة الصفر تسريب مالي لحظياً
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-black px-3 py-1 rounded-xl">
                        حساب حي متصل بالنسب المدخلة
                      </span>
                    </div>
                  </div>

                  {/* Simulator Interactive Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-indigo-200">أدخل قيمة القطع للتجربة (ر.س):</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={simPartsAmount || ""}
                        onChange={(e) => setSimPartsAmount(parseFloat(e.target.value) || 0)}
                        placeholder="100"
                        className="w-full h-12 px-4 rounded-xl border border-indigo-700 bg-slate-800/80 text-white font-mono font-black text-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
                      />
                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {[100, 250, 500, 1000, 2500].map((presetVal) => (
                          <button
                            key={presetVal}
                            type="button"
                            onClick={() => setSimPartsAmount(presetVal)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              simPartsAmount === presetVal
                                ? "bg-indigo-600 text-white border-indigo-500 font-black shadow-xs"
                                : "bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {presetVal} ر.س
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-indigo-200">تكلفة التوصيل والشحن (ر.س):</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={simDeliveryFee || ""}
                        onChange={(e) => setSimDeliveryFee(parseFloat(e.target.value) || 0)}
                        placeholder="25"
                        className="w-full h-12 px-4 rounded-xl border border-indigo-700 bg-slate-800/80 text-white font-mono font-black text-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
                      />
                      <p className="text-[10px] text-slate-400 font-semibold pt-1">
                        تتحول بالكامل إلى محفظة شركة التوصيل/المندوب بدون استقطاع
                      </p>
                    </div>

                    <div className="space-y-1.5 bg-slate-800/40 border border-indigo-800/40 rounded-2xl p-3 flex flex-col justify-center">
                      <span className="text-xs text-indigo-300 font-bold">النسب المعتمدة الحالية:</span>
                      <div className="flex items-center justify-between text-xs font-black pt-1">
                        <span className="text-blue-300">رسوم العميل: +{simClientFeePct}%</span>
                        <span className="text-emerald-300">رسوم المورد: -{simVendorFeePct}%</span>
                        <span className="text-purple-300">ضريبة: {simVatPct}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold pt-1">
                        مسمى الرسوم: «{platformPolicies.client_fee_label || "رسوم المنصة"}»
                      </span>
                    </div>
                  </div>

                  {/* Simulator 4-Card Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                    {/* Card 1: Client Checkout */}
                    <div className="p-4 rounded-2xl bg-slate-800/80 border border-blue-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-400">1. فاتورة ومدفوع العميل</span>
                        <Receipt className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="space-y-1 text-xs font-semibold text-slate-300 border-t border-slate-700/60 pt-2">
                        <div className="flex justify-between">
                          <span>قيمة القطع:</span>
                          <span className="font-mono font-bold text-white">{validSimParts.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-blue-300">
                          <span>{platformPolicies.client_fee_label || "رسوم المنصة"} (+{simClientFeePct}%):</span>
                          <span className="font-mono font-bold">+{calcClientFee.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>المجموع قبل الضريبة:</span>
                          <span className="font-mono">{calcSubtotalBeforeVat.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-purple-300">
                          <span>ضريبة القيمة المضافة (15%):</span>
                          <span className="font-mono font-bold">+{calcVatOnParts.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-amber-300">
                          <span>الشحن والتوصيل:</span>
                          <span className="font-mono font-bold">+{validSimDelivery.toFixed(2)} ر.س</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-blue-500/30 flex items-center justify-between text-sm font-black text-blue-300">
                        <span>إجمالي مدفوع العميل:</span>
                        <span className="font-mono text-base text-white">{calcClientTotal.toFixed(2)} ر.س</span>
                      </div>
                    </div>

                    {/* Card 2: Vendor Wallet Deposit */}
                    <div className="p-4 rounded-2xl bg-slate-800/80 border border-emerald-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-400">2. صافي محفظة المورد</span>
                        <Wallet className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="space-y-1 text-xs font-semibold text-slate-300 border-t border-slate-700/60 pt-2">
                        <div className="flex justify-between">
                          <span>قيمة القطع الأصلية:</span>
                          <span className="font-mono font-bold text-white">{validSimParts.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-red-300">
                          <span>خصم رسوم المنصة (-{simVendorFeePct}%):</span>
                          <span className="font-mono font-bold">-{calcVendorFee.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>صافي القطع بعد الخصم:</span>
                          <span className="font-mono">{calcVendorNetParts.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between text-purple-300">
                          <span>استرداد الضريبة (للزكاة):</span>
                          <span className="font-mono font-bold">+{calcVatOnParts.toFixed(2)} ر.س</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold italic pt-1">
                          * معفي من ظهور العمولة بفاتورته للعميل
                        </div>
                      </div>
                      <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between text-sm font-black text-emerald-300">
                        <span>صافي إيداع المورد:</span>
                        <span className="font-mono text-base text-white">{calcVendorPayout.toFixed(2)} ر.س</span>
                      </div>
                    </div>

                    {/* Card 3: Platform Wallet (2 Transactions) */}
                    <div className="p-4 rounded-2xl bg-slate-800/80 border border-indigo-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-400">3. محفظة عمولات المنصة</span>
                        <Coins className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="space-y-1.5 text-xs font-semibold text-slate-300 border-t border-slate-700/60 pt-2">
                        <div className="p-2 rounded-xl bg-slate-900/60 border border-indigo-800/40 space-y-0.5">
                          <div className="flex justify-between text-blue-300 font-black">
                            <span>قيد 1: عمولة العميل:</span>
                            <span className="font-mono">+{calcClientFee.toFixed(2)} ر.س</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-mono">SETTLE-DEMO-PLATFORM-CLIENT</p>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-900/60 border border-emerald-800/40 space-y-0.5">
                          <div className="flex justify-between text-emerald-300 font-black">
                            <span>قيد 2: عمولة المورد:</span>
                            <span className="font-mono">+{calcVendorFee.toFixed(2)} ر.س</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-mono">SETTLE-DEMO-PLATFORM-VENDOR</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-indigo-500/30 flex items-center justify-between text-sm font-black text-indigo-300">
                        <span>إجمالي إيراد المنصة:</span>
                        <span className="font-mono text-base text-white">{calcPlatformRevenue.toFixed(2)} ر.س</span>
                      </div>
                    </div>

                    {/* Card 4: Courier Wallet */}
                    <div className="p-4 rounded-2xl bg-slate-800/80 border border-amber-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-400">4. محفظة شركة التوصيل</span>
                        <ShoppingBag className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="space-y-1.5 text-xs font-semibold text-slate-300 border-t border-slate-700/60 pt-2">
                        <div className="p-2 rounded-xl bg-slate-900/60 border border-amber-800/40 space-y-0.5">
                          <div className="flex justify-between text-amber-300 font-black">
                            <span>إيداع أجور الشحن:</span>
                            <span className="font-mono">+{calcCourierPayout.toFixed(2)} ر.س</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-mono">SETTLE-DEMO-COURIER</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold pt-2 leading-relaxed">
                          يتم إيداع كامل تكلفة التوصيل في حساب المندوب أو شركة الشحن فور التسليم الناجح.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-amber-500/30 flex items-center justify-between text-sm font-black text-amber-300">
                        <span>إجمالي إيداع التوصيل:</span>
                        <span className="font-mono text-base text-white">{calcCourierPayout.toFixed(2)} ر.س</span>
                      </div>
                    </div>
                  </div>

                  {/* Zero Leakage Mathematical Audit Banner */}
                  <div className="p-4.5 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500/50 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-emerald-200">
                          نتيجة التدقيق الرياضي التلقائي: تطابق بنسبة 100% (Zero-Leakage Audit)
                        </p>
                        <p className="text-xs font-mono text-emerald-300/90 pt-0.5">
                          {calcVendorPayout.toFixed(2)} (المورد) + {calcPlatformRevenue.toFixed(2)} (المنصة) + {calcCourierPayout.toFixed(2)} (التوصيل) = {calcClientTotal.toFixed(2)} ر.س (مدفوع العميل) ✓
                        </p>
                      </div>
                    </div>

                    <span className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shrink-0 shadow-md">
                      تطابق محاسبي سليم ومحكم
                    </span>
                  </div>
                </div>

                {/* ── SECTION 5: OPERATIONAL TOGGLES ── */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={platformPolicies.require_vendor_verification}
                      onChange={(e) =>
                        setPlatformPolicies({ ...platformPolicies, require_vendor_verification: e.target.checked })
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-900">اشتراط توثيق هوية المورد</p>
                      <p className="text-[11px] text-slate-500 font-semibold">مراجعة السجل قبل تقديم العروض</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={platformPolicies.allow_customer_cancel_after_quotes}
                      onChange={(e) =>
                        setPlatformPolicies({ ...platformPolicies, allow_customer_cancel_after_quotes: e.target.checked })
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-900">السماح للعميل بإلغاء الطلب</p>
                      <p className="text-[11px] text-slate-500 font-semibold">حتى بعد صدور عروض أسعار الموردين</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-red-200/80 bg-red-50/30 hover:bg-red-50/60 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={platformPolicies.maintenance_mode}
                      onChange={(e) =>
                        setPlatformPolicies({ ...platformPolicies, maintenance_mode: e.target.checked })
                      }
                      className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <p className="text-xs font-black text-red-900">وضع الصيانة العام (Maintenance)</p>
                      <p className="text-[11px] text-red-600 font-semibold">إيقاف العمليات للترقية المجدولة</p>
                    </div>
                  </label>
                </div>

                {/* Submit Button & Feedback */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSavingPolicies}
                    className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPolicies ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري حفظ واعتماد سياسات الرسوم...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>حفظ واعتماد سياسات رسوم المنصة والضرائب</span>
                      </>
                    )}
                  </button>

                  {policiesFeedback && (
                    <div
                      className={`text-xs font-bold px-4 py-3 rounded-2xl border flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${
                        policiesFeedback.type === "success"
                          ? "text-emerald-950 bg-emerald-50 border-emerald-200"
                          : "text-red-950 bg-red-50 border-red-200"
                      }`}
                    >
                      {policiesFeedback.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <span>{policiesFeedback.message}</span>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: SMTP EMAIL SERVER CONFIGURATION (ENCRYPTED) ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "email" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* 1. SECURITY & ENCRYPTION GUARANTEE BANNER */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-blue-800/40 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-13 h-13 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 shadow-lg">
                  <ShieldCheck className="w-7 h-7 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-white">حماية أمنية وتشفير عالي المستوى للبيانات</h2>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono text-xs">
                      AES-256-GCM Military Encryption
                    </Badge>
                  </div>
                  <p className="text-xs text-blue-200/90 leading-relaxed max-w-2xl font-semibold">
                    🛡️ سيتم تسجيل بيانات اعتماد خادم البريد وحفظها بشكل مشفر باستخدام AES-256-GCM داخل قاعدة البيانات لحماية سريتها، ولا يتم عرض كلمة المرور الأصلية في لوحة التحكم أو إرسالها إلى المتصفح.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border ${
                    smtpConfig.smtp_enabled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {smtpConfig.smtp_enabled ? "خدمة البريد مفعلة ✓" : "خدمة البريد معطلة"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. SMTP CREDENTIALS & SERVER CONFIGURATION CARD */}
          <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900">
                      إعدادات خادم البريد الإلكتروني (SMTP Gateway)
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs font-bold mt-0.5">
                      ربط النظام بخادم البريد لإرسال إشعارات الطلبات، عروض الأسعار، وتنبيهات الصفقات آلياً
                    </CardDescription>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-400">تعبئة سريعة:</span>
                  {[
                    { label: "Gmail", host: "smtp.gmail.com", port: 587, secure: false },
                    { label: "Outlook / M365", host: "smtp.office365.com", port: 587, secure: false },
                    { label: "Zoho", host: "smtp.zoho.com", port: 465, secure: true },
                    { label: "VPS Host", host: "mail.rfq-sa.com", port: 587, secure: false },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setSmtpConfig((prev) => ({
                          ...prev,
                          smtp_host: preset.host,
                          smtp_port: preset.port,
                          smtp_secure: preset.secure,
                        }))
                      }
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
              <form onSubmit={handleSaveSmtp} className="space-y-6">
                {/* Master Switch */}
                <div className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">تفعيل الإرسال التلقائي للبريد الإلكتروني</p>
                      <p className="text-xs text-slate-500 font-semibold">
                        عند التفعيل، سيتم إرسال رسائل بريد فورية للأطراف المعنية عند كل حدث تشغيلي
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpConfig.smtp_enabled}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Host */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-blue-600" />
                      <span>عنوان خادم SMTP (Host)</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={smtpConfig.smtp_host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_host: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold text-left focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 [direction:ltr]"
                      required
                    />
                  </div>

                  {/* Port */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>منفذ الاتصال (Port)</span>
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      value={smtpConfig.smtp_port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_port: parseInt(e.target.value, 10) || 587 })}
                      placeholder="587"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold text-left focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 [direction:ltr]"
                      required
                    />
                  </div>

                  {/* Username / Email */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <AtSign className="w-3.5 h-3.5 text-blue-600" />
                      <span>اسم المستخدم / البريد (Username)</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={smtpConfig.smtp_user}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_user: e.target.value })}
                      placeholder="your-email@domain.com"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold text-left focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 [direction:ltr]"
                      required
                    />
                  </div>

                  {/* Password (Encrypted in DB) */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الرقم السري للبريد (مشفر في قاعدة البيانات)</span>
                      </span>
                      {smtpHasPasswordSaved && (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          محفوظ ومحمي بـ AES-256
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showSmtpPassword ? "text" : "password"}
                        dir="ltr"
                        value={smtpConfig.smtp_password}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_password: e.target.value })}
                        placeholder={smtpHasPasswordSaved ? "•••••••• (اتركه كما هو إذا لم ترغب بالتغيير)" : "أدخل كلمة المرور أو رمز التطبيق"}
                        className="w-full h-12 px-4 pl-11 rounded-xl border border-slate-200 text-sm font-mono font-bold text-left focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 [direction:ltr]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* From Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">اسم المرسل المعروض (Sender Name)</label>
                    <input
                      type="text"
                      value={smtpConfig.smtp_from_name}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_from_name: e.target.value })}
                      placeholder="منصة RFQ السعودية"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* From Email */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">البريد الإلكتروني الظاهر (From Address)</label>
                    <input
                      type="email"
                      dir="ltr"
                      value={smtpConfig.smtp_from_email}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_from_email: e.target.value })}
                      placeholder="notifications@rfq-sa.com"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold text-left focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 [direction:ltr]"
                    />
                  </div>
                </div>

                {/* Secure SSL Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors w-fit">
                    <input
                      type="checkbox"
                      checked={smtpConfig.smtp_secure}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_secure: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-900">استخدام اتصال SSL / TLS مباشر (عادة لمنفذ 465)</p>
                      <p className="text-[11px] text-slate-500 font-semibold">اتركه غير محدد في حال استخدام منفذ 587 (STARTTLS)</p>
                    </div>
                  </label>
                </div>

                {/* Submit & Feedback */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSavingSmtp}
                    className="h-13 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSmtp ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري التشفير والحفظ في قاعدة البيانات...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>حفظ إعدادات خادم البريد وتشفير البيانات</span>
                      </>
                    )}
                  </button>

                  {smtpFeedback && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                        smtpFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-950 border border-emerald-200"
                          : "bg-red-50 text-red-950 border border-red-200"
                      }`}
                    >
                      {smtpFeedback.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{smtpFeedback.message}</span>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 3. LIVE CONNECTION TEST & VERIFICATION CARD */}
          <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-gradient-to-b from-white to-slate-50">
            <CardHeader className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-900">
                    فحص الاتصال الفوري وإرسال بريد تجريبي (Live Diagnostics)
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs font-bold mt-0.5">
                    التحقق من صحة بيانات الخادم وكلمة المرور المشفرة عبر إرسال رسالة بريد تجريبية حقيقية
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <div className="relative flex-1 max-w-lg">
                  <input
                    type="email"
                    dir="ltr"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder={smtpConfig.smtp_user || "أدخل البريد المستلم للتجربة (مثال: admin@rfq-sa.com)"}
                    className="w-full h-13 px-4 pl-10 rounded-2xl border-2 border-slate-200 bg-white text-sm font-mono font-bold text-left focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all shadow-xs [direction:ltr]"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={isTestingSmtp}
                  className="h-13 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isTestingSmtp ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري فحص الخادم والمصادقة...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>فحص الاتصال وإرسال بريد تجريبي الآن</span>
                    </>
                  )}
                </button>
              </div>

              {testSmtpFeedback && (
                <div
                  className={`p-4.5 rounded-2xl border text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
                    testSmtpFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                      : "bg-red-50 border-red-200 text-red-950"
                  }`}
                >
                  {testSmtpFeedback.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <p className="font-bold text-xs leading-relaxed">{testSmtpFeedback.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: WHATSAPP GATEWAY (ENCRYPTED & MULTI-PROVIDER) ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "whatsapp" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* 1. SECURITY & ENCRYPTION GUARANTEE BANNER */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-13 h-13 rounded-2xl bg-emerald-600/30 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 shadow-lg">
                  <ShieldCheck className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-white">تشفير وحماية رموز بوابة الواتساب الرسمية</h2>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono text-xs">
                      AES-256-GCM Secure Storage
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed max-w-2xl font-semibold">
                    🔒 يتم تشفير الرموز السرية لـ WhatsApp Cloud API و UltraMsg بنظام التشفير القياسي AES-256-GCM لحماية سرية المراسلات، مع إرسال فوري لتحديثات مراحل الطلب إلى هواتف العملاء والموردين.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border ${
                    whatsappConfig.whatsapp_enabled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {whatsappConfig.whatsapp_enabled ? "خدمة واتساب مفعلة ✓" : "خدمة واتساب معطلة"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. WHATSAPP CONFIGURATION CARD */}
          <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900">
                      إعدادات بوابة واتساب (WhatsApp Gateway API)
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs font-bold mt-0.5">
                      ربط النظام ببوابة WhatsApp الرسمية لإرسال إشعارات الطلبات وتحديثات مراحل التوصيل إلى جوال المستخدم
                    </CardDescription>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-400">مزود الخدمة:</span>
                  {[
                    { label: "Meta Cloud API (الرسمي)", provider: "meta", url: "https://graph.facebook.com/v20.0" },
                    { label: "UltraMsg", provider: "ultramsg", url: "https://api.ultramsg.com" },
                    { label: "Twilio", provider: "twilio", url: "https://api.twilio.com" },
                    { label: "Generic Webhook", provider: "custom", url: "" },
                  ].map((preset) => (
                    <button
                      key={preset.provider}
                      type="button"
                      onClick={() =>
                        setWhatsappConfig((prev) => ({
                          ...prev,
                          whatsapp_provider: preset.provider as any,
                          whatsapp_api_url: preset.url || prev.whatsapp_api_url,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        whatsappConfig.whatsapp_provider === preset.provider
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border-slate-200 text-slate-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
              <form onSubmit={handleSaveWhatsapp} className="space-y-6">
                {/* Master Switch */}
                <div className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">تفعيل الإرسال التلقائي عبر واتساب</p>
                      <p className="text-xs text-slate-500 font-semibold">
                        عند التفعيل، سيتم إرسال رسائل واتساب تفاعلية مباشرة إلى أرقام هواتف العملاء والموردين المسجلة
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappConfig.whatsapp_enabled}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsapp_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Provider Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">نوع المزود (Provider)</label>
                    <select
                      value={whatsappConfig.whatsapp_provider}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsapp_provider: e.target.value as any })}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="meta">Meta WhatsApp Cloud API (Official)</option>
                      <option value="ultramsg">UltraMsg API (Instance)</option>
                      <option value="twilio">Twilio Programmable Messaging</option>
                      <option value="custom">Custom Webhook Gateway</option>
                    </select>
                  </div>

                  {/* API URL */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">عنوان الرابط (API Base URL / Endpoint)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={whatsappConfig.whatsapp_api_url}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsapp_api_url: e.target.value })}
                      placeholder="https://graph.facebook.com/v20.0"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold text-left focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 [direction:ltr]"
                      required
                    />
                  </div>

                  {/* Phone Number ID / Instance ID */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">
                      {whatsappConfig.whatsapp_provider === "ultramsg" ? "معرف النموذج (Instance ID)" : "معرف رقم الهاتف (Phone Number ID / SID)"}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={whatsappConfig.whatsapp_phone_number_id}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsapp_phone_number_id: e.target.value })}
                      placeholder={whatsappConfig.whatsapp_provider === "ultramsg" ? "instance12345" : "109384729182736"}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold text-left focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 [direction:ltr]"
                    />
                  </div>

                  {/* API Token / Key (Encrypted in DB) */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>رمز الوصول السري (API Token / Secret Key)</span>
                      </span>
                      {whatsappHasTokenSaved && (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          مشفر بـ AES-256
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showWhatsappToken ? "text" : "password"}
                        dir="ltr"
                        value={whatsappConfig.whatsapp_api_token}
                        onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsapp_api_token: e.target.value })}
                        placeholder={whatsappHasTokenSaved ? "•••••••• (اتركه كما هو إذا لم ترغب بالتغيير)" : "أدخل رمز الوصول الدائم للواتساب"}
                        className="w-full h-12 px-4 pl-11 rounded-xl border border-slate-200 text-sm font-mono font-bold text-left focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 [direction:ltr]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showWhatsappToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* From Phone Number */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">رقم الهاتف الظاهر للمرسل (From Phone)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={whatsappConfig.whatsapp_from_phone}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsapp_from_phone: e.target.value })}
                      placeholder="+966500000000"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold text-left focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 [direction:ltr]"
                    />
                  </div>
                </div>

                {/* Auto Order Updates Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors w-fit">
                    <input
                      type="checkbox"
                      checked={whatsappConfig.whatsapp_auto_order_updates}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, whatsapp_auto_order_updates: e.target.checked })}
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-900">إرسال تحديثات مراحل مسار الطلب آلياً على واتساب العملاء والموردين</p>
                      <p className="text-[11px] text-slate-500 font-semibold">يشمل: طلب تسعير جديد، صدور عرض سعر، تأكيد صفقة، استلام الشحنة، كود الاستلام OTP، وإكمال الطلب</p>
                    </div>
                  </label>
                </div>

                {/* Submit & Feedback */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSavingWhatsapp}
                    className="h-13 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingWhatsapp ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري التشفير والحفظ في قاعدة البيانات...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>حفظ إعدادات بوابة واتساب وتشفير الرمز</span>
                      </>
                    )}
                  </button>

                  {whatsappFeedback && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                        whatsappFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-950 border border-emerald-200"
                          : "bg-red-50 text-red-950 border border-red-200"
                      }`}
                    >
                      {whatsappFeedback.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{whatsappFeedback.message}</span>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 3. LIVE CONNECTION TEST FOR WHATSAPP */}
          <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-gradient-to-b from-white to-slate-50">
            <CardHeader className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-900">
                    فحص الاتصال الفوري وإرسال رسالة واتساب تجريبية (Live Diagnostics)
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs font-bold mt-0.5">
                    التحقق من صحة بوابة واتساب ورمز الوصول المشفر عبر إرسال رسالة اختبارية إلى رقم جوال حقيقي
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <div className="relative flex-1 max-w-lg">
                  <input
                    type="text"
                    dir="ltr"
                    value={testWhatsappRecipient}
                    onChange={(e) => setTestWhatsappRecipient(e.target.value)}
                    placeholder="أدخل رقم الجوال للتجربة (مثال: 0501234567 أو 966501234567)"
                    className="w-full h-13 px-4 pl-10 rounded-2xl border-2 border-slate-200 bg-white text-sm font-mono font-bold text-left focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all shadow-xs [direction:ltr]"
                  />
                  <MessageCircle className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                <button
                  type="button"
                  onClick={handleTestWhatsapp}
                  disabled={isTestingWhatsapp}
                  className="h-13 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isTestingWhatsapp ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري فحص البوابة والمصادقة...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>إرسال رسالة واتساب تجريبية الآن</span>
                    </>
                  )}
                </button>
              </div>

              {testWhatsappFeedback && (
                <div
                  className={`p-4.5 rounded-2xl border text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
                    testWhatsappFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                      : "bg-red-50 border-red-200 text-red-950"
                  }`}
                >
                  {testWhatsappFeedback.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <p className="font-bold text-xs leading-relaxed">{testWhatsappFeedback.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: ADMIN PROFILE & SECURITY ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
          {/* Profile Overview Card */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden bg-white lg:col-span-1">
            <div className="p-6 bg-gradient-to-br from-slate-900 to-blue-950 text-white text-center relative overflow-hidden">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-600/30 border-2 border-white/20 flex items-center justify-center text-3xl font-black shadow-inner">
                {adminForm.full_name?.slice(0, 2) || "مش"}
              </div>
              <h2 className="text-xl font-black mt-3">{adminForm.full_name || "المشرف العام"}</h2>
              <p className="text-xs text-blue-200 font-semibold mt-0.5">{adminForm.job_title}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge className="bg-blue-600 text-white border-0 font-bold px-3 py-1">
                  {metrics?.admin_profile.ref_code || "ADM-001"}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold px-3 py-1">
                  حساب نشط
                </Badge>
              </div>
            </div>

            <CardContent className="p-6 space-y-4 text-xs font-semibold">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">البريد الإلكتروني</span>
                <span className="font-mono text-slate-800 font-bold">{adminForm.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">رقم الجوال</span>
                <span className="font-mono text-slate-800 font-bold text-left" dir="ltr">{adminForm.phone}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">آخر تسجيل دخول</span>
                <span className="text-slate-800 font-bold">منذ 15 دقيقة (جلسة نشطة)</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">مستوى الصلاحية</span>
                <span className="font-black text-blue-600">Super Administrator</span>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile & Password Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Edit Personal Data */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-lg font-black text-slate-900">البيانات الشخصية للمشرف</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold">
                  تعديل الاسم والمسمى الوظيفي وبيانات التواصل الرسمية المعتمدة
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">الاسم الكامل للمشرف</label>
                      <input
                        type="text"
                        value={adminForm.full_name}
                        onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">المسمى الوظيفي</label>
                      <input
                        type="text"
                        value={adminForm.job_title}
                        onChange={(e) => setAdminForm({ ...adminForm, job_title: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">البريد الإلكتروني المعتمد</label>
                      <input
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">رقم الجوال للإشعارات الأمنية</label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={adminForm.phone}
                        onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                        placeholder="+966 50 123 4567"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600 text-left [direction:ltr]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>حفظ البيانات الشخصية</span>
                    </button>

                    {profileFeedback && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                        {profileFeedback}
                      </span>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Change Password & 2FA */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-lg font-black text-slate-900">الأمان وكلمة المرور</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold">
                  تغيير كلمة المرور وتفعيل المصادقة الثنائية لحماية حساب المشرف
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* 2FA Status Box */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">المصادقة الثنائية (2FA Security)</p>
                      <p className="text-xs text-slate-500 font-semibold">
                        {twoFactorEnabled ? "مفعلة وتتطلب كود التحقق عند تسجيل الدخول" : "معطلة - ننصح بتفعيلها فوراً"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggle2FA}
                    disabled={isToggling2FA}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      twoFactorEnabled
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200"
                        : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                    }`}
                  >
                    {isToggling2FA ? "جاري التحديث..." : twoFactorEnabled ? "مفعلة بنجاح ✓" : "تفعيل الآن"}
                  </button>
                </div>

                {/* Password Form */}
                <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">كلمة المرور الجديدة</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwords.new_password}
                          onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full h-12 px-4 pl-10 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">تأكيد كلمة المرور الجديدة</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwords.confirm_password}
                        onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>
                  </div>

                  {passwordFeedback && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-bold ${
                        passwordFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {passwordFeedback.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    <span>تحديث كلمة المرور</span>
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: REAL SERVER METRICS & CLOUD INFRASTRUCTURE ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "server" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Key Metric Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* CPU */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm p-6 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">المعالج السحابي (vCPU)</span>
                <Cpu className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {metrics?.server.cpu.cores} Cores
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>معدل التحميل (Load):</span>
                  <span className="font-mono">{metrics?.server.cpu.load_avg_1m}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{metrics?.server.cpu.model}</p>
              </div>
            </Card>

            {/* RAM */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm p-6 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">الذاكرة العشوائية (RAM)</span>
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {metrics?.server.memory.percent}% <span className="text-xs text-slate-400 font-normal">مستخدم</span>
              </p>
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${metrics?.server.memory.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-bold">
                  <span>{metrics?.server.memory.used_mb} MB مستخدم</span>
                  <span>{metrics?.server.memory.total_mb} MB الإجمالي</span>
                </div>
              </div>
            </Card>

            {/* Disk */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm p-6 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">سعة القرص الصلب (SSD)</span>
                <HardDrive className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {metrics?.server.disk.used_gb} GB / {metrics?.server.disk.total_gb} GB
              </p>
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${metrics?.server.disk.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-bold">
                  <span>متبقي {metrics?.server.disk.free_gb} GB متاح</span>
                  <span>استهلاك {metrics?.server.disk.percent}%</span>
                </div>
              </div>
            </Card>

            {/* Uptime */}
            <Card className="rounded-3xl border border-slate-200 shadow-sm p-6 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">مدة تشغيل الخادم (Uptime)</span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-lg font-black text-slate-900 truncate">
                {metrics?.server.uptime_human}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>تشغيل متواصل بدون توقف</span>
              </div>
            </Card>
          </div>

          {/* Infrastructure Topology Card */}
          <Card className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900">طوبولوجيا الخدمات وعناوين الربط</CardTitle>
                    <CardDescription className="text-slate-500 text-xs font-bold">
                      التفاصيل التقنية للبيئة والشهادات ومنافذ التشغيل
                    </CardDescription>
                  </div>
                </div>

                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono font-bold">
                  HTTPS / TLS 1.3 Active
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 divide-y divide-slate-100">
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-800">عنوان خادم الإنتاج (VPS IP)</p>
                  <p className="text-xs text-slate-400">خادم مخصص لاستضافة منصة RFQ</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black bg-slate-100 px-3 py-1.5 rounded-xl text-slate-800">
                    {metrics?.server.host}
                  </span>
                  <button
                    onClick={() => handleCopy(metrics?.server.host || "", "host")}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {copiedKey === "host" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-800">بيئة تشغيل العمليات (Node.js & PM2)</p>
                  <p className="text-xs text-slate-400">إدارة الخدمة الخلفية بمنفذ داخلي 3002</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl">
                    Node {metrics?.server.node_version}
                  </span>
                  <span className="font-mono text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl">
                    PM2 process: rfq (online)
                  </span>
                </div>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-800">النطاق الرسمي والشهادة الأمنية (SSL)</p>
                  <p className="text-xs text-slate-400">Let&apos;s Encrypt / Cloudflare Edge Proxy</p>
                </div>
                <a
                  href={`https://${metrics?.server.domain}`}
                  target="_blank"
                  className="font-mono text-xs font-black text-blue-600 hover:underline flex items-center gap-1.5"
                >
                  <span>https://{metrics?.server.domain}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-800">نظام التشغيل والتوزيعة (Linux Distribution)</p>
                  <p className="text-xs text-slate-400">نواة لينكس محدثة مع جدار ناري نشط</p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">
                  {metrics?.server.os}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: PLATFORM DATA & INSTANT BACKUP ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "data" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Data Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <Card className="p-6 rounded-3xl border border-slate-200 bg-white text-center space-y-2">
              <Users className="w-8 h-8 text-blue-600 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">إجمالي المستخدمين المسجلين</p>
              <p className="text-3xl font-black text-slate-900">{metrics?.stats.users_count}</p>
              <p className="text-[11px] text-slate-400">{metrics?.stats.clients_count} عميل · {metrics?.stats.vendors_count} مورد</p>
            </Card>

            <Card className="p-6 rounded-3xl border border-slate-200 bg-white text-center space-y-2">
              <FileText className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">طلبات عروض الأسعار (RFQs)</p>
              <p className="text-3xl font-black text-slate-900">{metrics?.stats.rfqs_count}</p>
              <p className="text-[11px] text-slate-400">طلبات نشطة ومنتهية الصلاحية</p>
            </Card>

            <Card className="p-6 rounded-3xl border border-slate-200 bg-white text-center space-y-2">
              <ShoppingBag className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">أوامر الشراء والصفقات</p>
              <p className="text-3xl font-black text-slate-900">{metrics?.stats.orders_count}</p>
              <p className="text-[11px] text-slate-400">صفقات معتمدة ومسجلة</p>
            </Card>

            <Card className="p-6 rounded-3xl border border-slate-200 bg-white text-center space-y-2">
              <Receipt className="w-8 h-8 text-violet-600 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">عروض أسعار الموردين</p>
              <p className="text-3xl font-black text-slate-900">{metrics?.stats.quotes_count}</p>
              <p className="text-[11px] text-slate-400">تسعيرات مسجلة في التنافس</p>
            </Card>
          </div>

          {/* Backup Download Action Card */}
          <Card className="p-8 rounded-3xl border-2 border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <FileJson className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-black">تصدير وتنزيل نسخة احتياطية فورية (JSON Backup)</h3>
              </div>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                يتيح لك تنزيل نسخة احتياطية شاملة تتضمن إعدادات النظام، قياسات الخادم، ملف المشرف، وكافة السياسات المعتمدة بنقرة زر واحدة للاحتفاظ بها في أمان.
              </p>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="h-13 px-8 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm transition-all shadow-lg shadow-blue-600/40 flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>تنزيل النسخة الاحتياطية الآن</span>
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}


