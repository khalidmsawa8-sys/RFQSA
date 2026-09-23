/**
 * Central Brand Specialization & RFQ Authorization Engine
 * 
 * Provides canonical brand mapping, Arabic/English alias resolution,
 * vendor brand specialization matching, and server-side authorization helpers.
 */

export interface CanonicalBrand {
  id: string;
  nameAr: string;
  nameEn: string;
  country: string;
  aliases: string[];
}

export const CANONICAL_BRANDS: CanonicalBrand[] = [
  {
    id: "toyota",
    nameAr: "تويوتا",
    nameEn: "Toyota",
    country: "Japan",
    aliases: ["تويوتا", "toyota", "تايوتا", "تيوتا", "toy"],
  },
  {
    id: "lexus",
    nameAr: "لكزس",
    nameEn: "Lexus",
    country: "Japan",
    aliases: ["لكزس", "lexus", "لكسز", "لكزسس"],
  },
  {
    id: "nissan",
    nameAr: "نيسان",
    nameEn: "Nissan",
    country: "Japan",
    aliases: ["نيسان", "nissan", "نيسان موتورز", "باترول", "داتسون", "datsun"],
  },
  {
    id: "infiniti",
    nameAr: "إنفينيتي",
    nameEn: "Infiniti",
    country: "Japan",
    aliases: ["انفينيتي", "إنفينيتي", "infiniti", "انفنتي", "إنفنتي"],
  },
  {
    id: "hyundai",
    nameAr: "هيونداي",
    nameEn: "Hyundai",
    country: "Korea",
    aliases: ["هيونداي", "hyundai", "هونداي", "هينداي", "هيونداى"],
  },
  {
    id: "kia",
    nameAr: "كيا",
    nameEn: "Kia",
    country: "Korea",
    aliases: ["كيا", "kia", "كيا موتورز", "كيا موتور"],
  },
  {
    id: "genesis",
    nameAr: "جينيسيس",
    nameEn: "Genesis",
    country: "Korea",
    aliases: ["جينيسيس", "genesis", "جنسس", "جينسس"],
  },
  {
    id: "ford",
    nameAr: "فورد",
    nameEn: "Ford",
    country: "USA",
    aliases: ["فورد", "ford", "فورد موتور", "توروس", "اكسبدشن", "f150", "f-150"],
  },
  {
    id: "lincoln",
    nameAr: "لينكون",
    nameEn: "Lincoln",
    country: "USA",
    aliases: ["لينكون", "lincoln", "لينكولن", "لنكولن", "لنكون"],
  },
  {
    id: "gmc",
    nameAr: "جي إم سي",
    nameEn: "GMC",
    country: "USA",
    aliases: ["جي ام سي", "جي إم سي", "gmc", "جمس", "جنرال موتورز", "g.m.c", "g-m-c", "يوكن", "سييرا"],
  },
  {
    id: "chevrolet",
    nameAr: "شيفروليه",
    nameEn: "Chevrolet",
    country: "USA",
    aliases: ["شيفروليه", "شفروليه", "chevrolet", "chevy", "شفر", "شفورلية", "تاهو", "سلفرادو", "كابرس"],
  },
  {
    id: "cadillac",
    nameAr: "كاديلاك",
    nameEn: "Cadillac",
    country: "USA",
    aliases: ["كاديلاك", "cadillac", "كادلك", "كدلك", "اسكاليد"],
  },
  {
    id: "mercedes_benz",
    nameAr: "مرسيدس بنز",
    nameEn: "Mercedes-Benz",
    country: "Germany",
    aliases: ["مرسيدس", "mercedes", "mercedes-benz", "mercedes benz", "مرسيدس بنز", "مرسيدس-بنز", "بنز", "mb"],
  },
  {
    id: "bmw",
    nameAr: "بي إم دبليو",
    nameEn: "BMW",
    country: "Germany",
    aliases: ["بي ام دبليو", "بي إم دبليو", "bmw", "بي ام", "بيمر", "b.m.w"],
  },
  {
    id: "audi",
    nameAr: "أودي",
    nameEn: "Audi",
    country: "Germany",
    aliases: ["اودي", "أودي", "audi", "أودى"],
  },
  {
    id: "volkswagen",
    nameAr: "فولكس واجن",
    nameEn: "Volkswagen",
    country: "Germany",
    aliases: ["فولكس واجن", "volkswagen", "vw", "فوكس واجن", "فولكسفاجن", "فولكسواجن"],
  },
  {
    id: "porsche",
    nameAr: "بورش",
    nameEn: "Porsche",
    country: "Germany",
    aliases: ["بورش", "porsche", "بورشه", "بورتشه"],
  },
  {
    id: "honda",
    nameAr: "هوندا",
    nameEn: "Honda",
    country: "Japan",
    aliases: ["هوندا", "honda", "أكورد", "سيفيك"],
  },
  {
    id: "mazda",
    nameAr: "مازدا",
    nameEn: "Mazda",
    country: "Japan",
    aliases: ["مازدا", "mazda", "مزد", "مازدة"],
  },
  {
    id: "mitsubishi",
    nameAr: "ميتسوبيشي",
    nameEn: "Mitsubishi",
    country: "Japan",
    aliases: ["ميتسوبيشي", "mitsubishi", "متسوبيشي", "مستوبيشي", "باجيرو"],
  },
  {
    id: "isuzu",
    nameAr: "إيسوزو",
    nameEn: "Isuzu",
    country: "Japan",
    aliases: ["ايسوزو", "إيسوزو", "isuzu", "اسوزو", "ديماكس", "d-max"],
  },
  {
    id: "suzuki",
    nameAr: "سوزوكي",
    nameEn: "Suzuki",
    country: "Japan",
    aliases: ["سوزوكي", "suzuki", "سزوكي", "سوزوكى"],
  },
  {
    id: "land_rover",
    nameAr: "لاند روفر",
    nameEn: "Land Rover",
    country: "UK",
    aliases: ["لاند روفر", "land rover", "land-rover", "landrover", "لاندروفر", "رنج روفر", "range rover", "ديفندر", "defender"],
  },
  {
    id: "jeep",
    nameAr: "جيب",
    nameEn: "Jeep",
    country: "USA",
    aliases: ["جيب", "jeep", "شيروكي", "جراند شيروكي", "رانجلر"],
  },
  {
    id: "dodge",
    nameAr: "دودج",
    nameEn: "Dodge",
    country: "USA",
    aliases: ["دودج", "dodge", "دوج", "تشارجر", "تشالنجر", "دورانجو"],
  },
  {
    id: "ram",
    nameAr: "رام",
    nameEn: "RAM",
    country: "USA",
    aliases: ["رام", "ram", "دودج رام", "dodge ram"],
  },
  {
    id: "chrysler",
    nameAr: "كرايسلر",
    nameEn: "Chrysler",
    country: "USA",
    aliases: ["كرايسلر", "chrysler", "كرايزلر", "كرزلر"],
  },
  {
    id: "mg",
    nameAr: "إم جي",
    nameEn: "MG",
    country: "China / UK",
    aliases: ["ام جي", "إم جي", "mg", "ام-جي", "m.g", "morris garages"],
  },
  {
    id: "geely",
    nameAr: "جيلي",
    nameEn: "Geely",
    country: "China",
    aliases: ["جيلي", "geely", "جيلى", "كولراي", "امجراند"],
  },
  {
    id: "chery",
    nameAr: "شيري",
    nameEn: "Chery",
    country: "China",
    aliases: ["شيري", "chery", "شيرى", "تيجو", "tiggo"],
  },
  {
    id: "haval",
    nameAr: "هافال",
    nameEn: "Haval",
    country: "China",
    aliases: ["هافال", "haval", "جريت وول", "great wall", "gwm", "h6", "جولايان"],
  },
  {
    id: "changan",
    nameAr: "تشانجان",
    nameEn: "Changan",
    country: "China",
    aliases: ["تشانجان", "changan", "شانجان", "شنجان", "تشنجان", "cs95", "cs75", "cs35"],
  },
  {
    id: "byd",
    nameAr: "بي واي دي",
    nameEn: "BYD",
    country: "China",
    aliases: ["بي واي دي", "byd", "بي واي دى", "بياويدي"],
  },
  {
    id: "jetour",
    nameAr: "جيتور",
    nameEn: "Jetour",
    country: "China",
    aliases: ["جيتور", "jetour", "جتور", "داشينج", "t2"],
  },
  {
    id: "hongqi",
    nameAr: "هونشي",
    nameEn: "Hongqi",
    country: "China",
    aliases: ["هونشي", "hongqi", "هونغتشي", "هونغ تشي"],
  },
];

