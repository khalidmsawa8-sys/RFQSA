"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ClientOrderRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  useEffect(() => {
    if (orderId) {
      router.replace(`/deal/${orderId}`);
    }
  }, [orderId, router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center" dir="rtl">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
      <p className="text-sm font-medium text-gray-500">جاري تحميل تفاصيل الطلب...</p>
    </div>
  );
}
