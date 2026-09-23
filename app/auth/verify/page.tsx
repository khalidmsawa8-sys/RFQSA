import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Car } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">تحقق من بريدك الإلكتروني</CardTitle>
          <CardDescription>
            تم إرسال رابط التأكيد إلى بريدك الإلكتروني
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            يرجى فتح بريدك الإلكتروني والضغط على رابط التأكيد لتفعيل حسابك.
            قد يستغرق وصول الرسالة بضع دقائق.
          </p>
          <p className="text-sm text-muted-foreground">
            لم تستلم الرسالة؟ تحقق من مجلد البريد غير المرغوب فيه (Spam).
          </p>
          <Button asChild variant="outline" className="w-full bg-transparent">
            <Link href="/auth/login">العودة لتسجيل الدخول</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
