# 📄 ADR 0003: تفعيل الفواحص المعمارية الآلية وتتبع OpenTelemetry القياسي

* **التاريخ:** 25 يوليو 2026
* **الحالة:** مقبول (Accepted)
* **السياق والمشكلة:**
مع توسع الفريق والأنظمة، قد يقوم المطورون دون قصد باستيراد التابعيات بين الـ Domains أو ربط الـ Domain كود بـ NestJS أو ORM بشكل مباشر، مما يكسر معمارية الأشكال السداسية (Hexagonal Architecture). كما نحتاج إلى تتبع زمني موحد (Distributed Tracing) للطلبات عبر السيرفرات والـ Workers.

* **القرار المعماري:**
1. إدراج اختبارات معمارية تلقائية (**Architecture Fitness Functions**) عبر `dependency-cruiser` في خطوط الـ CI لضمان استقلالية الـ Domains.
2. تفعيل معيار **OpenTelemetry Context Propagation** لتمرير الـ Trace ID و Correlation ID عالمياً عبر الـ APIs، الطوابير، والـ Workers.

* **النتائج والآثار (Consequences):**
* حماية البنية الهندسية آلياً في كل Pull Request ومنع تجاوز حدود الـ Domains.
* رؤية وتتبع كامل لمسار أي معاملة أو حدث عبر السيرفرات والـ Workers.
