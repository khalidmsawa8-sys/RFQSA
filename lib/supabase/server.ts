import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const RFQS_FILE = path.join(DATA_DIR, "rfqs_db.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
const QUOTES_FILE = path.join(DATA_DIR, "quotes_db.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications_db.json");
const ROLES_FILE = path.join(DATA_DIR, "organization_roles_db.json");
const ROLE_PERMISSIONS_FILE = path.join(DATA_DIR, "role_permissions_db.json");
const AUDIT_LOGS_FILE = path.join(DATA_DIR, "staff_audit_logs_db.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");
const ORGANIZATIONS_FILE = path.join(DATA_DIR, "organizations_db.json");
const ORGANIZATION_MEMBERS_FILE = path.join(DATA_DIR, "organization_members_db.json");
const ORG_MEMBERS_FILE = ORGANIZATION_MEMBERS_FILE;
const INVOICES_FILE = path.join(DATA_DIR, "invoices_db.json");
const WALLET_TRANSACTIONS_FILE = path.join(DATA_DIR, "wallet_transactions_db.json");
const SUPPORT_REQUESTS_FILE = path.join(DATA_DIR, "support_requests_db.json");
const SUPPORT_MESSAGES_FILE = path.join(DATA_DIR, "support_messages_db.json");
const DEAL_REVIEWS_FILE = path.join(DATA_DIR, "deal_reviews_db.json");
const CLIENT_VEHICLES_FILE = path.join(DATA_DIR, "client_vehicles_db.json");
const VENDOR_BRANCHES_FILE = path.join(DATA_DIR, "vendor_branches_db.json");

const SEED_NOTIFICATIONS = [
  {
    id: "NOTIF-101",
    user_id: "client-demo-id",
    type: "new_quote",
    title: "عرض سعر جديد لطلبك #RFQ-8412",
    message: "قدمت مؤسسة قطع الغيار المعتمدة عرض سعر لطلب صدام كامري أصلي بقيمة 1,850 ر.س مع تجهيز خلال 48 ساعة.",
    rfq_id: "RFQ-8412",
    quote_id: "Q-8412-1",
    order_id: null,
    is_read: false,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    sent_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: "NOTIF-102",
    user_id: "client-demo-id",
    type: "deal_status_updated",
    title: "طلبك قيد التوصيل الآن",
    message: "طلبك #ORD-4920 (قطع تويوتا لاندكروزر) تم استلامه من المندوب وهو في الطريق إلى موقعك بحي السلي.",
    rfq_id: "RFQ-6190",
    quote_id: "Q-6190-1",
    order_id: "ORD-4920",
    is_read: false,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    sent_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "NOTIF-103",
    user_id: "client-demo-id",
    type: "order_completed",
    title: "تم تسليم الطلب وإصدار الفاتورة",
    message: "تم إكمال تسليم الطلب #ORD-3105 بنجاح، يمكنك الآن تحميل الفاتورة الضريبية المعتمدة إلكترونياً.",
    rfq_id: "RFQ-7320",
    quote_id: "Q-7320-1",
    order_id: "ORD-3105",
    is_read: true,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    sent_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "NOTIF-104",
    user_id: "client-demo-id",
    type: "announcement",
    title: "إشعار نظام: إطلاق ميزة التتبع المباشر",
    message: "أصبح بإمكانك الآن متابعة حركة المندوب والشحنات مباشرة عبر الخريطة التفاعلية في منصة رِفق.",
    rfq_id: null,
    quote_id: null,
    order_id: null,
    is_read: true,
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    sent_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: "NOTIF-201",
    user_id: "vendor-demo-id",
    type: "new_rfq",
    title: "طلب تسعير جديد متوافق مع ماركاتك",
    message: "طلب تسعير جديد #RFQ-1153 لقطع جي إم سي متاح الآن في الرادار، قدّم عرضك لكسب الصفقة.",
    rfq_id: "RFQ-1153",
    quote_id: null,
    order_id: null,
    is_read: false,
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    sent_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: "NOTIF-202",
    user_id: "vendor-demo-id",
    type: "quote_accepted",
    title: "تم قبول عرض السعر الخاص بك!",
    message: "وافق العميل شركة المشتريات الوطنية على عرضك للطلب #ORD-5501 بمبلغ 2,850 ر.س. يرجى تجهيز القطع للشحن.",
    rfq_id: "RFQ-8412",
    quote_id: "Q-8412-1",
    order_id: "ORD-5501",
    is_read: false,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    sent_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: "NOTIF-203",
    user_id: "vendor-demo-id",
    type: "wallet_credit",
    title: "إيداع رصيد مبيعات في محفظتك",
    message: "تم تحويل مبلغ 1,650 ر.س لمحفظتك بعد تأكيد العميل استلام الطلب #ORD-3105 بنجاح.",
    rfq_id: "RFQ-7320",
    quote_id: "Q-7320-1",
    order_id: "ORD-3105",
    is_read: true,
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    sent_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
];

const SEED_RFQS = [
  {
    id: "RFQ-1153",
    client_id: "client-demo-id",
    car_make: "جي إم سي",
    car_model: "هايلوكس",
    car_year: 2023,
    plate_number: "ت ل ف 336",
    vin: "1GCEC19X4DZ115309",
    status: "open",
    parts_description: JSON.stringify([
      {
        partName: "صدام خلفي",
        quantity: 1,
        partType: "original",
        isUrgent: false,
        deliveryLocation: "فرع جدة - طريق المدينة - حي الروضة"
      },
      {
        partName: "باب شنطة",
        quantity: 1,
        partType: "original",
        isUrgent: false,
        deliveryLocation: "فرع جدة - طريق المدينة - حي الروضة"
      },
      {
        partName: "اسطب خلفي يسار",
        quantity: 1,
        partType: "original",
        isUrgent: false,
        deliveryLocation: "فرع جدة - طريق المدينة - حي الروضة"
      },
      {
        partName: "اسطب خلفي يمين",
        quantity: 1,
        partType: "original",
        isUrgent: false,
        deliveryLocation: "فرع جدة - طريق المدينة - حي الروضة"
      }
    ]),
    delivery_location: "فرع جدة - طريق المدينة - حي الروضة",
    delivery_city: "جدة",
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    quotes: [],
    client: {
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية"
    }
  },
  {
    id: "RFQ-8412",
    client_id: "client-demo-id",
    car_make: "تويوتا",
    car_model: "كامري",
    car_year: 2023,
    plate_number: "أ ب ج 1234",
    vin: "JTEBU5JR8K5092141",
    status: "quoted",
    parts_description: JSON.stringify([
      {
        partName: "صدام أمامي أصلي",
        quantity: 1,
        partType: "original",
        partNumber: "52119-0X900",
        isUrgent: true,
        rfqType: "public",
        deliveryLocation: "الرياض - حي الملز",
        recipientName: "أحمد المنصور",
        recipientPhone: "0501234567"
      }
    ]),
    delivery_location: "الرياض - حي الملز",
    delivery_city: "الرياض",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    quotes: [
      {
        id: "Q-8412-1",
        vendor_id: "vendor-demo-id",
        total_price: 1850,
        delivery_days: 2,
        status: "pending",
        profiles: {
          full_name: "مؤسسة قطع الغيار المعتمدة",
          company_name: "مؤسسة قطع الغيار المعتمدة",
          phone: "0551122334"
        }
      },
      {
        id: "Q-8412-2",
        vendor_id: "vendor-2",
        total_price: 1920,
        delivery_days: 1,
        status: "pending",
        profiles: {
          full_name: "شركة الخليج للقطع",
          company_name: "شركة الخليج للقطع",
          phone: "0559988776"
        }
      }
    ],
    client: {
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية"
    }
  },
  {
    id: "RFQ-7320",
    client_id: "client-demo-id",
    car_make: "هيونداي",
    car_model: "سوناتا",
    car_year: 2024,
    plate_number: "د هـ و 5678",
    vin: "KMHE341CBLA109842",
    status: "open",
    parts_description: JSON.stringify([
      {
        partName: "شمعة إضاءة أمامية يمين Full LED",
        quantity: 1,
        partType: "original",
        isUrgent: false,
        rfqType: "public",
        deliveryLocation: "جدة - حي الصفا",
        recipientName: "م. خالد الغامدي",
        recipientPhone: "0559876543"
      },
      {
        partName: "شبك أمامي نيكل",
        quantity: 1,
        partType: "commercial"
      }
    ]),
    delivery_location: "جدة - حي الصفا",
    delivery_city: "جدة",
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    quotes: [],
    client: {
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية"
    }
  },
  {
    id: "RFQ-6190",
    client_id: "client-demo-id",
    car_make: "نيسان",
    car_model: "باترول",
    car_year: 2022,
    plate_number: "ر ز س 9012",
    vin: "JN8AZ2NC7M9203114",
    status: "quoted",
    parts_description: JSON.stringify([
      {
        partName: "مساعدات هيدروليك أمامية وخلفية",
        quantity: 4,
        partType: "original",
        isUrgent: true,
        rfqType: "direct",
        targetVendorName: "مؤسسة قطع الغيار المعتمدة",
        deliveryLocation: "الدمام - طريق الملك فهد",
        recipientName: "سعود العتيبي",
        recipientPhone: "0561122334"
      }
    ]),
    delivery_location: "الدمام - طريق الملك فهد",
    delivery_city: "الدمام",
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    quotes: [
      {
        id: "Q-6190-1",
        vendor_id: "vendor-demo-id",
        total_price: 4200,
        delivery_days: 3,
        status: "pending",
        profiles: {
          full_name: "مؤسسة قطع الغيار المعتمدة",
          company_name: "مؤسسة قطع الغيار المعتمدة",
          phone: "0551122334"
        }
      }
    ],
    client: {
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية"
    }
  },
  {
    id: "RFQ-4102",
    client_id: "client-demo-id",
    car_make: "تويوتا",
    car_model: "هايلكس",
    car_year: 2023,
    plate_number: "ط ي ك 8821",
    vin: "MROEB3CB1K0982134",
    status: "closed",
    parts_description: JSON.stringify([
      {
        partName: "مقصات أمامية علوية وسفلية",
        quantity: 2,
        partType: "original",
        deliveryLocation: "الرياض - حي السلي"
      }
    ]),
    delivery_location: "الرياض - حي السلي",
    delivery_city: "الرياض",
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    quotes: [],
    client: {
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية"
    }
  }
];

const SEED_ORDERS = [
  {
    id: "ORD-5501",
    client_id: "client-demo-id",
    vendor_id: "vendor-demo-id",
    status: "preparing",
    total_price: 2850,
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    rfq_id: "RFQ-8412",
    quote_id: "Q-8412-1",
    parts_description: JSON.stringify([
      { partName: "صدام أمامي أصلي", quantity: 1, partType: "original" },
      { partName: "شمعة أمامية يمين Full LED", quantity: 1, partType: "original" },
    ]),
    rfqs: {
      car_make: "فورد",
      car_model: "توروس",
      car_year: 2023,
      plate_number: "ص ض ط 3344",
      vin: "1FA6P8CF9H5102938",
      parts_description: JSON.stringify([
        { partName: "صدام أمامي أصلي", quantity: 1, partType: "original" },
        { partName: "شمعة أمامية يمين Full LED", quantity: 1, partType: "original" },
      ]),
      delivery_location: "الرياض - حي النرجس",
      delivery_city: "الرياض"
    },
    vendor: {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334"
    },
    profiles: {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334"
    },
    deals: [
      {
        id: "DEAL-5501",
        status: "active"
      }
    ]
  },
  {
    id: "ORD-4920",
    client_id: "client-demo-id",
    vendor_id: "vendor-demo-id",
    status: "shipped",
    total_price: 3400,
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    rfq_id: "RFQ-6190",
    quote_id: "Q-6190-1",
    parts_description: JSON.stringify([
      { partName: "مساعدات هيدروليك أمامية وخلفية", quantity: 4, partType: "original", isUrgent: true },
    ]),
    rfqs: {
      car_make: "تويوتا",
      car_model: "لاندكروزر",
      car_year: 2022,
      plate_number: "ع غ ف 7788",
      vin: "JTMHT05J3D4091223",
      parts_description: JSON.stringify([
        { partName: "مساعدات هيدروليك أمامية وخلفية", quantity: 4, partType: "original", isUrgent: true },
      ]),
      delivery_location: "الرياض - حي السلي",
      delivery_city: "الرياض"
    },
    vendor: {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334"
    },
    profiles: {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334"
    },
    deals: [
      {
        id: "DEAL-4920",
        status: "active"
      }
    ]
  },
  {
    id: "ORD-3105",
    client_id: "client-demo-id",
    vendor_id: "vendor-demo-id",
    status: "completed",
    total_price: 1650,
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    rfq_id: "RFQ-7320",
    quote_id: "Q-7320-1",
    parts_description: JSON.stringify([
      { partName: "صدام أمامي أصلي", quantity: 1, partType: "original" },
      { partName: "شمعة إضاءة Full LED يمين", quantity: 1, partType: "original" },
      { partName: "شبك أمامي نيكل", quantity: 1, partType: "commercial" },
    ]),
    rfqs: {
      car_make: "هوندا",
      car_model: "أكورد",
      car_year: 2021,
      plate_number: "ق ك ل 9900",
      vin: "1HGCR2F83MA019284",
      parts_description: JSON.stringify([
        { partName: "صدام أمامي أصلي", quantity: 1, partType: "original" },
        { partName: "شمعة إضاءة Full LED يمين", quantity: 1, partType: "original" },
        { partName: "شبك أمامي نيكل", quantity: 1, partType: "commercial" },
      ]),
      delivery_location: "الرياض - حي الصحافة",
      delivery_city: "الرياض"
    },
    vendor: {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334"
    },
    profiles: {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334"
    },
    deals: [
      {
        id: "DEAL-3105",
        status: "completed"
      }
    ]
  },
  {
    "id": "ORD-2041",
    client_id: "client-demo-id",
    vendor_id: "vendor-demo-id",
    status: "cancelled",
    total_price: 950,
    created_at: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    rfq_id: "RFQ-4102",
    quote_id: "Q-4102-1",
    parts_description: JSON.stringify([
      { partName: "مقصات أمامية علوية وسفلية", quantity: 2, partType: "original" },
      { partName: "جلد مقصات ومساعدات", quantity: 2, partType: "original" },
    ]),
    rfqs: {
      car_make: "مازدا",
      car_model: "CX-9",
      car_year: 2020,
      plate_number: "م ن هـ 1122",
      vin: "JM3TCABY9L0209384",
      parts_description: JSON.stringify([
        { partName: "مقصات أمامية علوية وسفلية", quantity: 2, partType: "original" },
        { partName: "جلد مقصات ومساعدات", quantity: 2, partType: "original" },
      ]),
      delivery_location: "الرياض - حي الياسمين",
      delivery_city: "الرياض"
    },
    vendor: {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334"
    },
    profiles: {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334"
    },
    deals: [
      {
        id: "DEAL-2041",
        status: "cancelled"
      }
    ]
  }
];

function ensureDataFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {}
}

function loadPersistedRFQs(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(RFQS_FILE)) {
      const content = fs.readFileSync(RFQS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  savePersistedRFQs(SEED_RFQS);
  return SEED_RFQS;
}

function savePersistedRFQs(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(RFQS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedOrders(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const content = fs.readFileSync(ORDERS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  savePersistedOrders(SEED_ORDERS);
  return SEED_ORDERS;
}

function savePersistedOrders(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedQuotes(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(QUOTES_FILE)) {
      const content = fs.readFileSync(QUOTES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedQuotes(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(QUOTES_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedNotifications(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const content = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  savePersistedNotifications(SEED_NOTIFICATIONS);
  return SEED_NOTIFICATIONS;
}

function savePersistedNotifications(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedRoles(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(ROLES_FILE)) {
      const content = fs.readFileSync(ROLES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedRoles(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(ROLES_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedRolePermissions(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(ROLE_PERMISSIONS_FILE)) {
      const content = fs.readFileSync(ROLE_PERMISSIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedRolePermissions(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(ROLE_PERMISSIONS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedAuditLogs(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      const content = fs.readFileSync(AUDIT_LOGS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedAuditLogs(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedProfiles(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const content = fs.readFileSync(PROFILES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: any, idx: number) => ({
          ...p,
          ref_code: p.ref_code || (p.is_admin || p.role === "admin" ? "ADM-001" : (p.role === "vendor" ? `SUP-${1000 + idx}` : p.role === "courier" ? `COU-${1000 + idx}` : `CUST-${1000 + idx}`)),
          created_at: p.created_at || (p.is_admin || p.role === "admin" ? "2026-08-01T08:00:00.000Z" : new Date(Date.now() - (idx + 1) * 86400000 * 3).toISOString()),
        }));
      }
    }
  } catch (e) {}
  savePersistedProfiles(SEED_PROFILES);
  return SEED_PROFILES;
}

function savePersistedProfiles(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedOrganizations(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(ORGANIZATIONS_FILE)) {
      const content = fs.readFileSync(ORGANIZATIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedOrganizations(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(ORGANIZATIONS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedOrgMembers(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(ORGANIZATION_MEMBERS_FILE)) {
      const content = fs.readFileSync(ORGANIZATION_MEMBERS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedOrgMembers(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(ORGANIZATION_MEMBERS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

const SEED_PROFILES = [
  {
    id: "admin-demo-id",
    role: "admin",
    is_admin: true,
    admin_role: "super_admin",
    role_id: "platform_super_admin",
    is_active: true,
    full_name: "المدير العام للمنصة",
    company_name: "إدارة منصة رِفق",
    phone: "0500000000",
    city: "الرياض",
    ref_code: "ADM-001",
    created_at: "2026-08-01T08:00:00.000Z",
  },
  {
    id: "vendor-demo-id",
    role: "vendor",
    is_active: true,
    accepts_pickup: true,
    full_name: "مؤسسة قطع الغيار المعتمدة",
    company_name: "مؤسسة قطع الغيار المعتمدة",
    address: "طريق خريص - حي المنار",
    national_address: "الرياض - حي المنار - مبنى 204",
    city: "الرياض",
    district: "حي المنار",
    latitude: 24.723,
    longitude: 46.785,
    phone: "0551122334",
    ref_code: "VND-501",
    business_hours: "8:00 ص - 10:00 م",
    specialized_brands: [],
    specializes_in_all_brands: true,
  },
  {
    id: "v-supplier-1",
    role: "vendor",
    is_active: true,
    accepts_pickup: true,
    full_name: "أحمد العتيبي",
    company_name: "مؤسسة قطع الغيار المعتمدة",
    address: "طريق خريص - حي المنار",
    national_address: "الرياض - حي المنار",
    city: "الرياض",
    district: "حي المنار",
    latitude: 24.723,
    longitude: 46.785,
    phone: "0551122334",
    ref_code: "VND-501",
    business_hours: "8:00 ص - 10:00 م",
    specialized_brands: [],
    specializes_in_all_brands: true,
  },
  {
    id: "v-supplier-2",
    role: "vendor",
    is_active: true,
    accepts_pickup: true,
    full_name: "سالم الدوسري",
    company_name: "شركة النجم الساطع لقطع الغيار",
    address: "شارع الستين - حي الملز",
    national_address: "الرياض - حي الملز",
    city: "الرياض",
    district: "حي الملز",
    latitude: 24.665,
    longitude: 46.725,
    phone: "0509988776",
    business_hours: "9:00 ص - 11:00 م",
    specialized_brands: [],
    specializes_in_all_brands: true,
  },
  {
    id: "v-supplier-3",
    role: "vendor",
    is_active: true,
    accepts_pickup: true,
    full_name: "فهد الحربي",
    company_name: "المركز الألماني المتخصص",
    address: "طريق الملك عبدالعزيز",
    national_address: "الرياض - طريق الملك عبدالعزيز",
    city: "الرياض",
    district: "حي المروج",
    latitude: 24.755,
    longitude: 46.665,
    phone: "0543322110",
    business_hours: "8:30 ص - 10:30 م",
    specialized_brands: [],
    specializes_in_all_brands: true,
  },
  {
    id: "v-supplier-4",
    role: "vendor",
    is_active: true,
    accepts_pickup: true,
    full_name: "خالد الشمري",
    company_name: "موزع الشمال المعتمد",
    address: "طريق التخصصي - حي الصحافة",
    national_address: "الرياض - حي الصحافة",
    city: "الرياض",
    district: "حي الصحافة",
    latitude: 24.795,
    longitude: 46.635,
    phone: "0564433221",
    business_hours: "9:00 ص - 10:00 م",
    specialized_brands: [],
    specializes_in_all_brands: true,
  },
  {
    id: "client-demo-id",
    role: "client",
    is_active: true,
    full_name: "شركة المشتريات الوطنية",
    company_name: "شركة المشتريات الوطنية",
    ref_code: "CLI-101",
    phone: "0501234567",
    tax_number: "300123456700003",
    commercial_register: "1010987654",
    national_address: "الرياض - طريق الملك فهد - حي العليا",
    city: "الرياض",
  },
  {
    id: "client-2",
    role: "client",
    is_active: true,
    full_name: "شركة الوفاق لتأجير السيارات",
    company_name: "شركة الوفاق لتأجير السيارات",
    ref_code: "CLI-102",
    phone: "0543322110",
    tax_number: "300765432100003",
    commercial_register: "1010665544",
    national_address: "جدة - طريق المدينة المنورة - حي الروضة",
    city: "جدة",
  },
  {
    id: "client-3",
    role: "client",
    is_active: true,
    full_name: "مؤسسة الأفق للخدمات اللوجستية",
    company_name: "مؤسسة الأفق للخدمات اللوجستية",
    ref_code: "CLI-103",
    phone: "0567788990",
    tax_number: "300654321000003",
    commercial_register: "1010554433",
    national_address: "الرياض - حي السلي - مخرج 18",
    city: "الرياض",
  },
  {
    id: "vendor-2",
    role: "vendor",
    is_active: true,
    accepts_pickup: true,
    full_name: "شركة الخليج للقطع والمحركات",
    company_name: "شركة الخليج للقطع والمحركات",
    ref_code: "VND-502",
    phone: "0559988776",
    tax_number: "300876543200003",
    commercial_register: "1010776655",
    national_address: "الدمام - طريق الملك سعود - حي الخالدية",
    city: "الدمام",
  },
  {
    id: "vendor-3",
    role: "vendor",
    is_active: true,
    accepts_pickup: true,
    full_name: "مركز التحدي لقطع الغيار الأصلية",
    company_name: "مركز التحدي لقطع الغيار الأصلية",
    ref_code: "VND-503",
    phone: "0533344556",
    tax_number: "300543210900003",
    commercial_register: "1010443322",
    national_address: "مكة المكرمة - صناعية الكعكية",
    city: "مكة المكرمة",
  },
  {
    id: "courier-1",
    role: "courier",
    is_active: true,
    full_name: "مندوب التوصيل السريع",
    company_name: "خدمات التوصيل السريع",
    ref_code: "COU-701",
    phone: "0550011223",
    city: "الرياض",
  }
];

const SEED_INVOICES = [
  {
    id: "INV-5501",
    invoice_number: "INV-2026-005501",
    status: "paid",
    type: "tax_invoice",
    total_amount: 2850,
    subtotal: 2478.26,
    tax_amount: 371.74,
    issued_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    due_date: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    client_id: "client-demo-id",
    vendor_id: "vendor-demo-id",
    client: {
      id: "client-demo-id",
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية",
      ref_code: "CLI-101",
      tax_number: "310123456700003",
      commercial_register: "1010892341",
      national_address: "الرياض - طريق الملك فهد - برج الفيصلية",
      phone: "0501234567"
    },
    vendor: {
      id: "vendor-demo-id",
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      ref_code: "VND-501",
      tax_number: "300123456700003",
      commercial_register: "1010987654",
      national_address: "الرياض - طريق خريص - حي المنار",
      phone: "0551122334"
    },
    deal: {
      order_id: "ORD-5501",
      orders: {
        id: "ORD-5501",
        rfq: {
          car_make: "فورد",
          car_model: "توروس",
          car_year: 2023,
          plate_number: "ص ض ط 3344",
          vin: "1FA6P8CF9H5102938"
        }
      }
    },
    items: [
      { part_name: "صدام أمامي أصلي", part_number: "DG9Z-17757-AA", quantity: 1, unit_price: 1350, line_total: 1350 },
      { part_name: "شمعة أمامية يمين Full LED", part_number: "DG9Z-13008-F", quantity: 1, unit_price: 1128.26, line_total: 1128.26 }
    ]
  },
  {
    id: "INV-4920",
    invoice_number: "INV-2026-004920",
    status: "issued",
    type: "tax_invoice",
    total_amount: 3400,
    subtotal: 2956.52,
    tax_amount: 443.48,
    issued_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    due_date: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
    client_id: "client-demo-id",
    vendor_id: "vendor-demo-id",
    client: {
      id: "client-demo-id",
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية",
      ref_code: "CLI-101",
      tax_number: "310123456700003",
      commercial_register: "1010892341",
      national_address: "الرياض - طريق الملك فهد",
      phone: "0501234567"
    },
    vendor: {
      id: "vendor-demo-id",
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      ref_code: "VND-501",
      tax_number: "300123456700003",
      commercial_register: "1010987654",
      national_address: "الرياض - حي المنار",
      phone: "0551122334"
    },
    deal: {
      order_id: "ORD-4920",
      orders: {
        id: "ORD-4920",
        rfq: {
          car_make: "تويوتا",
          car_model: "لاندكروزر",
          car_year: 2022,
          plate_number: "ع غ ف 7788",
          vin: "JTMHT05J3D4091223"
        }
      }
    },
    items: [
      { part_name: "مساعدات هيدروليك أمامية وخلفية", part_number: "48510-69435", quantity: 4, unit_price: 739.13, line_total: 2956.52 }
    ]
  },
  {
    id: "INV-3105",
    invoice_number: "INV-2026-003105",
    status: "paid",
    type: "tax_invoice",
    total_amount: 1650,
    subtotal: 1434.78,
    tax_amount: 215.22,
    issued_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    due_date: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 70 * 3600 * 1000).toISOString(),
    client_id: "client-demo-id",
    vendor_id: "vendor-demo-id",
    client: {
      id: "client-demo-id",
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية",
      ref_code: "CLI-101",
      tax_number: "310123456700003",
      commercial_register: "1010892341",
      national_address: "الرياض - حي الملز",
      phone: "0501234567"
    },
    vendor: {
      id: "vendor-demo-id",
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      ref_code: "VND-501",
      tax_number: "300123456700003",
      commercial_register: "1010987654",
      national_address: "الرياض - حي المنار",
      phone: "0551122334"
    },
    deal: {
      order_id: "ORD-3105",
      orders: {
        id: "ORD-3105",
        rfq: {
          car_make: "هوندا",
          car_model: "أكورد",
          car_year: 2021,
          plate_number: "ق ك ل 9900",
          vin: "1HGCR2F83MA019284"
        }
      }
    },
    items: [
      { part_name: "صدام أمامي أصلي", part_number: "71101-TVA-A00", quantity: 1, unit_price: 850, line_total: 850 },
      { part_name: "شمعة إضاءة Full LED يمين", part_number: "33100-TVA-A11", quantity: 1, unit_price: 584.78, line_total: 584.78 }
    ]
  },
  {
    id: "INV-2041",
    invoice_number: "INV-2026-002041",
    status: "cancelled",
    type: "credit_note",
    total_amount: 950,
    subtotal: 826.09,
    tax_amount: 123.91,
    issued_at: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    due_date: new Date(Date.now() - 100 * 3600 * 1000).toISOString(),
    client_id: "client-demo-id",
    vendor_id: "vendor-demo-id",
    client: {
      id: "client-demo-id",
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية",
      ref_code: "CLI-101",
      tax_number: "310123456700003",
      commercial_register: "1010892341",
      national_address: "الرياض - طريق الملك فهد",
      phone: "0501234567"
    },
    vendor: {
      id: "vendor-demo-id",
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      ref_code: "VND-501",
      tax_number: "300123456700003",
      commercial_register: "1010987654",
      national_address: "الرياض - طريق خريص - حي المنار",
      phone: "0551122334"
    },
    deal: {
      order_id: "ORD-2041",
      orders: {
        id: "ORD-2041",
        rfq: {
          car_make: "مازدا",
          car_model: "CX-9",
          car_year: 2020,
          plate_number: "م ن هـ 1122",
          vin: "JM3TCABY9L0209384"
        }
      }
    },
    items: [
      { part_name: "مقصات أمامية علوية وسفلية", part_number: "TK48-34-300", quantity: 2, unit_price: 413.045, line_total: 826.09 }
    ]
  }
];

function loadPersistedInvoices(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(INVOICES_FILE)) {
      const content = fs.readFileSync(INVOICES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].invoice_number) return parsed;
    }
  } catch (e) {}
  savePersistedInvoices(SEED_INVOICES);
  return SEED_INVOICES;
}

function savePersistedInvoices(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

const SEED_WALLET_TRANSACTIONS: any[] = [];

function loadPersistedWalletTransactions(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(WALLET_TRANSACTIONS_FILE)) {
      const content = fs.readFileSync(WALLET_TRANSACTIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  savePersistedWalletTransactions(SEED_WALLET_TRANSACTIONS);
  return SEED_WALLET_TRANSACTIONS;
}

function savePersistedWalletTransactions(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(WALLET_TRANSACTIONS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedSupportRequests(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(SUPPORT_REQUESTS_FILE)) {
      const content = fs.readFileSync(SUPPORT_REQUESTS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedSupportRequests(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(SUPPORT_REQUESTS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedSupportMessages(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(SUPPORT_MESSAGES_FILE)) {
      const content = fs.readFileSync(SUPPORT_MESSAGES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedSupportMessages(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(SUPPORT_MESSAGES_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedDealReviews(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(DEAL_REVIEWS_FILE)) {
      const content = fs.readFileSync(DEAL_REVIEWS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedDealReviews(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(DEAL_REVIEWS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedClientVehicles(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(CLIENT_VEHICLES_FILE)) {
      const content = fs.readFileSync(CLIENT_VEHICLES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedClientVehicles(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(CLIENT_VEHICLES_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

function loadPersistedVendorBranches(): any[] {
  ensureDataFiles();
  try {
    if (fs.existsSync(VENDOR_BRANCHES_FILE)) {
      const content = fs.readFileSync(VENDOR_BRANCHES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function savePersistedVendorBranches(items: any[]) {
  ensureDataFiles();
  try {
    fs.writeFileSync(VENDOR_BRANCHES_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {}
}

declare global {
  var __SHARED_SERVER_RFQS__: any[] | undefined;
  var __SHARED_SERVER_ORDERS__: any[] | undefined;
  var __SHARED_SERVER_QUOTES__: any[] | undefined;
  var __SHARED_SERVER_NOTIFICATIONS__: any[] | undefined;
  var __SHARED_SERVER_PROFILES__: any[] | undefined;
  var __SHARED_SERVER_ROLES__: any[] | undefined;
  var __SHARED_SERVER_ROLE_PERMS__: any[] | undefined;
  var __SHARED_SERVER_AUDIT_LOGS__: any[] | undefined;
  var __SHARED_SERVER_ORGANIZATIONS__: any[] | undefined;
  var __SHARED_SERVER_ORG_MEMBERS__: any[] | undefined;
  var __SHARED_SERVER_INVOICES__: any[] | undefined;
  var __SHARED_SERVER_WALLET_TRANSACTIONS__: any[] | undefined;
  var __SHARED_SERVER_SUPPORT_REQUESTS__: any[] | undefined;
  var __SHARED_SERVER_SUPPORT_MESSAGES__: any[] | undefined;
  var __SHARED_SERVER_DEAL_REVIEWS__: any[] | undefined;
  var __SHARED_SERVER_CLIENT_VEHICLES__: any[] | undefined;
  var __SHARED_SERVER_VENDOR_BRANCHES__: any[] | undefined;
}

if (!globalThis.__SHARED_SERVER_RFQS__ || globalThis.__SHARED_SERVER_RFQS__.length === 0) {
  globalThis.__SHARED_SERVER_RFQS__ = loadPersistedRFQs();
}

if (!globalThis.__SHARED_SERVER_ORDERS__ || globalThis.__SHARED_SERVER_ORDERS__.length === 0) {
  globalThis.__SHARED_SERVER_ORDERS__ = loadPersistedOrders();
}

if (!globalThis.__SHARED_SERVER_QUOTES__) {
  globalThis.__SHARED_SERVER_QUOTES__ = loadPersistedQuotes();
}

if (!globalThis.__SHARED_SERVER_NOTIFICATIONS__ || globalThis.__SHARED_SERVER_NOTIFICATIONS__.length === 0) {
  globalThis.__SHARED_SERVER_NOTIFICATIONS__ = loadPersistedNotifications();
}

if (!globalThis.__SHARED_SERVER_PROFILES__ || globalThis.__SHARED_SERVER_PROFILES__.length === 0) {
  globalThis.__SHARED_SERVER_PROFILES__ = loadPersistedProfiles();
}

if (!globalThis.__SHARED_SERVER_ROLES__) {
  globalThis.__SHARED_SERVER_ROLES__ = loadPersistedRoles();
}

if (!globalThis.__SHARED_SERVER_ROLE_PERMS__) {
  globalThis.__SHARED_SERVER_ROLE_PERMS__ = loadPersistedRolePermissions();
}

if (!globalThis.__SHARED_SERVER_AUDIT_LOGS__) {
  globalThis.__SHARED_SERVER_AUDIT_LOGS__ = loadPersistedAuditLogs();
}

if (!globalThis.__SHARED_SERVER_ORGANIZATIONS__) {
  globalThis.__SHARED_SERVER_ORGANIZATIONS__ = loadPersistedOrganizations();
}

if (!globalThis.__SHARED_SERVER_ORG_MEMBERS__) {
  globalThis.__SHARED_SERVER_ORG_MEMBERS__ = loadPersistedOrgMembers();
}

if (!globalThis.__SHARED_SERVER_INVOICES__) {
  globalThis.__SHARED_SERVER_INVOICES__ = loadPersistedInvoices();
}

if (!globalThis.__SHARED_SERVER_WALLET_TRANSACTIONS__) {
  globalThis.__SHARED_SERVER_WALLET_TRANSACTIONS__ = loadPersistedWalletTransactions();
}

if (!globalThis.__SHARED_SERVER_SUPPORT_REQUESTS__) {
  globalThis.__SHARED_SERVER_SUPPORT_REQUESTS__ = loadPersistedSupportRequests();
}

if (!globalThis.__SHARED_SERVER_SUPPORT_MESSAGES__) {
  globalThis.__SHARED_SERVER_SUPPORT_MESSAGES__ = loadPersistedSupportMessages();
}

if (!globalThis.__SHARED_SERVER_DEAL_REVIEWS__) {
  globalThis.__SHARED_SERVER_DEAL_REVIEWS__ = loadPersistedDealReviews();
}

if (!globalThis.__SHARED_SERVER_CLIENT_VEHICLES__) {
  globalThis.__SHARED_SERVER_CLIENT_VEHICLES__ = loadPersistedClientVehicles();
}

if (!globalThis.__SHARED_SERVER_VENDOR_BRANCHES__) {
  globalThis.__SHARED_SERVER_VENDOR_BRANCHES__ = loadPersistedVendorBranches();
}

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("demo-rfq-marketplace")) {
    let sessionCookie = cookieStore.get("rfq_session")?.value;
    const userIdCookie = cookieStore.get("rfq_user_id")?.value;
    const userEmailCookie = cookieStore.get("rfq_user_email")?.value;
    const userNameCookie = cookieStore.get("rfq_user_name")?.value;
    const decodedUserName = userNameCookie ? decodeURIComponent(userNameCookie) : "";

    let referer = "";
    let adminHeader = "";
    try {
      const headerStore = await headers();
      referer = headerStore.get("referer") || headerStore.get("origin") || "";
      adminHeader = headerStore.get("x-admin-request") || headerStore.get("x-admin-role") || "";
    } catch {}

    const isAdminReq = referer.includes("/admin") || adminHeader === "true" || adminHeader === "admin";
    if (isAdminReq) {
      sessionCookie = "admin";
    } else if (!sessionCookie) {
      if (referer.includes("/vendor")) {
        sessionCookie = "vendor";
      } else {
        sessionCookie = "client";
      }
    }

    const getTableList = (t: string): any[] => {
      if (t === "rfqs") return loadPersistedRFQs();
      if (t === "quotes") return loadPersistedQuotes();
      if (t === "orders") return loadPersistedOrders();
      if (t === "notifications") return loadPersistedNotifications();
      if (t === "profiles") return globalThis.__SHARED_SERVER_PROFILES__ && globalThis.__SHARED_SERVER_PROFILES__.length > 0 ? globalThis.__SHARED_SERVER_PROFILES__ : loadPersistedProfiles();
      if (t === "organization_roles") return globalThis.__SHARED_SERVER_ROLES__ || loadPersistedRoles();
      if (t === "role_permissions") return globalThis.__SHARED_SERVER_ROLE_PERMS__ || loadPersistedRolePermissions();
      if (t === "staff_audit_logs") return globalThis.__SHARED_SERVER_AUDIT_LOGS__ || loadPersistedAuditLogs();
      if (t === "organizations") return loadPersistedOrganizations();
      if (t === "organization_members") return loadPersistedOrgMembers();
      if (t === "invoices") return globalThis.__SHARED_SERVER_INVOICES__ || loadPersistedInvoices();
      if (t === "wallet_transactions") return globalThis.__SHARED_SERVER_WALLET_TRANSACTIONS__ || loadPersistedWalletTransactions();
      if (t === "support_requests") return globalThis.__SHARED_SERVER_SUPPORT_REQUESTS__ || loadPersistedSupportRequests();
      if (t === "support_messages") return globalThis.__SHARED_SERVER_SUPPORT_MESSAGES__ || loadPersistedSupportMessages();
      if (t === "deal_reviews") return globalThis.__SHARED_SERVER_DEAL_REVIEWS__ || loadPersistedDealReviews();
      if (t === "client_vehicles") return globalThis.__SHARED_SERVER_CLIENT_VEHICLES__ || loadPersistedClientVehicles();
      if (t === "vendor_branches") return globalThis.__SHARED_SERVER_VENDOR_BRANCHES__ || loadPersistedVendorBranches();
      return [];
    };

    return {
      auth: {
        getUser: async () => {
          const allProfiles = getTableList("profiles");
          const matchedProfile = userIdCookie ? allProfiles.find((p: any) => p.id === userIdCookie) : null;

          let id = "client-demo-id";
          let email = "client@rfqsa.tech";
          let full_name = "شركة المشتريات الوطنية";
          let role = "client";

          if (matchedProfile) {
            id = matchedProfile.id;
            email = matchedProfile.email || userEmailCookie || `${matchedProfile.ref_code?.toLowerCase() || matchedProfile.id}@rfqsa.tech`;
            full_name = matchedProfile.company_name || matchedProfile.full_name || decodedUserName || "مستخدم مسجل";
            role = matchedProfile.role || sessionCookie || "client";
          } else if (userIdCookie) {
            id = userIdCookie;
            email = userEmailCookie || `${userIdCookie}@rfqsa.tech`;
            full_name = decodedUserName || (sessionCookie === "vendor" ? "مورد معتمد" : sessionCookie === "admin" ? "مشرف النظام" : "عميل مسجل");
            role = sessionCookie || "client";
          } else if (sessionCookie === "vendor") {
            id = "vendor-demo-id";
            email = "vendor@rfqsa.tech";
            full_name = "مؤسسة قطع الغيار المعتمدة";
            role = "vendor";
          } else if (sessionCookie === "admin") {
            id = "admin-demo-id";
            email = "admin@rfqsa.tech";
            full_name = "المدير العام للمنصة";
            role = "admin";
          }

          return {
            data: {
              user: {
                id,
                email,
                user_metadata: {
                  full_name,
                  company_name: matchedProfile?.company_name || full_name,
                  role,
                  ref_code: matchedProfile?.ref_code || "",
                  phone: matchedProfile?.phone || "",
                  is_admin: role === "admin",
                },
              },
            },
            error: null,
          };
        },
      },
      from: (rawTable: string) => {
        let table = rawTable === "audit_logs" ? "staff_audit_logs" : rawTable;
        let insertedData: any = null;
        let pendingUpdateData: any = null;
        let pendingDelete: boolean = false;
        let filters: { field: string; val: any }[] = [];
        let orderBys: { field: string; ascending: boolean }[] = [];
        let limitCount: number | null = null;

        const sortAndLimitList = (items: any[]) => {
          let res = items;
          if (orderBys.length > 0) {
            res = [...res].sort((a, b) => {
              for (const ob of orderBys) {
                const valA = a[ob.field];
                const valB = b[ob.field];
                if (valA === valB) continue;
                if (valA === undefined || valA === null) return ob.ascending ? 1 : -1;
                if (valB === undefined || valB === null) return ob.ascending ? -1 : 1;
                if (valA < valB) return ob.ascending ? -1 : 1;
                if (valA > valB) return ob.ascending ? 1 : -1;
              }
              return 0;
            });
          }
          if (limitCount !== null && limitCount >= 0) {
            res = res.slice(0, limitCount);
          }
          return res;
        };

        const applyUpdatesOrDeletes = () => {
          if (pendingUpdateData) {
            const filterId = filters.find((f) => f.field === "id")?.val;
            const inIds = filters.find((f) => f.field === "id_in")?.val;
            if (table === "rfqs") {
              const current = getTableList("rfqs");
              globalThis.__SHARED_SERVER_RFQS__ = (current || []).map((r: any) => {
                const matches = filterId ? r.id === filterId : (inIds ? inIds.includes(r.id) : (filters.length > 0 ? filters.every((f: any) => r[f.field] === f.val) : true));
                return matches ? { ...r, ...pendingUpdateData } : r;
              });
              savePersistedRFQs(globalThis.__SHARED_SERVER_RFQS__);
            } else if (table === "quotes") {
              const current = getTableList("quotes");
              globalThis.__SHARED_SERVER_QUOTES__ = (current || []).map((q: any) => {
                const matches = filterId ? q.id === filterId : (filters.length > 0 ? filters.every((f: any) => q[f.field] === f.val) : true);
                return matches ? { ...q, ...pendingUpdateData } : q;
              });
              savePersistedQuotes(globalThis.__SHARED_SERVER_QUOTES__);
            } else if (table === "orders" || table === "deals") {
              const current = getTableList("orders");
              const orderIdFilter = filters.find((f) => f.field === "order_id")?.val;
              const effectiveFilterId = filterId || orderIdFilter;
              const cleanFilterId = effectiveFilterId ? String(effectiveFilterId).replace(/^ORD-/, "").replace(/^DEAL-/, "") : "";
              const rawNum = effectiveFilterId ? String(effectiveFilterId).replace(/\D+/g, "") : "";

              globalThis.__SHARED_SERVER_ORDERS__ = (current || []).map((o: any) => {
                const matches = effectiveFilterId ? (
                  o.id === effectiveFilterId ||
                  o.id === `ORD-${cleanFilterId}` ||
                  o.id === cleanFilterId ||
                  (rawNum && (o.id === `ORD-${rawNum}` || o.id === rawNum)) ||
                  (o.deals && o.deals.some((d: any) =>
                    d.id === effectiveFilterId ||
                    d.id === `DEAL-${cleanFilterId}` ||
                    (rawNum && String(d.id).includes(rawNum))
                  )) ||
                  (rawNum && o.rfq_id && String(o.rfq_id).includes(rawNum))
                ) : (filters.length > 0 ? filters.every((f: any) => o[f.field] === f.val) : true);

                if (matches) {
                  const updated = { ...o, ...pendingUpdateData };
                  if (updated.deals && updated.deals.length > 0 && pendingUpdateData.status) {
                    updated.deals = updated.deals.map((d: any) => ({
                      ...d,
                      status: pendingUpdateData.status,
                      updated_at: new Date().toISOString(),
                    }));
                  }
                  return updated;
                }
                return o;
              });
              savePersistedOrders(globalThis.__SHARED_SERVER_ORDERS__);
            } else if (table === "notifications") {
              const current = getTableList("notifications");
              globalThis.__SHARED_SERVER_NOTIFICATIONS__ = (current || []).map((n: any) => {
                const matches = filterId ? n.id === filterId : (filters.length > 0 ? filters.every((f: any) => n[f.field] === f.val) : true);
                return matches ? { ...n, ...pendingUpdateData } : n;
              });
              savePersistedNotifications(globalThis.__SHARED_SERVER_NOTIFICATIONS__);
            } else if (table === "organization_roles") {
              const current = getTableList("organization_roles");
              globalThis.__SHARED_SERVER_ROLES__ = (current || []).map((r: any) => {
                const matches = filterId ? r.id === filterId : (filters.length > 0 ? filters.every((f: any) => r[f.field] === f.val) : true);
                return matches ? { ...r, ...pendingUpdateData, updated_at: new Date().toISOString() } : r;
              });
              savePersistedRoles(globalThis.__SHARED_SERVER_ROLES__);
            } else if (table === "profiles") {
              const current = getTableList("profiles");
              globalThis.__SHARED_SERVER_PROFILES__ = (current || []).map((p: any) => {
                const matches = filterId ? p.id === filterId : (filters.length > 0 ? filters.every((f: any) => p[f.field] === f.val) : true);
                return matches ? { ...p, ...pendingUpdateData, updated_at: new Date().toISOString() } : p;
              });
              savePersistedProfiles(globalThis.__SHARED_SERVER_PROFILES__);
            } else if (table === "organizations") {
              const current = getTableList("organizations");
              globalThis.__SHARED_SERVER_ORGANIZATIONS__ = (current || []).map((o: any) => {
                const matches = filterId ? o.id === filterId : (filters.length > 0 ? filters.every((f: any) => o[f.field] === f.val) : true);
                return matches ? { ...o, ...pendingUpdateData } : o;
              });
              savePersistedOrganizations(globalThis.__SHARED_SERVER_ORGANIZATIONS__);
            } else if (table === "organization_members") {
              const current = getTableList("organization_members");
              globalThis.__SHARED_SERVER_ORG_MEMBERS__ = (current || []).map((m: any) => {
                const matches = filterId ? m.id === filterId : (filters.length > 0 ? filters.every((f: any) => m[f.field] === f.val) : true);
                return matches ? { ...m, ...pendingUpdateData } : m;
              });
              savePersistedOrgMembers(globalThis.__SHARED_SERVER_ORG_MEMBERS__);
            } else if (table === "wallet_transactions") {
              const current = getTableList("wallet_transactions");
              globalThis.__SHARED_SERVER_WALLET_TRANSACTIONS__ = (current || []).map((w: any) => {
                const matches = filterId ? w.id === filterId : (filters.length > 0 ? filters.every((f: any) => w[f.field] === f.val) : true);
                return matches ? { ...w, ...pendingUpdateData } : w;
              });
              savePersistedWalletTransactions(globalThis.__SHARED_SERVER_WALLET_TRANSACTIONS__);
            } else if (table === "invoices") {
              const current = getTableList("invoices");
              globalThis.__SHARED_SERVER_INVOICES__ = (current || []).map((inv: any) => {
                const matches = filterId ? (inv.id === filterId || inv.invoice_number === filterId) : (filters.length > 0 ? filters.every((f: any) => inv[f.field] === f.val) : true);
                return matches ? { ...inv, ...pendingUpdateData } : inv;
              });
              savePersistedInvoices(globalThis.__SHARED_SERVER_INVOICES__);
            } else if (table === "support_requests") {
              const current = getTableList("support_requests");
              globalThis.__SHARED_SERVER_SUPPORT_REQUESTS__ = (current || []).map((s: any) => {
                const matches = filterId ? s.id === filterId : (filters.length > 0 ? filters.every((f: any) => s[f.field] === f.val) : true);
                return matches ? { ...s, ...pendingUpdateData, updated_at: new Date().toISOString() } : s;
              });
              savePersistedSupportRequests(globalThis.__SHARED_SERVER_SUPPORT_REQUESTS__);
            } else if (table === "support_messages") {
              const current = getTableList("support_messages");
              globalThis.__SHARED_SERVER_SUPPORT_MESSAGES__ = (current || []).map((m: any) => {
                const matches = filterId ? m.id === filterId : (filters.length > 0 ? filters.every((f: any) => m[f.field] === f.val) : true);
                return matches ? { ...m, ...pendingUpdateData } : m;
              });
              savePersistedSupportMessages(globalThis.__SHARED_SERVER_SUPPORT_MESSAGES__);
            } else if (table === "deal_reviews") {
              const current = getTableList("deal_reviews");
              globalThis.__SHARED_SERVER_DEAL_REVIEWS__ = (current || []).map((dr: any) => {
                const matches = filterId ? dr.id === filterId : (filters.length > 0 ? filters.every((f: any) => dr[f.field] === f.val) : true);
                return matches ? { ...dr, ...pendingUpdateData } : dr;
              });
              savePersistedDealReviews(globalThis.__SHARED_SERVER_DEAL_REVIEWS__);
            } else if (table === "client_vehicles") {
              const current = getTableList("client_vehicles");
              globalThis.__SHARED_SERVER_CLIENT_VEHICLES__ = (current || []).map((v: any) => {
                const matches = filterId ? v.id === filterId : (filters.length > 0 ? filters.every((f: any) => v[f.field] === f.val) : true);
                return matches ? { ...v, ...pendingUpdateData } : v;
              });
              savePersistedClientVehicles(globalThis.__SHARED_SERVER_CLIENT_VEHICLES__);
            } else if (table === "vendor_branches") {
              const current = getTableList("vendor_branches");
              globalThis.__SHARED_SERVER_VENDOR_BRANCHES__ = (current || []).map((b: any) => {
                const matches = filterId ? b.id === filterId : (filters.length > 0 ? filters.every((f: any) => b[f.field] === f.val) : true);
                return matches ? { ...b, ...pendingUpdateData } : b;
              });
              savePersistedVendorBranches(globalThis.__SHARED_SERVER_VENDOR_BRANCHES__);
            } else if (table === "staff_audit_logs") {
              const current = getTableList("staff_audit_logs");
              globalThis.__SHARED_SERVER_AUDIT_LOGS__ = (current || []).map((al: any) => {
                const matches = filterId ? al.id === filterId : (filters.length > 0 ? filters.every((f: any) => al[f.field] === f.val) : true);
                return matches ? { ...al, ...pendingUpdateData } : al;
              });
              savePersistedAuditLogs(globalThis.__SHARED_SERVER_AUDIT_LOGS__);
            }
          }

          if (pendingDelete) {
            const filterId = filters.find((f) => f.field === "id")?.val;
            const filterRoleId = filters.find((f) => f.field === "role_id")?.val;
            if (filterId || filterRoleId) {
              if (table === "rfqs") {
                const current = getTableList("rfqs");
                globalThis.__SHARED_SERVER_RFQS__ = (current || []).filter((r: any) => r.id !== filterId);
                savePersistedRFQs(globalThis.__SHARED_SERVER_RFQS__);
              } else if (table === "quotes") {
                const current = getTableList("quotes");
                globalThis.__SHARED_SERVER_QUOTES__ = (current || []).filter((q: any) => q.id !== filterId);
                savePersistedQuotes(globalThis.__SHARED_SERVER_QUOTES__);
              } else if (table === "notifications") {
                const current = getTableList("notifications");
                globalThis.__SHARED_SERVER_NOTIFICATIONS__ = (current || []).filter((n: any) => n.id !== filterId);
                savePersistedNotifications(globalThis.__SHARED_SERVER_NOTIFICATIONS__);
              } else if (table === "organization_roles") {
                const current = getTableList("organization_roles");
                globalThis.__SHARED_SERVER_ROLES__ = (current || []).filter((r: any) => r.id !== filterId);
                savePersistedRoles(globalThis.__SHARED_SERVER_ROLES__);
              } else if (table === "role_permissions") {
                const current = getTableList("role_permissions");
                globalThis.__SHARED_SERVER_ROLE_PERMS__ = (current || []).filter((rp: any) => {
                  if (filterRoleId) return rp.role_id !== filterRoleId;
                  if (filterId) return rp.id !== filterId;
                  return true;
                });
                savePersistedRolePermissions(globalThis.__SHARED_SERVER_ROLE_PERMS__);
              } else if (table === "profiles") {
                const current = getTableList("profiles");
                globalThis.__SHARED_SERVER_PROFILES__ = (current || []).filter((p: any) => p.id !== filterId);
                savePersistedProfiles(globalThis.__SHARED_SERVER_PROFILES__);
              } else if (table === "organizations") {
                const current = getTableList("organizations");
                globalThis.__SHARED_SERVER_ORGANIZATIONS__ = (current || []).filter((o: any) => o.id !== filterId);
                savePersistedOrganizations(globalThis.__SHARED_SERVER_ORGANIZATIONS__);
              } else if (table === "organization_members") {
                const current = getTableList("organization_members");
                globalThis.__SHARED_SERVER_ORG_MEMBERS__ = (current || []).filter((m: any) => m.id !== filterId);
                savePersistedOrgMembers(globalThis.__SHARED_SERVER_ORG_MEMBERS__);
              } else if (table === "invoices") {
                const current = getTableList("invoices");
                globalThis.__SHARED_SERVER_INVOICES__ = (current || []).filter((inv: any) => inv.id !== filterId && inv.invoice_number !== filterId);
                savePersistedInvoices(globalThis.__SHARED_SERVER_INVOICES__);
              } else if (table === "wallet_transactions") {
                const current = getTableList("wallet_transactions");
                globalThis.__SHARED_SERVER_WALLET_TRANSACTIONS__ = (current || []).filter((w: any) => w.id !== filterId);
                savePersistedWalletTransactions(globalThis.__SHARED_SERVER_WALLET_TRANSACTIONS__);
              } else if (table === "support_requests") {
                const current = getTableList("support_requests");
                globalThis.__SHARED_SERVER_SUPPORT_REQUESTS__ = (current || []).filter((s: any) => s.id !== filterId);
                savePersistedSupportRequests(globalThis.__SHARED_SERVER_SUPPORT_REQUESTS__);
              } else if (table === "support_messages") {
                const current = getTableList("support_messages");
                globalThis.__SHARED_SERVER_SUPPORT_MESSAGES__ = (current || []).filter((m: any) => m.id !== filterId);
                savePersistedSupportMessages(globalThis.__SHARED_SERVER_SUPPORT_MESSAGES__);
              } else if (table === "deal_reviews") {
                const current = getTableList("deal_reviews");
                globalThis.__SHARED_SERVER_DEAL_REVIEWS__ = (current || []).filter((dr: any) => dr.id !== filterId);
                savePersistedDealReviews(globalThis.__SHARED_SERVER_DEAL_REVIEWS__);
              } else if (table === "client_vehicles") {
                const current = getTableList("client_vehicles");
                globalThis.__SHARED_SERVER_CLIENT_VEHICLES__ = (current || []).filter((v: any) => v.id !== filterId);
                savePersistedClientVehicles(globalThis.__SHARED_SERVER_CLIENT_VEHICLES__);
              } else if (table === "vendor_branches") {
                const current = getTableList("vendor_branches");
                globalThis.__SHARED_SERVER_VENDOR_BRANCHES__ = (current || []).filter((b: any) => b.id !== filterId);
                savePersistedVendorBranches(globalThis.__SHARED_SERVER_VENDOR_BRANCHES__);
              }
            }
          }
        };

        const chain: any = {
          select: () => {
            applyUpdatesOrDeletes();
            return chain;
          },
          insert: (data: any) => {
            const items = Array.isArray(data) ? data : [data];
            let newItems: any[] = [];

            if (table === "organization_roles") {
              newItems = items.map((it) => ({
                id: it.id || `custom_role_${Date.now().toString(36)}`,
                created_at: it.created_at || new Date().toISOString(),
                updated_at: it.updated_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("organization_roles");
              globalThis.__SHARED_SERVER_ROLES__ = [
                ...newItems,
                ...current.filter((r: any) => !newItems.some((n: any) => n.id === r.id))
              ];
              savePersistedRoles(globalThis.__SHARED_SERVER_ROLES__);
            } else if (table === "role_permissions") {
              newItems = items.map((it) => ({
                id: it.id || `rp_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`,
                created_at: new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("role_permissions");
              globalThis.__SHARED_SERVER_ROLE_PERMS__ = [...newItems, ...current];
              savePersistedRolePermissions(globalThis.__SHARED_SERVER_ROLE_PERMS__);
            } else if (table === "staff_audit_logs") {
              newItems = items.map((it) => ({
                id: it.id || `audit_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`,
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("staff_audit_logs");
              globalThis.__SHARED_SERVER_AUDIT_LOGS__ = [...newItems, ...current];
              savePersistedAuditLogs(globalThis.__SHARED_SERVER_AUDIT_LOGS__);
            } else if (table === "profiles") {
              newItems = items.map((it) => ({
                id: it.id || `user_${Date.now().toString(36)}`,
                created_at: it.created_at || new Date().toISOString(),
                is_active: it.is_active !== undefined ? it.is_active : true,
                ...it,
              }));
              const current = getTableList("profiles");
              globalThis.__SHARED_SERVER_PROFILES__ = [
                ...newItems,
                ...current.filter((p: any) => !newItems.some((n: any) => n.id === p.id))
              ];
              savePersistedProfiles(globalThis.__SHARED_SERVER_PROFILES__);
            } else if (table === "organizations") {
              newItems = items.map((it) => ({
                id: it.id || `org_${Date.now().toString(36)}`,
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("organizations");
              globalThis.__SHARED_SERVER_ORGANIZATIONS__ = [
                ...newItems,
                ...current.filter((o: any) => !newItems.some((n: any) => n.id === o.id))
              ];
              savePersistedOrganizations(globalThis.__SHARED_SERVER_ORGANIZATIONS__);
            } else if (table === "organization_members") {
              newItems = items.map((it) => ({
                id: it.id || `mem_${Date.now().toString(36)}`,
                created_at: it.created_at || new Date().toISOString(),
                status: it.status || "active",
                ...it,
              }));
              const current = getTableList("organization_members");
              globalThis.__SHARED_SERVER_ORG_MEMBERS__ = [
                ...newItems,
                ...current.filter((m: any) => !newItems.some((n: any) => n.id === m.id))
              ];
              savePersistedOrgMembers(globalThis.__SHARED_SERVER_ORG_MEMBERS__);
            } else if (table === "wallet_transactions") {
              newItems = items.map((it) => ({
                id: it.id || `tx-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("wallet_transactions");
              globalThis.__SHARED_SERVER_WALLET_TRANSACTIONS__ = [...newItems, ...current];
              savePersistedWalletTransactions(globalThis.__SHARED_SERVER_WALLET_TRANSACTIONS__);
            } else if (table === "invoices") {
              newItems = items.map((it) => ({
                id: it.id || `INV-${Date.now().toString(36)}`,
                invoice_number: it.invoice_number || `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("invoices");
              globalThis.__SHARED_SERVER_INVOICES__ = [...newItems, ...current];
              savePersistedInvoices(globalThis.__SHARED_SERVER_INVOICES__);
            } else if (table === "support_requests") {
              newItems = items.map((it) => ({
                id: it.id || `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
                created_at: it.created_at || new Date().toISOString(),
                status: it.status || "open",
                ...it,
              }));
              const current = getTableList("support_requests");
              globalThis.__SHARED_SERVER_SUPPORT_REQUESTS__ = [...newItems, ...current];
              savePersistedSupportRequests(globalThis.__SHARED_SERVER_SUPPORT_REQUESTS__);
            } else if (table === "support_messages") {
              newItems = items.map((it) => ({
                id: it.id || `msg-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("support_messages");
              globalThis.__SHARED_SERVER_SUPPORT_MESSAGES__ = [...current, ...newItems];
              savePersistedSupportMessages(globalThis.__SHARED_SERVER_SUPPORT_MESSAGES__);
            } else if (table === "deal_reviews") {
              newItems = items.map((it) => ({
                id: it.id || `rev-${Date.now().toString(36)}`,
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("deal_reviews");
              globalThis.__SHARED_SERVER_DEAL_REVIEWS__ = [...newItems, ...current];
              savePersistedDealReviews(globalThis.__SHARED_SERVER_DEAL_REVIEWS__);
            } else if (table === "client_vehicles") {
              newItems = items.map((it) => ({
                id: it.id || `veh-${Date.now().toString(36)}`,
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("client_vehicles");
              globalThis.__SHARED_SERVER_CLIENT_VEHICLES__ = [...newItems, ...current];
              savePersistedClientVehicles(globalThis.__SHARED_SERVER_CLIENT_VEHICLES__);
            } else if (table === "vendor_branches") {
              newItems = items.map((it) => ({
                id: it.id || `br-${Date.now().toString(36)}`,
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("vendor_branches");
              globalThis.__SHARED_SERVER_VENDOR_BRANCHES__ = [...newItems, ...current];
              savePersistedVendorBranches(globalThis.__SHARED_SERVER_VENDOR_BRANCHES__);
            } else if (table === "profiles") {
              newItems = items.map((it) => ({
                id: it.id || crypto.randomUUID(),
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("profiles");
              globalThis.__SHARED_SERVER_PROFILES__ = [...newItems, ...current];
              savePersistedProfiles(globalThis.__SHARED_SERVER_PROFILES__);
            } else if (table === "organizations") {
              newItems = items.map((it) => ({
                id: it.id || crypto.randomUUID(),
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("organizations");
              globalThis.__SHARED_SERVER_ORGANIZATIONS__ = [...newItems, ...current];
              savePersistedOrganizations(globalThis.__SHARED_SERVER_ORGANIZATIONS__);
            } else if (table === "organization_members") {
              newItems = items.map((it) => ({
                id: it.id || crypto.randomUUID(),
                created_at: it.created_at || new Date().toISOString(),
                ...it,
              }));
              const current = getTableList("organization_members");
              globalThis.__SHARED_SERVER_ORG_MEMBERS__ = [...newItems, ...current];
              savePersistedOrgMembers(globalThis.__SHARED_SERVER_ORG_MEMBERS__);
            } else {
              const currentUserId = userIdCookie || (sessionCookie === "vendor" ? "vendor-demo-id" : "client-demo-id");
              const currentUserName = decodedUserName || (sessionCookie === "vendor" ? "مؤسسة قطع الغيار المعتمدة" : "شركة المشتريات الوطنية");

              newItems = items.map((it) => ({
                id: it.id || `${table === "rfqs" ? "RFQ" : table === "quotes" ? "Q" : "ORD"}-${Math.floor(1000 + Math.random() * 9000)}`,
                created_at: new Date().toISOString(),
                status: it.status || (table === "quotes" ? "pending" : "open"),
                quotes: table === "rfqs" ? [] : undefined,
                client: table === "rfqs" ? { full_name: currentUserName, company_name: currentUserName } : undefined,
                client_id: currentUserId,
                profiles: table === "quotes" ? {
                  id: it.vendor_id || currentUserId,
                  full_name: currentUserName,
                  company_name: currentUserName,
                  phone: "0551122334",
                  tax_number: "300123456700003",
                  commercial_register: "1010987654",
                  national_address: "الرياض - طريق خريص"
                } : undefined,
                ...it,
              }));

              if (table === "rfqs") {
                const current = globalThis.__SHARED_SERVER_RFQS__ || [];
                globalThis.__SHARED_SERVER_RFQS__ = [...newItems, ...current];
                savePersistedRFQs(globalThis.__SHARED_SERVER_RFQS__);
              } else if (table === "orders") {
                const current = globalThis.__SHARED_SERVER_ORDERS__ || [];
                globalThis.__SHARED_SERVER_ORDERS__ = [...newItems, ...current];
                savePersistedOrders(globalThis.__SHARED_SERVER_ORDERS__);
              } else if (table === "notifications") {
                const current = globalThis.__SHARED_SERVER_NOTIFICATIONS__ || [];
                globalThis.__SHARED_SERVER_NOTIFICATIONS__ = [...newItems, ...current];
                savePersistedNotifications(globalThis.__SHARED_SERVER_NOTIFICATIONS__);
              } else if (table === "quotes") {
                const current = globalThis.__SHARED_SERVER_QUOTES__ || [];
                const targetRfqId = newItems[0]?.rfq_id;
                const targetVendorId = newItems[0]?.vendor_id;

                // Filter out previous quote from same vendor for this RFQ
                const filteredOld = current.filter((q: any) => !(q.rfq_id === targetRfqId && q.vendor_id === targetVendorId));
                globalThis.__SHARED_SERVER_QUOTES__ = [...newItems, ...filteredOld];
                savePersistedQuotes(globalThis.__SHARED_SERVER_QUOTES__);

                if (targetRfqId && globalThis.__SHARED_SERVER_RFQS__) {
                  globalThis.__SHARED_SERVER_RFQS__ = globalThis.__SHARED_SERVER_RFQS__.map((r: any) => {
                    if (r.id === targetRfqId) {
                      const existingQuotes = (Array.isArray(r.quotes) ? r.quotes : []).filter((q: any) => q.vendor_id !== targetVendorId);
                      return { ...r, status: "quoted", quotes: [...newItems, ...existingQuotes] };
                    }
                    return r;
                  });
                  savePersistedRFQs(globalThis.__SHARED_SERVER_RFQS__);
                }
              }
            }

            insertedData = Array.isArray(data) ? newItems : newItems[0];
            return chain;
          },
          delete: () => {
            pendingDelete = true;
            return chain;
          },
          update: (updateData: any) => {
            pendingUpdateData = updateData;
            return chain;
          },
          eq: (field: string, val: any) => {
            filters.push({ field, val });
            return chain;
          },
          neq: (field: string, val: any) => {
            return chain;
          },
          gte: () => chain,
          lte: () => chain,
          in: (field: string, val: any[]) => {
            filters.push({ field: `${field}_in`, val });
            return chain;
          },
          or: (orExpr: string) => {
            if (orExpr && typeof orExpr === "string") {
              filters.push({ field: "_or_expression", val: orExpr });
            }
            return chain;
          },
          is: () => chain,
          not: () => chain,
          order: (field?: string, opts?: { ascending?: boolean }) => {
            if (field) {
              orderBys.push({ field, ascending: opts?.ascending !== false });
            }
            return chain;
          },
          limit: (n: number) => {
            limitCount = n;
            return chain;
          },
          single: async () => {
            applyUpdatesOrDeletes();
            if (insertedData) return { data: insertedData, error: null };
            let list: any[] = getTableList(table);
            list = sortAndLimitList(list);
            
            let match = list.find((it: any) => filters.every((f: any) => {
              if (f.field === "_or_expression") {
                const clauses = String(f.val).split(",").map((c: string) => c.trim());
                return clauses.some((clause: string) => {
                  const parts = clause.split(".");
                  if (parts.length >= 3) {
                    const [fld, op, v] = parts;
                    if (op === "eq") return String(it[fld] ?? "") === String(v ?? "");
                    if (op === "neq") return String(it[fld] ?? "") !== String(v ?? "");
                  }
                  return false;
                });
              }
              if (f.field.endsWith("_in")) {
                const actualField = f.field.replace("_in", "");
                return Array.isArray(f.val) ? f.val.includes(it[actualField]) : false;
              }
              return String(it[f.field] ?? "") === String(f.val ?? "");
            }));
            if (!match && table === "profiles") {
              const idVal = filters.find((f: any) => f.field === "id")?.val;
              if (idVal === "admin-demo-id" || idVal === "admin") {
                match = {
                  id: "admin-demo-id",
                  role: "admin",
                  is_admin: true,
                  admin_role: "super_admin",
                  is_active: true,
                  full_name: "المدير العام للمنصة",
                  company_name: "إدارة منصة رِفق",
                  phone: "0500000000",
                  city: "الرياض",
                };
              } else if (idVal === "vendor-demo-id") {
                match = {
                  id: "vendor-demo-id",
                  role: "vendor",
                  is_active: true,
                  accepts_pickup: true,
                  full_name: "مورد معتمد",
                  company_name: "مؤسسة قطع الغيار المعتمدة",
                  address: "طريق خريص - حي المنار",
                  national_address: "الرياض - حي المنار",
                  city: "الرياض",
                  district: "حي المنار",
                  phone: "0551122334",
                  business_hours: "8:00 ص - 10:00 م",
                  specialized_brands: [],
                  specializes_in_all_brands: true,
                };
              } else if (idVal === "client-demo-id") {
                match = {
                  id: "client-demo-id",
                  role: "client",
                  is_active: true,
                  full_name: "شركة المشتريات الوطنية",
                  company_name: "شركة المشتريات الوطنية",
                  phone: "0501234567",
                  ref_code: "CUST-101",
                  city: "الرياض",
                };
              } else if (idVal && idVal === userIdCookie) {
                // If user is accessing their own profile and cookies are present
                const userRole = sessionCookie || "client";
                match = {
                  id: idVal,
                  role: userRole,
                  is_admin: userRole === "admin",
                  admin_role: userRole === "admin" ? "staff" : null,
                  is_active: true,
                  full_name: decodedUserName || "مستخدم مسجل",
                  company_name: decodedUserName || "منشأة مسجلة",
                  phone: null,
                  ref_code: `USR-${idVal.slice(0, 5).toUpperCase()}`,
                };
              }
            }
            if (match) return { data: match, error: null };
            return {
              data: null,
              error: { message: "Not found" },
            };
          },
          maybeSingle: async () => {
            applyUpdatesOrDeletes();
            if (insertedData) return { data: insertedData, error: null };
            let list: any[] = getTableList(table);
            list = sortAndLimitList(list);

            if (filters.length === 0) {
              return { data: null, error: null };
            }
            
            let match = list.find((it: any) => filters.every((f: any) => {
              if (f.field === "_or_expression") {
                const clauses = String(f.val).split(",").map((c: string) => c.trim());
                return clauses.some((clause: string) => {
                  const parts = clause.split(".");
                  if (parts.length >= 3) {
                    const [fld, op, v] = parts;
                    if (op === "eq") return String(it[fld] ?? "") === String(v ?? "");
                    if (op === "neq") return String(it[fld] ?? "") !== String(v ?? "");
                  }
                  return false;
                });
              }
              if (f.field.endsWith("_in")) {
                const actualField = f.field.replace("_in", "");
                return Array.isArray(f.val) ? f.val.includes(it[actualField]) : false;
              }
              return String(it[f.field] ?? "") === String(f.val ?? "");
            })) || null;
            if (!match && table === "profiles") {
              const idVal = filters.find((f: any) => f.field === "id")?.val;
              if (idVal === "admin-demo-id" || idVal === "admin") {
                match = {
                  id: "admin-demo-id",
                  role: "admin",
                  is_admin: true,
                  admin_role: "super_admin",
                  is_active: true,
                  full_name: "المدير العام للمنصة",
                  company_name: "إدارة منصة رِفق",
                  phone: "0500000000",
                  city: "الرياض",
                };
              } else if (idVal === "vendor-demo-id") {
                match = {
                  id: "vendor-demo-id",
                  role: "vendor",
                  is_active: true,
                  accepts_pickup: true,
                  full_name: "مورد معتمد",
                  company_name: "مؤسسة قطع الغيار المعتمدة",
                  address: "طريق خريص - حي المنار",
                  national_address: "الرياض - حي المنار",
                  city: "الرياض",
                  district: "حي المنار",
                  phone: "0551122334",
                  business_hours: "8:00 ص - 10:00 م",
                  specialized_brands: [],
                  specializes_in_all_brands: true,
                };
              } else if (idVal === "client-demo-id") {
                match = {
                  id: "client-demo-id",
                  role: "client",
                  is_active: true,
                  full_name: "شركة المشتريات الوطنية",
                  company_name: "شركة المشتريات الوطنية",
                  phone: "0501234567",
                  ref_code: "CUST-101",
                  city: "الرياض",
                };
              } else if (idVal && idVal === userIdCookie) {
                const userRole = sessionCookie || "client";
                match = {
                  id: idVal,
                  role: userRole,
                  is_admin: userRole === "admin",
                  admin_role: userRole === "admin" ? "staff" : null,
                  is_active: true,
                  full_name: decodedUserName || "مستخدم مسجل",
                  company_name: decodedUserName || "منشأة مسجلة",
                  phone: null,
                  ref_code: `USR-${idVal.slice(0, 5).toUpperCase()}`,
                };
              }
            }
            return { data: match, error: null };
          },
          then: (resolve: any) => {
            applyUpdatesOrDeletes();
            if (pendingDelete) {
              resolve({ data: null, error: null });
              return;
            }
            if (insertedData) {
              resolve({ data: insertedData, error: null });
              return;
            }
            let list: any[] = getTableList(table);
            list = sortAndLimitList(list);

            if (filters.length > 0) {
              list = list.filter((item) => {
                return filters.every((f) => {
                  if (f.field === "_or_expression") {
                    const clauses = String(f.val).split(",").map((c: string) => c.trim());
                    return clauses.some((clause: string) => {
                      const parts = clause.split(".");
                      if (parts.length >= 3) {
                        const [fld, op, v] = parts;
                        if (op === "eq") return String(item[fld] ?? "") === String(v ?? "");
                        if (op === "neq") return String(item[fld] ?? "") !== String(v ?? "");
                      }
                      return false;
                    });
                  }
                  if (f.field.endsWith("_in")) {
                    const actualField = f.field.replace("_in", "");
                    return Array.isArray(f.val) ? f.val.includes(item[actualField]) : false;
                  }
                  if (f.field === "id") return item.id === f.val;
                  if (f.field === "rfq_id") return item.rfq_id === f.val;
                  if (f.field === "vendor_id") return item.vendor_id === f.val;
                  if (f.field === "client_id") return item.client_id === f.val;
                  if (f.field === "user_id") return item.user_id === f.val;
                  if (f.field === "ticket_id") return item.ticket_id === f.val;
                  if (f.field === "order_id") return item.order_id === f.val;
                  if (f.field === "role_id") return item.role_id === f.val;
                  if (f.field === "scope") return item.scope === f.val;
                  if (f.field === "status" && f.val === "open" && table === "rfqs") {
                    return item.status === "open" || item.status === "quoted";
                  }
                  if (f.field === "status") return item.status === f.val;
                  if (f.field === "role" && f.val === "admin" && table === "profiles") {
                    return item.role === "admin" || item.is_admin === true;
                  }
                  return item[f.field] === f.val;
                });
              });
            }

            if (table === "rfqs") {
              const allQuotes = (globalThis.__SHARED_SERVER_QUOTES__ && globalThis.__SHARED_SERVER_QUOTES__.length > 0 ? globalThis.__SHARED_SERVER_QUOTES__ : loadPersistedQuotes());
              const allProfiles = (globalThis.__SHARED_SERVER_PROFILES__ && globalThis.__SHARED_SERVER_PROFILES__.length > 0 ? globalThis.__SHARED_SERVER_PROFILES__ : loadPersistedProfiles());
              list = list.map(r => {
                const rQuotes = allQuotes.filter(q => q.rfq_id === r.id);
                const matchedProfile = allProfiles.find((p: any) => p.id === r.client_id);
                const clientObj = matchedProfile ? {
                  full_name: matchedProfile.company_name || matchedProfile.full_name || "شركة المشتريات الوطنية",
                  company_name: matchedProfile.company_name || matchedProfile.full_name || "شركة المشتريات الوطنية",
                  phone: matchedProfile.phone || "0501234567",
                  ref_code: matchedProfile.ref_code || "CUST-101",
                } : (r.client || { full_name: "شركة المشتريات الوطنية", company_name: "شركة المشتريات الوطنية", ref_code: "CUST-101" });

                return {
                  ...r,
                  client: clientObj,
                  profiles: clientObj,
                  quotes: rQuotes.length > 0 ? rQuotes : (Array.isArray(r.quotes) ? r.quotes : []),
                };
              });
            }

            if (table === "orders") {
              const allRfqs = (globalThis.__SHARED_SERVER_RFQS__ && globalThis.__SHARED_SERVER_RFQS__.length > 0 ? globalThis.__SHARED_SERVER_RFQS__ : loadPersistedRFQs());
              list = list.map((o: any) => {
                const matchedRfq = allRfqs.find((r: any) => r.id === o.rfq_id);
                const mergedRfqs = {
                  ...(matchedRfq || {}),
                  ...(o.rfqs || {}),
                  parts_description: o.rfqs?.parts_description || matchedRfq?.parts_description || o.parts_description,
                  delivery_location: o.rfqs?.delivery_location || matchedRfq?.delivery_location || o.delivery_location,
                };
                return {
                  ...o,
                  rfqs: mergedRfqs,
                  parts_description: o.parts_description || mergedRfqs.parts_description,
                };
              });
            }

            if (table === "invoices") {
              const allOrders = (globalThis.__SHARED_SERVER_ORDERS__ && globalThis.__SHARED_SERVER_ORDERS__.length > 0 ? globalThis.__SHARED_SERVER_ORDERS__ : loadPersistedOrders());
              const allProfiles = (globalThis.__SHARED_SERVER_PROFILES__ && globalThis.__SHARED_SERVER_PROFILES__.length > 0 ? globalThis.__SHARED_SERVER_PROFILES__ : loadPersistedProfiles());

              list = list.map((inv: any) => {
                let client = inv.client;
                if (!client && inv.client_id) {
                  client = allProfiles.find((p: any) => p.id === inv.client_id);
                }
                if (!client) {
                  client = {
                    id: "client-demo-id",
                    full_name: "شركة المشتريات الوطنية",
                    company_name: "شركة المشتريات الوطنية",
                    ref_code: "CLI-101",
                    tax_number: "310123456700003",
                  };
                }

                let vendor = inv.vendor;
                if (!vendor && inv.vendor_id) {
                  vendor = allProfiles.find((p: any) => p.id === inv.vendor_id);
                }
                if (!vendor) {
                  vendor = {
                    id: "vendor-demo-id",
                    full_name: "مؤسسة قطع الغيار المعتمدة",
                    company_name: "مؤسسة قطع الغيار المعتمدة",
                    ref_code: "VND-501",
                    tax_number: "300123456700003",
                  };
                }

                let deal = inv.deal;
                const orderId = deal?.order_id || inv.order_id || (String(inv.id).startsWith("INV-") ? String(inv.id).replace("INV-", "ORD-") : inv.id);
                const matchedOrder = allOrders.find((o: any) => o.id === orderId);

                if (!deal || !deal.orders) {
                  deal = {
                    order_id: orderId,
                    orders: {
                      id: orderId,
                      rfq: matchedOrder?.rfqs ? {
                        car_make: matchedOrder.rfqs.car_make,
                        car_model: matchedOrder.rfqs.car_model,
                        car_year: matchedOrder.rfqs.car_year || 2023,
                        plate_number: matchedOrder.rfqs.plate_number,
                        vin: matchedOrder.rfqs.vin,
                      } : undefined,
                    },
                  };
                }

                return {
                  ...inv,
                  client,
                  vendor,
                  deal,
                };
              });
            }

            resolve({ data: list, count: list.length, error: null });
          },
        };
        return chain;
      },
    } as any;
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The "setAll" method was called from a Server Component.
          }
        },
      },
    },
  );
}
