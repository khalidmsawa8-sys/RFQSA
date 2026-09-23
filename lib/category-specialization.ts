/**
 * Central Automotive Parts Category Specialization Engine
 * Tailored specifically for the Saudi Arabian automotive spare parts market.
 * (صناعية الرياض، صناعية جدة، الدمام، وسوق قطع الغيار المعتمد)
 */

export interface CanonicalPartsCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  shortName: string;
  description: string;
  badgeColor: string;
  keywords: string[];
}

export const CANONICAL_PARTS_CATEGORIES: CanonicalPartsCategory[] = [
  {
    id: "engine",
    nameAr: "قطع المحرك وميكانيكا الماكينة",
    nameEn: "Engine & Mechanical",
    shortName: "المحرك والمكينة",
    description: "بساتم، شنابر، بلوف، كازكيتات، طرمبات ماء وزيت، سيور، كراسي مكينة، صوف، عمود كرنك",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    keywords: [
      "مكينة", "محرك", "بستم", "بساتم", "شنبر", "شنابر", "بلف", "بلوف", "كازكيت", "وجيه",
      "طرمبة ماء", "طرمبة زيت", "كرسي مكينة", "سير مكينة", "سير تيمن", "صدر مكينة", "عمود كرنك",
      "كام شافت", "راس مكينة", "سبيكة", "سبائك", "عمود تيمن", "صوفة مكينة", "طبات"
    ],
  },
  {
    id: "transmission",
    nameAr: "الجيربوكس ونظام نقل الحركة والدفرنس",
    nameEn: "Transmission & Drivetrain",
    shortName: "القير والدفرنس",
    description: "كلتشات، فحمات قير، مخ القير، حساسات القير، طنجرة، دفرنس، عكوس، صلايب، عمود دبل",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    keywords: [
      "قير", "جير", "جيربوكس", "فتيس", "دفرنس", "عكس", "عكوس", "كلتش", "صحن كلتش", "دزق",
      "طنجرة", "مخ القير", "صليب", "صلايب", "عمود دبل", "عمود كردان", "كرسي قير", "فلتر قير",
      "حساس قير", "ترس", "تروس", "رمانات قير"
    ],
  },
  {
    id: "electrical",
    nameAr: "كهرباء وحساسات وإلكترونيات السيارات",
    nameEn: "Electrical & Sensors",
    shortName: "الكهرباء والإلكترونيات",
    description: "سلف، دينمو، بطاريات، كمبيوترات سيارة، ضفائر، كويلات، حساسات مكينة وقير وشكمان وABS",
    badgeColor: "bg-yellow-50 text-yellow-800 border-yellow-200",
    keywords: [
      "سلف", "دينمو", "كويل", "كويلات", "ضفيرة", "كمبيوتر", "حساس", "حساسات", "فيوز", "فيوزات",
      "بطارية", "سويتش", "منظم كهرباء", "شريحة بوري", "مفتاح تشغيل", "دينامو", "مارش", "دقمة سلف"
    ],
  },
  {
    id: "cooling_ac",
    nameAr: "التبريد ومكيف السيارة والراديترات",
    nameEn: "Cooling & Air Conditioning",
    shortName: "التبريد والمكيف",
    description: "كمبروسر مكيف، كوندنسر، رديتر ماء، ثلاجة مكيف، مراوح تبريد، بلف حرارة، ليات",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    keywords: [
      "كمبروسر", "كمبرسر", "رديتر", "رديتر ماء", "رديتر مكيف", "كوندنسر", "مكثف", "ثلاجة مكيف",
      "مروحة", "مراوح", "بلف حرارة", "ثيرموستات", "لي تبريد", "ليات", "قربة ماء", "كلتش مروحة",
      "هوز مكيف", "مروحة مكينة", "حساس حرارة"
    ],
  },
  {
    id: "body_exterior",
    nameAr: "البودي والهيكل الخارجي والصدمات",
    nameEn: "Body & Exterior Parts",
    shortName: "البودي والصدمات",
    description: "صدامات أمامية وخلفية، كبوت، رفارف، أبواب، غطاء شنطة، شبك أمامي، بطانات كفرات",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    keywords: [
      "صدام", "كبوت", "رفرف", "باب", "ابواب", "شنطة", "باب شنطة", "شبك", "شبك امامي", "بطانة",
      "بطانات", "عتبة", "سقف", "شاص", "بطانة كبوت", "دعسة", "مفصلات", "جناح", "فيبر", "لحية صدام"
    ],
  },
  {
    id: "lighting",
    nameAr: "الإنارة والأنوار والإضاءة",
    nameEn: "Lights & Lighting Systems",
    shortName: "الإنارة والإضاءة",
    description: "شمعات أمامية أصلية وتجارية، إسطبات خلفية، كشافات ضباب، إشارات مرايا، لمبات زينون وLED",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    keywords: [
      "شمعة", "شمعات", "اسطب", "اسطبات", "إسطب", "كشاف", "كشافات", "نور", "أنوار", "إشارة",
      "إشارات", "زينون", "LED", "عاكس", "محول زينون", "لمبة", "لمبات", "عدسة شمعة", "اصطب ركن"
    ],
  },
  {
    id: "brakes",
    nameAr: "نظام الفرامل والمكابح (بريك)",
    nameEn: "Brakes & Braking System",
    shortName: "الفرامل والمكابح",
    description: "فحمات وأقمشة فرامل أمامية وخلفية، هوبات، كليبرات، باكم، ليات فرامل، حساسات بريك",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    keywords: [
      "فحمات", "أقمشة", "اقمشة", "هوب", "هوبات", "كليبر", "كليبرات", "باكم", "بريك", "فرامل",
      "جلنط", "سلك جلنط", "سفايف", "طقم فرامل", "حساس ABS", "مضخة ABS", "سلندر فرامل", "قماشات"
    ],
  },
  {
    id: "suspension",
    nameAr: "العضلات والمساعدات ونظام التعليق",
    nameEn: "Suspension & Steering",
    shortName: "المساعدات والمقصات (العضلات)",
    description: "مساعدات، يايات، مقصات، أذرعة دركسون، ركب، جلب، أعمدة توازن، كراسي مساعدات",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    keywords: [
      "مساعد", "مساعدات", "ياي", "يايات", "مقص", "مقصات", "ذراع", "اذرعة", "ركبة", "ركب",
      "جلبة", "جلب", "عمود توازن", "ميزان", "عضلات", "دودة دركسون", "طرمبة دركسون", "كرسي مساعد",
      "علبة دركسون", "رمان كفر", "فلنجة"
    ],
  },
  {
    id: "exhaust_emissions",
    nameAr: "الشكمانات ونظام العادم والانبعاثات",
    nameEn: "Exhaust & Emissions",
    shortName: "الشكمانات والعادم",
    description: "دبات تلوث ورصاص، مواسير شكمان، كراسي وشناكر، حساسات أكسجين (O2)، دبات صوت",
    badgeColor: "bg-stone-50 text-stone-700 border-stone-200",
    keywords: [
      "شكمان", "شكمانات", "دبة", "دبات", "دبة تلوث", "دبة بيئة", "حساس اكسجين", "حساس شكمان",
      "قزوز", "هدرز", "مافلر", "عادم", "منيفولد"
    ],
  },
  {
    id: "fuel_system",
    nameAr: "نظام الوقود والبخاخات والتيربو",
    nameEn: "Fuel System & Turbochargers",
    shortName: "الوقود والبخاخات",
    description: "طرمبات بنزين وديزل، بخاخات، تيربو، عوامات تانكي، صفاية وقود، منظم ضغط الوقود",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    keywords: [
      "طرمبة بنزين", "مضخة وقود", "بخاخ", "بخاخات", "تيربو", "عوامة", "صفاية بنزين", "تانكي",
      "خزان وقود", "مسطرة بخاخات", "انجكتر", "تربو", "حاقن وقود"
    ],
  },
  {
    id: "glass_mirrors",
    nameAr: "الزجاج والمرايا وفتحات السقف",
    nameEn: "Glass, Mirrors & Sunroofs",
    shortName: "الزجاج والمرايا",
    description: "زجاج أمامي وخلفي دبل وعادي، زجاج أبواب ومثلثات، فتحة سقف، مرايا جانبية كهربائية",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    keywords: [
      "قزاز", "زجاج", "زجاج امامي", "زجاج خلفي", "قزاز باب", "مراية", "مرايا", "مرايه جانبية",
      "فتحة سقف", "بانوراما", "مثلث", "ربلات قزاز", "ماكينة قزاز", "مرايا كهرباء"
    ],
  },
  {
    id: "tires_rims",
    nameAr: "الجنوط والإطارات وحساسات الهواء",
    nameEn: "Wheels, Rims & TPMS",
    shortName: "الجنوط والإطارات",
    description: "جنوط كروم وحديد أصلية وتجارية، بلوف، صواميل، مسامير جنط، حساسات ضغط الإطارات",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    keywords: [
      "جنط", "جنوط", "كفر", "كفرات", "اطار", "إطارات", "حساس كفرات", "حساس هواء", "TPMS",
      "بلف كفر", "صامولة جنط", "مسمار جنط", "طاسة", "اكواب جنوط", "جنط كروم"
    ],
  },
  {
    id: "maintenance_consumables",
    nameAr: "القطع الاستهلاكية والصيانة السريعة",
    nameEn: "Maintenance & Consumables",
    shortName: "القطع الاستهلاكية",
    description: "بواجي ليزر وعادية، فلاتر هواء وزيت ومكيف، سيور مكينة، سوائل تبريد وزيوت، مساحات",
    badgeColor: "bg-lime-50 text-lime-800 border-lime-200",
    keywords: [
      "بواجي", "بوجي", "فلتر هواء", "فلتر زيت", "فلتر مكيف", "سير مكينة", "زيت قير", "زيت مكينة",
      "ماء رديتر", "مساحات", "فحمات صيانة", "سائل فرامل", "شحم"
    ],
  },
  {
    id: "interior_accessories",
    nameAr: "الديكورات والملحقات والإكسسوارات الداخلية",
    nameEn: "Interior & Accessories",
    shortName: "الديكورات والإكسسوارات",
    description: "طبلون، أزرار ومفاتيح شبابيك، مسكات أبواب داخلية، ديكور قير ومكيف، أحزمة أمان",
    badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
    keywords: [
      "ديكور", "ديكورات", "طبلون", "شاشة", "شاشات", "مراتب", "مقاعد", "زر شباك", "ازرار شبابيك", "مسكة باب", "حزام امان", "درج",
      "فتحات مكيف", "ريش مكيف", "دعاسات", "سويتش زجاج", "ارباج", "طارة", "فرش", "تكاية", "اكسسوار", "اكسسوارات"
    ],
  },
];

