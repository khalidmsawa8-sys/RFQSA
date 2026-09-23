"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, Loader2, KeyRound } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@rfq-marketplace.com");
  const [password, setPassword] = useState("P@ssword123");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (document.cookie.includes("rfq_session=admin")) {
      router.push("/admin");
    }
  }, [router]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      if (email.includes("admin") || email === "admin@rfq-marketplace.com") {
        document.cookie = "rfq_session=admin; path=/; max-age=86400";
        window.location.href = "/admin";
      } else {
        setError("اسم المستخدم أو مفتاح المرور غير صحيح.");
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 p-4 flex items-center justify-center" dir="rtl">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-slate-800/60">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-white shadow-inner">
            <Shield className="h-8 w-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            بوابة تسجيل دخول الإدارة
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            منطقة مخصصة للمدير العام والمشرفين المعتمدين فقط
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleAdminLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-950/80 border border-red-800/50 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-xs text-slate-300">البريد الإلكتروني الإداري</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@rfq-marketplace.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="bg-slate-950 border-slate-800 text-slate-100 focus:ring-blue-500 focus:border-blue-500 text-sm h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password" className="text-xs text-slate-300">مفتاح المرور المصرح</Label>
              </div>
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
                className="bg-slate-950 border-slate-800 text-slate-100 focus:ring-blue-500 focus:border-blue-500 text-sm h-11"
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 rounded-xl shadow-lg transition-colors" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري المصادقة الأمنية...
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  دخول لوحة الإدارة
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
