/**
 * Smart RFQ Radar Matcher Engine - Rule Engine Pattern
 * Composable rules evaluated asynchronously to score RFQ-to-Vendor compatibility
 */

import {
  IRadarRule,
  RFQMatchRequestDTO,
  VendorProfileDTO,
  MatchReason,
  MatchResultDTO,
} from "./supplier.types";

/* ──────────────── 1. Brand Rule (40 Points) ──────────────── */
export class BrandRule implements IRadarRule {
  rule_id = "brand_match";
  name = "مطابقة الماركة والتخصص";
  max_weight = 40;

  async evaluate(rfq: RFQMatchRequestDTO, vendor: VendorProfileDTO): Promise<MatchReason> {
    const rfqMake = (rfq.car_make || "").toLowerCase().trim();
    const isBrandSpecialist = vendor.brands_specialized.some((b) => {
      const vb = b.toLowerCase().trim();
      return rfqMake.includes(vb) || vb.includes(rfqMake);
    });

    const score = isBrandSpecialist ? 40 : 15;
    return {
      rule_id: this.rule_id,
      label: isBrandSpecialist
        ? `مورد متخصص وموثق لـ ${rfq.car_make || "هذه الماركة"}`
        : `يقدم خدمات وتوريد لقطع متعددة الماركات`,
      score_gained: score,
      max_score: this.max_weight,
    };
  }
}

/* ──────────────── 2. Region Rule (25 Points) ──────────────── */
export class RegionRule implements IRadarRule {
  rule_id = "region_match";
  name = "مطابقة المدينة والتوصيل المحايد";
  max_weight = 25;

  async evaluate(rfq: RFQMatchRequestDTO, vendor: VendorProfileDTO): Promise<MatchReason> {
    const rfqCity = (rfq.city || "").toLowerCase().trim();
    const vendorCity = (vendor.city || "").toLowerCase().trim();

    const isSameCity =
      (rfqCity && vendorCity && (rfqCity.includes(vendorCity) || vendorCity.includes(rfqCity))) ||
      (rfqCity.includes("رياض") && vendorCity.includes("رياض")) ||
      (rfqCity.includes("جدة") && vendorCity.includes("جدة")) ||
      (rfqCity.includes("دمام") && vendorCity.includes("دمام"));

    const score = isSameCity ? 25 : 12;
    return {
      rule_id: this.rule_id,
      label: isSameCity
        ? `توصيل فوري داخل مدينة ${rfq.city || vendor.city}`
        : `توصيل شحن سريع بين المدن والمناطق`,
      score_gained: score,
      max_score: this.max_weight,
    };
  }
}

/* ──────────────── 3. Rating Rule (15 Points) ──────────────── */
export class RatingRule implements IRadarRule {
  rule_id = "rating_score";
  name = "تقييم الجودة والخدمة";
  max_weight = 15;

  async evaluate(rfq: RFQMatchRequestDTO, vendor: VendorProfileDTO): Promise<MatchReason> {
    const rating = Number(vendor.rating) || 4.8;
    const ratio = Math.min(rating / 5.0, 1.0);
    const score = Math.round(ratio * 15);
    return {
      rule_id: this.rule_id,
      label: `تقييم المورد المعتمد ${rating.toFixed(1)}/5 نجوم`,
      score_gained: score,
      max_score: this.max_weight,
    };
  }
}

/* ──────────────── 4. Stock & Category Rule (10 Points) ──────────────── */
export class StockRule implements IRadarRule {
  rule_id = "stock_avail";
  name = "توفر فئة القطع والمخزون";
  max_weight = 10;

  async evaluate(rfq: RFQMatchRequestDTO, vendor: VendorProfileDTO): Promise<MatchReason> {
    const desc = (rfq.parts_description || "").toLowerCase();
    const isOriginalReq = desc.includes("أصلي") || desc.includes("oem") || desc.includes("وكالة");
    const hasCategory = isOriginalReq ? vendor.is_oem : (vendor.is_aftermarket || vendor.is_oem);
    const score = hasCategory ? 10 : 6;
    return {
      rule_id: this.rule_id,
      label: hasCategory
        ? `توفر قطع غيار أصلي ومضمون OEM معتمد`
        : `توفر قطع درجات متعددة ومطابقة للمواصفات`,
      score_gained: score,
      max_score: this.max_weight,
    };
  }
}

