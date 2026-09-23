/**
 * downloadFile — Universal file downloader.
 *
 * Uses supabase.storage.from(bucket).download(path) to get a Blob,
 * then triggers a real browser download via a temporary <a> element.
 * Never opens a new tab or navigates inside the app.
 */
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export async function downloadFile(
  bucket: string,
  filePath: string,
  fileName: string
): Promise<void> {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error || !data) {
    console.error("[downloadFile] storage download failed:", error?.message);
    return;
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * downloadFromStorageUrl — Downloads a file from a Supabase public storage URL.
 *
 * Extracts the bucket name and storage path from the public URL, then calls
 * supabase.storage.from(bucket).download(path) to get a real binary Blob.
 * This avoids the "Chrome HTML Document" bug caused by fetch() returning an
 * HTML redirect instead of the actual file bytes.
 *
 * Supabase public URL format:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
export async function downloadFromStorageUrl(publicUrl: string, fileName: string): Promise<void> {
  try {
    // Extract everything after "/object/public/" → "<bucket>/<path>"
    const marker = "/object/public/";
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) {
      // Not a Supabase storage URL — fall back to fetch
      await downloadFromUrl(publicUrl, fileName);
      return;
    }

    const rest = publicUrl.slice(idx + marker.length); // e.g. "order-files/abc/123.png"
    const slashIdx = rest.indexOf("/");
    if (slashIdx === -1) {
      await downloadFromUrl(publicUrl, fileName);
      return;
    }

    const bucket = rest.slice(0, slashIdx);                 // "order-files"
    // Remove any query string from the path (e.g. signed URL tokens)
    const filePath = rest.slice(slashIdx + 1).split("?")[0]; // "abc/123.png"

    await downloadFile(bucket, filePath, fileName);
  } catch (err) {
    console.error("[downloadFromStorageUrl] failed:", err);
  }
}

/**
 * downloadFromUrl — Downloads a file from any URL using fetch + Blob.
 * Use downloadFromStorageUrl instead for Supabase storage files.
 */
export async function downloadFromUrl(url: string, fileName: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error("[downloadFromUrl] failed:", err);
  }
}
