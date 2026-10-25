import { NextRequest, NextResponse } from "next/server";
import { identityRepository } from "@/lib/bounded-contexts/identity/identity.repository";
import { createApiEnvelope, createApiErrorEnvelope } from "@/lib/bounded-contexts/types/common.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cookieUserId = req.cookies.get("rfq_user_id")?.value;
    const userId = user?.id || (cookieUserId && cookieUserId !== "client-demo-id" && cookieUserId !== "vendor-demo-id" ? cookieUserId : null);

    if (userId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (prof) {
        const userAccount = {
          user_id: prof.id,
          full_name: prof.full_name || "مستخدم مسجل",
          email: prof.email || "",
          phone: prof.phone || "",
          preferred_language: "ar",
          timezone: "Asia/Riyadh",
          theme: "dark",
          created_at: prof.created_at || new Date().toISOString(),
        };

        const sessions = [
          {
            id: `sess-${prof.id}`,
            device_name: "متصفح الويب الحالي",
            os: "Web",
            browser: "Browser",
            ip_address: "مباشر",
            location: "المملكة العربية السعودية",
            is_current: true,
            last_active_at: new Date().toISOString(),
          }
        ];

        const subscription = await identityRepository.getSubscription();

        return NextResponse.json(createApiEnvelope({ user: userAccount, sessions, subscription }));
      }
    }

    const userAccount = await identityRepository.getUserIdentity();
    const sessions = await identityRepository.getActiveSessions();
    const subscription = await identityRepository.getSubscription();

    return NextResponse.json(createApiEnvelope({ user: userAccount, sessions, subscription }));
  } catch (error: any) {
    return NextResponse.json(
      createApiErrorEnvelope([{ code: "ACCOUNT_FETCH_ERROR", message: error?.message || "فشل جلب بيانات الحساب والأمان" }]),
      { status: 500 }
    );
  }
}
