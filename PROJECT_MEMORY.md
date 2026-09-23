# 🧠 مشروع منصة المشتريات B2B (RFQ Marketplace) - ذاكرة المشروع المؤسسية الرسمية (Master Project Memory)

> **تاريخ التحديث:** 25 يوليو 2026  
> **حالة المشروع:** الدستور المعماري الأعلى المعتمد (The 100 Master Enterprise Pillars Constitution)  
> **مسار المشروع المحلي:** `C:\Users\Administrator\.gemini\antigravity-ide\scratch\RFQ`

---

## 👑 1. المبادئ المعمارية المعتمدة للمشروع (The 100 Master Enterprise Pillars)
تم إقرار وتحديث بنية النظام لتكون منصة **Enterprise Ready** مبنية بمفهوم **Hexagonal Architecture (Ports & Adapters)** وتلزم الـ 100 ركيزة التالية:

1. **Hexagonal Architecture (Ports & Adapters):** استقلالية 100% لطبقة الأعمال.
2. **Domain Invariants:** صياغة ومنع كسر القيود الأساسية للأعمال في كل Domain.
3. **Architecture Fitness Functions:** اختبارات معمارية تلقائية في CI لمنع كسر الحدود.
4. **Module Boundaries Enforcement:** حظر الاستيراد المباشر آلياً.
5. **Dependency Injection عبر Interfaces:** الاعتماد الحصري على العقود والـ Interfaces.
6. **Domain Ownership:** مالك ومسؤوليات محددة لكل Domain.
7. **Data Ownership Matrix:** مصفوفة مالك رسمي لكل جدول وكيان.
8. **Cross-Domain Communication Policy:** قواعد رسمية للتواصل بين الـ Domains.
9. **Platform Abstraction Layer:** طبقة تجريد لكافة الخدمات الخارجية.
10. **Architecture Review Process:** أي تعديل يؤثر على البنية يلزم ADR رسمي ومراجعة معمارية.
11. **Architectural Decision Validation:** مراجعة دورية آلياً لمطابقة الكود للـ ADRs.
12. **Database Per Bounded Context Readiness:** جاهزية فصل قواعد البيانات لكل Domain مستقبلاً.
13. **Transactional Boundaries:** حدود واضحة للـ Transactions وتجنب المعاملات الطويلة.
14. **CQRS Pattern:** فصل مسارات Commands عن Queries.
15. **Business Rules Layer (Specification Pattern):** عزل قواعد الأعمال في صفوف مستقلة.
16. **Multi-Tenant Readiness:** البنية جاهزة لدعم Multi-Tenancy مستقبلاً بـ `TenantId`.
17. **Configurable Workflow Engine:** محرك حالة ينظم انتقال الطلبات ديناميكياً.
18. **Plugin / Extension Framework:** دعم التوسعات والموديولات المستقلة.
19. **Domain Events vs Integration Events:** فصل الأحداث الداخلية عن الأحداث الخارجية مع Mappers.
20. **Domain Event Catalog:** كتالوج موحد يوثق كافة الأحداث، إصداراتها، ومستهلكيها.
21. **Event Versioning:** دعم الإصدارات (`v1`, `v2`) لكافة الأحداث.
22. **Outbox Pattern:** حفظ الأحداث في جدول Outbox بنفس المعاملة المالية.
23. **Saga Pattern & Compensation Actions:** إدارة دورة الطلب المركبة مع آليات التعويض.
24. **Schema Evolution (Expand → Migrate → Contract):** سياسة تحديث قاعدة البيانات دون توقف الخدمة.
25. **Resilience Patterns:** Circuit Breaker, Exponential Backoff, Bulkhead Isolation, و Timeout.
26. **Distributed Locking (Redlock via Redis):** قفل موزع يمنع التنفيذ المتزامن.
27. **Optimistic Locking:** عمود `@Version` لمنع ضياع البيانات عند التعديل المتزامن.
28. **Double-Entry Ledger Source of Truth:** القيد المزدوج هو المصدر الحقيقي الوحيد.
29. **Idempotency Keys Support:** دعم مفاتيح `x-idempotency-key` لمنع تكرار المعاملات.
30. **Stateless Scalability:** خوادم الـ API بدون حالة لتدعم التوسع الأفقي Auto-Scaling.
31. **Queue System (BullMQ + Redis):** معالجة خلفية غير متزامنة لجميع المهام الثقيلة.
32. **Isolated Background Workers Process:** تشغيل معالجة الطوابير ببروسيس منفصلة.
33. **Explicit Caching Strategy:** طبقة كاش محكمة بـ Redis مع TTL و Invalidation Hooks.
34. **Scheduled / Delayed Jobs:** اعتماد BullMQ Delayed Jobs لإدارة انتهاء فترة الضمان.
35. **Full-Text Search Engine:** محرك بحث وتصفية للقطع والسيارات بـ FTS / OpenSearch.
36. **Secure Development Lifecycle (SDL):** مراجعة أمنية للتصميم، فحص الكود، و PenTesting قبل الإطلاق.
37. **Security Threat Modeling:** نمذجة التهديدات الأمنية وتوثيق مخاطر كل Domain.
38. **Data Classification:** تصنيف البيانات إلى (Public, Internal, Confidential, Restricted).
39. **Secrets Rotation:** آلية دورية لتدوير مفاتيح API والشهادات دون إيقاف الخدمة.
40. **Key Management (KMS / Vault):** فصل إدارة مفاتيح التشفير والربط مع KMS.
41. **Privacy & Compliance (GDPR/PDPL):** دعم حذف البيانات، إخفاء البيانات، وسجل الموافقات.
42. **Compliance Audit Trail:** سجل تدقيق مخصص للتغييرات الإدارية وتقارير الامتثال.
43. **Data Retention & Archival Policy:** سياسات واضحة للاحتفاظ بالبيانات والأرشفة.
44. **Granular Permission Engine (RBAC + Permissions):** صلاحيات دقيقة لكل إجراء.
45. **Route-Specific API Rate Policies:** سياسات معدل طلبات مخصصة لكل مسار.
46. **Security Hardening Suite:** Helmet, CSP, CSRF, XSS, SQLi, File Validation, و AES-256 Encryption.
47. **API Governance:** معايير موحدة للتسمية، Pagination, Filtering, Sorting, و Error Codes.
48. **Distributed Tracing Standard (OpenTelemetry):** نقل Correlation ID و Trace ID عبر الخدمات والـ Workers.
49. **Observability Standards:** تسمية معيارية موحدة للـ Metrics, Logs, و Traces في Grafana.
50. **API SLA Definitions:** تحديد أهداف استجابة وتوفر وأخطاء مقبولة لكل API.
51. **Business Metrics:** قياس مؤشرات الأعمال (معدل قبول العروض، زمن الدورة، نجاح الدفع).
52. **Observability Dashboards (Grafana Presets):** لوحات جاهزة للـ API, Queues, Wallet, DB, و KPIs.
53. **Cost Observability:** مراقبة وتتبع استهلاك الموارد والتكاليف التشغيلية.
54. **Time Standardisation (UTC Only):** اعتماد توقيت UTC الموحد في قاعدة البيانات والسجلات.
55. **Correlation ID Tracing:** توليد `x-correlation-id` موحد وتتبعه عالمياً.
56. **Health Levels (Readiness, Liveness, Startup):** دعم فواحص Kubernetes الحيوية.
57. **Dynamic Configuration Service:** إعدادات النظام والضرائب في قاعدة البيانات مع كاش Redis.
58. **Configuration Versioning & Audit History:** إمكانية تدقيق وتراجع التعديلات على الإعدادات.
59. **Feature Lifecycle Management:** كل Feature Flag يحتوي مالكاً وتاريخاً وخطة إزالة.
60. **Dynamic Notification Templates:** رسائل البريد و SMS والـ Push تعتمد على قوالب ديناميكية.
61. **Centralized Error Codes Catalog:** دليل موحد لأكواد الأخطاء بنمط Response Envelope.
62. **Standardized API Response Envelope:** توحيد مخرجات الـ API بنمط مغلف موحد.
63. **API Deprecation Policy & Versioning:** سياسة رسمية لإيقاف نُسخ الـ API القديمة.
64. **S3-Compatible Object Storage:** تخزين الملفات والصور في MinIO / S3 / R2 بروابط Presigned URLs.
65. **Soft Delete & Immutable Audit Logging:** مسح آمن للكيانات وتجزئة جدول Audit Log.
66. **Infrastructure as Code (IaC):** إدارة البنية التحتية بالكامل بـ Terraform / OpenTofu.
67. **Environment Drift Detection:** كشف الفروقات التلقائي بين البنية الفعلية وكود IaC.
68. **Backup Verification:** اختبارات استعادة دورية تلقائية للتحقق من سلامة النسخ الاحتياطية.
69. **Business Continuity Plan (BCP):** خطة استمرارية الأعمال عند الأعطال الكبرى أو فقد المزودين.
70. **Disaster Recovery Strategy (DR):** خطة استعادة بعد الكوارث مع أهداف RPO و RTO محددة.
71. **Capacity Planning:** توثيق استراتيجية التوسع وحجم البيانات والـ Workers.
72. **AI Readiness Layer:** طبقة تجريد مستقلة لدمج خدمات الذكاء الاصطناعي مستقبلاً.
73. **Dependency Upgrade Policy:** سياسة دورية لمراجعة المكتبات وفحص الثغرات (Snyk/Trivy).
74. **Incident Management & RCA:** آلية التعامل مع الحوادث والتحقيق الجذري.
75. **Auto-Generated Swagger / OpenAPI:** توثيق تفاعلي ومحدث آلياً لجميع الـ APIs.
76. **Enterprise Documentation Portal:** مجلد `docs/` موحد يشمل المعمارية والأدلة.
77. **Domain Documentation:** توثيق تفصيلي لكل Domain من الـ 11 Domains.
78. **Architecture Decision Records (ADR):** توثيق القرارات المعمارية في المجلد `docs/adr/`.
79. **Operational Runbooks:** أدلة تشغيلية واضحة للتعامل مع الأعطال.
80. **Technical Debt Register:** سجل رسمي `docs/TECH_DEBT.md` لتوثيق ومتابعة الديون التقنية.
81. **Consumer-Driven Contract Testing:** اختبارات التوافق والعقود بين Frontend و Backend.
82. **Code Quality Standards & Git Hooks:** ESLint, Prettier, Husky, Commitlint, Conventional Commits.
83. **Database Migration & Seeding:** هجرة بيانات محكمة واختبارات البذور للبيئات.
84. **Comprehensive QA Testing Suite:** Unit, Integration, E2E, Contract, k6 Load, Security.
85. **Automated CI/CD Pipeline:** أنابيب تفحص الجودة، الأمان، الاختبارات، وبناء Docker مع Rollback.
86. **Multi-Environment Support:** عزل تام لبيئات (Local, Dev, Staging, Production).
87. **Production Readiness Checklist:** قائمة تحقق شاملة قبل إغلاق أي Sprint.
88. **Release Strategy (Blue/Green, Canary):** جاهزية النشر السلس التحديثات دون انقطاع الخدمة.
89. **Decoupled Delivery & Map Gateway:** عزل مزودي الخدمات الجغرافية خلف Port مخصص.
90. **ZATCA Integration Gateway:** عزل محرك الفاتورة الإلكترونية وتوقيعها في Adapter مستقل.
92. **Telemetry Metric Aggregation:** جمع المؤشرات التشغيلية لعرضها في Grafana.
93. **Audit Data Masking:** إخفاء البيانات الحساسة في السجلات.
94. **Unified Exception Translation:** ترجمة كافة الاستثناءات البرمجية لأكواد أخطاء معيارية موحدة.
95. **Architecture Rule Linter:** استخدام `dependency-cruiser` في CI لمنع الاستيراد الخاطئ.
96. **Performance Budgets & SLA Alerts:** إنذارات آلية عند تجاوز زمن الاستجابة المتفق عليه.
97. **Zero Lock Contention Strategy:** قفل صفوف الـ DB بأدنى حد زماني ممكن.
98. **Enterprise Compatibility Policy:** منع أي ميزة تتجاوز مبادئ SOLID & DDD دون ADR.
99. **Supreme Architecture Immunity:** حصانة البنية ومنع كسر المعمارية من أي طرف.
100. **Master Architecture Constitution:** اعتماد هذا المستند رسمياً كـ **دستور معماري أعلى للمشروع**.

