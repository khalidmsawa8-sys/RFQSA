import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeInvoiceNumber, extractCleanOrderNumber } from "@/lib/invoice-canonical";
import { getSystemSettings } from "@/lib/system-settings";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const INVOICES_FILE = path.join(DATA_DIR, "invoices_db.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");
const RFQS_FILE = path.join(DATA_DIR, "rfqs_db.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles_db.json");

function loadJson<T = any>(file: string): T[] {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
  } catch {}
  return [];
}

/**
 * GET /api/v1/invoices
 * Retrieves tenant-isolated invoices for vendors, clients, or administrators.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();

    const { searchParams } = new URL(req.url);
    const paramVendorId = searchParams.get("vendor_id");
    const paramClientId = searchParams.get("client_id");
    const paramRole = searchParams.get("role");

    // 1. Resolve active user and role
    let userId = cookieStore.get("rfq_user_id")?.value;
    let userRole = cookieStore.get("rfq_session")?.value || paramRole;
    let userEmail = cookieStore.get("rfq_user_email")?.value;

    if (!userId) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        userId = authData.user.id;
      }
    }

    if (!userId) {
      userId = req.headers.get("x-user-id") || undefined;
    }

    const referer = req.headers.get("referer") || "";
    if (!userRole) {
      if (referer.includes("/vendor")) userRole = "vendor";
      else if (referer.includes("/admin")) userRole = "admin";
      else userRole = "client";
    }

    const effectiveVendorId = paramVendorId || (userRole === "vendor" ? userId : undefined);
    const effectiveClientId = paramClientId || (userRole === "client" ? userId : undefined);
    const isAdmin = userRole === "admin" || userId === "admin-demo-id" || referer.includes("/admin");

    // 2. Load disk datasets & dynamic system settings
    const systemSettings = await getSystemSettings();
    const vatPercent = Number(systemSettings.vat_percent ?? 15);
    const vatRate = vatPercent / 100;
    const clientFeePercentSetting = Number(systemSettings.client_platform_fee_percent ?? systemSettings.platform_commission_percent ?? 5);
    const vendorFeePercentSetting = Number(systemSettings.vendor_platform_fee_percent ?? 15);
    const commissionPercent = vendorFeePercentSetting;
    const platformVatNumber = systemSettings.vat_number || "310987654300003";
    const platformCrNumber = systemSettings.cr_number || "1010789456";

    const allInvoices = loadJson(INVOICES_FILE);
    const allOrders = loadJson(ORDERS_FILE);
    const allRfqs = loadJson(RFQS_FILE);
    const allProfiles = loadJson(PROFILES_FILE);

    // Build unified map of invoices by Order ID / Invoice ID
    const invoicesMap = new Map<string, any>();

    // Seed from invoices_db.json
    allInvoices.forEach((inv: any) => {
      if (inv && (inv.id || inv.order_id)) {
        const cleanOrdId = inv.order_id || String(inv.id).replace(/^INV-/, "ORD-");
        const cleanKey = extractCleanOrderNumber(cleanOrdId || inv.id);
        const carMake = inv.vehicle_make || inv.car_make || inv.order?.car_make || inv.deal?.orders?.rfq?.car_make || inv.deal?.orders?.rfqs?.car_make || "غير محدد";
        const carModel = inv.vehicle_model || inv.car_model || inv.order?.car_model || inv.deal?.orders?.rfq?.car_model || inv.deal?.orders?.rfqs?.car_model || "";
        const carYear = inv.vehicle_year || inv.car_year || inv.order?.car_year || inv.deal?.orders?.rfq?.car_year || inv.deal?.orders?.rfqs?.car_year || "—";
        const plateNumber = inv.plate_number || inv.order?.plate_number || inv.deal?.orders?.rfq?.plate_number || inv.deal?.orders?.rfqs?.plate_number || "—";
        const vinNumber = inv.vin || inv.order?.vin || inv.deal?.orders?.rfq?.vin || inv.deal?.orders?.rfqs?.vin || "—";

        const invTotal = Number(inv.total_amount || inv.total_price || 0);
        const isPickup = Boolean(
          inv.is_pickup === true ||
          inv.delivery_type === "pickup" ||
          inv.delivery_method === "pickup" ||
          inv.fulfillment_method === "SELF_PICKUP" ||
          inv.fulfillment_method === "BRANCH_PICKUP" ||
          inv.settlement_summary?.isPickup === true
        );
        const deliveryFee = isPickup
          ? 0
          : Number(
              (inv.delivery_fee && inv.delivery_fee > 0 ? inv.delivery_fee : null) ??
              (inv.delivery_cost && inv.delivery_cost > 0 ? inv.delivery_cost : null) ??
              inv.settlement_summary?.deliveryFee ??
              25
            );
        const platformFee = Number(inv.platform_fee ?? inv.platform_commission ?? (invTotal > 0 ? 20 : 0));
        const invSubtotal = Number(inv.subtotal) || (vatRate > 0 ? Number((invTotal / (1 + vatRate)).toFixed(2)) : invTotal);
        const partsSubtotal = Number(inv.parts_subtotal ?? (invTotal > 0 ? Math.max(0, vatRate > 0 ? ((invTotal - deliveryFee - platformFee) / (1 + vatRate)) : (invTotal - deliveryFee - platformFee)) : invSubtotal).toFixed(2));
        const partsVat = Number(inv.parts_vat ?? (partsSubtotal * vatRate).toFixed(2));
        const vendorInvoiceTotal = Number(inv.vendor_invoice_total ?? (partsSubtotal + partsVat).toFixed(2));
        const invTax = Number(inv.tax_amount) || Number((invTotal - invSubtotal).toFixed(2));
        const invCommission = Number((partsSubtotal * (commissionPercent / 100)).toFixed(2));
        const invNetPayout = Number((vendorInvoiceTotal - invCommission).toFixed(2));

        const invRecord = {
          ...inv,
          order_id: cleanOrdId,
          total_amount: invTotal,
          subtotal: invSubtotal,
          parts_subtotal: partsSubtotal,
          parts_vat: partsVat,
          vendor_invoice_total: vendorInvoiceTotal,
          delivery_fee: deliveryFee,
          platform_fee: platformFee,
          tax_amount: invTax,
          vat_percent: vatPercent,
          vat_rate: vatRate,
          platform_commission_percent: commissionPercent,
          platform_commission: invCommission,
          net_payout: invNetPayout,
          platform_vat_number: platformVatNumber,
          platform_cr_number: platformCrNumber,
          vehicle_make: carMake,
          car_make: carMake,
          vehicle_model: carModel,
          car_model: carModel,
          vehicle_year: carYear,
          car_year: carYear,
          plate_number: plateNumber,
          vin: vinNumber,
        };
        if (cleanKey) {
          invoicesMap.set(cleanKey, invRecord);
        }
        invoicesMap.set(cleanOrdId, invRecord);
        if (inv.id) invoicesMap.set(inv.id, invRecord);
      }
    });

    // Seed/Enrich from orders_db.json
    allOrders.forEach((ord: any) => {
      if (!ord || !ord.id) return;
      const orderId = ord.id;
      const cleanNum = extractCleanOrderNumber(orderId);
      const invNum = normalizeInvoiceNumber(ord.invoice_number, orderId);

      const existingInv = (cleanNum ? invoicesMap.get(cleanNum) : null) || invoicesMap.get(orderId);
      const matchedRfq = ord.rfqs || ord.rfq || allRfqs.find((r: any) => r.id === ord.rfq_id || (cleanNum && r.id.includes(cleanNum))) || existingInv?.deal?.orders?.rfqs || existingInv?.deal?.orders?.rfq || existingInv?.rfqs || existingInv?.rfq;

      const matchedClient = ord.client || allProfiles.find((p: any) => p.id === ord.client_id) || existingInv?.client || {
        id: ord.client_id || "client-demo-id",
        full_name: matchedRfq?.client?.full_name || "شركة المشتريات الوطنية",
        company_name: matchedRfq?.client?.company_name || "شركة المشتريات الوطنية",
        phone: matchedRfq?.client?.phone || "0501234567",
        tax_number: "310123456700003",
        commercial_register: "1010123456",
        national_address: "الرياض - طريق الملك فهد - حي العليا",
      };

      const matchedVendor = ord.vendor || allProfiles.find((p: any) => p.id === ord.vendor_id) || existingInv?.vendor || {
        id: ord.vendor_id || "vendor-demo-id",
        full_name: "مؤسسة قطع الغيار المعتمدة",
        company_name: "مؤسسة قطع الغيار المعتمدة",
        phone: "0551122334",
        tax_number: "300123456700003",
        commercial_register: "1010987654",
        national_address: "الرياض - طريق خريص - حي المنار",
      };

      const totalAmount = Number(ord.total_price || ord.total_amount || existingInv?.total_amount || 0);
      const settlement = ord.settlement_summary || existingInv?.settlement_summary;
      const isPickup = Boolean(
        ord.is_pickup === true ||
        ord.delivery_type === "pickup" ||
        ord.delivery_method === "pickup" ||
        ord.fulfillment_method === "SELF_PICKUP" ||
        ord.fulfillment_method === "BRANCH_PICKUP" ||
        settlement?.isPickup === true ||
        existingInv?.is_pickup === true ||
        existingInv?.delivery_type === "pickup"
      );
      const deliveryFee = isPickup
        ? 0
        : Number(
            (ord.delivery_fee && ord.delivery_fee > 0 ? ord.delivery_fee : null) ??
            (ord.delivery_cost && ord.delivery_cost > 0 ? ord.delivery_cost : null) ??
            settlement?.deliveryFee ??
            (existingInv?.delivery_fee && existingInv?.delivery_fee > 0 ? existingInv?.delivery_fee : null) ??
            25
          );
      const platformFee = Number(ord.platform_fee ?? ord.platform_commission ?? existingInv?.platform_commission ?? (totalAmount > 0 ? 20 : 0));

      const partsSubtotal = settlement?.partsSubtotal !== undefined
        ? Number(settlement.partsSubtotal)
        : Number(ord.parts_subtotal ?? (totalAmount > 0 ? Math.max(0, vatRate > 0 ? ((totalAmount - deliveryFee - platformFee) / (1 + vatRate)) : (totalAmount - deliveryFee - platformFee)) : 0).toFixed(2));
      const partsVat = Number((partsSubtotal * vatRate).toFixed(2));
      const vendorInvoiceTotal = Number((partsSubtotal + partsVat).toFixed(2));
      const clientFeePercent = Number(
        ord.client_platform_fee_percent ??
        settlement?.clientFeePercent ??
        clientFeePercentSetting ??
        5
      );
      const clientPlatformFee = settlement?.clientPlatformFee != null
        ? Number(settlement.clientPlatformFee)
        : Number(ord.client_platform_fee ?? ((partsSubtotal * (clientFeePercent / 100)).toFixed(2)));
      const clientTaxableBase = partsSubtotal;
      const clientVat = partsVat;
      const clientGrandTotal = (settlement?.grandTotal && Number(settlement.grandTotal) > 0)
        ? Number(settlement.grandTotal)
        : (totalAmount > 0 ? totalAmount : Number((partsSubtotal + partsVat + clientPlatformFee + deliveryFee).toFixed(2)));

      // In the context of parts tax invoices, total_amount represents the parts invoice (115.00 SAR for 100 SAR parts)
      const vendorFeePercent = Number(
        ord.vendor_platform_fee_percent ??
        settlement?.vendorFeePercent ??
        vendorFeePercentSetting ??
        6
      );
      const invoicePartsTotal = vendorInvoiceTotal;
      const subtotal = partsSubtotal;
      const taxAmount = partsVat;
      const platformCommission = Number((partsSubtotal * (vendorFeePercent / 100)).toFixed(2));
      const netPayout = Number((vendorInvoiceTotal - platformCommission).toFixed(2));

      const carMake = matchedRfq?.car_make || ord.car_make || ord.vehicle_make || existingInv?.car_make || existingInv?.vehicle_make || existingInv?.order?.car_make || "غير محدد";
      const carModel = matchedRfq?.car_model || ord.car_model || ord.vehicle_model || existingInv?.car_model || existingInv?.vehicle_model || existingInv?.order?.car_model || "";
      const carYear = matchedRfq?.car_year || ord.car_year || ord.vehicle_year || existingInv?.car_year || existingInv?.vehicle_year || existingInv?.order?.car_year || "—";
      const plateNumber = matchedRfq?.plate_number || ord.plate_number || existingInv?.plate_number || existingInv?.order?.plate_number || "—";
      const vinNumber = matchedRfq?.vin || ord.vin || existingInv?.vin || existingInv?.order?.vin || "—";

      const mergedInvoice = {
        id: existingInv?.id || `INV-${cleanNum || orderId.replace("ORD-", "")}`,
        invoice_number: invNum,
        order_id: orderId,
        deal_id: ord.deal_id || `DEAL-${cleanNum || orderId.replace("ORD-", "")}`,
        status: ord.status === "completed" || ord.status === "paid" ? "paid" : "completed",
        type: "tax_invoice",
        total_amount: invoicePartsTotal,
        grand_total: totalAmount,
        client_grand_total: clientGrandTotal,
        client_taxable_base: clientTaxableBase,
        client_vat: clientVat,
        is_pickup: isPickup,
        delivery_cost: deliveryFee,
        subtotal: subtotal,
        parts_subtotal: partsSubtotal,
        parts_vat: partsVat,
        vendor_invoice_total: vendorInvoiceTotal,
        delivery_fee: deliveryFee,
        platform_fee: platformFee,
        client_platform_fee: clientPlatformFee,
        client_platform_fee_percent: clientFeePercent,
        vendor_platform_fee: platformCommission,
        vendor_platform_fee_percent: vendorFeePercent,
        tax_amount: taxAmount,
        vat_percent: vatPercent,
        vat_rate: vatRate,
        platform_commission_percent: vendorFeePercent,
        platform_commission: platformCommission,
        net_payout: netPayout,
        platform_vat_number: platformVatNumber,
        platform_cr_number: platformCrNumber,
        issued_at: ord.created_at || existingInv?.issued_at || new Date().toISOString(),
        created_at: ord.created_at || existingInv?.created_at || new Date().toISOString(),
        client_id: ord.client_id,
        vendor_id: ord.vendor_id,
        client: matchedClient,
        vendor: matchedVendor,
        client_profile: matchedClient,
        vendor_profile: matchedVendor,
        client_name: matchedClient.company_name || matchedClient.full_name || "عميل موثق",
        client_phone: matchedClient.phone,
        vendor_name: matchedVendor.company_name || matchedVendor.full_name || "مورد معتمد",
        vendor_phone: matchedVendor.phone,
        vehicle_make: carMake,
        car_make: carMake,
        vehicle_model: carModel,
        car_model: carModel,
        vehicle_year: carYear,
        car_year: carYear,
        plate_number: plateNumber,
        vin: vinNumber,
        rfqs: matchedRfq,
        rfq: matchedRfq,
        items: ord.items || existingInv?.items || [],
        invoice_items: ord.items || existingInv?.items || [],
        deal: {
          id: ord.deal_id || `DEAL-${cleanNum}`,
          order_id: orderId,
          client_id: ord.client_id,
          vendor_id: ord.vendor_id,
          orders: {
            id: orderId,
            rfq_id: ord.rfq_id,
            total_price: totalAmount,
            rfqs: matchedRfq,
            rfq: matchedRfq,
            car_make: carMake,
            car_model: carModel,
            car_year: carYear,
            plate_number: plateNumber,
            vin: vinNumber,
          },
        },
      };

      if (cleanNum) {
        invoicesMap.set(cleanNum, mergedInvoice);
      }
      invoicesMap.set(orderId, mergedInvoice);
    });

    // Deduplicate all values strictly by canonical order number or invoice number
    const uniqueInvoicesMap = new Map<string, any>();
    for (const inv of invoicesMap.values()) {
      const cleanKey = extractCleanOrderNumber(inv.order_id || inv.id) || inv.invoice_number || inv.id;
      if (!uniqueInvoicesMap.has(cleanKey)) {
        uniqueInvoicesMap.set(cleanKey, inv);
      }
    }

    const allMergedInvoices = Array.from(uniqueInvoicesMap.values());

    // 3. Filter invoices strictly by user tenant
    let filteredInvoices: any[] = [];

    if (isAdmin) {
      filteredInvoices = allMergedInvoices;
    } else if (userRole === "vendor" || effectiveVendorId) {
      const vId = effectiveVendorId || userId || "vendor-demo-id";
      filteredInvoices = allMergedInvoices.filter((inv: any) => {
        if (!inv) return false;
        if (vId === "vendor-demo-id") {
          return inv.vendor_id === "vendor-demo-id" || inv.vendor_id === "v-supplier-1" || !inv.vendor_id;
        }
        return inv.vendor_id === vId || inv.deal?.vendor_id === vId;
      });
    } else if (userRole === "client" || effectiveClientId) {
      const cId = effectiveClientId || userId || "client-demo-id";
      filteredInvoices = allMergedInvoices
        .filter((inv: any) => {
          if (!inv) return false;
          if (cId === "client-demo-id") {
            return inv.client_id === "client-demo-id" || inv.client_id === "client-1" || !inv.client_id;
          }
          return inv.client_id === cId || inv.deal?.client_id === cId;
        })
        .map((inv: any) => ({
          ...inv,
          total_amount: inv.client_grand_total || inv.total_amount,
          tax_amount: inv.client_vat || inv.tax_amount,
        }));
    } else {
      filteredInvoices = allMergedInvoices;
    }

    // Sort newest first
    filteredInvoices.sort((a: any, b: any) => {
      const tA = new Date(a.issued_at || a.created_at || 0).getTime();
      const tB = new Date(b.issued_at || b.created_at || 0).getTime();
      return tB - tA;
    });

    // 4. Compute Summary Metrics
    const totalInvoicesCount = filteredInvoices.length;
    const totalSalesAmount = filteredInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
    const totalTaxAmount = filteredInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.tax_amount) || 0), 0);
    const totalCommissionAmount = filteredInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.platform_commission) || 0), 0);
    const totalNetPayoutAmount = filteredInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.net_payout) || 0), 0);

    return NextResponse.json({
      success: true,
      invoices: filteredInvoices,
      system_settings: {
        vat_percent: vatPercent,
        platform_commission_percent: vendorFeePercentSetting,
        client_platform_fee_percent: clientFeePercentSetting,
        vendor_platform_fee_percent: vendorFeePercentSetting,
        vat_number: platformVatNumber,
        cr_number: platformCrNumber,
      },
      metrics: {
        totalInvoicesCount,
        totalSalesAmount: Number(totalSalesAmount.toFixed(2)),
        totalTaxAmount: Number(totalTaxAmount.toFixed(2)),
        totalCommissionAmount: Number(totalCommissionAmount.toFixed(2)),
        totalNetPayoutAmount: Number(totalNetPayoutAmount.toFixed(2)),
      },
    });
  } catch (err: any) {
    console.error("GET /api/v1/invoices error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