/**
 * Resolves category from ID or Name
 */
export function getPartsCategoryById(id: string): CanonicalPartsCategory | undefined {
  if (!id) return undefined;
  const clean = id.toLowerCase().trim();
  return CANONICAL_PARTS_CATEGORIES.find(
    (c) => c.id === clean || c.nameAr.includes(clean) || c.shortName.includes(clean)
  );
}

/**
 * Smart Category Auto-Detection from Part Name
 * Given an Arabic part name entered by the client (e.g. "صدام أمامي", "كمبروسر تكييف"),
 * automatically detects which category in the Saudi market it maps to!
 */
export function matchCategoryFromPartName(partName: string): CanonicalPartsCategory | undefined {
  if (!partName || typeof partName !== "string") return undefined;
  const clean = partName.toLowerCase().trim();

  // Search by exact keywords in each category
  for (const cat of CANONICAL_PARTS_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (clean.includes(kw.toLowerCase())) {
        return cat;
      }
    }
  }

  return undefined;
}

/**
 * Checks if a vendor's categories specialization matches a target category
 */
export function isVendorSpecializedInCategory(
  vendorCategories: string[] | undefined | null,
  targetCategoryId: string | undefined | null,
  specializesInAll: boolean = true
): boolean {
  if (specializesInAll) return true;
  if (!targetCategoryId || targetCategoryId === "all") return true;
  if (!vendorCategories || !Array.isArray(vendorCategories) || vendorCategories.length === 0) {
    return true; // Unset means general by default
  }
  if (vendorCategories.includes("ALL") || vendorCategories.includes("all")) {
    return true;
  }
  return vendorCategories.includes(targetCategoryId);
}

