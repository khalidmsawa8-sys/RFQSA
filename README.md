# 🚗 منصة المشتريات B2B (RFQ Marketplace System)

مرحباً بك في مستودع مشروع منصة إدارة المشتريات والمناقصات B2B لقطع غيار السيارات، المربوطة مع هيئة الزكاة والضريبة والجمارك (ZATCA)، مع دعم المحافظ الإلكترونية والتتبع المباشر وتطبيقات الجوال.

---

## 📚 وثائق ومراجع المشروع المتاحة:

* 🧠 **[PROJECT_MEMORY.md](./PROJECT_MEMORY.md):** ذاكرة المشروع وسياق المحادثات والتوصيات التقنية.
* 📑 **[REQUIREMENTS.md](./REQUIREMENTS.md):** وثيقة متطلبات النظام التفصيلية (SRS) والأدوار الـ 4 ودورة الـ 19 خطوة.
* 🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md):** معمارية النظام، تصميم قاعدة البيانات PostgreSQL، والتدابير الأمنية.
* 🔄 **[WORKFLOW_STATE_MACHINE.md](./WORKFLOW_STATE_MACHINE.md):** آلة الحالات (State Machine) لدورة حياة الطلب من RFQ حتى ZATCA.
* 📅 **[MILESTONES_PLAN.md](./MILESTONES_PLAN.md):** تفاصيل تسليمات المرحلة الأولى (Beta) والمرحلة الثانية (Production).

---

## 🛠️ هيكلية المجلدات المستهدفة (Target Directory Structure):

```text
C:\Users\Administrator\.gemini\antigravity-ide\scratch\RFQ\
├── PROJECT_MEMORY.md         # ذاكرة وسياق القرارات
├── REQUIREMENTS.md           # متطلبات SRS
├── ARCHITECTURE.md           # الهندسة المعمارية والأمان
├── WORKFLOW_STATE_MACHINE.md # آلة الحالات والـ 19 مرحلة
├── MILESTONES_PLAN.md        # خطة المراحل والتسليمات
├── README.md                 # هذا الملف
│
├── frontend/                 # مشروع Next.js (الموقع ولوحة التحكم)
├── backend/                  # مشروع NestJS (الـ APIs والخلفية)
└── mobile/                   # مشروع Flutter (تطبيقات الجوال)
```

---

> **ملاحظة:** تم حفظ كافة الوثائق بنجاح في مجلد المشروع لضمان استرجاع المرجع في أي وقت عند غلق وإعادة فتح بيئة العمل.
