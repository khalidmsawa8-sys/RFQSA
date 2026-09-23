"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ArrowLeft, Loader2, FileText, Search, Car, Award, Calendar, KeyRound, Copy, Check, Filter, X, SlidersHorizontal, User, Phone, MapPin, Building2, UserCheck, Store, Globe, Clock, ShieldCheck, Tag, Images, Eye, Truck, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QuotePDFExport } from "@/components/quote-pdf-export";
import { QuoteDetailsInspectionModal } from "@/components/quote-details-inspection-modal";
import { VendorDetailsModal, VendorModalData } from "@/components/vendor-details-modal";
import { RfqCardTimer } from "@/components/rfq-card-timer";
import { ReactivateSuccessModal } from "@/components/reactivate-success-modal";

interface RFQItem {
  partName: string;
  quantity: number;
  partNumber?: string;
  partType?: "original" | "commercial";
  commercialBrand?: string;
  imageUrl?: string;
  images?: string[];
  notes?: string;
}

interface RFQExtraDetails {
  recipientName?: string;
  recipientPhone?: string;
  deliveryLocation?: string;
  isUrgent?: boolean;
  rfqType?: string;
  targetVendorName?: string;
  deliveryMethod?: string;
  notes?: string;
}

interface RFQ {
  id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  plate_number?: string;
  vin: string;
  parts_description: string;
  delivery_location?: string;
  status: string;
  created_at: string;
}

function parseRFQExtraDetails(parts_description?: string, delivery_location?: string): RFQExtraDetails {
  if (!parts_description) return { deliveryLocation: delivery_location };
  try {
    const parsed = JSON.parse(parts_description);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const item0 = parsed[0] || {};
      return {
        recipientName: item0.recipientName || undefined,
        recipientPhone: item0.recipientPhone || undefined,
        deliveryLocation: delivery_location || item0.deliveryLocation || undefined,
        isUrgent: item0.isUrgent || false,
        rfqType: item0.rfqType || "public",
        targetVendorName: item0.targetVendorName || undefined,
        deliveryMethod: item0.deliveryMethod || undefined,
        notes: item0.notes || undefined,
      };
    }
  } catch {}
  return { deliveryLocation: delivery_location };
}

interface QuoteItem {
  part_name: string;
  part_number?: string;
  quantity?: number;
  unit_price?: number;
  price?: string | number;
  line_total?: number;
  availability?: string;
  image_url?: string;
}

interface Quote {
  id: string;
  vendor_id: string;
  items?: QuoteItem[] | any;
  total_price: number;
  delivery_days: number | null;
  delivery_cost?: number;
  delivery_snapshot?: any;
  notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    company_name: string;
  };
  avgRating?: number;
}

