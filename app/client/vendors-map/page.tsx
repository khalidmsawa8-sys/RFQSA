"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import with SSR disabled to ensure Leaflet canvas only initializes in client context
const VendorsMapClient = dynamic(
  () => import("@/components/vendors-map/vendors-map-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-52px)] bg-[#070D1E] text-slate-400 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-emerald-500" />
        <p className="text-xs font-bold text-slate-400">جاري تحميل خريطة الموردين والمواقع...</p>
      </div>
    ),
  }
);

export default function VendorsMapPage() {
  return <VendorsMapClient />;
}
