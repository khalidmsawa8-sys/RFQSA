import { type NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads/parts directory
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "parts");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Clean filename
    const cleanOrigName = (file.name || "part.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${cleanOrigName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    fs.writeFileSync(filePath, buffer);

    const relativePath = `/uploads/parts/${uniqueFileName}`;
    const absoluteUrl = `https://rfqsa.tech/uploads/parts/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      pathname: relativePath,
      url: absoluteUrl,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