---

## 📋 2. الوثائق المعمارية المحدثة في هذا المجلد
* **[`README.md`](./README.md):** نظرة عامة ودليل المجلدات.
* **[`REQUIREMENTS.md`](./REQUIREMENTS.md):** وثيقة المتطلبات SRS والـ 19 خطوة.
* **[`ARCHITECTURE.md`](./ARCHITECTURE.md):** الوثيقة المعمارية المؤسسية بـ Hexagonal Architecture.
* **[`WORKFLOW_STATE_MACHINE.md`](./WORKFLOW_STATE_MACHINE.md):** آلة الحالات لدورة حياة الطلب والمحفظة.
* **[`MILESTONES_PLAN.md`](./MILESTONES_PLAN.md):** خطة المراحل والتسليمات المحدثة.
* **[`docs/DATA_OWNERSHIP_MATRIX.md`](./docs/DATA_OWNERSHIP_MATRIX.md):** مصفوفة مالكية البيانات الرسمية.
* **[`docs/adr/0001-hexagonal-architecture-and-ddd.md`](./docs/adr/0001-hexagonal-architecture-and-ddd.md):** سجل ADR 0001.
* **[`docs/adr/0002-resilience-and-correlation-id.md`](./docs/adr/0002-resilience-and-correlation-id.md):** سجل ADR 0002.
* **[`docs/adr/0003-architecture-fitness-functions-and-tracing.md`](./docs/adr/0003-architecture-fitness-functions-and-tracing.md):** سجل ADR 0003.
* **[`docs/adr/0004-master-architecture-constitution-100-pillars.md`](./docs/adr/0004-master-architecture-constitution-100-pillars.md):** سجل ADR 0004.
* **[`docs/TECH_DEBT.md`](./docs/TECH_DEBT.md):** سجل الديون التقنية الرسمي.
