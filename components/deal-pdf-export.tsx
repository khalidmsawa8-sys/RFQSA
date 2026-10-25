"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface DealPDFExportProps {
  order: any;
  items: any[];
  rfq: any;
  vendor: any;
}

export function DealPDFExport({ order, items, rfq, vendor }: DealPDFExportProps) {
  const generatePDF = () => {
    const vendorName = vendor?.company_name || vendor?.full_name || "المورد";
    const carInfo = `${rfq?.car_make} ${rfq?.car_model} ${rfq?.car_year}`;
    const currentDate = new Date().toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>عرض السعر - ${order.id.slice(0, 8)}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Arial', sans-serif;
            padding: 40px;
            background: white;
            color: #1a1a1a;
            direction: rtl;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          .header h1 {
            font-size: 32px;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .info-item {
            margin-bottom: 10px;
          }
          .info-label {
            font-weight: bold;
            color: #666;
            font-size: 14px;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 16px;
            color: #1a1a1a;
          }
          .table-container {
            margin: 30px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #2563eb;
            color: white;
            padding: 12px;
            text-align: right;
            font-weight: bold;
            font-size: 14px;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            text-align: right;
            font-size: 14px;
          }
          tr:hover {
            background: #f8f9fa;
          }
          .total-section {
            margin-top: 30px;
            padding: 20px;
            background: #f0f9ff;
            border-radius: 8px;
            border: 2px solid #2563eb;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .total-label {
            font-size: 18px;
            font-weight: bold;
            color: #666;
          }
          .total-value {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
          }
          .warranty-section {
            margin-top: 30px;
            padding: 20px;
            background: #fff7ed;
            border-radius: 8px;
            border-right: 4px solid #f59e0b;
          }
          .warranty-title {
            font-size: 18px;
            font-weight: bold;
            color: #f59e0b;
            margin-bottom: 10px;
          }
          .warranty-content {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://rfqsa.tech/logo.png" alt="منصة رفق" style="height: 48px; width: auto; margin-bottom: 12px; object-fit: contain;" />
          <h1>عرض السعر</h1>
          <p>رقم الطلب: ${order.id.slice(0, 8)}</p>
          <p>${currentDate}</p>
        </div>

        <div class="info-section">
          <div>
            <div class="info-item">
              <div class="info-label">المورد</div>
              <div class="info-value">${vendorName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">معلومات السيارة</div>
              <div class="info-value">${carInfo}</div>
            </div>
          </div>
          <div>
            <div class="info-item">
              <div class="info-label">حالة الطلب</div>
              <div class="info-value">${order.status === "confirmed" ? "مؤكد" : order.status === "in_progress" ? "قيد التنفيذ" : order.status === "shipped" ? "تم الشحن" : order.status === "delivered" ? "تم التسليم" : "قيد الانتظار"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">مدة التوصيل المتوقعة</div>
              <div class="info-value">${order.expected_delivery_days || "-"} ${order.expected_delivery_days ? "يوم" : ""}</div>
            </div>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>اسم القطعة</th>
                <th>رقم القطعة</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${items && items.length > 0 ? items.map(item => `
                <tr>
                  <td>${item.part_name}${item.notes ? `<br><small style="color: #666;">${item.notes}</small>` : ""}</td>
                  <td>${item.part_number || "-"}</td>
                  <td>${item.quantity}</td>
                  <td>${Number(item.unit_price).toLocaleString()} ر.س</td>
                  <td>${Number(item.line_total || (item.unit_price * item.quantity)).toLocaleString()} ر.س</td>
                </tr>
              `).join("") : `
                <tr>
                  <td colspan="5" style="text-align: center; color: #666;">لا توجد قطع محددة</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <div class="total-section">
          <div class="total-row">
            <span class="total-label">الإجمالي الكلي</span>
            <span class="total-value">${order.total_price.toLocaleString()} ر.س</span>
          </div>
        </div>

        ${order.delivery_method ? `
          <div class="warranty-section" style="background: #f0f9ff; border-right: 4px solid #2563eb;">
            <div class="warranty-title" style="color: #2563eb;">معلومات التوصيل</div>
            <div class="warranty-content">
              <p><strong>طريقة التوصيل:</strong> ${order.delivery_method === "pickup" ? "استلام من المحل" : "شحن"}</p>
              ${order.delivery_method === "pickup" && order.pickup_location ? `<p><strong>موقع الاستلام:</strong> ${order.pickup_location}</p>` : ""}
              ${order.delivery_method === "shipping" && order.shipping_company ? `<p><strong>شركة الشحن:</strong> ${order.shipping_company}</p>` : ""}
              ${order.delivery_method === "shipping" && order.tracking_number ? `<p><strong>رقم التتبع:</strong> ${order.tracking_number}</p>` : ""}
              ${order.expected_delivery_days ? `<p><strong>مدة التوصيل المتوقعة:</strong> ${order.expected_delivery_days} يوم</p>` : ""}
            </div>
          </div>
        ` : ""}

        ${order.warranty_terms || order.return_policy ? `
          <div class="warranty-section">
            <div class="warranty-title">الضمان وسياسة الإرجاع</div>
            <div class="warranty-content">
              ${order.warranty_terms ? `<p><strong>شروط الضمان:</strong> ${order.warranty_terms}</p>` : ""}
              ${order.warranty_duration ? `<p><strong>مدة الضمان:</strong> ${order.warranty_duration}</p>` : ""}
              ${order.return_policy ? `<p><strong>سياسة الإرجاع:</strong> ${order.return_policy}</p>` : ""}
            </div>
          </div>
        ` : ""}

        <div class="footer">
          <p>تم إنشاء هذا العرض بواسطة منصة طلب قطع الغيار</p>
          <p>${currentDate}</p>
        </div>
      </body>
      </html>
    `;

    // Create a new window and print
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Button onClick={generatePDF} variant="outline" className="w-full">
      <FileDown className="h-4 w-4 ml-2" />
      تصدير عرض السعر PDF
    </Button>
  );
}
