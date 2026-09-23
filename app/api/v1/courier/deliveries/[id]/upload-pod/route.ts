import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "pod");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "لم يتم إرفاق ملف صورة الإثبات." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "نوع الملف غير مدعوم. يرجى رفع صورة بصيغة JPG أو PNG أو WEBP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)." },
        { status: 400 }
      );
    }

    // Ensure directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `pod_${id.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.${extension}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/pod/${filename}`;

    return NextResponse.json({
      success: true,
      file_url: fileUrl,
      metadata: {
        file_id: filename,
        mime_type: file.type,
        size_bytes: file.size,
        hash: fileHash,
        uploaded_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error uploading POD file:", err);
    return NextResponse.json(
      { success: false, error: err.message || "فشل رفع صورة إثبات التسليم." },
      { status: 500 }
    );
  }
}
