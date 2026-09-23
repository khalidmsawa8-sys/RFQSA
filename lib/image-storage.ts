import fs from "fs";
import path from "path";

/**
 * Ensures the uploads directory exists and persists any base64 image data to a static file on disk.
 * Returns the public relative URL (e.g. `/uploads/parts/part_1740000000_abc12.jpg`).
 */
export function persistBase64Image(dataUriOrUrl: string | null | undefined): string | null {
  if (!dataUriOrUrl || typeof dataUriOrUrl !== "string") return null;

  // Already a static path or remote URL
  if (
    dataUriOrUrl.startsWith("http://") ||
    dataUriOrUrl.startsWith("https://") ||
    dataUriOrUrl.startsWith("/uploads/") ||
    dataUriOrUrl.startsWith("/")
  ) {
    return dataUriOrUrl;
  }

  // Check if it is a base64 data URI or raw base64 string
  const base64Match = dataUriOrUrl.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/s);

  let ext = "jpg";
  let base64Data = "";

  if (base64Match) {
    ext = base64Match[1].toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    if (ext === "svg+xml") ext = "svg";
    base64Data = base64Match[2];
  } else if (dataUriOrUrl.length > 500 && /^[A-Za-z0-9+/=]+$/.test(dataUriOrUrl.substring(0, 100))) {
    // Looks like raw base64 without data: prefix
    base64Data = dataUriOrUrl;
  } else {
    // Regular short string or invalid format
    return dataUriOrUrl;
  }

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "parts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Clean base64 buffer & write
    const buffer = Buffer.from(base64Data.replace(/\s/g, ""), "base64");
    fs.writeFileSync(filePath, buffer);

    return `/uploads/parts/${filename}`;
  } catch (err) {
    console.error("[ImageStorage] Error persisting base64 image to disk:", err);
    return null;
  }
}

/**
 * Recursively scans and sanitizes a parts item or list, converting any embedded base64 to disk files.
 */
export function sanitizePartsImages(parts: any[] | any): any {
  if (!parts) return parts;

  if (Array.isArray(parts)) {
    return parts.map((part) => {
      if (!part || typeof part !== "object") return part;
      const sanitized = { ...part };

      // Handle images array
      if (Array.isArray(sanitized.images)) {
        sanitized.images = sanitized.images
          .map((img: any) => persistBase64Image(img))
          .filter(Boolean);
      }

      // Handle single image keys
      if (sanitized.imagePathname) sanitized.imagePathname = persistBase64Image(sanitized.imagePathname);
      if (sanitized.imageUrl) sanitized.imageUrl = persistBase64Image(sanitized.imageUrl);
      if (sanitized.imagePreview) sanitized.imagePreview = persistBase64Image(sanitized.imagePreview);

      return sanitized;
    });
  }

  return parts;
}

/**
 * Strips huge base64 strings from JSON responses before sending over network to protect bandwidth.
 */
export function sanitizeRfqForNetwork(rfq: any): any {
  if (!rfq) return rfq;
  const clean = { ...rfq };

  if (clean.parts_description) {
    if (typeof clean.parts_description === "string" && clean.parts_description.includes("base64")) {
      try {
        const parsed = JSON.parse(clean.parts_description);
        const sanitized = sanitizePartsImages(parsed);
        clean.parts_description = JSON.stringify(sanitized);
      } catch (_) {
        // Truncate rogue base64 strings
        clean.parts_description = clean.parts_description.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/g, "");
      }
    }
  }

  return clean;
}
