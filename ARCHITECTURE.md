# 👑 الدستور المعماري المؤسسي الأعلى (The 100 Master Enterprise Pillars Constitution)

تُحدد هذه الوثيقة البنية المعمارية الشاملة والنهائية لمنصة المشتريات والمناقصات B2B (RFQ Marketplace System). تُعد هذه الوثيقة **الدستور المعماري الأعلى والنهائي للمشروع (Supreme Master Architecture Constitution)**، وتم التخطيط لها وفق أعلى معايير الـ Enterprise المعاصرة المعتمدة على **Hexagonal Architecture (Ports & Adapters)** المطعمة بـ **Architecture Fitness Functions** و **Platform Abstraction Layer** و **AI Readiness Layer**.

---

## 🏛️ 1. مصفوفة مالكية البيانات (Data Ownership Matrix)

يُمنع أي Domain من التعديل المباشر على جداول أو كيانات Domain آخر. التواصل يتم فقط عبر الـ APIs الرسمية أو نواتج الأحداث (Integration Events).

| Domain | الكيانات والجداول الملوكة حكراً | الواجهة المسموحة للتفاعل |
| :--- | :--- | :--- |
| **Identity** | `users`, `profiles`, `user_roles`, `permissions`, `sessions` | `IdentityServicePort` / `UserRegisteredEvent` |
| **RFQ** | `rfqs`, `rfq_items`, `vehicle_catalogs`, `rfq_attachments` | `RFQServicePort` / `RFQCreatedEvent` |
| **Quotation** | `quotations`, `quotation_items`, `supplier_bids` | `QuotationServicePort` / `QuoteSubmittedEvent` |
| **Order** | `orders`, `order_state_history`, `disputes` | `OrderServicePort` / `OrderCreatedEvent` |
| **Wallet** | `wallets`, `ledger_entries`, `escrow_locks` | `WalletServicePort` / `EscrowLockedEvent` |
| **Payment** | `payment_transactions`, `gateway_logs` | `PaymentServicePort` / `PaymentCompletedEvent` |
| **Shipment** | `shipments`, `courier_locations`, `delivery_proofs` | `ShipmentServicePort` / `DeliveryCompletedEvent` |
| **Invoice** | `invoices`, `zatca_logs`, `tax_records` | `InvoiceServicePort` / `InvoiceIssuedEvent` |
| **Notification** | `notification_templates`, `notification_logs` | `NotificationServicePort` |
| **Admin** | `system_configs`, `feature_flags`, `audit_logs` | `AdminServicePort` |
| **Shared** | `shared_enums`, `common_dtos`, `value_objects` | Shared Kernel |

---

## 🛠️ 2. طبقة تجريد المنصة وجاهزية الذكاء الاصطناعي (Platform Abstraction & AI Layer)

* **Platform Abstraction Layer:** عزل كافة المزودين الخارجيين خلف Ports تجريدية:
  * `PaymentGatewayPort`: (HyperPayAdapter, MockPaymentAdapter).
  * `SMSProviderPort`: (UnifonicAdapter, TwilioAdapter).
  * `ObjectStoragePort`: (S3Adapter, MinIOAdapter, R2Adapter).
  * `MapServicePort`: (GoogleMapsAdapter, MapboxAdapter).
* **AI Readiness Layer (`AIPort`):** طبقة مستقلة مجهزة لربط خدمات الذكاء الاصطناعي مستقبلاً (اقتراح الموردين، اكتشاف الأسعار الشاذة، وتحليل الكتالوجات) دون الحاجة لتغيير كود الـ Domain.

---

## 📄 3. فهرس القرارات المعمارية المعتمدة (ADR Index)

تم توثيق القرارات المعمارية في مجلد `docs/adr/`:
* **ADR 0001:** اعتماد معمارية الأشكال السداسية والتصميم الموجه بالدومين (Hexagonal Architecture & DDD).
* **ADR 0002:** تفعيل أنماط المرونة (Circuit Breaker) والتتبع الموحد عبر Correlation ID.
* **ADR 0003:** تفعيل الفواحص المعمارية الآلية (Architecture Fitness Functions) وتتبع OpenTelemetry.
* **ADR 0004:** اعتماد الـ 100 ركيزة معمارية كدستور رسمي أعلى للمشروع (Supreme Constitution).
