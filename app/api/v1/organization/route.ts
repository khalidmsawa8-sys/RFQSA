import { NextRequest, NextResponse } from "next/server";
import { identityRepository } from "@/lib/bounded-contexts/identity/identity.repository";
import { createApiEnvelope, createApiErrorEnvelope } from "@/lib/bounded-contexts/types/common.types";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

function getDiskProfiles(): any[] {
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      return JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

function saveDiskProfiles(profiles: any[]) {
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), "utf-8");
  } catch (e) {
    console.error("[organization route] Failed to save disk profiles:", e);
  }
}

/**
 * GET /api/v1/organization
 * Retrieves verified organization profile, CR, tax info, and memberships.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const headerUserId = req.headers.get("x-user-id");
    const headerUserRole = req.headers.get("x-user-role") || req.headers.get("x-role");
    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const cookieUserRole = req.cookies.get("rfq_session")?.value;
    const urlUserId = req.nextUrl.searchParams.get("user_id");
    const urlRole = req.nextUrl.searchParams.get("role");

    const effectiveUserId = user?.id || headerUserId || cookieUserId || urlUserId;
    const effectiveRole = headerUserRole || cookieUserRole || urlRole || (effectiveUserId?.includes("vendor") ? "vendor" : "client");

    let prof: any = null;

    if (effectiveUserId && effectiveUserId !== "client-demo-id" && effectiveUserId !== "vendor-demo-id") {
      try {
        const { data: dbProf } = await supabase
          .from("profiles")
          .select("id, company_name, full_name, commercial_register, tax_number, iban, city, address, national_address, phone, email, is_verified, role")
          .eq("id", effectiveUserId)
          .maybeSingle();

        if (dbProf) prof = dbProf;
      } catch {}
    }

    // Disk fallback if not in DB
    if (!prof && effectiveUserId) {
      const allProfiles = getDiskProfiles();
      prof = allProfiles.find(
        (p: any) => p.id === effectiveUserId || p.email === effectiveUserId || p.phone === effectiveUserId
      );
    }

    // Role-based disk fallback if demo or no direct match
    if (!prof) {
      const allProfiles = getDiskProfiles();
      prof = allProfiles.find((p: any) => p.role === effectiveRole || (effectiveRole === "vendor" ? p.role === "vendor" : p.role === "client"));
    }

    if (prof) {
      const orgName = prof.company_name || prof.full_name || (effectiveRole === "vendor" ? "مؤسسة قطع الغيار المعتمدة" : "شركة المشتريات الوطنية");
      const organization = {
        id: `org-${prof.id || effectiveUserId || "demo"}`,
        name: orgName,
        company_name: orgName,
        cr_number: prof.commercial_register || prof.cr_number || "1010112233",
        commercial_register: prof.commercial_register || prof.cr_number || "1010112233",
        tax_number: prof.tax_number || "300998877600003",
        iban: prof.iban || "SA4420000001234567890123",
        city: prof.city || "الرياض",
        address: prof.national_address || prof.address || "الرياض - طريق الملك فهد - حي العليا",
        phone: prof.phone || "0501234567",
        email: prof.email || "procurement@national-procurement.sa",
        verification_status: prof.is_verified ? "approved" : "pending",
        verified_badge: Boolean(prof.is_verified ?? true),
        created_at: prof.created_at || new Date().toISOString(),
      };

      const memberships = [
        {
          id: `mem-${prof.id || "01"}`,
          user_id: prof.id || effectiveUserId,
          organization_id: organization.id,
          organization_name: organization.name,
          role: "owner",
          custom_permissions: ["organization:update", "team:manage", "team:invite"],
          invitation_status: "accepted",
          joined_at: prof.created_at || new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        }
      ];

      return NextResponse.json(createApiEnvelope({ organization, memberships }));
    }

    const organization = await identityRepository.getOrganization();
    const memberships = await identityRepository.getMemberships();

    return NextResponse.json(createApiEnvelope({ organization, memberships }));
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "ORG_FETCH_ERROR", message: error?.message || "فشل جلب بيانات المؤسسة والعضويات" }]),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/organization
 * Updates organization profile, CR (السجل التجاري), VAT, contact, and address.
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const headerUserId = req.headers.get("x-user-id");
    const headerUserRole = req.headers.get("x-user-role") || req.headers.get("x-role");
    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const cookieUserRole = req.cookies.get("rfq_session")?.value;

    const effectiveUserId = user?.id || headerUserId || cookieUserId || "client-demo-id";
    const effectiveRole = headerUserRole || cookieUserRole || "client";

    const body = await req.json();
    const crNumber = (body.cr_number || body.commercial_register || "").trim();
    const orgName = (body.name || body.company_name || "").trim();
    const taxNumber = (body.tax_number || body.vat_number || "").trim();
    const address = (body.address || body.national_address || "").trim();
    const phone = (body.phone || "").trim();
    const email = (body.email || "").trim();
    const city = (body.city || "").trim();
    const iban = (body.iban || "").trim();

    // 1. Update in Supabase profiles
    try {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (crNumber) updatePayload.commercial_register = crNumber;
      if (orgName) updatePayload.company_name = orgName;
      if (taxNumber) updatePayload.tax_number = taxNumber;
      if (address) {
        updatePayload.address = address;
        updatePayload.national_address = address;
      }
      if (phone) updatePayload.phone = phone;
      if (email) updatePayload.email = email;
      if (city) updatePayload.city = city;
      if (iban) updatePayload.iban = iban;

      if (effectiveUserId && effectiveUserId !== "client-demo-id" && effectiveUserId !== "vendor-demo-id") {
        await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", effectiveUserId);
      }
    } catch (dbErr) {
      console.warn("[organization PUT] Supabase update warning:", dbErr);
    }

    // 2. Update on Disk in profiles_db.json
    const allProfiles = getDiskProfiles();
    let targetIndex = allProfiles.findIndex(
      (p: any) => p.id === effectiveUserId || p.email === effectiveUserId || p.phone === effectiveUserId
    );

    if (targetIndex < 0) {
      // Find by matching role
      targetIndex = allProfiles.findIndex((p: any) => p.role === effectiveRole);
    }

    if (targetIndex >= 0) {
      if (crNumber) allProfiles[targetIndex].commercial_register = crNumber;
      if (orgName) allProfiles[targetIndex].company_name = orgName;
      if (taxNumber) allProfiles[targetIndex].tax_number = taxNumber;
      if (address) {
        allProfiles[targetIndex].address = address;
        allProfiles[targetIndex].national_address = address;
      }
      if (phone) allProfiles[targetIndex].phone = phone;
      if (email) allProfiles[targetIndex].email = email;
      if (city) allProfiles[targetIndex].city = city;
      if (iban) allProfiles[targetIndex].iban = iban;
      allProfiles[targetIndex].updated_at = new Date().toISOString();
      saveDiskProfiles(allProfiles);
    } else {
      // Create new profile record
      const newProf = {
        id: effectiveUserId,
        role: effectiveRole,
        company_name: orgName || "منشأة معتمدة",
        commercial_register: crNumber || "1010112233",
        tax_number: taxNumber || "300998877600003",
        national_address: address || "المملكة العربية السعودية",
        phone: phone || "0501234567",
        email: email || "info@rfqsa.tech",
        city: city || "الرياض",
        iban: iban || "",
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      allProfiles.push(newProf);
      saveDiskProfiles(allProfiles);
    }

    const updatedOrg = {
      id: `org-${effectiveUserId}`,
      name: orgName || (targetIndex >= 0 ? allProfiles[targetIndex].company_name : "منشأة معتمدة"),
      company_name: orgName || (targetIndex >= 0 ? allProfiles[targetIndex].company_name : "منشأة معتمدة"),
      cr_number: crNumber || (targetIndex >= 0 ? allProfiles[targetIndex].commercial_register : "1010112233"),
      commercial_register: crNumber || (targetIndex >= 0 ? allProfiles[targetIndex].commercial_register : "1010112233"),
      tax_number: taxNumber || (targetIndex >= 0 ? allProfiles[targetIndex].tax_number : "300998877600003"),
      address: address || (targetIndex >= 0 ? allProfiles[targetIndex].national_address : "الرياض"),
      phone: phone || (targetIndex >= 0 ? allProfiles[targetIndex].phone : "0501234567"),
      email: email || (targetIndex >= 0 ? allProfiles[targetIndex].email : "procurement@national-procurement.sa"),
      city: city || (targetIndex >= 0 ? allProfiles[targetIndex].city : "الرياض"),
      iban: iban || (targetIndex >= 0 ? allProfiles[targetIndex].iban : ""),
      verification_status: "approved",
      verified_badge: true,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(
      createApiEnvelope({
        organization: updatedOrg,
        message: "تم تحديث بيانات المنشأة والسجل التجاري بنجاح",
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "ORG_UPDATE_ERROR", message: error?.message || "فشل تحديث بيانات المنشأة" }]),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