/**
 * Normalizes text by removing diacritics, extra punctuation, spaces, and converting to lowercase.
 */
export function normalizeBrandString(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove Arabic tashkeel
    .replace(/[-_./\\,\s]+/g, " ")
    .trim();
}

/**
 * Resolves any raw brand string (in Arabic or English, model mention, etc.)
 * to its Canonical Brand ID (e.g. "toyota", "gmc", "mercedes_benz").
 */
export function resolveCanonicalBrandId(rawMake?: string | null): string | null {
  if (!rawMake) return null;
  const clean = normalizeBrandString(rawMake);
  if (!clean) return null;

  // Direct check for "ALL"
  if (clean === "all" || clean === "كل الماركات" || clean === "كافة الماركات" || clean === "جميع الماركات") {
    return "ALL";
  }

  // 1. Exact match on canonical ID
  const directId = CANONICAL_BRANDS.find((b) => b.id === clean || b.id.replace(/_/g, " ") === clean);
  if (directId) return directId.id;

  // 2. Exact match on aliases or names
  for (const b of CANONICAL_BRANDS) {
    if (normalizeBrandString(b.nameAr) === clean || normalizeBrandString(b.nameEn) === clean) {
      return b.id;
    }
    for (const alias of b.aliases) {
      if (normalizeBrandString(alias) === clean) {
        return b.id;
      }
    }
  }

  // 3. Substring / Word match
  for (const b of CANONICAL_BRANDS) {
    for (const alias of b.aliases) {
      const cleanAlias = normalizeBrandString(alias);
      if (cleanAlias.length >= 3) {
        if (clean.includes(cleanAlias) || cleanAlias.includes(clean)) {
          return b.id;
        }
      }
    }
  }

  // If not found in known registry, return cleaned slug
  return clean.replace(/\s+/g, "_");
}

