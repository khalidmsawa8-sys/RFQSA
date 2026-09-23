"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Menu, X } from "lucide-react";
import { RfqLogo } from "@/components/rfq-logo";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";

const supabase = createClient();

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Smooth scroll handler for hash anchor links
  const handleSmoothScroll = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) return; // No hash, let normal navigation happen

    const targetId = href.substring(hashIndex + 1);
    const targetPath = href.substring(0, hashIndex) || "/";

    // If we're already on the target page, scroll smoothly
    if (pathname === targetPath || (targetPath === "/" && pathname === "/")) {
      e.preventDefault();
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setMobileMenuOpen(false);
    }
    // Otherwise, let Next.js navigate to the page (CSS smooth scroll will handle it)
  }, [pathname]);

  useEffect(() => {
    async function load() {
      try {
        if (pathname.startsWith("/auth")) {
          setIsLoggedIn(false);
          setUserName("");
          setUserRole("");
          return;
        }

        const isDashboardRoute = 
          pathname.startsWith("/client") || 
          pathname.startsWith("/vendor") || 
          pathname.startsWith("/admin");

        const getCookie = (name: string) => {
          if (typeof document === 'undefined') return null;
          const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
          return m ? decodeURIComponent(m[1]) : null;
        };

        const cookieUserName = getCookie("rfq_user_name");
        const cookieRole = getCookie("rfq_session");

        if (isDashboardRoute) {
          setIsLoggedIn(true);
          const defaultRole = pathname.startsWith("/client") ? "client" : pathname.startsWith("/vendor") ? "vendor" : "admin";
          const defaultName = defaultRole === "admin" ? "المدير العام للمنصة" : defaultRole === "vendor" ? "مؤسسة قطع الغيار المعتمدة" : "شركة المشتريات الوطنية";
          setUserName(cookieUserName || defaultName);
          setUserRole(cookieRole || defaultRole);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsLoggedIn(true);
          const metadata = session.user.user_metadata || {};
          const name = metadata.company_name || metadata.full_name || session.user.email || "حسابي";
          const role = metadata.role || (session.user.email?.includes("vendor") ? "vendor" : session.user.email?.includes("admin") ? "admin" : "client");
          setUserName(name);
          setUserRole(role);
        } else {
          setIsLoggedIn(false);
          setUserName("");
          setUserRole("");
        }
      } catch (error) {
        setIsLoggedIn(false);
        setUserName("");
        setUserRole("");
      }
    }
    load();
  }, [pathname]);

  const dashboardHref = userRole === "admin" ? "/admin" : userRole === "vendor" ? "/vendor" : "/client";

  return (
    <div className="w-full absolute top-4 sm:top-6 left-0 right-0 z-50 px-3 sm:px-4">
      {/* Floating White Capsule Pill Navbar */}
      <header className="max-w-5xl mx-auto bg-white/98 backdrop-blur-md rounded-full shadow-2xl px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between border border-slate-100/60">
        
        {/* Brand Logo */}
        <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 group shrink-0">
          <RfqLogo size="sm" />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
          <Link
            href="/"
            className={`relative py-1 transition-colors hover:text-[#0F4C81] ${
              pathname === "/" ? "text-[#0F4C81] font-bold after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:bg-[#10B981] after:rounded-full" : ""
            }`}
          >
            الرئيسية
          </Link>
          <Link href="/#products" onClick={(e) => handleSmoothScroll(e, "/#products")} className="py-1 transition-colors hover:text-[#0F4C81]">
            المنتجات
          </Link>
          <Link href="/#services" onClick={(e) => handleSmoothScroll(e, "/#services")} className="py-1 transition-colors hover:text-[#0F4C81]">
            الخدمات
          </Link>
          <Link href="/#solutions" onClick={(e) => handleSmoothScroll(e, "/#solutions")} className="py-1 transition-colors hover:text-[#0F4C81]">
            الحلول
          </Link>
        </nav>

        {/* Desktop Auth Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="rounded-full font-bold text-[#0F4C81] hover:bg-slate-100">
                <Link href={dashboardHref} className="flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-[#10B981]" />
                  <span className="truncate max-w-[180px]">{userName}</span>
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutConfirm(true)}
                title="تسجيل الخروج"
                className="rounded-full text-rose-600 hover:bg-rose-50 p-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-sm font-bold text-slate-700 hover:text-[#0F4C81] transition-colors"
              >
                تسجيل الدخول
              </Link>
              
              <Link
                href="/auth/signup"
                className="text-sm font-bold bg-[#10B981] hover:bg-[#059669] text-white px-5 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
              >
                حساب جديد
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Header Actions (Signup + Hamburger Menu Button) */}
        <div className="flex md:hidden items-center gap-2">
          {!isLoggedIn && (
            <Link
              href="/auth/signup"
              className="text-xs font-bold bg-[#10B981] hover:bg-[#059669] text-white px-3.5 py-1.5 rounded-full shadow-sm"
            >
              حساب جديد
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full text-slate-700 hover:bg-slate-100 focus:outline-none transition-colors"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5 text-slate-900" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu (القائمة الجانبية للموبايل) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-5 border border-slate-100 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-4 text-center font-bold text-slate-800 pb-4 border-b border-slate-100">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-[#0F4C81] hover:bg-slate-50 rounded-xl"
            >
              الرئيسية
            </Link>
            <Link
              href="/#products"
              onClick={(e) => { handleSmoothScroll(e, "/#products"); setMobileMenuOpen(false); }}
              className="py-2 hover:bg-slate-50 rounded-xl"
            >
              المنتجات
            </Link>
            <Link
              href="/#services"
              onClick={(e) => { handleSmoothScroll(e, "/#services"); setMobileMenuOpen(false); }}
              className="py-2 hover:bg-slate-50 rounded-xl"
            >
              الخدمات
            </Link>
            <Link
              href="/#solutions"
              onClick={(e) => { handleSmoothScroll(e, "/#solutions"); setMobileMenuOpen(false); }}
              className="py-2 hover:bg-slate-50 rounded-xl"
            >
              الحلول
            </Link>
          </nav>

          <div className="pt-4 flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 bg-sky-50 text-[#0F4C81] font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  <UserIcon className="w-5 h-5 text-[#10B981]" />
                  <span>{userName} (لوحة التحكم)</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full text-center py-2.5 bg-rose-50 text-rose-600 font-bold rounded-2xl flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl shadow-md"
                >
                  أنشئ حسابك الآن
                </Link>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl"
                >
                  تسجيل الدخول
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Professional Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        userName={userName}
        userRole={userRole}
      />
    </div>
  );
}
