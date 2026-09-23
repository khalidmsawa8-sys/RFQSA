import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  } catch (e) {
    console.warn(`[writeJsonFile] Error writing ${filename}:`, e);
  }
}

function normalizeId(id: string): string[] {
  const clean = id.replace(/^(TICK-|TKT-|TCK-|DSP-|ORD-)/i, "");
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
 * GET /api/v1/support/[id]/messages
 * Returns the conversation thread for a ticket with real-time messages.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const candidateIds = normalizeId(id);

    // 1. Fetch ticket details from Supabase or JSON
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

    const fileTickets = readJsonFile("support_requests_db.json");
    const fileTicket = fileTickets.find((t: any) => candidateIds.includes(t.id));
    if (fileTicket) {
      if (!ticket) {
        ticket = fileTicket;
      } else {
        const fileTime = new Date(fileTicket.updated_at || fileTicket.created_at || 0).getTime();
        const sbTime = new Date(ticket.updated_at || ticket.created_at || 0).getTime();
        if (fileTime >= sbTime || fileTicket.status === "closed" || fileTicket.status === "completed" || fileTicket.status === "resolved" || fileTicket.status === "rejected") {
          ticket = { ...ticket, ...fileTicket };
        }
      }
    }

    if (!ticket) {
      // Synthesize a valid ticket fallback
      ticket = {
        id,
        subject: `تذكرة دعم مباشر #${id}`,
        status: "open",
        created_at: new Date().toISOString(),
      };
    }

    // 2. Fetch conversation messages
    let messages: any[] = [];
    try {
      const { data: rawMessages } = await supabase
        .from("support_messages")
        .select("*")
        .in("request_id", candidateIds)
        .order("created_at", { ascending: true });
      if (Array.isArray(rawMessages)) {
        messages = [...rawMessages];
      }
    } catch (_) {}

    const fileMessages = readJsonFile("support_messages_db.json");
    for (const fm of fileMessages) {
      if (candidateIds.includes(fm.request_id) && !messages.some((m) => m.id === fm.id)) {
        messages.push(fm);
      }
    }

    messages.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    const formattedMessages = messages.map((m: any) => ({
      id: m.id,
      request_id: m.request_id,
      sender_id: m.sender_id,
      sender_role: m.sender_role || "client",
      sender_name: m.sender_name || (m.sender_role === "staff" || m.sender_role === "admin" ? "فريق الدعم الفني" : "المستخدم"),
      message: m.message || m.message_text || "",
      message_text: m.message || m.message_text || "",
      created_at: m.created_at,
    }));

    return NextResponse.json(
      {
        success: true,
        ticket,
        messages: formattedMessages,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[SUPPORT_MESSAGES_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/support/[id]/messages
 * Appends a message from client, vendor, or staff/admin to the conversation thread.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Resolve current user identity
    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const cookieSession = req.cookies.get("rfq_session")?.value;
    const cookieUserName = req.cookies.get("rfq_user_name")?.value;
    const referer = req.headers.get("referer") || "";

    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;

    const body = await req.json();
    const isAdmin = cookieSession === "admin" || referer.includes("/admin");
    const userRole = body.sender_role || (isAdmin ? "staff" : (cookieSession || authUser?.user_metadata?.role || "client"));
    const userId = body.sender_id || cookieUserId || authUser?.id || (isAdmin ? "admin-demo-id" : "client-demo-id");
    const userName = body.sender_name || (isAdmin
      ? "فريق الدعم الفني المركزي"
      : cookieUserName
      ? decodeURIComponent(cookieUserName)
      : (authUser?.user_metadata?.full_name || "المستخدم"));

    const messageText = (body.message_text || body.message || "").trim();

    if (!messageText) {
      return NextResponse.json({ success: false, error: "نص الرسالة مطلوب" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const newMsg = {
      id: `msg-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      request_id: id,
      sender_id: userId,
      sender_role: userRole,
      sender_name: userName,
      message: messageText,
      message_text: messageText,
      created_at: timestamp,
    };

    // 2. Save directly to local JSON file
    const fileMessages = readJsonFile("support_messages_db.json");
    fileMessages.push(newMsg);
    writeJsonFile("support_messages_db.json", fileMessages);

    // 3. Save to Supabase
    try {
      await supabase.from("support_messages").insert(newMsg);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: "تم إرسال الرسالة بنجاح",
      reply: newMsg,
    });
  } catch (err: any) {
    console.error("[SUPPORT_MESSAGES_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
