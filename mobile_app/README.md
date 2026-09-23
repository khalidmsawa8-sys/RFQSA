# 📱 تطبيق «رِفق | RFQSA» الموحد عبر Flutter
### Single Codebase Multi-Role Mobile App (Android & iOS)

---

## 📖 نظرة عامة
تطبيق جوال أصيل واحد متعدد الأدوار مبني باستخدام **Flutter 3.x (Dart 3.x)** لخدمة:
1. **العميل (Buyer / Client):** لطلب قطع الغيار، تصوير الاستمارة، مقارنة العروض، وإدارة الكراج.
2. **المورد (Supplier / Vendor):** لاستقبال الطلبات على الرادار الحي مع تنبيهات صوتية فورية، وتقديم عروض الأسعار.
3. **المندوب (Courier / Driver):** لاستلام مهام التوصيل، الملاحة بخرائط Google Maps، وإثبات التسليم الرقمي POD برمز OTP.

يعتمد التطبيق على **توجيه ذكي للأدوار (Dynamic Role Routing)** عند تسجيل الدخول بحيث يتعرف على نوع الحساب تلقائياً، مع دعم التبديل السلس بين الحسابات.

---

## 🏗️ المعمارية البرمجية (Clean Architecture)

```text
mobile_app/
├── lib/
│   ├── main.dart                      # نقطة انطلاق التطبيق ومزودات BLoC
│   ├── core/
│   │   ├── config/env_config.dart     # إعدادات الـ Base URL والتوكنات
│   │   ├── api/                       # عميل Dio ومحول الأخطاء والمصادقة
│   │   ├── storage/                   # التخزين الآمن المشفر (SecureStorage)
│   │   ├── theme/                     # الألوان، الخطوط العربية، والثيم
│   │   ├── audio/                     # مشغل التنبيهات الصوتية الحية للرادار
│   │   ├── notifications/             # قنوات FCM والإشعارات الأصلية
│   │   ├── location/                  # خدمات GPS وحساب المسافات
│   │   ├── media/                     # تصوير وضغط الصور والملاحظات الصوتية
│   │   └── routing/app_router.dart    # موجه الأدوار والشاشات
│   └── features/
│       ├── auth/                      # الدخول، التحقق، وتبديل الأدوار
│       ├── client/                    # شاشات العميل (إنشاء طلب، كراج، صفقات)
│       ├── vendor/                    # شاشات المورد (الرادار، التسعير، التخصص)
│       ├── courier/                   # شاشات المندوب (المهام، الخرائط، POD)
│       └── shared/                    # المحفظة، الملف الشخصي، والدعم
└── test/                              # اختبارات الوحدة (Unit Tests)
```

---

## 🚀 التشغيل والتطوير المحلي

### 1. تثبيت الحزم والمكتبات:
```bash
cd mobile_app
flutter pub get
```

### 2. تشغيل الاختبارات:
```bash
flutter test
```

### 3. تشغيل التطبيق على محاكي أو جهاز حقيقي:
```bash
flutter run
```

---

## 📦 أوامر البناء والتجهيز للمتاجر (Production Builds)

### 🔹 1. إنتاج ملف APK تجريبي لاختبار العملاء (Android APK):
```bash
flutter build apk --release
```
الملف الناتج سيكون في المسار:
`build/app/outputs/flutter-apk/app-release.apk`

### 🔹 2. إنتاج حزمة النشر لمتجر جوجل بلاي (Android App Bundle - AAB):
```bash
flutter build appbundle --release
```
الملف الناتج سيكون في المسار:
`build/app/outputs/bundle/release/app-release.aab`

### 🔹 3. إنتاج حزمة الآيفون لمتجر آب ستور (iOS IPA / Archive):
```bash
flutter build ipa --release
```

---

## 🔗 الربط مع السيرفر والباك إند الحي

* **Base URL:** `https://rfqsa.tech/api`
* **V1 Base URL:** `https://rfqsa.tech/api/v1`
* **Device Registration:** `POST https://rfqsa.tech/api/v1/notifications/register-device`
* **Realtime Server:** Supabase WebSocket Client على `https://srv1868299.hstgr.cloud:8000`

---

## 🔑 الحسابات التجريبية المدمجة (Demo Accounts)

| الدور | البريد الإلكتروني | كلمة المرور |
| :--- | :--- | :--- |
| **عميل مشتريات** | `client@rfqsa.tech` | `client123` |
| **مورد معتمد** | `vendor@rfqsa.tech` | `vendor123` |
| **مندوب توصيل** | `courier@rfqsa.tech` | `courier123` |
