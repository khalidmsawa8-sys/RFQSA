import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { logActivityEvent } from "./audit-logger";

export interface VendorBranch {
  id: string;
  vendor_id: string;
  name: string;
  city: string;
  district?: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_name?: string;
  contact_phone?: string;
  is_main: boolean;
  is_active: boolean;
  accepts_pickup?: boolean;
  business_hours?: any;
  created_at: string;
}

export const DEFAULT_VENDOR_BRANCHES: VendorBranch[] = [
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
    contact_phone: "",
    is_main: true,
    is_active: true,
    created_at: new Date().toISOString(),
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
    contact_phone: "",
    is_main: false,
    is_active: true,
    created_at: new Date().toISOString(),
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
    contact_phone: "",
    is_main: false,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export async function getVendorBranches(vendorId: string): Promise<VendorBranch[]> {
  try {
    // 1. Check in-file data/vendor_branches_db.json first
    try {
      const dbPath = path.join(process.cwd(), "data", "vendor_branches_db.json");
      if (fs.existsSync(dbPath)) {
        const fileContent = fs.readFileSync(dbPath, "utf-8");
        const allBranches = JSON.parse(fileContent);
        if (Array.isArray(allBranches)) {
          const matched = allBranches.filter(
            (b: any) => b.vendor_id === vendorId && b.is_active !== false
          );
          if (matched.length > 0) return matched;

          // Check for alias/demo match if vendorId is v-supplier-* or vendor-demo-id
          if (vendorId.startsWith("v-supplier") || vendorId === "vendor-demo-id") {
            const demoBranches = allBranches.filter(
              (b: any) => (b.vendor_id === vendorId || b.vendor_id === "vendor-demo-id") && b.is_active !== false
            );
            if (demoBranches.length > 0) return demoBranches;
          }
        }
      }
    } catch (e) {
      console.warn("Could not read vendor_branches_db.json:", e);
    }

    // 2. Check Supabase profiles table
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("branches, national_address, city, district, latitude, longitude, phone, company_name")
      .eq("id", vendorId)
      .maybeSingle();

    if (profile?.branches && Array.isArray(profile.branches) && profile.branches.length > 0) {
      return profile.branches.filter((b: VendorBranch) => b.is_active !== false);
    }

    // Never auto-generate branches for new or existing vendors without branches!
    // A vendor must explicitly register branches.
    return [];
  } catch (err) {
    console.warn("Failed to fetch vendor branches:", err);
    return [];
  }
}

export async function saveVendorBranch(
  vendorId: string,
  branchData: Omit<VendorBranch, "id" | "vendor_id" | "created_at"> & { id?: string; accepts_pickup?: boolean; business_hours?: any }
): Promise<{ success: boolean; branch?: VendorBranch; error?: string }> {
  try {
    const supabase = await createClient();
    const currentBranches = await getVendorBranches(vendorId);

    const isNew = !branchData.id;
    const branchId = branchData.id || `br-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toISOString();

    // If this is the only branch, make it main by default
    const shouldBeMain = branchData.is_main ?? (currentBranches.length === 0);

    const newBranch: VendorBranch = {
      id: branchId,
      vendor_id: vendorId,
      name: branchData.name.trim(),
      city: branchData.city.trim(),
      district: branchData.district?.trim() || "",
      address: branchData.address.trim(),
      latitude: Number(branchData.latitude),
      longitude: Number(branchData.longitude),
      contact_name: branchData.contact_name?.trim() || "",
      contact_phone: branchData.contact_phone?.trim() || "",
      is_main: !!shouldBeMain,
      is_active: branchData.is_active !== false,
      accepts_pickup: branchData.accepts_pickup !== false,
      business_hours: branchData.business_hours || undefined,
      created_at: timestamp,
    };

    let updated: VendorBranch[];
    if (isNew) {
      if (newBranch.is_main) {
        currentBranches.forEach((b) => (b.is_main = false));
      }
      updated = [...currentBranches, newBranch];
    } else {
      updated = currentBranches.map((b) => {
        if (b.id === branchId) return newBranch;
        if (newBranch.is_main) return { ...b, is_main: false };
        return b;
      });
    }

    // Ensure at least one branch is main
    if (!updated.some((b) => b.is_main) && updated.length > 0) {
      updated[0].is_main = true;
    }

    await supabase
      .from("profiles")
      .update({ branches: updated, updated_at: timestamp })
      .eq("id", vendorId);

    // Sync to local json DB if present
    try {
      const dbPath = path.join(process.cwd(), "data", "vendor_branches_db.json");
      if (fs.existsSync(dbPath)) {
        const fileContent = fs.readFileSync(dbPath, "utf-8");
        let allBranches = JSON.parse(fileContent);
        if (Array.isArray(allBranches)) {
          allBranches = allBranches.filter((b: any) => !(b.vendor_id === vendorId && b.id === branchId));
          allBranches.push(newBranch);
          fs.writeFileSync(dbPath, JSON.stringify(allBranches, null, 2), "utf-8");
        }
      }
    } catch (e) {}

    await logActivityEvent({
      actorId: vendorId,
      action: isNew ? "VENDOR_BRANCH_CREATED" : "VENDOR_BRANCH_UPDATED",
      entityType: "branch",
      entityId: branchId,
      details: `${isNew ? "إضافة" : "تعديل"} فرع للمورد: ${newBranch.name} (${newBranch.city})`,
      metadata: { branch: newBranch },
    });

    return { success: true, branch: newBranch };
  } catch (err: any) {
    return { success: false, error: err?.message || "فشل حفظ بيانات الفرع" };
  }
}

export async function deleteVendorBranch(
  vendorId: string,
  branchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const currentBranches = await getVendorBranches(vendorId);

    const targetBranch = currentBranches.find((b) => b.id === branchId);
    if (!targetBranch) {
      return { success: false, error: "الفرع غير موجود" };
    }

    let updated = currentBranches.filter((b) => b.id !== branchId);

    // If the deleted branch was main, designate the first remaining as main
    if (targetBranch.is_main && updated.length > 0) {
      updated[0].is_main = true;
    }

    const timestamp = new Date().toISOString();
    await supabase
      .from("profiles")
      .update({ branches: updated, updated_at: timestamp })
      .eq("id", vendorId);

    try {
      const dbPath = path.join(process.cwd(), "data", "vendor_branches_db.json");
      if (fs.existsSync(dbPath)) {
        const fileContent = fs.readFileSync(dbPath, "utf-8");
        let allBranches = JSON.parse(fileContent);
        if (Array.isArray(allBranches)) {
          allBranches = allBranches.filter((b: any) => !(b.vendor_id === vendorId && b.id === branchId));
          fs.writeFileSync(dbPath, JSON.stringify(allBranches, null, 2), "utf-8");
        }
      }
    } catch (e) {}

    await logActivityEvent({
      actorId: vendorId,
      action: "VENDOR_BRANCH_DELETED",
      entityType: "branch",
      entityId: branchId,
      details: `حذف فرع المورد: ${targetBranch.name} (${targetBranch.city})`,
      metadata: { branchId },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "فشل حذف الفرع" };
  }
}

export async function setMainVendorBranch(
  vendorId: string,
  branchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const currentBranches = await getVendorBranches(vendorId);

    const updated = currentBranches.map((b) => ({
      ...b,
      is_main: b.id === branchId,
    }));

    const timestamp = new Date().toISOString();
    await supabase
      .from("profiles")
      .update({ branches: updated, updated_at: timestamp })
      .eq("id", vendorId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "فشل تعيين الفرع الرئيسي" };
  }
}

/**
 * Retrieves all active branches across all vendors from Supabase and the JSON DB
 */
export async function getAllActiveVendorBranches(): Promise<VendorBranch[]> {
  const branchesMap = new Map<string, VendorBranch>();

  // 1. Read from data/vendor_branches_db.json
  try {
    const dbPath = path.join(process.cwd(), "data", "vendor_branches_db.json");
    if (fs.existsSync(dbPath)) {
      const fileContent = fs.readFileSync(dbPath, "utf-8");
      const fileBranches = JSON.parse(fileContent);
      if (Array.isArray(fileBranches)) {
        fileBranches.forEach((b: any) => {
          if (b.id && b.is_active !== false) {
            branchesMap.set(b.id, b);
          }
        });
      }
    }
  } catch (e) {
    console.warn("Could not read vendor_branches_db.json:", e);
  }

  // 2. Read from Supabase profiles (branches column)
  try {
    const supabase = await createClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, company_name, full_name, branches")
      .eq("role", "vendor");

    if (profiles) {
      profiles.forEach((p: any) => {
        if (Array.isArray(p.branches)) {
          p.branches.forEach((b: any) => {
            if (b.id && b.is_active !== false) {
              branchesMap.set(b.id, {
                ...b,
                vendor_id: b.vendor_id || p.id,
              });
            }
          });
        }
      });
    }
  } catch (e) {
    console.warn("Could not query profiles for branches:", e);
  }

  return Array.from(branchesMap.values());
}
