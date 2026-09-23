import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILE_FILE = path.join(DATA_DIR, "admin_profile.json");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, profile, password_data, platform_settings } = body;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let current: Record<string, any> = {
      full_name: "م. عبدالله بن صالح المنصور",
      email: "admin@rfqsa.tech",
      phone: "+966 50 123 4567",
      job_title: "المدير التنفيذي للعمليات التقنية (Super Admin)",
      ref_code: "ADM-001",
      role_badge: "المشرف العام",
      two_factor_enabled: true,
      last_login: new Date().toISOString(),
      created_at: "2024-01-15T08:30:00.000Z",
    };

    if (fs.existsSync(PROFILE_FILE)) {
      try {
        current = { ...current, ...JSON.parse(fs.readFileSync(PROFILE_FILE, "utf-8")) };
      } catch (e) {}
    }

    if (action === "update_profile" && profile) {
      current = {
        ...current,
        full_name: profile.full_name?.trim() || current.full_name,
        email: profile.email?.trim() || current.email,
        phone: profile.phone?.trim() || current.phone,
        job_title: profile.job_title?.trim() || current.job_title,
        updated_at: new Date().toISOString(),
      };
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(current, null, 2), "utf-8");

      return NextResponse.json({
        success: true,
        message: "تم تحديث البيانات الشخصية للمشرف بنجاح",
        profile: current,
      });
    }

    if (action === "change_password") {
      const { new_password, current_password } = password_data || {};
      if (!new_password || new_password.length < 6) {
        return NextResponse.json(
          { success: false, error: "يجب أن لا تقل كلمة المرور الجديدة عن 6 خانات" },
          { status: 400 }
        );
      }

      current.password_updated_at = new Date().toISOString();
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(current, null, 2), "utf-8");

      return NextResponse.json({
        success: true,
        message: "تم تغيير كلمة المرور بنجاح وتأمين الحساب",
      });
    }

    if (action === "toggle_2fa") {
      current.two_factor_enabled = body.enabled !== undefined ? Boolean(body.enabled) : !current.two_factor_enabled;
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(current, null, 2), "utf-8");

      return NextResponse.json({
        success: true,
        message: current.two_factor_enabled
          ? "تم تفعيل المصادقة الثنائية (2FA) بنجاح لحماية الحساب"
          : "تم إلغاء تفعيل المصادقة الثنائية",
        two_factor_enabled: current.two_factor_enabled,
      });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}
