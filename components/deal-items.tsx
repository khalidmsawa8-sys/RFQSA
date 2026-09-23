"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, CheckCircle, Clock, XCircle } from "lucide-react";

interface DealItem {
  id: string;
  part_name: string;
  part_number?: string;
  part_type?: string;
  commercial_brand?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  notes?: string;
}

interface DealItemsProps {
  items: DealItem[];
  totalAmount: number;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-600" />,
  confirmed: <CheckCircle className="h-4 w-4 text-blue-600" />,
  ready: <CheckCircle className="h-4 w-4 text-green-600" />,
  shipped: <Package className="h-4 w-4 text-purple-600" />,
  delivered: <CheckCircle className="h-4 w-4 text-green-700" />,
  unavailable: <XCircle className="h-4 w-4 text-red-600" />,
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "تم التأكيد",
  ready: "جاهز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  unavailable: "غير متوفر",
};

export function DealItems({ items, totalAmount }: DealItemsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          تفاصيل القطع
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">اسم القطعة</TableHead>
              <TableHead className="text-center">رقم القطعة</TableHead>
              <TableHead className="text-center">الكمية</TableHead>
              <TableHead className="text-center">سعر الوحدة</TableHead>
              <TableHead className="text-center">الإجمالي</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{item.part_name}</span>
                      {item.part_type === "commercial" ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          تجاري{item.commercial_brand ? ` (${item.commercial_brand})` : ""}
                        </Badge>
                      ) : item.part_type === "original" ? (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          أصلي
                        </Badge>
                      ) : null}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {item.part_number ? (
                    <Badge variant="outline">{item.part_number}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-center">
                  {item.unit_price.toLocaleString()} ر.س
                </TableCell>
                <TableCell className="text-center font-medium">
                  {item.total_price.toLocaleString()} ر.س
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {statusIcons[item.status]}
                    <span className="text-sm">
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <span className="text-lg font-semibold">الإجمالي الكلي</span>
          <span className="text-2xl font-bold text-primary">
            {totalAmount.toLocaleString()} ر.س
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
