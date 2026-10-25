import { createBrowserClient } from '@supabase/ssr';

// True cross-module singleton via globalThis.
const GLOBAL_KEY = Symbol.for('supabase.browser.client');

type SupabaseClient = ReturnType<typeof createBrowserClient>;

declare global {
  interface Window { [key: symbol]: SupabaseClient | undefined }
}

const DEFAULT_RFQS: any[] = [
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

const DEFAULT_ORDERS: any[] = [
  {
    id: "ORD-5501",
    client_id: "client-demo-id",
    vendor_id: "vendor-demo-id",
    status: "preparing",
    total_price: 2850,
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    rfq_id: "RFQ-8412",
    quote_id: "Q-8412-1",
    rfqs: {
      car_make: "فورد",
      car_model: "توروس",
      car_year: 2023,
      plate_number: "ص ض ط 3344",
      vin: "1FA6P8CF9H5102938",
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
    rfqs: {
      car_make: "تويوتا",
      car_model: "لاندكروزر",
      car_year: 2022,
      plate_number: "ع غ ف 7788",
      vin: "JTMHT05J3D4091223",
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
    rfqs: {
      car_make: "هوندا",
      car_model: "أكورد",
      car_year: 2021,
      plate_number: "ق ك ل 9900",
      vin: "1HGCR2F83MA019284",
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
    rfqs: {
      car_make: "مازدا",
      car_model: "CX-9",
      car_year: 2020,
      plate_number: "م ن هـ 1122",
      vin: "JM3TCABY9L0209384",
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

const DEFAULT_QUOTES: any[] = [];

const DEFAULT_PROFILES: any[] = [
  {
    id: "client-demo-id",
    full_name: "شركة المشتريات الوطنية",
    company_name: "شركة المشتريات الوطنية",
    phone: "0501234567",
    ref_code: "CLI-101",
    role: "client",
    tax_number: "300123456700003",
    commercial_register: "1010987654",
    national_address: "الرياض - طريق الملك فهد - حي العليا",
    is_admin: false,
    created_at: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
  },
  {
    id: "vendor-demo-id",
    full_name: "مؤسسة قطع الغيار المعتمدة",
    company_name: "مؤسسة قطع الغيار المعتمدة",
    phone: "0551122334",
    ref_code: "VND-501",
    role: "vendor",
    tax_number: "300987654300003",
    commercial_register: "1010887766",
    national_address: "الرياض - صناعية الشفاء - طريق خريص",
    is_admin: false,
    created_at: new Date(Date.now() - 25 * 86400 * 1000).toISOString(),
  },
  {
    id: "client-2",
    full_name: "شركة الوفاق لتأجير السيارات",
    company_name: "شركة الوفاق لتأجير السيارات",
    phone: "0543322110",
    ref_code: "CLI-102",
    role: "client",
    tax_number: "300765432100003",
    commercial_register: "1010665544",
    national_address: "جدة - طريق المدينة المنورة - حي الروضة",
    is_admin: false,
    created_at: new Date(Date.now() - 20 * 86400 * 1000).toISOString(),
  },
  {
    id: "vendor-2",
    full_name: "شركة الخليج للقطع والمحركات",
    company_name: "شركة الخليج للقطع والمحركات",
    phone: "0559988776",
    ref_code: "VND-502",
    role: "vendor",
    tax_number: "300876543200003",
    commercial_register: "1010776655",
    national_address: "الدمام - طريق الملك سعود - حي الخالدية",
    is_admin: false,
    created_at: new Date(Date.now() - 15 * 86400 * 1000).toISOString(),
  },
  {
    id: "client-3",
    full_name: "مؤسسة الأفق للخدمات اللوجستية",
    company_name: "مؤسسة الأفق للخدمات اللوجستية",
    phone: "0567788990",
    ref_code: "CLI-103",
    role: "client",
    tax_number: "300654321000003",
    commercial_register: "1010554433",
    national_address: "الرياض - حي السلي - مخرج 18",
    is_admin: false,
    created_at: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
  },
  {
    id: "vendor-3",
    full_name: "مركز التحدي لقطع الغيار الأصلية",
    company_name: "مركز التحدي لقطع الغيار الأصلية",
    phone: "0533344556",
    ref_code: "VND-503",
    role: "vendor",
    tax_number: "300543210900003",
    commercial_register: "1010443322",
    national_address: "مكة المكرمة - صناعية الكعكية",
    is_admin: false,
    created_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
  {
    id: "admin-demo-id",
    full_name: "المدير العام (Super Admin)",
    company_name: "إدارة منصة رفق B2B",
    phone: "0500000000",
    ref_code: "ADM-001",
    role: "client",
    tax_number: "300000000000003",
    commercial_register: "1010101010",
    national_address: "الرياض - المقر الرئيسي",
    is_admin: true,
    admin_role: "super_admin",
    created_at: new Date(Date.now() - 40 * 86400 * 1000).toISOString(),
  },
];

const DEFAULT_NOTIFICATIONS: any[] = [
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

const DEFAULT_INVOICES: any[] = [
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

const DEFAULT_WALLET_TRANSACTIONS: any[] = [
  {
    id: "TXN-5501",
    user_id: "client-demo-id",
    type: "debit",
    direction: "outflow",
    amount: 2850,
    balance_before: 25000,
    balance_after: 22150,
    description: "سداد فاتورة مشتريات #ORD-5501 (قطع فورد توروس)",
    reference: "TXN-5501",
    invoice_number: "INV-2026-005501",
    order_id: "ORD-5501",
    performed_by: "client-demo-id",
    created_at: "2026-08-20T03:15:00.000Z"
  },
  {
    id: "TXN-5501-V",
    user_id: "vendor-demo-id",
    type: "credit",
    direction: "inflow",
    amount: 2850,
    balance_before: 25650,
    balance_after: 28500,
    description: "استحقاق مبيعات الطلب #ORD-5501 (فاتورة INV-2026-005501)",
    reference: "TXN-5501-V",
    invoice_number: "INV-2026-005501",
    order_id: "ORD-5501",
    performed_by: "system",
    created_at: "2026-08-20T03:15:00.000Z"
  },
  {
    id: "TXN-4920",
    user_id: "client-demo-id",
    type: "debit",
    direction: "outflow",
    amount: 3400,
    balance_before: 28400,
    balance_after: 25000,
    description: "سداد فاتورة مشتريات #ORD-4920 (قطع تويوتا لاندكروزر)",
    reference: "TXN-4920",
    invoice_number: "INV-2026-004920",
    order_id: "ORD-4920",
    performed_by: "client-demo-id",
    created_at: "2026-08-19T15:10:00.000Z"
  },
  {
    id: "TXN-3105",
    user_id: "client-demo-id",
    type: "debit",
    direction: "outflow",
    amount: 1650,
    balance_before: 30050,
    balance_after: 28400,
    description: "سداد فاتورة مشتريات #ORD-3105 (قطع هوندا أكورد)",
    reference: "TXN-3105",
    invoice_number: "INV-2026-003105",
    order_id: "ORD-3105",
    performed_by: "client-demo-id",
    created_at: "2026-08-18T16:40:00.000Z"
  },
  {
    id: "TXN-DEP-01",
    user_id: "client-demo-id",
    type: "credit",
    direction: "inflow",
    amount: 30000,
    balance_before: 50,
    balance_after: 30050,
    description: "إيداع بنكي للمحفظة - مصرف الراجحي",
    reference: "DEP-99410",
    invoice_number: null,
    order_id: null,
    performed_by: "client-demo-id",
    created_at: "2026-08-15T10:00:00.000Z"
  }
];

const DEFAULT_SUPPORT_REQUESTS: any[] = [
  {
    id: "TICK-101",
    client_id: "client-demo-id",
    vendor_id: null,
    requester_id: "client-demo-id",
    requester_role: "client",
    order_id: "ORD-5501",
    request_type: "inquiry",
    status: "in_progress",
    subject: "استفسار عن موعد وصول شحنة قطع فورد توروس",
    reason: "أرجو الإفادة عن الوقت المتوقع لوصول مندوب التوصيل لموقع الاستلام في الرياض حي النرجس.",
    created_at: "2026-08-20T05:00:00.000Z",
    reviewed_at: "2026-08-20T05:15:00.000Z",
    client: {
      id: "client-demo-id",
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية",
      phone: "0501234567",
      ref_code: "CLI-101"
    }
  },
  {
    id: "TICK-102",
    client_id: null,
    vendor_id: "vendor-demo-id",
    requester_id: "vendor-demo-id",
    requester_role: "vendor",
    order_id: null,
    request_type: "financial",
    status: "open",
    subject: "طلب تسوية وسحب أرباح مبيعات إلى الحساب البنكي",
    reason: "نرغب في تحويل مبلغ 5,000 ر.س من رصيد المحفظة المتاح إلى الآيبان البنكي المعتمد لمؤسستنا.",
    created_at: "2026-08-20T08:30:00.000Z",
    vendor: {
      id: "vendor-demo-id",
      full_name: "مؤسسة قطع الغيار المعتمدة",
      company_name: "مؤسسة قطع الغيار المعتمدة",
      phone: "0551122334",
      ref_code: "VND-501"
    }
  },
  {
    id: "TICK-103",
    client_id: null,
    vendor_id: null,
    requester_id: "courier-demo-id",
    requester_role: "courier",
    order_id: "ORD-4920",
    request_type: "technical",
    status: "resolved",
    subject: "تأكيد عنوان التسليم بحي السلي بالرياض",
    reason: "تم التنسيق مع العميل وتأكيد نقطة الاستلام والشحنة تم تسليمها بنجاح.",
    created_at: "2026-08-19T14:00:00.000Z",
    reviewed_at: "2026-08-19T14:30:00.000Z"
  }
];

const DEFAULT_SUPPORT_MESSAGES: any[] = [
  {
    id: "msg-101",
    request_id: "TICK-101",
    sender_id: "client-demo-id",
    sender_name: "شركة المشتريات الوطنية",
    sender_role: "client",
    message: "أرجو الإفادة عن الوقت المتوقع لوصول مندوب التوصيل لموقع الاستلام في الرياض حي النرجس.",
    message_text: "أرجو الإفادة عن الوقت المتوقع لوصول مندوب التوصيل لموقع الاستلام في الرياض حي النرجس.",
    created_at: "2026-08-20T05:00:00.000Z"
  },
  {
    id: "msg-102",
    request_id: "TICK-101",
    sender_id: "admin-demo-id",
    sender_name: "فريق الدعم الفني المركزي",
    sender_role: "staff",
    message: "مرحباً بكم، تم التواصل مع مندوب الشحنة وسيكون في موقعكم خلال أقل من 45 دقيقة بإذن الله.",
    message_text: "مرحباً بكم، تم التواصل مع مندوب الشحنة وسيكون في موقعكم خلال أقل من 45 دقيقة بإذن الله.",
    created_at: "2026-08-20T05:15:00.000Z"
  },
  {
    id: "msg-201",
    request_id: "TICK-102",
    sender_id: "vendor-demo-id",
    sender_name: "مؤسسة قطع الغيار المعتمدة",
    sender_role: "vendor",
    message: "نرغب في تحويل مبلغ 5,000 ر.س من رصيد المحفظة المتاح إلى الآيبان البنكي المعتمد لمؤسستنا.",
    message_text: "نرغب في تحويل مبلغ 5,000 ر.س من رصيد المحفظة المتاح إلى الآيبان البنكي المعتمد لمؤسستنا.",
    created_at: "2026-08-20T08:30:00.000Z"
  },
  {
    id: "msg-301",
    request_id: "TICK-103",
    sender_id: "courier-demo-id",
    sender_name: "مندوب التوصيل السريع",
    sender_role: "courier",
    message: "تم استلام الشحنة من المورد بنجاح، ونحتاج تأكيد نقطة التواصل مع مستلم الموقع بحي السلي.",
    message_text: "تم استلام الشحنة من المورد بنجاح، ونحتاج تأكيد نقطة التواصل مع مستلم الموقع بحي السلي.",
    created_at: "2026-08-19T14:00:00.000Z"
  }
];

const DEFAULT_DEAL_REVIEWS: any[] = [
  {
    id: "rev-3105",
    order_id: "ORD-3105",
    vendor_id: "vendor-demo-id",
    client_id: "client-demo-id",
    rating: 5,
    speed_rating: 5,
    parts_quality_rating: 5,
    communication_rating: 5,
    comment: "قطع غيار أصلية ومطابقة تماماً، وسرعة في التجهيز وتواصل احترافي من المورد.",
    created_at: "2026-08-18T18:00:00.000Z",
    client: {
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية"
    }
  },
  {
    id: "rev-2041",
    order_id: "ORD-2041",
    vendor_id: "vendor-demo-id",
    client_id: "client-demo-id",
    rating: 4,
    speed_rating: 4,
    parts_quality_rating: 5,
    communication_rating: 4,
    comment: "جودة القطع ممتازة والتعامل راقي تم استلام الشحنة في وقت مناسب.",
    created_at: "2026-08-15T12:00:00.000Z",
    client: {
      full_name: "شركة المشتريات الوطنية",
      company_name: "شركة المشتريات الوطنية"
    }
  }
];

const DEFAULT_CLIENT_VEHICLES: any[] = [
  {
    id: "veh-001",
    client_id: "client-demo-id",
    brand_id: "ford",
    model_id: "taurus",
    car_make: "فورد",
    car_model: "توروس",
    model_year: 2023,
    car_year: 2023,
    plate_number: "أ ب ج 5501",
    vin: "1FA6P8CF8N5501234",
    color: "أبيض لؤلؤي",
    is_active: true,
    created_at: "2026-08-01T10:00:00.000Z"
  },
  {
    id: "veh-002",
    client_id: "client-demo-id",
    brand_id: "toyota",
    model_id: "land-cruiser",
    car_make: "تويوتا",
    car_model: "لاندكروزر",
    model_year: 2022,
    car_year: 2022,
    plate_number: "ع غ ف 7788",
    vin: "JTMHT05J3D4091223",
    color: "فضي",
    is_active: true,
    created_at: "2026-08-01T10:00:00.000Z"
  },
  {
    id: "veh-003",
    client_id: "client-demo-id",
    brand_id: "honda",
    model_id: "accord",
    car_make: "هوندا",
    car_model: "أكورد",
    model_year: 2021,
    car_year: 2021,
    plate_number: "ق ك ل 9900",
    vin: "1HGCR2F83MA019284",
    color: "أسود",
    is_active: true,
    created_at: "2026-08-01T10:00:00.000Z"
  }
];

const DEFAULT_VENDOR_BRANCHES: any[] = [
  {
    id: "br-riyadh-central",
    vendor_id: "vendor-demo-id",
    name: "فرع الرياض الرئيسي - حي المنار",
    city: "الرياض",
    district: "حي المنار",
    address: "طريق خريص - بجوار كوبري الخليج",
    latitude: 24.7136,
    longitude: 46.6753,
    contact_name: "م. سالم القحطاني",
    contact_phone: "0551122334",
    is_main: true,
    is_active: true,
    created_at: "2026-08-01T10:00:00.000Z"
  },
  {
    id: "br-riyadh-north",
    vendor_id: "vendor-demo-id",
    name: "فرع شمال الرياض - صناعية الصحافة",
    city: "الرياض",
    district: "حي الصحافة",
    address: "طريق الملك فهد - صناعية الشمال",
    latitude: 24.7892,
    longitude: 46.6341,
    contact_name: "أبو فهد",
    contact_phone: "0559988771",
    is_main: false,
    is_active: true,
    created_at: "2026-08-01T10:00:00.000Z"
  },
  {
    id: "br-jeddah-west",
    vendor_id: "vendor-demo-id",
    name: "فرع جدة الغربي - طريق المدينة",
    city: "جدة",
    district: "حي الروضة",
    address: "طريق المدينة المنورة - كوبري التحلية",
    latitude: 21.5433,
    longitude: 39.1728,
    contact_name: "عمر الحربي",
    contact_phone: "0563344556",
    is_main: false,
    is_active: true,
    created_at: "2026-08-01T10:00:00.000Z"
  }
];

const DEFAULT_STAFF_AUDIT_LOGS: any[] = [
  {
    id: "audit-101",
    actor_id: "client-demo-id",
    performed_by: "client-demo-id",
    actor_name: "شركة المشتريات الوطنية",
    actor_role: "client",
    actor_ref_code: "CLI-101",
    action: "ORDER_CREATED",
    entity_type: "order",
    table_name: "orders",
    entity_id: "ORD-5501",
    record_id: "ORD-5501",
    details: "إنشاء طلب شراء جديد #ORD-5501 لقطع فورد توروس 2023 بقيمة 2,850 ر.س",
    description: "إنشاء طلب شراء جديد #ORD-5501 لقطع فورد توروس 2023 بقيمة 2,850 ر.س",
    created_at: "2026-08-20T02:00:00.000Z",
    timestamp: "2026-08-20T02:00:00.000Z",
    actor: {
      full_name: "شركة المشتريات الوطنية",
      ref_code: "CLI-101",
      role: "client"
    }
  },
  {
    id: "audit-102",
    actor_id: "vendor-demo-id",
    performed_by: "vendor-demo-id",
    actor_name: "مؤسسة قطع الغيار المعتمدة",
    actor_role: "vendor",
    actor_ref_code: "VND-501",
    action: "QUOTE_SUBMITTED",
    entity_type: "quote",
    table_name: "quotes",
    entity_id: "Q-8412-1",
    record_id: "Q-8412-1",
    details: "تقديم عرض سعر بمبلغ 2,850 ر.س للطلب #RFQ-8412 مع ضمان 6 أشهر",
    description: "تقديم عرض سعر بمبلغ 2,850 ر.س للطلب #RFQ-8412 مع ضمان 6 أشهر",
    created_at: "2026-08-20T02:15:00.000Z",
    timestamp: "2026-08-20T02:15:00.000Z",
    actor: {
      full_name: "مؤسسة قطع الغيار المعتمدة",
      ref_code: "VND-501",
      role: "vendor"
    }
  },
  {
    id: "audit-103",
    actor_id: "client-demo-id",
    performed_by: "client-demo-id",
    actor_name: "شركة المشتريات الوطنية",
    actor_role: "client",
    actor_ref_code: "CLI-101",
    action: "QUOTE_ACCEPTED",
    entity_type: "deal",
    table_name: "orders",
    entity_id: "ORD-5501",
    record_id: "ORD-5501",
    details: "قبول عرض السعر المقدم من مؤسسة قطع الغيار المعتمدة واعتماد الصفقة",
    description: "قبول عرض السعر المقدم من مؤسسة قطع الغيار المعتمدة واعتماد الصفقة",
    created_at: "2026-08-20T03:00:00.000Z",
    timestamp: "2026-08-20T03:00:00.000Z",
    actor: {
      full_name: "شركة المشتريات الوطنية",
      ref_code: "CLI-101",
      role: "client"
    }
  },
  {
    id: "audit-104",
    actor_id: "client-demo-id",
    performed_by: "client-demo-id",
    actor_name: "شركة المشتريات الوطنية",
    actor_role: "client",
    actor_ref_code: "CLI-101",
    action: "WALLET_DEBIT",
    entity_type: "wallet",
    table_name: "wallet_transactions",
    entity_id: "TXN-5501",
    record_id: "TXN-5501",
    details: "سداد فاتورة الصفقة #ORD-5501 من المحفظة بمبلغ 2,850 ر.س (فاتورة INV-2026-005501)",
    description: "سداد فاتورة الصفقة #ORD-5501 من المحفظة بمبلغ 2,850 ر.س (فاتورة INV-2026-005501)",
    created_at: "2026-08-20T03:15:00.000Z",
    timestamp: "2026-08-20T03:15:00.000Z",
    actor: {
      full_name: "شركة المشتريات الوطنية",
      ref_code: "CLI-101",
      role: "client"
    }
  }
];

function getStoredTable(table: string): any[] {
  const normTable = table === "audit_logs" ? "staff_audit_logs" : table;
  const getDefault = (t: string): any[] => {
    switch (t) {
      case "rfqs": return DEFAULT_RFQS;
      case "quotes": return DEFAULT_QUOTES;
      case "orders": return DEFAULT_ORDERS;
      case "profiles": return DEFAULT_PROFILES;
      case "notifications": return DEFAULT_NOTIFICATIONS;
      case "invoices": return DEFAULT_INVOICES;
      case "wallet_transactions": return DEFAULT_WALLET_TRANSACTIONS;
      case "support_requests": return DEFAULT_SUPPORT_REQUESTS;
      case "support_messages": return DEFAULT_SUPPORT_MESSAGES;
      case "deal_reviews": return DEFAULT_DEAL_REVIEWS;
      case "client_vehicles": return DEFAULT_CLIENT_VEHICLES;
      case "vendor_branches": return DEFAULT_VENDOR_BRANCHES;
      case "staff_audit_logs": return DEFAULT_STAFF_AUDIT_LOGS;
      default: return [];
    }
  };

  if (typeof window === "undefined") {
    return getDefault(normTable);
  }
  try {
    const raw = localStorage.getItem(`rfq_demo_${normTable}`);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0) {
          if (normTable === "profiles" && !parsed[0].full_name) {
            setStoredTable(normTable, DEFAULT_PROFILES, false);
            return DEFAULT_PROFILES;
          }
          if (normTable === "notifications" && (!parsed[0].title || !parsed[0].message)) {
            setStoredTable(normTable, DEFAULT_NOTIFICATIONS, false);
            return DEFAULT_NOTIFICATIONS;
          }
          if (normTable === "invoices" && (!parsed[0].issued_at || !parsed[0].invoice_number)) {
            setStoredTable(normTable, DEFAULT_INVOICES, false);
            return DEFAULT_INVOICES;
          }
          if (normTable === "wallet_transactions" && (parsed[0].amount === undefined || parsed[0].balance_after === undefined)) {
            setStoredTable(normTable, DEFAULT_WALLET_TRANSACTIONS, false);
            return DEFAULT_WALLET_TRANSACTIONS;
          }
        }
        return parsed;
      }
    }
  } catch (e) {}
  const fallback = getDefault(normTable);
  if (fallback.length > 0) {
    setStoredTable(normTable, fallback, false);
  }
  return fallback;
}

function setStoredTable(table: string, items: any[], notify: boolean = true) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`rfq_demo_${table}`, JSON.stringify(items));
    if (notify) {
      window.dispatchEvent(new Event("rfq_data_changed"));
    }
  } catch (e) {}
}

export function createClient(): SupabaseClient {
  const store: Record<symbol, SupabaseClient | undefined> =
    typeof window !== 'undefined' ? (window as any) : (globalThis as any);

  if (!store[GLOBAL_KEY]) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!url || url.includes("demo-rfq-marketplace")) {
      const getActiveSession = () => {
        if (typeof document === 'undefined') return null;
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

        // If on auth pages, user is unauthenticated
        if (currentPath.startsWith('/auth')) {
          return null;
        }

        const getCookie = (name: string) => {
          const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
          return m ? decodeURIComponent(m[1]) : null;
        };

        const sessionValue = getCookie("rfq_session");
        const userIdCookie = getCookie("rfq_user_id");
        const userEmailCookie = getCookie("rfq_user_email");
        const userNameCookie = getCookie("rfq_user_name");

        if (userIdCookie) {
          const allProfiles = getStoredTable("profiles");
          const matchedProfile = allProfiles.find((p: any) => p.id === userIdCookie);
          const role = matchedProfile?.role || sessionValue || (currentPath.startsWith('/admin') ? 'admin' : currentPath.startsWith('/vendor') ? 'vendor' : 'client');
          const fullName = userNameCookie || matchedProfile?.company_name || matchedProfile?.full_name || (role === 'vendor' ? 'مورد معتمد' : role === 'admin' ? 'مشرف النظام' : 'منشأة عميل');
          const email = userEmailCookie || matchedProfile?.email || (role === 'vendor' ? 'vendor@rfqsa.tech' : 'client@rfqsa.tech');

          return {
            user: {
              id: userIdCookie,
              email: email,
              user_metadata: {
                role,
                full_name: fullName,
                company_name: matchedProfile?.company_name || fullName,
                ref_code: matchedProfile?.ref_code || "",
                is_admin: role === "admin",
              }
            }
          };
        }

        if (currentPath.startsWith('/admin') || sessionValue === 'admin') {
          return {
            user: {
              id: "admin-demo-id",
              email: "admin@rfqsa.tech",
              user_metadata: { role: "admin", full_name: "المدير العام للمنصة", company_name: "إدارة منصة رفق" }
            }
          };
        } else if (sessionValue === 'vendor' || (!sessionValue && currentPath.startsWith('/vendor'))) {
          return {
            user: {
              id: "vendor-demo-id",
              email: "vendor@rfqsa.tech",
              user_metadata: { role: "vendor", full_name: "مؤسسة قطع الغيار المعتمدة", company_name: "مؤسسة قطع الغيار المعتمدة" }
            }
          };
        } else if (sessionValue === 'client' || (!sessionValue && (currentPath.startsWith('/client') || currentPath.startsWith('/deal')))) {
          return {
            user: {
              id: "client-demo-id",
              email: "client@rfqsa.tech",
              user_metadata: { role: "client", full_name: "شركة المشتريات الوطنية", company_name: "شركة المشتريات الوطنية" }
            }
          };
        }

        // Return null when unauthenticated on public pages
        return null;
      };

      store[GLOBAL_KEY] = {
        auth: {
          getUser: async () => {
            const session = getActiveSession();
            return session ? { data: { user: session.user }, error: null } : { data: { user: null }, error: null };
          },
          getSession: async () => {
            const session = getActiveSession();
            return session ? { data: { session }, error: null } : { data: { session: null }, error: null };
          },
          signInWithPassword: async ({ email, role: explicitRole, id: explicitId }: { email?: string; role?: string; id?: string } = {}) => {
            let role = explicitRole;
            let userId = explicitId;

            if (typeof document !== 'undefined') {
              const getCookie = (name: string) => {
                const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
                return m ? decodeURIComponent(m[1]) : null;
              };

              const existingSession = getCookie("rfq_session");
              const existingUserId = getCookie("rfq_user_id");

              if (!role && existingSession) {
                role = existingSession;
              }

              if (!role || !userId) {
                const allProfiles = getStoredTable("profiles");
                const matched = allProfiles.find((p: any) =>
                  (email && p.email?.toLowerCase() === email.toLowerCase()) ||
                  (existingUserId && p.id === existingUserId)
                );
                if (matched) {
                  role = role || matched.role;
                  userId = userId || matched.id;
                }
              }

              if (!role) {
                role = email?.includes("admin") ? "admin" : (email?.includes("vendor") || email?.includes("supplier")) ? "vendor" : "client";
              }

              if (role && role !== existingSession) {
                document.cookie = `rfq_session=${role}; path=/; max-age=86400; SameSite=Lax`;
              }
              if (userId && userId !== existingUserId) {
                document.cookie = `rfq_user_id=${userId}; path=/; max-age=86400; SameSite=Lax`;
              }
            }

            const effectiveId = userId || (typeof document !== 'undefined' ? (document.cookie.match(/(?:^|; )rfq_user_id=([^;]*)/)?.[1]) : null) || (role === "vendor" ? "vendor-demo-id" : "client-demo-id");

            return { data: { user: { id: effectiveId, email: email || `${effectiveId}@rfqsa.tech`, role }, session: {} }, error: null };
          },
          signUp: async () => ({
            data: { user: null, session: null },
            error: { message: "التسجيل مغلق حالياً، يتم إنشاء الحسابات من خلال إدارة المنصة حصراً" } as any,
          }),
          signOut: async () => {
            if (typeof document !== 'undefined') {
              document.cookie = "rfq_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              document.cookie = "rfq_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              document.cookie = "rfq_user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              document.cookie = "rfq_user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              document.cookie = "rfq_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              document.cookie = "rfq_org_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              document.cookie = "rfq_member_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
              try {
                localStorage.removeItem('sb-auth-token');
                localStorage.removeItem('supabase.auth.token');
                sessionStorage.clear();
              } catch (e) {}
            }
            return { error: null };
          },
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
        storage: {
          from: () => ({
            upload: async (path: string) => ({ data: { path }, error: null }),
            getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
          }),
        },
        channel: () => {
          const ch: any = {
            on: () => ch,
            subscribe: () => ch,
            unsubscribe: () => ch,
          };
          return ch;
        },
        removeChannel: () => {},
        from: (table: string) => {
          let currentFilters: { field: string; val: any }[] = [];

          const chain: any = {
            select: () => chain,
            eq: (field: string, val: any) => {
              currentFilters.push({ field, val });
              return chain;
            },
            neq: () => chain,
            gte: () => chain,
            lte: () => chain,
            in: () => chain,
            or: () => chain,
            is: () => chain,
            not: () => chain,
            order: () => chain,
            limit: () => chain,
            insert: (data: any) => {
              const list = getStoredTable(table);
              const itemsToAdd = Array.isArray(data) ? data : [data];
              const activeSession = getActiveSession();
              const curUserId = activeSession?.user?.id || "client-demo-id";
              const curUserName = activeSession?.user?.user_metadata?.company_name || activeSession?.user?.user_metadata?.full_name || "شركة المشتريات الوطنية";

              const newItems = itemsToAdd.map((it) => ({
                id: it.id || `${table === 'rfqs' ? 'RFQ' : table === 'quotes' ? 'Q' : table === 'notifications' ? 'NOTIF' : table === 'deals' ? 'DEAL' : 'ORD'}-${Math.floor(1000 + Math.random() * 9000)}`,
                status: it.status || (table === "quotes" ? "pending" : "open"),
                created_at: new Date().toISOString(),
                quotes: table === "rfqs" ? [] : undefined,
                client: table === "rfqs" ? { full_name: curUserName, company_name: curUserName } : undefined,
                client_id: curUserId,
                profiles: table === "quotes" ? (() => {
                  const storedProfiles = getStoredTable("profiles");
                  const targetVId = it.vendor_id || curUserId;
                  const found = storedProfiles.find((p: any) => p.id === targetVId);
                  if (found) {
                    return {
                      id: found.id,
                      full_name: found.full_name || found.company_name || "مورد معتمد",
                      company_name: found.company_name || found.full_name || "مورد معتمد",
                      phone: found.phone || "0551122334",
                      city: found.city || "",
                      tax_number: found.tax_number || "300123456700003",
                      commercial_register: found.commercial_register || "1010987654",
                      national_address: found.national_address || found.address || "الرياض",
                      ref_code: found.ref_code || "VND-501",
                      rating: found.rating || 5.0,
                    };
                  }
                  return it.profiles || {
                    id: targetVId,
                    full_name: curUserName,
                    company_name: curUserName,
                    phone: "0551122334",
                    tax_number: "300123456700003",
                    commercial_register: "1010987654",
                    national_address: "الرياض - طريق خريص",
                  };
                })() : undefined,
                ...it,
                ...(table === "quotes" && it.vendor_id ? {
                  profiles: (() => {
                    const storedProfiles = getStoredTable("profiles");
                    const found = storedProfiles.find((p: any) => p.id === it.vendor_id);
                    if (found) {
                      return {
                        id: found.id,
                        full_name: found.full_name || found.company_name,
                        company_name: found.company_name || found.full_name,
                        phone: found.phone || "0551122334",
                        tax_number: found.tax_number || "300123456700003",
                        commercial_register: found.commercial_register || "1010987654",
                        national_address: found.national_address || found.address || "الرياض",
                        ref_code: found.ref_code || "VND-501",
                      };
                    }
                    return it.profiles;
                  })()
                } : {})
              }));
              const updated = [...newItems, ...list];
              setStoredTable(table, updated);

              if (table === "quotes" && typeof window !== "undefined") {
                const targetRfqId = newItems[0]?.rfq_id;
                const targetVendorId = newItems[0]?.vendor_id;
                if (targetRfqId) {
                  try {
                    const rfqsList = getStoredTable("rfqs");
                    const updatedRfqs = rfqsList.map((r: any) => {
                      if (r.id === targetRfqId) {
                        const existingQuotes = (Array.isArray(r.quotes) ? r.quotes : []).filter(
                          (q: any) => q.vendor_id !== targetVendorId
                        );
                        return {
                          ...r,
                          status: "quoted",
                          quotes: [...newItems, ...existingQuotes],
                        };
                      }
                      return r;
                    });
                    setStoredTable("rfqs", updatedRfqs, true);
                  } catch (rfqErr) {
                    console.warn("Failed to sync RFQ quotes in local storage:", rfqErr);
                  }
                }

                try {
                  fetch("/api/quotes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newItems[0]),
                  }).catch(() => {});
                } catch (e) {}
              }

              if (table === "orders" && typeof window !== "undefined") {
                try {
                  fetch("/api/v1/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newItems[0]),
                  }).catch(() => {});
                } catch (e) {}
              }

              if (table === "support_requests" && typeof window !== "undefined") {
                try {
                  fetch("/api/v1/support", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newItems[0]),
                  }).catch(() => {});
                } catch (e) {}
              }

              const resultPayload = { data: newItems, error: null };
              const queryBuilder: any = {
                data: newItems,
                error: null,
                select: (_cols?: string) => ({
                  data: newItems,
                  error: null,
                  single: async () => ({ data: newItems[0], error: null }),
                  maybeSingle: async () => ({ data: newItems[0], error: null }),
                  then: (resolve: any, reject: any) => Promise.resolve(resultPayload).then(resolve, reject),
                }),
                single: async () => ({ data: newItems[0], error: null }),
                maybeSingle: async () => ({ data: newItems[0], error: null }),
                then: (resolve: any, reject: any) => Promise.resolve(resultPayload).then(resolve, reject),
              };

              return queryBuilder;
            },
            upsert: async (data: any) => {
              const list = getStoredTable(table);
              const itemsToAdd = Array.isArray(data) ? data : [data];
              const updated = [...itemsToAdd, ...list];
              setStoredTable(table, updated);
              return { data: itemsToAdd, error: null };
            },
            update: async (data: any) => {
              const list = getStoredTable(table);
              const updated = list.map((item) => {
                const matches = currentFilters.every(f => item[f.field] === f.val);
                return matches ? { ...item, ...data } : item;
              });
              setStoredTable(table, updated);
              return { data: updated, error: null };
            },
            single: async () => {
              let list = getStoredTable(table);
              let item = list.find((it) => currentFilters.every(f => it[f.field] === f.val));
              const idFilter = currentFilters.find(f => f.field === "id");

              // If not found in localStorage and we are looking for a specific RFQ ID, fetch from server API
              if (!item && idFilter?.val && table === "rfqs" && typeof window !== "undefined") {
                try {
                  const res = await fetch(`/api/rfqs/${idFilter.val}`);
                  if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.rfq) {
                      item = json.rfq;
                      setStoredTable(table, [item, ...list]);
                    }
                  }
                } catch (e) {}
              }

              // If checking profile and id filter provided, fetch live profile and balance from server API
              if (table === "profiles" && idFilter?.val && typeof window !== "undefined") {
                try {
                  const res = await fetch(`/api/v1/wallet?userId=${encodeURIComponent(idFilter.val)}`, { cache: "no-store", credentials: "include" });
                  if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.profile) {
                      item = { ...json.profile, balance: json.balance, wallet_balance: json.balance };
                    }
                  }
                } catch (e) {}
              }

              // Fallback ONLY if no ID filter was specified
              if (!item && !idFilter && list.length > 0) {
                item = list[0];
              }

              if (!item && table === "profiles") {
                const getCookie = (name: string) => {
                  if (typeof document === "undefined") return null;
                  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
                  return m ? decodeURIComponent(m[1]) : null;
                };
                const cSession = getCookie("rfq_session");
                const cName = getCookie("rfq_user_name");
                const idVal = idFilter?.val;

                if (idVal === "admin-demo-id") {
                  item = {
                    id: "admin-demo-id",
                    role: "admin",
                    is_admin: true,
                    full_name: "المدير العام للمنصة",
                    company_name: "إدارة منصة رِفق",
                    ref_code: "ADM-001",
                  };
                } else if (idVal === "vendor-demo-id") {
                  item = {
                    id: "vendor-demo-id",
                    role: "vendor",
                    is_admin: false,
                    full_name: "مؤسسة قطع الغيار المعتمدة",
                    company_name: "مؤسسة قطع الغيار المعتمدة",
                    ref_code: "VND-501",
                    specializes_in_all_brands: true,
                    specializes_in_all_categories: true,
                    specialized_brands: [],
                    specialized_categories: [],
                  };
                } else if (idVal === "client-demo-id") {
                  item = {
                    id: "client-demo-id",
                    role: "client",
                    is_admin: false,
                    full_name: "شركة المشتريات الوطنية",
                    company_name: "شركة المشتريات الوطنية",
                    ref_code: "CLI-101",
                  };
                } else if (idVal) {
                  item = {
                    id: idVal,
                    role: cSession || "client",
                    is_admin: cSession === "admin",
                    full_name: cName || (cSession === "vendor" ? "متجر مورد" : "منشأة عميل"),
                    company_name: cName || (cSession === "vendor" ? "متجر مورد" : "منشأة عميل"),
                    ref_code: `USR-${String(idVal).slice(0, 5).toUpperCase()}`,
                    balance: 0,
                    wallet_balance: 0,
                  };
                }
              }
              return { data: item || null, error: item ? null : { message: "Row not found" } };
            },
            maybeSingle: async () => {
              let list = getStoredTable(table);
              let item = list.find((it) => currentFilters.every(f => it[f.field] === f.val)) || null;
              const idFilter = currentFilters.find(f => f.field === "id");

              // If not found in localStorage and we are looking for a specific RFQ ID, fetch from server API
              if (!item && idFilter?.val && table === "rfqs" && typeof window !== "undefined") {
                try {
                  const res = await fetch(`/api/rfqs/${idFilter.val}`);
                  if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.rfq) {
                      item = json.rfq;
                      setStoredTable(table, [item, ...list]);
                    }
                  }
                } catch (e) {}
              }

              // If checking profile and id filter provided, fetch live profile and balance from server API
              if (table === "profiles" && idFilter?.val && typeof window !== "undefined") {
                try {
                  const res = await fetch(`/api/v1/wallet?userId=${encodeURIComponent(idFilter.val)}`, { cache: "no-store", credentials: "include" });
                  if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.profile) {
                      item = { ...json.profile, balance: json.balance, wallet_balance: json.balance };
                    }
                  }
                } catch (e) {}
              }

              return { data: item, error: null };
            },
            then: async (resolve: any) => {
              if (table === "rfqs" && typeof window !== "undefined") {
                try {
                  const res = await fetch("/api/rfqs", { cache: "no-store" });
                  if (res.ok) {
                    const json = await res.json();
                    if (json.success && Array.isArray(json.rfqs) && json.rfqs.length > 0) {
                      setStoredTable("rfqs", json.rfqs, false);
                    }
                  }
                } catch (e) {}
              }

              if (table === "support_requests" && typeof window !== "undefined") {
                try {
                  const res = await fetch("/api/v1/support", { cache: "no-store" });
                  if (res.ok) {
                    const json = await res.json();
                    if (json.success && Array.isArray(json.tickets)) {
                      setStoredTable("support_requests", json.tickets, false);
                    }
                  }
                } catch (e) {}
              }

              if ((table === "wallet_transactions" || table === "profiles") && typeof window !== "undefined") {
                try {
                  const userFilter = currentFilters.find(f => f.field === "user_id" || f.field === "id")?.val;
                  const url = userFilter ? `/api/v1/wallet?userId=${encodeURIComponent(userFilter)}` : "/api/v1/wallet";
                  const res = await fetch(url, { cache: "no-store", credentials: "include" });
                  if (res.ok) {
                    const json = await res.json();
                    if (json.success && Array.isArray(json.transactions)) {
                      const existing = getStoredTable("wallet_transactions");
                      const serverTxIds = new Set(json.transactions.map((t: any) => t.id));
                      const merged = [...json.transactions, ...existing.filter((t: any) => !serverTxIds.has(t.id))];
                      setStoredTable("wallet_transactions", merged, false);
                    }
                    if (json.success && json.profile) {
                      const existingProfiles = getStoredTable("profiles");
                      const updatedProfiles = existingProfiles.map((p: any) =>
                        p.id === json.profile.id ? { ...p, ...json.profile, balance: json.balance, wallet_balance: json.balance } : p
                      );
                      if (!updatedProfiles.some((p: any) => p.id === json.profile.id)) {
                        updatedProfiles.push({ ...json.profile, balance: json.balance, wallet_balance: json.balance });
                      }
                      setStoredTable("profiles", updatedProfiles, false);
                    }
                  }
                } catch (e) {}
              }

              if (table === "orders" || table === "invoices") {
                if (typeof window !== "undefined") {
                  try {
                    const res = await fetch("/api/v1/orders", { cache: "no-store" });
                    if (res.ok) {
                      const json = await res.json();
                      if (json.success && Array.isArray(json.orders) && json.orders.length > 0) {
                        const existing = getStoredTable("orders");
                        const serverOrderIds = new Set(json.orders.map((o: any) => o.id));
                        const merged = [...json.orders, ...existing.filter((o: any) => !serverOrderIds.has(o.id))];
                        setStoredTable("orders", merged, false);
                      }
                    }
                  } catch (e) {}
                }
              }

              let list = getStoredTable(table);
              if (currentFilters.length > 0) {
                list = list.filter(item => {
                  return currentFilters.every(f => {
                    if (f.field === "id") return item.id === f.val;
                    if (f.field === "rfq_id") return item.rfq_id === f.val;
                    if (f.field === "vendor_id") return item.vendor_id === f.val;
                    if (f.field === "client_id") return item.client_id === f.val;
                    if (f.field === "user_id") return item.user_id === f.val;
                    if (f.field === "request_id" || f.field === "ticket_id") return (item.request_id === f.val || item.ticket_id === f.val);
                    if (f.field === "order_id") return item.order_id === f.val;
                    if (f.field === "status" && f.val === "open" && table === "rfqs") {
                      return item.status === "open" || item.status === "quoted";
                    }
                    if (f.field === "status") return item.status === f.val;
                    return item[f.field] === f.val;
                  });
                });
              }

              if (table === "quotes") {
                const allProfiles = getStoredTable("profiles");
                list = list.map((q: any) => {
                  const matchedVendor = allProfiles.find((p: any) => p.id === q.vendor_id);
                  if (matchedVendor) {
                    return {
                      ...q,
                      profiles: {
                        id: matchedVendor.id,
                        full_name: matchedVendor.full_name || matchedVendor.company_name || "مورد معتمد",
                        company_name: matchedVendor.company_name || matchedVendor.full_name || "مورد معتمد",
                        phone: matchedVendor.phone || q.profiles?.phone || "0551122334",
                        city: matchedVendor.city || "",
                        district: matchedVendor.district || "",
                        address: matchedVendor.address || "",
                        tax_number: matchedVendor.tax_number || q.profiles?.tax_number || "300123456700003",
                        commercial_register: matchedVendor.commercial_register || q.profiles?.commercial_register || "1010987654",
                        national_address: matchedVendor.national_address || matchedVendor.address || q.profiles?.national_address || "الرياض",
                        ref_code: matchedVendor.ref_code || q.profiles?.ref_code || "VND-501",
                        rating: matchedVendor.rating || 5.0,
                        orders_count: matchedVendor.orders_count || 0,
                        completed_deals: matchedVendor.completed_deals || 0,
                        commitment_rate: matchedVendor.commitment_rate || "98%",
                      }
                    };
                  }
                  return q;
                });
              }

              if (table === "rfqs") {
                const allQuotes = getStoredTable("quotes");
                const allProfiles = getStoredTable("profiles");
                list = list.map(r => {
                  const rQuotes = allQuotes.filter(q => q.rfq_id === r.id).map((q: any) => {
                    const matchedVendor = allProfiles.find((p: any) => p.id === q.vendor_id);
                    if (matchedVendor) {
                      return {
                        ...q,
                        profiles: {
                          id: matchedVendor.id,
                          full_name: matchedVendor.full_name || matchedVendor.company_name || "مورد معتمد",
                          company_name: matchedVendor.company_name || matchedVendor.full_name || "مورد معتمد",
                          phone: matchedVendor.phone || q.profiles?.phone || "",
                          city: matchedVendor.city || "",
                          district: matchedVendor.district || "",
                          address: matchedVendor.address || "",
                          tax_number: matchedVendor.tax_number || q.profiles?.tax_number || "",
                          commercial_register: matchedVendor.commercial_register || q.profiles?.commercial_register || "",
                          national_address: matchedVendor.national_address || matchedVendor.address || q.profiles?.national_address || "",
                          ref_code: matchedVendor.ref_code || q.profiles?.ref_code || "",
                          rating: matchedVendor.rating || 5.0,
                        }
                      };
                    }
                    return q;
                  });
                  return {
                    ...r,
                    quotes: rQuotes.length > 0 ? rQuotes : (Array.isArray(r.quotes) ? r.quotes : []),
                  };
                });
              }

              if (table === "orders") {
                const allRfqs = getStoredTable("rfqs");
                const allProfiles = getStoredTable("profiles");
                const allQuotes = getStoredTable("quotes");

                list = list.map(order => {
                  let matchedRfq = order.rfq || order.rfqs;
                  if (!matchedRfq && order.rfq_id) {
                    matchedRfq = allRfqs.find((r: any) => r.id === order.rfq_id);
                  }
                  if (!matchedRfq) {
                    if (order.total_price === 1850 || String(order.id).includes("8412") || String(order.id).includes("9821")) {
                      matchedRfq = allRfqs.find((r: any) => r.id === "RFQ-8412") || {
                        car_make: "تويوتا",
                        car_model: "كامري",
                        car_year: 2023,
                        plate_number: "أ ب ج 1234",
                        vin: "JTEBU5JR8K5092141",
                        parts_description: JSON.stringify([{ partName: "صدام أمامي أصلي مع شبك", quantity: 1, partNumber: "52119-0X900", partType: "original", price: 1850 }]),
                      };
                    } else if (order.total_price === 3400 || String(order.id).includes("4920") || String(order.id).includes("7412") || String(order.id).includes("6190")) {
                      matchedRfq = allRfqs.find((r: any) => r.id === "RFQ-6190") || {
                        car_make: "نيسان",
                        car_model: "باترول",
                        car_year: 2022,
                        plate_number: "ر ز س 9012",
                        vin: "JN8AZ2NC7M9203114",
                        parts_description: JSON.stringify([{ partName: "مساعدات هيدروليك أمامية وخلفية", quantity: 4, partNumber: "E6210-1LA0A", partType: "original", price: 3400 }]),
                      };
                    }
                  }

                  let matchedClient = order.client;
                  if (!matchedClient && order.client_id) {
                    matchedClient = allProfiles.find((p: any) => p.id === order.client_id);
                  }
                  if (!matchedClient) {
                    matchedClient = { full_name: "شركة المشتريات الوطنية", company_name: "شركة المشتريات الوطنية", ref_code: "CLI-101", phone: "0501234567" };
                  }

                  let matchedVendor = order.vendor || order.profiles;
                  if (!matchedVendor && order.vendor_id) {
                    matchedVendor = allProfiles.find((p: any) => p.id === order.vendor_id);
                  }
                  if (!matchedVendor) {
                    matchedVendor = { full_name: "مؤسسة قطع الغيار المعتمدة", company_name: "مؤسسة قطع الغيار المعتمدة", ref_code: "VND-501", phone: "0551122334" };
                  }

                  let matchedQuote = order.quote;
                  if (!matchedQuote && order.quote_id) {
                    matchedQuote = allQuotes.find((q: any) => q.id === order.quote_id);
                  }

                  return {
                    ...order,
                    rfq: matchedRfq,
                    rfqs: matchedRfq,
                    client: matchedClient,
                    vendor: matchedVendor,
                    quote: matchedQuote,
                  };
                });
              }

              if (table === "invoices") {
                const allProfiles = getStoredTable("profiles");
                const allOrders = getStoredTable("orders");
                const allRfqs = getStoredTable("rfqs");

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
                  const matchedRfq = matchedOrder?.rfqs || matchedOrder?.rfq || allRfqs[0];

                  if (!deal || !deal.orders) {
                    deal = {
                      order_id: orderId,
                      orders: {
                        id: orderId,
                        rfq: matchedRfq ? {
                          car_make: matchedRfq.car_make,
                          car_model: matchedRfq.car_model,
                          car_year: matchedRfq.car_year,
                          plate_number: matchedRfq.plate_number,
                          vin: matchedRfq.vin,
                        } : undefined,
                      },
                    };
                  }

                  const total = Number(inv.total_amount || inv.total_price || (matchedOrder?.total_price) || 2850);
                  const subtotal = Number(inv.subtotal || (total / 1.15));
                  const tax = Number(inv.tax_amount || (total - subtotal));

                  return {
                    ...inv,
                    invoice_number: inv.invoice_number || (String(inv.id).startsWith("INV-") ? `INV-2026-00${String(inv.id).replace("INV-", "")}` : `INV-2026-00${String(inv.id).replace("ORD-", "")}`),
                    status: inv.status === "completed" ? "paid" : (inv.status === "preparing" || inv.status === "shipped") ? "issued" : (inv.status || "paid"),
                    issued_at: inv.issued_at || inv.created_at || new Date().toISOString(),
                    total_amount: Math.round(total * 100) / 100,
                    subtotal: Math.round(subtotal * 100) / 100,
                    tax_amount: Math.round(tax * 100) / 100,
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
    } else {
      store[GLOBAL_KEY] = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
  }
  return store[GLOBAL_KEY]!;
}
