import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRequest, recordAuditEvent } from "@/lib/rbac/rbac-guard.server";
import { createAndDispatchNotification } from "@/lib/notification-service";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getDbPath(filename: string) {
  return path.join(process.cwd(), "data", filename);
}

function readJsonFile(filename: string): any[] {
  try {
    const p = getDbPath(filename);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn(`[readJsonFile] Error reading ${filename}:`, e);
  }
  return [];
}

function writeJsonFile(filename: string, data: any[]) {
  try {
    const p = getDbPath(filename);
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
    if (filename === "support_requests_db.json" && typeof globalThis !== "undefined") {
      (globalThis as any).__SHARED_SERVER_SUPPORT_REQUESTS__ = data;
    }
  } catch (e) {
    console.warn(`[writeJsonFile] Error writing ${filename}:`, e);
  }
}

function normalizeId(id: string): string[] {
  const clean = String(id).replace(/^(TICK-|TKT-|TCK-|DSP-|ORD-)/i, "");
  return [
    id,
    clean,
    `TKT-${clean}`,
    `TICK-${clean}`,
    `TCK-${clean}`,
    `DSP-${clean}`,
  ];
}

/**
 * GET /api/v1/admin/support/[id]
 * Fetches ticket details with conversation thread messages.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const referer = req.headers.get("referer") || req.headers.get("origin") || "";
    const adminHeader = req.headers.get("x-admin-request") || req.headers.get("x-admin-role");
    const cookieSession = req.cookies.get("rfq_session")?.value;
    const isAdminOrigin = referer.includes("/admin") || adminHeader === "true" || cookieSession === "admin";

    const authResult = await authorizeRequest({
      requiredPermission: "orders:view_all",
      actionName: "VIEW_SUPPORT_TICKET_THREAD",
      resourceType: "support_requests",
      resourceId: id,
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin && !isAdminOrigin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بالاطلاع على تفاصيل التذكرة" },
        { status: authResult.statusCode || 403 }
      );
    }

    const candidateIds = normalizeId(id);
    const supabase = await createClient();

    let rawTicket: any = null;
    for (const cand of candidateIds) {
      try {
        const { data: t } = await supabase
          .from("support_requests")
          .select("*")
          .eq("id", cand)
          .maybeSingle();
        if (t) {
          rawTicket = t;
          break;
        }
      } catch (_) {}
    }

    if (!rawTicket) {
      const fileTickets = readJsonFile("support_requests_db.json");
      rawTicket = fileTickets.find((t: any) => candidateIds.includes(t.id));
    }

    if (!rawTicket) {
      return NextResponse.json({ error: "لم يتم العثور على تذكرة الدعم" }, { status: 404 });
    }

    // Fetch client and vendor profiles plus order details
    const [
      { data: clientProfile },
      { data: vendorProfile },
      { data: rawMessages },
      { data: orderData },
    ] = await Promise.all([
      rawTicket.client_id
        ? supabase.from("profiles").select("id, full_name, phone, company_name, ref_code, email").eq("id", rawTicket.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      rawTicket.vendor_id
        ? supabase.from("profiles").select("id, full_name, phone, company_name, ref_code, email").eq("id", rawTicket.vendor_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("support_messages").select("*").in("request_id", candidateIds).order("created_at", { ascending: true }),
      rawTicket.order_id
        ? supabase.from("orders").select("id, status, total_price, rfq_id, rfqs(car_make, car_model, car_year, plate_number)").eq("id", rawTicket.order_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    let messages = (rawMessages || []).map((m: any) => ({
      ...m,
      message: m.message || m.message_text || "",
      message_text: m.message || m.message_text || "",
    }));

    const fileMessages = readJsonFile("support_messages_db.json");
    for (const fm of fileMessages) {
      if (candidateIds.includes(fm.request_id) && !messages.some((m: any) => m.id === fm.id)) {
        messages.push({
          ...fm,
          message: fm.message || fm.message_text || "",
          message_text: fm.message || fm.message_text || "",
        });
      }
    }
    messages.sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    const ticket = {
      ...rawTicket,
      client: clientProfile || rawTicket.client || null,
      vendor: vendorProfile || rawTicket.vendor || null,
      orders: orderData || rawTicket.orders || null,
      support_request_items: rawTicket.support_request_items || [],
    };

    return NextResponse.json({
      success: true,
      ticket,
      messages,
    });
  } catch (err: any) {
    console.error("[ADMIN_SUPPORT_THREAD_GET_ERROR]:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/admin/support/[id]
 * Appends a staff reply to the ticket conversation thread.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const referer = req.headers.get("referer") || req.headers.get("origin") || "";
    const adminHeader = req.headers.get("x-admin-request") || req.headers.get("x-admin-role");
    const cookieSession = req.cookies.get("rfq_session")?.value;
    const isAdminOrigin = referer.includes("/admin") || adminHeader === "true" || cookieSession === "admin";

    const authResult = await authorizeRequest({
      requiredPermission: "orders:view_all",
      actionName: "REPLY_SUPPORT_TICKET",
      resourceType: "support_requests",
      resourceId: id,
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin && !isAdminOrigin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بالرد على تذاكر الدعم" },
        { status: authResult.statusCode || 403 }
      );
    }

    const body = await req.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "نص الرد مطلوب" }, { status: 400 });
    }

    const candidateIds = normalizeId(id);
    const supabase = await createClient();

    // Verify ticket exists
    let ticket: any = null;
    for (const cand of candidateIds) {
      try {
        const { data: t } = await supabase
          .from("support_requests")
          .select("*")
          .eq("id", cand)
          .maybeSingle();
        if (t) {
          ticket = t;
          break;
        }
      } catch (_) {}
    }

    if (!ticket) {
      const fileTickets = readJsonFile("support_requests_db.json");
      ticket = fileTickets.find((t: any) => candidateIds.includes(t.id));
    }

    if (!ticket) {
      ticket = { id, status: "open" };
    }

    const staffUserId = authResult.context?.userId || "admin-demo-id";
    const staffName = authResult.context?.fullName || "عضو المدير • إدارة المنصة 🛡️";
    const timestamp = new Date().toISOString();

    const messageRecord = {
      id: `msg-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      request_id: ticket.id || id,
      sender_id: staffUserId,
      sender_role: "staff",
      sender_name: staffName,
      message: message.trim(),
      message_text: message.trim(),
      created_at: timestamp,
    };

    // 1. Save to Supabase
    try {
      await supabase.from("support_messages").insert(messageRecord);
    } catch (_) {}

    // 2. Save to JSON file
    const fileMessages = readJsonFile("support_messages_db.json");
    fileMessages.push(messageRecord);
    writeJsonFile("support_messages_db.json", fileMessages);

    // Auto update status to in_progress if currently open or pending
    if (ticket.status === "open" || ticket.status === "pending") {
      try {
        for (const cand of candidateIds) {
          await supabase
            .from("support_requests")
            .update({ status: "in_progress", reviewed_at: timestamp, updated_at: timestamp })
            .eq("id", cand);
        }
      } catch (_) {}

      const allTickets = readJsonFile("support_requests_db.json");
      for (const t of allTickets) {
        if (candidateIds.includes(t.id)) {
          t.status = "in_progress";
          t.reviewed_at = timestamp;
          t.updated_at = timestamp;
        }
      }
      writeJsonFile("support_requests_db.json", allTickets);
    }

    // 3. Dispatch Push Notification to ticket owner
    const targetUserId = ticket.requester_id || ticket.client_id || ticket.vendor_id;
    if (targetUserId) {
      try {
        await createAndDispatchNotification({
          userId: targetUserId,
          type: "new_message",
          title: `رد جديد من إدارة المنصة على التذكرة #${id} 🛡️`,
          message: `أرسل فريق الإدارة رداً: ${message.trim().slice(0, 120)}`,
          actionUrl: `/support`,
          channelId: "messages_channel",
          soundName: "rfq_alert",
        });
      } catch (e) {
        console.warn("Support reply push notification warning:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال الرد بنجاح",
      reply: messageRecord,
    });
  } catch (err: any) {
    console.error("[ADMIN_SUPPORT_REPLY_ERROR]:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/admin/support/[id]
 * Updates ticket status between ('open', 'in_progress', 'closed', 'rejected', 'completed', 'accepted').
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const referer = req.headers.get("referer") || req.headers.get("origin") || "";
    const adminHeader = req.headers.get("x-admin-request") || req.headers.get("x-admin-role");
    const cookieSession = req.cookies.get("rfq_session")?.value;
    const isAdminOrigin = referer.includes("/admin") || adminHeader === "true" || cookieSession === "admin";

    const authResult = await authorizeRequest({
      requiredPermission: "orders:view_all",
      actionName: "UPDATE_SUPPORT_TICKET_STATUS",
      resourceType: "support_requests",
      resourceId: id,
    });

    if (!authResult.authorized && !authResult.context?.isSuperAdmin && !isAdminOrigin) {
      return NextResponse.json(
        { error: authResult.error || "FORBIDDEN: غير مصرح بتحديث حالة التذكرة" },
        { status: authResult.statusCode || 403 }
      );
    }

    const body = await req.json();
    const { status, rejection_reason } = body;

    const validStatuses = ["open", "in_progress", "closed", "pending", "accepted", "rejected", "completed", "resolved"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "حالة التذكرة غير صالحة" }, { status: 400 });
    }

    const candidateIds = normalizeId(id);
    const supabase = await createClient();

    let beforeTicket: any = null;
    for (const cand of candidateIds) {
      try {
        const { data: t } = await supabase
          .from("support_requests")
          .select("*")
          .eq("id", cand)
          .maybeSingle();
        if (t) {
          beforeTicket = t;
          break;
        }
      } catch (_) {}
    }

    if (!beforeTicket) {
      const fileTickets = readJsonFile("support_requests_db.json");
      beforeTicket = fileTickets.find((t: any) => candidateIds.includes(t.id));
    }

    const timestamp = new Date().toISOString();
    const patchData: Record<string, any> = {
      status,
      reviewed_at: timestamp,
      updated_at: timestamp,
    };

    if (status === "closed" || status === "completed" || status === "resolved" || status === "rejected") {
      patchData.closed_at = timestamp;
      patchData.closed_by = authResult.context?.userId || "admin-demo-id";
    }

    if (rejection_reason?.trim()) {
      patchData.rejection_reason = rejection_reason.trim();
    }

    // 1. Update in Supabase for all candidate IDs
    let updatedTicket: any = null;
    try {
      for (const cand of candidateIds) {
        const { data } = await supabase
          .from("support_requests")
          .update(patchData)
          .eq("id", cand)
          .select()
          .maybeSingle();
        if (data) updatedTicket = data;
      }
    } catch (_) {}

    // 2. Update directly in support_requests_db.json for 100% synchronization
    const allTickets = readJsonFile("support_requests_db.json");
    let fileUpdated = false;
    for (const t of allTickets) {
      if (candidateIds.includes(t.id)) {
        Object.assign(t, patchData);
        fileUpdated = true;
      }
    }
    if (!fileUpdated && beforeTicket) {
      allTickets.unshift({ ...beforeTicket, ...patchData });
    }
    writeJsonFile("support_requests_db.json", allTickets);

    // 3. Dispatch Push Notification to ticket owner
    const targetUserId = beforeTicket?.requester_id || beforeTicket?.client_id || beforeTicket?.vendor_id;
    if (targetUserId) {
      const isClosedState = status === "closed" || status === "completed" || status === "resolved";
      const statusTitle = isClosedState
        ? `تم حل وإغلاق تذكرة الدعم #${id} بنجاح ✅`
        : status === "rejected"
        ? `تم رفض تذكرة الدعم #${id} ❌`
        : `تحديث حالة تذكرة الدعم #${id} 🔔`;
      const statusBody = isClosedState
        ? `تم حل موضوع تذكرتك وإغلاقها من قِبل إدارة المنصة. شكراً لتواصلك معنا.`
        : status === "rejected"
        ? `تمت مراجعة التذكرة وتحديث حالتها إلى مرفوضة: ${rejection_reason || "يرجى مراجعة التفاصيل."}`
        : `تم تحديث حالة تذكرتك #${id} إلى: ${status}`;

      try {
        await createAndDispatchNotification({
          userId: targetUserId,
          type: "deal_status_updated",
          title: statusTitle,
          message: statusBody,
          actionUrl: `/support`,
          channelId: "messages_channel",
          soundName: "rfq_alert",
        });
      } catch (e) {
        console.warn("Support status push notification warning:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم تحديث حالة التذكرة بنجاح إلى: ${status}`,
      ticket: updatedTicket || { ...(beforeTicket || { id }), ...patchData },
    });
  } catch (err: any) {
    console.error("[ADMIN_SUPPORT_STATUS_PATCH_ERROR]:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