/**
 * Get the Arabic and English display name for any Brand ID or raw string.
 */
export function getBrandDisplayName(rawMakeOrId?: string | null): { nameAr: string; nameEn: string; id: string } {
  if (!rawMakeOrId) return { nameAr: "غير محدد", nameEn: "Unknown", id: "unknown" };
  const canonicalId = resolveCanonicalBrandId(rawMakeOrId);
  const found = CANONICAL_BRANDS.find((b) => b.id === canonicalId);
  if (found) {
    return { nameAr: found.nameAr, nameEn: found.nameEn, id: found.id };
  }
  return { nameAr: rawMakeOrId, nameEn: rawMakeOrId, id: canonicalId || rawMakeOrId };
}

/**
 * Validates whether an RFQ's car make matches a vendor's authorized specializations.
 * 
 * @param rfqMake - The car_make of the RFQ (e.g. "تويوتا", "Toyota", "GMC")
 * @param vendorSpecializedBrands - Array of specialized brand IDs or names in vendor's profile
 * @param specializesInAll - Boolean flag if vendor is configured to receive all brands
 * 
 * @returns boolean - true if authorized, false otherwise
 */
export function isMakeMatchingSpecialization(
  rfqMake?: string | null,
  vendorSpecializedBrands?: string[] | null,
  specializesInAll?: boolean
): boolean {
  // If vendor specializes in all brands explicitly
  if (specializesInAll === true) {
    return true;
  }

  // If specialized_brands array has "ALL"
  if (
    Array.isArray(vendorSpecializedBrands) &&
    vendorSpecializedBrands.some(
      (b) =>
        b === "ALL" ||
        b?.toLowerCase() === "all" ||
        b === "كافة الماركات" ||
        b === "جميع الماركات" ||
        b === "كل الماركات"
    )
  ) {
    return true;
  }

  // If vendor has NO specialization configured at all, allow all brands by default
  if (!vendorSpecializedBrands || !Array.isArray(vendorSpecializedBrands) || vendorSpecializedBrands.length === 0) {
    return true;
  }

  if (!rfqMake) {
    return false;
  }

  // Resolve RFQ brand to canonical ID
  const rfqCanonical = resolveCanonicalBrandId(rfqMake);
  if (!rfqCanonical) return false;

  // Resolve all vendor specialized brands to canonical IDs
  const vendorCanonicalSet = new Set(
    vendorSpecializedBrands.map((b) => resolveCanonicalBrandId(b)).filter(Boolean)
  );

  if (vendorCanonicalSet.has(rfqCanonical)) {
    return true;
  }

  // Secondary fallback: relaxed normalized string containment
  const cleanRfq = normalizeBrandString(rfqMake);
  for (const vb of vendorSpecializedBrands) {
    const cleanVb = normalizeBrandString(vb);
    if (cleanVb && cleanRfq && (cleanRfq.includes(cleanVb) || cleanVb.includes(cleanRfq))) {
      return true;
    }
  }

  return false;
}