/**
 * Filters a list of RFQs based on vendor category specializations.
 */
export function filterRfqsForVendorCategories<T extends Record<string, any>>(
  rfqs: T[],
  vendorCategories: string[],
  specializesInAll: boolean = true
): T[] {
  if (specializesInAll) return rfqs;
  if (!vendorCategories || vendorCategories.length === 0 || vendorCategories.includes("ALL") || vendorCategories.includes("all")) {
    return rfqs;
  }

  return rfqs.filter((rfq) => {
    // 1. Direct parts_category field
    if (!rfq.parts_category || rfq.parts_category === "all") {
      return true; // General category is visible to all vendors
    }
    if (vendorCategories.includes(rfq.parts_category)) {
      return true;
    }

    // 2. Check partsList array
    if (Array.isArray(rfq.partsList) && rfq.partsList.length > 0) {
      const anyMatch = rfq.partsList.some((p: any) => {
        if (p.category && vendorCategories.includes(p.category)) return true;
        const det = matchCategoryFromPartName(p.name || p.partName || "");
        if (det && vendorCategories.includes(det.id)) return true;
        return false;
      });
      if (anyMatch) return true;
    }

    // 3. Fallback: Parse parts_description
    if (typeof rfq.parts_description === "string") {
      try {
        const parsed = JSON.parse(rfq.parts_description);
        if (Array.isArray(parsed)) {
          const matchInParsed = parsed.some((p: any) => {
            if (p.category && vendorCategories.includes(p.category)) return true;
            const det = matchCategoryFromPartName(p.partName || p.name || "");
            if (det && vendorCategories.includes(det.id)) return true;
            return false;
          });
          if (matchInParsed) return true;
        }
      } catch (e) {
        const det = matchCategoryFromPartName(rfq.parts_description);
        if (det && vendorCategories.includes(det.id)) return true;
      }
    }

    return false;
  });
}
