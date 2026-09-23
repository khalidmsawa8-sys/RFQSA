/**
 * Enterprise RBAC Permission Taxonomy & Policy Engine (v2 - Dynamic Studio Edition)
 * Strongly typed permission taxonomy, category modules, sensitive indicators,
 * role presets, and strict calculation of effective permissions.
 */

export type SystemPermission =
  // ── 1. RFQ & REQUISITIONS ──
  | "rfqs:view"
  | "rfqs:view_all"
  | "rfqs:create"
  | "rfqs:update"
  | "rfqs:cancel"
  | "rfqs:assign"
  | "rfqs:manage"

  // ── 2. QUOTES & PRICING ──
  | "quotes:view"
  | "quotes:view_all"
  | "quotes:view_radar"
  | "quotes:create"
  | "quotes:update"
  | "quotes:accept"
  | "quotes:reject"

  // ── 3. ORDERS & FULFILLMENT ──
  | "orders:view"
  | "orders:view_all"
  | "orders:update_status"
  | "orders:dispatch"
  | "orders:dispute"

  // ── 4. FINANCE, INVOICES & PAYOUTS ──
  | "finance:view"
  | "finance:view_all"
  | "finance:invoice"
  | "finance:payment"
  | "finance:payout"
  | "finance:bank_account"
  | "finance:audit_vat"
  | "finance:export_reports"

  // ── 5. LOGISTICS, FLEET & BRANCH ──
  | "branch:manage_location"
  | "fleet:manage"
  | "delivery:assign_courier"

  // ── 6. TEAM, MEMBERS & MULTI-TENANT ──
  | "team:view"
  | "team:invite"
  | "team:update"
  | "team:suspend"
  | "team:remove"
  | "organization:update"
  | "organization:transfer_ownership"

  // ── 7. AUDIT & ACTIVITY LOGS ──
  | "audit:view"
  | "audit:export"

  // ── 8. PLATFORM SUPER ADMIN & COMPLIANCE ──
  | "admin:system_settings"
  | "admin:manage_users"
  | "admin:view_profiles"
  | "admin:verify_users"
  | "admin:manage_couriers"
  | "admin:view_audit_logs";

export type RoleScope = "platform" | "client" | "vendor";

export type PermissionModule =
  | "rfqs"
  | "quotes"
  | "orders"
  | "finance"
  | "logistics"
  | "team"
  | "compliance"
  | "admin"
  | "audit";

export interface PermissionDefinition {
  key: SystemPermission;
  module: PermissionModule;
  moduleNameAr: string;
  resource: string;
  action: "view" | "create" | "update" | "delete" | "manage" | "approve" | "export" | "audit";
  labelAr: string;
  labelEn: string;
  descAr: string;
  isSensitive: boolean;
  allowedScopes: RoleScope[];
}

/**
 * ── FULL STRONGLY-TYPED ENTERPRISE PERMISSION CATALOG ──
 */
