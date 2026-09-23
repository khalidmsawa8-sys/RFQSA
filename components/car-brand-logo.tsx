"use client";

import React, { useState } from "react";
import { Car } from "lucide-react";

interface CarBrandLogoProps {
  make?: string;
  model?: string;
  className?: string;
}

export function getBrandLogoPath(make = "", model = ""): string | null {
  const normalized = `${make} ${model}`.toLowerCase();

  if (
    normalized.includes("تويوتا") ||
    normalized.includes("toyota") ||
    normalized.includes("كامري") ||
    normalized.includes("لاندكروزر") ||
    normalized.includes("لاند كروزر") ||
    normalized.includes("كورولا") ||
    normalized.includes("هايلوكس") ||
    normalized.includes("يارس") ||
    normalized.includes("افالون") ||
    normalized.includes("فورتشنر") ||
    normalized.includes("برادو") ||
    normalized.includes("راف فور") ||
    normalized.includes("rav4")
  ) {
    return "/brands/toyota.png";
  }

  if (
    normalized.includes("فورد") ||
    normalized.includes("ford") ||
    normalized.includes("توروس") ||
    normalized.includes("اكسبلورر") ||
    normalized.includes("اف 150") ||
    normalized.includes("f-150") ||
    normalized.includes("موستنج") ||
    normalized.includes("اكسبدشن") ||
    normalized.includes("ايدج") ||
    normalized.includes("فيوجن")
  ) {
    return "/brands/ford.png";
  }

  if (
    normalized.includes("هيونداي") ||
    normalized.includes("hyundai") ||
    normalized.includes("سوناتا") ||
    normalized.includes("النترا") ||
    normalized.includes("توسان") ||
    normalized.includes("سنتافي") ||
    normalized.includes("ازيرا") ||
    normalized.includes("كريتا") ||
    normalized.includes("اكسنت") ||
    normalized.includes("باليسيد")
  ) {
    return "/brands/hyundai.png";
  }

  if (
    normalized.includes("نيسان") ||
    normalized.includes("nissan") ||
    normalized.includes("باترول") ||
    normalized.includes("صني") ||
    normalized.includes("التيما") ||
    normalized.includes("مكسيما") ||
    normalized.includes("نافارا") ||
    normalized.includes("اكس تريل") ||
    normalized.includes("باثفايندر") ||
    normalized.includes("سنترا")
  ) {
    return "/brands/nissan.png";
  }

  if (
    normalized.includes("شفروليه") ||
    normalized.includes("شيفروليه") ||
    normalized.includes("chevrolet") ||
    normalized.includes("تاهو") ||
    normalized.includes("كابريس") ||
    normalized.includes("سوبربان") ||
    normalized.includes("ماليبو") ||
    normalized.includes("سلفرادو") ||
    normalized.includes("كروز") ||
    normalized.includes("كامارو") ||
    normalized.includes("ترافيرس")
  ) {
    return "/brands/chevrolet.png";
  }

  if (
    normalized.includes("جمس") ||
    normalized.includes("جي ام سي") ||
    normalized.includes("gmc") ||
    normalized.includes("يوكن") ||
    normalized.includes("سييرا") ||
    normalized.includes("اكاديا") ||
    normalized.includes("تيرين")
  ) {
    return "/brands/gmc.png";
  }

  if (
    normalized.includes("مرسيدس") ||
    normalized.includes("mercedes") ||
    normalized.includes("benz") ||
    normalized.includes("بنز") ||
    normalized.includes("c200") ||
    normalized.includes("s500") ||
    normalized.includes("e300")
  ) {
    return "/brands/mercedes-benz.png";
  }

  if (
    normalized.includes("بي ام") ||
    normalized.includes("bmw") ||
    normalized.includes("730") ||
    normalized.includes("520") ||
    normalized.includes("x5") ||
    normalized.includes("x6")
  ) {
    return "/brands/bmw.png";
  }

  if (
    normalized.includes("لكزس") ||
    normalized.includes("lexus") ||
    normalized.includes("es350") ||
    normalized.includes("lx570") ||
    normalized.includes("lx600") ||
    normalized.includes("rx350")
  ) {
    return "/brands/lexus.png";
  }

  if (
    normalized.includes("كيا") ||
    normalized.includes("kia") ||
    normalized.includes("سبورتاج") ||
    normalized.includes("اوبتيما") ||
    normalized.includes("كادينزا") ||
    normalized.includes("سيراتو") ||
    normalized.includes("سورينتو") ||
    normalized.includes("تيلورايد") ||
    normalized.includes("k5")
  ) {
    return "/brands/kia.png";
  }

  if (
    normalized.includes("هوندا") ||
    normalized.includes("honda") ||
    normalized.includes("اكورد") ||
    normalized.includes("سيفيك") ||
    normalized.includes("بايلوت") ||
    normalized.includes("سي ار في") ||
    normalized.includes("cr-v")
  ) {
    return "/brands/honda.png";
  }

  if (
    normalized.includes("مازدا") ||
    normalized.includes("mazda") ||
    normalized.includes("cx9") ||
    normalized.includes("cx5") ||
    normalized.includes("مازدا 6") ||
    normalized.includes("مازدا 3")
  ) {
    return "/brands/mazda.png";
  }

  if (
    normalized.includes("لاند روفر") ||
    normalized.includes("رنج روفر") ||
    normalized.includes("land rover") ||
    normalized.includes("range rover") ||
    normalized.includes("ديفندر") ||
    normalized.includes("ايفوك") ||
    normalized.includes("سبورت")
  ) {
    return "/brands/land-rover.png";
  }

  if (
    normalized.includes("ميتسوبيشي") ||
    normalized.includes("mitsubishi") ||
    normalized.includes("باجيرو") ||
    normalized.includes("لانسر") ||
    normalized.includes("اوتلاندر") ||
    normalized.includes("L200")
  ) {
    return "/brands/mitsubishi.png";
  }

  if (
    normalized.includes("جيب") ||
    normalized.includes("jeep") ||
    normalized.includes("جراند شيروكي") ||
    normalized.includes("رانجلر")
  ) {
    return "/brands/jeep.png";
  }

  if (
    normalized.includes("اودي") ||
    normalized.includes("audi") ||
    normalized.includes("a6") ||
    normalized.includes("a8") ||
    normalized.includes("q7")
  ) {
    return "/brands/audi.png";
  }

  if (
    normalized.includes("بورش") ||
    normalized.includes("بورشه") ||
    normalized.includes("porsche") ||
    normalized.includes("كايين") ||
    normalized.includes("باناميرا") ||
    normalized.includes("ماكان")
  ) {
    return "/brands/porsche.png";
  }

  if (
    normalized.includes("فولكس") ||
    normalized.includes("volkswagen") ||
    normalized.includes("طوارق") ||
    normalized.includes("تيجوان") ||
    normalized.includes("باسات")
  ) {
    return "/brands/volkswagen.png";
  }

  if (
    normalized.includes("دودج") ||
    normalized.includes("dodge") ||
    normalized.includes("تشارجر") ||
    normalized.includes("تشالنجر") ||
    normalized.includes("دورانجو")
  ) {
    return "/brands/dodge.png";
  }

  return null;
}

export function CarBrandLogo({
  make = "",
  model = "",
  className = "w-7 h-7",
}: CarBrandLogoProps) {
  const [hasError, setHasError] = useState(false);
  const logoPath = getBrandLogoPath(make, model);

  if (logoPath && !hasError) {
    return (
      <img
        src={logoPath}
        alt={`${make} ${model} logo`}
        className={`object-contain transition-transform duration-200 hover:scale-105 ${className}`}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  return <Car className={`text-emerald-800 ${className}`} />;
}
