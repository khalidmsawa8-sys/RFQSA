import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/client/support/[id]/messages
 * Fetches conversation messages for a ticket owned by the client.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED: يجب تسجيل الدخول" }, { status: 401 });
    }

    // Verify ticket ownership
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_requests")
      .select("id, client_id, status")
      .eq("id", id)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });
    }

    const isOwner =
      ticket.client_id === user.id ||
      ticket.vendor_id === user.id ||
      (ticket as any).requester_id === user.id ||
      user.user_metadata?.role === "admin";

    if (!isOwner) {
      return NextResponse.json({ error: "FORBIDDEN: غير مصرح بالاطلاع على هذه المحادثة" }, { status: 403 });
    }

    const { data: messages, error: msgErr } = await supabase
      .from("support_messages")
      .select("*")
      .eq("request_id", id)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/client/support/[id]/messages
 * Client sends a new message in the ticket live conversation.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED: يجب تسجيل الدخول" }, { status: 401 });
    }

    const body = await req.json();
    const { message_text } = body;

    if (!message_text || !message_text.trim()) {
      return NextResponse.json({ error: "نص الرسالة مطلوب" }, { status: 400 });
    }

    // Verify ticket ownership
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_requests")
      .select("id, client_id, status")
      .eq("id", id)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });
    }

    const isAllowed =
      ticket.client_id === user.id ||
      ticket.vendor_id === user.id ||
      (ticket as any).requester_id === user.id ||
      user.user_metadata?.role === "admin";

    if (!isAllowed) {
      return NextResponse.json({ error: "FORBIDDEN: غير مصرح بإرسال رسائل في هذه التذكرة" }, { status: 403 });
    }

    // Check if ticket is closed
    const isClosed = ["closed", "completed", "rejected"].includes(ticket.status);
    const isAdmin = user.user_metadata?.role === "admin";
    if (isClosed && !isAdmin) {
      return NextResponse.json(
        { error: "تم إغلاق هذه التذكرة نهائياً من قبل الإدارة، والمحادثة مغلقة ولا يمكن إرسال ردود جديدة." },
        { status: 403 }
      );
    }

    // Get client profile name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_name")
      .eq("id", user.id)
      .maybeSingle();

    const senderName = profile?.full_name || profile?.company_name || "العميل";

    const msgRecord = {
      id: crypto.randomUUID(),
      request_id: id,
      sender_id: user.id,
      sender_role: "client",
      sender_name: senderName,
      message_text: message_text.trim(),
      created_at: new Date().toISOString(),
    };

    const { data: createdMsg, error: insertErr } = await supabase
      .from("support_messages")
      .insert(msgRecord)
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: "فشل حفظ الرسالة: " + insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: createdMsg || msgRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
