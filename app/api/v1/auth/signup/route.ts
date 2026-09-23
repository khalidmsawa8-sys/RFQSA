import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "التسجيل المباشر مغلق حالياً، يتم إنشاء الحسابات من خلال إدارة المنصة حصراً.",
      locked: true,
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "التسجيل المباشر مغلق حالياً، يتم إنشاء الحسابات من خلال إدارة المنصة حصراً.",
      locked: true,
    },
    { status: 403 }
  );
}
