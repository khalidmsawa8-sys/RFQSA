"use client";

import React from "react";

interface RfqLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function RfqLogo({ size = "md", className = "" }: RfqLogoProps) {
  const logoDimensions = {
    sm: "h-8 md:h-10 w-auto",
    md: "h-14 md:h-16 w-auto",
    lg: "h-20 md:h-24 w-auto",
    xl: "h-28 md:h-32 w-auto",
  };

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      {/* 100% Exact, High-Definition Transparent Brand Logo image: رفق RIFQ */}
      <img
        src="/logo.png"
        alt="رفق RIFQ"
        className={`${logoDimensions[size]} object-contain transition-transform duration-300 hover:scale-105`}
      />
    </div>
  );
}