/**
 * Filter an array of RFQs server-side for a specific vendor's profile.
 */
export function filterRfqsForVendor<T extends Record<string, any>>(
  rfqs: T[],
  vendorSpecializedBrands?: string[] | null,
  specializesInAll?: boolean
): T[] {
  if (!Array.isArray(rfqs)) return [];
  if (specializesInAll === true) return rfqs;
  if (
    Array.isArray(vendorSpecializedBrands) &&
    vendorSpecializedBrands.some(
      (b) => b === "ALL" || b?.toLowerCase() === "all" || b === "كافة الماركات" || b === "جميع الماركات"
    )
  ) {
    return rfqs;
  }

  if (!vendorSpecializedBrands || vendorSpecializedBrands.length === 0) {
    return rfqs;
  }

  return rfqs.filter((rfq) =>
    isMakeMatchingSpecialization(rfq.car_make, vendorSpecializedBrands, specializesInAll)
  );
}

/**
 * Server-side helper to fetch vendor specialization profile from Supabase.
 */
export async function getVendorSpecializationProfile(
  supabase: any,
  vendorId: string
): Promise<{
  specialized_brands: string[];
  specializes_in_all_brands: boolean;
  specialized_categories: string[];
  specializes_in_all_categories: boolean;
  role: string;
}> {
  if (!vendorId) {
    return {
      specialized_brands: [],
      specializes_in_all_brands: false,
      specialized_categories: [],
      specializes_in_all_categories: true,
      role: "vendor",
    };
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, specialized_brands, specializes_in_all_brands, specialized_categories, specializes_in_all_categories")
      .eq("id", vendorId)
      .maybeSingle();

    if (profile) {
      const brands = Array.isArray(profile.specialized_brands)
        ? profile.specialized_brands
        : typeof profile.specialized_brands === "string"
        ? [profile.specialized_brands]
        : [];
      const categories = Array.isArray(profile.specialized_categories)
        ? profile.specialized_categories
        : typeof profile.specialized_categories === "string"
        ? [profile.specialized_categories]
        : [];

      return {
        specialized_brands: brands,
        specializes_in_all_brands: Boolean(profile.specializes_in_all_brands || brands.length === 0 || brands.includes("ALL")),
        specialized_categories: categories,
        specializes_in_all_categories: profile.specializes_in_all_categories !== false,
        role: profile.role || "vendor",
      };
    }
  } catch (err) {
    console.warn("Failed to fetch vendor specialization profile:", err);
  }

  // Default fallback for demo / test account if no DB record found
  return {
    specialized_brands: ["ALL"],
    specializes_in_all_brands: true,
    specialized_categories: [],
    specializes_in_all_categories: true,
    role: "vendor",
  };
}