export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // ── MODULE: RFQS ──
  {
    key: "rfqs:view",
    module: "rfqs",
    moduleNameAr: "طلبات التسعير (RFQs)",
    resource: "rfq",
    action: "view",
    labelAr: "استعراض طلبات تسعير المنشأة",
    labelEn: "View Organization RFQs",
    descAr: "الاطلاع على طلبات قطع الغيار المرفوعة من قبل منشأة العميل ومتابعة حالتها",
    isSensitive: false,
    allowedScopes: ["client", "platform"],
  },
  {
    key: "rfqs:view_all",
    module: "rfqs",
    moduleNameAr: "طلبات التسعير (RFQs)",
    resource: "rfq",
    action: "view",
    labelAr: "استعراض كافة طلبات المنصة عالمياً",
    labelEn: "View All Platform RFQs",
    descAr: "مراقبة والاطلاع على كافة طلبات التسعير على مستوى المنصة لجميع العملاء",
    isSensitive: false,
    allowedScopes: ["platform"],
  },
  {
    key: "rfqs:create",
    module: "rfqs",
    moduleNameAr: "طلبات التسعير (RFQs)",
    resource: "rfq",
    action: "create",
    labelAr: "إنشاء ورفع طلبات تسعير جديدة",
    labelEn: "Create New RFQ",
    descAr: "إدخال بيانات السيارات، أرقام الهياكل (VIN)، ومواصفات قطع الغيار المطلوبة",
    isSensitive: false,
    allowedScopes: ["client"],
  },
  {
    key: "rfqs:update",
    module: "rfqs",
    moduleNameAr: "طلبات التسعير (RFQs)",
    resource: "rfq",
    action: "update",
    labelAr: "تعديل تفاصيل ومرفقات الطلب",
    labelEn: "Update RFQ Details",
    descAr: "تحديث مواصفات القطع، الصور التوضيحية، وعناوين الفروع المستلمة",
    isSensitive: false,
    allowedScopes: ["client", "platform"],
  },
  {
    key: "rfqs:cancel",
    module: "rfqs",
    moduleNameAr: "طلبات التسعير (RFQs)",
    resource: "rfq",
    action: "delete",
    labelAr: "إلغاء وإغلاق طلب التسعير",
    labelEn: "Cancel RFQ",
    descAr: "إيقاف استقبال العروض وإلغاء طلب التسعير المفتوح قبل الشراء",
    isSensitive: false,
    allowedScopes: ["client", "platform"],
  },
  {
    key: "rfqs:assign",
    module: "rfqs",
    moduleNameAr: "طلبات التسعير (RFQs)",
    resource: "rfq",
    action: "manage",
    labelAr: "إسناد الطلب لموظف أو فرع محدد",
    labelEn: "Assign RFQ to Staff",
    descAr: "توزيع وإسناد مسؤولية متابعة طلب الشراء لموظف أو مهندس معين",
    isSensitive: false,
    allowedScopes: ["client", "platform"],
  },
  {
    key: "rfqs:manage",
    module: "rfqs",
    moduleNameAr: "طلبات التسعير (RFQs)",
    resource: "rfq",
    action: "manage",
    labelAr: "إدارة وتدخل شامل في طلبات التسعير",
    labelEn: "Full RFQ Management Override",
    descAr: "صلاحية إدارية عليا للتدخل في مسار وتعديل أي طلب تسعير في المنصة",
    isSensitive: true,
    allowedScopes: ["platform"],
  },

  // ── MODULE: QUOTES ──
  {
    key: "quotes:view",
    module: "quotes",
    moduleNameAr: "عروض الأسعار (Quotes)",
    resource: "quote",
    action: "view",
    labelAr: "استعراض عروض الأسعار المستلمة",
    labelEn: "View Received Quotes",
    descAr: "استعراض تفاصيل العروض المقدمة من الموردين ومقارنة الأسعار وفترات الضمان",
    isSensitive: false,
    allowedScopes: ["client", "platform"],
  },
  {
    key: "quotes:view_all",
    module: "quotes",
    moduleNameAr: "عروض الأسعار (Quotes)",
    resource: "quote",
    action: "view",
    labelAr: "استعراض كافة عروض المنصة",
    labelEn: "View All Quotes Platform-wide",
    descAr: "مراقبة والاطلاع على أسعار وعروض الموردين لكافة الصفقات الجارية",
    isSensitive: false,
    allowedScopes: ["platform"],
  },
  {
    key: "quotes:view_radar",
    module: "quotes",
    moduleNameAr: "عروض الأسعار (Quotes)",
    resource: "quote",
    action: "view",
    labelAr: "استعراض رادار طلبات السوق المفتوحة",
    labelEn: "View Live RFQ Radar",
    descAr: "مراقبة الطلبات المفتوحة المطابقة لتخصص المورد الجغرافي ونوع قطع الغيار",
    isSensitive: false,
    allowedScopes: ["vendor", "platform"],
  },
  {
    key: "quotes:create",
    module: "quotes",
    moduleNameAr: "عروض الأسعار (Quotes)",
    resource: "quote",
    action: "create",
    labelAr: "تقديم وتسعير عروض الأسعار",
    labelEn: "Submit Quote Offer",
    descAr: "إرسال عروض الأسعار وتحديد نوع القطعة (أصلي/تجاري) ومدة الضمان",
    isSensitive: false,
    allowedScopes: ["vendor"],
  },
  {
    key: "quotes:update",
    module: "quotes",
    moduleNameAr: "عروض الأسعار (Quotes)",
    resource: "quote",
    action: "update",
    labelAr: "تعديل عرض السعر قبل قبوله",
    labelEn: "Update Quote",
    descAr: "تحديث السعر أو مدة التجهيز لعرض السعر قبل قيام العميل بالترسية",
    isSensitive: false,
    allowedScopes: ["vendor"],
  },
  {
    key: "quotes:accept",
    module: "quotes",
    moduleNameAr: "عروض الأسعار (Quotes)",
    resource: "quote",
    action: "approve",
    labelAr: "قبول وترسية عروض الأسعار والشراء",
    labelEn: "Accept Quote & Purchase",
    descAr: "اعتماد العرض الفائز وتحويله إلى صفقة شراء مؤكدة والدفع",
    isSensitive: true,
    allowedScopes: ["client"],
  },
  {
    key: "quotes:reject",
    module: "quotes",
    moduleNameAr: "عروض الأسعار (Quotes)",
    resource: "quote",
    action: "delete",
    labelAr: "رفض واستبعاد عروض الأسعار",
    labelEn: "Reject Quote",
    descAr: "استبعاد العروض غير المناسبة أو غير المطابقة للمواصفات",
    isSensitive: false,
    allowedScopes: ["client"],
  },

  // ── MODULE: ORDERS ──
  {
    key: "orders:view",
    module: "orders",
    moduleNameAr: "الطلبات والتوريد (Orders)",
    resource: "order",
    action: "view",
    labelAr: "استعراض تفاصيل وتتبع الطلبات المؤكدة",
    labelEn: "View Confirmed Orders",
    descAr: "متابعة حالة التجهيز، موقع الشحنة، تفاصيل القطع المشتراة، ومواعيد التسليم",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "orders:view_all",
    module: "orders",
    moduleNameAr: "الطلبات والتوريد (Orders)",
    resource: "order",
    action: "view",
    labelAr: "استعراض كافة طلبات وشحنات المنصة",
    labelEn: "View All Platform Orders",
    descAr: "مراقبة العمليات اللوجستية وتدفق الصفقات لجميع منشآت المنصة",
    isSensitive: false,
    allowedScopes: ["platform"],
  },
  {
    key: "orders:update_status",
    module: "orders",
    moduleNameAr: "الطلبات والتوريد (Orders)",
    resource: "order",
    action: "update",
    labelAr: "تحديث مسار وحالة تجهيز الطلب",
    labelEn: "Update Fulfillment Status",
    descAr: "تحديث حالة الطلب (تم التجهيز، تم الشحن، جاري التسليم، تأكيد واستلام)",
    isSensitive: false,
    allowedScopes: ["vendor", "platform"],
  },
  {
    key: "orders:dispatch",
    module: "orders",
    moduleNameAr: "الطلبات والتوريد (Orders)",
    resource: "order",
    action: "manage",
    labelAr: "تسليم الشحنات وتأكيد رمز الاستلام",
    labelEn: "Dispatch & Confirm Handover",
    descAr: "تأكيد تسليم القطع للمندوب أو للعميل في الفرع وإدخال كود التسليم OTP",
    isSensitive: false,
    allowedScopes: ["vendor", "platform"],
  },
  {
    key: "orders:dispute",
    module: "orders",
    moduleNameAr: "الطلبات والتوريد (Orders)",
    resource: "order",
    action: "manage",
    labelAr: "فتح وإدارة النزاعات وبلاغات الضمان",
    labelEn: "Manage Disputes & Warranty",
    descAr: "رفع شكاوى عدم المطابقة، تلف القطع، التأخير، وطلب الاستبدال أو الإرجاع",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },

  // ── MODULE: FINANCE ──
  {
    key: "finance:view",
    module: "finance",
    moduleNameAr: "المالية والمحفظة (Finance)",
    resource: "finance",
    action: "view",
    labelAr: "استعراض الرصيد والحركات المالية للمنشأة",
    labelEn: "View Financial Ledger",
    descAr: "الاطلاع على كشف الحساب، رصيد المحفظة، والأرباح المعلقة والمتاحة",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "finance:view_all",
    module: "finance",
    moduleNameAr: "المالية والمحفظة (Finance)",
    resource: "finance",
    action: "view",
    labelAr: "استعراض القوائم المالية الشاملة للمنصة",
    labelEn: "View All Platform Ledgers",
    descAr: "مراقبة القيود المزدوجة، إجمالي العمولات، وأرصدة كافة المنشآت",
    isSensitive: true,
    allowedScopes: ["platform"],
  },
  {
    key: "finance:invoice",
    module: "finance",
    moduleNameAr: "المالية والمحفظة (Finance)",
    resource: "invoice",
    action: "export",
    labelAr: "تحميل وطباعة الفواتير الضريبية (ZATCA)",
    labelEn: "Download Tax Invoices",
    descAr: "استخراج الفواتير الضريبية الإلكترونية المعتمدة وإشعارات الخصم والإضافة",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "finance:payment",
    module: "finance",
    moduleNameAr: "المالية والمحفظة (Finance)",
    resource: "payment",
    action: "approve",
    labelAr: "اعتماد الدفع وشحن رصيد المحفظة",
    labelEn: "Authorize Payments & Top-ups",
    descAr: "خصم مبالغ الشراء من رصيد المنشأة وإجراء التحويلات البنكية للمحفظة",
    isSensitive: true,
    allowedScopes: ["client"],
  },
  {
    key: "finance:payout",
    module: "finance",
    moduleNameAr: "المالية والمحفظة (Finance)",
    resource: "payout",
    action: "manage",
    labelAr: "طلب واعتماد سحب الأرباح للحساب البنكي",
    labelEn: "Request Bank Payouts",
    descAr: "سحب أرباح المبيعات من محفظة المتجر إلى الحساب البنكي الرسمي للمنشأة",
    isSensitive: true,
    allowedScopes: ["vendor", "platform"],
  },
  {
    key: "finance:bank_account",
    module: "finance",
    moduleNameAr: "المالية والمحفظة (Finance)",
    resource: "bank_account",
    action: "update",
    labelAr: "إدارة وتعديل الحسابات البنكية والآيبان",
    labelEn: "Manage Bank Accounts & IBAN",
    descAr: "إضافة أو تعديل رقم الآيبان والشهادات البنكية المعتمدة لاستلام الحوالات",
    isSensitive: true,
    allowedScopes: ["vendor", "platform"],
  },
  {
    key: "finance:audit_vat",
    module: "finance",
    moduleNameAr: "المالية والمحفظة (Finance)",
    resource: "vat",
    action: "audit",
    labelAr: "تدقيق الضرائب والإقرارات الزكوية",
    labelEn: "Audit VAT & Tax Returns",
    descAr: "مطابقة ضريبة القيمة المضافة ومراجعة تقارير الهيئة العامة للزكاة والجمارك",
    isSensitive: true,
    allowedScopes: ["platform"],
  },
  {
    key: "finance:export_reports",
    module: "finance",
    moduleNameAr: "المالية والمحفظة (Finance)",
    resource: "reports",
    action: "export",
    labelAr: "تصدير التقارير المالية وكشوفات الحساب",
    labelEn: "Export Financial Reports",
    descAr: "تصدير القيود المحاسبية ومبيعات ومشتريات المنشأة بصيغ Excel / PDF",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },

  // ── MODULE: LOGISTICS & FLEET ──
  {
    key: "branch:manage_location",
    module: "logistics",
    moduleNameAr: "اللوجستيات والفروع (Logistics & Fleet)",
    resource: "location",
    action: "manage",
    labelAr: "إدارة الفروع ومواقع الاستلام والتسليم",
    labelEn: "Manage Branch Locations",
    descAr: "إضافة الفروع على الخريطة وتحديد أوقات العمل ونقاط التسليم السريع",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "fleet:manage",
    module: "logistics",
    moduleNameAr: "اللوجستيات والفروع (Logistics & Fleet)",
    resource: "fleet",
    action: "manage",
    labelAr: "إدارة المرآب وأسطول سيارات المنشأة",
    labelEn: "Manage Garage & Fleet Vehicles",
    descAr: "تسجيل المركبات، أرقام اللوحات، سجلات الصيانة، وجدولة طلبات القطع",
    isSensitive: false,
    allowedScopes: ["client", "platform"],
  },
  {
    key: "delivery:assign_courier",
    module: "logistics",
    moduleNameAr: "اللوجستيات والفروع (Logistics & Fleet)",
    resource: "courier",
    action: "manage",
    labelAr: "إسناد مهام الشحن لمناديب التوصيل",
    labelEn: "Assign Couriers to Orders",
    descAr: "توجيه الشحنات السريعة للمناديب ومتابعة مسار التوصيل الجغرافي",
    isSensitive: false,
    allowedScopes: ["platform"],
  },

  // ── MODULE: TEAM & MULTI-TENANT ──
  {
    key: "team:view",
    module: "team",
    moduleNameAr: "إدارة الفريق والأعضاء (Team & RBAC)",
    resource: "team_member",
    action: "view",
    labelAr: "استعراض أعضاء الفريق وموظفي المنشأة",
    labelEn: "View Team Members",
    descAr: "الاطلاع على قائمة الموظفين، الأدوار الوظيفية المسندة، وحالات العضوية",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "team:invite",
    module: "team",
    moduleNameAr: "إدارة الفريق والأعضاء (Team & RBAC)",
    resource: "invitation",
    action: "create",
    labelAr: "دعوة موظفين جدد للانضمام للمنشأة",
    labelEn: "Invite New Team Members",
    descAr: "إرسال دعوات عبر البريد الإلكتروني أو الرسائل وتحديد الدور الوظيفي",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "team:update",
    module: "team",
    moduleNameAr: "إدارة الفريق والأعضاء (Team & RBAC)",
    resource: "team_member",
    action: "update",
    labelAr: "تعديل أدوار وصلاحيات موظفي المنشأة",
    labelEn: "Update Member Roles & Permissions",
    descAr: "تغيير الأدوار الوظيفية وتخصيص استثناءات الصلاحيات الفردية للأعضاء",
    isSensitive: true,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "team:suspend",
    module: "team",
    moduleNameAr: "إدارة الفريق والأعضاء (Team & RBAC)",
    resource: "team_member",
    action: "update",
    labelAr: "تعليق وإيقاف عضوية موظف مؤقتاً",
    labelEn: "Suspend Team Member",
    descAr: "حظر تسجيل دخول الموظف وتجميد صلاحياته مؤقتاً دون حذف بياناته",
    isSensitive: true,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "team:remove",
    module: "team",
    moduleNameAr: "إدارة الفريق والأعضاء (Team & RBAC)",
    resource: "team_member",
    action: "delete",
    labelAr: "حذف وإنهاء وصول موظف من المنشأة",
    labelEn: "Remove Member from Organization",
    descAr: "إلغاء ارتباط الموظف بالمنشأة نهائياً وسحب كافة صلاحياته",
    isSensitive: true,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "organization:update",
    module: "team",
    moduleNameAr: "إدارة الفريق والأعضاء (Team & RBAC)",
    resource: "organization",
    action: "update",
    labelAr: "تعديل الملف والبيانات التجارية للمنشأة",
    labelEn: "Update Organization Profile",
    descAr: "تحديث الاسم التجاري، السجل، الرقم الضريبي، وبيانات التواصل",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "organization:transfer_ownership",
    module: "team",
    moduleNameAr: "إدارة الفريق والأعضاء (Team & RBAC)",
    resource: "organization",
    action: "manage",
    labelAr: "نقل الملكية القانونية لحساب المنشأة",
    labelEn: "Transfer Organization Ownership",
    descAr: "التنازل عن الحساب الرئيسي وتعيين مالك جديد مع نقل كافة المسؤوليات القانونية",
    isSensitive: true,
    allowedScopes: ["client", "vendor", "platform"],
  },

  // ── MODULE: AUDIT ──
  {
    key: "audit:view",
    module: "audit",
    moduleNameAr: "سجل التدقيق والأمان (Audit & Compliance)",
    resource: "audit_log",
    action: "view",
    labelAr: "الاطلاع على سجل تتبع النشاطات والأمان",
    labelEn: "View Activity Audit Logs",
    descAr: "مراقبة سجل الأحداث غير القابل للتعديل، معرفة من قام بالتعديل وتوقيته",
    isSensitive: false,
    allowedScopes: ["client", "vendor", "platform"],
  },
  {
    key: "audit:export",
    module: "audit",
    moduleNameAr: "سجل التدقيق والأمان (Audit & Compliance)",
    resource: "audit_log",
    action: "export",
    labelAr: "تصدير سجل التدقيق الأمني وتقارير الامتثال",
    labelEn: "Export Audit Logs",
    descAr: "استخراج ملفات التدقيق الأمني للجهات الرقابية والمراجعين الخارجيين",
    isSensitive: true,
    allowedScopes: ["client", "vendor", "platform"],
  },

  // ── MODULE: ADMIN & COMPLIANCE ──
  {
    key: "admin:system_settings",
    module: "admin",
    moduleNameAr: "إدارة النظام والمنصة (Super Admin)",
    resource: "system_settings",
    action: "manage",
    labelAr: "إدارة إعدادات المنصة وعمولات النظام والـ RBAC",
    labelEn: "Manage System Settings & RBAC",
    descAr: "صلاحية عليا للتحكم في نسب العمولات، الأدوار المخصصة، وإعدادات البنية",
    isSensitive: true,
    allowedScopes: ["platform"],
  },
  {
    key: "admin:manage_users",
    module: "admin",
    moduleNameAr: "إدارة النظام والمنصة (Super Admin)",
    resource: "user",
    action: "manage",
    labelAr: "إدارة وتعديل حسابات المستخدمين والمشرفين",
    labelEn: "Manage All Platform Users",
    descAr: "إعادة ضبط كلمات المرور، تفعيل الحسابات، وتعيين أدوار المشرفين",
    isSensitive: true,
    allowedScopes: ["platform"],
  },
  {
    key: "admin:view_profiles",
    module: "admin",
    moduleNameAr: "إدارة النظام والمنصة (Super Admin)",
    resource: "profile",
    action: "view",
    labelAr: "استعراض السجلات والملفات الموثقة للشركات",
    labelEn: "View Verified Enterprise Profiles",
    descAr: "فحص رخص مزاولة النشاط، السجلات التجارية، وعناوين الفروع المعتمدة",
    isSensitive: false,
    allowedScopes: ["platform"],
  },
  {
    key: "admin:verify_users",
    module: "admin",
    moduleNameAr: "إدارة النظام والمنصة (Super Admin)",
    resource: "verification",
    action: "approve",
    labelAr: "اعتماد وتوثيق السجلات التجارية والمتاجر",
    labelEn: "Approve Enterprise Verification",
    descAr: "منح الشارة الزرقاء الموثقة للمنشآت بعد مراجعة بيانات وزارة التجارة",
    isSensitive: true,
    allowedScopes: ["platform"],
  },
  {
    key: "admin:manage_couriers",
    module: "admin",
    moduleNameAr: "إدارة النظام والمنصة (Super Admin)",
    resource: "courier",
    action: "manage",
    labelAr: "إدارة وتعيين وتفعيل مناديب التوصيل",
    labelEn: "Manage & Onboard Couriers",
    descAr: "اعتماد رخص قيادة المناديب ومراجعة كشوفات التسليم اليومية",
    isSensitive: false,
    allowedScopes: ["platform"],
  },
  {
    key: "admin:view_audit_logs",
    module: "admin",
    moduleNameAr: "إدارة النظام والمنصة (Super Admin)",
    resource: "platform_audit",
    action: "audit",
    labelAr: "استعراض السجل الأمني الموحد لعمليات المشرفين",
    labelEn: "View Global Staff Audit Trail",
    descAr: "مراقبة كافة تعديلات المشرفين وتعيينات الأدوار والعمليات الحساسة",
    isSensitive: true,
    allowedScopes: ["platform"],
  },
];

