import React from "react";
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'منصة رفق RFQ - المشتريات وعروض الأسعار B2B',
  description: 'المنصة الرقمية الموحدة لطلب عروض أسعار قطع غيار السيارات والمشتريات المؤسسية',
  icons: {
    icon: [
      {
        url: '/logo.png',
        type: 'image/png',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
