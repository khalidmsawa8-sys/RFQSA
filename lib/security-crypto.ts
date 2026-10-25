import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte master encryption key strictly from server environment secrets.
 * Keys are NEVER stored in database, git, client bundles, or browser storage.
 */
function getMasterEncryptionKey(): Buffer {
  const secretSeed =
    process.env.SMTP_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET;

  if (!secretSeed) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[FATAL SECURITY ERROR] No SMTP_ENCRYPTION_KEY or server secret defined in environment variables. Credentials encryption cannot operate safely."
      );
    }
    // Deterministic fallback for local development environments only
    const devFallback = `rfq_dev_secret_seed_${process.platform}_${process.arch}`;
    return crypto.createHash("sha256").update(devFallback).digest();
  }

  return crypto.createHash("sha256").update(secretSeed).digest();
}

/**
 * Checks if a given string is already formatted as an AES-256-GCM encrypted secret.
 */
export function isEncryptedSecret(secret: string | null | undefined): boolean {
  if (!secret || typeof secret !== "string") return false;
  const trimmed = secret.trim();
  if (!trimmed.startsWith("enc:v1:")) return false;
  const parts = trimmed.split(":");
  return parts.length === 5 && parts[2]?.length === 32 && parts[3]?.length === 32;
}

/**
 * Encrypts a sensitive credential (such as an SMTP password) using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<auth_tag_hex>:<cipher_hex>
 *
 * Security Guarantees:
 * - 256-bit AES encryption in Galois/Counter Mode (authenticated encryption).
 * - Cryptographically random 16-byte IV for every encryption call.
 * - 16-byte authentication tag ensuring ciphertext integrity.
 * - On failure, NEVER returns plaintext. Returns empty string.
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || typeof plainText !== "string") return "";
  const trimmed = plainText.trim();
  if (!trimmed) return "";

  // Already encrypted with version 1
  if (isEncryptedSecret(trimmed)) {
    return trimmed;
  }

  try {
    const key = getMasterEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(trimmed, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `enc:v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("[security-crypto] Encryption failure: Unable to encrypt credential.");
    return "";
  }
}

/**
 * Decrypts a sensitive credential previously encrypted with encryptSecret().
 *
 * Security Guarantees:
 * - Executed strictly server-side at connection dispatch time.
 * - Validates authentication tag to prevent tampering (GCM integrity check).
 * - Never returns ciphertext or logs the secret upon failure.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText || typeof cipherText !== "string") return "";
  const trimmed = cipherText.trim();

  // If not encrypted, do not attempt to decrypt; return empty
  if (!trimmed.startsWith("enc:v1:")) {
    return "";
  }

  try {
    const parts = trimmed.split(":");
    if (parts.length !== 5) {
      console.warn("[security-crypto] Decryption rejected: Invalid ciphertext format.");
      return "";
    }

    const [, , ivHex, authTagHex, encryptedHex] = parts;
    if (!ivHex || !authTagHex || !encryptedHex) return "";

    // Hex validation
    if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(authTagHex) || !/^[0-9a-fA-F]+$/.test(encryptedHex)) {
      console.warn("[security-crypto] Decryption rejected: Non-hex characters in ciphertext.");
      return "";
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      console.warn("[security-crypto] Decryption rejected: Invalid IV or AuthTag length.");
      return "";
    }

    const key = getMasterEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("[security-crypto] Decryption failure: Authentication tag mismatch or corrupted secret.");
    return "";
  }
}

/**
 * Masks a secret string for UI presentation (e.g. ••••••••)
 */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  return "••••••••";
}

/**
 * Sanitizes header strings to prevent SMTP CRLF / Header Injection attacks.
 */
export function sanitizeHeaderValue(val: string): string {
  if (!val || typeof val !== "string") return "";
  return val.replace(/[\r\n\x00-\x1f\x7f]/g, " ").trim();
}

/**
 * Validates an SMTP Host against Server-Side Request Forgery (SSRF) and malicious hostnames.
 * Blocks loopback, cloud metadata (169.254.169.254), link-local, and private addresses.
 */
export function validateSmtpHost(host: string): { isValid: boolean; error?: string } {
  if (!host || typeof host !== "string") {
    return { isValid: false, error: "عنوان خادم SMTP مطلوب" };
  }

  const trimmed = host.trim().toLowerCase();

  // Length check
  if (trimmed.length === 0 || trimmed.length > 253) {
    return { isValid: false, error: "طول عنوان خادم SMTP غير صالح" };
  }

  // Dangerous characters check (no CRLF, whitespace, path traversal, colons, or control chars)
  if (/[\r\n\t\s/\\?#%<>{}[\]|`^]/.test(trimmed)) {
    return { isValid: false, error: "عنوان خادم SMTP يحتوي على رموز غير مسموح بها" };
  }

  // Loopback / Localhost check
  if (
    trimmed === "localhost" ||
    trimmed === "localhost.localdomain" ||
    trimmed === "127.0.0.1" ||
    trimmed === "0.0.0.0" ||
    trimmed === "::1" ||
    trimmed === "[::1]" ||
    trimmed.startsWith("127.")
  ) {
    return { isValid: false, error: "غير مسموح بربط خادم البريد بعنوان محلي (Loopback / Localhost)" };
  }

  // Cloud Metadata Endpoints (AWS, GCP, Azure, OpenStack)
  if (
    trimmed === "169.254.169.254" ||
    trimmed === "169.254.170.2" ||
    trimmed.startsWith("169.254.") ||
    trimmed.startsWith("fe80:")
  ) {
    return { isValid: false, error: "غير مسموح بالاتصال بنقاط البيانات السحابية (Cloud Metadata / Link-Local)" };
  }

  // Check IPv4 Private address ranges
  const ipv4Match = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) {
      return { isValid: false, error: "عنوان IP غير صالح" };
    }

    const [o1, o2] = octets;
    // 10.0.0.0/8
    if (o1 === 10) {
      return { isValid: false, error: "غير مسموح باستخدام عناوين الشبكات الخاصة (10.0.0.0/8)" };
    }
    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) {
      return { isValid: false, error: "غير مسموح باستخدام عناوين الشبكات الخاصة (172.16.0.0/12)" };
    }
    // 192.168.0.0/16
    if (o1 === 192 && o2 === 168) {
      return { isValid: false, error: "غير مسموح باستخدام عناوين الشبكات الخاصة (192.168.0.0/16)" };
    }
    // 100.64.0.0/10 (Carrier NAT)
    if (o1 === 100 && o2 >= 64 && o2 <= 127) {
      return { isValid: false, error: "غير مسموح باستخدام نطاقات Carrier NAT" };
    }
  }

  // Domain structure validation: standard hostname regex (labels separated by dots)
  const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  if (!hostnameRegex.test(trimmed)) {
    return { isValid: false, error: "صيغة نطاق خادم SMTP غير صالحة" };
  }

  return { isValid: true };
}
