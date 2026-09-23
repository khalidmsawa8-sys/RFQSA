# 📘 دليل المطور والتشغيل والنشر (Developer & DevOps Guide)

مرحباً بك في دليل التشغيل والنشر الشامل لمنصة المشتريات والمناقصات B2B (RFQ Marketplace System). تم تصميم هذا الدليل لتسهيل إعداد بيئة التطوير، التشغيل المحلي، والنشر السحابي في بيئات الإنتاج.

---

## 🚀 1. التشغيل المحلي السريع (Quick Local Setup)

### الخيار الأسرع (عبر Docker Compose):
تشغيل جميع الخدمات (PostgreSQL, Redis, RabbitMQ, وخادم NestJS API) بأمر واحد:

```bash
# الانتقال لمجلد المشروع الرئيسي
cd C:\Users\Administrator\.gemini\antigravity-ide\scratch\RFQ

# تشغيل جميع الحاويات
docker-compose up -d --build
```
بعد التشغيل، يمكنك التوجه إلى:
* **خادم الـ API والـ Swagger:** `http://localhost:4000/docs/api`
* **لوحة إدارة RabbitMQ:** `http://localhost:15672` (المستخدم: `rfq_rabbit` / كلمة المرور: `rabbit_password_2026`)

---

### الخيار المباشر (Direct Node.js Execution):
```bash
# 1. الانتقال لمجلد الباك إند
cd C:\Users\Administrator\.gemini\antigravity-ide\scratch\RFQ\backend

# 2. تثبيت الحزم
npm install

# 3. تشغيل وضع التطوير
npm run start:dev

# 4. تشغيل الفواحص المعمارية التلقائية
npm run lint:arch
```

---

## 🛠️ 2. المتغيرات البيئية (Environment Variables)

قم بإنشاء ملف `.env` داخل المجلد `backend/` بالتنسيق التالي:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=super-secret-enterprise-rfq-key-2026
ALLOWED_ORIGINS=http://localhost:3000,https://rfq-marketplace.com

# Database
DATABASE_URL=postgresql://rfq_user:rfq_password_2026@localhost:5432/rfq_marketplace_db

# Cache & Queues
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_URL=amqp://rfq_rabbit:rabbit_password_2026@localhost:5672

# Storage
OBJECT_STORAGE_ENDPOINT=http://localhost:9000
OBJECT_STORAGE_BUCKET=rfq-assets
```

---

## 📚 3. روابط أدلة التوثيق والدستور المعماري

* 📄 **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md):** الدستور المعماري الرسمي المكتمل بـ 100 ركيزة مؤسسية.
* 🏛️ **[ARCHITECTURE.md](./ARCHITECTURE.md):** المعمارية البرمجية بـ Hexagonal Architecture.
* 📊 **[docs/DATA_OWNERSHIP_MATRIX.md](./docs/DATA_OWNERSHIP_MATRIX.md):** مصفوفة مالكية البيانات الرسمية.
* 📄 **[docs/adr/](./docs/adr/):** سجلات القرارات المعمارية المعتمدة (ADRs 0001 - 0004).
* 📝 **[docs/TECH_DEBT.md](./docs/TECH_DEBT.md):** سجل الديون التقنية الرسمي.

---

## ☁️ 4. النشر السحابي (Cloud Production Deployment)

1. **إعداد الحاويات:** تم إعداد [Dockerfile](./backend/Dockerfile) متعدد المراحل (Multi-stage build) لتقليل حجم الصورة النهائية وأتمتة الأمان.
2. **أنبوب التجميع CI/CD:** يتم تنفيذ الفحوصات المعمارية (`npm run lint:arch`), الاختبارات (`npm run test`), وبناء حزم Docker تلقائياً قبل الرفع.
3. **الدعم الفني والضمان:** المنصة مدعومة بـ **ضمان ودعم فني مجاني مدى الحياة** للأخطاء والصلابة البرمجية.
