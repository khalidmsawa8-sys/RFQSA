"use client";

import React from "react";

export function HeroWhiteLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      {/* Pixel-Perfect Pure White Monochrome Logo matching Concept 1 */}
      <svg
        viewBox="0 0 550 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-lg md:max-w-2xl h-auto filter drop-shadow-lg"
      >
        {/* ======================= LEFT ICON: CONCEPT 1 INFINITY LOOP ======================= */}
        {/* Outer Infinity Arc 1 */}
        <path
          d="M 120 100 C 120 50, 55 50, 55 100 C 55 150, 120 150, 185 100 C 230 65, 255 65, 255 100 C 255 135, 230 135, 185 100"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Outer Infinity Arc 2 */}
        <path
          d="M 185 100 C 230 65, 260 65, 260 100 C 260 130, 240 135, 220 135"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="20"
          strokeLinecap="round"
        />

        {/* Bottom Left Node Circle */}
        <circle cx="75" cy="132" r="16" fill="#FFFFFF" />

        {/* Top Right Double Quotation Marks Accent */}
        <path
          d="M 248 55 C 248 43, 258 38, 266 38 M 267 55 C 267 43, 277 38, 285 38"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* ======================= RIGHT TYPOGRAPHY: رفق & RIFQ ======================= */}
        {/* Arabic Logotype: رفق */}
        <text
          x="330"
          y="108"
          fill="#FFFFFF"
          fontSize="82"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          letterSpacing="-1"
        >
          رفق
        </text>

        {/* English Logotype: RIFQ */}
        <text
          x="332"
          y="162"
          fill="#FFFFFF"
          fontSize="48"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          letterSpacing="3"
        >
          RIFQ
        </text>
      </svg>
    </div>
  );
}