/* ──────────────── 5. Response Time Rule (10 Points) ──────────────── */
export class ResponseTimeRule implements IRadarRule {
  rule_id = "response_time";
  name = "سرعة الاستجابة والتسعير";
  max_weight = 10;

  async evaluate(rfq: RFQMatchRequestDTO, vendor: VendorProfileDTO): Promise<MatchReason> {
    const time = Number(vendor.avg_response_time_minutes) || 10;
    const isFast = time <= 15;
    const score = isFast ? 10 : 6;
    return {
      rule_id: this.rule_id,
      label: isFast
        ? `استجابة سريعة جداً أقل من 15 دقيقة`
        : `استجابة قياسية خلال ساعة عمل`,
      score_gained: score,
      max_score: this.max_weight,
    };
  }
}

/* ──────────────── Smart Radar Matching Engine Coordinator ──────────────── */
export class SmartRadarMatchingEngine {
  private rules: IRadarRule[] = [
    new BrandRule(),
    new RegionRule(),
    new RatingRule(),
    new StockRule(),
    new ResponseTimeRule(),
  ];

  async calculateMatchScore(rfq: RFQMatchRequestDTO, vendor: VendorProfileDTO): Promise<MatchResultDTO> {
    const reasons: MatchReason[] = [];
    let totalScore = 0;

    for (const rule of this.rules) {
      const reason = await rule.evaluate(rfq, vendor);
      reasons.push(reason);
      totalScore += reason.score_gained;
    }

    // Ensure score bounded in 0..100
    totalScore = Math.min(Math.max(totalScore, 0), 100);

    const match_grade: MatchResultDTO["match_grade"] =
      totalScore >= 85 ? "ممتاز" : totalScore >= 65 ? "جيد جداً" : "مقبول";

    return {
      rfq_id: rfq.rfq_id,
      vendor_id: vendor.vendor_id,
      vendor_name: vendor.company_name,
      total_score: totalScore,
      match_grade,
      reasons,
      created_at: new Date().toISOString(),
    };
  }
}

export const smartRadarMatchingEngine = new SmartRadarMatchingEngine();

export const DEFAULT_CURRENT_VENDOR: VendorProfileDTO = {
  vendor_id: "vendor-demo-id",
  company_name: "مؤسسة قطع الغيار المعتمدة",
  city: "الرياض",
  rating: 4.9,
  win_rate: 92,
  avg_response_time_minutes: 8,
  brands_specialized: [
    "تويوتا", "لكزس", "هيونداي", "كيا", "جي إم سي", "فورد", "شيفروليه", "نيسان", "هوندا", "مازدا", "ميتسوبيشي", "مرسيدس", "بي إم دبليو", "أودي", "فولكسفاغن", "سوبارو", "جيب", "شيري", "هافال", "جيلي", "شانجان", "ام جي"
  ],
  parts_categories: ["فرامل", "محرك", "هيكل", "كهرباء", "فلاتر", "زيوت", "عام"],
  is_oem: true,
  is_aftermarket: true,
  business_hours: { open: 8, close: 23 },
};

export const DEMO_VENDORS: VendorProfileDTO[] = [
  DEFAULT_CURRENT_VENDOR,
  {
    vendor_id: "v-02-general-parts",
    company_name: "مركز المربع العربي لقطع السيارات",
    city: "الرياض",
    rating: 4.6,
    win_rate: 78,
    avg_response_time_minutes: 14,
    brands_specialized: ["تويوتا", "هيونداي", "فورد", "نيسان"],
    parts_categories: ["فرامل", "فلاتر", "زيوت"],
    is_oem: true,
    is_aftermarket: true,
    business_hours: { open: 9, close: 22 },
  },
  {
    vendor_id: "v-03-jeddah-hub",
    company_name: "شركة الغربية لموزعي القطع الألمانية واليابانية",
    city: "جدة",
    rating: 4.8,
    win_rate: 85,
    avg_response_time_minutes: 12,
    brands_specialized: ["هيونداي", "كيا", "مرسيدس"],
    parts_categories: ["محرك", "أنظمة تعليق"],
    is_oem: true,
    is_aftermarket: false,
    business_hours: { open: 8, close: 21 },
  },
];