/**
 * ── SENSITIVE PERMISSIONS CATALOG ──
 */
export const SENSITIVE_PERMISSIONS: Set<SystemPermission> = new Set(
  PERMISSION_CATALOG.filter((p) => p.isSensitive).map((p) => p.key)
);

/**
 * ── SYSTEM ROLES IDENTIFIERS (Protected) ──
 */
export type RoleId =
  // Platform Staff
  | "platform_super_admin"
  | "platform_rfq_monitor"
  | "platform_accountant"
  | "platform_compliance"
  | "platform_support"
  // Client Enterprise Roles
  | "client_owner"
  | "client_procurement_manager"
  | "client_rfq_supervisor"
  | "client_accountant"
  | "client_technician"
  // Vendor Store Roles
  | "vendor_owner"
  | "vendor_sales_agent"
  | "vendor_warehouse_clerk"
  | "vendor_accountant"
  // Dynamic string for custom roles
  | (string & {});

/**
 * ── SYSTEM ROLE DEFAULT PERMISSIONS (Immutable Baseline) ──
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, SystemPermission[]> = {
  // Platform Super Admin
  platform_super_admin: [
    "admin:system_settings",
    "admin:manage_users",
    "admin:view_profiles",
    "admin:verify_users",
    "admin:manage_couriers",
    "admin:view_audit_logs",
    "team:view",
    "team:invite",
    "team:update",
    "team:suspend",
    "team:remove",
    "organization:update",
    "rfqs:view_all",
    "rfqs:manage",
    "quotes:view_all",
    "orders:view_all",
    "finance:view_all",
    "finance:audit_vat",
    "finance:export_reports",
    "delivery:assign_courier",
    "audit:view",
    "audit:export",
  ],

  // Platform RFQ Monitor
  platform_rfq_monitor: [
    "rfqs:view_all",
    "quotes:view_all",
    "orders:view_all",
    "audit:view",
  ],

  // Platform Chief Accountant
  platform_accountant: [
    "finance:view_all",
    "finance:audit_vat",
    "finance:export_reports",
    "orders:view_all",
    "audit:view",
  ],

  // Platform Compliance
  platform_compliance: [
    "admin:verify_users",
    "admin:view_profiles",
    "audit:view",
  ],

  // Platform Support
  platform_support: [
    "orders:view_all",
    "orders:dispute",
    "rfqs:view_all",
    "audit:view",
  ],

  // Client Owner
  client_owner: [
    "rfqs:create",
    "rfqs:view",
    "rfqs:update",
    "rfqs:cancel",
    "quotes:view",
    "quotes:accept",
    "quotes:reject",
    "orders:view",
    "orders:dispute",
    "finance:view",
    "finance:invoice",
    "finance:payment",
    "finance:export_reports",
    "fleet:manage",
    "branch:manage_location",
    "team:view",
    "team:invite",
    "team:update",
    "team:suspend",
    "team:remove",
    "organization:update",
    "audit:view",
  ],

  // Client Procurement Manager
  client_procurement_manager: [
    "rfqs:create",
    "rfqs:view",
    "rfqs:update",
    "rfqs:cancel",
    "quotes:view",
    "quotes:accept",
    "quotes:reject",
    "orders:view",
    "finance:view",
    "finance:payment",
    "fleet:manage",
    "team:view",
    "team:invite",
  ],

  // Client RFQ Supervisor / Monitor
  client_rfq_supervisor: [
    "rfqs:view",
    "quotes:view",
    "orders:view",
    "fleet:manage",
    "audit:view",
  ],

  // Client Accountant
  client_accountant: [
    "finance:view",
    "finance:invoice",
    "finance:payment",
    "finance:export_reports",
    "orders:view",
  ],

  // Client Technician (Workshop / Requester)
  client_technician: [
    "rfqs:create",
    "rfqs:view",
    "orders:view",
  ],

  // Vendor Owner
  vendor_owner: [
    "quotes:view_radar",
    "quotes:create",
    "quotes:update",
    "orders:view",
    "orders:update_status",
    "orders:dispatch",
    "orders:dispute",
    "finance:view",
    "finance:invoice",
    "finance:payout",
    "finance:bank_account",
    "finance:export_reports",
    "branch:manage_location",
    "team:view",
    "team:invite",
    "team:update",
    "team:suspend",
    "team:remove",
    "organization:update",
    "audit:view",
  ],

  // Vendor Sales Agent
  vendor_sales_agent: [
    "quotes:view_radar",
    "quotes:create",
    "quotes:update",
    "orders:view",
    "team:view",
    "team:invite",
  ],

  // Vendor Warehouse Clerk
  vendor_warehouse_clerk: [
    "orders:view",
    "orders:update_status",
    "orders:dispatch",
  ],

  // Vendor Accountant
  vendor_accountant: [
    "finance:view",
    "finance:invoice",
    "finance:export_reports",
    "orders:view",
  ],
};

/**
 * ── FULL CUSTOM ROLE DEFINITION INTERFACE ──
 */