function parseRFQItems(parts_description: string): RFQItem[] {
  try {
    const parsed = JSON.parse(parts_description);
    if (Array.isArray(parsed)) {
      return parsed.map((p: Record<string, unknown>) => ({
        partName: (p.partName || p.part_name || p.name || "") as string,
        quantity: Number(p.quantity || 1),
        partNumber: (p.partNumber || p.part_number || "") as string,
        partType: ((p.partType === "commercial" || p.part_type === "commercial" || p.partTypeName === "تجاري") ? "commercial" : "original") as "original" | "commercial",
        commercialBrand: (p.commercialBrand || p.commercial_brand || p.brand || "") as string,
        images: Array.isArray(p.images) && p.images.length > 0 ? (p.images as string[]) : (p.imagePathname || p.imagePreview || p.imageUrl || p.image_url ? [String(p.imagePathname || p.imagePreview || p.imageUrl || p.image_url)] : []),
        imageUrl: (p.imagePathname || p.imagePreview || p.imageUrl || p.image_url || "") as string,
        notes: (p.notes || "") as string,
      }));
    }
  } catch {
    // plain text
  }
  return [{ partName: parts_description, quantity: 1, partType: "original" }];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function VendorAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const colors = [
    "bg-blue-600", "bg-emerald-600", "bg-violet-600",
    "bg-amber-600", "bg-rose-600", "bg-teal-600",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];

  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
    );
  }
  return (
    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function parseQuoteTimingAndNotes(notes?: string | null, delivery_snapshot?: any, delivery_days?: number | null) {
  let prepTimeText = "يومان";
  let cleanNotes = notes || "تتوفر خيارات متعددة للقطع مع الضمان المعتمد.";

  // 1. From snapshot if available
  if (delivery_snapshot?.preparation_time?.text) {
    prepTimeText = delivery_snapshot.preparation_time.text;
  } else if (notes) {
    const match = notes.match(/مدة التجهيز:\s*([^|]+)/i);
    if (match && match[1]) {
      prepTimeText = match[1].trim();
    }
  }

  // 2. Clean notes from the prep time prefix
  if (notes) {
    cleanNotes = notes
      .replace(/⏱️?\s*مدة التجهيز:\s*[^|]+(\||$)/i, "")
      .replace(/📝?\s*ملاحظات:\s*/i, "")
      .trim();
    if (!cleanNotes) {
      cleanNotes = "تتوفر خيارات متعددة للقطع مع الضمان المعتمد.";
    }
  }

  // 3. Delivery Time Text
  let deliveryTimeText = "خلال 24 ساعة";
  if (delivery_days != null) {
    const d = Number(delivery_days);
    if (d === 1) deliveryTimeText = "يوم واحد";
    else if (d === 2) deliveryTimeText = "يومان (48 ساعة)";
    else if (d > 2 && d <= 10) deliveryTimeText = `${d} أيام`;
    else deliveryTimeText = `${d} يوم`;
  } else if (delivery_snapshot?.estimated_days) {
    const d = Number(delivery_snapshot.estimated_days);
    deliveryTimeText = `${d} أيام`;
  }

  return {
    prepTimeText,
    cleanNotes,
    deliveryTimeText,
  };
}

export default function RFQDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rfqId = params.rfqId as string;
  const supabase = createClient();

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [inspectedQuote, setInspectedQuote] = useState<Quote | null>(null);
  const [acceptedCustomItems, setAcceptedCustomItems] = useState<QuoteItem[] | null>(null);
  const [acceptedCustomTotal, setAcceptedCustomTotal] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [clientProfile, setClientProfile] = useState<{ full_name?: string; company_name?: string; tax_number?: string; commercial_register?: string; national_address?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [openDetails, setOpenDetails] = useState<string | null>(null);
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [showRFQDetails, setShowRFQDetails] = useState(false);
  const [vinCopied, setVinCopied] = useState(false);
  const [selectedVendorModal, setSelectedVendorModal] = useState<VendorModalData | null>(null);

  // Wallet balance check
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);

  // Filter sheet
  const [filterOpen, setFilterOpen] = useState(false);
  // Applied filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deliveryMin, setDeliveryMin] = useState("");
  const [deliveryMax, setDeliveryMax] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  // Pending (inside sheet before apply)
  const [pDateFrom, setPDateFrom] = useState("");
  const [pDateTo, setPDateTo] = useState("");
  const [pDeliveryMin, setPDeliveryMin] = useState("");
  const [pDeliveryMax, setPDeliveryMax] = useState("");
  const [pAmountMin, setPAmountMin] = useState("");
  const [pAmountMax, setPAmountMax] = useState("");

  const openFilterSheet = () => {
    setPDateFrom(dateFrom); setPDateTo(dateTo);
    setPDeliveryMin(deliveryMin); setPDeliveryMax(deliveryMax);
    setPAmountMin(amountMin); setPAmountMax(amountMax);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setDateFrom(pDateFrom); setDateTo(pDateTo);
    setDeliveryMin(pDeliveryMin); setDeliveryMax(pDeliveryMax);
    setAmountMin(pAmountMin); setAmountMax(pAmountMax);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setPDateFrom(""); setPDateTo("");
    setPDeliveryMin(""); setPDeliveryMax("");
    setPAmountMin(""); setPAmountMax("");
  };

  const activeFilterCount = [dateFrom, dateTo, deliveryMin, deliveryMax, amountMin, amountMax].filter(Boolean).length;

  const [isReactivating, setIsReactivating] = useState(false);
  const [reactivatedModalData, setReactivatedModalData] = useState<{
    displayId: string;
    durationMinutes: number;
    carName?: string;
  } | null>(null);

  const handleReactivate = async () => {
    if (!rfq) return;
    try {
      setIsReactivating(true);
      const res = await fetch(`/api/rfqs/${rfq.id}/reactivate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "تعذر إعادة تنشيط الطلب");
      }

      const nowIso = new Date().toISOString();
      const newDuration = data.durationMinutes || 20;
      const expiresAtIso = data.expiresAt || new Date(Date.now() + newDuration * 60 * 1000).toISOString();

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `rfq_reactivated_${rfq.id}`,
            JSON.stringify({
              created_at: nowIso,
              expires_at: expiresAtIso,
              status: "open",
            })
          );
        } catch {}
      }

      setRfq((prev) =>
        prev
          ? {
              ...prev,
              status: "open",
              created_at: nowIso,
              expires_at: expiresAtIso,
            }
          : prev
      );

      // Notify other tabs and components
      window.dispatchEvent(new Event("rfq_data_changed"));

      const shortId = rfq.id.slice(0, 8).toUpperCase();
      const carTitle = `${rfq.car_make || ""} ${rfq.car_model || ""}`.trim();
      setReactivatedModalData({
        displayId: `#REQ-${shortId}`,
        durationMinutes: newDuration,
        carName: carTitle || undefined,
      });
    } catch (err: any) {
      console.error("Reactivation error:", err);
    } finally {
      setIsReactivating(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      let rfqData: any = null;

      // 1. Direct API fetch
      try {
        const res = await fetch(`/api/rfqs/${rfqId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.rfq) {
            rfqData = json.rfq;
          }
        }
      } catch (err) {
        console.warn("Direct RFQ API fetch error:", err);
      }

      // 2. Fallback to Supabase
      if (!rfqData) {
        const { data } = await supabase
          .from("rfqs")
          .select("*")
          .eq("id", rfqId)
          .maybeSingle();
        rfqData = data;
      }

      if (!rfqData) { router.push("/client/orders"); return; }
      setRfq(rfqData as RFQ);

      // Fetch Quotes: API first (server single source of truth), fallback to Supabase
      let rawQuotes: any[] = [];
      try {
        const res = await fetch(`/api/quotes?rfq_id=${rfqId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.quotes)) {
            rawQuotes = json.quotes;
          }
        }
      } catch (err) {
        console.warn("Direct quotes API fetch error:", err);
      }

      if (rawQuotes.length === 0) {
        const { data: quotesData } = await supabase
          .from("quotes")
          .select("*, profiles(full_name, company_name, tax_number, commercial_register, national_address)")
          .eq("rfq_id", rfqId)
          .order("created_at", { ascending: false });
        if (quotesData && Array.isArray(quotesData)) {
          rawQuotes = quotesData;
        }
      }

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("vendor_id, rating");

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      (reviewsData || []).forEach((r: { vendor_id: string; rating: number }) => {
        if (!ratingMap[r.vendor_id]) ratingMap[r.vendor_id] = { sum: 0, count: 0 };
        ratingMap[r.vendor_id].sum += r.rating;
        ratingMap[r.vendor_id].count += 1;
      });

      // Deduplicate quotes by vendor_id (keep newest)
      const seenVendors = new Set<string>();
      const dedupedQuotes = rawQuotes.filter((q) => {
        const vKey = q.vendor_id || q.id;
        if (!vKey || seenVendors.has(vKey)) return false;
        seenVendors.add(vKey);
        return true;
      });

      const enriched = dedupedQuotes.map((q) => {
        const stats = ratingMap[q.vendor_id];
        let parsedItems = q.items;
        if (typeof parsedItems === "string") {
          try {
            parsedItems = JSON.parse(parsedItems);
          } catch {
            parsedItems = [];
          }
        }
        if (!Array.isArray(parsedItems)) parsedItems = [];

        return {
          ...q,
          items: parsedItems,
          avgRating: stats && stats.count > 0 && !isNaN(stats.sum / stats.count) ? stats.sum / stats.count : 5.0,
        };
      });
      setQuotes(enriched);
      setIsLoading(false);
    }
    loadData();

    // Fetch client profile for PDF exports & wallet balance
    async function loadClientProfile() {
      try {
        const res = await fetch("/api/v1/wallet", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        if (data?.success) {
          if (data.balance !== undefined) setWalletBalance(Number(data.balance));
          if (data.profile) setClientProfile(data.profile);
          return;
        }
      } catch (err) {
        console.warn("Wallet prefetch warning:", err);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, company_name, tax_number, commercial_register, national_address")
          .eq("id", user.id)
          .single();
        if (profile) setClientProfile(profile);
      }
    }
    loadClientProfile();
  }, [rfqId, router, supabase]);

  const handleAccept = async (quote: Quote, customItems?: QuoteItem[], customTotal?: number, couponCode?: string) => {
    setSelectedQuote(quote);
    setAcceptedCustomItems(customItems && customItems.length > 0 ? customItems : quote.items || []);
    setAcceptedCustomTotal(customTotal != null ? customTotal : Number(quote.total_price));
    setAppliedCouponCode(couponCode || null);
    setWalletBalance(null);
    setBalanceLoading(true);
    setShowConfirm(true);
    setInspectedQuote(null);

    // Fetch authoritative live wallet balance from server API
    try {
      const res = await fetch("/api/v1/wallet", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (data && data.success && data.balance !== undefined) {
        setWalletBalance(Number(data.balance));
        if (data.profile && !clientProfile) {
          setClientProfile(data.profile);
        }
      } else {
        // Fallback
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: txRows } = await supabase
            .from("wallet_transactions")
            .select("balance_after")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);
          const balance = txRows && txRows.length > 0 ? Number(txRows[0].balance_after) : 0;
          setWalletBalance(balance);
        } else {
          setWalletBalance(0);
        }
      }
    } catch (err) {
      console.warn("Wallet fetch error:", err);
      setWalletBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  const confirmAccept = async () => {
    if (!selectedQuote || !rfq) return;
    setIsAccepting(true);

    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        user = {
          id: "client-demo-id",
          email: "client@rfqsa.tech",
          user_metadata: { role: "client", full_name: "شركة المشتريات الوطنية", company_name: "شركة المشتريات الوطنية" },
        } as any;
      }

      const finalTotal = acceptedCustomTotal != null ? acceptedCustomTotal : Number(selectedQuote.total_price);
      const itemsSource = acceptedCustomItems && acceptedCustomItems.length > 0 ? acceptedCustomItems : (selectedQuote.items || []);

      // 1. Update RFQ & Quote status
      try {
        await supabase.from("rfqs").update({ status: "accepted" }).eq("id", rfq.id);
        await supabase.from("quotes").update({ status: "accepted" }).eq("id", selectedQuote.id);
        await supabase.from("quotes").update({ status: "rejected" }).eq("rfq_id", rfq.id).neq("id", selectedQuote.id);
      } catch (e) {
        console.warn("Client state update warning:", e);
      }

      // 2. Direct server API updates
      try {
        await fetch(`/api/quotes/${selectedQuote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        });
      } catch (e) {}

      // Record coupon usage if a code was applied
      if (appliedCouponCode) {
        try {
          await fetch("/api/coupons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "use", code: appliedCouponCode }),
          });
        } catch (err) {
          console.warn("Coupon usage record warning:", err);
        }
      }

      // 3. Prepare order & deal IDs
      const rawNum = rfq.id.replace(/\D+/g, "") || Math.floor(1000 + Math.random() * 9000);
      const orderId = `ORD-${rawNum}`;
      const dealId = `DEAL-${rawNum}`;

      const parsedItems = itemsSource.map((item: any) => {
        if (item.unit_price !== undefined) {
          return {
            part_name: item.part_name || "",
            part_number: item.part_number || null,
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            availability: item.availability || "available",
          };
        }
        const qtyMatch = String(item.part_name || "").match(/\(الكمية:\s*(\d+)\)/);
        const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        let cleanName = String(item.part_name || "").replace(/\s*\(الكمية:\s*\d+\)/, "").trim();
        const pnMatch = cleanName.match(/\s*-\s*رقم القطعة:\s*(.+)$/);
        const partNumber = pnMatch ? pnMatch[1].trim() : null;
        if (pnMatch) cleanName = cleanName.replace(/\s*-\s*رقم القطعة:.+$/, "").trim();
        return { part_name: cleanName, part_number: partNumber, quantity, unit_price: Number(item.price) || 0, availability: item.availability || "available" };
      });

      // 4. Record wallet transaction deduction if applicable
      try {
        const prevBal = walletBalance || 0;
        const newBal = Math.max(0, prevBal - finalTotal);

        // Record to server ledger via authoritative API
        try {
          await fetch("/api/v1/wallet/transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              type: "debit",
              amount: finalTotal,
              description: `دفع قيمة طلب قطع الغيار #${orderId}`,
              reference: `ORD-${rawNum}`,
              orderId: orderId,
              invoiceNumber: `INV-${new Date().getFullYear()}-${rawNum}`,
            }),
          });
        } catch (apiErr) {
          console.warn("Wallet API deduction error:", apiErr);
        }

        // Also record in supabase client for immediate local reactive state
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          type: "debit",
          amount: finalTotal,
          balance_before: prevBal,
          balance_after: newBal,
          description: `دفع قيمة طلب قطع الغيار #${orderId}`,
          reference: `ORD-${rawNum}`,
          order_id: orderId,
          created_at: new Date().toISOString(),
        });
      } catch (wErr) {
        console.warn("Wallet record warning:", wErr);
      }

      // 5. Insert order via Supabase
      try {
        await supabase.from("orders").insert({
          id: orderId,
          rfq_id: rfq.id,
          quote_id: selectedQuote.id,
          client_id: user.id,
          vendor_id: selectedQuote.vendor_id,
          status: "confirmed",
          total_price: finalTotal,
          created_at: new Date().toISOString(),
        });
      } catch (oErr) {
        console.warn("Order insert warning:", oErr);
      }

      // 6. Insert deal and related tables via Supabase
      try {
        await supabase.from("deals").insert({
          id: dealId,
          order_id: orderId,
          client_id: user.id,
          vendor_id: selectedQuote.vendor_id,
          status: "preparing",
          current_version: 1,
          created_at: new Date().toISOString(),
        });

        const versionId = `VER-${rawNum}-1`;
        await supabase.from("deal_versions").insert({
          id: versionId,
          deal_id: dealId,
          version_number: 1,
          total_price: finalTotal,
          delivery_days: selectedQuote.delivery_days,
          notes: selectedQuote.notes,
        });

        if (parsedItems.length > 0) {
          await supabase.from("deal_version_items").insert(
            parsedItems.map((p: any) => ({
              version_id: versionId,
              part_name: p.part_name,
              part_number: p.part_number,
              quantity: p.quantity,
              unit_price: p.unit_price,
              availability: p.availability,
            }))
          );
        }

        await supabase.from("deal_events").insert({
          deal_id: dealId,
          user_id: user.id,
          event_type: "deal_created",
          description: `تم إنشاء الصفقة - ${parsedItems.length} قطع - إجمالي ${finalTotal} ر.س`,
        });

        await supabase.from("notifications").insert({
          user_id: selectedQuote.vendor_id,
          type: "deal_created",
          title: "تم قبول عرضك",
          message: `العميل قبل عرض السعر الخاص بك بقيمة ${finalTotal} ر.س`,
          order_id: orderId,
          sent_at: new Date().toISOString(),
        });
      } catch (dealErr) {
        console.warn("Deal creation warning:", dealErr);
      }

      // 7. Persist to server-side orders API
      try {
        await fetch("/api/v1/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: orderId,
            rfq_id: rfq.id,
            quote_id: selectedQuote.id,
            client_id: user.id,
            vendor_id: selectedQuote.vendor_id,
            status: "confirmed",
            total_price: finalTotal,
            items: parsedItems,
            deal_id: dealId,
          }),
        });
      } catch (apiErr) {
        console.warn("Orders API post warning:", apiErr);
      }

      // 8. Clear reactivation cache so RFQ leaves tab=rfq and initializes with preparing status
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`rfq_reactivated_${rfq.id}`);
          localStorage.removeItem(`rfq_reactivated_RFQ-${rawNum}`);
          localStorage.removeItem(`rfq_reactivated_${rawNum}`);
          localStorage.setItem(`rfq_order_status_${orderId}`, "preparing");
          localStorage.setItem(`rfq_order_status_ORD-${rawNum}`, "preparing");
          localStorage.setItem(`rfq_order_status_${rawNum}`, "preparing");
          localStorage.setItem(`rfq_deal_status_${dealId}`, "preparing");
          window.dispatchEvent(new CustomEvent("rfq_data_changed", { detail: { orderId, status: "preparing" } }));
          window.dispatchEvent(new Event("storage"));
        } catch (storageErr) {
          console.warn("Storage setup warning:", storageErr);
        }
      }

      // Close modal and redirect
      setShowConfirm(false);
      setIsAccepting(false);
      router.push(`/deal/${orderId}`);
    } catch (err: any) {
      console.error("Error accepting quote:", err);
      setIsAccepting(false);
      alert("حدث خطأ أثناء تأكيد قبول العرض: " + (err?.message || "يرجى المحاولة مرة أخرى"));
    } finally {
      setIsAccepting(false);
    }
  };

  const getVendorName = (q: Quote) => q.profiles?.company_name || q.profiles?.full_name || "مورد";

  const copyVin = () => {
    if (rfq?.vin) {
      navigator.clipboard.writeText(rfq.vin);
      setVinCopied(true);
      setTimeout(() => setVinCopied(false), 2000);
    }
  };

  const filtered = quotes.filter((q) => {
    const name = getVendorName(q).toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());

    const issued = new Date(q.created_at);
    const matchDateFrom = !dateFrom || issued >= new Date(dateFrom);
    const matchDateTo = !dateTo || issued <= new Date(dateTo + "T23:59:59");

    const delivery = q.delivery_days ?? 0;
    const matchDeliveryMin = !deliveryMin || delivery >= Number(deliveryMin);
    const matchDeliveryMax = !deliveryMax || delivery <= Number(deliveryMax);

    const amount = Number(q.total_price ?? 0);
    const matchAmountMin = !amountMin || amount >= Number(amountMin);
    const matchAmountMax = !amountMax || amount <= Number(amountMax);

    return matchSearch && matchDateFrom && matchDateTo && matchDeliveryMin && matchDeliveryMax && matchAmountMin && matchAmountMax;
  });

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rfq) return null;

  const shortId = rfq.id.slice(0, 8).toUpperCase();

  const isRfqExpired = rfq.status === "cancelled" || rfq.status === "expired";

  return (
    <div className="min-h-screen bg-[#f0f2f5]" dir="rtl">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="w-full flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">العروض المستلمة</h1>
          <div className="flex items-center gap-3">
            {isRfqExpired ? (
              <Button
                size="sm"
                onClick={handleReactivate}
                disabled={isReactivating}
                className="h-8 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-2xs gap-1.5 cursor-pointer"
                title="إعادة تنشيط الطلب ليعود نشطاً للموردين"
              >
                {isReactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>إعادة تنشيط الطلب 🚀</span>
              </Button>
            ) : (
              <RfqCardTimer createdAt={rfq.created_at} status={rfq.status} />
            )}
            <button
              onClick={() => setShowRFQDetails(true)}
              className="text-left group"
            >
              <p className="text-base font-semibold text-blue-600 group-hover:text-blue-800 group-hover:underline transition-colors">
                طلب #{shortId}
              </p>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 py-6 space-y-4">
        {/* Reactivation Notification Banner if Expired / Cancelled */}
        {isRfqExpired && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-right space-y-0.5">
                <h4 className="text-sm font-black text-amber-950">انتهت مهلة هذا الطلب لاستقبال عروض الأسعار</h4>
                <p className="text-xs text-amber-800">
                  يمكنك إعادة تنشيط الطلب بضغطة زر ليعود نشطاً للموردين ويبدأ عد مهلة جديدة لاستقبال العروض.
                </p>
              </div>
            </div>
            <Button
              onClick={handleReactivate}
              disabled={isReactivating}
              className="h-10 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 gap-2 shrink-0 cursor-pointer"
            >
              {isReactivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>إعادة تنشيط الطلب وتجديد المهلة 🚀</span>
            </Button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/client/orders")}
            className="text-gray-600 hover:text-gray-900 p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في العروض..."
              className="w-full border border-gray-200 rounded-lg py-2 pr-9 pl-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={openFilterSheet}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shrink-0 shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            تصفية
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#1a2b4a] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Filter Sheet ── */}
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetContent side="right" className="w-[360px] sm:w-[420px] p-0 flex flex-col" dir="rtl">
            <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <SheetTitle className="text-base font-bold text-gray-800">تصفية البيانات</SheetTitle>
              <button
                onClick={() => setFilterOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

              {/* تصفية التاريخ */}
              <div>
                <p className="text-sm font-bold text-gray-800 mb-3">تصفية التاريخ</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block font-medium">من</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={pDateFrom}
                        onChange={(e) => setPDateFrom(e.target.value)}
                        className="w-full h-10 pr-3 pl-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-gray-600"
                      />
                      {pDateFrom && (
                        <button onClick={() => setPDateFrom("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block font-medium">إلى</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={pDateTo}
                        onChange={(e) => setPDateTo(e.target.value)}
                        className="w-full h-10 pr-3 pl-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-gray-600"
                      />
                      {pDateTo && (
                        <button onClick={() => setPDateTo("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* تصفية المبلغ */}
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">تصفية المبلغ</p>
                <p className="text-xs text-gray-400 mb-3">المبلغ الإجمالي للعرض بالريال السعودي</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block font-medium">من</label>
                    <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                      <span className="px-2.5 text-xs text-gray-400 shrink-0 border-l border-gray-100">SAR</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g., 100"
                        value={pAmountMin}
                        onChange={(e) => setPAmountMin(e.target.value)}
                        className="flex-1 h-10 px-3 text-sm bg-transparent focus:outline-none text-gray-700 placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block font-medium">إلى</label>
                    <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                      <span className="px-2.5 text-xs text-gray-400 shrink-0 border-l border-gray-100">SAR</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g., 500"
                        value={pAmountMax}
                        onChange={(e) => setPAmountMax(e.target.value)}
                        className="flex-1 h-10 px-3 text-sm bg-transparent focus:outline-none text-gray-700 placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-white flex items-center gap-3 shrink-0">
              <button
                onClick={applyFilters}
                className="flex-1 h-11 bg-[#1a2b4a] hover:bg-[#243659] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" />
                تطبيق التصفية
              </button>
              <button
                onClick={clearFilters}
                className="h-11 px-5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Quotes Cards Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400 shadow-sm">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لم تصل أي عروض بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filtered.map((quote, idx) => {
              const vendorName = getVendorName(quote);
              const rating = quote.avgRating ?? 5.0;
              const dateStr = new Date(quote.created_at).toLocaleDateString("ar-SA", {
                day: "numeric", month: "long", year: "numeric",
              });
              const timing = parseQuoteTimingAndNotes(quote.notes, quote.delivery_snapshot, quote.delivery_days);

              return (
                <div
                  key={quote.id}
                  onClick={() => setInspectedQuote(quote)}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-500/80 transition-all duration-200 flex flex-col cursor-pointer relative"
                >
                  {/* Card Header — dark bar */}
                  <div className="bg-[#1E293B] px-4 py-3 flex items-center justify-between gap-3 group-hover:bg-slate-900 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 text-xs font-mono font-bold shrink-0">#{idx + 1}</span>
                      <span className="text-[10px] text-blue-300 font-bold bg-blue-500/20 px-2 py-0.5 rounded border border-blue-400/20">
                        {Array.isArray(quote.items) && quote.items.length > 0 ? quote.items.length : 1} قطع
                      </span>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVendorModal({
                          vendorId: quote.vendor_id || "vendor-demo-id",
                          refCode: (quote.profiles as any)?.ref_code || "VND-501",
                          name: vendorName,
                          rating: rating || 5.0,
                          ordersCount: 512,
                          completedDeals: 2,
                          commitmentRate: "96%",
                          memberSince: "2024",
                          isVerified: true,
                        });
                      }}
                      className="flex-1 flex items-center justify-end gap-2.5 min-w-0 p-1 -m-1 rounded-xl hover:bg-slate-800/90 transition-all cursor-pointer group/vendor"
                      title="انقر لعرض تفاصيل وتقييمات وفروع المورد"
                    >
                      <div className="text-right min-w-0">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="opacity-0 group-hover/vendor:opacity-100 transition-opacity text-[9px] text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/30 px-1 py-0.2 rounded">
                            الملف 🔍
                          </span>
                          <p className="text-white text-sm font-bold leading-tight truncate group-hover/vendor:text-emerald-300 transition-colors">
                            {vendorName}
                          </p>
                        </div>
                      </div>
                      <VendorAvatar name={vendorName} />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 space-y-3 text-right">
                    {/* 1. Logistics Dual Timing Dashboard: Preparation & Delivery Durations */}
                    <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] p-2 rounded-2xl border border-slate-100/90 shadow-2xs">
                      {/* Box A: مدة التجهيز */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs space-y-1 text-right">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-amber-900 font-bold">مدة التجهيز</span>
                          <div className="w-5 h-5 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="truncate">{timing.prepTimeText}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium block">تجهيز وفحص القطع</span>
                      </div>

                      {/* Box B: مدة التوصيل */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs space-y-1 text-right">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-900 font-bold">مدة التوصيل</span>
                          <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Truck className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="text-xs font-black text-emerald-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">{timing.deliveryTimeText}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium block">أسطول رفق المعتمد</span>
                      </div>
                    </div>

                    {/* 2. Total Price Section (إجمالي العرض المالي) */}
                    <div className="bg-[#E8F4F1]/60 border border-emerald-100/90 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-800 block">إجمالي العرض</span>
                          <span className="text-[9px] text-emerald-800 font-bold">شامل ضريبة القيمة المضافة 15%</span>
                        </div>
                      </div>
                      <span className="text-base font-black text-slate-950 font-mono">
                        {quote.total_price != null
                          ? `${Number(quote.total_price).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال`
                          : "—"}
                      </span>
                    </div>

                    {/* 3. Chassis / VIN (الهيكل) Row */}
                    <div className="flex items-center justify-between text-xs px-1 text-slate-500 pt-0.5 border-t border-slate-100">
                      <span className="font-medium text-slate-500">الهيكل:</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-gray-800 text-xs">
                        <span className="text-gray-400">🔗</span>
                        <span dir="ltr">{rfq.vin && rfq.vin !== "—" ? rfq.vin : (rfq as any).plate_number || "غير متوفر"}</span>
                      </div>
                    </div>

                    {/* 4. Delivery Method / Fees line */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>طريقة التوصيل:</span>
                      </span>
                      <div className="text-left font-bold text-slate-800 text-[11px] flex items-center gap-1">
                        <span className="text-emerald-700">🚚 أسطول رفق</span>
                        <span className="text-slate-400 font-normal">
                          {quote.delivery_cost != null && Number(quote.delivery_cost) > 0
                            ? `(رسوم الشحن: ${Number(quote.delivery_cost).toFixed(2)} ر.س)`
                            : "(شحن مجاني)"}
                        </span>
                      </div>
                    </div>

                    {/* 4. Notes line */}
                    <div className="flex items-start justify-between text-xs gap-2 px-1">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5 shrink-0">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>ملاحظات:</span>
                      </span>
                      <span className="text-slate-700 text-xs font-medium text-left leading-relaxed line-clamp-1">
                        {timing.cleanNotes}
                      </span>
                    </div>

                    {/* 5. Date line */}
                    <div className="flex items-center justify-between text-[11px] px-1 text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>تاريخ العرض:</span>
                      </span>
                      <span className="font-mono text-slate-600">{dateStr}</span>
                    </div>

                    {/* 6. Click prompt action banner */}
                    <div className="pt-1">
                      <div className="w-full py-2.5 px-3 rounded-xl bg-blue-50/90 group-hover:bg-blue-600 group-hover:text-white text-blue-700 text-xs font-black flex items-center justify-center gap-1.5 transition-all border border-blue-200/80 group-hover:border-blue-600 shadow-2xs">
                        <Eye className="w-4 h-4" />
                        <span>معاينة وتحديد القطع المطلوبة</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-slate-50/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QuotePDFExport
                      rfq={{
                        id: rfq.id,
                        car_make: rfq.car_make,
                        car_model: rfq.car_model,
                        car_year: rfq.car_year,
                        plate_number: (rfq as any).plate_number,
                        created_at: rfq.created_at,
                      }}
                      vendor={{
                        full_name: (quote.profiles as any)?.full_name,
                        company_name: (quote.profiles as any)?.company_name,
                        tax_number: (quote.profiles as any)?.tax_number,
                        commercial_register: (quote.profiles as any)?.commercial_register,
                        national_address: (quote.profiles as any)?.national_address,
                      }}
                      client={clientProfile ?? undefined}
                      quote={{
                        id: quote.id,
                        items: (quote.items || []).map((p: any) => ({
                          part_name: p.part_name ?? "",
                          part_number: p.part_number ?? "",
                          quantity: Number(p.quantity ?? 1),
                          unit_price: Number(p.unit_price ?? p.price ?? 0),
                          line_total: Number(p.line_total ?? ((p.unit_price ?? Number(p.price) ?? 0) * (p.quantity ?? 1))),
                          availability: p.availability ?? "",
                        })),
                        total_price: Number(quote.total_price ?? 0),
                        delivery_days: Number(quote.delivery_days ?? 0),
                        delivery_price: Number(quote.delivery_cost ?? 0),
                        notes: quote.notes ?? undefined,
                        created_at: quote.created_at,
                      }}
                      triggerButton={
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-xs text-gray-700 font-bold">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span>PDF</span>
                        </button>
                      }
                    />
                    <Button
                      className="flex-1 h-9 bg-[#1a5c4a] hover:bg-[#154d3e] text-white text-xs font-black rounded-lg shadow-xs"
                      onClick={() => setInspectedQuote(quote)}
                    >
                      مراجعة وقبول العرض
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quote Details & Part Selection Inspection Modal */}
      <QuoteDetailsInspectionModal
        isOpen={!!inspectedQuote}
        onClose={() => setInspectedQuote(null)}
        quote={inspectedQuote}
        rfq={rfq}
        clientProfile={clientProfile}
        onAccept={(q, items, total, code) => handleAccept(q, items, total, code)}
      />

      {/* Vendor Profile & Reviews Modal */}
      <VendorDetailsModal
        isOpen={!!selectedVendorModal}
        onClose={() => setSelectedVendorModal(null)}
        vendor={selectedVendorModal}
      />

      {/* RFQ Details Dialog */}
      <Dialog open={showRFQDetails} onOpenChange={setShowRFQDetails}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              تفاصيل الطلب #{shortId}
            </DialogTitle>
          </DialogHeader>

          {rfq && (() => {
            const extra = parseRFQExtraDetails(rfq.parts_description, rfq.delivery_location);
            const items = parseRFQItems(rfq.parts_description || "[]");
            return (
              <div className="space-y-4 pt-1">
                {/* Scope & Urgency Badges Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    {extra.rfqType === "private" ? (
                      <span className="text-xs font-black text-purple-700 bg-purple-100 border border-purple-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5" />
                        <span>طلب خاص – موجه لـ: {extra.targetVendorName || "مورد محدد"}</span>
                      </span>
                    ) : (
                      <span className="text-xs font-black text-blue-700 bg-blue-100 border border-blue-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        <span>طلب عام – لكافة الموردين</span>
                      </span>
                    )}

                    {extra.isUrgent && (
                      <span className="text-xs font-black text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>عاجل جداً 🔥</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-bold text-slate-500">
                    تاريخ الطلب: {new Date(rfq.created_at).toLocaleDateString("ar-SA")}
                  </span>
                </div>

                {/* Vehicle Info - 4 grid cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* نوع وموديل المركبة */}
                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/60">
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-gray-700">السيارة</span>
                      <Car className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <p className="text-center text-sm font-bold text-gray-900 truncate">
                      {rfq.car_make} {rfq.car_model}
                    </p>
                  </div>

                  {/* سنة الصنع */}
                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/60">
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-gray-700">سنة الصنع</span>
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <p className="text-center text-sm font-bold text-gray-900">
                      {rfq.car_year || "—"}
                    </p>
                  </div>

                  {/* رقم اللوحة */}
                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/60">
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-gray-700">رقم اللوحة</span>
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <p className="text-center text-sm font-bold text-gray-900">
                      {rfq.plate_number || "—"}
                    </p>
                  </div>

                  {/* رقم الهيكل */}
                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/60">
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-gray-700">رقم الهيكل VIN</span>
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={copyVin}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="نسخ رقم الهيكل"
                      >
                        {vinCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <p className="text-xs font-mono font-bold text-gray-900 truncate max-w-[100px]" title={rfq.vin}>
                        {rfq.vin || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recipient & Location Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* اسم المستلم */}
                  <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/50 space-y-0.5">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-blue-900">
                      <span>اسم المستلم</span>
                      <User className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <p className="text-center text-sm font-extrabold text-slate-900 truncate">
                      {extra.recipientName || "غير مدخل"}
                    </p>
                  </div>

                  {/* رقم للتواصل */}
                  <div className="border border-emerald-100 rounded-xl p-3 bg-emerald-50/50 space-y-0.5">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-900">
                      <span>رقم للتواصل</span>
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p dir="ltr" className="text-center text-sm font-mono font-bold text-slate-900">
                      {extra.recipientPhone || "—"}
                    </p>
                  </div>

                  {/* موقع التسليم */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-0.5">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-700">
                      <span>موقع التسليم</span>
                      <MapPin className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <p className="text-center text-xs font-bold text-slate-800 truncate" title={extra.deliveryLocation}>
                      {extra.deliveryLocation || "فرع الرياض"}
                    </p>
                  </div>
                </div>

                {/* Parts Table */}
                {items.length > 0 && (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-100/90 px-4 py-2.5 text-xs font-black text-slate-700 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>جدول القطع المطلوبة ({items.length} قطعة)</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        إجمالي الكميات: {items.reduce((acc, curr) => acc + (curr.quantity || 1), 0)}
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200/70">
                            <th className="py-2 px-3 text-center w-10">#</th>
                            <th className="py-2 px-3 text-center w-16">الصورة</th>
                            <th className="py-2 px-3">اسم القطعة</th>
                            <th className="py-2 px-3">رقم القطعة (OEM)</th>
                            <th className="py-2 px-3 text-center">نوع القطعة</th>
                            <th className="py-2 px-3 text-center w-20">الكمية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {items.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                                {i + 1}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {item.images && item.images.length > 0 ? (
                                  (() => {
                                    const count = item.images.length;
                                    const first = item.images[0];
                                    return (
                                      <a
                                        href={first}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="relative inline-block group/thumb"
                                        title={`عرض ${count} صورة للقطعة`}
                                      >
                                        {count > 1 && (
                                          <div className="absolute -top-0.5 -right-0.5 w-8 h-8 rounded-lg bg-blue-500/20 rotate-6" />
                                        )}
                                        <div
                                          className={`relative w-8 h-8 rounded-lg overflow-hidden border transition-all ${
                                            count > 1 ? "border-blue-500" : "border-slate-200 hover:border-blue-500"
                                          }`}
                                        >
                                          <img
                                            src={first}
                                            alt={item.partName}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        {count > 1 && (
                                          <span className="absolute -top-1 -left-1 px-1 py-0.2 rounded-full bg-blue-600 text-white text-[7px] font-black shadow-xs">
                                            {count}
                                          </span>
                                        )}
                                      </a>
                                    );
                                  })()
                                ) : item.imageUrl ? (
                                  <a
                                    href={item.imageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-all"
                                  >
                                    <img
                                      src={item.imageUrl}
                                      alt={item.partName}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-300 font-bold">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {item.partName || "—"}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                {item.partNumber || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {item.partType === "commercial" ? (
                                  <div className="inline-flex flex-col items-center gap-0.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold shadow-2xs">
                                      <Tag className="w-2.5 h-2.5 text-amber-600" />
                                      <span>تجاري</span>
                                    </span>
                                    {item.commercialBrand && (
                                      <span className="text-[9px] text-slate-700 font-bold bg-amber-100/60 px-1.5 py-0.2 rounded border border-amber-200" title={item.commercialBrand}>
                                        {item.commercialBrand}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-extrabold shadow-2xs">
                                    <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                                    <span>أصلي (OEM)</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                                {item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirm Accept Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">تأكيد قبول العرض</DialogTitle>
          </DialogHeader>
          {selectedQuote && (() => {
            const finalAcceptedAmount = acceptedCustomTotal != null ? acceptedCustomTotal : Number(selectedQuote.total_price);
            const isInsufficient = walletBalance !== null && walletBalance < finalAcceptedAmount;
            return (
              <div className="space-y-4">
                {/* Quote summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">المورد</span>
                    <strong>{getVendorName(selectedQuote)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">المبلغ الإجمالي المعتمد</span>
                    <strong className="text-emerald-700 font-mono font-black">{finalAcceptedAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</strong>
                  </div>
                  {selectedQuote.delivery_days != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">مدة التوصيل</span>
                      <strong>{selectedQuote.delivery_days} أيام</strong>
                    </div>
                  )}
                </div>

                {/* Balance section */}
                <div className={`rounded-xl p-4 border ${
                  balanceLoading
                    ? "bg-gray-50 border-gray-200"
                    : isInsufficient
                      ? "bg-red-50 border-red-200"
                      : "bg-emerald-50 border-emerald-200"
                }`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">رصيد محفظتك الحالي</span>
                    {balanceLoading ? (
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        جاري التحقق...
                      </span>
                    ) : (
                      <strong className={isInsufficient ? "text-red-600 font-mono" : "text-emerald-700 font-mono"}>
                        {walletBalance !== null ? walletBalance.toLocaleString("ar-SA", { minimumFractionDigits: 2 }) : "0.00"} ر.س
                      </strong>
                    )}
                  </div>

                  {!balanceLoading && isInsufficient && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-red-600 text-xs font-bold">!</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-red-700">رصيد غير كافٍ</p>
                          <p className="text-xs text-red-600 mt-0.5">
                            تحتاج إلى{" "}
                            <strong>{(finalAcceptedAmount - (walletBalance || 0)).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</strong>
                            {" "}إضافية لإتمام هذه العملية.
                          </p>
                          <a
                            href="/client/wallet"
                            className="inline-block mt-1.5 text-xs text-red-700 underline underline-offset-2 font-medium"
                          >
                            اذهب إلى المحفظة لشحن الرصيد
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {!balanceLoading && !isInsufficient && walletBalance !== null && (
                    <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center justify-between text-xs text-emerald-700">
                      <span>الرصيد بعد القبول</span>
                      <strong className="font-mono">{(walletBalance - finalAcceptedAmount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</strong>
                    </div>
                  )}
                </div>

                <p className="text-gray-400 text-xs">
                  سيتم إنشاء صفقة جديدة وإخطار المورد فور التأكيد.
                </p>
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isAccepting}>
              إلغاء
            </Button>
            <Button
              onClick={confirmAccept}
              disabled={
                isAccepting ||
                balanceLoading ||
                (walletBalance !== null && selectedQuote !== null && walletBalance < (acceptedCustomTotal != null ? acceptedCustomTotal : Number(selectedQuote.total_price)))
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد القبول"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivation Success Celebration Modal */}
      <ReactivateSuccessModal
        isOpen={Boolean(reactivatedModalData)}
        displayId={reactivatedModalData?.displayId || ""}
        durationMinutes={reactivatedModalData?.durationMinutes || 20}
        carName={reactivatedModalData?.carName}
        onClose={() => setReactivatedModalData(null)}
        onViewActive={() => {
          setReactivatedModalData(null);
          router.push("/client/orders?tab=active");
        }}
      />
    </div>
  );
}
