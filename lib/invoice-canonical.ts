/**
 * Canonical Invoice Number Generator and Normalizer
 * Enforces a single, authoritative invoice number format across:
 * - Invoices table
 * - Orders table
 * - Wallet Transactions (Invoice column & reference)
 * - PDF Generation
 * - Admin, Vendor, Courier, and Client Invoices views
 */

export function extractCleanOrderNumber(input: string | number | null | undefined): string {
  if (!input) return "";
  const str = String(input);
  const match = str.match(/ORD-?(\w+)/i) ||
                str.match(/RFQ-?(\w+)/i) ||
                str.match(/DEAL-?(\w+)/i) ||
                str.match(/INV-?\d{4}-?0*(\w+)/i) ||
                str.match(/(\d+)/);
  if (match) {
    return match[1].replace(/^0+/, "") || match[1];
  }
  return str.replace(/[^0-9A-Za-z]/g, "");
}

export function generateCanonicalInvoiceNumber(orderIdOrNumber: string, date: Date = new Date()): string {
  const clean = extractCleanOrderNumber(orderIdOrNumber);
  const year = date ? date.getFullYear() : 2026;
  if (!clean) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `INV-${year}-${rand}`;
  }
  return `INV-${year}-${clean}`;
}

export function generateCanonicalOrderReference(orderIdOrNumber: string): string {
  const clean = extractCleanOrderNumber(orderIdOrNumber);
  if (!clean) return "ORD-1001";
  return `ORD-${clean}`;
}

/**
 * Normalizes any invoice reference to guarantee uniform representation (INV-2026-XXXX)
 */
export function normalizeInvoiceNumber(rawInvoiceNum?: string | null, orderId?: string | null): string {
  if (rawInvoiceNum) {
    const clean = extractCleanOrderNumber(rawInvoiceNum);
    if (clean) return `INV-2026-${clean}`;
  }
  if (orderId) {
    return generateCanonicalInvoiceNumber(orderId);
  }
  return "INV-2026-2491";
}

export const getOrCreateCanonicalInvoiceNumber = generateCanonicalInvoiceNumber;