export interface CustomRoleDefinition {
  id: string;
  scope: RoleScope;
  name_ar: string;
  name_en?: string;
  description_ar: string;
  description_en?: string;
  badge_color?: string;
  icon?: string;
  permissions: SystemPermission[];
  is_system: boolean;
  members_count?: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * ── STARTER ROLE TEMPLATES (Presets for quick custom role creation) ──
 */
export interface RoleTemplatePreset {
  id: string;
  scope: RoleScope;
  name_ar: string;
  description_ar: string;
  badge_color: string;
  icon: string;
  permissions: SystemPermission[];
}

export const ROLE_TEMPLATES_PRESETS: RoleTemplatePreset[] = [
  {
    id: "template_client_fleet_supervisor",
    scope: "client",
    name_ar: "مشرف حركة الأسطول والمرآب",
    description_ar: "إدارة كاملة للمركبات، فتح طلبات التسعير، ومتابعة تسليم قطع الغيار للورش",
    badge_color: "emerald",
    icon: "Truck",
    permissions: ["rfqs:create", "rfqs:view", "rfqs:update", "orders:view", "fleet:manage", "branch:manage_location"],
  },
  {
    id: "template_client_auditor",
    scope: "client",
    name_ar: "مدقق مالي ومشتريات داخلي",
    description_ar: "استعراض ومراجعة كافة الطلبات والعروض والفواتير وسجل التتبع دون صلاحيات الشراء",
    badge_color: "indigo",
    icon: "FileCheck2",
    permissions: ["rfqs:view", "quotes:view", "orders:view", "finance:view", "finance:invoice", "finance:export_reports", "audit:view"],
  },
  {
    id: "template_vendor_pricing_officer",
    scope: "vendor",
    name_ar: "مسؤول التسعير المتقدم والمبيعات",
    description_ar: "مراقبة الرادار اللحظي، تقديم العروض، تعديل الأسعار، ومتابعة حركة المبيعات",
    badge_color: "cyan",
    icon: "Tags",
    permissions: ["quotes:view_radar", "quotes:create", "quotes:update", "orders:view", "branch:manage_location"],
  },
  {
    id: "template_vendor_logistics_officer",
    scope: "vendor",
    name_ar: "مسؤول شحن ولوجستيات المتجر",
    description_ar: "تجهيز القطع، تعبئة الشحنات، تسليمها للمناديب، وإدارة النزاعات التشغيلية",
    badge_color: "amber",
    icon: "PackageCheck",
    permissions: ["orders:view", "orders:update_status", "orders:dispatch", "orders:dispute", "branch:manage_location"],
  },
  {
    id: "template_platform_dispute_officer",
    scope: "platform",
    name_ar: "محقق الشكاوى والنزاعات الكبرى",
    description_ar: "صلاحيات فحص الطلبات والعروض والتدخل لحل النزاعات بين المورد والعميل",
    badge_color: "rose",
    icon: "Scale",
    permissions: ["orders:view_all", "orders:dispute", "rfqs:view_all", "quotes:view_all", "audit:view"],
  },
];

/**
 * ── CENTRALIZED EFFECTIVE PERMISSION CALCULATION ENGINE ──
 * Evaluates: (Role Defaults / Dynamic Role Permissions) ∪ (ALLOW Overrides) ∖ (DENY Overrides)
 */
export function calculateEffectivePermissions(
  roleOrPermissions: RoleId | string | SystemPermission[],
  customGrants: string[] = [],
  explicitDenies: string[] = []
): Set<SystemPermission> {
  let basePermissions: SystemPermission[] = [];

  if (Array.isArray(roleOrPermissions)) {
    basePermissions = roleOrPermissions;
  } else if (ROLE_DEFAULT_PERMISSIONS[roleOrPermissions]) {
    basePermissions = ROLE_DEFAULT_PERMISSIONS[roleOrPermissions];
  } else {
    // Custom role without cached array in code: base is empty, grants populate it
    basePermissions = [];
  }

  const effective = new Set<SystemPermission>(basePermissions);

  // Apply custom grants (ALLOW overrides)
  customGrants.forEach((perm) => {
    if (perm) effective.add(perm as SystemPermission);
  });

  // Apply explicit denies (DENY overrides - strict priority)
  explicitDenies.forEach((perm) => {
    if (perm) effective.delete(perm as SystemPermission);
  });

  return effective;
}

/**
 * Checks if a permission set contains the required permission (or super admin override)
 */
export function hasPermission(
  effectivePermissions: Set<SystemPermission>,
  requiredPermission: SystemPermission,
  isSuperAdmin: boolean = false
): boolean {
  if (isSuperAdmin || effectivePermissions.has("admin:system_settings")) {
    return true;
  }
  return effectivePermissions.has(requiredPermission);
}

/**
 * ── STRICT PRIVILEGE ESCALATION VALIDATOR ──
 * Ensures that the actor creating or editing a role does not grant permissions
 * exceeding their own effective permissions (unless the actor is Super Admin).
 */
export function validatePrivilegeEscalation(
  creatorEffectivePermissions: Set<SystemPermission>,
  requestedPermissions: SystemPermission[],
  isSuperAdmin: boolean = false
): { allowed: boolean; unauthorizedPermissions: SystemPermission[] } {
  if (isSuperAdmin || creatorEffectivePermissions.has("admin:system_settings")) {
    return { allowed: true, unauthorizedPermissions: [] };
  }

  const unauthorizedPermissions: SystemPermission[] = [];

  for (const perm of requestedPermissions) {
    if (!creatorEffectivePermissions.has(perm)) {
      unauthorizedPermissions.push(perm);
    }
  }

  return {
    allowed: unauthorizedPermissions.length === 0,
    unauthorizedPermissions,
  };
}
