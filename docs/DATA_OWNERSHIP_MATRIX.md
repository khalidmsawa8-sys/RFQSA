# 📊 مصفوفة مالكية البيانات الرسمية (Data Ownership Matrix)

يُمنع منعاً باتاً أي Domain من إجراء تعديل أو استعلام مباشر على جداول Domain آخر. جميع التفاعلات تتم عبر الـ Ports والتنفيذات الرسمية أو عبر نواتج الأحداث (Integration Events).

---

## 🏛️ توزيع المالكية حسب الـ Domains الـ 11

| الدومين (Domain) | الكيانات والجداول الملوكة حكراً | واجهة التفاعل المسموحة (Port Interface) | الأحداث الصادرة (Integration Events) |
| :--- | :--- | :--- | :--- |
| **Identity** | `users`, `profiles`, `user_roles`, `permissions`, `sessions` | `IdentityServicePort` | `UserRegisteredEvent`, `UserVerifiedEvent` |
| **RFQ** | `rfqs`, `rfq_items`, `vehicle_catalogs`, `rfq_attachments` | `RFQServicePort` | `RFQCreatedEvent`, `RFQCancelledEvent` |
| **Quotation** | `quotations`, `quotation_items`, `supplier_bids` | `QuotationServicePort` | `QuoteSubmittedEvent`, `QuoteAcceptedEvent` |
| **Order** | `orders`, `order_state_history`, `disputes` | `OrderServicePort` | `OrderCreatedEvent`, `OrderCompletedEvent` |
| **Wallet** | `wallets`, `ledger_entries`, `escrow_locks` | `WalletServicePort` | `EscrowLockedEvent`, `EscrowReleasedEvent` |
| **Payment** | `payment_transactions`, `gateway_logs` | `PaymentServicePort` | `PaymentCompletedEvent`, `PaymentFailedEvent` |
| **Shipment** | `shipments`, `courier_locations`, `delivery_proofs` | `ShipmentServicePort` | `ShipmentAssignedEvent`, `DeliveryCompletedEvent` |
| **Invoice** | `invoices`, `zatca_logs`, `tax_records` | `InvoiceServicePort` | `InvoiceIssuedEvent` |
| **Notification** | `notification_templates`, `notification_logs` | `NotificationServicePort` | `NotificationSentEvent` |
| **Admin** | `system_configs`, `feature_flags`, `audit_logs` | `AdminServicePort` | `ConfigUpdatedEvent` |
| **Shared** | `shared_enums`, `common_dtos`, `value_objects` | Shared Kernel | N/A |
