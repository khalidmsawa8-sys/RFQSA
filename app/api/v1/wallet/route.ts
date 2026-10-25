import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractCleanOrderNumber, generateCanonicalInvoiceNumber, generateCanonicalOrderReference } from "@/lib/invoice-canonical";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders_db.json");

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {}
  return fallback;
}

/**
 * GET /api/v1/wallet
 * Returns live authoritative ledger balance, transaction history, and summary stats
 * for the authenticated membership, individual user, or company organization.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Resolve active user / membership identifier from multiple sources
    const searchParams = req.nextUrl.searchParams;
    const paramUserId = searchParams.get("userId") || searchParams.get("id");
    const headerUserId = req.headers.get("x-user-id");
    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const cookieMemberId = req.cookies.get("rfq_member_id")?.value;
    const cookieOrgId = req.cookies.get("rfq_org_id")?.value;
    const cookieSession = req.cookies.get("rfq_session")?.value;
    const referer = req.headers.get("referer") || "";

    let { data: authData } = await supabase.auth.getUser();
    let authUser = authData?.user;

    let targetUserId =
      paramUserId ||
      headerUserId ||
      cookieUserId ||
      authUser?.id ||
      cookieMemberId;

    // Fallback if accessed without explicit user ID cookie
    if (!targetUserId) {
      if (cookieSession === "vendor" || referer.includes("/vendor")) {
        targetUserId = "vendor-demo-id";
      } else if (cookieSession === "client" || referer.includes("/client")) {
        targetUserId = "client-demo-id";
      } else if (cookieSession === "courier" || referer.includes("/courier")) {
        targetUserId = "courier-1";
      } else {
        targetUserId = "client-demo-id";
      }
    }

    // 2. Lookup Profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, company_name, role, ref_code, balance, wallet_balance, phone")
      .eq("id", targetUserId)
      .maybeSingle();

    // 3. Check organization_members to identify linked company or team membership
    const { data: allMembers } = await supabase
      .from("organization_members")
      .select("id, user_id, organization_id, full_name, role_id, email");

    const matchedMember = (allMembers || []).find(
      (m: any) =>
        m.user_id === targetUserId ||
        m.id === targetUserId ||
        (cookieMemberId && m.id === cookieMemberId) ||
        (profile?.full_name && m.full_name === profile.full_name)
    );

    // If profile was not found by direct ID, check if targetUserId matches an organization member
    if (!profile && matchedMember) {
      profile = {
        id: matchedMember.user_id || matchedMember.id,
        full_name: matchedMember.full_name,
        company_name: matchedMember.full_name,
        role: matchedMember.role_id?.startsWith("vendor") ? "vendor" : "client",
        ref_code: `MEM-${matchedMember.id.slice(-6).toUpperCase()}`,
        balance: 0,
        wallet_balance: 0,
        phone: "",
      };
    }

    // 4. Gather all applicable IDs to fetch authoritative transactions
    const candidateIds = new Set<string>();
    if (targetUserId) candidateIds.add(targetUserId);
    if (profile?.id) candidateIds.add(profile.id);
    if (cookieOrgId) candidateIds.add(cookieOrgId);
    if (matchedMember) {
      if (matchedMember.id) candidateIds.add(matchedMember.id);
      if (matchedMember.user_id) candidateIds.add(matchedMember.user_id);
      if (matchedMember.organization_id) {
        candidateIds.add(matchedMember.organization_id);
        const standardOrgId = matchedMember.organization_id.replace(/^org-/, "");
        if (standardOrgId) candidateIds.add(standardOrgId);
      }
    }

    const targetIdList = Array.from(candidateIds);

    // 5. Fetch transactions from the authoritative server ledger and local db
    const WALLET_TX_FILE = path.join(DATA_DIR, "wallet_transactions_db.json");
    const diskTransactions = loadJson<any[]>(WALLET_TX_FILE, []);

    const { data: rawTxList, error: txError } = await supabase
      .from("wallet_transactions")
      .select("*")
      .in("user_id", targetIdList)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (txError) {
      console.error("[WALLET_API_TX_ERROR]:", txError);
    }

    const txMap = new Map<string, any>();
    (rawTxList || []).forEach((t: any) => {
      if (t && t.id) txMap.set(t.id, t);
    });

    // Filter disk transactions strictly for this user
    diskTransactions.forEach((tx: any) => {
      if (!tx || !tx.id) return;
      let matches = false;
      if (targetUserId === "vendor-demo-id") {
        matches = tx.user_id === "vendor-demo-id" || tx.user_id === "v-supplier-1" || targetIdList.includes(tx.user_id);
      } else if (targetUserId === "client-demo-id") {
        matches = tx.user_id === "client-demo-id" || tx.user_id === "client-1" || targetIdList.includes(tx.user_id);
      } else {
        matches = targetIdList.includes(tx.user_id) || tx.user_id === targetUserId;
      }

      if (matches && !txMap.has(tx.id)) {
        txMap.set(tx.id, tx);
      }
    });

    let transactions = Array.from(txMap.values());

    if (transactions.length === 0 && matchedMember?.organization_id) {
      const orgKey = matchedMember.organization_id.replace(/^org-/, "");
      const { data: orgTx } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", orgKey)
        .order("created_at", { ascending: false });
      if (orgTx && orgTx.length > 0) {
        transactions = orgTx;
      }
    }

    // 6. Enrich with orders strictly belonging to this tenant/user
    const allOrders = loadJson<any[]>(ORDERS_FILE, []);
    const isVendor = profile?.role === "vendor" || targetUserId.includes("vendor") || cookieSession === "vendor" || referer.includes("/vendor");
    const isClient = profile?.role === "client" || targetUserId.includes("client") || cookieSession === "client" || referer.includes("/client");

    const existingOrderIds = new Set<string>();
    for (const t of transactions) {
      const ordNum = extractCleanOrderNumber(t.order_id || t.reference || t.description || t.id);
      if (ordNum) existingOrderIds.add(ordNum);
    }

    for (const ord of allOrders) {
      if (!ord || !ord.id) continue;
      const cleanNum = extractCleanOrderNumber(ord.id);
      if (!cleanNum || existingOrderIds.has(cleanNum)) continue;

      const orderAmount = Number(ord.total_price || ord.total_amount || 0);
      const orderDate = ord.completed_at || ord.created_at || new Date().toISOString();

      if (isVendor) {
        // STRICT VENDOR CHECK: Only add orders belonging to this vendor
        const belongsToVendor =
          ord.vendor_id === targetUserId ||
          (targetUserId === "vendor-demo-id" && (ord.vendor_id === "vendor-demo-id" || ord.vendor_id === "v-supplier-1" || !ord.vendor_id));

        if (!belongsToVendor) continue;

        transactions.push({
          id: `TXN-ORD-${cleanNum}-V`,
          user_id: targetUserId,
          type: "credit",
          direction: "inflow",
          amount: orderAmount,
          balance_before: 0,
          balance_after: 0,
          description: `استحقاق أرباح مبيعات طلب #${ord.id}`,
          reference: `ORD-${cleanNum}`,
          reference_number: `ORD-${cleanNum}`,
          order_id: `ORD-${cleanNum}`,
          invoice_number: `INV-2026-${cleanNum}`,
          created_at: orderDate,
          status: "completed",
        });
        existingOrderIds.add(cleanNum);
      } else if (isClient) {
        // STRICT CLIENT CHECK: Only add orders belonging to this client
        const belongsToClient =
          ord.client_id === targetUserId ||
          (targetUserId === "client-demo-id" && (ord.client_id === "client-demo-id" || ord.client_id === "client-1" || !ord.client_id));

        if (!belongsToClient) continue;

        transactions.push({
          id: `TXN-ORD-${cleanNum}-C`,
          user_id: targetUserId,
          type: "debit",
          direction: "outflow",
          amount: orderAmount,
          balance_before: 0,
          balance_after: 0,
          description: `دفع قيمة طلب قطع الغيار #${ord.id}`,
          reference: `ORD-${cleanNum}`,
          reference_number: `ORD-${cleanNum}`,
          order_id: `ORD-${cleanNum}`,
          invoice_number: `INV-2026-${cleanNum}`,
          created_at: orderDate,
          status: "completed",
        });
        existingOrderIds.add(cleanNum);
      }
    }

    // Sort descending by created_at
    transactions.sort((a: any, b: any) => {
      const tA = new Date(a.created_at || a.date).getTime();
      const tB = new Date(b.created_at || b.date).getTime();
      return tB - tA;
    });

    // 7. Format all transactions to ensure strict uniform representation (ORD-XXXX & INV-2026-XXXX)
    const formattedTransactions = transactions.map((t: any) => {
      const cleanOrderNum = extractCleanOrderNumber(t.order_id || t.reference || t.invoice_number || t.description || t.id);
      const isOrder = !!cleanOrderNum && (
        (t.description || "").includes("طلب") ||
        (t.description || "").includes("مبيعات") ||
        (t.description || "").includes("ORD") ||
        (t.reference || "").includes("ORD") ||
        (t.id || "").includes("ORD") ||
        !!t.order_id
      );

      let canonicalRef = t.reference || t.reference_number || t.id;
      let canonicalInv: string | null = t.invoice_number || null;

      if (isOrder && cleanOrderNum) {
        canonicalRef = `ORD-${cleanOrderNum}`;
        canonicalInv = `INV-2026-${cleanOrderNum}`;
      } else if (t.invoice_number) {
        canonicalInv = generateCanonicalInvoiceNumber(t.invoice_number);
        if (!canonicalRef || canonicalRef.startsWith("TXN-")) {
          canonicalRef = isOrder && cleanOrderNum ? `ORD-${cleanOrderNum}` : (t.reference || `TXN-${String(t.id).slice(0, 8).toUpperCase()}`);
        }
      } else {
        // Clean non-order references (Deposit / Withdrawal / Adjustment)
        if (canonicalRef.startsWith("ADJ-")) {
          const num = canonicalRef.match(/\d+/);
          canonicalRef = num ? `ADJ-${num[0].slice(-6)}` : canonicalRef;
        } else if (canonicalRef.startsWith("TXN-") && (t.description || "").includes("سحب")) {
          const num = canonicalRef.match(/\d+/);
          canonicalRef = num ? `WTH-2026-${num[0].slice(-3)}` : "WTH-2026-001";
        } else if (canonicalRef.startsWith("TXN-") && (t.description || "").includes("شحن")) {
          const num = canonicalRef.match(/\d+/);
          canonicalRef = num ? `DEP-2026-${num[0].slice(-3)}` : "DEP-2026-001";
        }
        canonicalInv = null;
      }

      return {
        id: t.id,
        type: (t.type === "credit" ? "credit" : "debit") as "credit" | "debit",
        direction: t.direction || (t.type === "credit" ? "inflow" : "outflow"),
        amount: Math.abs(Number(t.amount || 0)),
        balance_before: t.balance_before !== undefined ? Number(t.balance_before) : undefined,
        balance_after: Number(t.balance_after || 0),
        date: t.created_at || t.date,
        created_at: t.created_at || t.date,
        description: t.description || (t.type === "credit" ? "إيداع في المحفظة" : "سحب من المحفظة"),
        reference: canonicalRef,
        reference_number: canonicalRef,
        order_id: cleanOrderNum ? `ORD-${cleanOrderNum}` : undefined,
        invoice_number: canonicalInv || undefined,
        status: t.status || "completed",
      };
    });

    // 8. Compute accurate real-time balance & aggregates
    const totalCredit = formattedTransactions
      .filter((t: any) => t.type === "credit")
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    const totalDebit = formattedTransactions
      .filter((t: any) => t.type === "debit")
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    let currentBalance = 0;
    if (isVendor) {
      currentBalance = Math.max(0, totalCredit - totalDebit);
    } else {
      currentBalance = Number(profile?.balance ?? (profile as any)?.wallet_balance ?? Math.max(0, totalCredit - totalDebit));
    }

    return NextResponse.json(
      {
        success: true,
        balance: currentBalance,
        wallet_balance: currentBalance,
        totalCredit,
        totalDebit,
        transactionCount: formattedTransactions.length,
        transactions: formattedTransactions,
        profile: {
          id: profile?.id || targetUserId,
          full_name: profile?.full_name || "مستخدم رفق",
          company_name: profile?.company_name || profile?.full_name || "منشأة رفق",
          role: profile?.role || (isVendor ? "vendor" : "client"),
          ref_code: profile?.ref_code || "",
          balance: currentBalance,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    console.error("[WALLET_API_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "فشل جلب بيانات المحفظة" },
      { status: 500 }
    );
  }
}

