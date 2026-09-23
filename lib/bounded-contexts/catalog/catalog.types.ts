/**
 * Catalog Bounded Context: Normalized Vehicle Taxonomy (Brands, Models, Generations)
 */

export interface VehicleBrand {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
  logo_url?: string;
  is_popular?: boolean;
}

export interface VehicleModel {
  id: string;
  brand_id: string;
  name_ar: string;
  name_en: string;
  category: "sedan" | "suv" | "truck" | "van" | "coupe";
}

export interface VehicleGeneration {
  id: string;
  model_id: string;
  year_start: number;
  year_end: number;
  generation_code: string;
}

export const INITIAL_VEHICLE_BRANDS: VehicleBrand[] = [
  { id: "b-toyota",  name_ar: "تويوتا",    name_en: "Toyota",  code: "TOYOTA",  is_popular: true },
  { id: "b-hyundai", name_ar: "هيونداي",   name_en: "Hyundai", code: "HYUNDAI", is_popular: true },
  { id: "b-ford",    name_ar: "فورد",      name_en: "Ford",    code: "FORD",    is_popular: true },
  { id: "b-[#nissan]", name_ar: "نيسان",    name_en: "Nissan",  code: "NISSAN",  is_popular: true },
  { id: "b-[#gmc]",    name_ar: "جي إم سي", name_en: "GMC",     code: "GMC",     is_popular: true },
  { id: "b-[#kia]",    name_ar: "كيا",       name_en: "Kia",     code: "KIA",     is_popular: true },
  { id: "b-[#chevrolet]", name_ar: "شيفروليه", name_en: "Chevrolet", code: "CHEVROLET", is_popular: true },
  { id: "b-[#mercedes]", name_ar: "مرسيدس", name_en: "Mercedes-Benz", code: "MERCEDES", is_popular: true },
];

export const INITIAL_VEHICLE_MODELS: VehicleModel[] = [
  { id: "m-camry",   brand_id: "b-toyota",  name_ar: "كامري",   name_en: "Camry",   category: "sedan" },
  { id: "m-corolla", brand_id: "b-toyota",  name_ar: "كورولا",  name_en: "Corolla", category: "sedan" },
  { id: "m-hilux",   brand_id: "b-toyota",  name_ar: "هايلوكس", name_en: "Hilux",   category: "truck" },
  { id: "m-sonata",  brand_id: "b-hyundai", name_ar: "سوناتا",  name_en: "Sonata",  category: "sedan" },
  { id: "m-elantra", brand_id: "b-hyundai", name_ar: "إلنترا",  name_en: "Elantra", category: "sedan" },
  { id: "m-[#taurus]", brand_id: "b-ford",    name_ar: "تاوروس",  name_en: "Taurus",  category: "sedan" },
  { id: "m-[#f150]",   brand_id: "b-ford",    name_ar: "اف 150",  name_en: "F-150",   category: "truck" },
];
