import Link from "next/link";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, Store, ArrowLeft, ShieldCheck, Zap, Receipt, Wallet, 
  Clock, Building2, Car, Wrench, HelpCircle, Film, CheckCircle2, Play
} from "lucide-react";

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#10B981] selection:text-white">
      
      {/* 1. Clean, Ultra-Responsive Hero Section */}
      <section className="relative w-full overflow-hidden bg-gradient-to-r from-[#073966] via-[#0A627E] to-[#10B981] pt-3 pb-16 sm:pb-24 md:pb-28 flex flex-col items-center justify-between shadow-xl">
        
        {/* Floating Capsule Navbar Header */}
        <Header />

        {/* Hero Main Content */}
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center pt-24 sm:pt-32 md:pt-36 px-4 sm:px-6">
          
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 sm:px-4 py-1.5 rounded-full text-white text-xs sm:text-sm font-semibold mb-5 sm:mb-6 shadow-inner max-w-[95%]">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span className="truncate">منصة المشتريات الرقمية الأولى لقطع غيار السيارات B2B</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 tracking-tight leading-snug drop-shadow-md">
            سوق المشتريات وعروض الأسعار B2B
          </h1>

          {/* Subheading Description */}
          <p className="text-base sm:text-lg md:text-xl text-white/95 mb-8 sm:mb-10 max-w-2xl leading-relaxed font-medium drop-shadow px-2">
            منصة <strong className="text-white font-bold">رِفْق (Rifq)</strong> تتيح لك طلب وتلقي أفضل عروض الأسعار لقطع غيار السيارات والمشتريات المؤسسية مباشرة من كبار الموردين والموزعين المعتمدين.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 justify-center items-center w-full sm:w-auto px-2 sm:px-0">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto bg-[#10B981] hover:bg-[#059669] text-white font-bold text-base sm:text-lg px-8 py-3.5 sm:py-4 rounded-full shadow-xl shadow-emerald-900/30 hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 group"
            >
              <span>ابدأ الآن وأنشئ حسابك</span>
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            </Link>
            
            <Link
              href="/auth/login"
              className="w-full sm:w-auto bg-white hover:bg-slate-100 text-[#073966] font-bold text-base sm:text-lg px-8 py-3.5 sm:py-4 rounded-full shadow-lg transition-colors flex items-center justify-center"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Responsive Platform Statistics & Metrics Grid */}
      <section className="-mt-8 sm:-mt-10 relative z-20 container max-w-5xl mx-auto px-3 sm:px-4">
        <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-xl border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
          <div className="p-2 border-l sm:border-l-0 sm:border-r border-slate-100">
            <div className="text-xl sm:text-3xl md:text-4xl font-black text-[#073966] mb-1">+10,000</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500">طلب عرض سعر منجز</div>
          </div>

          <div className="p-2 md:border-r border-slate-100">
            <div className="text-xl sm:text-3xl md:text-4xl font-black text-[#10B981] mb-1">+500</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500">مورد وموزع معتمد</div>
          </div>

          <div className="p-2 border-l sm:border-l-0 sm:border-r border-slate-100">
            <div className="text-xl sm:text-3xl md:text-4xl font-black text-[#073966] mb-1">15 دقيقة</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500">متوسط رد الموردين</div>
          </div>

          <div className="p-2">
            <div className="text-xl sm:text-3xl md:text-4xl font-black text-[#10B981] mb-1">25%</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500">متوسط توفير التكاليف</div>
          </div>
        </div>
      </section>

      {/* 3. Main Content Container */}
      <main className="container max-w-6xl mx-auto px-4 py-12 sm:py-20">

        {/* 5. Core Platform Features & Video Showcase (50% Cards - 50% Video) */}
        <section id="solutions" className="py-12 sm:py-20 border-t border-slate-200/80">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* RIGHT SIDE (50% width): Section Header + 2x2 Feature Cards Grid */}
            <div className="flex flex-col justify-between space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-[#10B981] border border-emerald-200 text-xs font-bold mb-3 shadow-2xs">
                  <Zap className="w-3.5 h-3.5" />
                  <span>مميزات القيمة المضافة</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
                  لماذا يفضل الموردون والمشترون رِفْق؟
                </h2>
                <p className="text-slate-600 text-xs sm:text-base font-medium">
                  بنية تحتية رقمية مصممة لأعلى درجات الأمان والكفاءة والسرعة لخدمة قطاع المشتريات
                </p>
              </div>

              {/* 2x2 Feature Cards Grid (takes 50% of parent container) */}
              <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                {/* Card 1 */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-2">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-emerald-50 text-[#10B981] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-base font-bold text-slate-900 mb-1">موردون موثقون ومعتمدون</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">جميع الموردين مسجلون بسجلات تجارية سارية ومفعلة.</p>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-2">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-sky-50 text-[#073966] flex items-center justify-center">
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-base font-bold text-slate-900 mb-1">فوترة ZATCA المرحلة 2</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">فواتير إلكترونية ضريبية متوافقة مع هيئة الزكاة والجمارك.</p>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-2">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-base font-bold text-slate-900 mb-1">محفظة وحساب آمن</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">حفظ الحقوق المالية وطرق سداد إلكترونية مرنة للشركات.</p>
                  </div>
                </div>

                {/* Card 4 */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-2">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-base font-bold text-slate-900 mb-1">سرعة التوصيل اللوجستي</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">ربط الطلبات بالمورد الأقرب جغرافياً لتسريع استلام القطع.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* LEFT SIDE (50% width): Video Showcase Container */}
            <div className="relative bg-gradient-to-br from-[#073966] via-[#0B1528] to-[#0D253A] rounded-3xl p-3.5 sm:p-5 shadow-xl border border-slate-700/60 flex flex-col justify-between overflow-hidden group">
              
              {/* Subtle Ambient Background Light */}
              <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Video Player Box (Autoplay, Muted, Loop, No Controls) */}
              <div className="relative z-10 w-full h-full min-h-[240px] rounded-2xl overflow-hidden bg-black/90 border border-white/10 shadow-2xl my-auto flex items-center justify-center">
                <video
                  src="/RIFQ_commercial.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover rounded-2xl shadow-inner pointer-events-none"
                >
                  متصفحك لا يدعم تشغيل الفيديو المباشر.
                </video>
              </div>

              {/* Video Footer Highlights */}
              <div className="relative z-10 mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-300">
                <div className="flex items-center justify-center gap-1 bg-white/5 py-1.5 px-2 rounded-lg border border-white/10 truncate">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>طلب بأقل من دقيقة</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-white/5 py-1.5 px-2 rounded-lg border border-white/10 truncate">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>موردين معتمدين</span>
                </div>
                <div className="flex items-center justify-center gap-1 bg-white/5 py-1.5 px-2 rounded-lg border border-white/10 truncate">
                  <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>سداد آمن 100%</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 6. FAQ & Final CTA Side-By-Side Grid on Desktop (بجوار بعضهما في شاشة الكمبيوتر) */}
        <section className="py-12 sm:py-20 border-t border-slate-200/80">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* FAQ Section (قسم الأسئلة الشائعة) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md flex flex-col justify-between">
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">الأسئلة الشائعة</h2>
                  <p className="text-slate-600 text-xs sm:text-sm">كل ما تحتاج معرفته عن منصة رِفْق وكيفية الاستفادة من الخدمات</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/60">
                    <h3 className="font-bold text-xs sm:text-base text-slate-900 mb-1.5 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span>هل التسجيل وإنشاء طلبات التسعير مجاني للعملاء؟</span>
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed pr-6">نعم، يمكن للعملاء وأصحاب الأساطيل إنشاء طلبات عروض الأسعار (RFQ) وتلقي عروض الموردين مجاناً بالكامل دون أي رسوم إضافية.</p>
                  </div>

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/60">
                    <h3 className="font-bold text-xs sm:text-base text-slate-900 mb-1.5 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span>كيف يمكنني الانضمام والتسجيل كمورد معتمد؟</span>
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed pr-6">يمكنك الضغط على زر "حساب جديد" واختيار حساب "مورد"، ثم إدخال بيانات السجل التجاري لبدء استقبال الطلبات فوراً.</p>
                  </div>

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/60">
                    <h3 className="font-bold text-xs sm:text-base text-slate-900 mb-1.5 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span>هل الفواتير الصادرة متوافقة مع هيئة الزكاة ZATCA؟</span>
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed pr-6">بالتأكيد، تدعم منصة رِفْق التوافق الكامل مع الفوترة الإلكترونية المرحلة الثانية وتصدر فواتير ضريبية معتمدة برمز QR.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Final CTA Banner (بانر التسجيل النهائي) */}
            <div className="rounded-3xl bg-gradient-to-r from-[#073966] via-[#0A627E] to-[#10B981] p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl flex flex-col justify-between">
              <div className="my-auto">
                <h2 className="text-2xl sm:text-4xl font-black mb-4 sm:mb-6 tracking-tight leading-snug">جاهز لتسريع مشترياتك وتوفير التكاليف؟</h2>
                <p className="text-xs sm:text-base md:text-lg text-white/90 mb-6 sm:mb-8 leading-relaxed font-medium">
                  انضم الآن لأكبر شبكة رقمية لطلب وتوريد قطع غيار السيارات والمشتريات المؤسسية في المملكة.
                </p>
                <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
                  <Link
                    href="/auth/signup"
                    className="w-full sm:w-auto bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 group"
                  >
                    <span>إنشاء حساب مجاني الآن</span>
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 sm:py-10 text-center text-xs sm:text-sm text-slate-500">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 منصة رِفْق (Rifq B2B SaaS) - جميع الحقوق محفوظة</p>
          <div className="flex items-center gap-4 sm:gap-6 text-slate-600 font-semibold text-xs sm:text-sm">
            <Link href="/#products" className="hover:text-[#073966]">المنتجات</Link>
            <Link href="/#services" className="hover:text-[#073966]">الخدمات</Link>
            <Link href="/#solutions" className="hover:text-[#073966]">الحلول</Link>
            <Link href="/auth/login" className="hover:text-[#073966]">تسجيل الدخول</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
